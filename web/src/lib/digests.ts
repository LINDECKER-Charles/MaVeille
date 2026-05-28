import type {
  Digest,
  DigestMeta,
  CategoryEntry,
  SearchHit,
  CategoryStats,
  DayActivity
} from './types';

// All markdown is bundled at build time via Vite glob imports.
// Paths are relative to this file: src/lib/digests.ts → ../../../{Recap,Categorie}/...
const recapFiles = import.meta.glob('../../../Recap/*_recap.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const syntheseFiles = import.meta.glob('../../../Categorie/*/*_synthese.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const detailFiles = import.meta.glob('../../../Categorie/*/*_detail.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const DATE_RE = /(\d{4}-\d{2}-\d{2})/;
const SUBJECT_RE = /^## \d+\.\s+/gm;
const SOURCE_RE = /^\*\*Source\s*:\*\*/gm;

function extractDate(path: string): string | null {
  const m = path.match(DATE_RE);
  return m ? m[1] : null;
}

function extractCategory(path: string): string | null {
  const m = path.match(/\/Categorie\/([^/]+)\//);
  return m ? m[1] : null;
}

function countMatches(raw: string, re: RegExp): number {
  return raw.match(re)?.length ?? 0;
}

interface RawDayCategory {
  synthese?: string;
  detail?: string;
}

interface Index {
  recaps: Map<string, string>;
  bydate: Map<string, Map<string, RawDayCategory>>;
}

let cached: Index | null = null;

function buildIndex(): Index {
  if (cached) return cached;

  const recaps = new Map<string, string>();
  const bydate = new Map<string, Map<string, RawDayCategory>>();

  for (const [path, raw] of Object.entries(recapFiles)) {
    const date = extractDate(path);
    if (date) recaps.set(date, raw);
  }

  const ensureCat = (date: string, category: string): RawDayCategory => {
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

  for (const [path, raw] of Object.entries(syntheseFiles)) {
    const date = extractDate(path);
    const category = extractCategory(path);
    if (date && category) ensureCat(date, category).synthese = raw;
  }

  for (const [path, raw] of Object.entries(detailFiles)) {
    const date = extractDate(path);
    const category = extractCategory(path);
    if (date && category) ensureCat(date, category).detail = raw;
  }

  cached = { recaps, bydate };
  return cached;
}

function buildEntry(category: string, raw: RawDayCategory): CategoryEntry {
  const subjects = raw.detail ? countMatches(raw.detail, SUBJECT_RE) : 0;
  const sources = raw.detail ? countMatches(raw.detail, SOURCE_RE) : 0;
  return {
    category,
    synthese: raw.synthese,
    detail: raw.detail,
    subjects,
    sources
  };
}

/** All known digest dates, newest first. */
export function listDigestMeta(): DigestMeta[] {
  const { recaps, bydate } = buildIndex();
  const dates = new Set<string>([...recaps.keys(), ...bydate.keys()]);

  return [...dates]
    .sort((a, b) => (a < b ? 1 : -1))
    .map((date) => {
      const day = bydate.get(date);
      let totalSubjects = 0;
      let totalSources = 0;
      const categories: string[] = [];
      if (day) {
        for (const [cat, raw] of day.entries()) {
          categories.push(cat);
          const entry = buildEntry(cat, raw);
          totalSubjects += entry.subjects;
          totalSources += entry.sources;
        }
      }
      return {
        date,
        hasRecap: recaps.has(date),
        categories: categories.sort(),
        totalSubjects,
        totalSources
      };
    });
}

/** Full digest for a given date. Returns null if nothing exists. */
export function getDigest(date: string): Digest | null {
  const { recaps, bydate } = buildIndex();
  const recap = recaps.get(date);
  const day = bydate.get(date);

  if (!recap && !day) return null;

  const entries: CategoryEntry[] = [...(day?.entries() ?? [])]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, raw]) => buildEntry(category, raw));

  return { date, recap, entries };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

const SNIPPET_RADIUS = 80;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Strip basic Markdown noise for snippet display. */
function stripMd(md: string): string {
  return md
    .replace(/^---[\s\S]*?\n---\n/, '') // frontmatter
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*?(.+?)\*\*?/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ');
}

function buildSnippet(plain: string, query: string): { snippet: string; count: number } {
  const lower = plain.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return { snippet: '', count: 0 };

  let count = 0;
  let idx = 0;
  while ((idx = lower.indexOf(q, idx)) !== -1) {
    count++;
    idx += q.length;
  }
  if (count === 0) return { snippet: '', count: 0 };

  const first = lower.indexOf(q);
  const start = Math.max(0, first - SNIPPET_RADIUS);
  const end = Math.min(plain.length, first + q.length + SNIPPET_RADIUS);
  let slice = plain.slice(start, end);
  if (start > 0) slice = '… ' + slice;
  if (end < plain.length) slice = slice + ' …';

  const escaped = escapeHtml(slice);
  const re = new RegExp(escapeRegex(query), 'gi');
  const highlighted = escaped.replace(re, (m) => `<mark>${m}</mark>`);
  return { snippet: highlighted, count };
}

/** Full-text search across recaps, synthèses, and details. */
export function search(query: string): SearchHit[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { recaps, bydate } = buildIndex();
  const hits: SearchHit[] = [];

  for (const [date, raw] of recaps.entries()) {
    const plain = stripMd(raw);
    const { snippet, count } = buildSnippet(plain, trimmed);
    if (count > 0) {
      hits.push({ date, scope: 'recap', type: 'recap', snippet, score: count });
    }
  }

  for (const [date, day] of bydate.entries()) {
    for (const [category, raw] of day.entries()) {
      if (raw.synthese) {
        const { snippet, count } = buildSnippet(stripMd(raw.synthese), trimmed);
        if (count > 0) {
          hits.push({ date, scope: category, type: 'synthese', snippet, score: count });
        }
      }
      if (raw.detail) {
        const { snippet, count } = buildSnippet(stripMd(raw.detail), trimmed);
        if (count > 0) {
          hits.push({ date, scope: category, type: 'detail', snippet, score: count });
        }
      }
    }
  }

  return hits.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.score - a.score;
  });
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface OverallStats {
  totalDigests: number;
  totalSubjects: number;
  totalSources: number;
  firstDate: string | null;
  lastDate: string | null;
  daysCovered: number;
  categories: CategoryStats[];
  timeline: DayActivity[];
}

export function computeStats(): OverallStats {
  const meta = listDigestMeta();
  const { bydate } = buildIndex();

  const catMap = new Map<string, CategoryStats>();
  const timeline: DayActivity[] = [];
  let totalSubjects = 0;
  let totalSources = 0;

  for (const m of meta) {
    timeline.push({
      date: m.date,
      subjects: m.totalSubjects,
      categories: m.categories.length
    });
    totalSubjects += m.totalSubjects;
    totalSources += m.totalSources;

    const day = bydate.get(m.date);
    if (!day) continue;
    for (const [cat, raw] of day.entries()) {
      const entry = buildEntry(cat, raw);
      const existing = catMap.get(cat) ?? {
        category: cat,
        totalSubjects: 0,
        totalSources: 0,
        daysCovered: 0
      };
      existing.totalSubjects += entry.subjects;
      existing.totalSources += entry.sources;
      existing.daysCovered += 1;
      catMap.set(cat, existing);
    }
  }

  // Oldest first for the timeline (left-to-right reading)
  timeline.sort((a, b) => (a.date < b.date ? -1 : 1));

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
