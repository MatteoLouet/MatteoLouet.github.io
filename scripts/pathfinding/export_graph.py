"""
Export du réseau de rues de Paris (projet « Projet d'optimisation ») en fichiers statiques
pour l'étude de cas du portfolio : l'application d'origine a besoin d'un serveur Flask,
GitHub Pages n'en a pas, donc le graphe est pré-calculé ici et les algorithmes tournent
dans le navigateur (src/viz/pathfinding.ts, portage des fichiers app/algorithmes/*.py).

Usage (depuis le dossier du dépôt du projet, avec son environnement virtuel) :
    .venv/bin/python <portfolio>/scripts/pathfinding/export_graph.py <portfolio>/public/data/paris [pied velo voiture]

On importe la classe Graphe du dépôt lui-même : mêmes nœuds, même ordre des voisins,
mêmes coûts (float64) et même heuristique que l'application Python. C'est ce qui permet
de vérifier que le portage JavaScript donne exactement les mêmes résultats (verify.mjs).

Format d'un fichier <mode>.bin.gz (gzip, little-endian), décrit par <mode>.json :
    lon, lat        Int32[n]        coordonnées × 1e7 (les valeurs OSM ont 7 décimales : exact)
    off             Uint32[n+1]     début des voisins de chaque nœud (liste d'adjacence CSR)
    to              Uint32[m]       voisin
    len             Float64[m]      longueur de la rue (m)
    time            Float64[m]      temps de parcours (s) — voiture seulement ; à pied et à vélo
                                    il vaut longueur / vitesse, recalculé à l'identique côté JS
    geo             Int32[m]        rue dessinée correspondante (+1, négatif = sens inverse)
    soff            Uint32[s+1]     début de chaque rue dans pts
    pts             Uint16[2*p]     points des rues, quantifiés dans la boîte englobante
"""

import gzip
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path.cwd() / "app"))
from graphe import MODES, Graphe  # noqa: E402  (module du dépôt du projet)


def export(mode, dossier):
    g = Graphe(mode)
    n = g.nb_noeuds

    # liste d'adjacence dans l'ordre exact de g.adj
    off = np.zeros(n + 1, dtype=np.uint32)
    to, ln, tm, cle_aretes = [], [], [], []
    for i in range(n):
        off[i + 1] = off[i] + len(g.adj[i])
        for (j, _cout, longueur, temps) in g.adj[i]:
            to.append(j)
            ln.append(longueur)
            tm.append(temps)
            cle_aretes.append((i, j))

    # rues dessinées : une polyligne par paire non orientée (comme g.rues)
    # boîte englobante des nœuds ET des géométries de rues (qui peuvent dépasser les nœuds)
    gx = [x for geom in g.geom.values() for x, _ in geom]
    gy = [y for geom in g.geom.values() for _, y in geom]
    lon0, lon1 = min(float(g.lon.min()), min(gx)), max(float(g.lon.max()), max(gx))
    lat0, lat1 = min(float(g.lat.min()), min(gy)), max(float(g.lat.max()), max(gy))
    q = lambda x, a, b: int(round((x - a) / (b - a) * 65535))
    rue_de = {}
    soff, pts = [0], []
    for (i, j), geom in g.geom.items():
        cle = (min(i, j), max(i, j))
        if cle in rue_de:
            continue
        rue_de[cle] = (len(soff) - 1, i)   # index, nœud de départ de la polyligne
        for x, y in geom:
            pts += [q(x, lon0, lon1), q(y, lat0, lat1)]
        soff.append(len(pts) // 2)

    geo = []
    for (i, j) in cle_aretes:
        k, debut = rue_de[(min(i, j), max(i, j))]
        geo.append((k + 1) if debut == i else -(k + 1))

    parts = [
        ("lon", np.rint(np.asarray(g.lon) * 1e7).astype("<i4")),
        ("lat", np.rint(np.asarray(g.lat) * 1e7).astype("<i4")),
        ("off", off.astype("<u4")),
        ("to", np.asarray(to, dtype="<u4")),
        ("len", np.asarray(ln, dtype="<f8")),
        *([("time", np.asarray(tm, dtype="<f8"))] if g.critere == "temps" else []),
        ("geo", np.asarray(geo, dtype="<i4")),
        ("soff", np.asarray(soff, dtype="<u4")),
        ("pts", np.asarray(pts, dtype="<u2")),
    ]
    vitesse = MODES[mode]["vitesse_kmh"]
    assert all(lo / 1e7 == x for lo, x in zip(np.rint(np.asarray(g.lon) * 1e7), g.lon)), "lon non exact"
    assert all(la / 1e7 == y for la, y in zip(np.rint(np.asarray(g.lat) * 1e7), g.lat)), "lat non exact"
    meta = {"mode": mode, "critere": g.critere, "diviseur_h": g.diviseur_h, "vitesse_kmh": vitesse,
            "n": n, "m": len(to), "rues": len(soff) - 1,
            "bbox": [lon0, lat0, lon1, lat1], "parts": {}}
    pos = 0
    with gzip.open(dossier / f"{mode}.bin.gz", "wb", compresslevel=9) as f:
        for nom, arr in parts:
            pad = (-pos) % 8                      # alignement pour les vues typées
            f.write(b"\0" * pad)
            pos += pad
            f.write(arr.tobytes())
            meta["parts"][nom] = [pos, int(arr.size)]
            pos += arr.nbytes
    (dossier / f"{mode}.json").write_text(json.dumps(meta))
    gz = (dossier / f"{mode}.bin.gz").stat().st_size
    print(f"{mode}: {n} nœuds, {len(to)} arêtes, {len(soff) - 1} rues, {pos / 1e6:.1f} Mo, {gz / 1e6:.1f} Mo compressé")


if __name__ == "__main__":
    sortie = Path(sys.argv[1])
    sortie.mkdir(parents=True, exist_ok=True)
    for m in (sys.argv[2:] or MODES):
        export(m, sortie)
