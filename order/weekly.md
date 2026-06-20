# Routine — Rapport hebdomadaire

> Prompt de la tâche planifiée Cowork. Produit, chaque **lundi**, un rapport transversal de la semaine écoulée (lundi → dimanche), en croisant les catégories.

## Sortie attendue

Un fichier par semaine ISO :

```
report/weekly/YYYY-Www_weekly.md      ← ex. report/weekly/2026-W25_weekly.md
```

`Www` = numéro de semaine ISO 8601 (la semaine commence le lundi). Le rapport couvre la semaine **précédente complète**.

## Rôle

Le hebdo est la pièce **éditoriale transversale** (l'équivalent de l'ancien recap, mais à la semaine) : il prend de la hauteur sur les digests quotidiens par catégorie de la semaine, dégage les fils rouges, et donne l'actionnable. Il **ne recopie pas** le détail quotidien — il synthétise et relie. **Il reste pédagogique** : les sujets marquants sont expliqués (« comment ça marche ») et illustrés (code ou schéma), pas seulement cités.

## Source

S'appuyer sur les `report/categorie/<Cat>/YYYY-MM-DD_*.md` de la semaine couverte (toutes catégories, tous les jours de la fenêtre). Ne pas réintroduire un sujet sans le mettre en perspective semaine.

## Format — respecter `DIGEST_FORMAT.md`

```markdown
# Rapport hebdo — Semaine <Www> (<date lundi> → <date dimanche> <année>)

<Intro : nb sujets marquants, nb catégories actives, 2-3 mouvements de fond
qui ont traversé la semaine. 3-4 phrases.>

## <Catégorie ou fil rouge 1>
<2-4 phrases denses : ce qui a bougé cette semaine, chiffres clés (versions, %, dates),
actions concrètes. Croiser les enjeux entre jours. Pour le sujet le plus marquant de la
section : un court « comment ça marche » + un exemple de code (bloc `lang`) OU un diagramme
(bloc `mermaid`), avant/après si c'est une évolution.>

## <Catégorie ou fil rouge 2>
…

## À retenir si tu n'as qu'une minute
<Bullet list courte (3-5 items) : chiffres / actions à garder.>

## Index de la semaine
- **<Cat>** : <résumé une ligne> — <N> sujets sur la semaine
- …

---
*Généré le <date> par la routine `weekly` (Claude Cowork).*
```

## Règles dures

- Un seul `# H1` en première ligne (extrait comme titre dans l'app).
- H2 par section (fil rouge / catégorie), titres concis (< 60 car.).
- URLs absolues uniquement ; pas de liens relatifs vers d'autres `.md`.
- UTF-8 sans BOM. Nom de fichier matchant `YYYY-Www_weekly.md`.

## Exemples concrets — pédagogie aussi dans l'hebdo (OBLIGATOIRE sur les sujets marquants)

Le hebdo prend de la hauteur, mais il reste **pédagogique** : il n'énumère pas les news, il en **explique** les plus importantes. Règles :

- **Top de la semaine** : chaque sujet du Top porte un **mini-traitement pédagogique** — un court « comment ça marche » + **un exemple de code commenté OU un diagramme Mermaid** (le plus parlant pour le sujet).
- **Par catégorie** : pour le sujet le plus marquant, ajoute **au moins un artefact** (code ` ```lang ` ≤ 30 lignes, ou diagramme ` ```mermaid ` ≤ ~12 nœuds ; a