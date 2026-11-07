/**
 * Fig. 1 — Rejouer une journée du réseau électrique.
 * Données réelles RTE éCO2mix (12 régions, pas de 30 min) et, pour les jours de la
 * période de test, la prévision du modèle de base du notebook (reproduit à l'identique).
 *
 * La prévision J+1 est connue la veille : elle est tracée d'avance (pointillés), puis la
 * consommation réelle se dessine demi-heure par demi-heure et « rattrape » la prévision.
 * La carte des régions s'allume selon la part de leur maximum historique.
 */
type Day = { key: string; date: string; national: (number | null)[]; regions: Record<string, (number | null)[]>; pred: number[] | null };
type Data = { meta: { testStart: string; max: number }; regions: string[]; regionMax: Record<string, number>; days: Day[] };

// Cartogramme en tuiles : position approximative de chaque région (colonne, ligne)
const TILES: Record<string, [number, number, string]> = {
  'Hauts-de-France': [2, 0, 'HDF'],
  Bretagne: [0, 1, 'BRE'],
  Normandie: [1, 1, 'NOR'],
  'Île-de-France': [2, 1, 'IDF'],
  'Grand Est': [3, 1, 'GES'],
  'Pays de la Loire': [0, 2, 'PDL'],
  'Centre-Val de Loire': [1, 2, 'CVL'],
  'Bourgogne-Franche-Comté': [2, 2, 'BFC'],
  'Nouvelle-Aquitaine': [1, 3, 'NAQ'],
  'Auvergne-Rhône-Alpes': [2, 3, 'ARA'],
  Occitanie: [1, 4, 'OCC'],
  "Provence-Alpes-Côte d'Azur": [2, 4, 'PAC'],
};

const T = {
  fr: {
    play: 'Lecture', pause: 'Pause', replay: 'Rejouer',
    real: 'consommation réelle', pred: 'prévision du modèle (connue la veille)',
    noPred: 'jour hors période de test : pas de prévision',
    gap: 'écart', of: 'du maximum historique', peak: 'Pic du jour', mae: 'Erreur moyenne de la journée',
    aria: 'Consommation électrique nationale sur 24 heures',
    mapAria: 'Carte des 12 régions, colorées selon leur consommation',
    loc: 'fr-FR',
  },
  en: {
    play: 'Play', pause: 'Pause', replay: 'Replay',
    real: 'actual consumption', pred: 'model forecast (known the day before)',
    noPred: 'day outside the test period: no forecast',
    gap: 'gap', of: 'of historic max', peak: 'Daily peak', mae: 'Mean error for the day',
    aria: 'National electricity consumption over 24 hours',
    mapAria: 'Map of the 12 regions, coloured by consumption',
    loc: 'en-GB',
  },
};

const NS = 'http://www.w3.org/2000/svg';
const el = <K extends keyof SVGElementTagNameMap>(tag: K, a: Record<string, string | number> = {}, p?: Element) => {
  const e = document.createElementNS(NS, tag);
  for (const k in a) e.setAttribute(k, String(a[k]));
  p?.appendChild(e);
  return e;
};
const hhmm = (i: number) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;

export function mountGridReplay(root: HTMLElement, data: Data) {
  const L = T[root.dataset.lang === 'en' ? 'en' : 'fr'];
  const fmt = (v: number) => Math.round(v).toLocaleString(L.loc);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let day = data.days[0];
  let step = 47;
  let timer: number | null = null;

  const map = root.querySelector<HTMLElement>('[data-map]')!;
  const chart = root.querySelector<HTMLElement>('[data-chart]')!;
  const clock = root.querySelector<HTMLElement>('[data-clock]')!;
  const total = root.querySelector<HTMLElement>('[data-total]')!;
  const gapEl = root.querySelector<HTMLElement>('[data-gap]')!;
  const summary = root.querySelector<HTMLElement>('[data-summary]')!;
  const playBtn = root.querySelector<HTMLButtonElement>('[data-play]')!;
  const scrub = root.querySelector<HTMLInputElement>('[data-scrub]')!;
  const legendPred = root.querySelector<HTMLElement>('[data-legend-pred]')!;

  /* ---------- Carte en tuiles ---------- */
  const TS = 62, GAP = 6;
  const msvg = el('svg', { viewBox: `0 0 ${4 * (TS + GAP)} ${5 * (TS + GAP)}`, role: 'img', 'aria-label': L.mapAria }, map);
  const tiles = new Map<string, { rect: SVGRectElement; val: SVGTextElement; bar: SVGRectElement }>();
  data.regions.forEach((r) => {
    const [c, row, code] = TILES[r] ?? [3, 4, r.slice(0, 3)];
    const g = el('g', { transform: `translate(${c * (TS + GAP)},${row * (TS + GAP)})` }, msvg);
    const title = el('title', {}, g);
    title.textContent = r;
    const rect = el('rect', { width: TS, height: TS, class: 'gr-tile' }, g);
    const bar = el('rect', { x: 0, y: TS - 3, width: 0, height: 3, class: 'gr-tilebar' }, g);
    const t1 = el('text', { x: 7, y: 16, class: 'gr-code' }, g);
    t1.textContent = code;
    const val = el('text', { x: 7, y: TS - 10, class: 'gr-val' }, g);
    tiles.set(r, { rect, val, bar });
  });

  /* ---------- Courbe nationale ---------- */
  const W = 640, H = 310, m = { l: 46, r: 12, t: 22, b: 26 };
  const Y0 = 25000, Y1 = 100000;
  const x = (i: number) => m.l + (i / 47) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - Y0) / (Y1 - Y0)) * (H - m.t - m.b);
  const csvg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': L.aria }, chart);
  for (let v = 30000; v <= Y1; v += 10000) {
    el('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'gr-grid' }, csvg);
    const t = el('text', { x: m.l - 6, y: y(v) + 3, 'text-anchor': 'end', class: 'ax-label' }, csvg);
    t.textContent = `${v / 1000}`;
  }
  const unit = el('text', { x: m.l - 6, y: 9, 'text-anchor': 'end', class: 'ax-label' }, csvg);
  unit.textContent = 'GW';
  for (let h = 0; h <= 24; h += 3) {
    const t = el('text', { x: x(Math.min(h * 2, 47)), y: H - 6, 'text-anchor': 'middle', class: 'ax-label' }, csvg);
    t.textContent = `${String(h).padStart(2, '0')}h`;
  }
  const record = el('line', { x1: m.l, x2: W - m.r, y1: y(data.meta.max), y2: y(data.meta.max), class: 'gr-record' }, csvg);
  void record;
  const recLabel = el('text', { x: W - m.r, y: y(data.meta.max) - 5, 'text-anchor': 'end', class: 'ax-label gr-reclabel' }, csvg);
  recLabel.textContent = root.dataset.lang === 'en' ? `record ${fmt(data.meta.max)} MW` : `record ${fmt(data.meta.max)} MW`;
  const area = el('path', { class: 'gr-gaparea' }, csvg);
  const predPath = el('path', { class: 'gr-pred' }, csvg);
  const realPath = el('path', { class: 'gr-real' }, csvg);
  const cursor = el('line', { y1: m.t, y2: H - m.b, class: 'gr-cursor' }, csvg);
  const dot = el('circle', { r: 4.5, class: 'gr-dot' }, csvg);

  const line = (vals: (number | null)[], upto: number) =>
    vals.slice(0, upto + 1).map((v, i) => (v == null ? '' : `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join('');

  function draw() {
    const real = day.national;
    const pred = day.pred;
    predPath.setAttribute('d', pred ? line(pred, 47) : '');
    realPath.setAttribute('d', line(real, step));
    if (pred) {
      const top = real.slice(0, step + 1).map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v ?? pred[i]).toFixed(1)}`).join('');
      const back = pred.slice(0, step + 1).map((v, i) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`).reverse().join('');
      area.setAttribute('d', top + back + 'Z');
    } else area.setAttribute('d', '');
    const v = real[step] ?? 0;
    cursor.setAttribute('x1', String(x(step)));
    cursor.setAttribute('x2', String(x(step)));
    dot.setAttribute('cx', String(x(step)));
    dot.setAttribute('cy', String(y(v)));

    clock.textContent = hhmm(step);
    total.textContent = `${fmt(v)} MW`;
    if (pred) {
      const g = v - pred[step];
      const p = ((Math.abs(g) / v) * 100).toLocaleString(L.loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      gapEl.textContent = `${L.gap} ${g >= 0 ? '+' : '−'}${fmt(Math.abs(g))} MW (${p}${root.dataset.lang === 'en' ? '%' : ' %'})`;
    } else gapEl.textContent = L.noPred;

    data.regions.forEach((r) => {
      const t = tiles.get(r)!;
      const rv = day.regions[r][step] ?? 0;
      const share = rv / data.regionMax[r];
      // part du maximum historique : 0.3 → papier, 1 → accent
      const k = Math.max(0, Math.min(1, (share - 0.3) / 0.7));
      t.rect.style.fill = `color-mix(in srgb, var(--accent) ${Math.round(k * 100)}%, var(--paper-2))`;
      t.rect.classList.toggle('is-hot', k > 0.62);
      t.val.textContent = `${fmt(rv)}`;
      t.bar.setAttribute('width', String(Math.max(0, Math.min(1, share)) * TS));
    });
    scrub.value = String(step);
    scrub.setAttribute('aria-valuetext', `${hhmm(step)} — ${fmt(v)} MW`);
    if (step === 47) showSummary();
    else summary.textContent = '';
  }

  function showSummary() {
    const real = day.national as number[];
    const peak = real.reduce((b, v, i) => (v > real[b] ? i : b), 0);
    let s = `${L.peak} : ${fmt(real[peak])} MW · ${hhmm(peak)}`;
    if (root.dataset.lang === 'en') s = s.replace(' :', ':');
    if (day.pred) {
      const mae = real.reduce((a, v, i) => a + Math.abs(v - day.pred![i]), 0) / real.length;
      const pctv = ((mae / (real.reduce((a, b) => a + b, 0) / real.length)) * 100).toLocaleString(L.loc, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
      s += root.dataset.lang === 'en' ? ` — ${L.mae}: ${fmt(mae)} MW (${pctv}%)` : ` — ${L.mae} : ${fmt(mae)} MW (${pctv} %)`;
    }
    summary.textContent = s;
  }

  function stop() {
    if (timer !== null) clearInterval(timer);
    timer = null;
    playBtn.textContent = step === 47 ? L.replay : L.play;
    playBtn.setAttribute('aria-pressed', 'false');
  }
  function play() {
    if (reduce) { step = 47; draw(); return; }
    if (step === 47) step = 0;
    playBtn.textContent = L.pause;
    playBtn.setAttribute('aria-pressed', 'true');
    timer = window.setInterval(() => {
      step += 1;
      draw();
      if (step >= 47) stop();
    }, 140);
  }
  playBtn.addEventListener('click', () => (timer === null ? play() : stop()));
  scrub.addEventListener('input', () => { stop(); step = Number(scrub.value); draw(); });

  const pick = (key: string, autoplay: boolean) => {
    day = data.days.find((d) => d.key === key)!;
    legendPred.hidden = !day.pred;
    root.querySelectorAll<HTMLButtonElement>('[data-day]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.day === key)));
    stop();
    step = autoplay && !reduce ? 0 : 47;
    draw();
    if (autoplay && !reduce) play();
  };
  root.querySelectorAll<HTMLButtonElement>('[data-day]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.day!, true)));

  pick(data.days.find((d) => d.key === 'winter') ? 'winter' : data.days[0].key, false);

  // Lecture automatique la première fois que la figure entre à l'écran
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { io.disconnect(); step = 0; draw(); play(); }
    }, { threshold: 0.4 });
    io.observe(chart);
  }
}
