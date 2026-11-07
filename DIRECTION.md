# Données, éditorialement — direction artistique

Document de travail produit avant l'implémentation (§11 et Recommandation 1 du brief).

---

## 1. Analyse des références (inspectées dans le navigateur le 07/11/2026)

| Référence | État | Ce que j'en retiens |
|---|---|---|
| **sited.ch/type/editorial** | Accessible | Le site lui-même est une leçon : énormes numéros d'index (`#0174`) mis à côté du titre avec une flèche, fiches « label / valeur » en très petit corps, listes numérotées `01 02 03`, palettes décrites en pourcentages. Les 5 sites listés (Specimen, werk bauen + wohnen, Republik, image, Heidi.news) : grotesque ou serif, grille suisse, **mouvement statique**, sentiment « précis, calme ». wbw.ch : « une page grise, un titre clair, une seule police, un accent rouge à 5 % ». |
| **typenorm.com — magazine** | Accessible (vignettes non chargées) | Texte de cadrage très utile : « structure, pas ornement » ; largeurs de colonnes variées, asymétrie, mesure de lecture confortable ; *« un grand titre posé sur un dump en une colonne, ce n'est pas du design éditorial, c'est un costume »*. |
| **informationisbeautiful.net** | Accessible | Taxonomie par thèmes, titres + sous-titre d'une ligne qui dit *ce que montre* le graphique. Couleurs vives par visuel, interface sobre autour. |
| **visualcinnamon.com/portfolio** | Accessible | Chaque projet a sa propre grammaire visuelle (radial, beeswarm, packing…) ; filtres par *type de graphique* — la forme de la donnée devient une métadonnée. Vignettes = la visualisation elle-même, jamais une capture d'UI. |
| **IIB Awards — showcase** | Accessible, vignettes non rendues au moment de la visite | Structure textuelle observée : filtres année / distinction / catégorie, chaque entrée = titre + phrase explicative + source. |
| **corentinbernadou.com** | Accessible (WebGL rendu) | Fond noir, orange + blanc uniquement, lettrage géant (« FW ») coupé par le bas de l'écran, métadonnées de magazine (« Issue N°003 / Coll. 2026, Ref. EDI-… »), règles de grille et graduations sur les bords, pastille orange « Available ». |
| **Codrops — étude de cas Bernadou** | Accessible | Vanilla JS + données JSON, composants dédiés (`GridRules`, `ViewSwitcher` liste/overview, `Availability`, `LocaleTime`), règles de grille qui encadrent le titre au clic. Leçon : la sophistication technique reste *au service* d'une grille rigide. |

## 2. Principes extraits

1. **La structure fait le style.** Grille 12 colonnes visible par ses effets (alignements, filets), jamais décorée.
2. **Deux registres typographiques seulement** : une grande voix (titres) et une petite voix (métadonnées mono en capitales). Le corps de texte est neutre.
3. **Le numéro est un élément graphique** (index de projet, numéro de figure, numéro de section).
4. **Chaque visualisation est une figure éditoriale** : `Fig. n`, titre, une phrase « à remarquer », légende, source & méthode.
5. **Interface calme, figures expressives.** L'orange est un *signal* (≈ 5 % de surface).
6. **Mouvement statique par défaut** ; l'animation n'existe que pour relier une action à son effet.
7. **Honnêteté de la donnée** : toute donnée simulée porte une étiquette `DÉMO` visible dans la figure, pas seulement en note.

## 3. Moodboard (description)

Papier ivoire, encre noire, filets gris chaud. Un journal de recherche suisse imprimé en deux couleurs, dont les figures s'animent quand on les touche. Pas de photo d'ambiance, pas d'icônes : les seules images sont des graphiques et (plus tard) un portrait.

## 4. Design tokens

**Couleurs** — `--paper #F5F3EE`, `--ink #181818`, `--ink-2 #66645F`, `--rule #D8D5CE`, `--accent #E45B2B` ; figures : `--blue #315C9B`, `--green #718B72`, `--yellow #E8C86A`.

**Typographie** — Display : *Inter Tight* (grotesque serrée, la plus proche de Helvetica Now en open source). Texte : *Inter*. Métadonnées : *IBM Plex Mono*. Échelle fixe :

| Token | Taille | Interligne | Usage |
|---|---|---|---|
| `--t-meta` | 11px | 1.3 | Mono, capitales, +0.06em |
| `--t-small` | 13px | 1.45 | Légendes, notes de source |
| `--t-body` | 17px | 1.55 | Texte courant, mesure ≤ 62ch |
| `--t-lead` | 22px | 1.35 | Chapôs |
| `--t-h3` | 28px | 1.15 | Titres de projet |
| `--t-h2` | clamp(36px, 4.4vw, 64px) | 1.0 | Titres de section |
| `--t-display` | clamp(52px, 10.5vw, 168px) | 0.9 | Une fois par page |

**Grille** — 12 colonnes, gouttière 20px, marges `clamp(16px, 3.2vw, 48px)` ; tablette 6 colonnes, mobile 4 colonnes.

**Espacement** — base 8px ; rythme vertical de section 120 / 88 / 64px.

## 5. Composition de la page d'accueil

```
DESKTOP (12 col)
┌──────────────────────────────────────────────────────────────┐
│ Mattéo Louet ●Alternance            Travaux Profil Labo Contact│  nav discrète, filet bas
│ DONNÉES, ÉDITORIALEMENT · N°01 · NOV. 2026 · PARIS  (running head)│
├──────────────────────────────────────────────────────────────┤
│ 01 — DATA ENGINEERING & ANALYSE                                │
│ Construire des systèmes.                       [col 1–10]     │
│ Explorer les données.                                          │
│                                        Chapô + lien [col 9–12] │
│ Fig. 0 — Parcours 2020–2028 (chronogramme interactif, 12 col) │
├──────────────────────────────────────────────────────────────┤
│ 02 — TRAVAUX CHOISIS                 [Éditorial | Index]       │
│ 01 C-MAPSS  figure 8 col ............ texte 4 col             │
│ 02 Conso  figure 7 col │ 03 Audit 5 col (décalé)               │
│ 04 TF-IDF bande large 10 col (décalée à droite)                │
│ 05 RoverRun 5 col │ 06 Messagerie 6 col                        │
├──────────────────────────────────────────────────────────────┤
│ 03 — LABORATOIRE   onglets A/B : TF-IDF en direct · Lignage    │
│ 04 — PROFIL        texte 6 col + fiche label/valeur 4 col      │
│ 05 — COMPÉTENCES   6 domaines en listes compactes, 3×2         │
│ 06 — CONTACT       « dernière page » : grand e-mail, colophon  │
└──────────────────────────────────────────────────────────────┘
```

**Mobile** : une colonne, titre display réduit mais toujours dominant, navigation en ligne d'ancres défilante (pas de burger), chronogramme qui garde l'axe temporel lisible (lanes empilées, étiquettes au-dessus des barres), figures de projets en pleine largeur avec texte *sous* la figure, index en liste.

## 6. Intégration des visualisations

- **Vignettes de projets** : SVG générés au build (zéro JS), chacun dans la grammaire de son sujet — courbes de dégradation (C-MAPSS), petits multiples (consommation), schéma relationnel (audit), matrice termes × documents (TF-IDF), grille de chemin (RoverRun), diagramme de séquence (messagerie). Marqués « figure illustrative ».
- **Fig. 0 — Parcours** : seule donnée 100 % réelle de la home (dates du CV).
- **Laboratoire** : calculs réels dans le navigateur (TF-IDF, parcours de graphe) sur des corpus/schémas étiquetés démo.
- **Étude de cas C-MAPSS** : explorateur de capteurs D3, chargé uniquement sur cette page.

## 7. Interactions clés (et leur raison d'être)

| Interaction | Raison |
|---|---|
| Règle verticale qui suit le curseur sur Fig. 0 | Lire une date précise sans encombrer l'axe |
| Bascule Éditorial / Index des travaux | Lecture visuelle vs. balayage rapide |
| TF-IDF : saisir une question | Rendre tangible le mécanisme du chatbot |
| Lignage : survoler un nœud → amont / aval | C'est la question réelle d'une cartographie de données |
| C-MAPSS : choisir un capteur, aligner sur la panne | La dégradation n'apparaît qu'alignée sur la fin de vie |
| Running head qui change de section | Orientation, comme un en-tête de magazine |

Toutes respectent `prefers-reduced-motion`, sont accessibles au clavier, et ont un état par défaut lisible sans interaction.

## 8. Stack technique

- **Astro** (site statique, composants, zéro JS par défaut, SEO) — dossier vide au départ, donc choix libre.
- **CSS natif** avec tokens (pas de Tailwind : le brief interdit l'esthétique « démo de composants »).
- **D3 modulaire** (`d3-scale`, `d3-shape`, `d3-array`) importé seulement dans les îlots qui en ont besoin.
- **Polices auto-hébergées** via `@fontsource`.
- **Transitions de page** : View Transitions CSS cross-document (aucun JS).
- **Données** : `src/data/*.ts` (identité, projets, parcours, compétences) — ajouter un projet = ajouter un objet.

## 9. Règles d'authenticité appliquées

Seules les informations du CV sont utilisées. Tout ce qui manque (URL GitHub / LinkedIn, portrait, résultats chiffrés, stack de certains projets) est rendu par un **marqueur éditorial `[à compléter]`** visible, jamais inventé. Les données de l'étude C-MAPSS sont **simulées** et étiquetées `DÉMO` ; un script `scripts/prepare_cmapss.py` permet de les remplacer par le vrai fichier NASA `train_FD001.txt`.
