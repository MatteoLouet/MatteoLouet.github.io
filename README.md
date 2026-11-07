# Données, éditorialement — portfolio de Mattéo Louet

Site statique Astro. Direction artistique et design system : voir `DIRECTION.md`.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # sortie dans dist/
```

## Où modifier quoi

| Fichier | Contenu |
|---|---|
| `src/data/site.ts` | Nom, titre du héros, intro, e-mail, **liens LinkedIn / GitHub (à remplir)** |
| `src/data/projects.ts` | Projets (ajouter un objet = ajouter un projet) |
| `src/data/timeline.ts` | Fig. 0 — parcours |
| `src/data/skills.ts` | Compétences par domaine, langues, loisirs |
| `src/data/lab.ts` | Corpus TF-IDF et graphe de lignage du laboratoire |
| `src/styles/tokens.css` | Couleurs, typographie, grille |
| `src/pages/travaux/cmapss.astro` | Étude de cas C-MAPSS |

Tout ce qui manque s'affiche en orange `[à compléter]` : rien n'est inventé.

## Deux langues (FR / EN)

- Français à la racine (`/`, `/travaux/cmapss/`), anglais sous `/en/` (`/en/`, `/en/work/cmapss/`). La bascule FR / EN est dans la navigation et garde l'ancre en cours.
- Les textes traduisibles s'écrivent `{ fr: '…', en: '…' }` dans `src/data/*.ts`, ou `t('fr', 'en')` dans les composants.
- Nouvelle page : déclarer ses deux chemins dans `src/i18n/index.ts` (`routes`), puis créer les deux fichiers dans `src/pages/` qui rendent la même vue de `src/views/`.
- Site C-MAPSS embarqué (`src/fd001/`) : chaque chaîne s'écrit `tr("English", "Français")` (voir `src/fd001/i18n.tsx`).

## Données C-MAPSS

Par défaut, `src/data/cmapss.json` contient des **données simulées** (`npm run demo-data`), étiquetées « démo » sur le site.
Pour utiliser les vraies données NASA :

```bash
python3 scripts/prepare_cmapss.py chemin/vers/train_FD001.txt
```

L'étiquette « démo » disparaît automatiquement (`meta.demo = false`).

## Données électricité (étude de cas 02)

`src/data/elec.json` est produit par `scripts/prepare_eco2mix.py` à partir du fichier RTE `eco2mix-regional-cons-def.csv` du dépôt du projet. Le script reproduit le modèle de base du notebook et s'arrête s'il ne retrouve pas sa MAE (1 618,51 MW).

```bash
python3 scripts/prepare_eco2mix.py chemin/vers/eco2mix-regional-cons-def.csv
```

## RoverRun, CDataframe, Study Planner

- `src/data/rover.json` : sorties réelles du programme C RoverRun, produites par le harnais `scripts/roverrun/` (voir son README) sur une carte de démonstration — la carte du cours n'est pas dans le dépôt.
- `src/data/cdataframe.json` : suite `rand()` réelle et sortie du programme CDataframe compilé tel quel.
- Study Planner : captures de l'application lancée en local (`public/images/planner/`). Aucune réponse du modèle n'est simulée sur le site.

## Ajouter une étude de cas

Créer `src/pages/travaux/<slug>.astro` sur le modèle de `cmapss.astro` (gabarit `CaseStudy` + sections `CaseSection`), puis renseigner `caseStudy: '/travaux/<slug>/'` dans `projects.ts`.
