"""Cache audio + index (§10).

Clé = ``sha256(texte_normalisé + engine + voice + speed + format)`` : un changement
de source **ou** de lexique change le texte normalisé, donc la clé — invalidation
automatique. Verrou par clé pour éviter deux générations simultanées du même audio.
``cache/`` est git-ignoré.
"""

from __future__ import annotations

import hashlib
import json
import threading
from pathlib import Path
from typing import Iterator


class AudioCache:
    def __init__(self, cache_dir: Path):
        self._dir = cache_dir
        self._audio_dir = cache_dir / "audio"
        self._index_path = cache_dir / "index.json"
        self._audio_dir.mkdir(parents=True, exist_ok=True)
        self._index_lock = threading.Lock()
        self._key_locks: dict[str, threading.Lock] = {}
        self._index: dict[str, dict] = self._load_index()

    # ---- clé & chemins -----------------------------------------------------

    @staticmethod
    def make_key(normalized_text: str, engine: str, voice: str, speed: float, fmt: str) -> str:
        raw = f"{normalized_text}\x1f{engine}\x1f{voice}\x1f{speed:g}\x1f{fmt}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def _path(self, key: str, fmt: str) -> Path:
        return self._audio_dir / f"{key}.{fmt}"

    # ---- index -------------------------------------------------------------

    def _load_index(self) -> dict[str, dict]:
        if self._index_path.exists():
            try:
                return json.loads(self._index_path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                return {}
        return {}

    def _save_index(self) -> None:
        tmp = self._index_path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(self._index, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(self._index_path)

    def entry(self, key: str) -> dict | None:
        return self._index.get(key)

    # ---- accès -------------------------------------------------------------

    def has(self, key: str) -> bool:
        meta = self._index.get(key)
        if not meta:
            return False
        return self._path(key, meta["format"]).exists()

    def path_for(self, key: str) -> Path | None:
        meta = self._index.get(key)
        if not meta:
            return None
        path = self._path(key, meta["format"])
        return path if path.exists() else None

    def read(self, key: str) -> bytes | None:
        path = self.path_for(key)
        return path.read_bytes() if path else None

    def iter_bytes(self, key: str, chunk_size: int = 64 * 1024) -> Iterator[bytes]:
        path = self.path_for(key)
        if not path:
            return
        with path.open("rb") as fh:
            while chunk := fh.read(chunk_size):
                yield chunk

    # ---- écriture ----------------------------------------------------------

    def write(self, key: str, data: bytes, *, fmt: str, meta: dict) -> dict:
        path = self._path(key, fmt)
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_bytes(data)
        tmp.replace(path)
        entry = {**meta, "format": fmt, "bytes": len(data)}
        with self._index_lock:
            self._index[key] = entry
            self._save_index()
        return entry

    # ---- verrou par clé ----------------------------------------------------

    def lock(self, key: str) -> threading.Lock:
        with self._index_lock:
            lock = self._key_locks.get(key)
            if lock is None:
                lock = threading.Lock()
                self._key_locks[key] = lock
            return lock
