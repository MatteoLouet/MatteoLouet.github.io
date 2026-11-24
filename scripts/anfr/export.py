"""
Export des données de l'étude de cas « Qui contrôle l'infrastructure mobile française ? »
(dépôt anfr-supports-dashboard) en fichiers statiques pour le portfolio.

Le tableau de bord d'origine est une application Streamlit (Python côté serveur) : GitHub Pages
ne peut pas l'exécuter. On calcule donc ici, avec le code du dépôt lui-même (src/analytics.py),
les indicateurs affichés dans l'étude de cas, et on exporte les supports pour la carte interactive.

Usage (depuis le dossier du dépôt, avec pandas et pyarrow installés) :
    python <portfolio>/scripts/anfr/export.py <portfolio>

Sorties :
    src/data/anfr.json              indicateurs, historique 2018-2026, composantes par département
    public/data/anfr/supports.bin.gz   un enregistrement de 6 octets par support (métropole) :
                                       lon Uint16, lat Uint16 (quantifiés dans la bbox), catégorie Uint8, département Uint8
"""
import gzip
import json
import sys
import types
from pathlib import Path

import numpy as np

# analytics.py importe streamlit pour son cache : un module factice suffit hors de l'application
st = types.ModuleType("streamlit")
st.cache_data = lambda *a, **k: (a[0] if a and callable(a[0]) else (lambda f: f))
sys.modules["streamlit"] = st
sys.path.insert(0, str(Path.cwd() / "src"))
import analytics as an  # noqa: E402
from referentiels import CATEGORIES  # noqa: E402

OUT = Path(sys.argv[1])
f = an.Filtres()  # périmètre par défaut de l'application : France métropolitaine
df = an.appliquer(an.load_supports(), f)
k = an.kpis(df)
hist = an.kpis_historiques(an.appliquer_historique(an.load_historique(), f))
q = an.load_qualite()

# parts des propriétaires clés par instantané (bascules opérateur → TowerCo)
h = an.appliquer_historique(an.load_historique(), f)
t = h.groupby(["instantane", "proprietaire"], observed=True)["n_supports"].sum().unstack(fill_value=0)
tot = t.sum(axis=1)
SUIVIS = ["ORANGE", "TOTEM", "SFR", "HIVORY", "TDF", "BOUYGUES", "CELLNEX"]
parts_hist = {p: [round(float(v), 4) for v in (t[p] / tot)] for p in SUIVIS if p in t}

auto = an.autonomie_operateurs(df)
parts = an.parts_proprietaires(df, identifies_seulement=True)
cats = (df["categorie"].value_counts(normalize=True)).reindex(CATEGORIES).fillna(0)
q4 = df[df["n_operateurs"] >= 4]

# composantes de l'indice de dépendance, par département (mêmes règles que scorecard_departements)
poids1 = {c: 1 for c in an.COMPOSANTES}
sc = an.scorecard_departements(df, poids1)
deps = sorted(df["dep"].astype(str).unique())
dep_idx = {d: i for i, d in enumerate(deps)}
noms = df.drop_duplicates("dep").set_index(df.drop_duplicates("dep")["dep"].astype(str))["dep_nom"].astype(str).to_dict()

departements = [
    {
        "dep": str(r.dep), "nom": str(r["Département"]), "n": int(r["Supports"]),
        "hhi": round(float(r.hhi), 6), "top1": str(r.top1_nom), "top1_part": round(float(r.top1_part), 8),
        "communes_mono": round(float(r.communes_mono), 8), "quatre_ops": round(float(r.quatre_ops), 8),
        "part_towerco": round(float(r.part_towerco), 4),
        "indice_py": float(r["Indice de dépendance"]),  # contrôle : le calcul JS doit retrouver cette valeur
    }
    for _, r in sc.iterrows()
]

data = {
    "export": q["export_reference"],
    "qualite": {k2: q[k2] for k2 in ["lignes_supports_brutes", "lignes_stations_brutes", "lignes_emetteurs_brutes",
                                      "emetteurs_mobiles", "stations_mobiles", "supports_mobiles",
                                      "doublons_supports_exacts", "supports_hauteur_aberrante", "emetteurs_mobiles_sans_date"]},
    "kpis": {
        "n_supports": k["n_supports"], "hhi": round(k["hhi"], 1), "top1": k["top1_nom"], "top1_part": round(k["top1_part"], 4),
        "cr4": round(k["cr4"], 4), "part_towerco": round(k["part_towerco"], 4), "part_operateur": round(k["part_operateur"], 4),
        "mutualisation": round(k["mutualisation"], 4), "quatre_ops": round(k["quatre_ops"], 4), "n_quatre_ops": k["n_quatre_ops"],
        "towerco_parmi_4ops": round(float((q4["categorie"] == "TowerCo").mean()), 4),
        "communes_mono": round(k["communes_mono"], 4), "n_communes": k["n_communes"],
        "n_dep_hhi_1000": int((sc["hhi"] > 1000).sum()), "n_dep": len(sc),
    },
    "historique": {
        "annees": [int(a) for a in hist["annee"]],
        "n_supports": [int(v) for v in hist["n_supports"]],
        **{c: [round(float(v), 4) for v in hist[c]] for c in ["part_towerco", "part_operateur", "quatre_ops", "mutualisation", "hhi", "cr4"]},
        "top1": [str(v) for v in hist["top1_nom"]],
        "parts": parts_hist,
    },
    "categories": {c: round(float(v), 4) for c, v in cats.items()},
    "proprietaires": [{"nom": str(n_), "part": round(float(p), 4)} for n_, p in parts.head(10).items()],
    "operateurs": [
        {"op": r["Opérateur"], "sites": int(r["Sites"]), "propre": round(float(r["En propre"]), 4),
         "towerco": round(float(r["Chez une TowerCo"]), 4), "bailleur": r["Principal bailleur"],
         "bailleur_part": round(float(r["Part du principal bailleur"]), 4)}
        for _, r in auto.iterrows()
    ],
    "departements": departements,
    "carte": {"deps": deps, "noms": [noms[d] for d in deps], "categories": CATEGORIES},
}

# supports : bbox, quantification et écriture binaire
lon, lat = df["lon"].to_numpy(), df["lat"].to_numpy()
b = [float(lon.min()), float(lat.min()), float(lon.max()), float(lat.max())]
data["carte"]["bbox"] = b
data["carte"]["n"] = int(len(df))
rec = np.zeros(len(df), dtype=[("x", "<u2"), ("y", "<u2"), ("c", "u1"), ("d", "u1")])
rec["x"] = np.rint((lon - b[0]) / (b[2] - b[0]) * 65535)
rec["y"] = np.rint((lat - b[1]) / (b[3] - b[1]) * 65535)
rec["c"] = df["categorie"].astype(str).map({c: i for i, c in enumerate(CATEGORIES)}).to_numpy()
rec["d"] = df["dep"].astype(str).map(dep_idx).to_numpy()
assert len(deps) < 256
dest = OUT / "public" / "data" / "anfr"
dest.mkdir(parents=True, exist_ok=True)
with gzip.open(dest / "supports.bin.gz", "wb", compresslevel=9) as fh:
    fh.write(rec.tobytes())
(OUT / "src" / "data" / "anfr.json").write_text(json.dumps(data, ensure_ascii=False))
print(f"{len(df)} supports, {len(departements)} départements, "
      f"{(dest / 'supports.bin.gz').stat().st_size / 1e3:.0f} ko compressés")
