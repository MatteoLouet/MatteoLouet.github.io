/**
 * Fig. 1 — l'application « Paris Pathfinding » (dépôt Projet d'optimisation), intégrée à la page.
 *
 * L'original : un serveur Flask (osmnx) + une carte deck.gl. Ici : même interface et mêmes
 * algorithmes, mais tout tourne dans le navigateur :
 *   - le réseau de rues est pré-exporté (scripts/pathfinding/export_graph.py → public/data/paris/) ;
 *   - les algorithmes sont un portage ligne à ligne (pathfinding-algos.ts) ;
 *   - la carte est dessinée en Canvas 2D (rues en blanc sur fond noir, comme l'original).
 * Différence assumée : pas de recherche d'adresse (elle passait par le serveur et Nominatim) ;
 * on choisit A et B en cliquant sur la carte ou dans une liste de lieux.
 */
import {
  ALGOS, mesuresChemin, noeudLePlusProche,
  type AlgoKey, type Graph,
} from './pathfinding-algos';
export { ALGOS } from './pathfinding-algos';

type Lang = 'fr' | 'en';
type Mode = 'pied' | 'velo' | 'voiture';
interface Net {
  g: Graph;
  bbox: [number, number, number, number];
  pts: Uint16Array;
  soff: Uint32Array;
  geo: Int32Array;
  rues: number;
  m: number;
  critere: 'distance' | 'temps';
  streets?: Path2D;
}

const COULEURS: Record<AlgoKey, string> = {
  dijkstra: 'rgb(34,211,238)', astar: 'rgb(244,114,182)', greedy: 'rgb(251,191,36)', bfs: 'rgb(74,222,128)',
};
const NOMS: Record<AlgoKey, { fr: string; en: string }> = {
  dijkstra: { fr: 'Dijkstra', en: 'Dijkstra' }, astar: { fr: 'A*', en: 'A*' },
  greedy: { fr: 'Glouton', en: 'Greedy' }, bfs: { fr: 'BFS', en: 'BFS' },
};
const ORDRE: AlgoKey[] = ['dijkstra', 'astar', 'greedy', 'bfs'];
const DUREE_EXPLORATION = 9; // s à vitesse ×1 (comme l'original)
const DUREE_TRACE = 1.6;

const T = {
  fr: {
    loading: (m: string) => `Chargement du réseau ${m}…`,
    net: (m: string, n: string, a: string) => `Réseau ${m} : ${n} intersections · ${a} tronçons`,
    modes: { pied: 'piéton', velo: 'cyclable', voiture: 'routier' },
    notes: {
      pied: 'Coût = distance. Toutes les rues et chemins piétons, sans sens interdits.',
      velo: 'Coût = distance. Réseau cyclable OSM, sens uniques respectés.',
      voiture: 'Coût = temps de trajet (limitations de vitesse), sens uniques respectés.',
    },
    clickA: 'Cliquez sur la carte pour placer le départ A',
    clickB: 'Cliquez sur la carte pour placer l’arrivée B',
    pointClic: 'point cliqué',
    computing: 'Calcul en cours…', compute: 'Calculer l’itinéraire',
    byDist: 'optimisé sur la distance', byTime: 'optimisé sur le temps',
    optimal: 'optimal', none: 'aucun', nodes: 'nœuds', err: 'Réseau indisponible',
  },
  en: {
    loading: (m: string) => `Loading the ${m} network…`,
    net: (m: string, n: string, a: string) => `${m} network: ${n} intersections · ${a} street segments`,
    modes: { pied: 'walking', velo: 'cycling', voiture: 'road' },
    notes: {
      pied: 'Cost = distance. Every street and footpath, no one-way restrictions.',
      velo: 'Cost = distance. OSM cycling network, one-way streets respected.',
      voiture: 'Cost = travel time (speed limits), one-way streets respected.',
    },
    clickA: 'Click the map to place start A',
    clickB: 'Click the map to place destination B',
    pointClic: 'clicked point',
    computing: 'Computing…', compute: 'Compute the route',
    byDist: 'optimised for distance', byTime: 'optimised for time',
    optimal: 'optimal', none: 'none', nodes: 'nodes', err: 'Network unavailable',
  },
};

/**
 * Certains serveurs (dont celui de développement) envoient le .gz avec « Content-Encoding: gzip » :
 * le navigateur l'a alors déjà décompressé. On ne décompresse que si l'en-tête gzip (1f 8b) est là.
 */
async function gunzipSiBesoin(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const b = new Uint8Array(buf, 0, 2);
  if (b[0] !== 0x1f || b[1] !== 0x8b) return buf;
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}

/** Décode un réseau exporté par export_graph.py. Coordonnées et temps reconstruits à l'identique. */
export function decode(meta: any, buf: ArrayBuffer) {
  const P = meta.parts as Record<string, [number, number]>;
  const f64 = (k: string) => new Float64Array(buf, P[k][0], P[k][1]);
  const u32 = (k: string) => new Uint32Array(buf, P[k][0], P[k][1]);
  const deg = (k: string) => Float64Array.from(new Int32Array(buf, P[k][0], P[k][1]), (v) => v / 1e7);
  const len = f64('len');
  let time: Float64Array;
  if (P.time) time = f64('time');
  else {
    const vitesseMs = meta.vitesse_kmh / 3.6; // graphe.py : temps = longueur / vitesse_ms
    time = Float64Array.from(len, (l) => l / vitesseMs);
  }
  const g: Graph = {
    n: meta.n, lon: deg('lon'), lat: deg('lat'), off: u32('off'), to: u32('to'),
    len, time, cost: meta.critere === 'distance' ? len : time, diviseurH: meta.diviseur_h,
  };
  return { g, P };
}

export function mountPathfinding(root: HTMLElement) {
  const lang: Lang = root.dataset.lang === 'en' ? 'en' : 'fr';
  const L = T[lang];
  const loc = lang === 'fr' ? 'fr-FR' : 'en-GB';
  const fmtN = (v: number) => v.toLocaleString(loc);
  const lieux: { key: string; label: string; lat: number; lon: number }[] = JSON.parse(root.dataset.places || '[]');
  const base = root.dataset.base || '/data/paris/';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const q = <E extends HTMLElement>(s: string) => root.querySelector<E>(s)!;

  const canvas = q<HTMLCanvasElement>('[data-canvas]');
  const ctx = canvas.getContext('2d')!;
  const statut = q<HTMLElement>('[data-status]');
  const compteur = q<HTMLElement>('[data-counter]');
  const selA = q<HTMLSelectElement>('[data-a]');
  const selB = q<HTMLSelectElement>('[data-b]');
  const note = q<HTMLElement>('[data-note]');
  const lancer = q<HTMLButtonElement>('[data-run]');
  const vitesse = q<HTMLInputElement>('[data-speed]');
  const outV = q<HTMLElement>('[data-speed-out]');
  const tableau = q<HTMLElement>('[data-results]');
  const tbody = tableau.querySelector('tbody')!;
  const critereEl = q<HTMLElement>('[data-critere]');
  const hint = q<HTMLElement>('[data-hint]');

  const etat = {
    mode: 'pied' as Mode,
    algo: 'dijkstra' as AlgoKey | 'tous',
    depart: null as null | [number, number], // [lon, lat]
    arrivee: null as null | [number, number],
    s: -1, t: -1,
    prochainClic: 'depart' as 'depart' | 'arrivee',
    reseaux: {} as Partial<Record<Mode, Net>>,
    resultat: null as null | { mode: Mode; res: Record<AlgoKey, { chemin: number[]; explores: number[]; ms: number; longueur: number; temps: number }> },
    mult: 1,
  };

  /* ------------------------------------------------------------ vue */
  const LAT0 = 48.8566;
  const KX = Math.cos((LAT0 * Math.PI) / 180);
  const view = { cx: 2.3415 * KX, cy: -48.8566, scale: 1 }; // scale = px CSS par unité (deg de latitude)
  let W = 0, H = 0, DPR = 1;
  const wx = (lon: number) => lon * KX;
  const wy = (lat: number) => -lat;
  const toScreen = (x: number, y: number): [number, number] => [(x - view.cx) * view.scale + W / 2, (y - view.cy) * view.scale + H / 2];
  const toWorld = (px: number, py: number): [number, number] => [(px - W / 2) / view.scale + view.cx, (py - H / 2) / view.scale + view.cy];

  function fitBBox(lon0: number, lat0: number, lon1: number, lat1: number, pad = 40) {
    const w = (lon1 - lon0) * KX, h = lat1 - lat0;
    view.scale = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
    view.cx = ((lon0 + lon1) / 2) * KX;
    view.cy = -(lat0 + lat1) / 2;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const first = W === 0;
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    if (first) fitBBox(2.224, 48.815, 2.47, 48.902, 16);
    draw();
  }

  /* -------------------------------------------------------- réseau */
  async function charger(mode: Mode): Promise<Net | null> {
    if (etat.reseaux[mode]) return etat.reseaux[mode]!;
    if (mode === etat.mode) statut.textContent = L.loading(L.modes[mode]);
    try {
      const [meta, buf] = await Promise.all([
        fetch(`${base}${mode}.json`).then((r) => r.json()),
        fetch(`${base}${mode}.bin.gz`).then((r) => r.arrayBuffer()).then(gunzipSiBesoin),
      ]);
      const { g, P } = decode(meta, buf);
      const net: Net = {
        g, bbox: meta.bbox, pts: new Uint16Array(buf, P.pts[0], P.pts[1]), soff: new Uint32Array(buf, P.soff[0], P.soff[1]),
        geo: new Int32Array(buf, P.geo[0], P.geo[1]), rues: meta.rues, m: meta.m, critere: meta.critere,
      };
      etat.reseaux[mode] = net;
      return net;
    } catch {
      if (mode === etat.mode) statut.textContent = L.err;
      return null;
    }
  }

  const ptX = (net: Net, k: number) => wx(net.bbox[0] + (net.pts[2 * k] / 65535) * (net.bbox[2] - net.bbox[0]));
  const ptY = (net: Net, k: number) => wy(net.bbox[1] + (net.pts[2 * k + 1] / 65535) * (net.bbox[3] - net.bbox[1]));

  function streetsPath(net: Net) {
    if (net.streets) return net.streets;
    const p = new Path2D();
    for (let s = 0; s < net.rues; s++) {
      const a = net.soff[s], b = net.soff[s + 1];
      p.moveTo(ptX(net, a), ptY(net, a));
      for (let k = a + 1; k < b; k++) p.lineTo(ptX(net, k), ptY(net, k));
    }
    net.streets = p;
    return p;
  }

  /** Géométrie du chemin (graphe.py, geometrie_chemin) en coordonnées monde. */
  function geometrie(net: Net, chemin: number[]) {
    const out: [number, number][] = [];
    const g = net.g;
    for (let c = 0; c + 1 < chemin.length; c++) {
      const i = chemin[c], j = chemin[c + 1];
      let e = -1;
      for (let k = g.off[i]; k < g.off[i + 1]; k++) if (g.to[k] === j) { e = k; break; }
      if (e < 0) continue;
      const code = net.geo[e], s = Math.abs(code) - 1;
      const a = net.soff[s], b = net.soff[s + 1];
      const seg: [number, number][] = [];
      for (let k = a; k < b; k++) seg.push([ptX(net, k), ptY(net, k)]);
      if (code < 0) seg.reverse();
      out.push(...(out.length ? seg.slice(1) : seg));
    }
    if (!out.length && chemin.length) out.push([wx(g.lon[chemin[0]]), wy(g.lat[chemin[0]])]);
    return out;
  }

  /* ------------------------------------------------------ animation */
  interface Piste { cle: AlgoKey; explores: number[]; chunks: Path2D[]; built: number; trace: [number, number][]; cum: number[]; progression: number; finExplo: number | null }
  let anim: null | { pistes: Piste[]; pas: number; vitesseBase: number; raf: number; dernier: number } = null;

  function preparerPiste(cle: AlgoKey): Piste {
    const net = etat.reseaux[etat.resultat!.mode]!;
    const r = etat.resultat!.res[cle];
    const trace = geometrie(net, r.chemin);
    const cum = [0];
    for (let k = 1; k < trace.length; k++) cum.push(cum[k - 1] + Math.hypot(trace[k][0] - trace[k - 1][0], trace[k][1] - trace[k - 1][1]));
    return { cle, explores: r.explores, chunks: [], built: 0, trace, cum, progression: 0, finExplo: null };
  }

  const CHUNK = 1500;
  function segPath(net: Net, ex: number[], from: number, to: number) {
    const p = new Path2D(), g = net.g;
    for (let k = from; k < to; k++) {
      const a = ex[2 * k], b = ex[2 * k + 1];
      p.moveTo(wx(g.lon[a]), wy(g.lat[a]));
      p.lineTo(wx(g.lon[b]), wy(g.lat[b]));
    }
    return p;
  }

  function demarrer(cles: AlgoKey[]) {
    arreter();
    if (!etat.resultat) return;
    const pistes = cles.map(preparerPiste);
    const maxSeg = Math.max(...pistes.map((p) => p.explores.length / 2), 1);
    const vitesseBase = Math.max(maxSeg / DUREE_EXPLORATION, 60);
    anim = { pistes, pas: reduce ? maxSeg : 0, vitesseBase, raf: 0, dernier: performance.now() };
    if (reduce) pistes.forEach((p) => { p.finExplo = 0; p.progression = 1; });
    tbody.querySelectorAll('tr').forEach((tr) => tr.classList.toggle('is-on', cles.length === 1 && tr.dataset.algo === cles[0]));
    compteur.hidden = false;
    const boucle = (t: number) => {
      const a = anim;
      if (!a) return;
      const dt = Math.min((t - a.dernier) / 1000, 0.1);
      a.dernier = t;
      a.pas += a.vitesseBase * etat.mult * dt;
      let enCours = false;
      for (const p of a.pistes) {
        const n = p.explores.length / 2;
        if (a.pas >= n) {
          if (p.finExplo === null) p.finExplo = t;
          p.progression = Math.min((t - p.finExplo) / 1000 / DUREE_TRACE, 1);
          if (p.trace.length > 1 && p.progression < 1) enCours = true;
        } else enCours = true;
      }
      majCompteur();
      draw();
      if (enCours) a.raf = requestAnimationFrame(boucle);
    };
    if (reduce) { majCompteur(); draw(); } else anim.raf = requestAnimationFrame(boucle);
  }
  function arreter() {
    if (anim) cancelAnimationFrame(anim.raf);
    anim = null;
    compteur.hidden = true;
  }
  function majCompteur() {
    if (!anim || !etat.resultat) return;
    compteur.innerHTML = anim.pistes.map((p) => {
      const tot = p.explores.length / 2;
      const n = Math.min(Math.floor(anim!.pas), tot);
      const fini = n >= tot;
      const ok = etat.resultat!.res[p.cle].chemin.length > 0;
      return `<div><span style="color:${COULEURS[p.cle]}">●</span> <b>${NOMS[p.cle][lang]}</b> ${fmtN(n)} ${L.nodes} ${fini ? (ok ? '✓' : '✗') : '…'}</div>`;
    }).join('');
  }

  /* --------------------------------------------------------- dessin */
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const net = etat.reseaux[etat.mode];
    const k = view.scale * DPR;
    ctx.setTransform(k, 0, 0, k, (W / 2 - view.cx * view.scale) * DPR, (H / 2 - view.cy * view.scale) * DPR);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (net) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(0.6, Math.min(2, view.scale / 9000)) / view.scale;
      ctx.stroke(streetsPath(net));
    }
    if (anim && etat.resultat && etat.resultat.mode === etat.mode && net) {
      const multi = anim.pistes.length > 1;
      for (const p of anim.pistes) {
        const tot = p.explores.length / 2;
        const pas = Math.min(Math.floor(anim.pas), tot);
        while (p.built + CHUNK <= pas) { p.chunks.push(segPath(net, p.explores, p.built, p.built + CHUNK)); p.built += CHUNK; }
        ctx.globalAlpha = multi ? 0.5 : 0.62;
        ctx.strokeStyle = COULEURS[p.cle];
        ctx.lineWidth = 1.6 / view.scale;
        for (const c of p.chunks) ctx.stroke(c);
        if (pas > p.built) ctx.stroke(segPath(net, p.explores, p.built, pas));
        if (pas < tot) {
          const fen = Math.max(20, Math.floor(anim.vitesseBase * etat.mult * 0.25));
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3 / view.scale;
          ctx.stroke(segPath(net, p.explores, Math.max(0, pas - fen), pas));
        }
        ctx.globalAlpha = 1;
      }
      for (const p of anim.pistes) {
        if (p.trace.length < 2 || p.progression <= 0) continue;
        const total = p.cum[p.cum.length - 1] || 1, cible = total * p.progression;
        const path = new Path2D();
        path.moveTo(p.trace[0][0], p.trace[0][1]);
        for (let i = 1; i < p.trace.length; i++) {
          if (p.cum[i] <= cible) { path.lineTo(p.trace[i][0], p.trace[i][1]); continue; }
          const f = (cible - p.cum[i - 1]) / (p.cum[i] - p.cum[i - 1] || 1);
          path.lineTo(p.trace[i - 1][0] + (p.trace[i][0] - p.trace[i - 1][0]) * f, p.trace[i - 1][1] + (p.trace[i][1] - p.trace[i - 1][1]) * f);
          break;
        }
        ctx.globalAlpha = 0.35; ctx.strokeStyle = '#fff'; ctx.lineWidth = 9 / view.scale; ctx.stroke(path);
        ctx.globalAlpha = 1; ctx.strokeStyle = COULEURS[p.cle]; ctx.lineWidth = 5 / view.scale; ctx.stroke(path);
      }
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const marq = (pt: [number, number] | null, c: string, lettre: string) => {
      if (!pt) return;
      const [x, y] = toScreen(wx(pt[0]), wy(pt[1]));
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke();
      ctx.fillStyle = '#000'; ctx.font = '600 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(lettre, x, y + 0.5);
    };
    marq(etat.depart, 'rgb(52,211,153)', 'A');
    marq(etat.arrivee, 'rgb(248,113,113)', 'B');
  }

  /* ------------------------------------------------------ interactions */
  function majHint() {
    hint.textContent = etat.prochainClic === 'depart' ? L.clickA : L.clickB;
    lancer.disabled = !(etat.depart && etat.arrivee);
  }
  function choisir(cible: 'depart' | 'arrivee', lonlat: [number, number], cleLieu = '') {
    etat[cible] = lonlat;
    const sel = cible === 'depart' ? selA : selB;
    if (cleLieu) sel.value = cleLieu;
    else {
      let opt = sel.querySelector<HTMLOptionElement>('option[value="clic"]');
      if (!opt) { opt = document.createElement('option'); opt.value = 'clic'; sel.appendChild(opt); }
      opt.textContent = `${L.pointClic} (${lonlat[1].toFixed(4)}, ${lonlat[0].toFixed(4)})`;
      sel.value = 'clic';
    }
    etat.prochainClic = cible === 'depart' ? 'arrivee' : 'depart';
    arreter();
    majHint();
    draw();
  }
  [selA, selB].forEach((sel, i) => sel.addEventListener('change', () => {
    const l = lieux.find((x) => x.key === sel.value);
    if (l) choisir(i === 0 ? 'depart' : 'arrivee', [l.lon, l.lat], l.key);
  }));
  q('[data-swap]').addEventListener('click', () => {
    [etat.depart, etat.arrivee] = [etat.arrivee, etat.depart];
    const a = selA.innerHTML, va = selA.value;
    selA.innerHTML = selB.innerHTML; const vb = selB.value; selA.value = vb;
    selB.innerHTML = a; selB.value = va;
    arreter(); draw();
  });

  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => b.addEventListener('click', async () => {
    root.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    etat.mode = b.dataset.mode as Mode;
    note.textContent = L.notes[etat.mode];
    arreter();
    tableau.hidden = true;
    etat.resultat = null;
    draw();
    await charger(etat.mode);
    afficherStatut();
    draw();
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-algo]').forEach((b) => b.addEventListener('click', () => {
    root.querySelectorAll('[data-algo]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    etat.algo = b.dataset.algo as AlgoKey | 'tous';
    if (etat.resultat) demarrer(etat.algo === 'tous' ? ORDRE : [etat.algo]);
  }));
  vitesse.addEventListener('input', () => {
    etat.mult = 2 ** Number(vitesse.value);
    outV.textContent = '×' + (etat.mult < 1 ? etat.mult.toFixed(2).replace(/0$/, '') : etat.mult);
  });

  function afficherStatut() {
    const net = etat.reseaux[etat.mode];
    if (net) statut.textContent = L.net(L.modes[etat.mode], fmtN(net.g.n), fmtN(net.m));
  }

  lancer.addEventListener('click', async () => {
    if (!etat.depart || !etat.arrivee) return;
    lancer.disabled = true;
    lancer.textContent = L.computing;
    arreter();
    await new Promise((r) => setTimeout(r, 20)); // laisse le bouton se repeindre
    const net = await charger(etat.mode);
    if (!net) { lancer.textContent = L.compute; majHint(); return; }
    const g = net.g;
    const s = noeudLePlusProche(g, etat.depart[1], etat.depart[0]);
    const t = noeudLePlusProche(g, etat.arrivee[1], etat.arrivee[0]);
    const res = {} as NonNullable<typeof etat.resultat>['res'];
    for (const cle of ORDRE) {
      const t0 = performance.now();
      const r = ALGOS[cle](g, s, t);
      const ms = performance.now() - t0;
      const m = mesuresChemin(g, r.chemin);
      res[cle] = { ...r, ms, longueur: m.longueur, temps: m.temps };
    }
    etat.resultat = { mode: etat.mode, res };
    // on recale A et B sur les intersections réellement utilisées
    etat.depart = [g.lon[s], g.lat[s]];
    etat.arrivee = [g.lon[t], g.lat[t]];
    afficherTableau(net);
    cadrer();
    demarrer(etat.algo === 'tous' ? ORDRE : [etat.algo as AlgoKey]);
    lancer.textContent = L.compute;
    majHint();
  });

  const fmtDist = (m: number) => (m >= 1000 ? (m / 1000).toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' km' : Math.round(m) + ' m');
  const fmtTemps = (s: number) => {
    const min = Math.round(s / 60);
    return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`;
  };
  function afficherTableau(net: Net) {
    const r = etat.resultat!.res;
    const parTemps = net.critere === 'temps';
    const cout = (x: (typeof r)[AlgoKey]) => (parTemps ? x.temps : x.longueur);
    const ref = cout(r.dijkstra);
    critereEl.textContent = parTemps ? L.byTime : L.byDist;
    tbody.innerHTML = '';
    for (const cle of ORDRE) {
      const x = r[cle];
      const ok = x.chemin.length > 0;
      const ecart = ok && ref > 0 ? ((cout(x) - ref) / ref) * 100 : null;
      const ecartTxt = !ok ? '—' : ecart! < 0.05 ? `<span class="pf-ok">${L.optimal}</span>` : `<span class="pf-ko">+${ecart!.toLocaleString(loc, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %</span>`;
      const tr = document.createElement('tr');
      tr.dataset.algo = cle;
      tr.tabIndex = 0;
      tr.innerHTML = `<td><i style="background:${COULEURS[cle]}"></i>${NOMS[cle][lang]}</td><td>${ok ? fmtDist(x.longueur) : L.none}</td><td>${ok ? fmtTemps(x.temps) : '—'}</td><td>${fmtN(x.explores.length / 2)}</td><td>${x.ms < 10 ? x.ms.toLocaleString(loc, { maximumFractionDigits: 1 }) : fmtN(Math.round(x.ms))} ms</td><td>${ecartTxt}</td>`;
      const rejouer = () => {
        root.querySelectorAll('[data-algo]').forEach((b) => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.algo === cle)));
        etat.algo = cle;
        demarrer([cle]);
      };
      tr.addEventListener('click', rejouer);
      tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rejouer(); } });
      tbody.appendChild(tr);
    }
    tableau.hidden = false;
  }

  function cadrer() {
    const [a, b] = [etat.depart!, etat.arrivee!];
    const lon0 = Math.min(a[0], b[0]), lon1 = Math.max(a[0], b[0]), lat0 = Math.min(a[1], b[1]), lat1 = Math.max(a[1], b[1]);
    const padLon = Math.max((lon1 - lon0) * 0.25, 0.004), padLat = Math.max((lat1 - lat0) * 0.25, 0.003);
    fitBBox(lon0 - padLon, lat0 - padLat, lon1 + padLon, lat1 + padLat, 24);
  }

  /* ------------------------------------------- carte : clic, zoom, déplacement */
  const pointers = new Map<number, { x: number; y: number }>();
  let drag: null | { x: number; y: number; moved: boolean; dist?: number } = null;
  const local = (e: PointerEvent | WheelEvent) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as [number, number]; };
  function zoomAt(px: number, py: number, f: number) {
    const [x, y] = toWorld(px, py);
    view.scale = Math.min(Math.max(view.scale * f, 2000), 2_000_000);
    view.cx = x - (px - W / 2) / view.scale;
    view.cy = y - (py - H / 2) / view.scale;
    draw();
  }
  canvas.addEventListener('wheel', (e) => {
    // la molette seule fait défiler la page ; Ctrl/⌘ + molette (ou le pincement du trackpad) zoome
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const [px, py] = local(e);
    zoomAt(px, py, Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const [x, y] = local(e);
    pointers.set(e.pointerId, { x, y });
    if (pointers.size === 1) drag = { x, y, moved: false };
    else if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()];
      drag = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, moved: true, dist: Math.hypot(p1.x - p2.x, p1.y - p2.y) };
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !drag) return;
    const [x, y] = local(e);
    pointers.set(e.pointerId, { x, y });
    if (pointers.size === 2 && drag.dist) {
      const [p1, p2] = [...pointers.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y), mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      view.cx -= (mx - drag.x) / view.scale; view.cy -= (my - drag.y) / view.scale;
      zoomAt(mx, my, d / drag.dist);
      drag = { x: mx, y: my, moved: true, dist: d };
      return;
    }
    if (Math.abs(x - drag.x) + Math.abs(y - drag.y) > 3) drag.moved = true;
    if (drag.moved) {
      view.cx -= (x - drag.x) / view.scale;
      view.cy -= (y - drag.y) / view.scale;
      drag.x = x; drag.y = y;
      draw();
    }
  });
  const fin = (e: PointerEvent) => {
    const wasClick = drag && !drag.moved && pointers.size === 1;
    pointers.delete(e.pointerId);
    if (wasClick) {
      const [px, py] = local(e);
      const [x, y] = toWorld(px, py);
      choisir(etat.prochainClic, [x / KX, -y]);
    }
    if (pointers.size === 0) drag = null;
  };
  canvas.addEventListener('pointerup', fin);
  canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); drag = null; });
  q('[data-zoom-in]').addEventListener('click', () => zoomAt(W / 2, H / 2, 1.6));
  q('[data-zoom-out]').addEventListener('click', () => zoomAt(W / 2, H / 2, 1 / 1.6));
  q('[data-zoom-reset]').addEventListener('click', () => { fitBBox(2.224, 48.815, 2.47, 48.902, 16); draw(); });

  new ResizeObserver(() => resize()).observe(canvas);
  note.textContent = L.notes[etat.mode];
  majHint();
  resize();

  // charge le réseau quand la figure approche de l'écran (≈ quelques Mo, pas au chargement de la page)
  const io = new IntersectionObserver(async (entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    const net = await charger('pied');
    if (net) { afficherStatut(); draw(); }
    // itinéraire de démonstration : Tour Eiffel → Notre-Dame
    const a = lieux.find((l) => l.key === 'eiffel'), b = lieux.find((l) => l.key === 'notredame');
    if (a && b) { choisir('depart', [a.lon, a.lat], a.key); choisir('arrivee', [b.lon, b.lat], b.key); lancer.click(); }
  }, { rootMargin: '400px 0px' });
  io.observe(root);
}
