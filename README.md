# Veille

Veille technologique automatisée propulsée par **Claude** (mode Cowork).
Des routines planifiées parcourent l'actualité de chaque thématique suivie et produisent des rapports en français, versionnés dans ce dépôt et rendus par une app **Angular** statique.

## Structure du dépôt

```
Veille/
├── web/                    # Application web (Angular 20, statique/SSG)
├── report/                 # Contenu généré par les routines
│   ├── weekly/             #   Rapports hebdomadaires  (YYYY-Www_weekly.md)
│   └── categorie/          #   Rapports par thématique
│       ├── Angular/        #     YYYY-MM-DD_synthese.md + YYYY-MM-DD_detail.md
│       ├── CSharp/
│       ├── IA/
│       └── Tech/
├── order/                  # Prompts des routines Claude (source de vérité)
├── docs/                   # Fiche technique (archi, design, secrets de déploiement)
├── config/                 # Vhosts Apache (templates versionnés)
├── archive/                # Anciens rapports gelés (dont recaps quotidiens)
└── DIGEST_FORMAT.md        # Contrat de format imposé aux routines
```

## Cadences & formats

| Routine | Cadence | Sortie | Prompt |
|---|---|---|---|
| Veille par catégorie | Quotidienne | `report/categorie/<Cat>/YYYY-MM-DD_{synthese,detail}.md` | [`order/categorie.md`](order/categorie.md) |
| Rapport hebdomadaire | Hebdomadaire | `report/weekly/YYYY-Www_weekly.md` | [`order/weekly.md`](order/weekly.md) |

- **`_synthese.md`** — vue condensée par thématique (top 3-5 sujets, scan rapide).
- **`_detail.md`** — analyses approfondies par sujet (contexte, ce qui change, implications, sources).
- **`_weekly.md`** — rapport transversal de la semaine (fils rouges, à retenir en 1 min, index).

Le format formel est décrit dans [`DIGEST_FORMAT.md`](DIGEST_FORMAT.md) — c'est le contrat que les routines **doivent** respecter pour que l'app indexe et rende correctement les fichiers.

## Thématiques suivies

| Dossier | Couverture |
|---|---|
| `report/categorie/Angular/` | Angular, TypeScript, écosystème front |
| `report/categorie/CSharp/` | C#, .NET, ASP.NET, EF Core, Visual Studio |
| `report/categorie/IA/` | LLMs open source, papers, frameworks (vLLM, llama.cpp) |
| `report/categorie/Tech/` | Tech overview, sécurité dev, outils, infra |

## Ajouter une thématique

Architecture **data-driven** — zéro changement de code :

1. Créer le dossier `report/categorie/<NouvelleCat>/`.
2. (Optionnel) Ajouter une entrée dans `web/categories.config.json` pour personnaliser **label / couleur d'accent / icône**. Sinon, fallback déterministe (label = nom du dossier, accent dérivé par hash).
3. Adapter le prompt de la routine ([`order/categorie.md`](order/categorie.md)) pour cibler les sources.
4. Le prochain build indexe automatiquement la nouvelle catégorie (onglet, badge, charts colorés).

## Application web

App **Angular 20** standalone (signals, control-flow), **statique** (SSG/prerender) — aucun backend. Les rapports markdown sont lus, parsés et rendus en HTML sanitisé **au build** par le générateur `web/tools/build-data.mjs`.

```bash
cd web
npm install
npm run dev      # http://localhost:4200
npm run build    # → web/dist/veille/browser/ (statique)
```

Fonctionnalités : liste par date + recherche plein-texte, page rapport par jour (onglets catégories, switch synthèse/détail, sujets dépliables), page stats (heatmap, courbe, barres), rapports hebdo, thème clair/sombre, indicateur « nouveau ». Détails dans [`web/README.md`](web/README.md).

## Déploiement

CI/CD GitHub Actions → VPS Apache (site **statique**, sans service Node) :

- push `dev` → **build unique → déploie test ET prod** (même artefact) : `test.veille.charles-lindecker.com` + `veille.charles-lindecker.com`. Gate avant prod = la CI (build + tests + e2e + lighthouse).
- `CD - Production (manuel)` → redéploiement / hotfix prod à la demande (`workflow_dispatch`).

Secrets et prérequis : [`docs/DEPLOYMENT_SECRETS.md`](docs/DEPLOYMENT_SECRETS.md). Config Apache : [`config/README.md`](config/README.md).

## Documentation

| Doc | Contenu |
|---|---|
| [`docs/architecture-report.md`](docs/architecture-report.md) | Rapport d'architecture (avant/après refacto) |
| [`docs/design-analysis.md`](docs/design-analysis.md) | Analyse UX/UI + direction visuelle |
| [`docs/claude-design-brief.md`](docs/claude-design-brief.md) | Brief de redesign pour Claude Design |
| [`docs/DEPLOYMENT_SECRETS.md`](docs/DEPLOYMENT_SECRETS.md) | Secrets GitHub & prérequis VPS |

## Déduplication

Chaque sujet déjà couvert dans les 30 derniers jours est exclu des rapports suivants. La mémoire de déduplication est tenue par les tâches planifiées Cowork.
