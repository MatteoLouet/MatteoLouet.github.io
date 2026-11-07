/**
 * Génère src/fd001/preflight.scoped.css : le preflight de Tailwind restreint à `.fd001`,
 * pour que le site C-MAPSS embarqué ait ses styles de base sans toucher au portfolio.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(new URL('../node_modules/tailwindcss/preflight.css', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const scope = (sel) => sel.split(',').map((s) => {
  s = s.trim();
  if (!s) return s;
  if (/^(html|:host|body)$/.test(s)) return '.fd001';
  if (s.startsWith('html') || s.startsWith(':host')) return '.fd001' + s.replace(/^(html|:host)/, '');
  return `.fd001 ${s}`;
}).join(', ');
let out = '', i = 0, depth = 0, buf = '';
// découpe simple bloc par bloc (gère @supports / @layer imbriqués)
const walk = (css) => css.replace(/(^|[{};])([^{};]+)\{/g, (m, pre, sel) =>
  /^\s*@/.test(sel) || /^\s*(from|to|\d+%)\s*$/.test(sel) ? m : pre + scope(sel) + ' {');
out = walk(src.replace(/@layer\s+base\s*\{/, '@layer base {'));
writeFileSync(new URL('../src/fd001/preflight.scoped.css', import.meta.url), out);
console.log('preflight scoped:', out.length, 'chars');
