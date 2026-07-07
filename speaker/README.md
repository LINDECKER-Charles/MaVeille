# 🎧 Veille Speaker

Lecteur vocal **local** des rapports de veille (`../report/`). Un modèle TTS neuronal
tourne **sur ton PC (GPU NVIDIA)**, nettoie le markdown technique et le restitue en
voix française naturelle, via une petite UI web **séparée** de l'app Angular.

- **100 % local** — le moteur TTS ne fait aucun appel réseau à l'inférence.
- **Moteur principal** : Kokoro-82M via [Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI)
  (OpenAI-compatible, GPU). **Repli CPU** : Piper. Moteur **interchangeable** (`config.engine`).
- **Streaming à la demande** (début de lecture < 1 s) **et** export/cache **MP3** téléchargeable.

> Spec complète : [`../docs/speaker-spec.md`](../docs/speaker-spec.md). Ce sous-projet
> ne modifie **jamais** `web/` ni `report/`.

---

## Démarrage rapide (Docker, recommandé)

Prérequis : **Docker Desktop** (backend WSL2).

| Lanceur | Stack | Pour qui |
|---|---|---|
| `speaker.cmd` | **CPU** (`docker-compose.cpu.yml`) | universel, aucun prérequis GPU |
| `speaker-gpu.cmd` | **GPU** (`docker-compose.gpu.yml`) | NVIDIA, **y compris RTX 50xx / Blackwell** |

```bat
cd speaker
speaker-gpu.cmd       :: GPU si tu as une carte NVIDIA (recommandé) — sinon speaker.cmd
```

- `kokoro` télécharge le modèle au premier lancement (~330 Mo) puis expose `:8880`.
- `speaker` sert l'UI sur **http://localhost:8830**.
- Même modèle Kokoro et **même voix `ff_siwis`** dans les deux cas. Débit de synthèse :
  **~45× temps réel en GPU** (RTX 5070 Ti : rapport de 9 min en ~12 s) vs ~5× en CPU.
  First-byte ~1 s dans les deux cas (streaming).

### GPU Blackwell (RTX 50xx / sm_120) — image custom cu128

L'image officielle `kokoro-fastapi-gpu:latest` embarque **torch 2.8.0+cu126**, dont les
kernels s'arrêtent à **sm_90** → sur Blackwell : `CUDA error: no kernel image is available`.
`Dockerfile.kokoro-gpu` en dérive une image corrigée :

1. libs CUDA **12.8** (dont NVRTC, requis pour JIT `-arch=sm_120`) depuis `pypi.nvidia.com` ;
2. **torch 2.8.0+cu128** (kernels sm_120), installé depuis un wheel vendoré dans `vendor/`.

`speaker-gpu.cmd` télécharge le wheel automatiquement s'il manque (`vendor/` est gitignoré).
Le CDN `download-r2.pytorch.org` peut être bloqué par certains réseaux (échec TLS) ; le wheel
est donc récupéré directement sur `download.pytorch.org` (servi sans redirection R2).

Prérequis GPU : **NVIDIA Container Toolkit** + drivers récents (CUDA 12.8+). Repli sans GPU :
`speaker.cmd` (CPU) ou moteur **Piper** (`SPEAKER_ENGINE=piper`).

## Démarrage natif (sans Docker)

```bat
cd speaker
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt

:: Lancer le moteur Kokoro à part (une fois) :
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest

uvicorn app.main:app --port 8830
```

Ouvre http://localhost:8830. Santé : `GET /healthz` →
`{ "ok": true, "engine": "kokoro", "ttsReachable": true }`.

---

## API (base `http://localhost:8830`)

| Route | Rôle |
|---|---|
| `GET /api/veilles` | Liste des veilles (`?category`, `?type`, `?q`, `?sort`) + état cache |
| `GET /api/veilles/{id}` | Détail : texte normalisé + segments (`{id}` URL-encodé) |
| `GET /api/veilles/{id}/audio` | **Streaming** audio à la demande (`?voice`, `?speed`, `?format`) |
| `POST /api/veilles/{id}/render` | Pré-génère et met en cache le MP3 |
| `GET /api/veilles/{id}/download` | Télécharge le MP3 en cache (404 si non rendu) |
| `GET /api/voices` · `GET /api/config` · `GET /healthz` | Voix / config publique / sonde |

`{id}` = chemin relatif sans extension, **URL-encodé** (ex. `categorie%2FIA%2F2026-05-27_synthese`).

---

## Le normaliseur (cœur qualité — `app/normalizer.py`)

Transforme le markdown en texte fluide à écouter : supprime code / Mermaid / URLs /
markdown, applique le **lexique FR** (`config/lexicon.json`), segmente en phrases.
Composant **pur et testé** (tests golden sur de vrais extraits de `report/`).

**Étendre la prononciation** : édite `config/lexicon.json` (règles `regex → remplacement`,
ordre = spécifique avant générique). En Docker, le dossier `config/` est monté → édition à chaud.
Un changement de lexique change le texte normalisé donc la **clé de cache** → l'audio est régénéré.

```jsonc
{ "pattern": "\\bWASM\\b", "replace": "W-A-S-M" }   // exemple d'ajout
```

## Configuration (`config/speaker.config.json`)

Voix/vitesse par défaut, moteur, format, options du normaliseur. Surchargeable par
variables d'environnement (mode Docker) : `SPEAKER_PORT`, `SPEAKER_ENGINE`,
`KOKORO_BASE_URL`, `SPEAKER_REPORTS_DIR`, `SPEAKER_DEFAULT_VOICE`, `SPEAKER_DEFAULT_SPEED`.

## Bascule de moteur (Kokoro ↔ Piper)

`config.engine = "piper"` (ou `SPEAKER_ENGINE=piper`). Piper (CPU, MIT) offre plus de
voix FR dont une **masculine** (`fr_FR-tom-medium`). Télécharge les `.onnx` dans
`models/piper/`. Piper émet du WAV (servi tel quel). Repli expérimental.

---

## Tests

```bat
.venv\Scripts\activate
pip install -r requirements-dev.txt
pytest            :: normaliseur (golden) + reports + API (TTS mocké, sans GPU)
```

Le client TTS est **injectable** (`create_app(cfg, tts_client=...)`) → mockable en CI.

## Notes d'implémentation

- **Streaming vs cache** : le texte normalisé complet est envoyé à Kokoro (streaming +
  auto-stitching → 1 MP3 propre, first-byte < 1 s). Le flux est mis en cache en
  *write-through* ; `render` réutilise le même builder → même clé, même fichier.
- **Cache** (`cache/`, git-ignoré) : clé = `sha256(texte_normalisé + engine + voice + speed + format)`.
  Verrou par clé contre les générations concurrentes.
- **Vitesse UI** : appliquée côté client (`playbackRate`) → instantanée et cache stable ;
  le paramètre `speed` du moteur reste disponible côté API (utilisé par `render`).

## Périmètre

MVP (M0→M4) : liste, normaliseur, streaming, cache/MP3, voix/vitesse, Piper, healthz.
**Non inclus (M5)** : podcast RSS (`GET /feed.xml`), surlignage karaoké (`/timestamps`),
file d'attente « lire tout », reprise de lecture.
