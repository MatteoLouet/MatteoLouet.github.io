/**
 * Explorateur « Qui contrôle les antennes ? » : carte des 69 302 supports d'antennes de métropole
 * colorés par type de propriétaire, et indice de dépendance par département à poids réglables.
 * Données : scripts/anfr/export.py (calculées avec src/analytics.py du dépôt anfr-supports-dashboard).
 * L'indice reprend scorecard_departements : 4 composantes normalisées min-max sur les 96 départements,
 * moyenne pondérée × 100, arrondie au dixième. Avec des poids égaux, il retrouve la valeur Python.
 */

export interface Dep {
  dep: string; nom: string; n: number; hhi: number; top1: string; top1_part: number;
  communes_mono: number; quatre_ops: number; part_towerco: number; indice_py: number;
}
export interface Carte { deps: string[]; noms: string[]; categories: string[]; bbox: [number, number, number, number]; n: number }

export const COMPOSANTES = ['hhi', 'top1_part', 'communes_mono', 'quatre_ops'] as const;
export type Comp = (typeof COMPOSANTES)[number];

/** Indice de dépendance (0-100) pour chaque département, selon les poids. */
export function indices(deps: Dep[], poids: Record<Comp, number>): Map<string, number> {
  const mm = Object.fromEntries(COMPOSANTES.map((c) => {
    const v = deps.map((d) => d[c]);
    return [c, [Math.min(...v), Math.max(...v)]];
  })) as Record<Comp, [number, number]>;
  const total = COMPOSANTES.reduce((s, c) => s + poids[c], 0) || 1;
  const out = new Map<string, number>();
  for (const d of deps) {
    let s = 0;
    for (const c of COMPOSANTES) {
      const [a, b] = mm[c];
      s += poids[c] * (b > a ? (d[c] - a) / (b - a) : 0);
    }
    out.set(d.dep, Math.round((s / total) * 1000) / 10);
  }
  return out;
}

async function gunzipSiBesoin(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const u = new Uint8Array(buf, 0, 2);
  if (u[0] !== 0x1f || u[1] !== 0x8b) return buf; // déjà décompressé par le navigateur (Content-Encoding)
  const ds = new DecompressionStream('gzip');
  return new Response(new Blob([buf]).stream().pipeThrough(ds)).arrayBuffer();
}

const COULEURS = ['#315C9B', '#CC1505', '#3F8A4E', '#C99A1E', '#B9B5AC']; // palette du dépôt (src/referentiels.py)

export function mountAnfr(root: HTMLElement) {
  const lang = root.dataset.lang === 'en' ? 'en' : 'fr';
  const T = (fr: string, en: string) => (lang === 'fr' ? fr : en);
  const loc = lang === 'fr' ? 'fr-FR' : 'en-GB';
  const nf = (v: number, d = 0) => v.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d });
  const pc = (v: number, d = 0) => (lang === 'fr' ? `${nf(v * 100, d)}\u00a0%` : `${nf(v * 100, d)}%`);
  const deps: Dep[] = JSON.parse(root.dataset.deps!);
  const carte: Carte = JSON.parse(root.dataset.carte!);
  const byDep = new Map(deps.map((d) => [d.dep, d]));

  const canvas = root.querySelector<HTMLCanvasElement>('[data-canvas]')!;
  const ctx = canvas.getContext('2d')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const label = root.querySelector<HTMLElement>('[data-label]')!;
  const list = root.querySelector<HTMLOListElement>('[data-rank]')!;
  const card = root.querySelector<HTMLElement>('[data-card]')!;
  const select = root.querySelector<HTMLSelectElement>('[data-select]')!;
  const legend = [...root.querySelectorAll<HTMLButtonElement>('[data-cat]')];
  const sliders = [...root.querySelectorAll<HTMLInputElement>('[data-w]')];

  let X: Float32Array | null = null, Y: Float32Array | null = null, C: Uint8Array | null = null, D: Uint8Array | null = null;
  const actives = new Set(carte.categories.map((_, i) => i));
  let choisi: string | null = null;
  let idx = indices(deps, { hhi: 1, top1_part: 1, communes_mono: 1, quatre_ops: 1 });
  let rangs: Dep[] = [];

  // projection équirectangulaire corrigée par cos(latitude moyenne)
  const [lon0, lat0, lon1, lat1] = carte.bbox;
  const kx = Math.cos(((lat0 + lat1) / 2) * Math.PI / 180);
  let view = { s: 1, ox: 0, oy: 0, w: 0, h: 0, dpr: 1 };

  // emprise (en coordonnées projetées) de chaque département, pour zoomer sur celui qui est choisi
  const emprise = new Map<number, [number, number, number, number]>();
  function fit() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    const pad = 18;
    let [x0, y0, x1, y1] = [0, 0, (lon1 - lon0) * kx, lat1 - lat0];
    const e = choisi ? emprise.get(carte.deps.indexOf(choisi)) : undefined;
    if (e) {
      // le département et ses voisins immédiats : marge d'une demi-emprise de chaque côté
      const mx = Math.max((e[2] - e[0]) * 0.6, 0.35), my = Math.max((e[3] - e[1]) * 0.6, 0.35);
      [x0, y0, x1, y1] = [e[0] - mx, e[1] - my, e[2] + mx, e[3] + my];
    }
    const ww = x1 - x0, hh = y1 - y0;
    const s = Math.min((r.width - 2 * pad) / ww, (r.height - 2 * pad) / hh);
    view = { s, ox: (r.width - ww * s) / 2 - x0 * s, oy: (r.height - hh * s) / 2 - y0 * s, w: r.width, h: r.height, dpr };
  }
  const px = (i: number) => view.ox + X![i] * view.s;
  const py = (i: number) => view.oy + Y![i] * view.s;

  function draw() {
    const { w, h, dpr } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!X) return;
    const n = X.length;
    const di = choisi ? carte.deps.indexOf(choisi) : -1;
    const sz = Math.max(1.1, Math.min(4, view.s / 90));
    // deux passes : le département choisi par-dessus les autres
    for (const pass of di >= 0 ? [0, 1] : [1]) {
      for (let c = 0; c < COULEURS.length; c++) {
        if (!actives.has(c)) continue;
        ctx.fillStyle = COULEURS[c];
        ctx.globalAlpha = di >= 0 && pass === 0 ? 0.13 : 0.85;
        for (let i = 0; i < n; i++) {
          if (C![i] !== c) continue;
          const dans = D![i] === di;
          if (di >= 0 && (pass === 1) !== dans) continue;
          ctx.fillRect(px(i) - sz / 2, py(i) - sz / 2, sz, sz);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function niveau(hhi: number) {
    if (hhi < 1000) return T('peu concentré', 'unconcentrated');
    if (hhi < 1800) return T('modérément concentré', 'moderately concentrated');
    return T('très concentré', 'highly concentrated');
  }

  function renderRang() {
    rangs = [...deps].sort((a, b) => idx.get(b.dep)! - idx.get(a.dep)! || a.nom.localeCompare(b.nom));
    list.innerHTML = rangs.slice(0, 10).map((d, i) => {
      const v = idx.get(d.dep)!;
      return `<li><button type="button" data-dep="${d.dep}" aria-pressed="${d.dep === choisi}">
        <span class="ax__r tnum">${i + 1}</span><span class="ax__n">${d.nom}</span>
        <span class="ax__bar"><span style="width:${v}%"></span></span><span class="ax__v tnum">${nf(v, 1)}</span></button></li>`;
    }).join('');
  }

  function renderCard() {
    const d = choisi ? byDep.get(choisi) : null;
    if (!d) {
      card.innerHTML = `<p class="ax__hint">${T('Cliquez sur la carte ou dans le classement pour afficher un département.', 'Click the map or the ranking to show a département.')}</p>`;
      label.textContent = '';
      return;
    }
    const rang = rangs.findIndex((x) => x.dep === d.dep) + 1;
    label.textContent = `${d.nom} (${d.dep})`;
    card.innerHTML = `
      <p class="ax__dn">${d.nom} <span>${d.dep}</span></p>
      <p class="ax__big"><span class="tnum">${nf(idx.get(d.dep)!, 1)}</span> <small>/ 100 · ${T('rang', 'rank')} ${rang} ${T('sur', 'of')} ${deps.length}</small></p>
      <dl class="ax__kv">
        <div><dt>${T('Supports', 'Sites')}</dt><dd class="tnum">${nf(d.n)}</dd></div>
        <div><dt>${T('1er propriétaire', 'Largest owner')}</dt><dd>${d.top1} · ${pc(d.top1_part)}</dd></div>
        <div><dt>HHI</dt><dd class="tnum">${nf(d.hhi)} · ${niveau(d.hhi)}</dd></div>
        <div><dt>${T('Part des TowerCos', 'TowerCo share')}</dt><dd class="tnum">${pc(d.part_towerco)}</dd></div>
        <div><dt>${T('Sites à 4 opérateurs', '4-operator sites')}</dt><dd class="tnum">${pc(d.quatre_ops)}</dd></div>
        <div><dt>${T('Communes captives', 'Captive communes')}</dt><dd class="tnum">${pc(d.communes_mono, 1)}</dd></div>
      </dl>`;
  }

  function choisir(dep: string | null) {
    choisi = dep && byDep.has(dep) ? dep : null;
    select.value = choisi ?? '';
    renderRang(); renderCard(); fit(); draw();
  }

  // --- interactions
  list.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-dep]');
    if (b) choisir(b.dataset.dep === choisi ? null : b.dataset.dep!);
  });
  select.addEventListener('change', () => choisir(select.value || null));
  sliders.forEach((s) => s.addEventListener('input', () => {
    const p = Object.fromEntries(sliders.map((x) => [x.dataset.w, Number(x.value)])) as Record<Comp, number>;
    sliders.forEach((x) => { x.closest('label')!.querySelector('output')!.textContent = x.value; });
    idx = indices(deps, p);
    renderRang(); renderCard();
  }));
  legend.forEach((b) => b.addEventListener('click', () => {
    const c = Number(b.dataset.cat);
    // un clic isole la catégorie ; un second clic réaffiche tout
    const seule = actives.size === 1 && actives.has(c);
    actives.clear();
    if (seule) carte.categories.forEach((_, i) => actives.add(i)); else actives.add(c);
    legend.forEach((x) => x.setAttribute('aria-pressed', String(actives.has(Number(x.dataset.cat)))));
    draw();
  }));
  canvas.addEventListener('click', (e) => {
    if (!X) return;
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = -1, bd = 14 * 14;
    for (let i = 0; i < X.length; i++) {
      const dx = px(i) - mx, dy = py(i) - my, d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; best = i; }
    }
    if (best >= 0) { const dep = carte.deps[D![best]]; choisir(dep === choisi ? null : dep); }
  });
  new ResizeObserver(() => { fit(); draw(); }).observe(canvas);

  renderRang(); renderCard();

  // --- chargement différé des supports
  const charger = async () => {
    status.textContent = T('Chargement des 69 302 supports…', 'Loading 69,302 sites…');
    try {
      const res = await fetch(root.dataset.src!);
      if (!res.ok) throw new Error(String(res.status));
      const buf = await gunzipSiBesoin(await res.arrayBuffer());
      const n = buf.byteLength / 6;
      const dv = new DataView(buf);
      X = new Float32Array(n); Y = new Float32Array(n); C = new Uint8Array(n); D = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const lon = lon0 + (dv.getUint16(i * 6, true) / 65535) * (lon1 - lon0);
        const lat = lat0 + (dv.getUint16(i * 6 + 2, true) / 65535) * (lat1 - lat0);
        X[i] = (lon - lon0) * kx; Y[i] = lat1 - lat;
        C[i] = dv.getUint8(i * 6 + 4); D[i] = dv.getUint8(i * 6 + 5);
        const e = emprise.get(D[i]);
        if (!e) emprise.set(D[i], [X[i], Y[i], X[i], Y[i]]);
        else { e[0] = Math.min(e[0], X[i]); e[1] = Math.min(e[1], Y[i]); e[2] = Math.max(e[2], X[i]); e[3] = Math.max(e[3], Y[i]); }
      }
      status.textContent = '';
      fit(); draw();
    } catch {
      status.textContent = T('Carte indisponible.', 'Map unavailable.');
    }
  };
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); charger(); }
  }, { rootMargin: '400px' });
  io.observe(root);
}
