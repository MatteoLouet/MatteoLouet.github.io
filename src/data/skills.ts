/**
 * Compétences par domaine — sources : CV et dépôts GitHub. Textes bilingues.
 * `ctx` indique OÙ la compétence est pratiquée (pas un « niveau » inventé) :
 *   pro = en entreprise (alternance, stages) · aca = en formation / projets
 */
import type { L } from '../i18n';

export type Ctx = 'pro' | 'aca';

export interface SkillGroup {
  n: string;
  domain: L;
  items: { name: string | L; ctx: Ctx[]; detail?: string | L }[];
}

export const skills: SkillGroup[] = [
  {
    n: 'A',
    domain: { fr: 'Ingénierie de données', en: 'Data engineering' },
    items: [
      { name: { fr: 'Conception de flux ETL', en: 'ETL flow design' }, ctx: ['pro'], detail: 'Talend' },
      { name: { fr: 'Cartographie & lignage', en: 'Data mapping & lineage' }, ctx: ['pro'] },
      { name: { fr: 'Création & intégration d’API', en: 'API design & integration' }, ctx: ['pro'] },
      { name: 'Postman', ctx: ['aca'] },
    ],
  },
  {
    n: 'B',
    domain: { fr: 'Modélisation & bases', en: 'Modelling & databases' },
    items: [
      { name: 'SQL · MySQL', ctx: ['aca'], detail: { fr: 'App d’audit', en: 'Audit app' } },
      { name: { fr: 'Modèle relationnel normalisé', en: 'Normalised relational model' }, ctx: ['aca'] },
      { name: { fr: 'Requêtes complexes', en: 'Complex queries' }, ctx: ['aca'] },
    ],
  },
  {
    n: 'C',
    domain: { fr: 'Analyse & visualisation', en: 'Analysis & visualisation' },
    items: [
      { name: 'Qlik Sense', ctx: ['pro'] },
      { name: 'Power BI', ctx: ['aca'] },
      { name: { fr: 'Tableaux de bord stratégiques', en: 'Strategic dashboards' }, ctx: ['pro'] },
    ],
  },
  {
    n: 'D',
    domain: { fr: 'Programmation', en: 'Programming' },
    items: [
      { name: 'Python', ctx: ['aca'], detail: 'pandas, scikit-learn' },
      { name: 'TypeScript · React', ctx: ['aca'] },
      { name: 'Java', ctx: ['aca'] },
      { name: 'C', ctx: ['aca'], detail: 'RoverRun' },
      { name: 'Matlab', ctx: ['aca'] },
    ],
  },
  {
    n: 'E',
    domain: { fr: 'Machine learning', en: 'Machine learning' },
    items: [
      { name: 'Classification', ctx: ['aca'], detail: 'C-MAPSS' },
      { name: { fr: 'Validation croisée groupée', en: 'Grouped cross-validation' }, ctx: ['aca'] },
      { name: { fr: 'Régression / prédiction', en: 'Regression / prediction' }, ctx: ['aca'] },
      { name: 'TF-IDF', ctx: ['aca'], detail: 'NLP' },
    ],
  },
  {
    n: 'F',
    domain: { fr: 'Méthodes', en: 'Methods' },
    items: [
      { name: 'Agile', ctx: ['aca'] },
      { name: '5S', ctx: ['pro'], detail: 'Lacoste' },
      { name: { fr: 'Données sensibles', en: 'Sensitive data' }, ctx: ['pro'] },
    ],
  },
];

export const languages: { name: L; level: L }[] = [
  { name: { fr: 'Français', en: 'French' }, level: { fr: 'Langue maternelle', en: 'Native' } },
  { name: { fr: 'Anglais', en: 'English' }, level: { fr: 'B2, Cambridge FCE', en: 'B2, Cambridge FCE' } },
  { name: { fr: 'Espagnol', en: 'Spanish' }, level: { fr: 'B1', en: 'B1' } },
];

export const interests: L[] = [
  { fr: 'Professeur de danse', en: 'Dance teacher' },
  { fr: 'Boxe', en: 'Boxing' },
  { fr: 'Œnologie', en: 'Wine tasting' },
];
