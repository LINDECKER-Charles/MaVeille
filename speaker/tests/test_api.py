"""Tests API (§7, §15.1) — moteur TTS mocké, cache temporaire, sans GPU."""

from __future__ import annotations

from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from app.cache import AudioCache
from app.main import create_app

SYN_ID = "categorie/IA/2026-05-27_synthese"


@pytest.fixture
def client(cfg, fake_tts, tmp_path) -> TestClient:
    app = create_app(cfg, tts_client=fake_tts, cache=AudioCache(tmp_path / "cache"))
    return TestClient(app)


def test_list_veilles(client):
    r = client.get("/api/veilles")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 4
    ids = {v["id"] for v in data}
    assert SYN_ID in ids
    syn = next(v for v in data if v["id"] == SYN_ID)
    assert syn["type"] == "synthese"
    assert syn["category"] == "IA"
    assert syn["wordCount"] > 0
    assert syn["audio"]["cached"] is False


def test_list_filtre_type_et_categorie(client):
    assert all(v["type"] == "weekly" for v in client.get("/api/veilles?type=weekly").json())
    assert all(v["category"] == "CSharp" for v in client.get("/api/veilles?category=CSharp").json())


def test_detail_texte_et_segments(client):
    r = client.get(f"/api/veilles/{quote(SYN_ID, safe='')}")
    assert r.status_code == 200
    body = r.json()
    assert body["text"]
    assert isinstance(body["segments"], list) and body["segments"]
    assert body["segments"][0]["index"] == 0


def test_audio_streaming(client):
    r = client.get(f"/api/veilles/{quote(SYN_ID, safe='')}/audio")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("audio/mpeg")
    assert r.content.startswith(b"ID3")


def test_download_404_puis_200(client):
    enc = quote(SYN_ID, safe="")
    # Avant render → 404
    assert client.get(f"/api/veilles/{enc}/download").status_code == 404
    # Render → 200, synthèse fraîche
    rend = client.post(f"/api/veilles/{enc}/render", json={"speed": 1.0})
    assert rend.status_code == 200
    assert rend.json()["bytes"] > 0
    assert rend.json()["status"] == "generated"
    # Re-render identique → servi depuis le cache
    rend2 = client.post(f"/api/veilles/{enc}/render", json={"speed": 1.0})
    assert rend2.json()["status"] == "cached"
    # Après render → 200 + cache
    dl = client.get(f"/api/veilles/{enc}/download")
    assert dl.status_code == 200
    assert dl.headers["content-type"].startswith("audio/mpeg")
    # État cache reflété dans la liste
    syn = next(v for v in client.get("/api/veilles").json() if v["id"] == SYN_ID)
    assert syn["audio"]["cached"] is True
    assert syn["audio"]["bytes"] > 0


def test_relecture_depuis_cache(client, fake_tts, monkeypatch):
    enc = quote(SYN_ID, safe="")
    client.post(f"/api/veilles/{enc}/render", json={"speed": 1.0})

    calls = {"n": 0}
    original = fake_tts.synthesize_stream

    def counting(*a, **k):
        calls["n"] += 1
        return original(*a, **k)

    monkeypatch.setattr(fake_tts, "synthesize_stream", counting)
    # Deuxième écoute : servie depuis le cache, aucune re-synthèse
    r = client.get(f"/api/veilles/{enc}/audio")
    assert r.status_code == 200
    assert calls["n"] == 0


def test_id_inconnu_404(client):
    assert client.get("/api/veilles/categorie%2FIA%2Finexistant/audio").status_code == 404


def test_voices_et_config_et_health(client):
    assert client.get("/api/voices").json()[0]["lang"] == "fr"
    cfg = client.get("/api/config").json()
    assert "engine" in cfg and "defaultVoice" in cfg
    health = client.get("/healthz").json()
    assert health == {"ok": True, "engine": "fake", "ttsReachable": True}


def test_speed_invalide_422(client):
    r = client.get(f"/api/veilles/{quote(SYN_ID, safe='')}/audio?speed=9")
    assert r.status_code == 422
