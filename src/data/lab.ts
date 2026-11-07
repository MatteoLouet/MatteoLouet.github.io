/**
 * Données du laboratoire — bilingues.
 * A — corpus de démonstration rédigé à partir du CV (10 courts documents par langue).
 * B — graphe de lignage GÉNÉRIQUE : aucune donnée ni architecture réelle du Ministère.
 */
import type { Doc } from '../viz/tfidf';
import type { L } from '../i18n';

export const corpus: L<Doc[]> = {
  fr: [
    { id: 'formation', title: 'Formation', text: "Cycle ingénieur Big Data et machine learning à l'EFREI Paris de 2025 à 2028, après une prépa intégrée de 2023 à 2025. Baccalauréat général mention bien, spécialités mathématiques et NSI." },
    { id: 'alternance', title: 'Alternance au Ministère des Armées', text: "Data analyst en alternance : cartographie des données, data lineage, conception de flux ETL avec Talend, développement de tableaux de bord Qlik Sense, création et intégration d'API, manipulation de données sensibles." },
    { id: 'cmapss', title: 'Projet C-MAPSS', text: 'Machine learning sur le jeu de données C-MAPSS de la NASA : capteurs de moteurs turbofan, sept modèles comparés pour prédire si un moteur tombera en panne dans les 30 prochains cycles. Régression logistique retenue : 21 pannes sur 25 détectées.' },
    { id: 'conso', title: 'Projet consommation électrique', text: "Machine learning pour prédire la consommation d'électricité par région selon différents paramètres." },
    { id: 'audit', title: "Application d'audit", text: "Application d'audit basée sur un modèle relationnel normalisé et des requêtes SQL complexes sur une base de données." },
    { id: 'chatbot', title: 'Chatbot TF-IDF', text: "Chatbot qui génère une réponse à l'aide d'une matrice TF-IDF : les mots de la question sont pondérés par leur rareté puis comparés aux documents du corpus." },
    { id: 'rover', title: 'RoverRun', text: "Programme en langage C qui optimise les déplacements d'un véhicule : structures de données, algorithmes d'optimisation et recherche de chemin." },
    { id: 'messagerie', title: 'Messagerie instantanée', text: 'Application de messagerie instantanée permettant la communication entre plusieurs appareils.' },
    { id: 'langues', title: 'Langues et loisirs', text: 'Français langue maternelle, anglais niveau B2 certification Cambridge FCE, espagnol B1. Professeur de danse, boxe et œnologie.' },
    { id: 'competences', title: 'Outils', text: 'Python, pandas, scikit-learn, Plotly, TypeScript, React, SQL et MySQL, Java, C, Matlab, Postman, Qlik Sense, Talend, Power BI. Méthode agile et méthode 5S.' },
  ],
  en: [
    { id: 'formation', title: 'Education', text: 'Big Data and machine learning engineering degree at EFREI Paris from 2025 to 2028, after an integrated preparatory cycle from 2023 to 2025. French baccalauréat with honours, maths and computer science majors.' },
    { id: 'alternance', title: 'Work-study at the French Ministry of the Armed Forces', text: 'Apprentice data analyst: data mapping, data lineage, ETL flow design with Talend, Qlik Sense dashboard development, API design and integration, handling sensitive data.' },
    { id: 'cmapss', title: 'C-MAPSS project', text: 'Machine learning on the NASA C-MAPSS dataset: turbofan engine sensors, seven models compared to predict whether an engine will fail within the next 30 cycles. Logistic regression chosen: 21 of 25 failures detected.' },
    { id: 'conso', title: 'Electricity consumption project', text: 'Machine learning to predict electricity consumption by region from several parameters.' },
    { id: 'audit', title: 'Audit application', text: 'Audit application based on a normalised relational model and complex SQL queries on a database.' },
    { id: 'chatbot', title: 'TF-IDF chatbot', text: 'Chatbot that generates an answer using a TF-IDF matrix: the words of the question are weighted by their rarity, then compared with the documents of the corpus.' },
    { id: 'rover', title: 'RoverRun', text: 'Program written in the C language that optimises the moves of a vehicle: data structures, optimisation algorithms and path search.' },
    { id: 'messagerie', title: 'Instant messenger', text: 'Instant messaging application enabling communication between several devices.' },
    { id: 'langues', title: 'Languages and hobbies', text: 'French native speaker, English B2 level with the Cambridge FCE certificate, Spanish B1. Dance teacher, boxing and wine tasting.' },
    { id: 'competences', title: 'Tools', text: 'Python, pandas, scikit-learn, Plotly, TypeScript, React, SQL and MySQL, Java, C, Matlab, Postman, Qlik Sense, Talend, Power BI. Agile method and 5S method.' },
  ],
};

export const defaultQuery: L = { fr: 'prédire la panne d’un moteur', en: 'predict an engine failure' };

export const suggestions: L<string[]> = {
  fr: ['Quels outils ETL ?', 'prédire la panne d’un moteur', 'parle-t-il anglais ?', 'un projet en langage C'],
  en: ['Which ETL tools?', 'predict an engine failure', 'does he speak Spanish?', 'a project in the C language'],
};

export interface LNode { id: string; label: L; col: number; row: number; kind: string }
export const lineage = {
  cols: { fr: ['Sources', 'Ingestion', 'Préparation', 'Entrepôt', 'Restitution'], en: ['Sources', 'Ingestion', 'Preparation', 'Warehouse', 'Delivery'] } as L<string[]>,
  nodes: [
    { id: 'csv', label: { fr: 'Fichiers plats', en: 'Flat files' }, col: 0, row: 0, kind: 'source' },
    { id: 'sql', label: { fr: 'Base opérationnelle', en: 'Operational DB' }, col: 0, row: 1, kind: 'source' },
    { id: 'api', label: { fr: 'API externe', en: 'External API' }, col: 0, row: 2, kind: 'source' },
    { id: 'jobA', label: { fr: 'Job ETL — lots', en: 'ETL job — batch' }, col: 1, row: 0.5, kind: 'job' },
    { id: 'jobB', label: { fr: 'Job ETL — API', en: 'ETL job — API' }, col: 1, row: 2, kind: 'job' },
    { id: 'stg', label: { fr: 'Zone de staging', en: 'Staging area' }, col: 2, row: 0.5, kind: 'table' },
    { id: 'ref', label: { fr: 'Référentiel', en: 'Reference data' }, col: 2, row: 2, kind: 'table' },
    { id: 'fact', label: { fr: 'Table de faits', en: 'Fact table' }, col: 3, row: 0, kind: 'table' },
    { id: 'dimT', label: { fr: 'Dimension temps', en: 'Time dimension' }, col: 3, row: 1, kind: 'table' },
    { id: 'dimU', label: { fr: 'Dimension entité', en: 'Entity dimension' }, col: 3, row: 2, kind: 'table' },
    { id: 'dash1', label: { fr: 'Tableau de bord A', en: 'Dashboard A' }, col: 4, row: 0, kind: 'output' },
    { id: 'dash2', label: { fr: 'Tableau de bord B', en: 'Dashboard B' }, col: 4, row: 1, kind: 'output' },
    { id: 'exp', label: { fr: 'Export API', en: 'API export' }, col: 4, row: 2, kind: 'output' },
  ] as LNode[],
  edges: [
    ['csv', 'jobA'], ['sql', 'jobA'], ['api', 'jobB'], ['sql', 'jobB'],
    ['jobA', 'stg'], ['jobB', 'ref'], ['jobB', 'stg'],
    ['stg', 'fact'], ['stg', 'dimT'], ['ref', 'dimU'], ['ref', 'fact'],
    ['fact', 'dash1'], ['dimT', 'dash1'], ['fact', 'dash2'], ['dimU', 'dash2'], ['dimU', 'exp'], ['dimT', 'dash2'],
  ] as [string, string][],
};
