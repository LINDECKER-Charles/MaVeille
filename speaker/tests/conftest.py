"""Fixtures partagées : config pointant sur les fixtures report/, TTS mocké (CI sans GPU)."""

from __future__ import annotations

from pathlib import Path
from typing import Iterator

import pytest

from app.config import SpeakerConfig, load_config
from app.models import Voice
from app.normalizer import Lexicon

FIXTURE_REPORT = Path(__file__).parent / "fixtures" / "report"


class FakeTTSClient:
    """Moteur déterministe pour la CI — aucun réseau, aucun GPU."""

    engine = "fake"

    def list_voices(self) -> list[Voice]:
        return [Voice(id="ff_siwis", label="Fake FR", gender="female", engine="fake", lang="fr")]

    def reachable(self) -> bool:
        return True

    def content_type(self, fmt: str) -> str:
        return "audio/mpeg"

    def synthesize_stream(self, text: str, voice: str, speed: float, fmt: str) -> Iterator[bytes]:
        yield b"ID3"  # entête pseudo-MP3
        yield f"|{voice}|{speed:g}|{len(text)}".encode("utf-8")


@pytest.fixture
def report_dir() -> Path:
    return FIXTURE_REPORT


@pytest.fixture
def lexicon() -> Lexicon:
    return Lexicon.load(Path(__file__).parent.parent / "config" / "lexicon.json")


@pytest.fixture
def cfg(report_dir: Path) -> SpeakerConfig:
    c = load_config()
    c.reportsDir = str(report_dir)
    return c


@pytest.fixture
def fake_tts() -> FakeTTSClient:
    return FakeTTSClient()
