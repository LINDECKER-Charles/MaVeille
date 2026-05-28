# Veille

Veille technologique automatisée propulsée par **Claude** en mode cowork.
Chaque jour à 8h00, un agent parcourt l'actualité de chaque thématique suivie et produit un rapport en français, qui est versionné dans ce dépôt.

## Structure

```
Veille/
├── Recap/                              # Digest global du jour (toutes thématiques)
│   └── YYYY-MM-DD_recap.md
├── Categorie/                          # Rapports détaillés par thématique
│   ├── Angular/
│   │   ├── YYYY-MM-DD_synthese.md
│   │   └── YYYY-MM-DD_detail.md
│   ├── CSharp/
│   │   ├── YYYY-MM-DD_synthese.md
│   │   └── YYYY-MM-DD_detail.md
│   ├── IA/
│   │   ├── YYYY-MM-DD_synthese.md
│   │   └── YYYY-MM-DD_detail.md
│   └── Tech/
│       ├── YYYY-MM-DD_synthese.md
│       └── YYYY-MM-DD_detail.md
└── archive/                            # Anciens rapports (avant restructuration mai 2026)
    ├── Angular/
    └── CSharp/
```

## Formats de fichiers

- **`YYYY-MM-DD_recap.md`** (dossier `Recap/`) — vue d'ensemble cross-thématique du jour : faits marquants, tendances, à retenir en 1 minute.
- **`YYYY-MM-DD_synthese.md`** (dossiers `Categorie/*/`) — vue condensée par thématique : top 3-5 sujets avec teasers.
- **`YYYY-MM-DD_detail.md`** (dossiers `Categorie/*/`) — analyses approfondies de chaque sujet : contexte, ce qui change, implications, détails techniques, sources.

L'agent couvre par défaut les **dernières 24-48 heures** précédant la génération.

## Thématiques suivies

| Dossier              | Couverture                                              |
|----------------------|---------------------------------------------------------|
| `Categorie/Angular/` | Angular, TypeScript, écosystème front                   |
| `Categorie/CSharp/`  | C#, .NET, ASP.NET, EF Core, Visual Studio               |
| `Categorie/IA/`      | LLMs open source, papers, frameworks (vLLM, llama.cpp)  |
| `Categorie/Tech/`    | Tech overview, sécurité dev, outils, infra              |

## Déduplication

Chaque sujet déjà couvert dans les 30 derniers jours est exclu des rapports suivants. La mémoire de déduplication est tenue par la tâche planifiée Cowork (`veille-tech-quotidienne`).

## Ajouter une thématique

1. Créer un dossier dans `Categorie/` au nom de la thématique.
2. Adapter le prompt de la tâche planifiée pour cibler les sources et le périmètre souhaités.
3. Le prochain run produira automatiquement les fichiers du jour.

## Versionnement

Chaque digest matinal est commité localement avec le message :
```
feat(data): digest YYYY-MM-DD
```
Le push vers `origin/main` reste manuel.
