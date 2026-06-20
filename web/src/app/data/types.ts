// Shared data contract between the build-time generator and the Angular app.

export type Category = string;

export interface DigestMeta {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  categories: Category[];
  totalSubjects: number;
  totalSources: number;
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

/** Authored weekly report (eagerly rendered to HTML by the generator). */
export interface WeeklyReport {
  /** ISO week id, e.g. 2026-W25 */
  id: string;
  title: string;
  /** Optional covered range from frontmatter, e.g. 2026-06-15/2026-06-21 */
  range?: string;
  rangeStart?: string;
  rangeEnd?: string;
  /** Sanitized HTML rendered from the markdown body (H1 stripped). */
  html: string;
  /** Optional per-category subject distribution over the covered range. */
  distribution?: { category: Category; slug: string; count: number }[];
}

/**
 * Eager morning briefing derived from the most recent digest. Surfaces a one-line
 * takeaway per category alongside day-level totals and synthese reading time.
 */
export interface Briefing {
  /** ISO date (YYYY-MM-DD) of the source digest. */
  date: string;
  /** Long French date, e.g. "vendredi 20 juin 2026". */
  title: string;
  categories: Category[];
  totalSubjects: number;
  totalSources: number;
  /** Sum of per-category synthese reading minutes. */
  readingMinutes: number;
  bullets: { category: Category; slug: string; label: string; text: string }[];
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
