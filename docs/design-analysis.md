# Veille — Analyse UX/UI & recommandations de refonte

> Document d'opinion. Objectif : rendre le site **attractif ET ergonomique** pour un dev senior backend qui veut « la journée en < 1 min, puis la profondeur à la demande ».
> Le **quoi faire / quel ressenti** (handoff exécutable) vit dans [`claude-design-brief.md`](./claude-design-brief.md). Ici : le **pourquoi**, les opinions, les priorités. On évite de redire le brief — on s'y réfère.

Contraintes structurantes (héritées de [`../DIGEST_FORMAT.md`](../DIGEST_FORMAT.md) et [`./architecture-report.md`](./architecture-report.md)) : SSG statique (tout rendu au build, pas de backend), contenu markdown sanitisé, thèmes dark/light, UI française, ~5 fichiers/jour, 4 catégories aujourd'hui (`Angular`, `CSharp`, `IA`, `Tech`) mais **extensibles**.

> **⚠️ Mise à jour du modèle (post-rédaction).** Le modèle de contenu a évolué après l'écriture de ce doc : (1) le **recap quotidien est supprimé** (déplacé dans `archive/`) et remplacé par un **rapport hebdomadaire** (`report/weekly/`) ; (2) les rapports **« semestriels » deviennent « hebdomadaires »** — partout où on lit *semestre / semestriel / `:semestre` / `2026-S1`*, lire *semaine / hebdomadaire / `:week` / `2026-W25`* ; (3) chemins : `Categorie/` → `report/categorie/`. Le « bloc Aujourd'hui / briefing matinal » reste pertinent mais s'appuie désormais sur les **synthèses de catégorie du jour** + le **dernier rapport hebdo** (plus sur un recap quotidien). Le reste des recommandations tient.

---

## 0. TL;DR — les 4 moves à fort impact

1. **Catégoriser par la couleur partout** : un registre `category → {accent, icône, label}` qui pilote badges, onglets, bordures de cartes, légendes de charts. C'est le levier n°1 de scanabilité et ça absorbe l'extensibilité gratuitement (fallback déterministe par hash pour catégorie inconnue).
2. **Home = briefing matinal, pas annuaire** : le digest du jour en **bloc éditorial** (le « À retenir si tu n'as qu'une minute » du recap remonté en clair), puis le flux de cartes. On répond au besoin « la journée en 1 min » dès le above-the-fold.
3. **Modèle de lecture à 3 profondeurs explicite** : Recap (30 s) → Synthèse (2 min) → Détail (deep). Le switch Synthèse/Détail et les sujets repliables existent déjà ; il faut les rendre **lisibles d'un coup d'œil** (importance, temps de lecture, ancrage par sujet).
4. **Exploiter la frontmatter optionnelle** comme couche de signal : `importance` → badge « HIGH IMPACT » + tri, `tags` → filtres + scoring recherche. Dégradation propre quand absente (cf. §10).

Priorisation transversale : items notés **[QW]** = quick win (CSS/markup, < 1 j), **[D]** = changement plus profond (modèle de données, composant, build).

---

## 1. Hiérarchie de l'information & scanabilité

Le besoin réel n'est pas « lire » mais **trier** : décider en quelques secondes quels sujets méritent un détail. L'UI doit donc maximiser le **rapport signal/encre**.

- **Une seule action dominante par écran.** Home : « ouvrir le digest du jour ». Digest : « basculer entre catégories / profondeurs ». Stats : « lire une tendance ». Tout le reste est secondaire et doit visuellement reculer.
- **Densité réglable [D]** : le dev pressé veut dense, le lecteur du soir veut aéré. Un toggle densité (Confort/Compact) qui agit sur `line-height`, `--space` et le padding des cartes. Persisté en `localStorage`. Peu coûteux, gros confort.
- **Numérotation des sujets = ancres de navigation.** Les `## N.` du détail sont déjà comptés (badge « N sujets »). Il faut les transformer en **points d'entrée** : un mini-sommaire « sauter au sujet » en tête de l'onglet détail, chaque entrée cliquable, état actif au scroll (scroll-spy). C'est ce qui rend la profondeur *navigable* plutôt que *subie*.
- **Punch en tête.** Le format impose déjà « premier paragraphe punchy » (cf. `DIGEST_FORMAT §6.3`). L'UI doit le respecter : la preview repliée d'un sujet, le snippet de recherche et le résumé de carte tirent tous du **même premier paragraphe**. Cohérence = confiance.

---

## 2. Home — le « briefing matinal »

Aujourd'hui : hero 3 KPIs + compteur « nouveau » + recherche + flux de cartes. C'est correct mais **froid** : ça ressemble à un dashboard d'admin, pas à une lecture qu'on a envie d'ouvrir le café à la main.

**Recommandations :**

- **Bloc « Aujourd'hui » distinct du flux [D].** Au-dessus de la liste, un panneau dédié au dernier digest : titre du jour (H1 du recap), les 2-4 bullets du « À retenir si tu n'as qu'une minute » rendus en clair, les badges de catégories couvertes, et un CTA « Lire le recap ». C'est *le* livrable du besoin « la journée en 1 min ». Le flux chronologique en dessous sert l'historique/rattrapage.
- **KPIs : du décor à l'information [QW].** Trois nombres bruts (digests, sujets, sources) sont peu actionnables. Mieux : ajouter une **micro-tendance** (sparkline 7 j ou delta « +3 vs hier ») pour que le KPI raconte quelque chose. Sinon ils décorent sans informer.
- **Compteur « nouveau » → rappel d'état, pas gadget [QW].** « +4 depuis ta dernière visite » doit être cliquable et **scroller/filtrer** vers les nouveaux. Un compteur qu'on ne peut pas actionner est frustrant.
- **Cartes : la couleur fait le tri [QW].** Bordure gauche teintée par la catégorie **dominante** du jour (ou multi-segment si plusieurs), badges catégorie color-codés, badge importance si frontmatter. La carte « nouveau » garde sa bordure + dot mais on lui ajoute un libellé texte (« Nouveau ») pour l'accessibilité (la couleur seule ne suffit pas).

---

## 3. Color-coding des catégories

C'est le système qui porte le plus de poids visuel. Il doit être **un vrai design token system**, pas des couleurs en dur dispersées.

- **Registre central [D]** : `Map<category, {accent, accentSoft, fg, icon, label}>`. Une seule source de vérité consommée par badges, onglets, bordures, points de heatmap, légendes de charts. C'est aussi le point de l'architecture-report (logique données à découpler) : le registre est une donnée pure, parfait pour le build.
- **Accents proposés** (indicatifs, Claude Design a la main — cf. brief) : Angular → rouge/corail, CSharp → violet, IA → émeraude/teal, Tech → ambre/slate. Chaque accent décliné en **3 rôles** : `accent` (texte/bordure sur fond neutre), `accent-soft` (fond de badge), `on-accent` (texte sur aplat). Validés AA dans les deux thèmes.
- **Catégorie inconnue = dégradation déterministe [D].** Hash du nom → teinte HSL stable (`hue = hash % 360`, S/L fixés par thème). Garantit une couleur cohérente d'un build à l'autre sans toucher au registre. + icône générique (tag/hashtag). Le système ne casse jamais quand une 5e catégorie apparaît.
- **Iconographie** : un jeu cohérent (Lucide-style, stroke 1.5–2). Une icône par catégorie aide le scan plus vite que le texte seul, surtout sur mobile où les onglets se réduisent à l'icône.
- **Garde-fou daltonisme** : la couleur **double** toujours une info portée autrement (label texte, icône, position). Jamais la couleur seule comme porteur unique.

---

## 4. Recherche

Bonne base (focus `/`, debounce, `?q=` partageable, snippets surlignés). Manques côté **pertinence** et **dépassement de portée**.

- **Scoping [D]** : filtres rapides par catégorie et par type (Recap/Synthèse/Détail) à côté du champ. Réduit le bruit quand on cherche « signals » sans vouloir 40 hits.
- **Scoring exploitant la frontmatter [D]** : pondérer titre H2 > premier paragraphe > corps, et **booster** sur match de `tag` ou `importance: high`. Aujourd'hui l'index traite chaque ligne à plat (cf. `architecture-report` : indexation par ligne) — un scoring même simple change radicalement le ressenti.
- **Recherche vide = découverte, pas trou noir [QW]** : avant frappe, proposer tags fréquents, recherches récentes (localStorage), et raccourci vers le dernier digest. Un champ vide doit *inviter*.
- **Snippet = contexte, pas juste surlignage [QW]** : afficher la catégorie color-codée + date + type sur chaque résultat, et le titre du sujet parent. On veut savoir *où* on atterrit avant de cliquer.
- **Clavier complet [D]** : `↑/↓` pour naviguer les résultats, `Enter` pour ouvrir, `Esc` pour vider. La recherche au clavier est le cas d'usage du dev — elle doit être pilotable sans souris de bout en bout.

---

## 5. Mécanique « nouveau »

Solide conceptuellement (date de fichier vs `localStorage.veille-last-seen-date`, par utilisateur, pas de serveur — cf. `DIGEST_FORMAT §6.11`). Le défaut est qu'elle est **passive**.

- **Rendre l'état exploitable [QW]** : le compteur du hero filtre/scrolle vers les nouveaux ; les cartes nouvelles sont groupables (« 4 nouveaux » comme séparateur dans le flux).
- **Marquer « vu » au bon moment [D]** : mettre à jour `last-seen` à l'**ouverture d'un digest**, pas au simple load de la home — sinon on « consomme » le badge sans avoir rien lu. Subtil mais c'est la différence entre un signal fiable et un signal menteur.
- **Granularité sujet (optionnel) [D]** : à terme, marquer les *sujets* lus dans un digest déjà ouvert. Utile pour le rattrapage sur plusieurs jours. Plus coûteux, à mettre en backlog.
- **Accessibilité** : « nouveau » ne doit jamais être *que* la bordure colorée — toujours un label texte + `aria`.

---

## 6. Modèle de profondeur de lecture (Synthèse / Détail / snippets)

C'est le cœur produit. La structure existe (tablist catégories, toggle Synthèse⇄Détail, sujets repliables avec preview 2 lignes, tout déplier/replier). À **rendre lisible et orientant**.

- **Annoncer le coût avant le clic [QW/D]** : temps de lecture estimé par onglet/sujet (≈ 200 mots/min, calculé au build). « Synthèse · 2 min » vs « Détail · 9 min » oriente la décision *avant* l'effort. Trivial à calculer, fort en valeur.
- **Importance visible au repli [D]** : si frontmatter, badge `HIGH IMPACT` sur le sujet replié. Le dev déplie d'abord ce qui compte.
- **Preview = vrai résumé [QW]** : la preview 2 lignes doit venir du premier paragraphe (déjà punchy par contrat), pas d'un strip brut qui couperait au milieu d'un « **Source :** ». Strip propre des chips meta avant la preview.
- **Meta-chip source/date soignée [QW]** : la ligne `**Source :** … — url` est aujourd'hui rendue verbatim. La parser en **chip** (favicon/domaine + date) en tête de sujet : c'est l'élément de crédibilité, il mérite un traitement. Le format réserve déjà ce pattern à une « future itération d'extraction » — c'est le moment.
- **Persistance de profondeur [QW]** : se souvenir du dernier mode (Synthèse/Détail) choisi. Un habitué du détail ne veut pas re-cliquer chaque jour.

---

## 7. Rapports hebdomadaires (`/rapports`, `/rapports/:week`)

Nouveau, et **délibérément éditorial** — l'inverse du flux quotidien. C'est une rétrospective qu'on lit, pas qu'on scanne.

- **Traitement « publication », pas « liste » [D]** : largeur de lecture contenue (~65ch), titres généreux, intro narrative générée (totaux période, ton bilan). Doit *sentir* le rapport.
- **Structure recommandée** : (a) **En-tête de période** (S1 2026, plage de dates, totaux digests/sujets/sources) ; (b) **Distribution par catégorie** (donut ou barres empilées, color-codées du registre) ; (c) **Tendance mensuelle** (volume de sujets/mois, area chart) ; (d) **Highlights** : sujets récurrents/notables — détectables via `tags` répétés ou clustering simple de titres ; (e) **Lien vers les digests sources** des highlights.
- **Highlights = le vrai apport [D]** : la valeur d'un rapport semestriel n'est pas l'agrégat de chiffres (le dashboard stats le fait), c'est « **qu'est-ce qui a compté ce semestre** ». Sans frontmatter `tags`, fallback sur fréquence de mots-clés des titres H2. Avec `tags`, beaucoup plus net.
- **Cohérence visuelle** : même registre de couleurs et même iconographie que partout — le rapport est éditorial *dans la forme*, pas dépaysant dans le système.
- **Génération** : pré-rendu au build pour chaque semestre clos ; le semestre courant en « provisoire » (badge « en cours »).

---

## 8. Lisibilité des stats (`/stats`)

Bonne matière (KPI grid, heatmap 26 sem, line chart, 2 bar charts, SVG sans dépendance — un atout perf à garder). Le risque : **chart soup** illisible.

- **Une question par graphe [QW]** : titrer chaque chart par la **question** qu'il répond (« Suis-je régulier ? » → heatmap ; « Le volume monte-t-il ? » → line ; « Où va l'effort ? » → bars). Le titre descriptif vaut mieux qu'un libellé technique.
- **Heatmap = couleur + valeur accessible [QW]** : l'intensité couleur doit être doublée d'un `title`/tooltip chiffré et d'une légende d'échelle. Pour les daltoniens, préférer une rampe **séquentielle mono-teinte** (clair→accent) plutôt qu'un dégradé multi-couleurs.
- **Légendes color-codées du registre [QW]** : le bar chart « par catégorie » doit utiliser **exactement** les accents catégorie — cohérence cross-page. La légende relie couleur↔catégorie explicitement.
- **Cap de densité [D]** : sur 6+ mois la line chart se tasse. Prévoir un sélecteur de fenêtre (30 j / 90 j / tout) ou une agrégation hebdo au-delà d'un seuil.
- **KPIs avec contexte [QW]** : « 2,3 sujets/digest » seul ne dit rien ; ajouter la cible (`DIGEST_FORMAT §6.9` vise 8-12 sujets/jour) en sous-texte transforme le chiffre en feedback.

---

## 9. États vides / chargement / erreur

SSG → la plupart du contenu est pré-rendu, donc **peu de vrais états de chargement**. Mais les cas limites existent et sont souvent négligés.

- **Vide** : jour sans digest, catégorie absente un jour donné, recherche 0 résultat, premier déploiement. Chaque cas mérite un message **spécifique + action** (« Aucun résultat pour `xyz` — essaie sans le filtre Catégorie »), jamais un blanc.
- **Chargement** : seul l'index recherche / hydratation peut induire un délai. Skeletons sobres sur les cartes plutôt qu'un spinner. Pas de skeleton si le rendu est instantané (ne pas fabriquer du flicker).
- **Erreur** : route `/digest/:date` inexistante, semestre futur, contenu sanitisé vide. Page 404 *de marque* (cohérente, avec retour home + dernier digest), pas l'erreur framework brute.
- **Principe** : un état vide bien écrit est un **moment de marque** gratuit. C'est là qu'on voit le soin.

---

## 10. Frontmatter — ce que je voudrais voir

La frontmatter est **tout-ou-rien par fichier** (`DIGEST_FORMAT §4`). L'UI doit donc fonctionner **identiquement sans elle**, et s'enrichir **progressivement** avec.

Métadonnées souhaitées, par ordre de ROI UI :

| Champ | Usage UI | Sans le champ (fallback) |
|---|---|---|
| `importance: high\|medium\|low` | Badge « HIGH IMPACT », tri/highlight, boost recherche | Pas de badge ; tri chronologique pur |
| `tags: [...]` | Filtres home, scoring recherche, détection highlights semestriels | Filtres masqués ; highlights via fréquence de titres |
| `sources_count` | KPI fiable sans re-parsing | Comptage par regex `**Source :**` (déjà en place) |
| `reading_time` (proposé) | Affichage direct sans estimation | Estimation au build (mots/200) |
| `subjects_count` (proposé) | Badge carte fiable | Comptage `## N.` (déjà en place) |

**Principe directeur** : la frontmatter est une **couche de confiance/précision**, jamais une dépendance dure. Tout ce qui s'en sert doit avoir un fallback calculé au build. C'est ce qui permet au workflow de l'adopter graduellement sans casser l'UI.

---

## 11. Mobile / responsive

Le dev consulte aussi sur téléphone (lecture du matin). Priorité **lecture confortable**, pas réplication desktop.

- **Onglets catégories** : au-delà de 3-4, scroll horizontal avec snap, ou réduction à l'icône color-codée + label actif visible. Jamais de wrap qui casse la tablist ARIA.
- **Toggle Synthèse/Détail** : reste un segmented control plein largeur, pouce-friendly (cible ≥ 44px).
- **Recherche** : champ pleine largeur, clavier `/` non pertinent sur mobile — bouton recherche explicite à la place.
- **Charts** : la heatmap 26 sem ne tient pas ; passer à une fenêtre plus courte ou scroll horizontal. Les bars en vertical mobile.
- **Cartes** : single column, bordure couleur conservée (porteur de tri principal).

---

## 12. Accessibilité

Audience pro, attentes hautes, et le format/architecture montrent déjà une sensibilité a11y (`.visually-hidden`, tablist ARIA). À tenir comme **contrainte dure**, pas option (cf. critères du brief).

- **Contraste** : AA (4.5:1 texte, 3:1 UI/graph) dans **les deux thèmes** pour chaque accent catégorie. Le violet/émeraude foncés sur fond sombre sont les pièges classiques — valider chaque rôle de couleur.
- **Couleur jamais seule** : catégorie = couleur **+** icône **+** label ; « nouveau » = bordure **+** texte ; importance = couleur **+** mot.
- **Focus** : anneau de focus visible et homogène partout (`:focus-visible`), jamais supprimé. La nav clavier (tablist flèches, recherche, sommaire sujets) doit être complète et testable.
- **Reduced-motion** : `prefers-reduced-motion` respecté — toutes les transitions §13 deviennent instantanées ou de simple fondu.
- **Lecteurs d'écran** : titres de page corrects (`<title>` par route), landmarks, `aria-current` sur la nav, annonces live discrètes pour « X résultats » et changement d'onglet. Headings markdown non sautés (déjà imposé par le format).
- **Cible** : viser 100/100 Lighthouse a11y (le repo prévoit déjà des tests a11y/Lighthouse — c'est l'occasion de les rendre verts dès la refonte).

---

## 13. Micro-interactions & motion

Le motion doit **servir la compréhension** (continuité, feedback), jamais décorer. Audience senior : la moindre animation gratuite agace.

- **Transitions de contenu** : repli/dépli des sujets et bascule Synthèse/Détail en hauteur animée courte (150-200 ms, ease-out). C'est le seul motion vraiment « utile » du site.
- **Feedback discret** : hover de carte = élévation/translation légère (2-4px) + renforcement de la bordure couleur. Focus = anneau net. Rien de bondissant.
- **Pas de motion sur les charts au scroll** (effet « dashboard qui se construit ») au-delà d'un fondu unique — ça vieillit vite et ralentit la lecture répétée quotidienne.
- **Respect strict de `reduced-motion`** (cf. §12).

---

## 14. Performance

SSG pré-rendu = excellent point de départ. À **ne pas gâcher**.

- **Pré-rendre toutes les routes connues** : home, chaque `/digest/:date`, `/stats`, chaque `/rapports/:semestre`. Le SSG le permet, profitons-en : pas de rendu client du markdown au runtime.
- **Index recherche** : construit au build, livré en JSON statique. Garder l'index **léger** (titres + premiers paragraphes + tags, pas le corps intégral) pour ne pas plomber le first load. Croissance ~5 fichiers/j → prévoir compression / pagination de l'index si le volume grimpe.
- **Charts SVG sans dépendance** : à conserver tel quel (cf. `architecture-report §5` — atout KISS). Pas d'import d'une lib de charting pour 3 graphes.
- **Couleurs en CSS variables** : le thème et les accents catégorie en variables → zéro coût runtime de theming, switch dark/light instantané.
- **Images** : le format interdit déjà les images dans les digests (pas d'asset pipeline) — l'UI reste donc légère par construction. Garder cette discipline (icônes en SVG inline/sprite, pas de raster).

---

## 15. Direction visuelle proposée (indicative)

> Claude Design garde la main fine (cf. brief). Ce qui suit est une **intention**, pas une spec pixel.

- **Typo** : pairing sobre — une sans-serif géométrique lisible pour le corps (Inter / Geist), une variante à fort caractère pour les titres de page et l'éditorial des rapports (un grotesque type Söhne/General Sans, ou la même famille en weights tranchés pour rester léger). Mono (JetBrains Mono / Geist Mono) pour `code inline` — abondant dans les digests.
- **Couleur** : base neutre froide (slate) en dark, blanc cassé légèrement chaud en light pour le confort de lecture longue. Accent produit bleu (existant, à garder comme couleur de marque/CTA), **distinct** des accents catégorie pour ne pas brouiller le code couleur.
- **Rythme** : échelle d'espacement modulaire (4/8 px base), largeur de lecture ~65ch sur le texte long (détails, rapports), cartes sur grille fluide.
- **Cartes & charts** : surfaces à élévation faible, coins doux, bordure 1px + bordure-accent gauche porteuse de la catégorie. Charts épurés (pas de gridline lourde, labels directs plutôt que légende détachée quand possible).
- **Iconographie** : un seul jeu cohérent, stroke uniforme, une icône par catégorie + jeu utilitaire (recherche, calendrier, source, importance).

---

## 16. Backlog priorisé

| # | Action | Type | Impact | Effort |
|---|---|---|---|---|
| 1 | Registre catégories (couleur/icône/label + fallback hash) | [D] | Élevé | Moyen |
| 2 | Bloc « Aujourd'hui » en home (briefing) | [D] | Élevé | Moyen |
| 3 | Temps de lecture + importance au repli des sujets | [D] | Élevé | Faible |
| 4 | Compteur « nouveau » actionnable + marquage « vu » à l'ouverture | [QW] | Moyen | Faible |
| 5 | Chips source/date parsées depuis le markdown | [QW] | Moyen | Faible |
| 6 | Scoping + scoring recherche (frontmatter) | [D] | Élevé | Moyen |
| 7 | Rapports semestriels (éditorial + highlights) | [D] | Élevé | Élevé |
| 8 | Titres « question » + tooltips chiffrés sur stats | [QW] | Moyen | Faible |
| 9 | Toggle densité + persistance profondeur/mode | [QW] | Moyen | Faible |
| 10 | États vides/erreur de marque | [QW] | Moyen | Faible |
| 11 | Sommaire « sauter au sujet » + scroll-spy | [D] | Moyen | Moyen |
| 12 | Audit contraste accents × 2 thèmes + reduced-motion | [QW] | Élevé (a11y) | Faible |

Ordre d'attaque conseillé : **1 → 2 → 3 → 4/5 → 12**, puis 6/7 comme chantiers profonds.
