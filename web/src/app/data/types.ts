// Shared data contract between the build-time generator and the Angular app.

export type Category = string;

export interface DigestMeta {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  categories: Category[];
  totalSubjects: number;
  totalSources: number;
  /** Sum of the day's per-category detail reading minutes. */
  readingMinutes: number;
  /**
   * Generated one-line lead for the day: first sentence of the synthese of the
   * category carrying the most subjects. Absent when no synthese was authored.
   */
  headline?: string;
  /**
   * Key of the day's first subject (`<slug>-<index>`), so any screen can deep
   * link into the reader without loading the day's payload. Absent on a day
   * that carries only syntheses.
   */
  firstSubject?: string;
}

/**
 * One subject of one day, flattened across every category — the row model of
 * the "tous les sujets" feed and of the command palette. Emitted as a lazily
 * loaded `subject-index.json` so it never weighs on the initial bundle.
 */
export interface SubjectEntry {
  /** ISO date (YYYY-MM-DD) of the digest the subject belongs to. */
  date: string;
  category: Category;
  slug: string;
  /** Short visual badge of the category, e.g. `AI`. */
  mono: string;
  /** Position of the subject inside the day's detail, e.g. `1`. */
  index: string;
  title: string;
  source?: string;
  sourceUrl?: string;
  /** Host of `sourceUrl`, `www.` stripped — e.g. `huggingface.co`. */
  domain?: string;
  readingMinutes: number;
}

export interface DayActivity {
  date: string;
  subjects: number;
  categories: number;
}

export interface CategoryStats {
  category: Category;
  totalSubjects: number;
  totalSources: number;
  daysCovered: number;
}

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

export interface DetailSnippet {
  index: string;
  title: string;
  source?: string;
  sourceUrl?: string;
  date?: string;
  bodyHtml: string;
  preview?: string;
  /** Estimated reading time in minutes (words of stripped bodyHtml / 200, floor 2). */
  readingMinutes: number;
}

export interface RenderedCategory {
  category: Category;
  syntheseHtml?: string;
  detailHtml?: string;
  detailSnippets?: DetailSnippet[];
  tags?: string[];
  importance?: string;
  /** Estimated reading time of the synthese (words / 200, floor 1). */
  syntheseMinutes?: number;
  /** Estimated reading time of the full detail (words / 200, floor 2). */
  detailMinutes?: number;
}

export interface RenderedDigest {
  date: string;
  categories: RenderedCategory[];
}

export interface CategoryRegistryEntry {
  name: string;
  label: string;
  /** URL/CSS-safe identifier (config, or slugify(name)). Drives --cat-<slug> tokens. */
  slug: string;
  /** Short visual badge (config, or 1–2 leading uppercase letters of name). */
  monogram: string;
  accent: string;
  icon?: string;
  description?: string;
  order: number;
}

/**
 * Authored weekly report — metadata only. The rendered body is heavy (~30 kB
 * each) and only ever read on one page, so it lives in a lazily loaded
 * `weekly-<id>.json` instead of the eager index.
 */
export interface WeeklyReport {
  /** ISO week id, e.g. 2026-W25 */
  id: string;
  title: string;
  /** Optional covered range from frontmatter, e.g. 2026-06-15/2026-06-21 */
  range?: string;
  /** Monday of the ISO week — from frontmatter, else derived from `id`. */
  rangeStart?: string;
  /** Sunday of the ISO week — from frontmatter, else derived from `id`. */
  rangeEnd?: string;
  /** First sentence of the body, for the list card. */
  excerpt?: string;
  /** Optional per-category subject distribution over the covered range. */
  distribution?: { category: Category; slug: string; count: number }[];
}

/** Lazily loaded body of one weekly report. */
export interface WeeklyBody {
  id: string;
  /** Sanitized HTML rendered from the markdown body (H1 stripped). */
  html: string;
}

/** Search index entry shape (search-index.json). */
export interface SearchIndexEntry {
  date: string;
  scope: Category;
  type: 'synthese' | 'detail';
  text: string;
}

/** Client-side search result (built from the index). */
export interface SearchHit {
  date: string;
  scope: Category;
  type: 'synthese' | 'detail';
  snippet: string; // contains <mark> tags
  score: number;
}
