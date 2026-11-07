/**
 * Portage ligne à ligne de app/algorithmes/*.py (dépôt « Projet d'optimisation »).
 * Mêmes structures, mêmes conditions, même ordre des voisins (liste d'adjacence exportée
 * telle quelle par scripts/pathfinding/export_graph.py) : les chemins et le nombre de nœuds
 * explorés sont identiques à l'application Python (vérifié par scripts/pathfinding/verify.mjs).
 *
 * File de priorité : un tas binaire ordonné sur (priorité, nœud), comme les tuples de heapq :
 * à priorité égale, le plus petit indice de nœud sort en premier.
 */

export interface Graph {
  n: number;
  lon: Float64Array;
  lat: Float64Array;
  off: Uint32Array;
  to: Uint32Array;
  cost: Float64Array; // longueur (pied, vélo) ou temps (voiture), comme `coût` en Python
  len: Float64Array;
  time: Float64Array;
  diviseurH: number;
}

export interface Result {
  chemin: number[];
  explores: number[]; // [parent0, noeud0, parent1, noeud1, …] dans l'ordre de sortie de la file
}

/* ----------------------------------------------------------------- heapq */
class Heap {
  p: number[] = [];
  v: number[] = [];
  get size() { return this.p.length; }
  private less(a: number, b: number) {
    return this.p[a] < this.p[b] || (this.p[a] === this.p[b] && this.v[a] < this.v[b]);
  }
  private swap(a: number, b: number) {
    [this.p[a], this.p[b]] = [this.p[b], this.p[a]];
    [this.v[a], this.v[b]] = [this.v[b], this.v[a]];
  }
  push(pr: number, node: number) {
    this.p.push(pr); this.v.push(node);
    let i = this.p.length - 1;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (!this.less(i, up)) break;
      this.swap(i, up); i = up;
    }
  }
  pop(): [number, number] {
    const top: [number, number] = [this.p[0], this.v[0]];
    const lp = this.p.pop()!, lv = this.v.pop()!;
    if (this.p.length) {
      this.p[0] = lp; this.v[0] = lv;
      let i = 0;
      const n = this.p.length;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < n && this.less(l, m)) m = l;
        if (r < n && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return top;
  }
}

/* --------------------------------------------------------- graphe.py */
const RAYON_TERRE = 6_371_000.0;
const rad = (d: number) => (d * Math.PI) / 180;
export function haversine(lon1: number, lat1: number, lon2: number, lat2: number) {
  const p1 = rad(lat1), p2 = rad(lat2);
  const dp = p2 - p1;
  const dl = rad(lon2 - lon1);
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * RAYON_TERRE * Math.asin(Math.sqrt(a));
}
export const heuristique = (g: Graph, a: number, b: number) =>
  haversine(g.lon[a], g.lat[a], g.lon[b], g.lat[b]) / g.diviseurH;

export function noeudLePlusProche(g: Graph, lat: number, lon: number) {
  const c = Math.cos(rad(lat));
  let best = 0, bd = Infinity;
  for (let i = 0; i < g.n; i++) {
    const dx = (g.lon[i] - lon) * c, dy = g.lat[i] - lat;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

/* ------------------------------------------------------ __init__.py */
function reconstruireChemin(origine: Map<number, number>, start: number, goal: number) {
  if (goal !== start && !origine.has(goal)) return [];
  const chemin: number[] = [];
  let current = goal;
  while (current !== start) {
    chemin.push(current);
    current = origine.get(current)!;
  }
  chemin.push(start);
  chemin.reverse();
  return chemin;
}

/* -------------------------------------------------------- dijkstra.py */
export function dijkstra(g: Graph, start: number, goal: number): Result {
  const open = new Heap();
  open.push(0.0, start);
  const close = new Set<number>();
  const origine = new Map<number, number>();
  const coutTotal = new Map<number, number>([[start, 0.0]]);
  const explores: number[] = [];
  while (open.size) {
    const [coutCourant, current] = open.pop();
    if (close.has(current)) continue;
    close.add(current);
    explores.push(origine.get(current) ?? current, current);
    if (current === goal) break;
    for (let k = g.off[current]; k < g.off[current + 1]; k++) {
      const voisin = g.to[k];
      if (close.has(voisin)) continue;
      const nouveau = coutCourant + g.cost[k];
      const ancien = coutTotal.get(voisin);
      if (ancien === undefined || nouveau < ancien) {
        coutTotal.set(voisin, nouveau);
        origine.set(voisin, current);
        open.push(nouveau, voisin);
      }
    }
  }
  return { chemin: reconstruireChemin(origine, start, goal), explores };
}

/* ----------------------------------------------------------- astar.py */
export function astar(g: Graph, start: number, goal: number): Result {
  const open = new Heap();
  open.push(heuristique(g, start, goal), start);
  const close = new Set<number>();
  const origine = new Map<number, number>();
  const coutTotal = new Map<number, number>([[start, 0.0]]);
  const explores: number[] = [];
  while (open.size) {
    const [, current] = open.pop();
    if (close.has(current)) continue; // ancienne entrée devenue obsolète
    close.add(current);
    explores.push(origine.get(current) ?? current, current);
    if (current === goal) break;
    for (let k = g.off[current]; k < g.off[current + 1]; k++) {
      const voisin = g.to[k];
      if (close.has(voisin)) continue;
      const nouveau = coutTotal.get(current)! + g.cost[k];
      const ancien = coutTotal.get(voisin);
      if (ancien === undefined || nouveau < ancien) {
        coutTotal.set(voisin, nouveau);
        origine.set(voisin, current);
        open.push(nouveau + heuristique(g, voisin, goal), voisin); // f = g + h
      }
    }
  }
  return { chemin: reconstruireChemin(origine, start, goal), explores };
}

/* ---------------------------------------------------------- greedy.py */
export function greedy(g: Graph, start: number, goal: number): Result {
  const open = new Heap();
  open.push(heuristique(g, start, goal), start);
  const close = new Set<number>();
  const origine = new Map<number, number>();
  const explores: number[] = [];
  while (open.size) {
    const [, current] = open.pop();
    if (close.has(current)) continue;
    close.add(current);
    explores.push(origine.get(current) ?? current, current);
    if (current === goal) break;
    for (let k = g.off[current]; k < g.off[current + 1]; k++) {
      const voisin = g.to[k];
      if (close.has(voisin) || origine.has(voisin)) continue;
      origine.set(voisin, current);
      open.push(heuristique(g, voisin, goal), voisin); // uniquement h, sans le coût réel
    }
  }
  return { chemin: reconstruireChemin(origine, start, goal), explores };
}

/* ------------------------------------------------------------- bfs.py */
export function bfs(g: Graph, start: number, goal: number): Result {
  const file: number[] = [start];
  let tete = 0;
  const vus = new Set<number>([start]);
  const origine = new Map<number, number>();
  const explores: number[] = [];
  while (tete < file.length) {
    const current = file[tete++];
    explores.push(origine.get(current) ?? current, current);
    if (current === goal) break;
    for (let k = g.off[current]; k < g.off[current + 1]; k++) {
      const voisin = g.to[k];
      if (!vus.has(voisin)) {
        vus.add(voisin);
        origine.set(voisin, current);
        file.push(voisin);
      }
    }
  }
  return { chemin: reconstruireChemin(origine, start, goal), explores };
}

export const ALGOS = { dijkstra, astar, greedy, bfs } as const;
export type AlgoKey = keyof typeof ALGOS;

/** Longueur et temps d'un chemin (graphe.py, mesures_chemin) : première arête i→j trouvée. */
export function mesuresChemin(g: Graph, chemin: number[]) {
  let longueur = 0, temps = 0;
  for (let a = 0; a + 1 < chemin.length; a++) {
    const i = chemin[a], j = chemin[a + 1];
    for (let k = g.off[i]; k < g.off[i + 1]; k++) {
      if (g.to[k] === j) { longueur += g.len[k]; temps += g.time[k]; break; }
    }
  }
  return { longueur, temps };
}
