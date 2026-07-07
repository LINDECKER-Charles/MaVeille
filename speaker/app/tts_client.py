"""Intégration TTS (§9) — moteur **interchangeable** derrière une interface commune.

``TTSClient`` est le contrat ; ``KokoroClient`` (principal, GPU) et ``PiperClient``
(repli CPU) l'implémentent. La fabrique ``create_tts_client`` sélectionne le moteur
selon ``config.engine``. Le client est injectable → mockable en CI (pas de GPU requis).
"""

from __future__ import annotations

import subprocess
from typing import Iterator, Protocol, runtime_checkable

import httpx

from .config import SpeakerConfig
from .models import Voice


class TTSError(RuntimeError):
    """Moteur TTS injoignable ou en échec (mappé en 502 côté API)."""


@runtime_checkable
class TTSClient(Protocol):
    engine: str

    def list_voices(self) -> list[Voice]: ...
    def reachable(self) -> bool: ...
    def content_type(self, fmt: str) -> str: ...
    def synthesize_stream(
        self, text: str, voice: str, speed: float, fmt: str
    ) -> Iterator[bytes]: ...


_MIME = {
    "mp3": "audio/mpeg",
    "opus": "audio/ogg",
    "wav": "audio/wav",
    "flac": "audio/flac",
    "aac": "audio/aac",
}


def _content_type(fmt: str) -> str:
    return _MIME.get(fmt, "application/octet-stream")


# --------------------------------------------------------------------------- #
#  Kokoro (principal) — via Kokoro-FastAPI, endpoint OpenAI-compatible
# --------------------------------------------------------------------------- #

# Inventaire FR de Kokoro. Une seule voix FR native (ff_siwis) ; les autres entrées
# sont des « blends » ff_siwis+X : la prononciation FR reste portée par ff_siwis,
# le timbre est modulé vers l'autre voix (validé : audio FR valide). Éditable via
# config.kokoro.voices.
_KOKORO_FR_VOICES = [
    Voice(id="ff_siwis", label="Siwis — féminine (pure)", gender="female",
          engine="kokoro", lang="fr"),
    Voice(id="ff_siwis+af_heart", label="Siwis — chaleureuse", gender="female",
          engine="kokoro", lang="fr"),
    Voice(id="ff_siwis+bf_emma", label="Siwis — posée", gender="female",
          engine="kokoro", lang="fr"),
    Voice(id="ff_siwis+af_bella", label="Siwis — douce", gender="female",
          engine="kokoro", lang="fr"),
    Voice(id="ff_siwis+am_michael", label="Siwis — timbre grave", gender="male",
          engine="kokoro", lang="fr"),
    Voice(id="ff_siwis+bm_george", label="Siwis — grave (UK)", gender="male",
          engine="kokoro", lang="fr"),
]


class KokoroClient:
    engine = "kokoro"

    def __init__(self, base_url: str, default_voice: str,
                 voices: list[Voice] | None = None, timeout: float = 300.0):
        self._base = base_url.rstrip("/")
        self._root = self._base[:-3].rstrip("/") if self._base.endswith("/v1") else self._base
        self._default_voice = default_voice
        self._voices = list(voices) if voices else list(_KOKORO_FR_VOICES)
        self._timeout = timeout

    def content_type(self, fmt: str) -> str:
        return _content_type(fmt)

    def list_voices(self) -> list[Voice]:
        return list(self._voices)

    def reachable(self) -> bool:
        for url in (f"{self._root}/health", f"{self._base}/audio/voices"):
            try:
                r = httpx.get(url, timeout=3.0)
                if r.status_code < 500:
                    return True
            except httpx.HTTPError:
                continue
        return False

    def synthesize_stream(
        self, text: str, voice: str, speed: float, fmt: str
    ) -> Iterator[bytes]:
        payload = {
            "model": "kokoro",
            "voice": voice or self._default_voice,
            "input": text,
            "response_format": fmt,
            "speed": speed,
            "stream": True,
        }
        try:
            with httpx.stream(
                "POST", f"{self._base}/audio/speech", json=payload, timeout=self._timeout
            ) as resp:
                resp.raise_for_status()
                for chunk in resp.iter_bytes():
                    if chunk:
                        yield chunk
        except httpx.HTTPError as exc:  # pragma: no cover - dépend du moteur
            raise TTSError(
                "Moteur Kokoro injoignable. Lance le service : "
                "`docker compose up kokoro` (ou vérifie KOKORO_BASE_URL)."
            ) from exc


# --------------------------------------------------------------------------- #
#  Piper (repli) — CPU, binaire local + voix .onnx
# --------------------------------------------------------------------------- #

_PIPER_VOICES = [
    Voice(id="fr_FR-siwis-medium", label="Siwis — FR (féminine, CPU)",
          gender="female", engine="piper", lang="fr"),
    Voice(id="fr_FR-tom-medium", label="Tom — FR (masculine, CPU)",
          gender="male", engine="piper", lang="fr"),
]


class PiperClient:
    """Repli CPU. Produit du WAV via le binaire ``piper`` ; sert directement en WAV
    (pas de dépendance ffmpeg imposée). Expérimental — chemin non couvert par la CI.
    """

    engine = "piper"

    def __init__(self, models_dir, default_voice: str):
        from pathlib import Path

        self._models = Path(models_dir)
        self._default_voice = default_voice

    def content_type(self, fmt: str) -> str:
        # Piper émet du WAV ; on annonce le vrai type quel que soit `fmt` demandé.
        return _content_type("wav")

    def list_voices(self) -> list[Voice]:
        return [v for v in _PIPER_VOICES if (self._models / f"{v.id}.onnx").exists()] \
            or list(_PIPER_VOICES)

    def _model_path(self, voice: str):
        return self._models / f"{(voice or self._default_voice)}.onnx"

    def reachable(self) -> bool:
        try:
            subprocess.run(["piper", "--help"], capture_output=True, timeout=5)
        except (OSError, subprocess.SubprocessError):
            return False
        return self._model_path(self._default_voice).exists()

    def synthesize_stream(
        self, text: str, voice: str, speed: float, fmt: str
    ) -> Iterator[bytes]:
        model = self._model_path(voice)
        if not model.exists():
            raise TTSError(
                f"Voix Piper introuvable : {model}. Télécharge le modèle .onnx "
                "dans le dossier des modèles Piper."
            )
        # length_scale ∝ 1/speed (plus grand = plus lent).
        length_scale = 1.0 / speed if speed else 1.0
        try:
            proc = subprocess.run(
                ["piper", "--model", str(model), "--output_file", "-",
                 "--length_scale", f"{length_scale:.3f}"],
                input=text.encode("utf-8"),
                capture_output=True,
                timeout=300,
            )
        except (OSError, subprocess.SubprocessError) as exc:
            raise TTSError(f"Échec Piper : {exc}") from exc
        if proc.returncode != 0:
            raise TTSError(proc.stderr.decode("utf-8", "replace") or "Piper a échoué.")
        yield proc.stdout


# --------------------------------------------------------------------------- #
#  Fabrique
# --------------------------------------------------------------------------- #


def create_tts_client(cfg: SpeakerConfig) -> TTSClient:
    if cfg.engine == "piper":
        return PiperClient(cfg.piper_models_path(), cfg.piper.defaultVoice)
    voices = None
    if cfg.kokoro.voices:
        voices = [
            Voice(id=v.id, label=v.label, gender=v.gender, engine="kokoro", lang="fr")
            for v in cfg.kokoro.voices
        ]
    return KokoroClient(cfg.kokoro.baseUrl, cfg.kokoro.defaultVoice, voices=voices)
