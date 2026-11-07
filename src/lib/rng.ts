/** Générateur pseudo-aléatoire déterministe (figures illustratives reproductibles). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export const fmt = (n: number) => Number(n.toFixed(1));
