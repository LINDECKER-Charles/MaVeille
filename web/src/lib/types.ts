export type Category = string;

export interface CategoryEntry {
  category: Category;
  synthese?: string; // raw markdown
  detail?: string;
  subjects: number; // count of `## N. ...` headings in detail
  sources: number; // count of `**Source :**` lines
}

export interface DigestMeta {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** Whether a global recap markdown exists */
  hasRecap: boolean;
  /** Categories present for the day */
  categories: Category[];
  /** Total subject count for the day, across all categories */
  totalSubjects: number;
  /** Total unique sources for the day */
  totalSources: number;
}

export interface Digest {
  date: string;
  recap?: string; // raw markdown
  entries: CategoryEntry[];
}

export interface SearchHit {
  date: string;
  scope: 'recap' | Category;
  type: 'recap' | 'synthese' | 'detail';
  snippet: string; // contains <mark> tags around matches
  score: number; // raw match count
}

export interface CategoryStats {
  category: Category;
  totalSubjects: number;
  totalSources: number;
  daysCovered: number;
}

export interface DayActivity {
  date: string;
  subjects: number;
  categories: number;
}
