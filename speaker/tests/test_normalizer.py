"""Tests golden du normaliseur (§8, §15.1) sur de vrais extraits de report/."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.config import NormalizerCfg
from app.normalizer import Lexicon, normalize

FX = Path(__file__).parent / "fixtures" / "report"


@pytest.fixture
def cfg() -> NormalizerCfg:
    return NormalizerCfg()


def _norm(path: Path, vtype: str, cfg: NormalizerCfg, lexicon: Lexicon):
    return normalize(path.read_text(encoding="utf-8"), veille_type=vtype, cfg=cfg, lexicon=lexicon)


def _text(path: Path, vtype: str, cfg, lexicon) -> str:
    return _norm(path, vtype, cfg, lexicon).text


# --------------------------------------------------------------------------- #
#  Règles unitaires garanties par la spec §8.4
# --------------------------------------------------------------------------- #


def _plain(md: str, lexicon: Lexicon, cfg: NormalizerCfg) -> str:
    return normalize(md, veille_type="detail", cfg=cfg, lexicon=lexicon).text


def test_version_epelée(lexicon, cfg):
    out = _plain("Mise à jour v5.8.0 disponible dès aujourd'hui.", lexicon, cfg)
    assert "version 5 point 8 point 0" in out


def test_apache_deux_point_zero(lexicon, cfg):
    out = _plain("Publié en Apache 2.0 hier soir.", lexicon, cfg)
    assert "Apache 2 point 0" in out


def test_date_non_massacrée(lexicon, cfg):
    out = _plain("Publié le 2026-05-27 dans le rapport final.", lexicon, cfg)
    assert "2026-05-27" in out
    assert "version" not in out


def test_cve_epelée(lexicon, cfg):
    out = _plain("La faille CVE-2026-1234 est critique aujourd'hui.", lexicon, cfg)
    assert "C-V-E 2026 1234" in out


def test_dotnet_et_csharp(lexicon, cfg):
    out = _plain("Sur .NET et en C# tout roule parfaitement bien.", lexicon, cfg)
    assert "dot net" in out
    assert "C sharp" in out


def test_lien_ne_lit_que_le_texte(lexicon, cfg):
    out = _plain("Voir [la doc officielle](https://example.com/page) maintenant.", lexicon, cfg)
    assert "la doc officielle" in out
    assert "https" not in out
    assert "example.com" not in out


# --------------------------------------------------------------------------- #
#  Golden — synthèse IA
# --------------------------------------------------------------------------- #


def test_synthese_intro_et_nettoyage(lexicon, cfg):
    out = _text(FX / "categorie/IA/2026-05-27_synthese.md", "synthese", cfg, lexicon)
    assert out.startswith("I-A Open Source, Synthèse")
    # Pointeur inter-fichier supprimé
    assert "Analyses complètes" not in out
    assert "detail.md" not in out
    # Markdown nettoyé
    assert "**" not in out
    assert "`" not in out
    assert "→" not in out
    # Lexique
    assert "numéro 3" in out          # #3 → numéro 3
    assert "Apache 2 point 0" in out  # Apache 2.0
    assert "Arena A-I" in out         # AI → A-I
    assert "version 5 point 8 point 0" in out  # transformers v5.8.0
    assert "2,50 dollars" in out      # 2,50 $


# --------------------------------------------------------------------------- #
#  Golden — détail C#/.NET (code supprimé, lexique)
# --------------------------------------------------------------------------- #


def test_detail_csharp_code_supprimé(lexicon, cfg):
    out = _text(FX / "categorie/CSharp/2026-05-27_detail.md", "detail", cfg, lexicon)
    # Tokens présents UNIQUEMENT dans les blocs de code → doivent disparaître
    assert "ToListAsync" not in out
    assert "queryEmbedding" not in out
    assert "OrderBy" not in out
    # Lexique
    assert "version 10 point 0 point 8" in out  # .NET 10.0.8
    assert "dot net" in out
    assert "L-T-S" in out
    assert "E-F Core" in out
    assert "S-Q-L" in out
    # Source : URL retirée, attribution conservée
    assert "Microsoft Support" in out
    assert "https" not in out
    assert "support.microsoft.com" not in out
    # Placeholder de bloc de code inséré
    assert "exemple de code" in out


# --------------------------------------------------------------------------- #
#  Golden — détail Angular (Mermaid supprimé)
# --------------------------------------------------------------------------- #


def test_detail_angular_mermaid_supprimé(lexicon, cfg):
    out = _text(FX / "categorie/Angular/2026-05-27_detail.md", "detail", cfg, lexicon)
    assert "flowchart" not in out
    assert "signal.set" not in out          # label mermaid seulement
    assert "takeUntilDestroyed" not in out  # code seulement
    assert "ngOnInit" not in out            # code seulement
    assert "**" not in out
    assert "`" not in out


# --------------------------------------------------------------------------- #
#  Golden — hebdomadaire (intro frontmatter, emojis, CVE, mermaid)
# --------------------------------------------------------------------------- #


def test_weekly_intro_et_contenu(lexicon, cfg):
    result = _norm(FX / "weekly/2026-W27_weekly.md", "weekly", cfg, lexicon)
    out = result.text
    assert out.startswith("Rapport hebdomadaire, semaine 27")
    assert "du 29 juin au 5 juillet 2026" in out
    # Diagrammes & code supprimés
    assert "sequenceDiagram" not in out
    assert "flowchart" not in out
    assert "participant" not in out
    assert "gating" not in out          # label mermaid seulement
    assert "SerializationBinder" not in out  # code C# seulement
    # Emojis supprimés
    for emoji in ("🏆", "🔒", "🤖", "🅰️", "🔷"):
        assert emoji not in out
    # Lexique
    assert "C-V-E 2026 50548" in out
    assert "dot net" in out
    assert "TypeScript 7 point 0" in out
    # Markdown & liens nettoyés
    assert "**" not in out
    assert "`" not in out
    assert "https" not in out
    assert "→" not in out


def test_segments_non_vides(lexicon, cfg):
    result = _norm(FX / "weekly/2026-W27_weekly.md", "weekly", cfg, lexicon)
    assert result.segments
    assert all(s.strip() for s in result.segments)
    assert result.word_count > 100
