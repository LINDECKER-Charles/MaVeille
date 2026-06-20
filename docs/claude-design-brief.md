# Veille — Brief de design (handoff pour « Claude Design »)

> **À toi, Claude Design.** Tu vas refondre le front-end de Veille. Ce document décrit **l'expérience entière, l'intention, le contenu, chaque écran et chaque état, les composants, l'IA, l'accessibilité et les données** dont tu disposes. Tu as **toute latitude sur le style visuel** (palette exacte, valeurs en pixels, typo précise, ombres, courbes) — c'est ton métier, pas le mien. Je suis précis sur le **quoi / le comportement / le ressenti**, volontairement souple sur le **comment visuel**.
>
> Les **opinions et recommandations priorisées** (et leur justification) sont dans [`design-analysis.md`](./design-analysis.md). Je n'y reviens pas ; je m'y réfère. Le **contrat de données** fait foi : [`../DIGEST_FORMAT.md`](../DIGEST_FORMAT.md). Contexte technique : [`./architecture-report.md`](./architecture-report.md).
>
> **⚠️ Mise à jour du modèle (post-rédaction).** (1) Le **recap quotidien est supprimé** (→ `archive/`), remplacé par un **rapport hebdomadaire** (`report/weekly/YYYY-Www_weekly.md`). (2) Les rapports **« semestriels » deviennent « hebdomadaires »** : partout, lire *semaine / `:week` / `2026-W25`* au lieu de *semestre / `:semestre` / `2026-S1`*. (3) La page `/digest/:date` n'a **plus d'onglet « Recap global »** — uniquement les onglets de catégories. Le « bloc Aujourd'hui » s'appuie sur les **synthèses du jour** + le **dernier hebdo**. Chemins : `Categorie/` → `report/categorie/`.

---

## 1. Le produit en une phrase

Une **veille tech quotidienne** : chaque matin, des digests markdown en français. L'utilisateur est **un dev senior backend** (C#/.NET, Angular, Symfony, PostgreSQL) qui veut **la journée en moins d'une minute, puis aller en profondeur à la demande**. Tout l'enjeu UX : *trier vite, lire en profondeur quand il choisit*.

**Ressenti cible** : un **briefing matinal** soigné, calme, dense mais respirant — qu'on ouvre avec plaisir le café à la main. Pro, net, jamais « dashboard d'admin », jamais « blog générique ». La couleur sert à **trier** (par catégorie), pas à décorer.

---

## 2. Contraintes (dures — ne pas contourner)

- **SSG statique** : pas de backend, pas de runtime serveur. **Tout est rendu au build.** Toute donnée dérivée (KPIs, stats, index recherche, temps de lecture, highlights de rapport) est calculée au build et livrée statique.
- **Contenu markdown sanitisé** (DOMPurify au build). Pas de HTML arbitraire ni d'images dans les digests (pas d'asset pipeline).
- **UI 100 % française.**
- **Thèmes dark ET light**, à parité (contraste, lisibilité). Bascule instantanée.
- **Angular 20**, SSG (prerender). Charts existants en **SVG sans dépendance** — garde cette approche (perf + KISS), ne tire pas une lib de charting.
- **Pas de tracking serveur.** Tout état utilisateur (thème, densité, « déjà vu », bookmarks) en `localStorage`.

---

## 3. Données dont tu disposes

### 3.1 Structure des digests

Trois types de fichiers par jour (détail exhaustif dans `DIGEST_FORMAT.md`) :

- **`Recap/YYYY-MM-DD_recap.md`** — vue d'ensemble du jour. H1 = titre de la journée. H2 = sections thématiques. Bloc **« À retenir si tu n'as qu'une minute »** (2-4 bullets actionnables). Bloc « Index des analyses détaillées ».
- **`Categorie/<Cat>/YYYY-MM-DD_synthese.md`** — vue condensée d'une catégorie. « Digest court » (1 paragraphe) + « Top N » (bullets, gras sur noms propres). Scannable, c'est la vue par défaut d'une catégorie.
- **`Categorie/<Cat>/YYYY-MM-DD_detail.md`** — analyses approfondies. **Sujets = `## N.` numérotés**. Chaque sujet : chip `**Source :** <nom> — <url>` + `**Date :** …`, puis `### Contexte` / `### Ce qui change concrètement` / `### Pourquoi ça compte pour toi` (+ sections optionnelles). Séparés par `---`.

**Comptages déjà fournis par le build** (regex sur le markdown) :
- Sujets : `/^## \d+\.\s+/gm` → badge « N sujets », heatmap, charts.
- Sources : `/^\*\*Source\s*:\*\*/gm` → KPI sources, bar chart sources.
- Date : `/(\d{4}-\d{2}-\d{2})/` sur le nom de fichier.
- Catégorie : nom du dossier (`Angular`, `CSharp`, `IA`, `Tech`).

**Le premier paragraphe d'un sujet est garanti « punchy »** (contrat §6.3) : utilise-le comme source unique pour previews, snippets de recherche et résumés de carte.

### 3.2 Frontmatter YAML — **optionnelle, tout-ou-rien par fichier**

Peut apparaître ou non en tête d'un digest (`DIGEST_FORMAT §4`). Champs : `tags: [...]`, `importance: high|medium|low`, `sources_count`, `date`, `category`, `type`. **Tu peux et dois t'en servir** quand présente :

- `importance` → badge **« HIGH IMPACT »**, mise en avant, boost recherche.
- `tags` → **filtres** (home, recherche), **scoring** recherche, **détection de highlights** dans les rapports semestriels.
- `sources_count` → KPI fiable.

**Règle absolue** : tout ce qui s'appuie sur la frontmatter doit avoir un **fallback calculé au build** (temps de lecture estimé, comptages regex, highlights par fréquence de titres). L'UI fonctionne **à l'identique sans frontmatter** et s'enrichit progressivement avec. Voir le tableau des métadonnées souhaitées dans `design-analysis.md §10`.

### 3.3 Registre de catégories (extensible)

Source unique de vérité `category → { accent, accentSoft, onAccent, icon, label }`, consommée par badges, onglets, bordures de cartes, points de heatmap, légendes de charts.

- **4 catégories aujourd'hui**, mais **une nouvelle peut apparaître à tout moment**.
- **Dégradation gracieuse obligatoire** : catégorie absente du registre → couleur **déterministe par hash du nom** (teinte HSL stable build-to-build) + icône générique. Le système ne casse jamais.
- Tu définis les **valeurs** d'accent (j'ai des suggestions indicatives dans l'analyse, libre à toi). Contrainte : chaque accent **AA dans les deux thèmes**, et **distinct de l'accent de marque/CTA** (bleu produit) pour ne pas brouiller le code couleur.

---

## 4. Architecture de l'information & navigation

Routes (toutes pré-rendues au build) :

| Route | Écran | Rôle |
|---|---|---|
| `/` | **Home** | Briefing du jour + flux chronologique + recherche |
| `/digest/:date` | **Digest** | Lecture d'un jour : recap + catégories, synthèse/détail |
| `/stats` | **Stats** | Tendances agrégées (KPIs + 4 visualisations) |
| `/rapports` | **Index rapports** | Liste des semaines |
| `/rapports/:week` | **Rapport hebdo** | Rétrospective éditoriale de la semaine (`2026-W25`) |

Navigation persistante : logo/home, lien Stats, lien Rapports, **bascule thème**, (proposé) **toggle densité**. `aria-current` sur l'actif. Breadcrumb sur Digest et Rapport.

---

## 5. Écran par écran — contenu, hiérarchie, comportement, états

> Pour chaque écran : ce qu'il contient, la hiérarchie, et **tous les états** (défaut, vide, chargement, erreur, hover/focus, nouveau-contenu, mobile).

### 5.1 Home `/` — le briefing matinal

**Contenu & hiérarchie (haut → bas) :**
1. **Bloc « Aujourd'hui »** (le livrable « journée en 1 min ») : titre du jour (H1 du recap), les bullets « À retenir si tu n'as qu'une minute » en clair, badges des catégories couvertes (color-codés), CTA « Lire le recap ». C'est l'élément dominant above-the-fold.
2. **KPIs** : digests, sujets analysés, sources citées + **compteur « nouveau depuis ta dernière visite »**. Donne du contexte aux nombres (micro-tendance / delta) — pas des chiffres nus.
3. **Recherche** : champ full-text (cf. §6).
4. **Flux de cartes** reverse-chronologique (historique / rattrapage), groupé visuellement par « nouveaux » en tête.

**Carte de digest** (composant clé) : date + temps relatif, **bordure gauche teintée** par la catégorie dominante (ou multi-segment), badges (Recap + chaque catégorie + « N sujets »), badge importance si frontmatter, résumé tiré du premier paragraphe du recap. État « nouveau » : bordure + dot **+ label texte** « Nouveau ».

**États :**
- *Défaut* : bloc Aujourd'hui rempli + flux.
- *Vide* (aucun digest / premier déploiement) : message de bienvenue expliquant le projet + ce qui arrivera, jamais un blanc.
- *Chargement* : skeletons de cartes seulement si l'index n'est pas instantané ; sinon rien (pas de flicker fabriqué).
- *Erreur* : si l'index recherche échoue, le flux reste lisible, la recherche affiche un état dégradé (« recherche indisponible »).
- *Hover/focus carte* : élévation/bordure renforcée + anneau de focus net ; toute la carte cliquable et tabbable.
- *Nouveau* : compteur **actionnable** (filtre/scroll vers les nouveaux) ; séparateur « N nouveaux ».
- *Mobile* : single column, bloc Aujourd'hui compact, recherche en bouton (pas de raccourci `/`).

### 5.2 Digest `/digest/:date` — lecture à profondeurs

**Contenu & hiérarchie :**
1. Breadcrumb + **titre du jour** (H1 du recap).
2. **Tablist ARIA** : « Recap global » (défaut) + un onglet par catégorie présente ce jour, **color-codés**, navigables aux flèches.
3. Dans un onglet catégorie : **segmented control Synthèse ⇄ Analyse détaillée**.
   - *Synthèse* : rendu condensé scannable (digest court + Top N).
   - *Détail* : **liste de sujets `## N.` repliables**, chacun avec chip source/date, **temps de lecture**, badge importance (si frontmatter), **preview 2 lignes** (1er paragraphe) au repli. Contrôles « tout déplier / tout replier ». **Sommaire « sauter au sujet »** en tête, avec scroll-spy.

**Modèle de profondeur** (cf. `design-analysis §6`) : Recap (≈30 s) → Synthèse (≈2 min) → Détail (deep). **Annonce le coût avant le clic** : « Synthèse · 2 min » / « Détail · 9 min ». Mémorise le dernier mode choisi.

**Chip source/date** : parse `**Source :** <nom> — <url>` et `**Date :**` en un composant chip soigné (domaine/favicon + date), au lieu du rendu verbatim. C'est l'élément de crédibilité.

**États :**
- *Défaut* : onglet Recap actif.
- *Catégorie sans contenu ce jour* : onglet absent (ne pas afficher un onglet vide).
- *Détail sans sujets* (synthèse seule existe) : message + renvoi à la synthèse.
- *Chargement* : contenu pré-rendu → instantané ; pas de spinner.
- *Erreur / date inexistante* : 404 de marque (retour home + dernier digest), pas l'erreur framework.
- *Hover/focus* : onglets et headers de sujets tabbables, focus visible, `aria-expanded` sur les repliables.
- *Nouveau* : marquer « vu » **à l'ouverture de ce digest** (pas au load de la home).
- *Mobile* : onglets en scroll horizontal snap (icône + label actif) ; segmented control pleine largeur ; cibles ≥ 44px.

### 5.3 Stats `/stats` — tendances

**Contenu :** grille de KPIs (digests, sujets, sources, sujets/digest, période) + **4 visualisations SVG** :
- **Heatmap calendaire 26 semaines** (intensité = sujets/jour). Rampe **séquentielle mono-teinte** (daltonisme), légende d'échelle, **tooltip/`title` chiffré** par cellule.
- **Line chart** : sujets par digest dans le temps. Sélecteur de fenêtre (30/90 j/tout) ou agrégation hebdo au-delà d'un seuil.
- **Bar chart** : sujets par catégorie — **accents exacts du registre**.
- **Bar chart** : sources par catégorie — idem.

**Hiérarchie :** titre chaque graphe par la **question** qu'il répond (« Suis-je régulier ? », « Le volume monte-t-il ? », « Où va l'effort ? »). KPIs avec **cible en sous-texte** (référentiel `DIGEST_FORMAT §6.9`) pour transformer le chiffre en feedback.

**États :** *vide* (pas assez de données → « les tendances apparaîtront après quelques jours ») ; *chargement* instantané (build) ; *mobile* charts en pleine largeur, heatmap fenêtre courte ou scroll horizontal, bars verticales.

### 5.4 Rapports `/rapports` et `/rapports/:week` — éditorial

**Index `/rapports`** : liste des semestres (`2026-S1`, …) en cartes-rétrospective ; le semestre courant marqué « en cours / provisoire ».

**Rapport `/rapports/:semestre`** — traitement **publication**, pas liste (largeur de lecture contenue ~65ch, titres généreux, ton bilan) :
1. **En-tête de période** : libellé (S1 2026), plage de dates, totaux (digests / sujets / sources), intro narrative générée.
2. **Distribution par catégorie** : donut ou barres empilées, **color-codées du registre**.
3. **Tendance mensuelle** : volume de sujets/mois (area chart).
4. **Highlights** : sujets récurrents/notables — via `tags` répétés (frontmatter) ou, à défaut, **fréquence des titres H2**. Chaque highlight **lie vers le digest source**.

**États :** *semestre vide* (pas encore de données) ; *semestre futur* → 404/redirection ; *semestre courant* badge « en cours » ; *mobile* charts empilés, lecture confortable. Même registre couleur/icônes que partout (éditorial dans la **forme**, cohérent dans le **système**).

---

## 6. Recherche (transversale)

Base existante : focus `/`, debounce, `?q=` partageable, snippets surlignés sur recaps/synthèses/détails. À pousser :

- **Scoping** : filtres rapides par **catégorie** et par **type** (Recap/Synthèse/Détail).
- **Scoring** : titre H2 > 1er paragraphe > corps ; **boost** sur match `tag` / `importance: high`.
- **Snippet contextualisé** : chaque résultat porte catégorie color-codée + date + type + titre du sujet parent.
- **État vide (avant frappe)** : tags fréquents, recherches récentes (localStorage), raccourci dernier digest.
- **État 0 résultat** : message spécifique + suggestion (« essaie sans le filtre Catégorie »).
- **Clavier complet** : `/` focus, `↑/↓` naviguer, `Enter` ouvrir, `Esc` vider. Pilotable sans souris de bout en bout.

---

## 7. Composants & responsabilités

| Composant | Responsabilité |
|---|---|
| **CategoryBadge / CategoryTab** | Affiche label + icône + accent depuis le registre (fallback hash si inconnu). |
| **DigestCard** | Résume un jour : date, temps relatif, badges, importance, bordure-accent, état nouveau. |
| **TodayBlock** | Briefing du dernier digest (titre + « à retenir » + CTA). |
| **SearchBox + ResultList** | Champ, filtres scope, debounce, `?q=`, nav clavier, snippets contextualisés, états vide/0. |
| **Tablist** | Onglets catégories ARIA (flèches, `aria-selected`, color-codés). |
| **DepthToggle** | Segmented Synthèse/Détail, persistant. |
| **SubjectList / SubjectItem** | Sujets repliables : chip source/date, temps de lecture, importance, preview, `aria-expanded`. |
| **SubjectTOC** | Sommaire « sauter au sujet » + scroll-spy. |
| **SourceChip** | Parse `**Source :** … — url` + `**Date :**` en chip crédibilité. |
| **Heatmap / LineChart / BarChart** | SVG sans dépendance, accents registre, tooltips chiffrés, légendes, responsive. |
| **KpiCard** | Nombre + libellé + contexte (cible/tendance). |
| **ReportHeader / Highlights / Distribution** | Briques éditoriales du rapport semestriel. |
| **ThemeToggle / DensityToggle** | État persistant localStorage. |
| **EmptyState / ErrorState / Skeleton** | États systématiques, jamais un blanc. |

---

## 8. Opportunités UX & métriques utilisateur — **liberté d'implémentation**

Tu es **libre** d'implémenter celles qui servent le ressenti « briefing soigné ». Suggestions (non exhaustives) :

- **Temps de lecture estimé** par onglet/sujet (build, ≈200 mots/min) — fort ROI, peu coûteux.
- **« Sauter à la catégorie » / « sauter au sujet »** + scroll-spy.
- **Navigation clavier de bout en bout** (recherche, onglets, sujets).
- **« Ce qui a changé depuis ta dernière visite »** : compteur actionnable + marquage « vu » à l'ouverture d'un digest (pas au load home).
- **Digests sauvegardés / bookmarkés** (localStorage) + une vue « à lire plus tard ».
- **Partage** (lien `?q=` déjà partageable ; lien profond vers un sujet `#sujet-N`).
- **RSS / export** du flux quotidien (généré au build).
- **Toggle densité** (Confort/Compact) persistant.
- **Persistance** du mode profondeur (Synthèse/Détail) et du thème.
- **Highlights semestriels** dérivés des tags/titres.

Si une idée nécessite une donnée absente, prévois le **fallback build** (cf. §3.2).

---

## 9. Accessibilité (exigences — non négociables)

- **Contraste AA** (4.5:1 texte, 3:1 UI/graphes) dans **les deux thèmes**, pour **chaque accent catégorie** et chaque rôle (texte/bordure/aplat).
- **Couleur jamais porteur unique** : catégorie = couleur **+** icône **+** label ; « nouveau » = bordure **+** texte ; importance = couleur **+** mot.
- **Focus visible** et homogène (`:focus-visible`), jamais supprimé.
- **Clavier complet** : tablist (flèches + `aria-selected`/`aria-current`), recherche, sommaire, repliables (`aria-expanded`).
- **`prefers-reduced-motion`** respecté : transitions réduites au fondu/instantané.
- **Lecteurs d'écran** : `<title>` par route, landmarks, annonces live discrètes (« N résultats », changement d'onglet). Headings markdown non sautés (garanti par le contrat).
- **Cible Lighthouse a11y : 100/100.** Le repo prévoit des tests a11y/Lighthouse — la refonte doit les passer au vert.

---

## 10. Motion & performance

- **Motion utile uniquement** : repli/dépli (150-200 ms ease-out), bascule profondeur, feedback hover/focus discret. Pas de chart qui « se construit » au scroll (au plus un fondu). Respect strict de `reduced-motion`.
- **Tout pré-rendu au build** : home, chaque digest, stats, chaque rapport. Pas de rendu markdown client au runtime.
- **Index recherche léger** en JSON statique (titres + 1ers paragraphes + tags, pas le corps intégral). Prévoir compression/pagination si le volume grimpe (~5 fichiers/j).
- **Charts SVG sans dépendance** (garder). **Couleurs en CSS variables** (theming + accents zéro coût runtime). **Pas d'images raster** (icônes SVG inline/sprite).

---

## 11. Checklist d'acceptation

- [ ] **Home** ouvre sur un vrai **briefing** (« à retenir » du jour visible above-the-fold), pas un simple annuaire.
- [ ] Toute **catégorie** est color-codée (badge + onglet + bordure + chart) via un **registre unique**, avec **fallback déterministe** pour une catégorie inconnue.
- [ ] Le **modèle de profondeur** (Recap → Synthèse → Détail) est lisible, avec **temps de lecture** annoncé et **importance** visible au repli.
- [ ] **Recherche** : scope catégorie/type, scoring (boost tags/importance), snippets contextualisés, états vide/0, clavier complet (`/ ↑ ↓ Enter Esc`).
- [ ] Mécanique **« nouveau »** actionnable, marquage « vu » **à l'ouverture du digest**, label texte (jamais couleur seule).
- [ ] **Rapports semestriels** au traitement **éditorial** (en-tête période, distribution, tendance mensuelle, highlights liés aux sources).
- [ ] **Stats** lisibles : titres « question », légendes/tooltips chiffrés, accents registre, responsive.
- [ ] **Tous les états** présents par écran : défaut, vide, chargement, erreur, hover/focus, nouveau, mobile.
- [ ] La **frontmatter optionnelle** est exploitée quand présente et l'UI fonctionne **à l'identique sans elle** (fallbacks build).
- [ ] **A11y** : AA × 2 thèmes, focus visible, clavier complet, `reduced-motion`, lecteurs d'écran, Lighthouse a11y 100.
- [ ] **Perf** : tout pré-rendu, index léger, SVG sans dépendance, CSS variables, pas de raster.
- [ ] **Dark/light** à parité, **UI 100 % française**, contenu **sanitisé** au build.
- [ ] Cohérence : même registre couleur/icônes et même système typographique sur **tous** les écrans.

---

*Latitude visuelle pleine et entière sur palette, typo, valeurs, ombres, courbes. Précision attendue sur contenu, hiérarchie, comportement, accessibilité et données. Pour le « pourquoi » et les arbitrages priorisés : [`design-analysis.md`](./design-analysis.md).*
