// @ts-check
/**
 * Build-time data generator for the Veille Angular viewer.
 *
 * Replaces SvelteKit's `import.meta.glob`. Scans the repo-root content folders
 * (report/categorie/<Cat>/, report/weekly/) relative to web/, parses optional
 * YAML frontmatter, renders markdown -> sanitized HTML, splits details into
 * per-topic snippets, computes global stats + the category registry + weekly
 * reports, and emits generated TS/JSON consumed by the app under
 * src/app/data/generated/.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import yaml from 'js-yaml';
import { createHighlighter } from 'shiki';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(WEB_ROOT, '..');
const OUT_DIR = join(WEB_ROOT, 'src', 'app', 'data', 'generated');

const CATEGORIE_DIR = join(REPO_ROOT, 'report', 'categorie');
const WEEKLY_DIR = join(REPO_ROOT, 'report', 'weekly');
const REGISTRY_FILE = join(WEB_ROOT, 'categories.config.json');

const WEEK_RE = /(\d{4})-W(\d{2})/;

// ---------------------------------------------------------------------------
// Regexes (kept identical to the original digests.ts / markdown.ts contract)
// ---------------------------------------------------------------------------
const DATE_RE = /(\d{4}-\d{2}-\d{2})/;
const SUBJECT_RE = /^## \d+\.\s+/gm;
const SOURCE_RE = /^\*\*Source\s*:\*\*/gm;
const SOURCE_LINE = /^[*_]{2}Source\s*:[*_]{2}\s*([^\n]+?)(?:\s*[—–]\s*(https?:\S+))?\s*$/m;
const DATE_LINE = /^[*_]{2}Date\s*:[*_]{2}\s*([^\n]+?)\s*$/m;
const TRAILING_HR = /\n\s*-{3,}\s*$/;

marked.setOptions({ gfm: true, breaks: false });

// ---------------------------------------------------------------------------
// Syntax highlighting (Shiki, build-time) + Mermaid passthrough
// ---------------------------------------------------------------------------
// Dual light/dark themes emitted as CSS variables (--shiki-light / --shiki-dark)
// so highlighted code adapts to the app's runtime theme toggle. A single shared
// highlighter instance is created once and reused for every code block.
const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' };

// Languages we support in digests. Unknown languages degrade to plain `text`.
const SHIKI_LANGS = [
  'ts',
  'tsx',
  'js',
  'jsx',
  'json',
  'csharp',
  'bash',
  'shell',
  'sql',
  'html',
  'css',
  'yaml',
  'python',
  'diff',
  'xml',
  'markdown'
];

/** @type {import('shiki').Highlighter | null} */
let highlighterInstance = null;

/** Lazily create (once) and return the shared Shiki highlighter. */
async function getHighlighter() {
  if (!highlighterInstance) {
    highlighterInstance = await createHighlighter({
      themes: Object.values(SHIKI_THEMES),
      langs: SHIKI_LANGS
    });
  }
  return highlighterInstance;
}

/** Normalize fence info strings (e.g. `ts {1,2}`) down to a bare language id. */
/** @param {string | undefined} lang */
function normalizeLang(lang) {
  const id = (lang ?? '').trim().split(/\s+/)[0].toLowerCase();
  return id;
}

/**
 * Highlight a fenced code block to Shiki HTML (dual-theme, CSS-var output).
 * Unknown languages fall back to `text` so the build never throws.
 * @param {string} code @param {string} lang
 */
async function highlightCode(code, lang) {
  const highlighter = await getHighlighter();
  const loaded = highlighter.getLoadedLanguages();
  const resolved = loaded.includes(lang) ? lang : 'text';
  return highlighter.codeToHtml(code, {
    lang: resolved,
    themes: SHIKI_THEMES,
    defaultColor: false
  });
}

// ---------------------------------------------------------------------------
// Frontmatter (optional, backward compatible, all-or-nothing per file)
// ---------------------------------------------------------------------------
/**
 * @param {string} raw
 * @returns {{ frontmatter: Record<string, unknown> | null, body: string }}
 */
function parseFrontmatter(raw) {
  // Gate strictly on a leading `---` fence on the very first line.
  if (!raw.startsWith('---')) return { frontmatter: null, body: raw };
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontmatter: null, body: raw };
  try {
    const parsed = yaml.load(match[1]);
    const frontmatter =
      parsed && typeof parsed === 'object' ? /** @type {Record<string, unknown>} */ (parsed) : {};
    return { frontmatter, body: raw.slice(match[0].length) };
  } catch {
    // Malformed frontmatter -> treat the file as if it had none (tolerant).
    return { frontmatter: null, body: raw };
  }
}

// ---------------------------------------------------------------------------
// Markdown rendering (ported from markdown.ts)
// ---------------------------------------------------------------------------
/**
 * DOMPurify config: in addition to link attrs, allow the `class` + inline
 * `style` (CSS custom properties) Shiki emits on <pre>/<code>/<span>, and keep
 * the `<pre class="mermaid">` marker untouched. Content is build-time-trusted
 * (our own repo), so this relaxation is scoped to what Shiki/Mermaid need.
 */
const SANITIZE_OPTS = {
  ADD_ATTR: ['target', 'rel', 'class', 'style'],
  // `tabindex` is emitted by Shiki on <pre>; allow it through.
  ADD_DATA_URI_TAGS: []
};

/**
 * Render markdown -> sanitized HTML. Code blocks with an explicit language are
 * highlighted at build via Shiki (async); ```mermaid blocks are passed through
 * as a `<pre class="mermaid">` marker carrying the raw source for client-side
 * rendering. Async because Shiki's API is async.
 * @param {string} md
 * @returns {Promise<string>}
 */
async function renderMarkdown(md) {
  // Mutate each `code` token into a raw `html` token during the async parse:
  // - ```mermaid -> a <pre class="mermaid"> marker carrying the raw source
  // - ```<lang>  -> Shiki-highlighted HTML
  // - bare ```   -> left untouched (default code rendering)
  const walk = async (token) => {
    if (token.type !== 'code') return;
    const lang = normalizeLang(token.lang);
    if (lang === 'mermaid') {
      token.type = 'html';
      token.text = `<pre class="mermaid">${escapeHtml(token.text)}</pre>`;
      token.block = true;
      return;
    }
    if (!lang) return;
    token.type = 'html';
    token.text = await highlightCode(token.text, lang);
    token.block = true;
  };

  const html = /** @type {string} */ (await marked.parse(md, { async: true, walkTokens: walk }));
  return DOMPurify.sanitize(html, SANITIZE_OPTS);
}

/** Minimal HTML-escaping for raw text placed inside a marker element. */
/** @param {string} s */
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * @param {string} md
 * @returns {{ title: string | null, body: string }}
 */
function stripLeadingH1(md) {
  const match = md.match(/^\s*#\s+(.+?)\s*\n/);
  if (!match) return { title: null, body: md };
  return { title: match[1].trim(), body: md.slice(match[0].length) };
}

/**
 * @param {string} input
 * @param {RegExpMatchArray | null} match
 */
function stripFirst(input, match) {
  return match ? input.replace(match[0], '') : input;
}

/** @param {string} body */
function buildPreview(body) {
  const firstPara = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith('#') && !p.startsWith('---'));
  if (!firstPara) return undefined;
  const flat = firstPara
    .replace(/[*_`]/g, '')
    .replace(/\[(.+?)]\((.+?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > 180 ? flat.slice(0, 177).trimEnd() + '…' : flat;
}

/**
 * Split a detail markdown body into per-topic snippets (ported verbatim).
 * @param {string} md
 */
async function splitDetailIntoSnippets(md) {
  const parts = md.split(/^##\s+/m);
  const snippets = [];

  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const newlineAt = chunk.indexOf('\n');
    const firstLine = newlineAt === -1 ? chunk : chunk.slice(0, newlineAt);
    const rest = newlineAt === -1 ? '' : chunk.slice(newlineAt + 1);

    const numMatch = firstLine.match(/^(\d+)\.\s+(.+?)\s*$/);
    if (!numMatch) continue;

    const sourceMatch = rest.match(SOURCE_LINE);
    const dateMatch = rest.match(DATE_LINE);

    let body = stripFirst(rest, sourceMatch);
    body = stripFirst(body, dateMatch);
    body = body
      .replace(TRAILING_HR, '')
      .replace(/^\s+/, '')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd();

    const bodyHtml = await renderMarkdown(body);
    snippets.push({
      index: numMatch[1],
      title: numMatch[2].trim(),
      source: sourceMatch?.[1]?.trim(),
      sourceUrl: sourceMatch?.[2]?.trim(),
      date: dateMatch?.[1]?.trim(),
      bodyHtml,
      preview: buildPreview(body),
      readingMinutes: readingMinutes(stripHtml(bodyHtml), 2)
    });
  }
  return snippets;
}

// ---------------------------------------------------------------------------
// Plaintext stripping for the search index (ported from digests.ts stripMd)
// ---------------------------------------------------------------------------
/** @param {string} md */
function stripMd(md) {
  return md
    .replace(/^---[\s\S]*?\n---\n/, '')
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*?(.+?)\*\*?/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** @param {string} raw @param {RegExp} re */
function countMatches(raw, re) {
  return raw.match(re)?.length ?? 0;
}

// ---------------------------------------------------------------------------
// Reading time + plaintext helpers (HTML -> word count, sentence extraction)
// ---------------------------------------------------------------------------
/** Strip HTML tags and decode the few entities our markdown pipeline emits. */
/** @param {string} html */
function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @param {string} text */
function wordCount(text) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Reading time in minutes from plain text, at ~200 wpm, with a floor.
 * @param {string} text @param {number} floor
 */
function readingMinutes(text, floor) {
  return Math.max(floor, Math.round(wordCount(text) / 200));
}

/**
 * Extract the first usable sentence from stripped HTML, trimmed to ~maxLen
 * characters with a clean break (sentence end, else last word boundary).
 * @param {string} html @param {number} [maxLen]
 */
function firstSentence(html, maxLen = 220) {
  const flat = stripHtml(html);
  if (!flat) return '';
  const end = flat.search(/[.!?](?:\s|$)/);
  let sentence = end !== -1 ? flat.slice(0, end + 1) : flat;
  if (sentence.length > maxLen) {
    const cut = sentence.slice(0, maxLen);
    const lastSpace = cut.lastIndexOf(' ');
    sentence = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
  }
  return sentence.trim();
}

// ---------------------------------------------------------------------------
// Filesystem scan
// ---------------------------------------------------------------------------
/** @param {string} path */
function extractDate(path) {
  const m = path.match(DATE_RE);
  return m ? m[1] : null;
}

/** @param {string} dir @param {RegExp} suffix */
function listFiles(dir, suffix) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => suffix.test(f))
    .map((f) => join(dir, f));
}

/**
 * @typedef {{ frontmatter: Record<string, unknown> | null, raw: string, body: string }} ParsedFile
 */

/** @param {string} path @returns {ParsedFile} */
function readParsed(path) {
  const raw = readFileSync(path, 'utf-8').replace(/^﻿/, '');
  const { frontmatter, body } = parseFrontmatter(raw);
  return { frontmatter, raw, body };
}

/**
 * @returns {{
 *   bydate: Map<string, Map<string, { synthese?: ParsedFile, detail?: ParsedFile }>>,
 *   categories: Set<string>
 * }}
 */
function buildIndex() {
  /** @type {Map<string, Map<string, { synthese?: ParsedFile, detail?: ParsedFile }>>} */
  const bydate = new Map();
  /** @type {Set<string>} */
  const categories = new Set();

  const catDirs = existsSync(CATEGORIE_DIR)
    ? readdirSync(CATEGORIE_DIR, { withFileTypes: true }).filter((d) => d.isDirectory())
    : [];

  /** @param {string} date @param {string} category */
  const ensureCat = (date, category) => {
    let day = bydate.get(date);
    if (!day) {
      day = new Map();
      bydate.set(date, day);
    }
    let cat = day.get(category);
    if (!cat) {
      cat = {};
      day.set(category, cat);
    }
    return cat;
  };

  for (const d of catDirs) {
    const category = d.name;
    const catPath = join(CATEGORIE_DIR, category);
    let touched = false;
    for (const file of listFiles(catPath, /_synthese\.md$/)) {
      const date = extractDate(file);
      if (date) {
        ensureCat(date, category).synthese = readParsed(file);
        touched = true;
      }
    }
    for (const file of listFiles(catPath, /_detail\.md$/)) {
      const date = extractDate(file);
      if (date) {
        ensureCat(date, category).detail = readParsed(file);
        touched = true;
      }
    }
    if (touched) categories.add(category);
  }

  return { bydate, categories };
}

/**
 * Build per-category metrics for one day, honouring frontmatter when present.
 * @param {{ synthese?: ParsedFile, detail?: ParsedFile }} raw
 */
function buildEntryCounts(raw) {
  const fmCount = (file) => {
    const v = file?.frontmatter?.['sources_count'];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };
  const subjects = raw.detail ? countMatches(raw.detail.body, SUBJECT_RE) : 0;
  const sourcesFm = fmCount(raw.detail) ?? fmCount(raw.synthese);
  const sources =
    sourcesFm != null ? sourcesFm : raw.detail ? countMatches(raw.detail.body, SOURCE_RE) : 0;
  return { subjects, sources };
}

// ---------------------------------------------------------------------------
// Category registry (extensibility)
// ---------------------------------------------------------------------------
/** Deterministic accent color derived from a category name (HSL -> hex). */
/** @param {string} name */
function hashAccent(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  // Fixed sat/light so colors stay legible against both themes.
  return hslToHex(hue, 62, 60);
}

/** @param {number} h @param {number} s @param {number} l */
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** URL/CSS-safe slug: lowercase, ASCII-folded, alphanumeric (e.g. CSharp -> csharp). */
/** @param {string} name */
function slugify(name) {
  const ascii = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return ascii || 'cat';
}

/** Fallback monogram: 1–2 leading uppercase letters of the name. */
/** @param {string} name */
function defaultMonogram(name) {
  const letters = name.replace(/[^a-zA-Z]/g, '');
  return (letters.slice(0, letters.length >= 2 ? 2 : 1) || name.slice(0, 1)).toUpperCase();
}

/**
 * @param {Set<string>} discovered
 * @returns {Array<{ name: string, label: string, slug: string, monogram: string, accent: string, icon?: string, description?: string, order: number }>}
 */
function buildRegistry(discovered) {
  /** @type {Record<string, any>} */
  let config = {};
  if (existsSync(REGISTRY_FILE)) {
    try {
      const parsed = JSON.parse(readFileSync(REGISTRY_FILE, 'utf-8'));
      if (Array.isArray(parsed)) {
        for (const e of parsed) if (e?.name) config[e.name] = e;
      } else if (parsed && typeof parsed === 'object') {
        config = parsed.categories ? indexBy(parsed.categories) : parsed;
      }
    } catch {
      config = {};
    }
  }

  const names = new Set([...discovered, ...Object.keys(config)]);
  const registry = [...names].map((name, i) => {
    const c = config[name] ?? {};
    return {
      name,
      label: typeof c.label === 'string' ? c.label : name,
      slug: typeof c.slug === 'string' && c.slug.trim() ? c.slug.trim() : slugify(name),
      monogram:
        typeof c.monogram === 'string' && c.monogram.trim()
          ? c.monogram.trim()
          : defaultMonogram(name),
      accent: typeof c.accent === 'string' ? c.accent : hashAccent(name),
      icon: typeof c.icon === 'string' ? c.icon : undefined,
      description: typeof c.description === 'string' ? c.description : undefined,
      order: typeof c.order === 'number' ? c.order : 100 + i
    };
  });
  registry.sort((a, b) => (a.order !== b.order ? a.order - b.order : a.name.localeCompare(b.name)));
  return registry;
}

/** @param {any[]} arr */
function indexBy(arr) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const e of arr) if (e?.name) out[e.name] = e;
  return out;
}

// ---------------------------------------------------------------------------
// Meta + stats (ported from listDigestMeta / computeStats)
// ---------------------------------------------------------------------------
function buildMeta(index) {
  const { bydate } = index;
  return [...bydate.keys()]
    .sort((a, b) => (a < b ? 1 : -1)) // newest first
    .map((date) => {
      const day = bydate.get(date);
      let totalSubjects = 0;
      let totalSources = 0;
      /** @type {string[]} */
      const categories = [];
      if (day) {
        for (const [cat, raw] of day.entries()) {
          categories.push(cat);
          const c = buildEntryCounts(raw);
          totalSubjects += c.subjects;
          totalSources += c.sources;
        }
      }
      return {
        date,
        categories: categories.sort(),
        totalSubjects,
        totalSources
      };
    });
}

function computeStats(index, meta) {
  const { bydate } = index;
  /** @type {Map<string, { category: string, totalSubjects: number, totalSources: number, daysCovered: number }>} */
  const catMap = new Map();
  const timeline = [];
  let totalSubjects = 0;
  let totalSources = 0;

  for (const m of meta) {
    timeline.push({ date: m.date, subjects: m.totalSubjects, categories: m.categories.length });
    totalSubjects += m.totalSubjects;
    totalSources += m.totalSources;

    const day = bydate.get(m.date);
    if (!day) continue;
    for (const [cat, raw] of day.entries()) {
      const c = buildEntryCounts(raw);
      const existing =
        catMap.get(cat) ?? { category: cat, totalSubjects: 0, totalSources: 0, daysCovered: 0 };
      existing.totalSubjects += c.subjects;
      existing.totalSources += c.sources;
      existing.daysCovered += 1;
      catMap.set(cat, existing);
    }
  }

  timeline.sort((a, b) => (a.date < b.date ? -1 : 1)); // oldest first
  return {
    totalDigests: meta.length,
    totalSubjects,
    totalSources,
    firstDate: timeline[0]?.date ?? null,
    lastDate: timeline[timeline.length - 1]?.date ?? null,
    daysCovered: meta.length,
    categories: [...catMap.values()].sort((a, b) => b.totalSubjects - a.totalSubjects),
    timeline
  };
}

// ---------------------------------------------------------------------------
// Weekly reports (authored markdown, rendered like the former recaps)
// ---------------------------------------------------------------------------
/** Extract the ISO week id (e.g. 2026-W25) from a filename/path. */
/** @param {string} path */
function extractWeekId(path) {
  const m = path.match(WEEK_RE);
  return m ? `${m[1]}-W${m[2]}` : null;
}

/**
 * Parse `report/weekly/YYYY-Www_weekly.md` into rendered WeeklyReport objects.
 * Title = leading H1; body rendered to sanitized HTML. Optional frontmatter
 * (`week`, `range`) overrides the id / supplies the covered range. Newest first.
 */
async function buildWeeklies() {
  const weeklies = [];
  for (const file of listFiles(WEEKLY_DIR, /_weekly\.md$/)) {
    const { frontmatter, body } = readParsed(file);
    const id = strOf(frontmatter?.['week']) ?? extractWeekId(file);
    if (!id) continue;

    const { title, body: rest } = stripLeadingH1(body);
    const range = strOf(frontmatter?.['range']);
    let rangeStart;
    let rangeEnd;
    if (range) {
      const parts = range.split('/').map((s) => s.trim());
      if (parts.length === 2) {
        rangeStart = parts[0];
        rangeEnd = parts[1];
      }
    }

    weeklies.push({
      id,
      title: title ?? id,
      range,
      rangeStart,
      rangeEnd,
      html: await renderMarkdown(rest)
    });
  }
  weeklies.sort((a, b) => (a.id < b.id ? 1 : -1)); // newest first
  return weeklies;
}

/** @param {unknown} v */
function strOf(v) {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

// ---------------------------------------------------------------------------
// Morning briefing (eager) — derived from the most recent digest
// ---------------------------------------------------------------------------
const FR_FULL_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

/** Long French date, e.g. "vendredi 20 juin 2026" (mirrors date.util.formatDateFull). */
/** @param {string} iso */
function formatDateFull(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return FR_FULL_FMT.format(new Date(y, m - 1, d));
}

/**
 * Build the eager briefing from the newest digest: one takeaway bullet per
 * category that has a synthese, plus day-level totals and reading minutes.
 * @param {ReturnType<typeof buildIndex>} index
 * @param {ReturnType<typeof buildMeta>} meta
 * @param {ReturnType<typeof buildRegistry>} registry
 * @returns {Promise<import('../types').Briefing | null>}
 */
async function buildBriefing(index, meta, registry) {
  // meta is sorted newest-first.
  const latest = meta[0];
  if (!latest) return null;
  const rendered = await renderDigest(index, latest.date);
  const regByName = new Map(registry.map((c) => [c.name, c]));

  const bullets = [];
  let readingTotal = 0;
  for (const cat of rendered.categories) {
    if (!cat.syntheseHtml) continue;
    const text = firstSentence(cat.syntheseHtml);
    if (!text) continue;
    const reg = regByName.get(cat.category);
    bullets.push({
      category: cat.category,
      slug: reg?.slug ?? slugify(cat.category),
      label: reg?.label ?? cat.category,
      text
    });
    readingTotal += cat.syntheseMinutes ?? 0;
  }

  return {
    date: latest.date,
    title: formatDateFull(latest.date),
    categories: latest.categories,
    totalSubjects: latest.totalSubjects,
    totalSources: latest.totalSources,
    readingMinutes: readingTotal,
    bullets
  };
}

/**
 * Per-category subject distribution over each weekly's covered range.
 * Mutates each weekly in place with a `distribution` array (omitted when the
 * range is unknown or carries no subjects).
 * @param {ReturnType<typeof buildMeta>} meta
 * @param {ReturnType<typeof buildIndex>} index
 * @param {ReturnType<typeof buildRegistry>} registry
 * @param {Array<{ id: string, rangeStart?: string, rangeEnd?: string, distribution?: any }>} weeklies
 */
function attachWeeklyDistribution(meta, index, registry, weeklies) {
  const regByName = new Map(registry.map((c) => [c.name, c]));
  for (const w of weeklies) {
    if (!w.rangeStart || !w.rangeEnd) continue;
    /** @type {Map<string, number>} */
    const counts = new Map();
    for (const m of meta) {
      if (m.date < w.rangeStart || m.date > w.rangeEnd) continue;
      const day = index.bydate.get(m.date);
      if (!day) continue;
      for (const [cat, raw] of day.entries()) {
        const { subjects } = buildEntryCounts(raw);
        if (subjects > 0) counts.set(cat, (counts.get(cat) ?? 0) + subjects);
      }
    }
    if (counts.size === 0) continue;
    w.distribution = [...counts.entries()]
      .map(([category, count]) => ({
        category,
        slug: regByName.get(category)?.slug ?? slugify(category),
        count
      }))
      .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.category.localeCompare(b.category)));
  }
}

// ---------------------------------------------------------------------------
// Per-digest rendered payload
// ---------------------------------------------------------------------------
async function renderDigest(index, date) {
  const { bydate } = index;
  const day = bydate.get(date);

  const sorted = [...(day?.entries() ?? [])].sort(([a], [b]) => a.localeCompare(b));
  const categories = [];
  for (const [category, raw] of sorted) {
    let syntheseHtml;
    let detailHtml;
    let detailSnippets;
    let syntheseMinutes;
    let detailMinutes;
    if (raw.synthese) {
      syntheseHtml = await renderMarkdown(stripLeadingH1(raw.synthese.body).body);
      syntheseMinutes = readingMinutes(stripHtml(syntheseHtml), 1);
    }
    if (raw.detail) {
      const { body } = stripLeadingH1(raw.detail.body);
      const snippets = await splitDetailIntoSnippets(body);
      if (snippets.length > 0) {
        detailSnippets = snippets;
        const totalWords = snippets.reduce((n, s) => n + wordCount(stripHtml(s.bodyHtml)), 0);
        detailMinutes = Math.max(2, Math.round(totalWords / 200));
      } else {
        detailHtml = await renderMarkdown(body);
        detailMinutes = readingMinutes(stripHtml(detailHtml), 2);
      }
    }
    const tags = arrTags(raw.detail) ?? arrTags(raw.synthese);
    const importance = strField(raw.detail, 'importance') ?? strField(raw.synthese, 'importance');
    categories.push({
      category,
      syntheseHtml,
      detailHtml,
      detailSnippets,
      tags,
      importance,
      syntheseMinutes,
      detailMinutes
    });
  }

  return { date, categories };
}

function arrTags(file) {
  const v = file?.frontmatter?.['tags'];
  return Array.isArray(v) ? v.map(String) : undefined;
}
function strField(file, key) {
  const v = file?.frontmatter?.[key];
  return typeof v === 'string' ? v : undefined;
}

// ---------------------------------------------------------------------------
// Search index (ported from search() — emit raw stripped text, scored client-side)
// ---------------------------------------------------------------------------
function buildSearchIndex(index) {
  const { bydate } = index;
  const entries = [];
  for (const [date, day] of bydate.entries()) {
    for (const [category, raw] of day.entries()) {
      if (raw.synthese)
        entries.push({ date, scope: category, type: 'synthese', text: stripMd(raw.synthese.body) });
      if (raw.detail)
        entries.push({ date, scope: category, type: 'detail', text: stripMd(raw.detail.body) });
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------
async function emit() {
  const index = buildIndex();
  const meta = buildMeta(index);
  const stats = computeStats(index, meta);
  const registry = buildRegistry(index.categories);
  const weeklies = await buildWeeklies();
  attachWeeklyDistribution(meta, index, registry, weeklies);
  const briefing = await buildBriefing(index, meta, registry);
  const dates = meta.map((m) => m.date);

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  // Per-day rendered JSON (heavy, lazy-loaded).
  for (const date of dates) {
    const payload = await renderDigest(index, date);
    writeFileSync(join(OUT_DIR, `digest-${date}.json`), JSON.stringify(payload));
  }

  // loaders.ts — esbuild code-splits each day import.
  const loaderEntries = dates
    .map((d) => `  '${d}': () => import('./digest-${d}.json')`)
    .join(',\n');
  const loadersTs = `// AUTO-GENERATED by tools/build-data.mjs — do not edit.
import type { RenderedDigest } from '../types';

type Loader = () => Promise<{ default: RenderedDigest }>;

export const digestLoaders: Record<string, Loader> = {
${loaderEntries}
};
`;
  writeFileSync(join(OUT_DIR, 'loaders.ts'), loadersTs);

  // search-index.json (lazy)
  writeFileSync(join(OUT_DIR, 'search-index.json'), JSON.stringify(buildSearchIndex(index)));

  // index.ts — eager, lightweight metadata + stats + registry + weeklies.
  const indexTs = `// AUTO-GENERATED by tools/build-data.mjs — do not edit.
import type {
  DigestMeta,
  OverallStats,
  CategoryRegistryEntry,
  WeeklyReport,
  Briefing
} from '../types';

export const digests: DigestMeta[] = ${JSON.stringify(meta)};

export const stats: OverallStats = ${JSON.stringify(stats)};

export const categoryRegistry: CategoryRegistryEntry[] = ${JSON.stringify(registry)};

export const weeklies: WeeklyReport[] = ${JSON.stringify(weeklies)};

export const briefing: Briefing | null = ${JSON.stringify(briefing)};

export const totals = {
  digests: ${meta.length},
  subjects: ${stats.totalSubjects},
  sources: ${stats.totalSources}
};
`;
  writeFileSync(join(OUT_DIR, 'index.ts'), indexTs);

  console.log(
    `[build-data] ${meta.length} digests · ${stats.totalSubjects} subjects · ${stats.totalSources} sources · ` +
      `${registry.length} categories · ${weeklies.length} weeklies -> ${OUT_DIR}`
  );
}

// Exported pure helpers for unit testing (no filesystem side effects).
export {
  parseFrontmatter,
  splitDetailIntoSnippets,
  stripLeadingH1,
  stripMd,
  stripHtml,
  hashAccent,
  slugify,
  defaultMonogram,
  readingMinutes,
  firstSentence,
  extractWeekId,
  buildEntryCounts,
  buildRegistry,
  renderMarkdown,
  disposeHighlighter
};

/** Dispose the shared Shiki highlighter (lets test runners exit cleanly). */
function disposeHighlighter() {
  highlighterInstance?.dispose?.();
  highlighterInstance = null;
}

// Only run the generator when invoked directly (not when imported by tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  emit()
    .then(() => {
      // Release the shared Shiki highlighter so the process can exit promptly.
      highlighterInstance?.dispose?.();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
