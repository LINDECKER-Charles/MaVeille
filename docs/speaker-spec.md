# Veille Speaker — Spécification technique

> Lecteur vocal local pour tes veilles. Un modèle de synthèse vocale (TTS) tourne **sur ton PC** (GPU NVIDIA), lit les rapports markdown du dépôt et te les restitue à la voix, via une interface web **minimaliste et séparée** de l'app Angular.

Ce document est le **contrat d'implémentation** destiné à Claude Code. Il décrit quoi construire, comment, et comment vérifier que c'est bon. Il ne remplace pas le code : il le cadre.

---

## 1. Objectif & principe

Le problème : la synthèse vocale du navigateur (`SpeechSynthesis` / Web Speech API) est robotique et désagréable. On veut une voix **naturelle**, en **français**, générée par un modèle IA local, sans dépendre du cloud.

Le principe :

```
report/**/*.md  ──►  normaliseur (md → texte parlé)  ──►  moteur TTS local  ──►  audio
   (contenu déjà              (cœur qualité)              (Kokoro, GPU)         (stream + MP3)
    produit par tes
    routines Claude)
                                        ▲
                              interface web minimaliste
                            (choisir la veille, écouter)
```

Ce projet **consomme** le même contenu que l'app Angular (`report/`) mais reste **totalement indépendant** : autre process, autre port, autre stack. Aucune modification de `web/`.

### Ce que c'est
- Un sous-projet local dans `speaker/` qui scanne `../report/`, nettoie le markdown pour la voix, synthétise en local et sert une petite UI de lecture.
- Streaming à la demande **et** export/cache MP3 (écoute hors-ligne / mobile).

### Ce que ce n'est pas
- Pas un service cloud, pas de compte, pas d'auth (localhost, mono-utilisateur).
- Pas une modification de l'app Angular ni du pipeline `build-data.mjs`.
- Pas un générateur de contenu : il lit ce qui existe déjà dans `report/`.

---

## 2. Contexte & contraintes

| Contrainte | Détail |
|---|---|
| **Source de contenu** | Les fichiers markdown de `report/` (voir §6). Format figé par `DIGEST_FORMAT.md`. |
| **Emplacement** | Sous-dossier `Veille/speaker/` (même dépôt Git, chemins relatifs vers `../report`). |
| **OS** | Windows (poste de dev, disque `F:`). Lanceur `.cmd` attendu, cf. `veille.cmd` existant. |
| **Matériel** | GPU **NVIDIA** disponible → moteur neuronal en temps réel. |
| **Réseau** | 100 % local. Le moteur TTS ne doit **jamais** appeler d'API externe à l'inférence. |
| **Langue** | Français (contenu technique : anglicismes, sigles, versions, CVE, code). |
| **Priorité voix** | Équilibre qualité / légèreté / temps réel. |
| **Modes d'écoute** | Les deux : streaming immédiat au clic **+** MP3 pré-généré téléchargeable. |

---

## 3. Décisions techniques

### 3.1 Moteur TTS — Kokoro-82M (principal), Piper (repli)

| Moteur | Rôle | Pourquoi |
|---|---|---|
| **Kokoro-82M** | **Principal** | Meilleur rapport qualité/poids en 2026 : 82 M params, Apache 2.0, voix très naturelle, **90–210× temps réel sur GPU NVIDIA** (RTX 3090/4090), français supporté (EU + CA). Servi via un serveur OpenAI-compatible prêt à l'emploi. |
| **Piper** | **Repli / CPU** | MIT, ultra-léger, temps réel sur CPU seul. Plus de voix FR (dont une **voix masculine** `fr_FR-tom`). Qualité correcte mais plus synthétique. Utile si le GPU est indisponible ou pour comparer. |

> **Voix FR Kokoro** : la voix française principale est **`ff_siwis`** (féminine, EU). L'inventaire FR de Kokoro est restreint (≈ 1 voix) — si tu veux une voix masculine ou plus de choix, bascule le moteur sur Piper (`fr_FR-tom-medium`, `fr_FR-siwis-medium`). L'architecture doit rendre le moteur **interchangeable** (interface commune, cf. §9).

Écartés : **XTTS-v2 / F5-TTS** (clonage de voix, mais 4–6 Go VRAM, plus lourds, licences restrictives) — surdimensionnés pour un usage « équilibre ». À réévaluer seulement si tu veux plus tard cloner une voix précise (hors périmètre v1).

### 3.2 Backend — Python + FastAPI

L'écosystème TTS est Python ; le nettoyage markdown→voix profite des libs Python (`markdown-it-py`, `PyYAML`). Un backend **FastAPI** orchestre : scan des rapports, normalisation, appel TTS, cache, streaming, et sert le frontend statique. `uvicorn` comme serveur ASGI.

> Alternative Node/TypeScript (stack familière) possible mais non retenue : elle imposerait de piloter le TTS via HTTP de toute façon, sans gagner en simplicité. On reste sur Python.

### 3.3 Frontend — HTML/CSS/JS minimaliste, sans build

Une page unique servie par le backend : liste des veilles + lecteur audio. **Vanilla JS** (ou petite lib type Lit/Alpine via CDN si besoin de structure), zéro build par défaut. Thème sombre cohérent avec Veille (accent indigo `#6366f1`). Objectif : **minimaliste**, rapide, pas un second projet Angular.

### 3.4 Empaquetage — Docker Compose + lanceur `.cmd`

Deux services : `kokoro` (le moteur) et `speaker` (le backend). Un `docker-compose.yml` orchestre. Un `speaker.cmd` à la racine du sous-projet démarre tout. Mode « natif » (sans Docker, Python + venv) documenté en repli.

---

## 4. Architecture

### 4.1 Composants

```
┌──────────────────────────────────────────────────────────────────┐
│  Navigateur (localhost)                                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  UI minimaliste :  liste des veilles  +  lecteur audio      │  │
│  └───────────────┬───────────────────────────▲────────────────┘  │
└──────────────────┼───────────────────────────┼───────────────────┘
                   │ GET /api/veilles           │ audio/mpeg (stream)
                   │ GET /api/veilles/{id}/audio │
                   ▼                             │
┌──────────────────────────────────────────────────────────────────┐
│  Backend « speaker » (FastAPI, port 8830)                        │
│                                                                    │
│  reports.py     normalizer.py      tts_client.py      cache.py    │
│  scan report/ → md → texte parlé → appel moteur TTS → cache MP3    │
│                                         │                          │
└─────────────────────────────────────────┼─────────────────────────┘
                                           │ POST /v1/audio/speech
                                           ▼  (OpenAI-compatible)
┌──────────────────────────────────────────────────────────────────┐
│  Moteur TTS — Kokoro-FastAPI (port 8880, GPU NVIDIA)             │
│  Kokoro-82M · voix ff_siwis · streaming · auto-stitching          │
└──────────────────────────────────────────────────────────────────┘
                                           ▲
                                           │ (repli)
                                    Piper (CPU, local)
```

### 4.2 Flux — streaming à la demande

1. L'UI liste les veilles (`GET /api/veilles`).
2. Clic → `GET /api/veilles/{id}/audio?voice=ff_siwis&speed=1.0`.
3. Le backend charge le `.md`, le passe au **normaliseur** → texte parlé + découpage en phrases.
4. Pour chaque segment, appel **streaming** au moteur TTS ; les octets audio sont relayés au fur et à mesure vers l'UI (`audio/mpeg`, transfer-encoding chunked).
5. En parallèle, le backend **assemble et met en cache** le MP3 complet (clé = hash du texte normalisé + voix + vitesse). La lecture démarre en < 1 s, sans attendre la fin.

### 4.3 Flux — podcast / pré-génération

1. `POST /api/veilles/{id}/render` → synthèse complète → `cache/audio/{clé}.mp3` + entrée d'index.
2. L'UI affiche un badge « en cache » + bouton **Télécharger**.
3. Optionnel (recommandé) : un **flux RSS** `GET /feed.xml` expose les MP3 rendus comme un podcast → tu t'abonnes dans n'importe quelle app mobile et tu écoutes hors-ligne. Voir §12.

---

## 5. Arborescence du sous-projet

```
Veille/speaker/
├── README.md                  # démarrage rapide
├── speaker.cmd                # lanceur Windows (docker compose up)
├── docker-compose.yml         # services : kokoro + speaker
├── Dockerfile                 # image du backend speaker
├── pyproject.toml             # deps Python (ou requirements.txt)
├── config/
│   ├── speaker.config.json    # config runtime (voix, moteur, port, chemins…)
│   └── lexicon.json           # dictionnaire de prononciation FR (extensible)
├── app/
│   ├── main.py                # FastAPI : routes + service du frontend statique
│   ├── models.py              # modèles pydantic (Veille, Segment…)
│   ├── reports.py             # scan/parse de ../report → objets Veille
│   ├── normalizer.py          # markdown → texte parlé (CŒUR QUALITÉ)
│   ├── tts_client.py          # interface moteur (Kokoro / Piper) + streaming
│   ├── cache.py               # hachage contenu + cache audio + index
│   └── podcast.py             # génération du flux RSS (optionnel)
├── web/                       # frontend minimaliste
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── cache/                     # git-ignoré : audio généré + index.json
│   └── audio/
└── tests/
    ├── test_normalizer.py     # tests « golden » sur rapports réels
    ├── test_reports.py
    └── fixtures/              # extraits de report/ figés
```

> Ajouter `speaker/cache/` au `.gitignore` racine. Ne **pas** versionner l'audio généré.

---

## 6. Modèle de données

### 6.1 Ce qu'on lit dans `report/`

Rappel du format (source : `DIGEST_FORMAT.md`) :

| Type | Chemin | Structure clé |
|---|---|---|
| **Hebdo** | `report/weekly/YYYY-Www_weekly.md` | frontmatter YAML (`week`, `range`, `type`, `categories`, `highlights`), `# H1` titre, `## H2` par fil rouge, emojis dans les titres. |
| **Synthèse** | `report/categorie/<Cat>/YYYY-MM-DD_synthese.md` | `# H1`, `## Digest court`, `## Top N — Sujet`, puces `- **Item** : desc`, ligne finale `→ Analyse complète : \`..._detail.md\``. |
| **Détail** | `report/categorie/<Cat>/YYYY-MM-DD_detail.md` | `# H1`, `## N. Sujet`, `**Source :**`, `**Date :**`, `### Contexte`, `### Comment ça marche` (+ Mermaid), `### En pratique — exemple de code` (bloc code), `### Pourquoi ça compte pour toi`, séparateurs `---`. |

Catégories connues : `Angular`, `CSharp`, `IA`, `Tech` (mais rester **data-driven** : découvrir les dossiers dynamiquement, comme le fait `web/`). Un fichier qui ne matche pas les regex (`/(\d{4}-\d{2}-\d{2})/`, `/(\d{4})-W(\d{2})/`, suffixes `_synthese|_detail|_weekly`) est **ignoré silencieusement**.

### 6.2 Objet `Veille` (interne + API)

```jsonc
{
  "id": "categorie/IA/2026-05-27_synthese",   // chemin relatif sans extension, stable
  "type": "synthese",                          // "synthese" | "detail" | "weekly"
  "category": "IA",                            // null pour weekly
  "date": "2026-05-27",                        // ou null
  "week": null,                                // "2026-W27" pour weekly
  "title": "IA Open Source — Synthèse du 27 mai 2026",  // extrait du H1
  "path": "report/categorie/IA/2026-05-27_synthese.md",
  "wordCount": 412,
  "durationEst": 165,                          // secondes, estimé (≈150 mots/min FR)
  "contentHash": "sha256:…",                   // hash du fichier source
  "audio": {                                   // état du cache pour la voix/vitesse par défaut
    "cached": true,
    "voice": "ff_siwis",
    "speed": 1.0,
    "url": "/api/veilles/categorie%2FIA%2F2026-05-27_synthese/download",
    "bytes": 2637312
  }
}
```

---

## 7. Contrats d'API (backend `speaker`)

Base : `http://localhost:8830`. Réponses JSON `UTF-8`. Pas d'auth.

| Méthode & route | Rôle | Paramètres | Réponse |
|---|---|---|---|
| `GET /api/veilles` | Liste toutes les veilles disponibles | `category`, `type`, `q` (recherche titre), `sort` (`date_desc` défaut) | `Veille[]` (sans le texte, avec métadonnées + état cache) |
| `GET /api/veilles/{id}` | Détail d'une veille | — | `Veille` + `text` (normalisé) + `segments[]` |
| `GET /api/veilles/{id}/audio` | **Streaming** audio à la demande | `voice`, `speed` (0.5–2.0), `format` (`mp3` défaut) | `audio/mpeg` (chunked). Sert le cache si présent, sinon génère + met en cache. |
| `POST /api/veilles/{id}/render` | Pré-génère et met en cache le MP3 | body : `{voice, speed}` | `{status, url, bytes, durationSec}` |
| `GET /api/veilles/{id}/download` | Télécharge le MP3 en cache | `voice`, `speed` | `audio/mpeg` (Content-Disposition attachment) ; 404 si non rendu |
| `GET /api/veilles/{id}/timestamps` | (Optionnel) marques temporelles par phrase | `voice`, `speed` | `{segments:[{text, startSec, endSec}]}` pour surlignage karaoké |
| `POST /api/render-batch` | (Optionnel) rend en lot | body : `{filter:{category,type,sinceDate}}` | `{queued:n}` |
| `GET /api/voices` | Voix disponibles selon le moteur actif | — | `[{id, label, gender, engine, lang}]` |
| `GET /api/config` | Config publique (moteur, voix défaut, formats) | — | objet config (sans secrets) |
| `GET /feed.xml` | (Optionnel) flux RSS podcast des MP3 rendus | `category` | `application/rss+xml` |
| `GET /healthz` | Sonde (backend + accessibilité du moteur TTS) | — | `{ok, engine, ttsReachable}` |

**Erreurs** : `404` id inconnu, `422` params invalides, `502` moteur TTS injoignable (message actionnable : « lance le service kokoro »), `503` génération en cours si verrou.

> `{id}` est **URL-encodé** (contient des `/`). Ex : `categorie%2FIA%2F2026-05-27_synthese`.

---

## 8. Le normaliseur markdown → voix (cœur qualité)

C'est **le** composant qui fait la différence avec la Web Speech API. Il transforme le markdown technique en texte **fluide à écouter**. Il doit être **pur** (entrée texte → sortie texte + segments), **testable** et **piloté par config** (`lexicon.json`).

### 8.1 Pipeline

```
fichier .md
  1. Séparer frontmatter YAML  → métadonnées (ne pas lire tel quel)
  2. Extraire le H1            → titre (annoncé une fois, en intro)
  3. Supprimer / réécrire les blocs non parlables (cf. 8.2)
  4. Réécrire l'inline (gras, liens, code inline, emojis…)  (cf. 8.3)
  5. Appliquer le lexique de prononciation FR               (cf. 8.4)
  6. Segmenter en phrases + insérer des pauses par section   (cf. 8.5)
  → texte parlé + liste de segments
```

### 8.2 Blocs — règles de suppression/réécriture

| Élément markdown | Traitement voix |
|---|---|
| Frontmatter `--- … ---` | Retiré. Pour un hebdo, générer une **intro** parlée : « Rapport hebdomadaire, semaine 27, du 29 juin au 5 juillet 2026. » |
| Bloc de code ` ``` … ``` ` (toutes langues) | **Supprimé.** Remplacé par une phrase courte configurable : « (exemple de code — voir le rapport écrit) », ou **rien** selon `speakCodeBlocks:false`. Ne jamais épeler du code. |
| Bloc ` ```mermaid ` | **Supprimé** silencieusement (diagramme). |
| Tableaux markdown | Par défaut **supprimés** (`speakTables:false`) ; option : lire ligne par ligne. |
| Titres `##`, `###` | Marqueurs `#` retirés. Le texte du titre devient une **transition** : courte pause avant, ton de section. Option `announceHeadings` : lire le titre ou juste marquer la pause. |
| Puces `- ` / `* ` / `1. ` | Marqueur retiré ; chaque item = une phrase ; **pause** entre items. |
| Séparateur `---` / `***` | Devient une **pause longue** (changement de sujet). |
| Images `![]()`, HTML brut, badges | Supprimés. |
| Ligne pointeur `→ Analyse complète : \`…\`` | **Supprimée** (référence inter-fichier inutile à l'oreille). |
| Citations `>` | Marqueur retiré, texte lu normalement. |

### 8.3 Inline — règles

| Motif | Traitement |
|---|---|
| `**gras**`, `*italique*`, `__…__` | Marqueurs retirés, texte conservé. |
| `[texte](url)` | Lire **`texte`** seulement, jamais l'URL. |
| URL nue `https://…` | Supprimée, ou remplacée par « (lien en source) » si isolée. |
| `` `code inline` `` | Retirer les backticks ; passer le contenu au lexique (souvent un terme tech). |
| Emojis (🏆, 🔥…) | Supprimés. |
| `→`, `↔`, `•` | `→`/`↔` → « vers » ou pause ; `•` supprimé. |
| `&` | « et ». |
| Espaces/sauts multiples | Normalisés en une espace / un point. |

### 8.4 Lexique de prononciation FR (`config/lexicon.json`)

Table **regex → remplacement**, appliquée avant segmentation, **extensible par l'utilisateur**. Sigles épelés avec des tirets pour que le TTS les articule. Graine minimale à fournir :

```jsonc
{
  "rules": [
    { "pattern": "\\.NET\\b",            "replace": "dot net" },
    { "pattern": "\\bC#",                "replace": "C sharp" },
    { "pattern": "\\bC\\+\\+",           "replace": "C plus plus" },
    { "pattern": "\\bCVE-(\\d{4})-(\\d+)", "replace": "C-V-E $1 $2" },
    { "pattern": "\\bAPI\\b",            "replace": "A-P-I" },
    { "pattern": "\\bMCP\\b",            "replace": "M-C-P" },
    { "pattern": "\\bLLM\\b",            "replace": "L-L-M" },
    { "pattern": "\\bRCE\\b",            "replace": "R-C-E" },
    { "pattern": "\\bSSR\\b",            "replace": "S-S-R" },
    { "pattern": "\\bSSG\\b",            "replace": "S-S-G" },
    { "pattern": "\\bUI\\b",             "replace": "U-I" },
    { "pattern": "\\bUX\\b",             "replace": "U-X" },
    { "pattern": "\\bSDK\\b",            "replace": "S-D-K" },
    { "pattern": "\\bCLI\\b",            "replace": "C-L-I" },
    { "pattern": "\\bSQL\\b",            "replace": "S-Q-L" },
    { "pattern": "\\bJWT\\b",            "replace": "J-W-T" },
    { "pattern": "\\bv?(\\d+)\\.(\\d+)\\.(\\d+)\\b", "replace": "version $1 point $2 point $3" },
    { "pattern": "PostgreSQL",           "replace": "Postgresse Q-L" }
  ],
  "keepAsIs": ["Angular", "TypeScript", "Symfony", "Kokoro", "Claude"]
}
```

> Ordre important : appliquer les règles **spécifiques** (CVE, versions) avant les **génériques** (sigles). Fournir des tests garantissant qu'une date `2026-05-27` n'est pas mal lue et qu'une version `v5.8.0` devient « version 5 point 8 point 0 ».

### 8.5 Segmentation & pauses

- Découper en **phrases** (ponctuation FR ; attention aux abréviations et aux nombres à points déjà réécrits par le lexique).
- Regrouper en **segments** de ~200–400 caractères pour un bon compromis latence/prosodie (le moteur re-colle proprement — Kokoro-FastAPI fait de l'auto-stitching).
- Insérer des **pauses** : courte après un titre/puce, longue à un `---`. Techniquement : soit un court silence inséré entre segments à l'assemblage, soit de la ponctuation (`… `) si le moteur la respecte.
- Exposer la liste des segments (avec leur texte) pour l'endpoint `timestamps` et le surlignage karaoké éventuel.

### 8.6 Exemple avant / après

Entrée (extrait de synthèse) :
```markdown
## Top des sujets

1. **Gemma 4 (Google DeepMind)** — Famille de 4 modèles en Apache 2.0. Le 31B Dense est #3 mondial open sur Arena AI.

→ Analyses complètes : `2026-05-27_detail.md`
```

Sortie parlée :
```
Top des sujets.
Gemma 4, de Google DeepMind. Famille de 4 modèles en Apache 2 point 0. Le 31 B Dense est numéro 3 mondial open sur Arena A-I.
```
(pointeur inter-fichier supprimé ; puce → phrase ; gras retiré ; `#3` → « numéro 3 » ; `AI` → « A-I »).

---

## 9. Intégration TTS

### 9.1 Interface commune (moteur interchangeable)

`tts_client.py` expose une interface unique afin que Kokoro ou Piper soient permutables via `config.engine` :

```python
class TTSClient(Protocol):
    def list_voices(self) -> list[Voice]: ...
    def synthesize_stream(self, text: str, voice: str, speed: float,
                          fmt: str) -> Iterator[bytes]: ...   # yield chunks audio
```

### 9.2 Kokoro (principal) — via Kokoro-FastAPI

Serveur : **`remsky/Kokoro-FastAPI`** (image Docker officielle), endpoint **OpenAI-compatible** `/v1/audio/speech`, streaming + auto-stitching, GPU NVIDIA.

Lancement du moteur (dans `docker-compose.yml`) :
```yaml
services:
  kokoro:
    image: ghcr.io/remsky/kokoro-fastapi-gpu:latest
    ports: ["8880:8880"]
    deploy:
      resources:
        reservations:
          devices: [{ capabilities: ["gpu"] }]
```

Appel depuis `tts_client.py` (client OpenAI ou httpx) :
```python
# POST http://localhost:8880/v1/audio/speech
{ "model": "kokoro", "voice": "ff_siwis", "input": "<segment>",
  "response_format": "mp3", "speed": 1.0, "stream": true }
```
Récupérer les octets en streaming et les relayer tels quels. Format conseillé : `mp3` (compatible `<audio>` + téléchargement direct) ; `opus` possible pour un poids moindre.

### 9.3 Piper (repli) — CPU

Binaire/lib Piper + voix `.onnx` FR téléchargées dans `speaker/models/piper/` :
- `fr_FR-siwis-medium` (féminine, défaut repli),
- `fr_FR-tom-medium` (masculine),
- éviter `fr_FR-upmc-medium` (débit trop rapide signalé).

Piper produit du **WAV** (22 kHz) → convertir en MP3 (ffmpeg/pydub) pour homogénéité. Débit réglable via `length_scale`.

### 9.4 Performance attendue

Sur RTX récente, Kokoro synthétise **~100× temps réel** : une synthèse de 3 min se génère en ~2 s, un détail de 15 min en ~10 s. Le **premier segment** doit partir en < 1 s pour une lecture réactive. Le cache rend les relectures instantanées.

---

## 10. Cache & invalidation

- **Clé de cache** = `sha256(texte_normalisé + engine + voice + speed + format)`. Le texte normalisé (pas le fichier brut) garantit qu'un changement de lexique invalide bien l'audio.
- **Stockage** : `cache/audio/<clé>.mp3` + `cache/index.json` (map `id → {clé, voice, speed, bytes, mtimeSource, durationSec}`).
- **Invalidation** : si le `mtime`/hash du `.md` source change, ou si la clé change (voix/vitesse/lexique), regénérer. Un fichier orphelin (source supprimée) est purgé par une commande `POST /api/cache/gc` (optionnel).
- **Concurrence** : verrou par clé pour éviter deux générations simultanées du même audio.
- `cache/` est **git-ignoré**.

---

## 11. Frontend minimaliste

Une seule page, servie par le backend sur `http://localhost:8830`.

### 11.1 Écran

```
┌───────────────────────────────────────────────────────────┐
│  🎧 Veille Speaker            [moteur: Kokoro · ff_siwis]  │
├──────────────┬────────────────────────────────────────────┤
│ Filtres      │  IA — Synthèse du 27 mai 2026               │
│ □ Angular    │  ~2 min 45 · en cache ✓                     │
│ □ C#         │                                             │
│ ☑ IA         │  ┌──────────────────────────────────────┐  │
│ □ Tech       │  │  ▶  ──●──────────────  1:12 / 2:45    │  │
│ ── type ──   │  │  ⏮ 15  vitesse 1.0×  ⏭ 15   ⬇ MP3    │  │
│ ☑ Synthèse   │  └──────────────────────────────────────┘  │
│ □ Détail     │                                             │
│ □ Hebdo      │  (optionnel) transcription défilante avec   │
│ 🔎 recherche │   surlignage de la phrase en cours          │
│              │                                             │
│ Liste des    │                                             │
│ veilles…     │                                             │
└──────────────┴────────────────────────────────────────────┘
```

### 11.2 Fonctions (MVP)
- **Liste** des veilles groupées par catégorie, triées par date décroissante ; filtres catégorie/type ; recherche par titre ; badge « en cache » / « nouveau ».
- **Lecteur** HTML5 `<audio>` : lecture/pause, barre de progression cliquable, saut ±15 s, **vitesse 0.75–2.0×**, sélecteur de **voix**, bouton **Télécharger MP3** (déclenche `render` si nécessaire).
- **File d'attente** simple : « lire tout » enchaîne les veilles filtrées (ex. toutes les synthèses du jour). *(peut être v1.1)*

### 11.3 Fonctions (plus tard)
- Surlignage karaoké synchronisé (`/timestamps`).
- Reprise de lecture (position mémorisée en `localStorage`).
- Bouton « écouter le briefing du jour » (dernière synthèse par catégorie).

### 11.4 Style
Sombre par défaut, accent indigo `#6366f1` (cohérent avec Veille), typographie système, responsive (utilisable depuis le téléphone sur le réseau local). Pas de framework lourd.

---

## 12. Podcast RSS (optionnel, recommandé)

Pour l'écoute mobile/hors-ligne sans ouvrir l'UI : `GET /feed.xml` génère un flux **RSS 2.0 + iTunes** listant les MP3 déjà rendus (dans `cache/audio/`), avec `<enclosure>` pointant vers `/api/veilles/{id}/download`. Tu t'abonnes une fois dans une app de podcast (sur le réseau local, ou via un tunnel type Tailscale) et chaque nouvelle veille rendue apparaît comme un épisode. Filtrable par catégorie (`?category=IA`). Simple à implémenter (`podcast.py`, ~1 fichier), gros gain d'usage.

---

## 13. Configuration (`config/speaker.config.json`)

```jsonc
{
  "reportsDir": "../report",         // relatif au dossier speaker/
  "port": 8830,
  "engine": "kokoro",                // "kokoro" | "piper"
  "kokoro": {
    "baseUrl": "http://localhost:8880/v1",
    "defaultVoice": "ff_siwis"
  },
  "piper": {
    "modelsDir": "./models/piper",
    "defaultVoice": "fr_FR-siwis-medium"
  },
  "audio": { "format": "mp3", "defaultSpeed": 1.0 },
  "normalizer": {
    "speakCodeBlocks": false,
    "codeBlockPlaceholder": "exemple de code, voir le rapport écrit",
    "speakTables": false,
    "announceHeadings": true,
    "lexicon": "./config/lexicon.json"
  },
  "podcast": { "enabled": true, "baseUrl": "http://localhost:8830" }
}
```

Tout est surchargable par variables d'environnement (`SPEAKER_PORT`, `SPEAKER_ENGINE`, `KOKORO_BASE_URL`…) pour le mode Docker.

---

## 14. Setup & exécution (Windows + GPU)

### 14.1 Prérequis
- **Docker Desktop** (backend WSL2) + **NVIDIA Container Toolkit** pour l'accès GPU dans les conteneurs (drivers NVIDIA à jour).
- Sinon, mode natif : **Python 3.11+**, et le moteur Kokoro-FastAPI lancé à part.

### 14.2 Démarrage (Docker, recommandé)
```bat
cd speaker
speaker.cmd            :: = docker compose up --build
```
- `kokoro` télécharge le modèle au premier lancement (poids ~330 Mo) puis expose `:8880`.
- `speaker` expose l'UI sur `:8830`. Ouvrir http://localhost:8830.

### 14.3 Démarrage (natif, sans Docker)
```bat
cd speaker
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
:: lancer le moteur Kokoro-FastAPI séparément (docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest)
uvicorn app.main:app --port 8830
```

### 14.4 Vérification santé
`GET http://localhost:8830/healthz` doit renvoyer `{ ok:true, engine:"kokoro", ttsReachable:true }`. Sinon, message d'erreur guidant vers le lancement du service `kokoro`.

---

## 15. Tests & critères d'acceptation

### 15.1 Tests automatisés
- **`test_normalizer.py`** (prioritaire) — tests « golden » sur de **vrais extraits** de `report/` figés dans `tests/fixtures/` : blocs de code supprimés, Mermaid supprimé, gras/lien nettoyés, lexique appliqué (`.NET`→« dot net », `CVE-2026-…`→épelé, `v5.8.0`→« version 5 point 8 point 0 »), pointeur `→ Analyse complète` retiré, dates non massacrées.
- **`test_reports.py`** — scan de `report/` : bons `id`/`type`/`category`/`date`, fichiers non conformes ignorés, extraction du H1.
- **Tests API** (httpx/pytest) — `/api/veilles` renvoie une liste ; `/audio` renvoie `audio/mpeg` ; `/download` → 404 avant render, 200 après ; moteur TTS **mocké** (pas de GPU en CI).

### 15.2 Critères d'acceptation (Definition of Done, MVP)
1. `speaker.cmd` démarre les deux services ; l'UI s'ouvre sur `:8830`.
2. La liste affiche toutes les veilles de `report/` (weekly + synthèse + détail des 4 catégories), correctement typées et datées.
3. Un clic lit la veille : audio **français, naturel**, **sans** lire le code ni les URLs ni le markdown ; la lecture démarre en < 1 s.
4. Vitesse et voix réglables ; **Télécharger MP3** produit un fichier lisible hors app.
5. La relecture est servie depuis le cache (pas de re-synthèse).
6. `pytest` vert (normaliseur + reports + API mockée).
7. Zéro modification de `web/` et de `report/` ; `cache/` git-ignoré.

---

## 16. Plan d'implémentation (jalons)

| Jalon | Contenu | Sortie vérifiable |
|---|---|---|
| **M0 — Squelette** | Arbo `speaker/`, config, `reports.py` (scan + parse), `/api/veilles`, UI liste (sans audio). | La liste des veilles s'affiche. |
| **M1 — Normaliseur** | `normalizer.py` + `lexicon.json` + tests golden. `/api/veilles/{id}` renvoie le texte parlé. | `pytest test_normalizer` vert ; texte propre visible. |
| **M2 — TTS streaming** | `tts_client.py` (Kokoro), `/audio` streaming, lecteur audio UI, `docker-compose`. | On écoute une veille en < 1 s. |
| **M3 — Cache & MP3** | `cache.py`, `/render` + `/download`, badges UI, vitesse/voix. | Téléchargement MP3 + relecture instantanée. |
| **M4 — Finitions** | Piper en repli, `/healthz`, `/voices`, README, `speaker.cmd`. | Bascule moteur OK ; doc de démarrage. |
| **M5 — Optionnel** | Podcast RSS, surlignage karaoké, file d'attente, reprise. | Abonnement podcast fonctionnel. |

> Livrer **M0→M4** d'abord (MVP complet et utile). M5 seulement ensuite.

---

## 17. Périmètre exclu (non-goals)
- Pas de modification de l'app Angular (`web/`) ni du contenu (`report/`).
- Pas de clonage de voix en v1 (XTTS/F5 à réévaluer plus tard).
- Pas de multi-utilisateur, d'auth, ni de déploiement cloud.
- Pas de génération de nouveau contenu de veille.

---

## 18. Références

- Kokoro-82M (modèle, Apache 2.0) : https://huggingface.co/hexgrad/Kokoro-82M
- Kokoro-FastAPI (serveur OpenAI-compatible, GPU/CPU, streaming) : https://github.com/remsky/Kokoro-FastAPI
- Piper (repli CPU, MIT) + voix FR : https://github.com/rhasspy/piper — voix : https://huggingface.co/rhasspy/piper-voices
- Format du contenu source : `../DIGEST_FORMAT.md`
- App web existante (référence d'architecture data-driven) : `../web/README.md`
