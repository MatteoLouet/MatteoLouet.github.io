/**
 * Génère src/data/cmapss.json — DONNÉES DE DÉMONSTRATION SIMULÉES.
 *
 * Elles imitent la STRUCTURE du sous-ensemble FD001 de C-MAPSS (moteurs suivis
 * jusqu'à la panne, capteurs nommés comme dans la documentation NASA, ordres de
 * grandeur proches) mais ne sont PAS les mesures réelles.
 * Pour utiliser les vraies données : python3 scripts/prepare_cmapss.py train_FD001.txt
 */
import { writeFileSync } from 'node:fs';

let seed = 20261107;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const gauss = () => {
  const u = 1 - rand(), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// id, nom NASA, description, base, dérive totale à la panne, bruit (écart-type)
const SENSORS = [
  ['s2', 'T24', 'Température sortie compresseur BP', '°R', 642.2, 1.3, 0.45],
  ['s3', 'T30', 'Température sortie compresseur HP', '°R', 1586, 14, 5.5],
  ['s4', 'T50', 'Température sortie turbine BP', '°R', 1402, 26, 7.5],
  ['s7', 'P30', 'Pression totale sortie compresseur HP', 'psia', 554.2, -2.6, 0.75],
  ['s11', 'Ps30', 'Pression statique sortie compresseur HP', 'psia', 47.3, 0.95, 0.22],
  ['s12', 'phi', 'Rapport débit carburant / Ps30', 'pps/psi', 522.0, -2.4, 0.65],
  ['s15', 'BPR', 'Taux de dilution', '—', 8.415, 0.11, 0.03],
  ['s21', 'W32', 'Débit de refroidissement turbine BP', 'lbm/s', 23.36, -0.33, 0.1],
];

const N_UNITS = 60;
const units = [];
for (let u = 1; u <= N_UNITS; u++) {
  // durée de vie : 128 → 362 cycles (bornes de FD001), distribution asymétrique
  const life = Math.round(128 + Math.pow(rand(), 1.6) * 234);
  const k = 3 + rand() * 2.5; // vitesse d'emballement de la dégradation
  const onset = 0.25 + rand() * 0.35; // fraction de vie saine
  const offsets = SENSORS.map(([, , , , , , noise]) => gauss() * noise * 0.8);
  const series = {};
  SENSORS.forEach(([id, , , , base, drift, noise], i) => {
    const vals = [];
    for (let c = 1; c <= life; c++) {
      const t = c / life;
      const h = t < onset ? 0 : (Math.exp(k * (t - onset) / (1 - onset)) - 1) / (Math.exp(k) - 1);
      const v = base + offsets[i] + drift * h + gauss() * noise;
      vals.push(Number(v.toFixed(id === 's15' ? 4 : 2)));
    }
    series[id] = vals;
  });
  units.push({ unit: u, life, series });
}

const out = {
  meta: {
    demo: true,
    subset: 'FD001 (structure imitée)',
    note: 'Données simulées pour la démonstration. Ne pas interpréter comme des mesures réelles.',
    generatedBy: 'scripts/make_demo_cmapss.mjs',
  },
  sensors: SENSORS.map(([id, name, desc, unit]) => ({ id, name, desc, unit })),
  units,
};
writeFileSync(new URL('../src/data/cmapss.json', import.meta.url), JSON.stringify(out));
console.log(`cmapss.json : ${units.length} moteurs (démo)`);
