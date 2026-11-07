"""
Vignette de la section Projets (src/data/pathfinding-thumb.json), calculée sur le réseau piéton
réel et l'itinéraire Tour Eiffel → Notre-Dame, avec les algorithmes du dépôt sans modification :
  - en fond, les rues du réseau routier (plus léger que le réseau piéton complet) ;
  - l'enveloppe convexe des nœuds explorés par Dijkstra (elle déborde du cadre), puis par A* ;
  - le chemin trouvé par A*.
Les enveloppes résument la zone explorée : dessiner chaque rue explorée pèserait plusieurs Mo.

Usage (depuis le dossier du dépôt du projet) :
    .venv/bin/python <portfolio>/scripts/pathfinding/thumbnail.py <sortie.json>
"""

import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path.cwd() / "app"))
from algorithmes import ALGOS  # noqa: E402
from graphe import Graphe  # noqa: E402

W, H = 800, 470
A, B = (48.8584, 2.2945), (48.8530, 2.3499)

g = Graphe("pied")
s, t = g.noeud_le_plus_proche(*A), g.noeud_le_plus_proche(*B)
dij = ALGOS["dijkstra"]["fonction"](g, s, t)
ast = ALGOS["astar"]["fonction"](g, s, t)

kx = math.cos(math.radians(48.856))
lon_c, lat_c = (A[1] + B[1]) / 2, (A[0] + B[0]) / 2
# cadre : l'itinéraire avec une marge ; l'enveloppe de Dijkstra, plus grande, déborde du cadre
xs = [g.lon[n] for n in ast["explores"][1::2]]
ys = [g.lat[n] for n in ast["explores"][1::2]]
half_w = max((max(xs) - min(xs)) * kx, (max(ys) - min(ys)) * W / H) / 2 * 1.35
scale = (W / 2) / half_w
cx, cy = (max(xs) + min(xs)) / 2 * kx, (max(ys) + min(ys)) / 2


def P(lon, lat):
    return ((lon * kx - cx) * scale + W / 2, (cy - lat) * scale + H / 2)


def dedans_xy(x, y, m=4):
    return -m <= x <= W + m and -m <= y <= H + m


fond = Graphe("voiture")
rues = []
for (i, j), geom in fond.geom.items():
    if i > j and (j, i) in fond.geom:
        continue
    pts = [P(x, y) for x, y in geom]
    if not any(dedans_xy(*p) for p in pts):
        continue
    # à cette échelle, une rue = un segment entre ses extrémités ; les plus courtes sont omises
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    if math.hypot(x2 - x1, y2 - y1) < 4:
        continue
    rues.append(f"M{x1:.0f},{y1:.0f}L{x2:.0f},{y2:.0f}")


def enveloppe(ex):
    """Enveloppe convexe (chaîne monotone d'Andrew) des nœuds explorés, en coordonnées vignette."""
    pts = sorted({P(g.lon[n], g.lat[n]) for n in ex[1::2]})
    def croix(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    bas, haut = [], []
    for p in pts:
        while len(bas) >= 2 and croix(bas[-2], bas[-1], p) <= 0:
            bas.pop()
        bas.append(p)
    for p in reversed(pts):
        while len(haut) >= 2 and croix(haut[-2], haut[-1], p) <= 0:
            haut.pop()
        haut.append(p)
    h = bas[:-1] + haut[:-1]
    return "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in h) + "Z"


chemin = g.geometrie_chemin(ast["chemin"])
d_chemin = "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in (P(*c) for c in chemin))
out = {
    "W": W, "H": H,
    "rues": "".join(rues),
    "dijkstra": enveloppe(dij["explores"]),
    "astar": enveloppe(ast["explores"]),
    "chemin": d_chemin,
    "a": P(g.lon[s], g.lat[s]), "b": P(g.lon[t], g.lat[t]),
    "n_dijkstra": len(dij["explores"]) // 2, "n_astar": len(ast["explores"]) // 2,
}
Path(sys.argv[1]).write_text(json.dumps(out))
print(f"vignette : {len(rues)} rues, Dijkstra {out['n_dijkstra']} nœuds, A* {out['n_astar']} nœuds, "
      f"{sum(len(v) for v in out.values() if isinstance(v, str)) / 1e3:.0f} ko")
