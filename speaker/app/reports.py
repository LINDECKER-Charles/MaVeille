"""Scan et parsing de ``report/`` → objets Veille (§6 de la spec).

Découverte **data-driven** des catégories (comme ``web/``) : aucun nom codé en dur.
Un fichier qui ne matche pas les patterns est ignoré silencieusement.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path

from .config import NormalizerCfg
from .normalizer import Lexicon, NormalizedResult, extract_h1, normalize

_DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")
_WEEK_RE = re.compile(r"(\d{4})-W(\d{2})")
_SUFFIX_RE = re.compile(r"_(synthese|detail|weekly)$")

_WORDS_PER_MIN = 150  # débit FR moyen pour l'estimation de durée


@dataclass(frozen=True)
class VeilleMeta:
    id: str
    type: str
    category: str | None
    date: str | None
    week: str | None
    title: str
    path: str  # relatif à la racine du dépôt (ex. report/categorie/IA/…)
    file: Path
    mtime: float
    content_hash: str

    @property
    def sort_key(self) -> str:
        # weekly YYYY-Www trié avec les dates : on mappe la semaine sur une date approx.
        return self.date or (self.week or "")


class ReportService:
    """Indexe les rapports et fournit texte normalisé + métadonnées API."""

    def __init__(self, reports_dir: Path, cfg: NormalizerCfg, lexicon: Lexicon):
        self._dir = reports_dir
        self._cfg = cfg
        self._lexicon = lexicon
        self._norm_cache: dict[tuple[str, float], NormalizedResult] = {}

    # ---- scan --------------------------------------------------------------

    def scan(self) -> list[VeilleMeta]:
        metas: list[VeilleMeta] = []
        if not self._dir.exists():
            return metas
        for md in self._dir.rglob("*.md"):
            meta = self._parse_file(md)
            if meta:
                metas.append(meta)
        metas.sort(key=lambda m: m.sort_key, reverse=True)
        return metas

    def _parse_file(self, md: Path) -> VeilleMeta | None:
        rel = md.relative_to(self._dir).as_posix()
        stem = rel[:-3] if rel.endswith(".md") else rel
        suffix = _SUFFIX_RE.search(stem)
        if not suffix:
            return None
        vtype = suffix.group(1)
        name = md.stem

        date = week = category = None
        if vtype == "weekly":
            wm = _WEEK_RE.search(name)
            if not wm:
                return None
            week = f"{wm.group(1)}-W{wm.group(2)}"
        else:
            dm = _DATE_RE.search(name)
            if not dm:
                return None
            date = dm.group(1)
            parts = rel.split("/")
            if len(parts) >= 2 and parts[0] == "categorie":
                category = parts[1]

        try:
            raw = md.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            return None
        title, _ = extract_h1(raw)
        content_hash = "sha256:" + hashlib.sha256(raw.encode("utf-8")).hexdigest()

        return VeilleMeta(
            id=stem,
            type=vtype,
            category=category,
            date=date,
            week=week,
            title=title.strip() or stem,
            path=f"{self._dir.name}/{rel}",
            file=md,
            mtime=md.stat().st_mtime,
            content_hash=content_hash,
        )

    def get(self, veille_id: str) -> VeilleMeta | None:
        for meta in self.scan():
            if meta.id == veille_id:
                return meta
        return None

    # ---- normalisation (mémoïsée par chemin + mtime) -----------------------

    def normalized(self, meta: VeilleMeta) -> NormalizedResult:
        key = (str(meta.file), meta.mtime)
        cached = self._norm_cache.get(key)
        if cached is None:
            raw = meta.file.read_text(encoding="utf-8")
            cached = normalize(
                raw, veille_type=meta.type, cfg=self._cfg, lexicon=self._lexicon
            )
            self._norm_cache[key] = cached
        return cached

    @staticmethod
    def duration_est(word_count: int) -> int:
        return round(word_count / _WORDS_PER_MIN * 60)
