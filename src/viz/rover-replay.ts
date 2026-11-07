/**
 * Fig. 1 — RoverRun, phase par phase.
 * Rejoue des sorties RÉELLES du programme C (harnais scripts/roverrun/harness.c) :
 * à chaque phase, 5 mouvements tirés au hasard, l'arbre de toutes les suites de 3 mouvements,
 * ses feuilles (position finale + coût), la feuille de coût minimal, puis l'exécution.
 */
type Leaf = { v: number; x: number; y: number; path: number[] };
type Phase = { from: { x: number; y: number; ori: number; soil: number }; draws: number[]; leaves: Leaf[]; best: Leaf; to: { x: number; y: number; ori: number } };
type Run = { key: string; seed: number; start: { x: number; y: number; ori: number }; phases: Phase[] };
type Data = { map: { w: number; h: number; soils: number[][]; costs: number[][] }; runs: Run[] };

const MOVES = {
  fr: ['Avance 10 m', 'Avance 20 m', 'Avance 30 m', 'Recule 10 m', 'Tourne à gauche', 'Tourne à droite', 'Demi-tour'],
  en: ['Forward 10 m', 'Forward 20 m', 'Forward 30 m', 'Back 10 m', 'Turn left', 'Turn right', 'U-turn'],
};
const SHORT = ['F10', 'F20', 'F30', 'B10', 'G', 'D', 'U'];
const T = {
  fr: { phase: 'Phase', of: 'sur', draws: 'Mouvements tirés', leaves: 'feuilles explorées', best: 'Meilleure branche', cost: 'coût', base: 'Base atteinte', play: 'Lecture', pause: 'Pause', next: 'Phase suivante', replay: 'Rejouer', none: 'sans effet (erg)', map: 'Carte du terrain, position du rover et feuilles de l’arbre' },
  en: { phase: 'Phase', of: 'of', draws: 'Moves drawn', leaves: 'leaves explored', best: 'Best branch', cost: 'cost', base: 'Base reached', play: 'Play', pause: 'Pause', next: 'Next phase', replay: 'Replay', none: 'no effect (erg)', map: 'Terrain map, rover position and tree leaves' },
};

const NS = 'http://www.w3.org/2000/svg';
const el = <K extends keyof SVGElementTagNameMap>(tag: K, a: Record<string, string | number> = {}, p?: Element) => {
  const e = document.createElementNS(NS, tag);
  for (const k in a) e.setAttribute(k, String(a[k]));
  p?.appendChild(e);
  return e;
};

// Mêmes règles que moves.c : x vers la droite, y vers le bas, orientation 0=N 1=E 2=S 3=O
function step(loc: { x: number; y: number; ori: number }, m: number) {
  const d = [[0, -1], [1, 0], [0, 1], [-1, 0]][loc.ori];
  const n = { ...loc };
  if (m === 0 || m === 1 || m === 2) { n.x += d[0] * (m + 1); n.y += d[1] * (m + 1); }
  else if (m === 3) { n.x -= d[0]; n.y -= d[1]; }
  else if (m === 4) n.ori = (loc.ori + 3) % 4;
  else if (m === 5) n.ori = (loc.ori + 1) % 4;
  else if (m === 6) n.ori = (loc.ori + 2) % 4;
  return n;
}

export function mountRover(root: HTMLElement, data: Data) {
  const lang = root.dataset.lang === 'en' ? 'en' : 'fr';
  const L = T[lang];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { w, h, soils, costs } = data.map;
  const C = 44;
  const svg = el('svg', { viewBox: `0 0 ${w * C} ${h * C}`, role: 'img', 'aria-label': L.map }, root.querySelector('[data-map]')!);

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = soils[y][x];
    el('rect', { x: x * C, y: y * C, width: C, height: C, class: `rv-cell rv-s${s}` }, svg);
    const t = el('text', { x: x * C + C - 4, y: y * C + 12, 'text-anchor': 'end', class: 'rv-cost' }, svg);
    t.textContent = s === 4 ? '' : s === 0 ? 'BASE' : String(costs[y][x]);
  }
  const trail = el('path', { class: 'rv-trail' }, svg);
  const leavesG = el('g', {}, svg);
  const bestPath = el('path', { class: 'rv-best' }, svg);
  const rover = el('g', { class: 'rv-rover' }, svg);
  el('circle', { r: C * 0.34, class: 'rv-body' }, rover);
  el('path', { d: `M0,${-C * 0.3} L${C * 0.18},${C * 0.08} L${-C * 0.18},${C * 0.08}Z`, class: 'rv-nose' }, rover);

  const cx = (x: number) => x * C + C / 2;
  const place = (l: { x: number; y: number; ori: number }) => rover.setAttribute('transform', `translate(${cx(l.x)},${cx(l.y)}) rotate(${l.ori * 90})`);

  const phaseEl = root.querySelector<HTMLElement>('[data-phase]')!;
  const drawsEl = root.querySelector<HTMLElement>('[data-draws]')!;
  const leafEl = root.querySelector<HTMLElement>('[data-leafinfo]')!;
  const bestEl = root.querySelector<HTMLElement>('[data-bestinfo]')!;
  const playBtn = root.querySelector<HTMLButtonElement>('[data-play]')!;
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-next]')!;

  let run = data.runs[0];
  let k = 0; // phase courante
  let trailPts: string[] = [];
  let timers: number[] = [];
  let playing = false;
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, reduce ? 0 : ms));

  function showPhase(p: Phase, animate: boolean, done?: () => void) {
    phaseEl.textContent = `${L.phase} ${k + 1} ${L.of} ${run.phases.length}`;
    drawsEl.innerHTML = p.draws.map((m) => `<li title="${MOVES[lang][m]}"><b>${SHORT[m]}</b><span>${MOVES[lang][m]}</span></li>`).join('');
    leafEl.textContent = `${p.leaves.length} ${L.leaves}`;
    bestEl.innerHTML = `${L.best} : ${p.best.path.map((m) => (m < 0 ? `<span class="rv-none">${L.none}</span>` : MOVES[lang][m])).join(' → ')} · ${L.cost} ${p.best.v}`;
    if (lang === 'en') bestEl.innerHTML = bestEl.innerHTML.replace(' :', ':');
    place(p.from);

    // 1. les feuilles apparaissent (position finale de chaque suite de 3 mouvements)
    leavesG.innerHTML = '';
    bestPath.setAttribute('d', '');
    const seen = new Map<string, Leaf>();
    p.leaves.forEach((lf) => { const key = `${lf.x},${lf.y}`; if (!seen.has(key) || seen.get(key)!.v > lf.v) seen.set(key, lf); });
    [...seen.values()].forEach((lf, i) => {
      later(() => {
        const g = el('g', { class: 'rv-leaf' + (lf.x === p.best.x && lf.y === p.best.y ? ' is-best' : '') }, leavesG);
        el('circle', { cx: cx(lf.x), cy: cx(lf.y), r: 9 }, g);
        const t = el('text', { x: cx(lf.x), y: cx(lf.y) + 4, 'text-anchor': 'middle' }, g);
        t.textContent = String(lf.v);
      }, animate ? 60 * i : 0);
    });

    // 2. la meilleure branche est exécutée mouvement par mouvement
    const t0 = animate ? 60 * seen.size + 400 : 0;
    let loc = { ...p.from };
    const pts = [`${cx(loc.x)},${cx(loc.y)}`];
    p.best.path.forEach((m, i) => {
      later(() => {
        if (m >= 0) loc = step(loc, m);
        pts.push(`${cx(loc.x)},${cx(loc.y)}`);
        bestPath.setAttribute('d', 'M' + pts.join('L'));
        place(loc);
      }, t0 + (animate ? 550 * (i + 1) : 0));
    });
    later(() => {
      place(p.to);
      trailPts.push(`${cx(p.to.x)},${cx(p.to.y)}`);
      trail.setAttribute('d', 'M' + trailPts.join('L'));
      if (p.best.v === 0) bestEl.innerHTML += ` — <strong class="accent">${L.base}</strong>`;
      done?.();
    }, t0 + (animate ? 550 * (p.best.path.length + 1) : 0));
  }

  function reset(r: Run) {
    clear();
    run = r;
    k = 0;
    trailPts = [`${cx(r.start.x)},${cx(r.start.y)}`];
    trail.setAttribute('d', '');
    showPhase(run.phases[0], false);
    stopPlay();
  }
  function stopPlay() { playing = false; playBtn.textContent = k >= run.phases.length - 1 ? L.replay : L.play; playBtn.setAttribute('aria-pressed', 'false'); }
  function playFrom() {
    playing = true;
    playBtn.textContent = L.pause;
    playBtn.setAttribute('aria-pressed', 'true');
    const go = () => {
      showPhase(run.phases[k], true, () => {
        if (!playing) return;
        if (k < run.phases.length - 1) { k += 1; later(go, 700); } else stopPlay();
      });
    };
    go();
  }
  playBtn.addEventListener('click', () => {
    if (playing) { clear(); stopPlay(); return; }
    if (k >= run.phases.length - 1) { reset(run); }
    clear();
    trailPts = [`${cx(run.start.x)},${cx(run.start.y)}`, ...run.phases.slice(0, k).map((p) => `${cx(p.to.x)},${cx(p.to.y)}`)];
    playFrom();
  });
  nextBtn.addEventListener('click', () => {
    clear(); stopPlay();
    if (k < run.phases.length - 1) k += 1; else { reset(run); return; }
    trailPts = [`${cx(run.start.x)},${cx(run.start.y)}`, ...run.phases.slice(0, k).map((p) => `${cx(p.to.x)},${cx(p.to.y)}`)];
    showPhase(run.phases[k], true, stopPlay);
  });
  root.querySelectorAll<HTMLButtonElement>('[data-run]').forEach((b) =>
    b.addEventListener('click', () => {
      root.querySelectorAll('[data-run]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      reset(data.runs.find((r) => r.key === b.dataset.run)!);
      playFrom();
    })
  );

  reset(data.runs[0]);
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); playFrom(); } }, { threshold: 0.35 });
    io.observe(svg);
  }
}
