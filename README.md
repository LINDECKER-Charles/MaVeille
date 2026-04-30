# Veille

Veille technologique automatisée propulsée par **Claude** en mode cowork.
Chaque jour, un agent parcourt l'actualité de chaque thématique suivie et produit un rapport en français.

## Fonctionnement

Pour chaque thématique, un dossier dédié contient les rapports quotidiens sous deux formats :

- **`synthese-YYYY-MM-DD.md`** — vue condensée : faits marquants, top 5, tendances.
- **`detail-YYYY-MM-DD.md`** — version longue : sources, citations, analyses approfondies.

L'agent couvre par défaut les **dernières 24 heures** précédant la génération.

## Thématiques suivies

| Dossier   | Couverture                          |
|-----------|-------------------------------------|
| `Angular/` | TypeScript, Angular, écosystème front |
| `CSharp/`  | C#, .NET, ASP.NET, Visual Studio    |

## Ajouter une thématique

1. Créer un dossier à la racine au nom de la thématique.
2. Adapter le prompt de veille pour cibler les sources et le périmètre souhaités.
3. Le prochain run produira automatiquement les fichiers `synthese` et `detail` du jour.
