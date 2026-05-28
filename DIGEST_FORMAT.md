# Contrat de format des digests

> Ce document est le contrat formel à respecter par le workflow `veille-tech-quotidienne` (Claude Cowork) pour que les digests soient correctement indexés et rendus par l'app `web/`.

Tout changement de structure doit être répercuté ici **et** dans `web/src/lib/digests.ts`.

---

## 1. Arborescence — strictement respectée

```
Veille/
├── Recap/
│   └── YYYY-MM-DD_recap.md           ← un fichier par jour
└── Categorie/
    └── <Categorie>/                   ← un dossier par thématique
        ├── YYYY-MM-DD_synthese.md
        └── YYYY-MM-DD_detail.md
```

**Règles dures :**

| Élément | Règle | Pourquoi |
|---|---|---|
| Date dans le nom | `YYYY-MM-DD` (ISO 8601, avec tirets) | Extraite par regex `/(\d{4}-\d{2}-\d{2})/` |
| Séparateur date↔suffixe | underscore `_` | Ex : `2026-05-27_recap.md`, **pas** `2026-05-27-recap.md` |
| Suffixes | `_recap.md`, `_synthese.md`, `_detail.md` | Match exact, en minuscules |
| Nom de catégorie | Dossier en CamelCase ASCII (ex : `Angular`, `CSharp`, `IA`, `Tech`) | Affiché tel quel dans l'onglet |
| Encodage | UTF-8 sans BOM | Évite les artefacts de rendu |

> Tout fichier qui ne matche pas ces patterns est **ignoré silencieusement** par le viewer.

---

## 2. Contenu attendu par type de fichier

### 2.1 `Recap/YYYY-MM-DD_recap.md` — vue d'ensemble du jour

**Rôle dans l'UI** : page d'accueil du digest, onglet « Recap global » par défaut.

```markdown
# Digest Tech — Recap global du <jour de la semaine> <date en lettres>

<Paragraphe d'intro : nb sujets retenus, nb thématiques, 2-3 mouvements de fond
qui traversent la journée. 3-4 phrases max.>

## <Section thématique 1>

<2-4 phrases denses qui synthétisent les sujets de cette catégorie, en croisant
les enjeux. Citer les chiffres clés (versions, %, dates), les actions concrètes.>

## <Section thématique 2>
…

## À retenir si tu n'as qu'une minute

<Bullet list courte (2-4 items) d'actions concrètes ou de chiffres à garder.>

## Index des analyses détaillées

- **<Categorie>** : <résumé une ligne> → `Categorie/<Cat>/YYYY-MM-DD_detail.md`
- …

---
*Généré le <date> par la tâche planifiée `veille-tech-quotidienne` (Claude Cowork).*
```

**Contraintes UI :**

- **Le H1 est extrait** et utilisé comme titre de la page → garder une seule H1, en première ligne.
- Les H2 deviennent des ancres internes naturelles → titres concis (< 60 caractères).
- L'« Index des analyses détaillées » est conservé tel quel mais les **liens relatifs ne sont pas suivis** (l'app gère sa propre navigation via les onglets).

### 2.2 `Categorie/<Cat>/YYYY-MM-DD_synthese.md` — vue condensée par thématique

**Rôle dans l'UI** : onglet « Synthèse » de la catégorie. C'est la vue par défaut quand on ouvre une catégorie.

```markdown
# <Categorie> — Synthèse du <jour> <date en lettres>

## Digest court

<1 paragraphe : la story de la journée pour cette thématique, en 3-5 phrases.>

## Top <N> — <Sujet principal>

- **<Item 1>** : <description en 1 ligne>
- **<Item 2>** : <description en 1 ligne>
- …

<Optionnel : 1 paragraphe de contexte ou de timing.>

→ Analyse complète : `YYYY-MM-DD_detail.md`
```

**Contraintes UI :**

- Garder le contenu **scannable** (bullets, gras sur les noms propres). C'est le mode de lecture privilégié pour les utilisateurs pressés.
- Le H1 est extrait et masqué du contenu rendu (la date est déjà dans l'en-tête de page).
- Si plusieurs sujets, utiliser une H2 par sujet (`## Top 1 — …`, `## Top 2 — …`).

### 2.3 `Categorie/<Cat>/YYYY-MM-DD_detail.md` — analyses approfondies

**Rôle dans l'UI** : onglet « Analyse détaillée », accessible via le switch Synthèse / Détail.

```markdown
# <Categorie> — Détail du <jour> <date en lettres>

## 1. <Sujet 1>

**Source :** <Nom de la source> — <URL absolue>
**Date :** <date de l'événement>

### Contexte

<Pourquoi ce sujet existe, ce qui l'a amené, le background nécessaire. 1-2 paragraphes.>

### Ce qui change concrètement

<Détails techniques précis. Bullets bienvenus.>

### Pourquoi ça compte pour toi

<Implications pour un dev senior backend (Angular, .NET, Symfony, PostgreSQL).
Toujours formuler en « tu », jamais en « nous ».>

### Détails techniques | Points de vigilance | Limites

<Sections optionnelles selon le sujet.>

---

## 2. <Sujet 2>
…
```

**Contraintes UI :**

- Chaque sujet = un H2 numéroté. Le numéro est conservé dans le rendu.
- **Sources** : utiliser le pattern exact `**Source :** <nom> — <url>` sur sa propre ligne. Idem pour `**Date :**`. Le viewer ne les style pas spécifiquement aujourd'hui mais ce pattern sera exploité dans une future itération (extraction de métadonnées).
- Séparer les sujets avec `---` (HR) — visuellement utile et conventionnel.
- Les URLs doivent être **absolues** (`https://…`). Pas de liens relatifs vers d'autres digests.

---

## 3. Conventions Markdown supportées

| Élément | Support | Notes |
|---|---|---|
| Headings `#` à `####` | ✓ | H1 capturé en titre, H2 stylé en section, H3 muted, H4 uppercase |
| **Gras** / *italique* | ✓ | Gras = nom propre / chiffre clé ; italique = nuance |
| Bullets `-` et numérotés `1.` | ✓ | Indentation max 2 niveaux pour rester lisible |
| `Code inline` | ✓ | Pour noms de fichiers, commandes, identifiants |
| Blocs de code ``` ``` | ✓ | Pas de syntax highlighting (à dessein — moins de poids) |
| Tableaux GFM | ✓ | Préférer aux listes pour comparaisons à colonnes |
| Liens `[texte](url)` | ✓ | Toujours absolus |
| `> blockquote` | ✓ | Pour citations directes uniquement |
| HR `---` | ✓ | Séparateur entre sujets |
| Images | ⚠ | Ne pas inclure — pas d'asset pipeline configuré |
| HTML brut | ✗ | Sanitisé par DOMPurify, comportement non garanti |

---

## 4. Métadonnées (futur — recommandé mais pas encore obligatoire)

Pour permettre des features (filtre par tag, recherche, badge importance), prévoir d'ajouter une **YAML frontmatter** en tête de chaque fichier :

```markdown
---
date: 2026-05-27
category: Angular
type: synthese          # recap | synthese | detail
tags: [framework, signals, release]
importance: high        # high | medium | low
sources_count: 3
---

# Angular — Synthèse du …
```

Quand cette section sera adoptée, le viewer la parsera et l'utilisera pour :

- Filtres dans la liste racine (par tag, importance)
- Recherche full-text avec scoring sur les tags
- Badges visuels (« HIGH IMPACT ») sur les cards

**Tant que la frontmatter n'est pas présente, le viewer fonctionne sans.** N'ajoute pas de frontmatter partielle / incohérente — c'est tout-ou-rien par fichier.

---

## 5. Anti-patterns à éviter

| À éviter | Pourquoi | Bonne pratique |
|---|---|---|
| Plusieurs H1 dans un fichier | Casse l'extraction de titre | Un seul H1, en première ligne |
| Date au format `27/05/2026` dans le nom | Pas matché par la regex | Toujours `YYYY-MM-DD` ISO |
| Fichier `synthèse` avec accent | Cassé sur Windows / casse-mismatch | Sans accent : `synthese` |
| Liens relatifs vers d'autres digests (`../Tech/...md`) | Non suivis par l'app | Décrire en texte, l'utilisateur navigue via les onglets |
| Bloc HTML `<details>`, `<iframe>`, scripts | Sanitisés / supprimés | Markdown standard uniquement |
| Contenu mélangé synthèse + détail dans le même fichier | Brouille l'UX en onglets | Respecter la séparation : synthèse = condensé, détail = exhaustif |
| Modifier un digest passé sans bump de date | Pas de versioning détecté | Créer un nouveau digest avec la date du jour |

---

## 6. Conventions UX/UI à respecter pour un rendu optimal

> Ces conventions ne sont pas des règles dures du parser, mais leur respect impacte directement la qualité de l'interface (recherche, statistiques, scan rapide). Le viewer les exploite déjà.

### 6.1 Comptage des sujets — pattern `## N. `

Le viewer compte les sujets via la regex `/^## \d+\.\s+/gm` sur les fichiers `_detail.md`. Ce comptage alimente :

- Le badge **« N sujets »** sur chaque carte de la liste racine
- Le **graphe de timeline** sur la page `/stats`
- La **heatmap calendaire** (intensité = nb de sujets)
- Le **bar chart « Sujets par catégorie »**

**Convention impérative :**

```markdown
## 1. <Titre court du sujet>
## 2. <Titre court du sujet>
## 3. <Titre court du sujet>
```

À éviter :
- `## Sujet 1 — ...` (le numéro doit être au début, avant le point)
- `### 1. ...` (mauvais niveau de heading — H2 obligatoire)
- `## 1) ...` (parenthèse au lieu de point)
- Numérotation non-séquentielle (1, 2, 4, 5) — visible dans le rendu

### 6.2 Comptage des sources — pattern `**Source :**`

Le viewer compte les sources via `/^\*\*Source\s*:\*\*/gm`. Alimente le KPI **« Sources citées »** et le bar chart **« Sources par catégorie »**.

**Convention impérative — une source par sujet, sur sa propre ligne :**

```markdown
## 1. <Sujet>

**Source :** <Nom de la source primaire> — https://url-absolue/chemin
**Date :** <date de publication de la source>
```

À éviter :
- `**Sources :**` (pluriel — non matché)
- `**source :**` (minuscule — non matché)
- `**Source :**` sans deux-points ou avec deux-points collé : `**Source:**` (passe quand même grâce au `\s*`, mais préférer l'espacement)
- Plusieurs URLs dans une seule ligne `**Source :**` → un seul sujet = une source primaire ; les références secondaires vont en lien inline `[texte](url)` dans le corps

### 6.3 Discoverabilité par la recherche

La recherche full-text indexe **chaque ligne markdown** après strip des marqueurs (`#`, `**`, `` ` ``, `[]()`). Pour maximiser la pertinence :

- **Premier paragraphe d'un sujet = punchy** : c'est ce qui apparaît dans les snippets de résultats. Mettre les mots-clés (nom du framework, version, technologie) dans les 80 premiers caractères.
- **Nommer explicitement les versions** dans le titre H2 : `## 1. Angular 22 RC1 — Signal Forms` plutôt que `## 1. Nouvelle version d'Angular`.
- **Citer les noms propres tels qu'ils s'écrivent** : `DeepSeek V4`, pas `Deep Seek V4` ; `Hugging Face`, pas `HuggingFace` — sauf si la doc officielle utilise la forme accolée.
- **Acronymes en majuscules** : `MCP`, `LLM`, `LTS`, `MoE`. La recherche est insensible à la casse mais le rendu garde la casse d'origine.

### 6.4 Hiérarchie typographique — exploitée par le rendu

Le viewer applique des styles différents par niveau de heading :

| Niveau | Style appliqué | Usage recommandé |
|---|---|---|
| `#` (H1) | Extrait comme titre de page, **masqué** du contenu | Une seule occurrence par fichier, ligne 1 |
| `##` (H2) | Titre de section, taille 1.3rem | Sujet (détail) ou section thématique (recap/synthèse) |
| `###` (H3) | Sous-titre, couleur muted | Contexte / Ce qui change / Pourquoi ça compte |
| `####` (H4) | Petite caps uppercase, letter-spacing 0.04em | Sous-section rare |

**À ne pas faire :**
- Sauter un niveau (H2 → H4 directement) — casse l'arbre sémantique pour les lecteurs d'écran
- Mettre du texte en gras seul pour faire un titre — utiliser un vrai heading

### 6.5 Format des sous-sections d'un sujet `_detail.md`

L'app rend les détails verbatim mais la lecture est nettement meilleure si l'ordre suivant est respecté :

```markdown
## N. <Titre>

**Source :** … — …
**Date :** …

### Contexte
<Pourquoi ce sujet, background nécessaire. 1-2 paragraphes.>

### Ce qui change concrètement
<Détails techniques, bullets bienvenus.>

### Pourquoi ça compte pour toi
<Implications pour un dev senior backend. Toujours en « tu ».>

### Détails techniques | Points de vigilance | Limites
<Sections optionnelles, à n'inclure que si vraiment pertinentes.>
```

**Convention de longueur** (le viewer ne tronque rien, mais la lisibilité tape un mur au-delà) :

- Un sujet entier ≤ **400 mots** dans `_detail.md` (≈ 2 500 caractères)
- Le bloc « Pourquoi ça compte » ≤ **80 mots** — c'est la partie actionnable, doit rester serrée
- Phrases ≤ 25 mots, paragraphes ≤ 4 phrases

### 6.6 Catégories — naming et limites

- **Nom du dossier = nom affiché tel quel** dans l'onglet, le badge, la légende du bar chart.
- Préférer des noms **courts (≤ 10 caractères)** : `Angular`, `CSharp`, `IA`, `Tech`, `Symfony`, `Postgres`, `DevOps`. Au-delà, l'onglet déborde sur mobile.
- **CamelCase ou PascalCase**, jamais d'espace, jamais d'accent (sinon casse-bug Windows).
- Ne pas créer de catégorie « éphémère » pour un seul digest — diluerait les stats. Ajouter au moins 3 jours d'historique avant.

### 6.7 Liens — toujours absolus, jamais relatifs vers du markdown

- Liens externes (sources, refs) : **URLs absolues `https://...`**. Le viewer leur applique `target="_blank"` implicitement n'est PAS configuré — si tu veux ouverture nouvelle fenêtre, ajoute-le manuellement dans le markdown via HTML (autorisé via DOMPurify).
- **Pas de liens vers d'autres `.md` du repo** (`../Tech/...md`) : ils ne fonctionneront pas, l'app gère sa propre navigation. Au lieu de ça : « voir aussi l'analyse Tech du même jour ».

### 6.8 Densité visuelle — listes et tableaux

Le viewer rend ces éléments avec un style serré (gap réduit, line-height 1.6). Pour en tirer parti :

- **Bullets ≤ 5 items** par groupe. Au-delà, fractionner en sous-sections.
- **Tableaux** : 2-4 colonnes max. Le rendu se dégrade sur mobile au-delà.
- **Code inline** abondamment pour : noms de paquets npm, identifiants d'API, versions exactes, commandes CLI. Le viewer les met en `--code-bg` (contraste fort).

### 6.9 Métriques à viser pour un digest "idéal"

Indicateurs vus dans la page `/stats` :

| Métrique | Cible | Comment |
|---|---|---|
| Sujets / digest | 8-12 | 2-3 sujets × 3-4 catégories |
| Sources / sujet | 1 (primaire) + 0-2 (en lien inline) | Une seule ligne `**Source :**` par sujet |
| Catégories couvertes / jour | 3-4 | Maximum 5 — au-delà l'attention décroche |
| Couleur heatmap | Indice 2-3 sur 4 | ~8-15 sujets pour atteindre l'indice 3 |

Si une journée est creuse côté actualité, **mieux vaut moins de sujets mais plus denses** que de gonfler artificiellement.

### 6.10 Modifications a posteriori — règle d'or

Le viewer met en cache au build. Si tu modifies un digest passé :

- **Ne change jamais la date dans le nom du fichier.**
- Tu peux éditer le contenu librement — un rebuild reflète les changements.
- Pour corriger une erreur factuelle majeure : **ajouter un addendum** en bas du fichier dans une section `## Mise à jour <YYYY-MM-DD>` plutôt qu'éditer en silence. La transparence > la propreté.

### 6.11 Indicateur « nouveau »

Le viewer marque comme **nouveau** tout digest dont la date est postérieure à `localStorage.veille-last-seen-date`. Implications :

- Pas besoin de balise particulière dans le markdown — c'est la date du fichier qui pilote.
- Le marqueur est **par utilisateur** (localStorage). Pas de tracking serveur.
- Un user qui ouvre la page le matin verra « +1 » si tu as commité hier soir, à condition que la date dans le nom soit bien `YYYY-MM-DD` du jour de génération (pas du jour précédent).

---

## 7. Checklist du workflow avant commit

```text
[ ] Recap/YYYY-MM-DD_recap.md créé
[ ] Pour chaque thématique active :
    [ ] Categorie/<Cat>/YYYY-MM-DD_synthese.md créé
    [ ] Categorie/<Cat>/YYYY-MM-DD_detail.md créé
[ ] Tous les noms de fichiers matchent /\d{4}-\d{2}-\d{2}_(recap|synthese|detail)\.md/
[ ] Chaque fichier commence par exactement un H1
[ ] Aucun lien relatif vers un autre .md du repo
[ ] UTF-8 sans BOM
[ ] Commit : feat(data): digest YYYY-MM-DD
```

Si toute la checklist passe, le viewer affichera le digest sans intervention manuelle au prochain `npm run build`.
