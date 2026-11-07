/**
 * Vérifie que le portage JavaScript (src/viz/pathfinding-algos.ts) donne EXACTEMENT les mêmes
 * résultats que les algorithmes Python du dépôt : même nombre de nœuds explorés, même chemin.
 *
 * Usage : node scripts/pathfinding/verify.mjs <parite.json>   (produit par benchmark.py)
 * Lit les réseaux exportés dans public/data/paris/.
 */
import { readFileSync } from 'node:fs';
import { buildSync } from 'esbuild';

import { gunzipSync } from 'node:zlib';

const out = buildSync({ entryPoints: ['src/viz/pathfinding.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const mod = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const parite = JSON.parse(readFileSync(process.argv[2], 'utf8'));

let ok = 0, ko = 0;
for (const [mode, cas] of Object.entries(parite)) {
  const meta = JSON.parse(readFileSync(`public/data/paris/${mode}.json`, 'utf8'));
  const raw = gunzipSync(readFileSync(`public/data/paris/${mode}.bin.gz`));
  const buf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const { g } = mod.decode(meta, buf); // même décodage que dans le navigateur
  for (const c of cas) {
    for (const algo of ['dijkstra', 'astar', 'greedy', 'bfs']) {
      const r = mod.ALGOS[algo](g, c.s, c.t);
      const memeExplo = r.explores.length / 2 === c[algo].explores;
      const memeChemin = r.chemin.length === c[algo].chemin.length && r.chemin.every((v, i) => v === c[algo].chemin[i]);
      if (memeExplo && memeChemin) ok++;
      else { ko++; console.log(`ÉCART ${mode} ${algo} ${c.s}→${c.t} : explorés JS ${r.explores.length / 2} / Py ${c[algo].explores}, chemin ${memeChemin ? 'identique' : 'différent'}`); }
    }
  }
}
console.log(`${ok} cas identiques, ${ko} écarts`);
if (process.argv[3]) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(process.argv[3], JSON.stringify({ cas: ok + ko, identiques: ok }));
}
process.exit(ko ? 1 : 0);
