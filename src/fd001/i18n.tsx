/**
 * Langue du site C-MAPSS embarqué. Le texte d'origine est en anglais ;
 * chaque chaîne s'écrit tr("English", "Français").
 */
import { createContext, use, type ReactNode } from "react";

export type Lang = "fr" | "en";
const LangContext = createContext<Lang>("en");

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext value={lang}>{children}</LangContext>;
}

export function useLang(): Lang {
  return use(LangContext);
}

/** tr("English", "Français") → la chaîne de la langue courante. */
export function useTr() {
  const lang = use(LangContext);
  return <T,>(en: T, fr: T): T => (lang === "fr" ? fr : en);
}

/** Format numérique selon la langue (0.84 → 0,84 en français). */
export function useNum() {
  const lang = use(LangContext);
  return (s: string | number) => (lang === "fr" ? String(s).replace(/(\d)\.(\d)/g, "$1,$2") : String(s));
}

/** Noms des 21 capteurs C-MAPSS en français (les noms anglais viennent de data/fd001.json). */
const SENSOR_FR: Record<string, string> = {
  s1: "Température entrée soufflante",
  s2: "Température sortie compresseur BP",
  s3: "Température sortie compresseur HP",
  s4: "Température sortie turbine BP",
  s5: "Pression entrée soufflante",
  s6: "Pression conduit secondaire",
  s7: "Pression sortie compresseur HP",
  s8: "Régime physique soufflante",
  s9: "Régime physique du corps",
  s10: "Rapport de pression moteur",
  s11: "Pression statique sortie compresseur HP",
  s12: "Débit carburant / Ps30",
  s13: "Régime corrigé soufflante",
  s14: "Régime corrigé du corps",
  s15: "Taux de dilution",
  s16: "Richesse chambre de combustion",
  s17: "Enthalpie de prélèvement",
  s18: "Régime soufflante demandé",
  s19: "Régime corrigé demandé",
  s20: "Refroidissement turbine HP",
  s21: "Refroidissement turbine BP",
};

/** Nom d'un capteur dans la langue courante. */
export function useSensorName() {
  const lang = use(LangContext);
  return (s: { id: string; name: string }) => (lang === "fr" ? SENSOR_FR[s.id] ?? s.name : s.name);
}

const MODEL_FR: Record<string, string> = {
  "Logistic regression": "Régression logistique",
  "Random forest": "Forêt aléatoire",
  "Decision tree": "Arbre de décision",
  "Gradient boosting": "Gradient boosting",
  "Naive Bayes": "Naive Bayes",
  "k-NN": "k-NN",
  "SVM (RBF)": "SVM (RBF)",
};

/** Nom d'un modèle dans la langue courante. */
export function useModelName() {
  const lang = use(LangContext);
  return (name: string) => (lang === "fr" ? MODEL_FR[name] ?? name : name);
}
