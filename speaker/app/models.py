"""Modèles pydantic exposés par l'API (§6.2 et §7 de la spec)."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

VeilleType = Literal["synthese", "detail", "weekly"]


class Voice(BaseModel):
    id: str
    label: str
    gender: Literal["female", "male", "neutral"]
    engine: str
    lang: str


class AudioState(BaseModel):
    cached: bool
    voice: str
    speed: float
    url: Optional[str] = None
    bytes: Optional[int] = None


class Veille(BaseModel):
    id: str
    type: VeilleType
    category: Optional[str] = None
    date: Optional[str] = None
    week: Optional[str] = None
    title: str
    path: str
    wordCount: int
    durationEst: int
    contentHash: str
    audio: Optional[AudioState] = None


class Segment(BaseModel):
    index: int
    text: str


class VeilleDetail(Veille):
    text: str
    segments: list[Segment]


class RenderRequest(BaseModel):
    voice: Optional[str] = None
    speed: float = 1.0


class RenderResult(BaseModel):
    status: str
    url: str
    bytes: int
    durationSec: int


class HealthStatus(BaseModel):
    ok: bool
    engine: str
    ttsReachable: bool
