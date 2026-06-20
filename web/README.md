# Veille — viewer (Angular 20, static SSG)

Static viewer for the daily tech-watch ("veille") digests stored as Markdown under the **repo root**
`report/` folder (`report/categorie/<Cat>/` for per-category daily reports, `report/weekly/` for
weekly cross-category reports). The app is prerendered to a fully static site — no Node server at
runtime.

## Stack

- **Angular 20** standalone components, signals, native control flow (`@if`/`@for`/`@switch`), `inject()`.
- **Static prerender** via `@angular/build:application` (`outputMode: static`). Output lands in
  `dist/veille/browser/` with one HTML page per route (each digest date, `/stats`, `/rapports`,
  `/rapports/:week`, `/`).
- **Build-time data generator** (`tools/build-data.mjs`) replaces SvelteKit's `import.meta.glob`.

## Data pipeline

`tools/build-data.mjs` runs as an npm `prebuild`/`pretest` step. It scans the repo-root content,
parses **optional YAML frontmatter** (`tags`, `importance`, `sources_count`, …), renders
Markdown → sanitized HTML (`marked` + `isomorphic-dompurify`), splits detail files into per-topic
snippets, and emits into `src/app/data/generated/` (git-ignored):

| File | Loaded | Contents |
|---|---|---|
| `index.ts` | eager | `digests` (metadata), `stats`, `categoryRegistry`, `weeklies`, `totals` |
| `digest-<date>.json` | lazy (code-split) | per-category synthèse/détail HTML + snippets |
| `loaders.ts` | eager | `digestLoaders[date] = () => import('./digest-<date>.json')` |
| `search-index.json` | lazy (first query) | `[{ date, scope, type, text }]` stripped plaintext |

Files **without** frontmatter (all current digests) keep working: subjects/sources are derived by the
existing regexes (`/^## \d+\.\s+/gm`, `/^\*\*Source\s*:\*\*/gm`). The formal contract lives in the
repo-root `DIGEST_FORMAT.md`.

### Code & diagrammes

- **Code → coloration syntaxique au build (Shiki).** Tout bloc ` ``` ` avec un langage explicite
  (` ```ts `, ` ```csharp `, ` ```bash `, ` ```json `, …) est colorisé **au build** par Shiki (un seul
  highlighter partagé). Le thème est **dual light/dark** via variables CSS (`defaultColor: false`,
  `github-light` / `github-dark`) : le code suit le toggle de thème de l'app sans rejouer le highlight
  côté client. Le HTML Shiki (`<pre class="shiki">`, spans + styles en variables CSS) est préservé par
  le sanitizer (relaxation scoped à `class`/`style` sur `pre`/`code`/`span`). Aucun `unsafe-eval` ni CDN :
  compatible avec la CSP de prod. Les blocs sans langage et le code inline gardent leur rendu d'origine.
- **Diagrammes Mermaid → rendu client lazy.** Un bloc ` ```mermaid ` n'est pas colorisé : le générateur
  émet un marqueur `<pre class="mermaid">…source…</pre>`. Le `MarkdownComponent` détecte ces nœuds après
  l'injection `[innerHTML]`, fait un `import('mermaid')` **dynamique** (chunk dédié — les pages sans
  diagramme ne le chargent jamais), initialise en `securityLevel: 'strict'` + thème aligné sur le
  `ThemeService`, puis `mermaid.run()`. Rendu **guardé `isPlatformBrowser`** (no-op au prerender), avec
  **re-render au changement de thème** (la source est conservée dans `data-src`) et tolérance aux erreurs
  (la source reste visible si le parse échoue). Fonctionne aussi dans les snippets de détail (même
  composant). Mermaid v11 fonctionne sous `script-src 'self'` (pas d'`eval` pour les flowcharts).

### Category registry (zero-code extensibility)

`categories.config.json` (optional) maps `{ name, label, accent, icon?, description?, order? }`. The
generator merges it with auto-discovered category folders; unknown categories fall back to a label =
folder name and a deterministic accent derived by hashing the name. Adding a category needs only a
folder (+ optional registry entry).

### Weekly reports

Authored cross-category weekly reports live in `report/weekly/YYYY-Www_weekly.md` (ISO week, Monday
start). The generator strips the leading H1 as the title, renders the body to sanitized HTML, parses
the ISO week id from the filename (overridable via optional `week`/`range` frontmatter), and emits a
newest-first `weeklies` list. Surfaced at `/rapports` (list) and `/rapports/:week` (one report,
rendered via `MarkdownComponent`).

## Scripts

```bash
npm run generate        # run the data generator only
npm run build           # prebuild (generate) + ng build → dist/veille/browser/
npm test                # ng test (Karma + ChromeHeadless); coverage → coverage/veille/coverage-summary.json
npm run test:generator  # node:test unit tests for the generator helpers
npm run lint            # ng lint (angular-eslint flat config)
npm run e2e             # build, serve dist statically, run Playwright (smoke + axe a11y)
npm run lighthouse      # @lhci/cli autorun against the built static site
```

### E2E notes

- `playwright.config.ts` serves `dist/veille/browser` via `http-server` and runs specs in `e2e/`.
- Skip routes in CI with `E2E_EXCLUDE_ROUTES` (comma-separated path prefixes), e.g.
  `E2E_EXCLUDE_ROUTES=/rapports,/digest/2026-06-20`.
- a11y specs (`@axe-core/playwright`) fail only on `critical`/`serious` WCAG 2 A/AA violations.

## Architecture

```
src/app/
  app.ts / app.html / app.css       # shell: skip-link, sticky header, nav, theme toggle, footer
  app.routes.ts                     # lazy routes
  app.routes.server.ts              # prerender params (getPrerenderParams) for :date / :week
  core/
    date.util.ts / date.pipe.ts     # single FR date utility + `frDate` pipe
    theme.service.ts                # dark/light, localStorage 'veille-theme', data-theme attr
    seen.service.ts                 # "new" tracking, localStorage 'veille-last-seen-date'
    search.service.ts               # lazy search-index.json, <mark> snippet building
    digest-store.service.ts         # reads index.ts, lazy-loads via loaders.ts
  shared/
    markdown.component.ts           # [innerHTML] + bypassSecurityTrustHtml (content pre-sanitized)
    heatmap / bar-chart / line-chart # SVG charts
  features/
    home/                           # SearchBox + DigestCard + results
    digest/                         # DigestPage → DigestTabs → DetailSnippet
    stats/                          # KPI grid + 3 charts
    rapports/                       # weekly list + per-week report (markdown)
  data/
    types.ts                        # shared data contract
    generated/                      # emitted by tools/build-data.mjs (git-ignored)
tools/
    build-data.mjs                  # the generator
    build-data.test.mjs             # node:test helper specs
```

Theme variables, dark/light palettes and `.markdown` typography are ported verbatim into
`src/styles.css`.
