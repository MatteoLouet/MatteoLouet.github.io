"""
Prépare src/data/elec.json pour l'étude de cas « Prévision de charge électrique ».

Entrée : le fichier éCO2mix régional consolidé (RTE, données ouvertes), celui du dépôt
         Pr-vision-de-charge-lectrique- : eco2mix-regional-cons-def.csv
Sortie : quelques journées réelles (12 régions + national, pas de 30 min) et, pour les
         journées de la période de test, la prévision du modèle de base du notebook.

Le modèle de base est reproduit à l'identique (mêmes variables, même découpage 80/20,
mêmes hyperparamètres) ; le script vérifie qu'il retrouve la MAE publiée dans le notebook
(1 618,51 MW) avant d'écrire quoi que ce soit.

    python3 scripts/prepare_eco2mix.py chemin/vers/eco2mix-regional-cons-def.csv
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.tree import DecisionTreeRegressor

SRC = Path(sys.argv[1])
DEST = Path(__file__).resolve().parent.parent / "src" / "data" / "elec.json"

# ---------- 1. Lecture et série nationale (cellules 9, 33 du notebook) ----------
df = pd.read_csv(SRC, sep=";", usecols=["Région", "Date", "Heure", "Consommation (MW)"], low_memory=False)
df["Consommation (MW)"] = pd.to_numeric(df["Consommation (MW)"], errors="coerce")
df["Datetime"] = pd.to_datetime(df["Date"] + " " + df["Heure"])
national = df.groupby("Datetime")["Consommation (MW)"].sum(min_count=12).sort_index()

# ---------- 2. Modèle de base (cellules 58-59) ----------
d = pd.DataFrame(index=national.index)
d["Conso_reelle"] = national
d["Conso_J_1"] = national.reindex(d.index - pd.Timedelta(days=1)).to_numpy()
d["Conso_J_7"] = national.reindex(d.index - pd.Timedelta(days=7)).to_numpy()
d["Heure"] = d.index.hour
d["Jour_semaine"] = d.index.dayofweek
d["Mois"] = d.index.month
d["Week_end"] = (d.index.dayofweek >= 5).astype(int)
d = d.dropna()
X = d[["Conso_J_1", "Conso_J_7", "Heure", "Jour_semaine", "Mois", "Week_end"]]
y = d["Conso_reelle"]
cut = int(len(d) * 0.8)
tree = DecisionTreeRegressor(max_depth=12, min_samples_leaf=20, random_state=42)
tree.fit(X.iloc[:cut], y.iloc[:cut])
pred = pd.Series(tree.predict(X.iloc[cut:]), index=X.index[cut:])
mae = mean_absolute_error(y.iloc[cut:], pred)
rmse = float(np.sqrt(mean_squared_error(y.iloc[cut:], pred)))
print(f"MAE reproduite : {mae:.2f} MW · RMSE : {rmse:.2f} MW (notebook : 1618.51 / 2355.82)")
if abs(mae - 1618.51) > 0.5:
    sys.exit("La reproduction ne correspond pas au notebook : arrêt.")
test_start = X.index[cut]

# ---------- 3. Journées choisies ----------
daily_peak = national.groupby(national.index.date).max()
daily_min = national.groupby(national.index.date).min()
DAYS = [
    ("peak", str(daily_peak.idxmax())),
    ("winter", "2025-01-14"),
    ("sunday", "2025-03-16"),
    ("christmas", "2024-12-25"),
    ("summer", "2025-07-01"),
    ("covid", "2020-04-08"),
    ("low", str(daily_min.idxmin())),
]

regions = sorted(df["Région"].dropna().unique())
pivot = df.pivot_table(index="Datetime", columns="Région", values="Consommation (MW)", aggfunc="first")

out_days = []
for key, day in DAYS:
    sl = slice(pd.Timestamp(day), pd.Timestamp(day) + pd.Timedelta(hours=23, minutes=30))
    nat = national.loc[sl]
    reg = pivot.loc[sl, regions]
    p = pred.loc[sl] if pd.Timestamp(day) >= test_start.normalize() else None
    out_days.append({
        "key": key,
        "date": day,
        "national": [None if pd.isna(v) else int(v) for v in nat.to_numpy()],
        "regions": {r: [None if pd.isna(v) else int(v) for v in reg[r].to_numpy()] for r in regions},
        "pred": None if p is None or p.empty else [int(round(v)) for v in p.to_numpy()],
    })
    print(key, day, len(nat), "pts", "· prévision" if out_days[-1]["pred"] else "")

# Niveau de référence de chaque région pour la carte : 99,9e centile (robuste aux pics aberrants,
# par ex. une valeur isolée en Centre-Val de Loire environ trois fois au-dessus de son niveau habituel)
reg_max = {r: int(pivot[r].quantile(0.999)) for r in regions}
outliers = {}
for r in regions:
    top = pivot[r].idxmax()
    if pivot[r].max() > 1.5 * reg_max[r]:
        outliers[r] = {"at": str(top), "value": int(pivot[r].max()), "p999": reg_max[r]}
        print("Pic aberrant :", r, top, int(pivot[r].max()), "vs p99.9", reg_max[r])

out = {
    "meta": {
        "source": "RTE éCO2mix — données régionales consolidées et définitives",
        "period": [str(national.index.min()), str(national.index.max())],
        "testStart": str(test_start),
        "baseline": {"mae": round(mae, 2), "rmse": round(rmse, 2)},
        "mean": round(float(national.mean()), 1),
        "max": int(national.max()),
    },
    "regions": regions,
    "regionMax": reg_max,
    "outliers": outliers,
    "days": out_days,
}
DEST.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
print(f"{DEST} écrit ({DEST.stat().st_size // 1024} Ko)")
