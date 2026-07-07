"use strict";

const api = {
  config: () => fetch("/api/config").then((r) => r.json()),
  voices: () => fetch("/api/voices").then((r) => r.json()),
  veilles: () => fetch("/api/veilles").then((r) => r.json()),
  render: (id, body) =>
    fetch(`/api/veilles/${encodeURIComponent(id)}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
};

const state = {
  cfg: null,
  all: [],
  current: null,
  voice: null,
  speed: 1.0,
  filters: { category: new Set(), type: new Set(), q: "" },
};

const el = (id) => document.getElementById(id);
const player = el("player");

const TYPE_LABEL = { synthese: "Synthèse", detail: "Détail", weekly: "Hebdo" };

function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function estLabel(v) {
  const min = Math.round(v.durationEst / 60);
  return min >= 1 ? `~${min} min` : `~${v.durationEst}s`;
}

// --------------------------------------------------------------------------- init

async function init() {
  try {
    state.cfg = await api.config();
  } catch {
    state.cfg = { engine: "?", audio: { defaultSpeed: 1.0 } };
  }
  state.speed = state.cfg.audio?.defaultSpeed ?? 1.0;
  el("engine-badge").textContent = `moteur : ${state.cfg.engine} · ${state.cfg.defaultVoice ?? ""}`;

  await loadVoices();
  await loadVeilles();
  wireControls();
}

async function loadVoices() {
  let voices = [];
  try {
    voices = await api.voices();
  } catch {
    voices = [];
  }
  const sel = el("voice");
  sel.innerHTML = "";
  for (const v of voices) {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.label;
    sel.appendChild(opt);
  }
  state.voice = state.cfg.defaultVoice || (voices[0] && voices[0].id) || "";
  if (state.voice) sel.value = state.voice;
}

async function loadVeilles() {
  try {
    state.all = await api.veilles();
  } catch {
    state.all = [];
    el("status").textContent = "Impossible de charger les veilles.";
  }
  buildCategoryChips();
  renderList();
}

function buildCategoryChips() {
  const cats = [...new Set(state.all.map((v) => v.category).filter(Boolean))].sort();
  const box = el("category-chips");
  box.innerHTML = "";
  for (const c of cats) {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${c}" class="cat-filter" /> ${c}`;
    box.appendChild(label);
  }
  box.querySelectorAll(".cat-filter").forEach((cb) =>
    cb.addEventListener("change", () => {
      toggle(state.filters.category, cb.value, cb.checked);
      renderList();
    })
  );
}

function toggle(set, value, on) {
  on ? set.add(value) : set.delete(value);
}

function applyFilters(list) {
  const f = state.filters;
  return list.filter((v) => {
    if (f.category.size && !(v.category && f.category.has(v.category))) return false;
    if (f.type.size && !f.type.has(v.type)) return false;
    if (f.q && !v.title.toLowerCase().includes(f.q)) return false;
    return true;
  });
}

function renderList() {
  const list = applyFilters(state.all);
  el("list-meta").textContent = `${list.length} veille${list.length > 1 ? "s" : ""}`;

  const groups = new Map();
  for (const v of list) {
    const key = v.type === "weekly" ? "Hebdomadaires" : v.category || "Autres";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(v);
  }

  const container = el("veille-list");
  container.innerHTML = "";
  for (const [group, items] of groups) {
    const h = document.createElement("div");
    h.className = "cat-group-title";
    h.textContent = group;
    container.appendChild(h);
    for (const v of items) container.appendChild(renderItem(v));
  }
}

function renderItem(v) {
  const btn = document.createElement("button");
  btn.className = "veille-item" + (state.current && state.current.id === v.id ? " active" : "");
  btn.setAttribute("role", "listitem");
  const when = v.date || v.week || "";
  const cached = v.audio && v.audio.cached
    ? `<span class="badge cached">en cache</span>` : "";
  btn.innerHTML = `
    <div class="vi-title">${escapeHtml(v.title)}</div>
    <div class="vi-meta">
      <span class="badge type">${TYPE_LABEL[v.type] || v.type}</span>
      <span>${when}</span><span>·</span><span>${estLabel(v)}</span>${cached}
    </div>`;
  btn.addEventListener("click", () => select(v));
  return btn;
}

// --------------------------------------------------------------------------- playback

function audioUrl(id, voice) {
  // La vitesse est appliquée côté client (playbackRate) → cache stable, changement instantané.
  return `/api/veilles/${encodeURIComponent(id)}/audio?voice=${encodeURIComponent(voice)}&speed=1.0`;
}

function select(v) {
  state.current = v;
  el("empty").hidden = true;
  el("player-card").hidden = false;
  el("np-title").textContent = v.title;
  el("np-sub").textContent = [
    TYPE_LABEL[v.type] || v.type,
    v.category,
    v.date || v.week,
    estLabel(v),
  ].filter(Boolean).join(" · ");
  el("status").textContent = "";
  document.querySelectorAll(".veille-item").forEach((b) => b.classList.remove("active"));

  player.src = audioUrl(v.id, state.voice);
  player.playbackRate = state.speed;
  player.play().catch(() => {});
  renderList();
}

function wireControls() {
  el("search").addEventListener("input", (e) => {
    state.filters.q = e.target.value.trim().toLowerCase();
    renderList();
  });
  document.querySelectorAll(".type-filter").forEach((cb) =>
    cb.addEventListener("change", () => {
      toggle(state.filters.type, cb.value, cb.checked);
      renderList();
    })
  );

  el("play").addEventListener("click", () => {
    if (player.paused) player.play(); else player.pause();
  });
  el("skip-back").addEventListener("click", () => (player.currentTime = Math.max(0, player.currentTime - 15)));
  el("skip-fwd").addEventListener("click", () => (player.currentTime += 15));

  el("voice").addEventListener("change", (e) => {
    state.voice = e.target.value;
    if (state.current) {
      const t = player.currentTime;
      player.src = audioUrl(state.current.id, state.voice);
      player.playbackRate = state.speed;
      player.play().catch(() => {});
    }
  });

  el("speed").addEventListener("input", (e) => {
    state.speed = parseFloat(e.target.value);
    el("speed-val").textContent = state.speed.toFixed(2).replace(/0$/, "") + "×";
    player.playbackRate = state.speed;
  });

  el("download").addEventListener("click", onDownload);

  el("play").textContent = "▶";
  player.addEventListener("play", () => (el("play").textContent = "⏸"));
  player.addEventListener("pause", () => (el("play").textContent = "▶"));
  player.addEventListener("timeupdate", () => {
    const d = player.duration || 0;
    el("time").textContent = `${fmtTime(player.currentTime)} / ${fmtTime(d)}`;
    el("progress-bar").style.width = d ? `${(player.currentTime / d) * 100}%` : "0";
  });
  el("progress").addEventListener("click", (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (player.duration) player.currentTime = ratio * player.duration;
  });
}

async function onDownload() {
  if (!state.current) return;
  const btn = el("download");
  btn.disabled = true;
  el("status").textContent = "Génération du MP3…";
  try {
    const res = await api.render(state.current.id, { voice: state.voice, speed: 1.0 });
    el("status").textContent = `Prêt · ${(res.bytes / 1024).toFixed(0)} Ko`;
    const a = document.createElement("a");
    a.href = res.url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Rafraîchit le badge "en cache".
    state.current.audio = { ...state.current.audio, cached: true, bytes: res.bytes };
    renderList();
  } catch (err) {
    el("status").textContent = "Échec de la génération : " + err;
  } finally {
    btn.disabled = false;
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

document.addEventListener("DOMContentLoaded", init);
