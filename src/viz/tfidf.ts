/**
 * TF-IDF minimal, calculé dans le navigateur — même principe que le chatbot du projet 04.
 * tf = occurrences / longueur du document ; idf = ln((1 + N) / (1 + df)) + 1 (lissage) ;
 * similarité = cosinus entre le vecteur de la question et celui de chaque document.
 */
const STOP = new Set(
  'le la les un une des de du d l et ou à au aux en dans par pour sur avec sans ce cet cette ces qui que quoi est sont être a ai as avez ont il elle on nous vous je j tu ne pas plus se sa son ses leur leurs y comment quel quelle quels quelles combien pourquoi mon ma mes ton ta tes votre vos notre nos c qu s n m t the an of and or to in on at by for with without this that these those which what who whom is are was were be been being do does did has have had he she it we you they i me my his her its our your their not no as from into about how why when where can could will would should there here than then so if but also'.split(' ')
);

export const tokenize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^-+|-+$/g, ''))
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w)); // pluriel naïf

export interface Doc { id: string; title: string; text: string }

export function buildIndex(docs: Doc[]) {
  const toks = docs.map((d) => tokenize(d.title + ' ' + d.text));
  const df = new Map<string, number>();
  toks.forEach((t) => new Set(t).forEach((w) => df.set(w, (df.get(w) ?? 0) + 1)));
  const N = docs.length;
  const idf = (w: string) => Math.log((1 + N) / (1 + (df.get(w) ?? 0))) + 1;
  const vec = (t: string[]) => {
    const m = new Map<string, number>();
    t.forEach((w) => m.set(w, (m.get(w) ?? 0) + 1));
    const v = new Map<string, number>();
    m.forEach((c, w) => v.set(w, (c / t.length) * idf(w)));
    return v;
  };
  const norm = (v: Map<string, number>) => Math.sqrt([...v.values()].reduce((a, b) => a + b * b, 0)) || 1;
  const dvecs = toks.map(vec);

  return {
    query(q: string) {
      const qt = tokenize(q);
      if (!qt.length) return { terms: [] as { w: string; idf: number; known: boolean }[], ranking: [] as { doc: Doc; score: number; contrib: Map<string, number> }[] };
      const qv = vec(qt);
      const qn = norm(qv);
      const ranking = docs
        .map((doc, i) => {
          const dv = dvecs[i];
          const contrib = new Map<string, number>();
          let dot = 0;
          qv.forEach((x, w) => {
            const y = dv.get(w);
            if (y) { dot += x * y; contrib.set(w, x * y); }
          });
          const dn = norm(dv);
          contrib.forEach((c, w) => contrib.set(w, c / (qn * dn)));
          return { doc, score: dot / (qn * dn), contrib };
        })
        .sort((a, b) => b.score - a.score);
      const terms = [...qv.keys()].map((w) => ({ w, idf: idf(w), known: df.has(w) }));
      return { terms, ranking };
    },
  };
}
