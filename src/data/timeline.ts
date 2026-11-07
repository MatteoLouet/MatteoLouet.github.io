/**
 * Fig. 0 — Parcours. Source : CV (version alternance).
 * Les années scolaires sans mois sont approchées à septembre → juin (champ `approx: true`).
 */
import type { L } from '../i18n';

export type Lane = 'formation' | 'experience';

export interface TimelineItem {
  id: string;
  lane: Lane;
  title: L;
  org: string;
  start: string; // AAAA-MM
  end?: string; // AAAA-MM ; absent = ponctuel ; 'now' = en cours
  label: L; // période telle qu'écrite dans le CV
  note?: L;
  approx?: boolean;
  current?: boolean;
}

export const timeline: TimelineItem[] = [
  { id: 'mcarthur', lane: 'experience', title: { fr: "Stage d'observation", en: 'Observation internship' }, org: 'McArthurGlen Troyes', start: '2020-02', label: { fr: 'Février 2020', en: 'February 2020' }, note: { fr: 'Service marketing', en: 'Marketing department' } },
  { id: 'ferme', lane: 'experience', title: { fr: 'Ouvrier agricole', en: 'Farm worker' }, org: 'Ferme du Val St Jean, Montsuzain', start: '2022-01', end: '2023-12', label: { fr: '2022 – 2023', en: '2022 – 2023' }, approx: true },
  { id: 'bac', lane: 'formation', title: { fr: 'Baccalauréat général', en: 'French baccalauréat' }, org: 'Saint-François-de-Sales, Troyes', start: '2023-07', label: { fr: '2023', en: '2023' }, note: { fr: 'Mention bien · spécialités mathématiques, NSI', en: 'With honours · maths and computer science majors' }, approx: true },
  { id: 'prepa', lane: 'formation', title: { fr: 'Prépa intégrée', en: 'Integrated preparatory cycle' }, org: 'EFREI Paris', start: '2023-09', end: '2025-06', label: { fr: '2023 – 2025', en: '2023 – 2025' }, approx: true },
  { id: 'lacoste', lane: 'experience', title: { fr: "Stage d'exécution", en: 'Operator internship' }, org: 'Lacoste', start: '2024-07', label: { fr: 'Juillet 2024', en: 'July 2024' }, note: { fr: 'Teinturerie & contrôle qualité, méthode 5S', en: 'Dye house & quality control, 5S method' } },
  { id: 'granja', lane: 'experience', title: { fr: 'Stage commercial', en: 'Sales internship' }, org: 'Granja 3', start: '2025-02', label: { fr: 'Février 2025', en: 'February 2025' }, note: { fr: 'Conseil client, gestion des stocks', en: 'Customer advice, stock management' } },
  { id: 'ingenieur', lane: 'formation', title: { fr: 'Cycle ingénieur — Big Data & ML', en: 'Engineering degree — Big Data & ML' }, org: 'EFREI Paris', start: '2025-09', end: '2028-06', label: { fr: '2025 – 2028', en: '2025 – 2028' }, approx: true },
  { id: 'armees', lane: 'experience', title: { fr: 'Data analyst — alternance', en: 'Data analyst — work-study' }, org: 'Ministère des Armées', start: '2025-09', end: 'now', label: { fr: '2025 – aujourd’hui', en: '2025 – present' }, note: { fr: 'Cartographie & lignage de données, flux ETL (Talend), tableaux de bord Qlik Sense, API', en: 'Data mapping & lineage, ETL flows (Talend), Qlik Sense dashboards, APIs' }, approx: true, current: true },
];

export const timelineRange = { from: '2020-01', to: '2028-07' };
