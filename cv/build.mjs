/**
 * Exporte le CV (cv/cv.html) en PDF, en français et en anglais, avec Chrome headless.
 * Usage : node cv/build.mjs
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const out = { fr: 'Matteo-Louet-CV.pdf', en: 'Matteo-Louet-CV-EN.pdf' };

for (const [lang, file] of Object.entries(out)) {
  const url = `${pathToFileURL(path.join(here, 'cv.html')).href}?lang=${lang}`;
  const dest = path.join(here, '..', 'public', 'cv', file);
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
    '--no-pdf-header-footer', '--virtual-time-budget=5000',
    `--print-to-pdf=${dest}`, url,
  ], { stdio: 'ignore' });
  console.log(`${lang} → public/cv/${file}`);
}
