/**
 * Identité & réglages éditoriaux — bilingues { fr, en }.
 * Tout le texte « personnel » du site part d'ici : modifiez librement.
 */
export const site = {
  name: 'Mattéo Louet',
  role: {
    fr: 'Data analyst en alternance · Élève-ingénieur Big Data & ML',
    en: 'Apprentice data analyst · Big Data & ML engineering student',
  },
  location: 'Paris',

  // Publication (masthead)
  publication: { fr: 'Données, éditorialement', en: 'Data, editorially' },
  issue: 'N°01',
  issueDate: { fr: 'Novembre 2026', en: 'November 2026' },

  // Disponibilité — mettre `available: false` pour masquer la pastille
  availability: { available: true, label: { fr: 'En alternance', en: 'Work-study' } },

  // Héros — titre personnalisable (une ligne par entrée)
  hero: {
    kicker: { fr: 'Data engineering & analyse', en: 'Data engineering & analysis' },
    headline: {
      fr: ['Construire des systèmes.', 'Explorer les données.'],
      en: ['Building systems.', 'Exploring data.'],
    },
    intro: {
      fr: "Je conçois des flux de données fiables — de l'ETL au tableau de bord — et je transforme des jeux de données complexes en figures qu'on peut lire, interroger et comprendre.",
      en: 'I build reliable data pipelines — from ETL to dashboard — and turn complex datasets into figures people can read, question and understand.',
    },
  },

  contact: {
    email: 'matteo.louet2@gmail.com',
    linkedin: 'https://www.linkedin.com/in/matt%C3%A9o-louet-97506b292/',
    github: 'https://github.com/MatteoLouet',
    cv: '/cv/Matteo-Louet-CV.pdf', // public/cv — remplacer le fichier pour mettre le CV à jour
  },

  seo: {
    title: { fr: 'Mattéo Louet — Données, éditorialement', en: 'Mattéo Louet — Data, editorially' },
    description: {
      fr: "Portfolio de Mattéo Louet, élève-ingénieur Big Data & Machine Learning à l'EFREI Paris et data analyst en alternance : ingénierie de données, ETL, visualisation.",
      en: 'Portfolio of Mattéo Louet, Big Data & Machine Learning engineering student at EFREI Paris and apprentice data analyst: data engineering, ETL, visualisation.',
    },
  },
} as const;
