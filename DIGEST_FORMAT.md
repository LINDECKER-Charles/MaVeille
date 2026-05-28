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

## 6. Checklist du workflow avant commit

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
