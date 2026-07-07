"""Backend FastAPI « speaker » (§4, §7).

App-factory ``create_app`` : la config, le service de rapports, le client TTS et le
cache sont injectables → le moteur TTS est **mockable en CI** (aucun GPU requis).
Sert aussi le frontend statique.
"""

from __future__ import annotations

from typing import Iterator, Optional
from urllib.parse import quote, unquote

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .cache import AudioCache
from .config import SpeakerConfig, load_config
from .models import (
    AudioState,
    HealthStatus,
    RenderRequest,
    RenderResult,
    Segment,
    Veille,
    VeilleDetail,
)
from .normalizer import Lexicon
from .reports import ReportService, VeilleMeta
from .tts_client import TTSClient, TTSError, create_tts_client


class AppState:
    def __init__(
        self,
        config: SpeakerConfig,
        reports: ReportService,
        tts: TTSClient,
        cache: AudioCache,
    ):
        self.config = config
        self.reports = reports
        self.tts = tts
        self.cache = cache


def create_app(
    config: Optional[SpeakerConfig] = None,
    *,
    tts_client: Optional[TTSClient] = None,
    cache: Optional[AudioCache] = None,
) -> FastAPI:
    cfg = config or load_config()
    lexicon = _load_lexicon(cfg)
    reports = ReportService(cfg.reports_path(), cfg.normalizer, lexicon)
    tts = tts_client or create_tts_client(cfg)
    audio_cache = cache or AudioCache(cfg.cache_path())
    state = AppState(cfg, reports, tts, audio_cache)

    app = FastAPI(title="Veille Speaker", version="1.0.0")
    app.state.speaker = state

    # Outil local mono-utilisateur : on autorise les origines localhost (ex. l'app
    # Angular en `ng serve` sur :4200 qui embarque le lecteur en mode dev).
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def get_state(request: Request) -> AppState:
        return request.app.state.speaker

    # --------------------------------------------------------------------- #
    #  Helpers
    # --------------------------------------------------------------------- #

    def _resolve_meta(st: AppState, veille_id: str) -> VeilleMeta:
        meta = st.reports.get(unquote(veille_id))
        if not meta:
            raise HTTPException(status_code=404, detail=f"Veille inconnue : {veille_id}")
        return meta

    def _audio_state(st: AppState, meta: VeilleMeta, voice: str, speed: float, fmt: str) -> AudioState:
        norm = st.reports.normalized(meta)
        key = st.cache.make_key(norm.text, st.tts.engine, voice, speed, fmt)
        entry = st.cache.entry(key) if st.cache.has(key) else None
        return AudioState(
            cached=entry is not None,
            voice=voice,
            speed=speed,
            url=f"/api/veilles/{quote(meta.id, safe='')}/download",
            bytes=entry.get("bytes") if entry else None,
        )

    def _to_veille(st: AppState, meta: VeilleMeta, voice: str, speed: float, fmt: str) -> Veille:
        norm = st.reports.normalized(meta)
        wc = norm.word_count
        return Veille(
            id=meta.id,
            type=meta.type,
            category=meta.category,
            date=meta.date,
            week=meta.week,
            title=meta.title,
            path=meta.path,
            wordCount=wc,
            durationEst=st.reports.duration_est(wc),
            contentHash=meta.content_hash,
            audio=_audio_state(st, meta, voice, speed, fmt),
        )

    def _defaults(st: AppState, voice: Optional[str], speed: Optional[float]) -> tuple[str, float, str]:
        v = voice or st.config.default_voice()
        s = speed if speed is not None else st.config.audio.defaultSpeed
        return v, s, st.config.audio.format

    def _synthesize(st: AppState, key: str, fmt: str, text: str, voice: str, speed: float, meta: dict) -> bytes:
        with st.cache.lock(key):
            cached = st.cache.read(key)
            if cached is not None:
                return cached
            try:
                data = b"".join(st.tts.synthesize_stream(text, voice, speed, fmt))
            except TTSError as exc:
                raise HTTPException(status_code=502, detail=str(exc)) from exc
            st.cache.write(key, data, fmt=fmt, meta=meta)
            return data

    def _stream(st: AppState, key: str, fmt: str, text: str, voice: str, speed: float, meta: dict) -> Iterator[bytes]:
        lock = st.cache.lock(key)
        lock.acquire()
        try:
            if st.cache.has(key):
                yield from st.cache.iter_bytes(key)
                return
            buf = bytearray()
            for chunk in st.tts.synthesize_stream(text, voice, speed, fmt):
                buf += chunk
                yield chunk
            st.cache.write(key, bytes(buf), fmt=fmt, meta=meta)
        finally:
            lock.release()

    # --------------------------------------------------------------------- #
    #  Routes — listing / métadonnées
    # --------------------------------------------------------------------- #

    @app.get("/healthz", response_model=HealthStatus)
    def healthz(st: AppState = Depends(get_state)) -> HealthStatus:
        return HealthStatus(ok=True, engine=st.tts.engine, ttsReachable=st.tts.reachable())

    @app.get("/api/config")
    def api_config(st: AppState = Depends(get_state)) -> JSONResponse:
        return JSONResponse(st.config.public_dict())

    @app.get("/api/voices")
    def api_voices(st: AppState = Depends(get_state)):
        return st.tts.list_voices()

    @app.get("/api/veilles", response_model=list[Veille])
    def list_veilles(
        st: AppState = Depends(get_state),
        category: Optional[str] = None,
        type: Optional[str] = None,
        q: Optional[str] = None,
        sort: str = "date_desc",
        voice: Optional[str] = None,
        speed: Optional[float] = Query(default=None, ge=0.5, le=2.0),
    ) -> list[Veille]:
        v, s, fmt = _defaults(st, voice, speed)
        metas = st.reports.scan()
        if category:
            metas = [m for m in metas if m.category == category]
        if type:
            metas = [m for m in metas if m.type == type]
        if q:
            needle = q.lower()
            metas = [m for m in metas if needle in m.title.lower()]
        if sort == "date_asc":
            metas = list(reversed(metas))
        return [_to_veille(st, m, v, s, fmt) for m in metas]

    # --------------------------------------------------------------------- #
    #  Routes audio — suffixes AVANT le catch-all détail (ordre important)
    # --------------------------------------------------------------------- #

    @app.get("/api/veilles/{veille_id:path}/audio")
    def stream_audio(
        veille_id: str,
        st: AppState = Depends(get_state),
        voice: Optional[str] = None,
        speed: Optional[float] = Query(default=None, ge=0.5, le=2.0),
        format: Optional[str] = None,
    ):
        meta = _resolve_meta(st, veille_id)
        v, s, default_fmt = _defaults(st, voice, speed)
        fmt = format or default_fmt
        norm = st.reports.normalized(meta)
        key = st.cache.make_key(norm.text, st.tts.engine, v, s, fmt)
        cache_meta = _cache_meta(meta, v, s, norm.word_count, st)
        if not st.cache.has(key) and not st.tts.reachable():
            raise HTTPException(
                status_code=502,
                detail="Moteur TTS injoignable. Lance le service kokoro (docker compose up kokoro).",
            )
        return StreamingResponse(
            _stream(st, key, fmt, norm.text, v, s, cache_meta),
            media_type=st.tts.content_type(fmt),
        )

    @app.post("/api/veilles/{veille_id:path}/render", response_model=RenderResult)
    def render_audio(
        veille_id: str,
        body: RenderRequest,
        st: AppState = Depends(get_state),
    ) -> RenderResult:
        meta = _resolve_meta(st, veille_id)
        v, s, fmt = _defaults(st, body.voice, body.speed)
        norm = st.reports.normalized(meta)
        key = st.cache.make_key(norm.text, st.tts.engine, v, s, fmt)
        cache_meta = _cache_meta(meta, v, s, norm.word_count, st)
        was_cached = st.cache.has(key)
        data = _synthesize(st, key, fmt, norm.text, v, s, cache_meta)
        return RenderResult(
            status="cached" if was_cached else "generated",
            url=f"/api/veilles/{quote(meta.id, safe='')}/download?voice={quote(v)}&speed={s:g}",
            bytes=len(data),
            durationSec=st.reports.duration_est(norm.word_count),
        )

    @app.get("/api/veilles/{veille_id:path}/download")
    def download_audio(
        veille_id: str,
        st: AppState = Depends(get_state),
        voice: Optional[str] = None,
        speed: Optional[float] = Query(default=None, ge=0.5, le=2.0),
        format: Optional[str] = None,
    ):
        meta = _resolve_meta(st, veille_id)
        v, s, default_fmt = _defaults(st, voice, speed)
        fmt = format or default_fmt
        norm = st.reports.normalized(meta)
        key = st.cache.make_key(norm.text, st.tts.engine, v, s, fmt)
        path = st.cache.path_for(key)
        if not path:
            raise HTTPException(
                status_code=404,
                detail="Audio non rendu. Appelle POST /render d'abord.",
            )
        filename = meta.id.replace("/", "_") + f".{fmt}"
        return FileResponse(
            path,
            media_type=st.tts.content_type(fmt),
            filename=filename,
        )

    @app.get("/api/veilles/{veille_id:path}", response_model=VeilleDetail)
    def get_veille(
        veille_id: str,
        st: AppState = Depends(get_state),
        voice: Optional[str] = None,
        speed: Optional[float] = Query(default=None, ge=0.5, le=2.0),
    ) -> VeilleDetail:
        meta = _resolve_meta(st, veille_id)
        v, s, fmt = _defaults(st, voice, speed)
        norm = st.reports.normalized(meta)
        base = _to_veille(st, meta, v, s, fmt)
        return VeilleDetail(
            **base.model_dump(),
            text=norm.text,
            segments=[Segment(index=i, text=t) for i, t in enumerate(norm.segments)],
        )

    # --------------------------------------------------------------------- #
    #  Frontend statique (monté en dernier pour ne pas masquer l'API)
    # --------------------------------------------------------------------- #

    web_dir = cfg.web_path()
    if web_dir.exists():
        app.mount("/", StaticFiles(directory=str(web_dir), html=True), name="web")

    return app


def _cache_meta(meta: VeilleMeta, voice: str, speed: float, word_count: int, st: "AppState") -> dict:
    return {
        "id": meta.id,
        "voice": voice,
        "speed": speed,
        "engine": st.tts.engine,
        "mtimeSource": meta.mtime,
        "durationSec": st.reports.duration_est(word_count),
    }


def _load_lexicon(cfg: SpeakerConfig) -> Lexicon:
    path = cfg.lexicon_path()
    return Lexicon.load(path) if path.exists() else Lexicon.empty()


# Instance ASGI par défaut (uvicorn app.main:app).
app = create_app()
