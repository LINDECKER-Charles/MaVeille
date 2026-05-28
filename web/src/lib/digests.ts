import type { Digest, DigestMeta, CategoryEntry } from './types';

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

/** Extract YYYY-MM-DD from a file path. Returns null if absent. */
function extractDate(path: string): string | null {
  const m = path.match(DATE_RE);
  return m ? m[1] : null;
}

/** Extract the category directory name from a /Categorie/<cat>/... path. */
function extractCategory(path: string): string | null {
  const m = path.match(/\/Categorie\/([^/]+)\//);
  return m ? m[1] : null;
}

interface Index {
  recaps: Map<string, string>;
  bydate: Map<string, Map<string, { synthese?: string; detail?: string }>>;
}

let cached: Index | null = null;

function buildIndex(): Index {
  if (cached) return cached;

  const recaps = new Map<string, string>();
  const bydate = new Map<string, Map<string, { synthese?: string; detail?: string }>>();

  for (const [path, raw] of Object.entries(recapFiles)) {
    const date = extractDate(path);
    if (date) recaps.set(date, raw);
  }

  const ensureCat = (date: string, category: string) => {
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

/** All known digest dates, newest first. */
export function listDigestMeta(): DigestMeta[] {
  const { recaps, bydate } = buildIndex();
  const dates = new Set<string>([...recaps.keys(), ...bydate.keys()]);

  return [...dates]
    .sort((a, b) => (a < b ? 1 : -1))
    .map((date) => ({
      date,
      hasRecap: recaps.has(date),
      categories: [...(bydate.get(date)?.keys() ?? [])].sort()
    }));
}

/** Full digest for a given date. Returns null if nothing exists. */
export function getDigest(date: string): Digest | null {
  const { recaps, bydate } = buildIndex();
  const recap = recaps.get(date);
  const day = bydate.get(date);

  if (!recap && !day) return null;

  const entries: CategoryEntry[] = [...(day?.entries() ?? [])]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, files]) => ({
      category,
      synthese: files.synthese,
      detail: files.detail
    }));

  return { date, recap, entries };
}
