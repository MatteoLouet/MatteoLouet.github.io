/**
 * Fig. 1 — Explorateur de capteurs C-MAPSS.
 * Charge l'index puis un seul fichier par capteur (/data/cmapss/<id>.json).
 * Interactions : capteur, alignement (début / panne), lissage, survol (moteur le
 * plus proche), clic pour épingler, histogramme des durées de vie qui filtre.
 */
import { scaleLinear } from 'd3-scale';
import { line, area } from 'd3-shape';
import { extent, quantile, bin, max } from 'd3-array';

type Sensor = { id: string; name: string; desc: string; unit: string };
type Index = { meta: { demo: boolean; subset: string; note: string }; sensors: Sensor[]; lives: number[] };

const NS = 'http://www.w3.org/2000/svg';
const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  parent?.appendChild(e);
  return e;
};
// Moyenne glissante centrée (fenêtre 2h+1, réduite aux bords)
const smoothArr = (a: number[], h: number) => {
  if (h <= 0) return a;
  const pre = [0];
  for (const v of a) pre.push(pre[pre.length - 1] + v);
  return a.map((_, i) => {
    const lo = Math.max(0, i - h), hi = Math.min(a.length, i + h + 1);
    return (pre[hi] - pre[lo]) / (hi - lo);
  });
};

// Textes de l'explorateur (FR / EN), choisis d'après data-lang sur la figure
const I18N = {
  fr: {
    fail: 'panne',
    axisEnd: 'cycles avant la panne →',
    axisStart: 'cycles depuis la mise en service →',
    aria: (s: string, n: number) => `Trajectoires du capteur ${s} pour ${n} moteurs`,
    tipHead: (u: number, life: number) => `Moteur ${u} · ${life} cycles de vie`,
    tipCycle: (c: number) => `cycle ${c}`,
    tipFail: (d: number) => ` (panne − ${d})`,
    smoothed: '(lissé)',
    hover: (u: number, life: number) => `Moteur ${u} · durée de vie ${life} cycles`,
    shown: (n: number) => `${n} moteurs affichés`,
    range: (a: number, b: number) => ` (durée de vie ${a}–${b} cycles)`,
    pinned: (u: number) => ` · moteur ${u} épinglé`,
    histAria: 'Histogramme des durées de vie — choisir une classe pour filtrer',
    life: 'vie →',
    bin: (n: number, a: number, b: number) => `${n} moteurs entre ${a} et ${b} cycles`,
    desc: {} as Record<string, string>,
  },
  en: {
    fail: 'failure',
    axisEnd: 'cycles before failure →',
    axisStart: 'cycles since entry into service →',
    aria: (s: string, n: number) => `Trajectories of sensor ${s} for ${n} engines`,
    tipHead: (u: number, life: number) => `Engine ${u} · ${life}-cycle life`,
    tipCycle: (c: number) => `cycle ${c}`,
    tipFail: (d: number) => ` (failure − ${d})`,
    smoothed: '(smoothed)',
    hover: (u: number, life: number) => `Engine ${u} · lifetime ${life} cycles`,
    shown: (n: number) => `${n} engines shown`,
    range: (a: number, b: number) => ` (lifetime ${a}–${b} cycles)`,
    pinned: (u: number) => ` · engine ${u} pinned`,
    histAria: 'Lifetime histogram — pick a bin to filter',
    life: 'life →',
    bin: (n: number, a: number, b: number) => `${n} engines between ${a} and ${b} cycles`,
    desc: {
      s2: 'LPC outlet temperature',
      s3: 'HPC outlet temperature',
      s4: 'LPT outlet temperature',
      s7: 'HPC outlet total pressure',
      s11: 'HPC outlet static pressure',
      s12: 'Fuel flow to Ps30 ratio',
      s15: 'Bypass ratio',
      s21: 'LPT coolant bleed',
    } as Record<string, string>,
  },
};

export async function mountExplorer(root: HTMLElement) {
  const I = I18N[root.dataset.lang === 'en' ? 'en' : 'fr'];
  const base = root.dataset.base || '/data/cmapss/';
  const idx: Index = await fetch(base + 'index.json').then((r) => r.json());
  const cache = new Map<string, number[][]>();
  const load = async (id: string) => {
    if (!cache.has(id)) cache.set(id, await fetch(`${base}${id}.json`).then((r) => r.json()));
    return cache.get(id)!;
  };

  const state = {
    sensor: idx.sensors.find((s) => s.id === 's4')?.id ?? idx.sensors[0].id,
    align: 'end' as 'start' | 'end',
    smooth: true,
    pinned: null as number | null,
    hover: null as number | null,
    lifeRange: null as [number, number] | null,
  };

  /* ---- Contrôles ---- */
  const sensorBox = root.querySelector<HTMLElement>('[data-sensors]')!;
  idx.sensors.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.sensor = s.id;
    b.textContent = s.name;
    b.title = I.desc[s.id] ?? s.desc;
    b.setAttribute('aria-pressed', String(s.id === state.sensor));
    b.addEventListener('click', () => { state.sensor = s.id; sync(); render(); });
    sensorBox.appendChild(b);
  });
  root.querySelectorAll<HTMLButtonElement>('[data-align]').forEach((b) =>
    b.addEventListener('click', () => { state.align = b.dataset.align as 'start' | 'end'; sync(); render(); })
  );
  const smoothBox = root.querySelector<HTMLInputElement>('[data-smooth]')!;
  smoothBox.addEventListener('change', () => { state.smooth = smoothBox.checked; render(); });
  root.querySelector('[data-reset]')!.addEventListener('click', () => {
    Object.assign(state, { sensor: 's4', align: 'end', smooth: true, pinned: null, hover: null, lifeRange: null });
    smoothBox.checked = true; sync(); render();
  });
  const sync = () => {
    root.querySelectorAll<HTMLButtonElement>('[data-sensor]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sensor === state.sensor)));
    root.querySelectorAll<HTMLButtonElement>('[data-align]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.align === state.align)));
  };

  const plot = root.querySelector<HTMLElement>('[data-plot]')!;
  const hist = root.querySelector<HTMLElement>('[data-hist]')!;
  const tip = root.querySelector<HTMLElement>('.tip')!;
  const readout = root.querySelector<HTMLElement>('[data-readout]')!;
  const titleEl = root.querySelector<HTMLElement>('[data-sensor-title]')!;

  let renderId = 0;
  async function render() {
    const id = ++renderId;
    const raw = await load(state.sensor);
    if (id !== renderId) return;
    const sensor = idx.sensors.find((s) => s.id === state.sensor)!;
    titleEl.textContent = `${sensor.name} — ${I.desc[sensor.id] ?? sensor.desc}${sensor.unit !== '—' ? ` (${sensor.unit})` : ''}`;

    const series = raw.map((a) => (state.smooth ? smoothArr(a, 5) : a));
    const lives = idx.lives;
    const inRange = (u: number) => !state.lifeRange || (lives[u] >= state.lifeRange[0] && lives[u] < state.lifeRange[1]);
    const xOf = (u: number, i: number) => (state.align === 'start' ? i + 1 : i + 1 - lives[u]);

    const W = plot.clientWidth;
    const H = W < 640 ? 320 : 450;
    const m = { t: 14, r: 14, b: 44, l: 52 };
    const maxLife = max(lives)!;
    const x = scaleLinear().domain(state.align === 'start' ? [0, maxLife] : [-maxLife, 0]).range([m.l, W - m.r]);
    const [lo, hi] = extent(series.flat()) as [number, number];
    const pad = (hi - lo) * 0.04;
    const y = scaleLinear().domain([lo - pad, hi + pad]).nice().range([H - m.b, m.t]);

    plot.innerHTML = '';
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': I.aria(sensor.name, lives.length) }, plot);

    // Axes
    const gx = el('g', { class: 'axis' }, svg);
    x.ticks(W < 640 ? 4 : 8).forEach((t) => {
      el('line', { x1: x(t), x2: x(t), y1: m.t, y2: H - m.b, class: 'gridline' }, gx);
      const last = state.align === 'end' && t === 0;
      const tx = el('text', { x: x(t), y: H - m.b + 18, 'text-anchor': last ? 'end' : 'middle' }, gx);
      tx.textContent = state.align === 'end' && t === 0 ? I.fail : String(t);
    });
    const gy = el('g', { class: 'axis' }, svg);
    y.ticks(5).forEach((t) => {
      el('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'gridline gridline--y' }, gy);
      const ty = el('text', { x: m.l - 8, y: y(t) + 3.5, 'text-anchor': 'end' }, gy);
      ty.textContent = String(+t.toFixed(3));
    });
    const xl = el('text', { x: m.l, y: H - 4, class: 'ax-label' }, svg);
    xl.textContent = state.align === 'end' ? I.axisEnd : I.axisStart;

    // Bande interquartile + médiane (alignées sur la panne uniquement : c'est là qu'elles ont un sens)
    if (state.align === 'end') {
      const band: { d: number; q1: number; q2: number; q3: number }[] = [];
      for (let d = -maxLife; d <= 0; d++) {
        const vs = series.map((s, u) => (inRange(u) ? s[lives[u] - 1 + d] : undefined)).filter((v): v is number => v !== undefined).sort((a, b) => a - b);
        if (vs.length >= (state.lifeRange ? 3 : 8)) band.push({ d, q1: quantile(vs, 0.25)!, q2: quantile(vs, 0.5)!, q3: quantile(vs, 0.75)! });
      }
      el('path', { class: 'iqr', d: area<(typeof band)[0]>().x((p) => x(p.d)).y0((p) => y(p.q1)).y1((p) => y(p.q3))(band) ?? '' }, svg);
      medianPath = line<(typeof band)[0]>().x((p) => x(p.d)).y((p) => y(p.q2))(band) ?? '';
    } else medianPath = '';

    // Trajectoires
    const gl = el('g', { class: 'traces' }, svg);
    const paths: SVGPathElement[] = series.map((s, u) => {
      const p = el('path', { d: line<number>().x((_, i) => x(xOf(u, i))).y((v) => y(v))(s) ?? '', class: 'trace' + (inRange(u) ? '' : ' is-out') }, gl);
      return p;
    });
    if (medianPath) el('path', { class: 'median', d: medianPath }, svg);
    if (state.align === 'end') el('line', { x1: x(0), x2: x(0), y1: m.t, y2: H - m.b, class: 'failline' }, svg);

    const focus = el('path', { class: 'focus' }, svg);
    const dot = el('circle', { r: 0, class: 'focus-dot' }, svg);
    const showUnit = (u: number | null, cx?: number) => {
      paths.forEach((p, i) => p.classList.toggle('is-pin', i === state.pinned));
      if (u === null) { focus.setAttribute('d', ''); dot.setAttribute('r', '0'); tip.classList.remove('is-on'); return; }
      focus.setAttribute('d', paths[u].getAttribute('d')!);
      if (cx !== undefined) {
        const i = Math.round(state.align === 'start' ? x.invert(cx) - 1 : x.invert(cx) + lives[u] - 1);
        const ii = Math.max(0, Math.min(series[u].length - 1, i));
        const vx = x(xOf(u, ii)), vy = y(series[u][ii]);
        dot.setAttribute('cx', String(vx)); dot.setAttribute('cy', String(vy)); dot.setAttribute('r', '4');
        tip.innerHTML = `<span class="meta">${I.tipHead(u + 1, lives[u])}</span>${I.tipCycle(ii + 1)}${state.align === 'end' ? I.tipFail(lives[u] - ii - 1) : ''}<br><strong>${sensor.name} = ${series[u][ii].toFixed(sensor.id === 's15' ? 4 : 2)}</strong>${state.smooth ? ` <span style="color:#b9b6ae">${I.smoothed}</span>` : ''}`;
        const left = Math.min(vx + 14, W - 230);
        tip.style.left = `${left}px`;
        tip.style.top = `${Math.max(vy - 70, 0)}px`;
        tip.classList.add('is-on');
      }
    };
    const nearest = (px: number, py: number) => {
      let best: number | null = null, bd = Infinity;
      series.forEach((s, u) => {
        if (!inRange(u)) return;
        const i = Math.round(state.align === 'start' ? x.invert(px) - 1 : x.invert(px) + lives[u] - 1);
        if (i < 0 || i >= s.length) return;
        const d = Math.abs(y(s[i]) - py);
        if (d < bd) { bd = d; best = u; }
      });
      return bd < 24 ? best : null;
    };
    svg.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const u = nearest(px, py) ?? state.pinned;
      state.hover = u;
      showUnit(u, px);
      readout.textContent = u !== null ? I.hover(u + 1, lives[u]) : readoutDefault();
    });
    svg.addEventListener('pointerleave', () => {
      showUnit(state.pinned, state.pinned !== null ? x(state.align === 'end' ? -10 : lives[state.pinned] - 10) : undefined);
      if (state.pinned === null) tip.classList.remove('is-on');
      readout.textContent = readoutDefault();
    });
    svg.addEventListener('click', () => {
      state.pinned = state.hover === state.pinned ? null : state.hover;
      showUnit(state.pinned);
      drawHist();
    });

    const readoutDefault = () => {
      const n = lives.filter((_, u) => inRange(u)).length;
      return `${I.shown(n)}${state.lifeRange ? I.range(state.lifeRange[0], state.lifeRange[1]) : ''}${state.pinned !== null ? I.pinned(state.pinned + 1) : ''}`;
    };
    readout.textContent = readoutDefault();
    if (state.pinned !== null) showUnit(state.pinned);

    /* ---- Histogramme des durées de vie (filtre) ---- */
    function drawHist() {
      const HW = hist.clientWidth, HH = 92, hm = { t: 6, r: 12, b: 24, l: 52 };
      const lo = Math.floor(Math.min(...lives) / 20) * 20, hi = Math.ceil((max(lives)! + 1) / 20) * 20;
      const bins = bin().domain([lo, hi]).thresholds(Array.from({ length: (hi - lo) / 20 - 1 }, (_, k) => lo + 20 * (k + 1)))(lives);
      const hx = scaleLinear().domain([lo, hi]).range([hm.l, HW - hm.r]);
      const hy = scaleLinear().domain([0, max(bins, (b) => b.length)!]).range([HH - hm.b, hm.t]);
      hist.innerHTML = '';
      const hs = el('svg', { viewBox: `0 0 ${HW} ${HH}`, width: HW, height: HH, role: 'group', 'aria-label': I.histAria }, hist);
      const ga = el('g', { class: 'axis' }, hs);
      hx.ticks(HW < 640 ? 4 : 7).forEach((t) => {
        const tx = el('text', { x: hx(t), y: HH - 6, 'text-anchor': 'middle' }, ga);
        tx.textContent = String(t);
      });
      const lab = el('text', { x: 0, y: HH - 6, class: 'ax-label' }, hs);
      lab.textContent = I.life;
      bins.forEach((b) => {
        if (!b.length) return; // classe vide : rien à filtrer
        const active = state.lifeRange && state.lifeRange[0] === b.x0;
        const g = el('g', { class: 'hbin' + (active ? ' is-on' : '') + (state.lifeRange && !active ? ' is-off' : ''), tabindex: 0, role: 'button', 'aria-label': I.bin(b.length, b.x0!, b.x1!) }, hs);
        el('rect', { x: hx(b.x0!) + 1, width: Math.max(hx(b.x1!) - hx(b.x0!) - 2, 1), y: hy(b.length), height: HH - hm.b - hy(b.length), class: 'hbar' }, g);
        el('rect', { x: hx(b.x0!), width: hx(b.x1!) - hx(b.x0!), y: 0, height: HH - hm.b, class: 'hhit' }, g);
        if (state.pinned !== null && lives[state.pinned] >= b.x0! && lives[state.pinned] < b.x1!)
          el('rect', { x: hx(lives[state.pinned]) - 1, width: 2, y: hm.t, height: HH - hm.b - hm.t, class: 'hpin' }, hs);
        const pick = () => {
          state.lifeRange = active ? null : [b.x0!, b.x1!];
          render();
        };
        g.addEventListener('click', pick);
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      });
      el('line', { x1: hm.l, x2: HW - hm.r, y1: HH - hm.b, y2: HH - hm.b, class: 'hbase' }, hs);
    }
    drawHist();
  }
  let medianPath = '';

  let t: number | undefined;
  new ResizeObserver(() => { clearTimeout(t); t = window.setTimeout(render, 120); }).observe(plot);
  await render();
}
