"""
Convertit le vrai fichier NASA C-MAPSS (ex. train_FD001.txt) vers src/data/cmapss.json,
au même format que les données de démonstration.

Source : NASA Prognostics Center of Excellence — "Turbofan Engine Degradation Simulation"
(Saxena et al., 2008). Téléchargez l'archive depuis le dépôt de données NASA, puis :

    python3 scripts/prepare_cmapss.py chemin/vers/train_FD001.txt [--units 60]

Le fichier source est un texte séparé par des espaces, 26 colonnes :
unité, cycle, 3 réglages opérationnels, 21 capteurs.
"""
import argparse
import json
from collections import defaultdict
from pathlib import Path

SENSORS = [
    ("s2", "T24", "Température sortie compresseur BP", "°R"),
    ("s3", "T30", "Température sortie compresseur HP", "°R"),
    ("s4", "T50", "Température sortie turbine BP", "°R"),
    ("s7", "P30", "Pression totale sortie compresseur HP", "psia"),
    ("s11", "Ps30", "Pression statique sortie compresseur HP", "psia"),
    ("s12", "phi", "Rapport débit carburant / Ps30", "pps/psi"),
    ("s15", "BPR", "Taux de dilution", "—"),
    ("s21", "W32", "Débit de refroidissement turbine BP", "lbm/s"),
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path)
    ap.add_argument("--units", type=int, default=60, help="nombre de moteurs à garder (poids du JSON)")
    ap.add_argument("--subset", default="FD001")
    args = ap.parse_args()

    rows = defaultdict(list)
    with args.source.open() as f:
        for line in f:
            parts = line.split()
            if len(parts) < 26:
                continue  # ligne vide ou tronquée
            unit, cycle = int(parts[0]), int(parts[1])
            sensors = [float(x) for x in parts[5:26]]
            rows[unit].append((cycle, sensors))

    units = []
    for unit in sorted(rows)[: args.units]:
        data = sorted(rows[unit])
        series = {}
        for sid, *_ in SENSORS:
            idx = int(sid[1:]) - 1
            series[sid] = [round(s[idx], 4) for _, s in data]
        units.append({"unit": unit, "life": len(data), "series": series})

    out = {
        "meta": {
            "demo": False,
            "subset": args.subset,
            "note": "Données NASA C-MAPSS, jeu d'entraînement (moteurs suivis jusqu'à la panne).",
            "generatedBy": "scripts/prepare_cmapss.py",
        },
        "sensors": [dict(zip(("id", "name", "desc", "unit"), s)) for s in SENSORS],
        "units": units,
    }
    dest = Path(__file__).resolve().parent.parent / "src" / "data" / "cmapss.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(f"{dest} : {len(units)} moteurs ({args.subset})")


if __name__ == "__main__":
    main()
