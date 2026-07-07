"""Normaliseur markdown → texte parlé (§8 de la spec) — LE cœur qualité.

Composant **pur** (texte entrant → texte + segments) et **piloté par config**
(``lexicon.json``). Aucune I/O réseau, aucune dépendance FastAPI : directement
testable en golden. Pipeline :

    frontmatter → titre (H1) → suppression des blocs non parlables →
    réécriture inline → lexique FR → segmentation en phrases.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from .config import NormalizerCfg

# --------------------------------------------------------------------------- #
#  Lexique de prononciation
# --------------------------------------------------------------------------- #


class Lexicon:
    """Table regex → remplacement, appliquée dans l'ordre déclaré.

    Les mots de ``keepAsIs`` sont masqués le temps de l'application des règles
    pour garantir qu'aucune règle ne les altère, puis restaurés.
    """

    def __init__(self, rules: list[tuple[str, str]], keep_as_is: list[str]):
        self._rules = [(re.compile(pat), self._to_backrefs(rep)) for pat, rep in rules]
        self._keep = list(keep_as_is)

    @staticmethod
    def _to_backrefs(replace: str) -> str:
        # Convertit la syntaxe $1 (spec / lexicon.json) en backrefs Python \1.
        return re.sub(r"\$(\d+)", r"\\\1", replace)

    def apply(self, text: str) -> str:
        masks: dict[str, str] = {}
        for i, word in enumerate(self._keep):
            token = f"\x00{i}\x00"
            text = re.sub(rf"\b{re.escape(word)}\b", token, text)
            masks[token] = word
        for rx, rep in self._rules:
            text = rx.sub(rep, text)
        for token, word in masks.items():
            text = text.replace(token, word)
        return text

    @classmethod
    def load(cls, path: str | Path) -> "Lexicon":
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        rules = [(r["pattern"], r["replace"]) for r in data.get("rules", [])]
        return cls(rules, data.get("keepAsIs", []))

    @classmethod
    def empty(cls) -> "Lexicon":
        return cls([], [])


# --------------------------------------------------------------------------- #
#  Résultat
# --------------------------------------------------------------------------- #


@dataclass
class NormalizedResult:
    title: str
    intro: str | None
    text: str
    segments: list[str] = field(default_factory=list)

    @property
    def word_count(self) -> int:
        return len(self.text.split())


# --------------------------------------------------------------------------- #
#  Regex partagées
# --------------------------------------------------------------------------- #

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
_H1_RE = re.compile(r"^#\s+(.*)$", re.MULTILINE)
_FENCE_RE = re.compile(r"^\s*(`{3,}|~{3,})(.*)$")
_HEADING_RE = re.compile(r"^\s*#{2,6}\s+(.*)$")
_HR_RE = re.compile(r"^\s*([-*_])\1{2,}\s*$")
_BULLET_RE = re.compile(r"^\s*(?:[-*+]|\d+\.)\s+(.*)$")
_BLOCKQUOTE_RE = re.compile(r"^\s*>\s?(.*)$")
_TABLE_RE = re.compile(r"^\s*\|")
_POINTER_RE = re.compile(r"^\s*→\s*Analyses?\b", re.IGNORECASE)

# Réécriture inline
_IMG_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_INLINE_CODE_RE = re.compile(r"`([^`]+)`")
_BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")
_BOLD_US_RE = re.compile(r"__([^_]+)__")
_ITALIC_RE = re.compile(r"\*([^*\n]+)\*")
_URL_RE = re.compile(r"https?://\S+")
_HASH_NUM_RE = re.compile(r"(?<!\w)#(\d+)\b")

_EMOJI_RE = re.compile(
    "["
    "\U0001f000-\U0001faff"
    "\U00002600-\U000027bf"
    "\U0001f100-\U0001f1ff"
    "\U00002300-\U000023ff"
    "\U00002b00-\U00002bff"
    "\U0000fe00-\U0000fe0f"
    "\U0000200d"
    "]+",
    flags=re.UNICODE,
)

_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?…])\s+")

_FR_MONTHS = [
    "", "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]

_SEGMENT_TARGET = 300  # caractères visés par segment (fenêtre 200-400)


# --------------------------------------------------------------------------- #
#  Étapes
# --------------------------------------------------------------------------- #


def split_frontmatter(md: str) -> tuple[dict | None, str]:
    m = _FRONTMATTER_RE.match(md)
    if not m:
        return None, md
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        meta = {}
    return (meta if isinstance(meta, dict) else None), md[m.end():]


def extract_h1(md: str) -> tuple[str, str]:
    """Retourne (titre, corps sans la ligne H1)."""
    m = _H1_RE.search(md)
    if not m:
        return "", md
    title = m.group(1).strip()
    body = md[: m.start()] + md[m.end():]
    return title, body


def _fr_date(iso: str) -> str:
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", iso.strip())
    if not m:
        return iso.strip()
    year, month, day = int(m.group(1)), int(m.group(2)), int(m.group(3))
    day_str = "1er" if day == 1 else str(day)
    return f"{day_str} {_FR_MONTHS[month]} {year}"


def _fr_range(rng: str) -> str | None:
    parts = re.split(r"[\/→]", rng)
    if len(parts) != 2:
        return None
    start, end = _fr_date(parts[0]), _fr_date(parts[1])
    # "29 juin 2026" → on retire l'année du début si identique à la fin
    end_year = end.rsplit(" ", 1)[-1]
    start = re.sub(rf"\s+{re.escape(end_year)}$", "", start)
    return f"du {start} au {end}"


def build_intro(meta: dict | None, veille_type: str, title: str) -> str | None:
    """Intro parlée (§8.2). Weekly : dérivée du frontmatter. Autres : le H1."""
    if veille_type == "weekly" and meta:
        parts = ["Rapport hebdomadaire"]
        week = str(meta.get("week", "")).strip()
        wm = re.search(r"W(\d{2})", week)
        if wm:
            parts.append(f"semaine {int(wm.group(1))}")
        rng = str(meta.get("range", "")).strip()
        if rng and (fr := _fr_range(rng)):
            parts.append(fr)
        return ", ".join(parts) + "."
    if title:
        # Le H1 devient la phrase d'ouverture (tirets longs → virgules).
        return _ensure_sentence(_finalize(re.sub(r"\s*[—–]\s*", ", ", title)))
    return None


def _strip_blocks(body: str, cfg: NormalizerCfg) -> list[str]:
    """Supprime code/mermaid/tables et transforme les blocs en 'utterances'.

    Retourne une liste de phrases brutes (avant lexique), une par unité de sens,
    déjà terminées par une ponctuation.
    """
    utterances: list[str] = []
    in_fence = False
    fence_lang = ""

    for raw in body.splitlines():
        fence = _FENCE_RE.match(raw)
        if fence:
            if not in_fence:
                in_fence = True
                fence_lang = fence.group(2).strip().lower()
            else:
                # Fermeture du bloc de code.
                in_fence = False
                if fence_lang != "mermaid" and cfg.speakCodeBlocks is False:
                    placeholder = cfg.codeBlockPlaceholder.strip()
                    if placeholder:
                        utterances.append(_ensure_sentence(placeholder))
                fence_lang = ""
            continue
        if in_fence:
            continue  # contenu de code : jamais lu

        line = raw.rstrip()
        if not line.strip():
            continue
        if _HR_RE.match(line):
            continue  # séparateur → simple frontière de phrase
        if _POINTER_RE.match(line):
            continue  # pointeur inter-fichier
        if cfg.speakTables and _TABLE_RE.match(line):
            pass  # (option non-défaut) : laisser passer au traitement inline
        elif _TABLE_RE.match(line):
            continue  # tables supprimées par défaut

        heading = _HEADING_RE.match(line)
        if heading:
            if cfg.announceHeadings:
                text = heading.group(1).strip()
                if text:
                    utterances.append(_ensure_sentence(text))
            continue

        bullet = _BULLET_RE.match(line)
        if bullet:
            utterances.append(_ensure_sentence(bullet.group(1).strip()))
            continue

        quote = _BLOCKQUOTE_RE.match(line)
        if quote:
            utterances.append(_ensure_sentence(quote.group(1).strip()))
            continue

        utterances.append(_ensure_sentence(line.strip()))

    return utterances


def rewrite_inline(text: str) -> str:
    """Réécriture inline (§8.3) : liens, code, gras, URLs, emojis, symboles."""
    text = _IMG_RE.sub("", text)
    text = _LINK_RE.sub(r"\1", text)
    text = _INLINE_CODE_RE.sub(r"\1", text)
    text = _BOLD_RE.sub(r"\1", text)
    text = _BOLD_US_RE.sub(r"\1", text)
    text = _ITALIC_RE.sub(r"\1", text)
    text = re.sub(r"\s*[—–]\s*", ", ", text)  # tirets longs → virgule
    text = _URL_RE.sub("", text)
    text = text.replace("→", " vers ").replace("↔", " vers ")
    text = text.replace("•", " ").replace("·", " ")
    text = _HASH_NUM_RE.sub(r"numéro \1", text)
    text = text.replace("&", " et ")
    text = _EMOJI_RE.sub("", text)
    return text


def _finalize(text: str) -> str:
    """Nettoyage typographique après réécriture inline."""
    text = re.sub(r"\s+", " ", text)
    # Espace avant ponctuation de fin uniquement (ne touche pas le "." de ".NET").
    text = re.sub(r"\s+([,.;:!?…])(?=\s|$)", r"\1", text)
    text = re.sub(r"([,;:])\s*([.!?…])", r"\2", text)  # virgule collée à un point
    text = re.sub(r",\s*,", ",", text)
    text = re.sub(r"[\s,;:—–-]+$", "", text)  # queue de séparateurs (URL retirée)
    text = re.sub(r"^[\s,;:—–]+", "", text)
    return text.strip()


def _ensure_sentence(text: str) -> str:
    text = text.strip()
    if not text:
        return ""
    if text[-1] not in ".!?…:":
        text += "."
    return text


def _segment(text: str) -> list[str]:
    """Découpe en phrases puis regroupe en segments de ~200-400 caractères."""
    sentences = [s.strip() for s in _SENTENCE_SPLIT_RE.split(text) if s.strip()]
    segments: list[str] = []
    current = ""
    for sentence in sentences:
        if not current:
            current = sentence
        elif len(current) + 1 + len(sentence) <= _SEGMENT_TARGET + 100:
            current += " " + sentence
        else:
            segments.append(current)
            current = sentence
        if len(current) >= _SEGMENT_TARGET:
            segments.append(current)
            current = ""
    if current:
        segments.append(current)
    return segments


# --------------------------------------------------------------------------- #
#  Point d'entrée
# --------------------------------------------------------------------------- #


def normalize(
    md: str,
    *,
    veille_type: str,
    cfg: NormalizerCfg,
    lexicon: Lexicon,
) -> NormalizedResult:
    meta, body = split_frontmatter(md)
    title, body = extract_h1(body)
    intro = build_intro(meta, veille_type, title)

    utterances = _strip_blocks(body, cfg)
    spoken: list[str] = []
    if intro:
        spoken.append(_ensure_sentence(_finalize(lexicon.apply(intro))))
    for utt in utterances:
        rewritten = _finalize(rewrite_inline(utt))
        rewritten = _finalize(lexicon.apply(rewritten))
        rewritten = _ensure_sentence(rewritten)
        if rewritten and rewritten not in {".", "…"}:
            spoken.append(rewritten)

    full_text = " ".join(spoken)
    segments = _segment(full_text)
    text = "\n".join(segments) if segments else full_text
    return NormalizedResult(
        title=title or (intro or "").rstrip("."),
        intro=intro,
        text=text,
        segments=segments,
    )
