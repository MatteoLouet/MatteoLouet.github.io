/**
 * Internationalisation FR / EN.
 * - Le français est servi à la racine (/), l'anglais sous /en/.
 * - Une valeur traduisible s'écrit { fr: '…', en: '…' } et se lit avec pick(valeur, lang).
 * - Ajouter une page : déclarer ses deux chemins dans `routes`.
 */
export type Lang = 'fr' | 'en';
export type L<T = string> = { fr: T; en: T };
export const LANGS: Lang[] = ['fr', 'en'];

export const isL = (v: unknown): v is L<unknown> =>
  !!v && typeof v === 'object' && 'fr' in (v as object) && 'en' in (v as object);

export function pick<T>(v: T | L<T>, lang: Lang): T {
  return isL(v) ? (v as L<T>)[lang] : (v as T);
}

export const routes = {
  home: { fr: '/', en: '/en/' },
  cmapss: { fr: '/travaux/cmapss/', en: '/en/work/cmapss/' },
  elec: { fr: '/travaux/consommation/', en: '/en/work/electricity/' },
  roverrun: { fr: '/travaux/roverrun/', en: '/en/work/roverrun/' },
  planner: { fr: '/travaux/study-planner/', en: '/en/work/study-planner/' },
  cdataframe: { fr: '/travaux/cdataframe/', en: '/en/work/cdataframe/' },
} as const;
export type RouteKey = keyof typeof routes;

export const langFromPath = (path: string): Lang => (path === '/en' || path.startsWith('/en/') ? 'en' : 'fr');

/** Chemin équivalent dans l'autre langue (ancres conservées). */
export function switchPath(path: string, to: Lang): string {
  const clean = path.endsWith('/') ? path : path + '/';
  for (const r of Object.values(routes)) {
    if (r.fr === clean || r.en === clean) return r[to];
  }
  return routes.home[to];
}

export const href = (key: RouteKey, lang: Lang, hash = '') => routes[key][lang] + (hash ? `#${hash}` : '');

export const locale = (lang: Lang) => (lang === 'fr' ? 'fr-FR' : 'en-GB');
