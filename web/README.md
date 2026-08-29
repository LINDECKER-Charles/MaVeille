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

## Local environment

Docker, from the **repo root** (the build context is the root: the generator reads `report/`):

```bash
docker compose up --build   # → http://localhost:4200
```

Two stages: a throwaway Node stage runs `npm run build` (generator + prerender), then
`nginx:alpine-slim` serves `dist/veille/browser`. Final image **~43 MB**. No dev server and no
bind mount — rebuild after each change. In exchange, what you browse locally is byte-for-byte what
production serves, under the same headers.

`web/docker/nginx.conf` mirrors `config/veille-le-ssl.conf.template`: SPA fallback, the strict CSP,
`immutable` caching on hashed assets, `no-cache` on `index.html`. Two nginx specifics worth knowing:

- `absolute_redirect off` — otherwise a directory request is answered with a 301 rebuilt from the
  internal listen port (80), which breaks behind the `4200:80` publish.
- `try_files $uri $uri/index.html` rather than `$uri/` — serves the prerendered directory index
  without a trailing-slash redirect.
- `add_header` does not inherit into a `location` that declares one, hence the shared
  `security-headers.conf` included in each block.

Without Docker: `npm install && npm run generate && npm start` for a dev server with hot reload.
**`npm run generate` is required first** — `ng serve` does not trigger the `prebuild` hook, and
`src/app/data/generated/` is git-ignored, so a fresh clone has nothing to import.

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
src/
  styles.css                        # 3 layers: Établi tokens, legacy bridge, shared app chrome
  styles/
    tokens/*.css                    # Établi design tokens (verbatim vendoring)
    etabli-ui.css                   # Établi component classes (.etb-*)
src/app/
  app.ts / app.html / app.css       # shell: 48px top bar, 236px rail, 26px status bar
  app.routes.ts                     # lazy routes
  app.routes.server.ts              # prerender params (getPrerenderParams) for :date / :week
  ui/                               # Établi primitives, Angular side
    icon (+ icon.data.ts) / button / icon-button / badge / kbd
    callout / key-value-list / panel / segmented-control
  layout/
    shell-nav.component.ts          # grouped rail, rendered in the rail and the mobile drawer
    command-palette.component.ts    # ⌘K: subject titles first, then full text
  core/
    date.util.ts / date.pipe.ts     # single FR date utility + `frDate` pipe
    content.util.ts                 # anchors/TOC, code-only view, links, first sentence
    source.util.ts                  # source domain extraction
    theme.service.ts                # dark/light, localStorage 'veille-theme', data-theme attr
    seen.service.ts                 # "new" tracking, localStorage 'veille-last-seen-date'
    search.service.ts               # lazy search-index.json, <mark> snippet building
    subject-index.service.ts        # lazy subject-index.json, title search
    digest-store.service.ts         # reads index.ts, lazy-loads via loaders.ts
  shared/
    markdown.component.ts           # [innerHTML] + bypassSecurityTrustHtml (content pre-sanitized)
    heatmap / bar-chart / line-chart / donut  # SVG charts
  features/
    briefing/                       # BriefingPage → BriefingView | SubjectReader (?sujet=)
    fil/                            # every subject, filtered by theme and period
    jours/                          # day history, one generated headline per digest
    stats/                          # KPI grid + 3 panels
    stats-perso/                    # local read tracking
    rapports/                       # weekly list + per-week report (markdown)
  data/
    types.ts                        # shared data contract
    generated/                      # emitted by tools/build-data.mjs (git-ignored)
tools/
    build-data.mjs                  # the generator
    build-data.test.mjs             # node:test helper specs
```

`/digest/:date` renders the day's briefing; `?sujet=<slug>-<index>` switches the same route to
the subject reader. That keeps a shareable permalink per subject without prerendering one page
per subject (426 today) — only the 71 days are prerendered.

`src/styles.css` layers the Établi design system over a bridge of legacy aliases (`--bg`,
`--accent`, `--cat-*`, `--heatmap-*`) that TypeScript still builds by string interpolation
(`DigestStore.accentFor`, `HeatmapComponent.levelFor`). Renaming those breaks code, not just CSS.
Shared screen chrome (`.screen*`, `.side-panel`, `.kpi*`, `.row-card`) lives there too: the
`anyComponentStyle` budget caps each component stylesheet at 8 kB.
