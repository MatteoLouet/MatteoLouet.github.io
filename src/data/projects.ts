/**
 * Projets — sources : CV et dépôts GitHub. Textes bilingues { fr, en }.
 * Ajouter un projet = ajouter un objet. `stack` ne contient que ce qui est
 * attesté ; ce qui manque est listé dans `todo` et s'affiche [à compléter].
 */
import type { L, RouteKey } from '../i18n';

export type FigureKey = 'degradation' | 'multiples' | 'schema' | 'matrix' | 'path' | 'sequence' | 'planner' | 'memory' | 'streets';

export interface Project {
  slug: string;
  n: string;
  title: L;
  dek: L;
  category: L;
  stack: L<string[]>;
  todo?: L<string[]>;
  figure: FigureKey;
  figCaption: L;
  caseStudy?: RouteKey; // route de l'étude de cas, si publiée
  repo?: string;
  team?: L;
}

const GH = 'https://github.com/MatteoLouet/';
const same = <T,>(v: T): L<T> => ({ fr: v, en: v });

export const projects: Project[] = [
  {
    slug: 'cmapss',
    n: '01',
    title: {
      fr: 'Ce moteur va-t-il tomber en panne dans les 30 prochains cycles ?',
      en: 'Will this engine fail within the next 30 cycles?',
    },
    dek: {
      fr: "Sept modèles comparés sur les données NASA C-MAPSS pour déclencher une alarme avant la panne d'un turboréacteur. Sur 100 moteurs jamais vus : 21 pannes imminentes détectées sur 25, 3 fausses alarmes.",
      en: 'Seven models compared on NASA C-MAPSS data to raise an alarm before a turbofan fails. On 100 unseen engines: 21 of 25 imminent failures detected, 3 false alarms.',
    },
    category: { fr: 'Machine learning · Maintenance prédictive', en: 'Machine learning · Predictive maintenance' },
    stack: same(['Python', 'pandas', 'scikit-learn', 'Plotly', 'React']),
    figure: 'degradation',
    figCaption: { fr: 'Capteur T50 de 36 moteurs, alignés sur la panne', en: 'T50 sensor of 36 engines, aligned on failure' },
    caseStudy: 'cmapss',
    repo: GH + 'NASA-C-MAPSS-FD001-engine-degradation-ML-Project-',
    team: { fr: 'avec Daniil Hirchyts', en: 'with Daniil Hirchyts' },
  },
  {
    slug: 'pathfinding',
    n: '02',
    title: { fr: 'Dijkstra, A*, Glouton, BFS sur les vraies rues de Paris', en: 'Dijkstra, A*, Greedy and BFS on the real streets of Paris' },
    dek: {
      fr: 'Une application qui compare quatre algorithmes de plus court chemin sur le réseau OpenStreetMap de Paris (77 147 intersections à pied) et anime leur exploration. Sur 60 trajets à pied, A* trouve le même chemin optimal que Dijkstra en explorant en médiane 8 fois moins de nœuds.',
      en: 'An app that compares four shortest-path algorithms on the OpenStreetMap network of Paris (77,147 walking intersections) and animates their search. Over 60 walking trips, A* finds the same optimal path as Dijkstra while exploring a median of 8 times fewer nodes.',
    },
    category: { fr: 'Algorithmique des graphes · Optimisation', en: 'Graph algorithms · Optimisation' },
    stack: same(['Python', 'osmnx', 'Flask', 'deck.gl', 'OpenStreetMap']),
    figure: 'streets',
    figCaption: { fr: 'Tour Eiffel → Notre-Dame à pied : la zone explorée par A* (en rouge) ; celle de Dijkstra déborde du cadre', en: 'Eiffel Tower → Notre-Dame on foot: the area A* explores (red); Dijkstra’s spills beyond the frame' },
    caseStudy: 'pathfinding',
    repo: GH + 'Projet-d-optimisation-',
  },
  {
    slug: 'consommation',
    n: '03',
    title: { fr: 'Prévoir la consommation électrique française du lendemain', en: 'Forecasting France’s electricity demand for the next day' },
    dek: {
      fr: "13 ans de données RTE éCO2mix, 12 régions, la météo et le calendrier pour prévoir la consommation nationale à J+1. Meilleur modèle : une forêt aléatoire, à 1 238 MW d'erreur moyenne (≈ 2,3 % de la consommation).",
      en: 'Thirteen years of RTE éCO2mix data, 12 regions, weather and calendar to forecast national demand one day ahead. Best model: a random forest, with a mean error of 1,238 MW (≈ 2.3% of demand).',
    },
    category: { fr: 'Machine learning · Énergie', en: 'Machine learning · Energy' },
    stack: same(['Python', 'pandas', 'scikit-learn', 'Open-Meteo API']),
    figure: 'multiples',
    figCaption: { fr: 'Profil de 24 h des 12 régions le jour du record, 28 février 2018, chaque région à sa propre échelle', en: '24-hour profile of the 12 regions on the record day, 28 February 2018, each region on its own scale' },
    caseStudy: 'elec',
    repo: GH + 'Pr-vision-de-charge-lectrique-',
  },
  {
    slug: 'audit',
    n: '04',
    title: { fr: 'Une application d’audit adossée à un modèle normalisé', en: 'An audit application built on a normalised model' },
    dek: {
      fr: "Application d'audit construite sur un modèle relationnel normalisé et des requêtes SQL complexes.",
      en: 'An audit application built on a normalised relational model and complex SQL queries.',
    },
    category: { fr: 'Modélisation de données · SQL', en: 'Data modelling · SQL' },
    stack: { fr: ['SQL', 'Modèle relationnel normalisé'], en: ['SQL', 'Normalised relational model'] },
    todo: { fr: ['SGBD & front-end'], en: ['DBMS & front-end'] },
    figure: 'schema',
    figCaption: { fr: 'Schéma relationnel', en: 'Relational schema' },
  },
  {
    slug: 'chatbot',
    n: '05',
    title: { fr: 'Un chatbot qui répond par la statistique des mots', en: 'A chatbot that answers with word statistics' },
    dek: {
      fr: "Génération de réponses à partir de l'analyse d'une matrice TF-IDF : chaque question est comparée à un corpus, mot par mot.",
      en: 'Answers generated from a TF-IDF matrix: every question is compared with a corpus, word by word.',
    },
    category: { fr: 'Traitement du langage', en: 'Natural language processing' },
    stack: { fr: ['TF-IDF', 'Similarité cosinus'], en: ['TF-IDF', 'Cosine similarity'] },
    todo: { fr: ['langage'], en: ['language'] },
    figure: 'matrix',
    figCaption: { fr: 'Matrice termes × documents', en: 'Term × document matrix' },
  },
  {
    slug: 'roverrun',
    n: '06',
    title: { fr: 'RoverRun : optimiser le trajet d’un véhicule', en: 'RoverRun: optimising a vehicle’s route' },
    dek: {
      fr: "Projet S3 en C : un rover sur une carte de coûts construit l'arbre de ses mouvements possibles, puis suit la branche de coût minimal. Arbres n-aires, piles, files.",
      en: 'Semester-3 project in C: a rover on a cost map builds the tree of its possible moves, then follows the cheapest branch. N-ary trees, stacks, queues.',
    },
    category: { fr: 'Algorithmique · C', en: 'Algorithms · C' },
    stack: { fr: ['C', 'Arbre n-aire', 'Piles & files'], en: ['C', 'N-ary tree', 'Stacks & queues'] },
    repo: GH + 'RoverRun',
    team: { fr: 'avec Anthime L’Herminé et Mathis Petit', en: 'with Anthime L’Herminé and Mathis Petit' },
    figure: 'path',
    figCaption: { fr: 'Grille de coûts et chemin retenu', en: 'Cost grid and chosen path' },
    caseStudy: 'roverrun',
  },
  {
    slug: 'messagerie',
    n: '07',
    title: { fr: 'Une messagerie instantanée multi-appareils', en: 'A multi-device instant messenger' },
    dek: {
      fr: 'Application de messagerie permettant une communication en temps réel entre plusieurs appareils.',
      en: 'A messaging app enabling real-time communication between several devices.',
    },
    category: { fr: 'Systèmes & réseau', en: 'Systems & networking' },
    stack: { fr: ['Client / serveur'], en: ['Client / server'] },
    todo: { fr: ['langage & protocole'], en: ['language & protocol'] },
    figure: 'sequence',
    figCaption: { fr: 'Diagramme de séquence', en: 'Sequence diagram' },
  },
  {
    slug: 'planner',
    n: '08',
    title: { fr: 'Study Planner : un planning d’études généré par un LLM', en: 'Study Planner: a study schedule generated by an LLM' },
    dek: {
      fr: 'Une application React et une API Express : l’objectif saisi devient un prompt, Llama 3.3 renvoie un plan de 4 semaines en JSON, et chaque semaine se range automatiquement dans l’emploi du temps.',
      en: 'A React app and an Express API: the goal you type becomes a prompt, Llama 3.3 returns a 4-week plan as JSON, and each week is slotted into the timetable automatically.',
    },
    category: { fr: 'Développement web · IA générative', en: 'Web development · Generative AI' },
    stack: same(['TypeScript', 'React', 'Express', 'Groq API']),
    figure: 'planner',
    figCaption: { fr: 'Une semaine de tâches rangée du lundi au vendredi', en: 'A week of tasks laid out Monday to Friday' },
    caseStudy: 'planner',
    repo: GH + 'Projet-web-ING-1-BDML-',
  },
  {
    slug: 'cdataframe',
    n: '09',
    title: { fr: 'CDataframe : un dataframe écrit à la main en C', en: 'CDataframe: a dataframe written by hand in C' },
    dek: {
      fr: 'Ce que pandas cache : des colonnes, des pointeurs et des tableaux qui grandissent par réallocation. Un projet de S1 pour comprendre la mémoire, avec deux bogues instructifs.',
      en: 'What pandas hides: columns, pointers and arrays that grow by reallocation. A first-semester project to understand memory, with two instructive bugs.',
    },
    category: { fr: 'Structures de données · C', en: 'Data structures · C' },
    stack: same(['C', 'malloc / realloc', 'Pointeurs']),
    figure: 'memory',
    figCaption: { fr: 'Colonnes et tampons de valeurs en mémoire', en: 'Columns and value buffers in memory' },
    caseStudy: 'cdataframe',
    repo: GH + 'Projet_C',
    team: { fr: 'avec Anthime L’Herminé', en: 'with Anthime L’Herminé' },
  },
];

/** Autres dépôts — affichés en index compact sous les travaux choisis. */
export const archive: { title: string | L; what: L; stack: string; repo: string; team?: L }[] = [
  { title: { fr: 'Calculateur de protéines', en: 'Protein calculator' }, what: { fr: 'Tableau dynamique par plage de poids et objectif sportif, validation en temps réel, export CSV', en: 'Dynamic table by weight range and training goal, live validation, CSV export' }, stack: 'React · Vite', repo: GH + 'Mini-Projet-web-INGE-1-BDML' },
  { title: { fr: 'CV interactif', en: 'Interactive CV' }, what: { fr: 'Le CV en application Streamlit, données centralisées dans un module Python', en: 'The CV as a Streamlit app, data centralised in a Python module' }, stack: 'Python · Streamlit', repo: GH + 'CV_Streamlit' },
  { title: 'ChargeCraft', what: { fr: 'Bornes de recharge : index AVL, chargeurs CSV/JSON, files d’événements (en cours)', en: 'EV charging stations: AVL index, CSV/JSON loaders, event queues (in progress)' }, stack: 'C', repo: GH + 'ChargeCraft-' },
];
