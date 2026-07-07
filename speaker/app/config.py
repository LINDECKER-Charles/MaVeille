"""Chargement de la configuration runtime.

Source de vérité : ``config/speaker.config.json`` (§13 de la spec), surchargée par
variables d'environnement pour le mode Docker. Les chemins sont résolus par rapport
au dossier ``speaker/`` (pas au cwd), pour être stables quel que soit le point d'entrée.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from typing import Literal, Optional

from pydantic import BaseModel, Field

# Racine du sous-projet speaker/ (parent de app/).
SPEAKER_DIR = Path(__file__).resolve().parent.parent


class VoiceCfg(BaseModel):
    id: str
    label: str
    gender: Literal["female", "male", "neutral"] = "female"


class KokoroCfg(BaseModel):
    baseUrl: str = "http://localhost:8880/v1"
    defaultVoice: str = "ff_siwis"
    # Voix exposées à l'UI. Kokoro n'a qu'une voix FR native (ff_siwis) ; les autres
    # sont des « blends » ff_siwis+X (timbre modulé, prononciation FR conservée).
    # Éditable ici sans toucher au code. None → liste par défaut de tts_client.
    voices: Optional[list[VoiceCfg]] = None


class PiperCfg(BaseModel):
    modelsDir: str = "./models/piper"
    defaultVoice: str = "fr_FR-siwis-medium"


class AudioCfg(BaseModel):
    format: str = "mp3"
    defaultSpeed: float = 1.0


class NormalizerCfg(BaseModel):
    speakCodeBlocks: bool = False
    codeBlockPlaceholder: str = "exemple de code, voir le rapport écrit"
    speakTables: bool = False
    announceHeadings: bool = True
    lexicon: str = "./config/lexicon.json"


class PodcastCfg(BaseModel):
    enabled: bool = True
    baseUrl: str = "http://localhost:8830"


class SpeakerConfig(BaseModel):
    reportsDir: str = "../report"
    port: int = 8830
    engine: str = "kokoro"
    kokoro: KokoroCfg = Field(default_factory=KokoroCfg)
    piper: PiperCfg = Field(default_factory=PiperCfg)
    audio: AudioCfg = Field(default_factory=AudioCfg)
    normalizer: NormalizerCfg = Field(default_factory=NormalizerCfg)
    podcast: PodcastCfg = Field(default_factory=PodcastCfg)

    # ---- chemins résolus (non sérialisés dans /api/config) -----------------

    def _resolve(self, value: str) -> Path:
        p = Path(value)
        return p if p.is_absolute() else (SPEAKER_DIR / p).resolve()

    def reports_path(self) -> Path:
        return self._resolve(self.reportsDir)

    def lexicon_path(self) -> Path:
        return self._resolve(self.normalizer.lexicon)

    def cache_path(self) -> Path:
        return SPEAKER_DIR / "cache"

    def web_path(self) -> Path:
        return SPEAKER_DIR / "web"

    def piper_models_path(self) -> Path:
        return self._resolve(self.piper.modelsDir)

    def default_voice(self) -> str:
        return self.kokoro.defaultVoice if self.engine == "kokoro" else self.piper.defaultVoice

    def public_dict(self) -> dict:
        """Sous-ensemble exposé par /api/config (sans chemins ni secrets)."""
        return {
            "engine": self.engine,
            "defaultVoice": self.default_voice(),
            "audio": self.audio.model_dump(),
            "normalizer": {
                "announceHeadings": self.normalizer.announceHeadings,
                "speakCodeBlocks": self.normalizer.speakCodeBlocks,
                "speakTables": self.normalizer.speakTables,
            },
            "podcast": {"enabled": self.podcast.enabled},
        }


def _apply_env_overrides(cfg: SpeakerConfig) -> SpeakerConfig:
    env = os.environ
    if v := env.get("SPEAKER_PORT"):
        cfg.port = int(v)
    if v := env.get("SPEAKER_ENGINE"):
        cfg.engine = v
    if v := env.get("SPEAKER_REPORTS_DIR"):
        cfg.reportsDir = v
    if v := env.get("KOKORO_BASE_URL"):
        cfg.kokoro.baseUrl = v
    if v := env.get("SPEAKER_DEFAULT_VOICE"):
        if cfg.engine == "kokoro":
            cfg.kokoro.defaultVoice = v
        else:
            cfg.piper.defaultVoice = v
    if v := env.get("SPEAKER_DEFAULT_SPEED"):
        cfg.audio.defaultSpeed = float(v)
    if v := env.get("SPEAKER_PODCAST_BASE_URL"):
        cfg.podcast.baseUrl = v
    return cfg


def load_config(path: str | os.PathLike | None = None) -> SpeakerConfig:
    """Charge la config JSON puis applique les surcharges d'environnement."""
    cfg_path = Path(path) if path else (SPEAKER_DIR / "config" / "speaker.config.json")
    data: dict = {}
    if cfg_path.exists():
        data = json.loads(cfg_path.read_text(encoding="utf-8"))
    cfg = SpeakerConfig.model_validate(data)
    return _apply_env_overrides(cfg)
