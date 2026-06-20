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
}

export interface RenderedCategory {
  category: Category;
  syntheseHtml?: string;
  detailHtml?: string;
  detailSnippets?: DetailSnippet[];
  tags?: string[];
  importance?: string;
}

export interface RenderedDigest {
  date: string;
  categories: RenderedCategory[];
}

export interface CategoryRegistryEntry {
  name: string;
  label: string;
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
