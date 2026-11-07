"""
Mesures réelles pour l'étude de cas « Projet d'optimisation » : on exécute les algorithmes
du dépôt (app/algorithmes/*.py, sans modification) sur le vrai réseau de Paris.

Usage (depuis le dossier du dépôt, avec son environnement virtuel) :
    .venv/bin/python <portfolio>/scripts/pathfinding/benchmark.py <sortie.json> [<parite.json>]

1. Itinéraires nommés (entre lieux connus, recalés sur l'intersection la plus proche).
2. Échantillon aléatoire de paires de nœuds (graine fixe) pour des statistiques.
3. Fichier de parité : nombre de nœuds explorés et chemin exact, que verify.mjs compare
   avec le portage JavaScript.
"""

import json
import random
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path.cwd() / "app"))
from algorithmes import ALGOS  # noqa: E402
from graphe import MODES, Graphe  # noqa: E402

LIEUX = {
    "eiffel": (48.8584, 2.2945),
    "notredame": (48.8530, 2.3499),
    "garedunord": (48.8809, 2.3553),
    "bastille": (48.8532, 2.3692),
    "sacrecoeur": (48.8867, 2.3431),
    "italie": (48.8310, 2.3557),
    "etoile": (48.8738, 2.2950),
    "garedelyon": (48.8443, 2.3743),
    "nation": (48.8483, 2.3959),
    "montparnasse": (48.8421, 2.3219),
}
ITINERAIRES = [
    ("eiffel", "notredame"), ("garedunord", "montparnasse"), ("etoile", "nation"),
    ("sacrecoeur", "italie"), ("bastille", "eiffel"), ("garedelyon", "sacrecoeur"),
]
N_ALEATOIRES = 60
REPETITIONS = 3


def executer(g, s, t):
    sortie = {}
    for cle, algo in ALGOS.items():
        durees = []
        for _ in range(REPETITIONS):
            t0 = time.perf_counter()
            r = algo["fonction"](g, s, t)
            durees.append((time.perf_counter() - t0) * 1000)
        longueur, temps = g.mesures_chemin(r["chemin"])
        sortie[cle] = {
            "ms": round(statistics.median(durees), 2),
            "explores": len(r["explores"]) // 2,
            "rues": max(len(r["chemin"]) - 1, 0),
            "distance_m": round(longueur, 1),
            "temps_s": round(temps, 1),
            "trouve": bool(r["chemin"]),
            "_chemin": r["chemin"],
        }
    return sortie


def ecart(res, cle, critere):
    c = "distance_m" if critere == "distance" else "temps_s"
    ref = res["dijkstra"][c]
    return None if not res[cle]["trouve"] or ref == 0 else (res[cle][c] - ref) / ref * 100


def main():
    sortie = Path(sys.argv[1])
    parite_f = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    resultat = {"lieux": LIEUX, "modes": {}}
    parite = {}
    for mode in MODES:
        g = Graphe(mode)
        m = {"n": g.nb_noeuds, "m": g.nb_aretes, "critere": g.critere, "itineraires": [], "aleatoire": {}}
        parite[mode] = []
        for a, b in ITINERAIRES:
            s = g.noeud_le_plus_proche(*LIEUX[a])
            t = g.noeud_le_plus_proche(*LIEUX[b])
            r = executer(g, s, t)
            parite[mode].append({"s": s, "t": t, **{k: {"explores": v["explores"], "chemin": v["_chemin"]} for k, v in r.items()}})
            for v in r.values():
                v.pop("_chemin")
            m["itineraires"].append({"de": a, "a": b, "s": s, "t": t, "res": r,
                                     "ecart": {k: ecart(r, k, g.critere) for k in r}})
        rnd = random.Random(2026)
        stats = {k: {"ms": [], "explores": [], "ecart": [], "trouve": 0} for k in ALGOS}
        faits = 0
        while faits < N_ALEATOIRES:
            s, t = rnd.randrange(g.nb_noeuds), rnd.randrange(g.nb_noeuds)
            r = executer(g, s, t)
            if not r["dijkstra"]["trouve"]:
                continue                     # paire non reliée (sens uniques, îlots)
            faits += 1
            for k, v in r.items():
                stats[k]["ms"].append(v["ms"])
                stats[k]["explores"].append(v["explores"])
                stats[k]["trouve"] += v["trouve"]
                e = ecart(r, k, g.critere)
                if e is not None:
                    stats[k]["ecart"].append(e)
        for k, s_ in stats.items():
            m["aleatoire"][k] = {
                "paires": N_ALEATOIRES,
                "ms_median": round(statistics.median(s_["ms"]), 2),
                "explores_median": int(statistics.median(s_["explores"])),
                "explores_moyen": round(statistics.fmean(s_["explores"])),
                "ecart_median": round(statistics.median(s_["ecart"]), 2) if s_["ecart"] else None,
                "ecart_max": round(max(s_["ecart"]), 2) if s_["ecart"] else None,
                "optimal_pct": round(sum(1 for e in s_["ecart"] if e < 0.05) / len(s_["ecart"]) * 100, 1) if s_["ecart"] else None,
                "trouve": s_["trouve"],
            }
        resultat["modes"][mode] = m
        print(mode, json.dumps(m["aleatoire"], ensure_ascii=False))
    sortie.write_text(json.dumps(resultat, ensure_ascii=False, indent=1))
    if parite_f:
        parite_f.write_text(json.dumps(parite))


if __name__ == "__main__":
    main()
