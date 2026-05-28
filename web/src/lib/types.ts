export type Category = string;

export interface CategoryEntry {
  category: Category;
  synthese?: string; // raw markdown
  detail?: string;
}

export interface DigestMeta {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** Whether a global recap markdown exists */
  hasRecap: boolean;
  /** Categories present for the day */
  categories: Category[];
}

export interface Digest {
  date: string;
  recap?: string; // raw markdown
  entries: CategoryEntry[];
}
