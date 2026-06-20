# Rapport d'architecture — Veille

> Diagnostic généré dans le cadre de la migration front Svelte → Angular + refonte CI/CD.
> Section **AVANT** = état au démarrage du chantier. Section **APRÈS** = à compléter en fin de chantier.

---

## AVANT

### 1. Cartographie & stack

Dépôt **mono-repo de contenu + viewer**. Deux natures cohabitent :

| Domaine | Localisation | Rôle |
|---|---|---|
| **Données** (markdown) | `Recap/`, `Categorie/<Cat>/`, `archive/` | Digests quotidiens générés par Claude Cowork |
| **Viewer** | `web/` | App **SvelteKit 2 / Svelte 5** statique (`adapter-static`), rend les digests |
| **Contrat** | `DIGEST_FORMAT.md` | Format formel imposé au workflow de génération |
| **Déploiement** | `.github/workflows/`, `config/` | CI/CD + vhosts Apache **copiés d'un projet portfolio**, non adaptés |

**Stack viewer** : SvelteKit 2, Svelte 5 (runes), `adapter-static` (prerender), `marked` + `isomorphic-dompurify` (rendu markdown sanitisé), variables CSS natives (theming dark/light), aucun framework CSS.

**Données** : 24 recaps, 88 synthèses, 60 détails (4 catégories : `Angular`, `CSharp`, `IA`, `Tech`) + 8 fichiers archivés. Croissance ~5 fichiers/jour.

**Mécanique de découverte** : `web/src/lib/digests.ts` bundle tout le markdown au build via `import.meta.glob(..., { eager: true })`, extrait date (`/(\d{4}-\d{2}-\d{2})/`) et catégorie (dossier), compte sujets (`/^## \d+\.\s+/gm`) et sources (`/^\*\*Source\s*:\*\*/gm`).

### 2. Taille des fichiers

Le code source du viewer totalise **2 761 lignes**. Classement :

| Fichier | Lignes | Seuil |
|---|---|---|
| `web/src/routes/digest/[date]/+page.svelte` | 555 | 🔴 > 500 |
| `web/src/routes/+page.svelte` | 497 | ⚠️ > 300 |
| `web/src/lib/digests.ts` | 316 | ⚠️ > 300 |
| `web/src/routes/+layout.svelte` | 258 | (limite) |
| `web/src/app.css` | 237 | — |
| `web/src/routes/stats/+page.svelte` | 211 | — |
| `web/src/lib/components/Heatmap.svelte` | 173 | — |

Côté infra : `.github/workflows/ci-cd-test.yml` (214) et `ci-cd-prod.yml` (162) sont volumineux **et dupliqués à ~80 %** (même job `ci`, même bloc `deploy`).

**Constat** : les deux plus gros fichiers (`+page.svelte` digest & accueil) mélangent logique (state, clavier, formatage, parsing d'onglets) **et** ~250–300 lignes de CSS scoped chacun. C'est la cible n°1 de découpe lors du port Angular (composants dédiés : carte, recherche, onglets, snippet, charts).

### 3. DRY — duplications relevées

| Cas | Emplacements | Détail |
|---|---|---|
| **Formatage de date FR** (`Intl.DateTimeFormat('fr-FR', …)` + `formatDate`) | `+page.svelte:60`, `digest/[date]/+page.svelte:74`, `stats/+page.svelte:11`, `Heatmap.svelte:91` | 4 implémentations quasi identiques → à factoriser en util/pipe |
| **`.visually-hidden`** (bloc CSS a11y) | `+page.svelte:229`, `stats/+page.svelte:118` | Dupliqué → devrait être global (`app.css`) |
| **Bloc `.kpis` (CSS)** | `+page.svelte:254`, `stats/+page.svelte:143` | Styles KPI identiques dupliqués |
| **Pipeline CI complète** | `ci-cd-prod.yml` vs `ci-cd-test.yml` | Jobs `ci` + `deploy-*` quasi copiés (seuls dir/ports/branche changent) |
| **Parsing markdown** (strip H1, snippets) | `digests.ts:stripMd` vs `markdown.ts:stripLeadingH1/buildPreview` | Deux logiques de strip markdown proches, non mutualisées |

### 4. SOLID / séparation des responsabilités

- **SRP violé** dans `digest/[date]/+page.svelte` (555 l.) : un seul composant gère state d'onglets + navigation clavier ARIA + ouverture snippets + formatage + rendu. À éclater.
- **Bon point** : `digests.ts` (indexation/recherche/stats) et `markdown.ts` (rendu/snippets) sont **bien séparés** du rendu — logique pure, testable, réutilisable. C'est l'actif à **porter tel quel** dans le générateur de build Angular.
- **Couplage framework** : la logique de données dépend de `import.meta.glob` (Vite) et `$app/environment` (SvelteKit). À découpler dans un générateur Node framework-agnostic.

### 5. KISS / simplicité

- **Bien** : `seen.svelte.ts` (60 l.) — store localStorage minimal et clair ; charts SVG sans dépendance (Heatmap/Line/Bar).
- **À surveiller** : `digest/[date]/+page.svelte:237-248` — cascade `{#if showDetail}{:else if}` avec branches mortes (`detailHtml` testé deux fois). À simplifier au port.
- **Dette infra** : `config/` et `.github/` portent encore l'ADN du **portfolio** (noms `portfolio*`, service SSR `angular-portfolio.service`, ports 4406/4407, serveur d'images, CSP YouTube). Inadaptés à un viewer statique → réécriture complète prévue. Fichier parasite `config/cat portfolio-test.conf` (artefact de `cat`).

### 6. Garde-fous existants

**Aucun test** (unit / e2e / a11y) ni dans `web/` ni à la racine. Le CI référence `ng test`, `playwright`, `lighthouse` mais sur un projet **Angular inexistant** (`front-portfolio/`). → Le principal risque du chantier ; la migration **crée** la suite de tests manquante.

### 7. Synthèse des actions (priorisées)

| # | Action | Impact | Effort | Risque |
|---|---|---|---|---|
| 1 | Découpler la logique données (`digests.ts`/`markdown.ts`) en générateur Node | Élevé | Moyen | Faible |
| 2 | Porter l'app en Angular (composants éclatés, SRP) | Élevé | Élevé | Moyen |
| 3 | Factoriser date FR + `.visually-hidden` + `.kpis` | Moyen | Faible | Faible |
| 4 | Réécrire CI/CD pour statique + dédupliquer prod/test | Élevé | Moyen | Moyen |
| 5 | Renommer/adapter vhosts Apache portfolio→veille | Élevé | Faible | Faible |
| 6 | Créer suite de tests (unit + e2e + a11y + Lighthouse) | Élevé | Élevé | Faible |

---

## APRÈS

> État en fin de chantier (migration Angular + restructuration du dépôt + CI/CD statique).

### 1. Restructuration du dépôt

| Avant | Après |
|---|---|
| `Categorie/<Cat>/*` | `report/categorie/<Cat>/*` (148 fichiers déplacés via `git mv`) |
| `Recap/*_recap.md` (recaps quotidiens) | `archive/recap/*` (22 fichiers gelés) |
| — | `report/weekly/*_weekly.md` (nouvelle cadence hebdo, 2 rapports seed) |
| — | `order/` (prompts versionnés des routines : `categorie.md`, `weekly.md`, `README.md`) |
| Viewer SvelteKit dans `web/` | App **Angular 20** statique (SSG) dans `web/` |
| Docs absentes | `docs/` : architecture, design-analysis, claude-design-brief, DEPLOYMENT_SECRETS |

Top-level final : `web/ report/ order/ docs/ config/ archive/`.

### 2. Migration Svelte → Angular (SRP / découpe)

| Avant (Svelte) | Lignes | Après (Angular) |
|---|---|---|
| `digest/[date]/+page.svelte` | 🔴 555 | éclaté en `DigestPage` → `DigestTabs` → `DetailSnippet` (3 composants) |
| `+page.svelte` (accueil) | ⚠️ 497 | `HomeComponent` + `SearchBoxComponent` + `DigestCardComponent` |
| `digests.ts` + `markdown.ts` (couplé à Vite/SvelteKit) | 316 + 107 | **générateur framework-agnostic** `web/tools/build-data.mjs` (Node, testable) |
| charts Svelte | — | `Heatmap/Bar/Line` standalone (SVG porté 1:1) |

### 3. DRY — duplications résorbées

- **Formatage de date FR** (×4) → un seul `date.util.ts` + `date.pipe.ts`.
- **`.visually-hidden` / `.kpis`** (dupliqués) → globalisés dans `web/src/styles.css`.
- **Pipeline CI prod/test** (≈80 lignes dupliquées) → job `ci` extrait en **workflow réutilisable** `ci.yml` (`workflow_call`) appelé par les deux.
- **Rendu markdown** (strip H1, snippets, comptages) → centralisé dans le générateur.

### 4. Infra : portfolio → veille (statique)

- `config/` : 12 fichiers `portfolio*` (+ parasite `cat portfolio-test.conf`) supprimés → 4 templates `veille*` (vhost **statique** `DocumentRoot` + `FallbackResource`, CSP durcie, sans proxy SSR / serveur d'images / CSP YouTube).
- `.github/` : workflows réécrits pour déploiement **statique** (rsync `dist/veille/browser/` → docroot, **pas de service Node**), secrets `VEILLE_*`, `deploy-apache.yml` conservé (configtest + rollback).
- `docs/DEPLOYMENT_SECRETS.md` : tous les secrets GitHub + prérequis VPS.

### 5. Nouvelles features

- **Rapports hebdomadaires** : `report/weekly/`, routes `/rapports` + `/rapports/:week`, rendus au build.
- **Catégories extensibles** : auto-découverte + registre optionnel `web/categories.config.json` (label/accent/icône, fallback déterministe). Ajout d'une catégorie = **zéro code**.
- **Frontmatter YAML optionnel** : tags/importance/sources_count, rétrocompatible (les ~150 fichiers sans frontmatter marchent inchangés).
- **Code & diagrammes dans les news** : coloration syntaxique **au build** (Shiki) + **Mermaid** rendu lazy côté client (cf. `DIGEST_FORMAT.md §3.1`).

### 6. Garde-fous créés (le gros manque du AVANT)

| Suite | Couverture |
|---|---|
| Unit (Karma/Jasmine) | services + utilitaires |
| Générateur (`node:test`) | parsing, frontmatter, stats, weekly |
| E2E + a11y (Playwright + axe) | routes clés + accessibilité |
| Lighthouse CI | perf / a11y / best-practices / SEO |

Build statique vert : **27 routes prérendues** (`dist/veille/browser/`).

### 7. Reste recommandé

- Renseigner les secrets GitHub + prérequis VPS (DNS, certbot, sudoers) avant le 1er déploiement.
- Adopter progressivement la frontmatter sur les nouveaux digests (active filtres/badges).
- Faire passer Claude Design sur `docs/claude-design-brief.md` pour la refonte visuelle.
- Migration Karma → Vitest (Karma déprécié en Angular 20) — non bloquant.
