# Veille — Web viewer

Petite app SvelteKit (statique) qui lit les digests Markdown du repo (`Recap/`, `Categorie/*/`) et les rend dans une UI navigable par date et par thématique.

## Stack

- **SvelteKit 2** + **Svelte 5** (runes)
- **adapter-static** — site 100% statique, déployable sur GitHub Pages, Cloudflare Pages, S3, etc.
- **marked** + **DOMPurify** — rendu Markdown sanitisé au build
- Aucun framework CSS — variables CSS + theming dark/light natif

## Installation

```bash
cd web
npm install
```

## Développement

```bash
npm run dev
# http://localhost:5173
```

Les digests sont chargés via `import.meta.glob` depuis les dossiers `../Recap/` et `../Categorie/`. Le HMR de Vite détecte les nouveaux fichiers et les modifications automatiquement.

## Build production

```bash
npm run build
# sortie : web/build/  (HTML/CSS/JS pré-rendus)
```

Pour un déploiement sur sous-chemin (ex. GitHub Pages `username.github.io/Veille`) :

```bash
BASE_PATH=/Veille npm run build
```

## Structure attendue des digests

Voir [`../DIGEST_FORMAT.md`](../DIGEST_FORMAT.md) à la racine du repo — c'est le contrat formel que doit respecter le workflow de génération.

L'app fait :

- **Découverte** : tous les fichiers matchant `Recap/*_recap.md`, `Categorie/*/*_synthese.md`, `Categorie/*/*_detail.md`.
- **Groupage** : par date (`YYYY-MM-DD` extrait du nom de fichier), puis par catégorie (nom du dossier sous `Categorie/`).
- **Rendu** : la liste racine montre tous les digests triés date décroissante ; chaque page digest expose le recap global + un onglet par catégorie avec switch synthèse / analyse détaillée.

## Pourquoi adapter-static ?

- Le corpus est petit et croît lentement (~5 fichiers par jour) → tout peut être pré-rendu au build.
- Pas de backend → hébergement gratuit, zéro maintenance.
- SEO-friendly → chaque digest a une URL stable `/digest/YYYY-MM-DD/`.

Si le corpus devient massif (milliers de jours), passer `eager: true` à `false` dans `src/lib/digests.ts` pour basculer en chargement à la demande.
