# order/ — Instructions des routines Claude

Ce dossier versionne les **prompts** des tâches planifiées Claude (Cowork) qui alimentent le dépôt. Chaque fichier = une routine. C'est la **source de vérité** : on édite le prompt ici, puis on le colle dans la tâche planifiée correspondante.

| Fichier | Routine | Cadence | Produit |
|---|---|---|---|
| [`categorie.md`](categorie.md) | Veille par catégorie | Quotidienne (matin) | `report/categorie/<Cat>/YYYY-MM-DD_{synthese,detail}.md` |
| [`weekly.md`](weekly.md) | Rapport hebdomadaire | Hebdomadaire (lundi) | `report/weekly/YYYY-Www_weekly.md` |

## Contrat de format

Toute routine **doit** respecter [`../DIGEST_FORMAT.md`](../DIGEST_FORMAT.md) pour que l'app `web/` indexe et rende correctement les fichiers (regex de date, comptage des sujets/sources, headings, frontmatter optionnel).

## Conventions communes

- **Langue** : français, adresse en « tu » (cf. profil lecteur : dev senior backend C#/.NET, Angular, Symfony, PostgreSQL).
- **Dédup** : un sujet déjà couvert dans les 30 derniers jours est exclu. La mémoire de dédup est tenue par la tâche planifiée.
- **Nommage** : dates en `YYYY-MM-DD` (ISO) ; semaines en `YYYY-Www` (ISO 8601, ex. `2026-W25`).
- **Exemples obligatoires** : chaque sujet (`## N.`) d'un `_detail.md` porte **au minimum un artefact** (jamais zéro) — un diagramme Mermaid **ou** un bloc de code (avant/après si c'est une évolution de code), voire les deux. Max 1 diagramme par sujet. Cf. [`categorie.md`](categorie.md) et `DIGEST_FORMAT.md §3.1`.
- **Commit + push automatiques** : chaque routine `git commit` **et** `git push origin dev` ses fichiers en fin de run (pas de push manuel). Un push sur `dev` déclenche la CI/CD qui déploie **test ET prod** (gate = la CI). Messages : `feat(data): categorie YYYY-MM-DD` / `feat(data): weekly YYYY-Www`.
- **Encodage** : UTF-8 sans BOM. Pas de liens relatifs vers d'autres `.md` du dépôt.
