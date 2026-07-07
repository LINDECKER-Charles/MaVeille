"""Tests du scan de report/ (§6, §15.1)."""

from __future__ import annotations

from pathlib import Path

from app.config import NormalizerCfg
from app.normalizer import Lexicon
from app.reports import ReportService


def _service(report_dir: Path, lexicon: Lexicon) -> ReportService:
    return ReportService(report_dir, NormalizerCfg(), lexicon)


def test_scan_ignore_fichiers_non_conformes(report_dir, lexicon):
    metas = _service(report_dir, lexicon).scan()
    ids = {m.id for m in metas}
    # notes.md (pas de suffixe) et 2026-05-27-synthese.md (tiret) sont ignorés
    assert "notes" not in ids
    assert not any("-synthese" in i for i in ids)
    assert len(metas) == 4


def test_types_categories_dates(report_dir, lexicon):
    by_id = {m.id: m for m in _service(report_dir, lexicon).scan()}

    syn = by_id["categorie/IA/2026-05-27_synthese"]
    assert syn.type == "synthese"
    assert syn.category == "IA"
    assert syn.date == "2026-05-27"
    assert syn.week is None
    assert syn.path == "report/categorie/IA/2026-05-27_synthese.md"

    det = by_id["categorie/CSharp/2026-05-27_detail"]
    assert det.type == "detail"
    assert det.category == "CSharp"

    wk = by_id["weekly/2026-W27_weekly"]
    assert wk.type == "weekly"
    assert wk.category is None
    assert wk.date is None
    assert wk.week == "2026-W27"


def test_extraction_titre_h1(report_dir, lexicon):
    by_id = {m.id: m for m in _service(report_dir, lexicon).scan()}
    assert by_id["categorie/IA/2026-05-27_synthese"].title.startswith("IA Open Source")
    assert "hebdo" in by_id["weekly/2026-W27_weekly"].title.lower()


def test_content_hash_stable(report_dir, lexicon):
    svc = _service(report_dir, lexicon)
    a = {m.id: m.content_hash for m in svc.scan()}
    b = {m.id: m.content_hash for m in svc.scan()}
    assert a == b
    assert all(h.startswith("sha256:") for h in a.values())


def test_tri_date_decroissante(report_dir, lexicon):
    metas = _service(report_dir, lexicon).scan()
    keys = [m.sort_key for m in metas]
    assert keys == sorted(keys, reverse=True)


def test_normalized_mémoïsé(report_dir, lexicon):
    svc = _service(report_dir, lexicon)
    meta = next(m for m in svc.scan() if m.type == "detail")
    first = svc.normalized(meta)
    second = svc.normalized(meta)
    assert first is second  # même objet → cache par (path, mtime)
    assert first.text
