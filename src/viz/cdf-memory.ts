/**
 * Fig. 1 — CDataframe en mémoire.
 * Simule pas à pas le comportement du code C du dépôt (column.c, cdataframe.c, main.c) :
 * - remlissge_dur_dataframe() remplit une colonne avec (rand() % 101) + 1 — on utilise la VRAIE suite
 *   rand() du programme (jamais initialisée par srand, donc identique à chaque exécution) ;
 * - toutes les colonnes gardent un pointeur vers le même tampon titre_col ("col_" sur 5 octets) :
 *   écrire titre_col[4] efface le '\0' et le titre « déborde » sur la chaîne num voisine ;
 * - insert_value() augmente taille_logique de 256 mais réalloue toujours 256 int : au-delà, débordement.
 */
type Col = { values: number[]; logical: number; allocated: number };
type Data = { rand: number[]; transcript: string };

const NUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const T = {
  fr: {
    df: 'CDATAFRAME', col: 'COLUMN', title: 'titre', vals: 'valeurs', phys: 'taille_physique', log: 'taille_logique',
    alloc: 'alloués', over: 'hors allocation', shared: 'Tampon titre_col (partagé par toutes les colonnes)',
    out: 'Ce que le programme affiche', empty: 'Aucune colonne.', ub: '?', ubNote: '? = lecture au-delà de la fin de la colonne (comportement indéfini en C)',
    stepAdd: (c: string, n: number) => `Colonne ${c} : ${n} valeurs tirées par rand()`,
    stepBig: (n: number) => `Colonne remplie de ${n} valeurs : la 257ᵉ est écrite hors de la mémoire allouée`,
  },
  en: {
    df: 'CDATAFRAME', col: 'COLUMN', title: 'titre', vals: 'valeurs', phys: 'taille_physique', log: 'taille_logique',
    alloc: 'allocated', over: 'outside allocation', shared: 'titre_col buffer (shared by every column)',
    out: 'What the program prints', empty: 'No column.', ub: '?', ubNote: '? = read past the end of the column (undefined behaviour in C)',
    stepAdd: (c: string, n: number) => `Column ${c}: ${n} values drawn by rand()`,
    stepBig: (n: number) => `Column filled with ${n} values: the 257th is written outside allocated memory`,
  },
};

export function mountCdf(root: HTMLElement, data: Data) {
  const L = T[root.dataset.lang === 'en' ? 'en' : 'fr'];
  const memEl = root.querySelector<HTMLElement>('[data-mem]')!;
  const outEl = root.querySelector<HTMLElement>('[data-out]')!;
  const logEl = root.querySelector<HTMLElement>('[data-log]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let cols: Col[] = [];
  let z = 0; // indice dans num, comme la variable globale z de main.c
  let r = 0; // position dans la suite rand()
  let lastChar = ''; // titre_col[4]
  let maxNbr = 0;
  let busy = false;

  const insert = (c: Col, v: number) => {
    // insert_value() : si plein, taille_logique += 256 mais realloc(..., 256 * sizeof(int))
    if (c.values.length >= c.logical) { c.logical += 256; c.allocated = 256; }
    c.values.push(v);
  };

  function titleString() {
    // printf("%s", titre) lit jusqu'au premier '\0' : "col_" + titre_col[4] + num (pas de '\0' entre les deux)
    return lastChar ? `col_${lastChar}${NUM}` : 'col_';
  }

  function render(highlight = -1) {
    const tstr = titleString();
    memEl.innerHTML = `
      <div class="cm-df">
        <div class="cm-h">${L.df}</div>
        <div class="cm-f"><span>tab_val</span><span class="cm-slots">${cols.map((_, i) => `<i class="${i === highlight ? 'is-new' : ''}">●</i>`).join('') || '—'}</span></div>
        <div class="cm-f"><span>${L.phys}</span><b>${cols.length}</b></div>
        <div class="cm-f"><span>${L.log}</span><b>${cols.length ? 256 : 0}</b></div>
      </div>
      <div class="cm-cols">${cols.map((c, i) => {
        const cells = Math.max(c.allocated, 256);
        const over = Math.max(0, c.values.length - c.allocated);
        let grid = '';
        for (let k = 0; k < cells; k++) grid += `<i class="${k < c.values.length ? 'on' : ''}"></i>`;
        let ov = '';
        for (let k = 0; k < Math.min(over, 64); k++) ov += '<i></i>';
        return `<div class="cm-col${i === highlight ? ' is-new' : ''}">
          <div class="cm-h">${L.col} ${i}</div>
          <div class="cm-f"><span>${L.title}</span><span class="cm-ptr">→ titre_col</span></div>
          <div class="cm-f"><span>${L.phys}</span><b>${c.values.length}</b></div>
          <div class="cm-f"><span>${L.log}</span><b class="${c.logical > c.allocated ? 'is-bad' : ''}">${c.logical}</b></div>
          <div class="cm-buf"><div class="cm-grid">${grid}</div>${over ? `<div class="cm-over">${ov}</div>` : ''}</div>
          <div class="cm-cap"><span>${c.allocated || 0} int ${L.alloc}</span>${over ? `<span class="is-bad">+${over} ${L.over}</span>` : ''}</div>
        </div>`;
      }).join('')}</div>
      <div class="cm-title">
        <div class="cm-cap">${L.shared}</div>
        <div class="cm-bytes">${['c', 'o', 'l', '_'].map((ch) => `<i>${ch}</i>`).join('')}<i class="${lastChar ? 'is-bad' : ''}">${lastChar || '\\0'}</i><span class="cm-gap"></span>${NUM.split('').map((ch) => `<i class="cm-num">${ch}</i>`).join('')}<i class="cm-num">\\0</i></div>
      </div>`;

    // Sortie de affiche_dataframe()
    if (!cols.length) { outEl.textContent = L.empty; return; }
    const lines = [cols.map(() => tstr).join('\t')];
    for (let row = 0; row < Math.min(maxNbr, 12); row++) {
      lines.push(cols.map((c) => (row < c.values.length ? String(c.values[row]) : L.ub)).join('\t'));
    }
    if (maxNbr > 12) lines.push(`… (${maxNbr - 12})`);
    if (cols.some((c) => c.values.length < maxNbr)) lines.push('', L.ubNote);
    outEl.textContent = lines.join('\n');
  }

  function addColumn(nbr: number) {
    if (busy) return;
    lastChar = NUM[z % NUM.length];
    z += 1;
    const c: Col = { values: [], logical: 0, allocated: 0 };
    cols.push(c);
    maxNbr = Math.max(maxNbr, nbr);
    const idx = cols.length - 1;
    logEl.textContent = nbr > 256 ? L.stepBig(nbr) : L.stepAdd(String.fromCharCode(65 + idx), nbr);
    if (reduce || nbr > 40) {
      for (let k = 0; k < nbr; k++) insert(c, data.rand[(r + k) % data.rand.length]);
      r += nbr;
      render(idx);
      return;
    }
    busy = true;
    let k = 0;
    const tick = () => {
      insert(c, data.rand[r % data.rand.length]);
      r += 1; k += 1;
      render(idx);
      if (k < nbr) window.setTimeout(tick, 160); else busy = false;
    };
    tick();
  }

  function reset() { cols = []; z = 0; r = 0; lastChar = ''; maxNbr = 0; busy = false; logEl.textContent = ''; render(); }

  root.querySelector('[data-add]')!.addEventListener('click', () => addColumn(5));
  root.querySelector('[data-big]')!.addEventListener('click', () => addColumn(300));
  root.querySelector('[data-reset]')!.addEventListener('click', reset);

  // État initial, sans animation : la même exécution que la sortie réelle (3 colonnes de 5 valeurs)
  reset();
  [5, 5, 5].forEach(() => {
    lastChar = NUM[z % NUM.length]; z += 1;
    const c: Col = { values: [], logical: 0, allocated: 0 };
    for (let k = 0; k < 5; k++) insert(c, data.rand[r++]);
    cols.push(c);
  });
  maxNbr = 5;
  render();
}
