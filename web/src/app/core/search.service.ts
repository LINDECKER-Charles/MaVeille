import { Injectable } from '@angular/core';
import type { SearchHit, SearchIndexEntry } from '../data/types';

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

/**
 * Builds the `<mark>`-highlighted snippet around the first hit and returns the
 * occurrence count plus the index of the first match (for position scoring).
 */
function buildSnippet(
  plain: string,
  query: string
): { snippet: string; count: number; first: number } {
  const lower = plain.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return { snippet: '', count: 0, first: -1 };

  let count = 0;
  let idx = 0;
  while ((idx = lower.indexOf(q, idx)) !== -1) {
    count++;
    idx += q.length;
  }
  if (count === 0) return { snippet: '', count: 0, first: -1 };

  const first = lower.indexOf(q);
  const start = Math.max(0, first - SNIPPET_RADIUS);
  const end = Math.min(plain.length, first + q.length + SNIPPET_RADIUS);
  let slice = plain.slice(start, end);
  if (start > 0) slice = '… ' + slice;
  if (end < plain.length) slice = slice + ' …';

  const escaped = escapeHtml(slice);
  const re = new RegExp(escapeRegex(query), 'gi');
  const highlighted = escaped.replace(re, (m) => `<mark>${m}</mark>`);
  return { snippet: highlighted, count, first };
}

/**
 * Length of the leading "title" segment of an index entry's flat text. Each
 * synthese/detail blob starts with its heading/first line, so a hit landing in
 * that prefix is treated as a title match.
 */
function titleLength(text: string): number {
  const nl = text.indexOf('\n');
  const stop = nl === -1 ? text.length : nl;
  return Math.min(stop, 90);
}

/** Lazily loads the search index on first query, then searches client-side. */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private index: SearchIndexEntry[] | null = null;
  private loading: Promise<SearchIndexEntry[]> | null = null;

  /** Pre-load the index (so the first search is instant). */
  async preload(): Promise<void> {
    await this.ensureIndex();
  }

  private async ensureIndex(): Promise<SearchIndexEntry[]> {
    if (this.index) return this.index;
    if (!this.loading) {
      this.loading = import('../data/generated/search-index.json').then((m) => {
        this.index = (m.default ?? m) as unknown as SearchIndexEntry[];
        return this.index;
      });
    }
    return this.loading;
  }

  /** Recherche plein texte classée, sur l'index chargé à la demande. */
  async search(query: string): Promise<SearchHit[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    const index = await this.ensureIndex();
    return SearchService.run(index, trimmed);
  }

  /**
   * Pure ranking over a provided index (extracted for testability).
   *
   * Score = occurrences
   *   + 10 if the first hit lands in the entry title (leading line)
   *   +  3 when the hit appears in a `synthese` (higher-signal summary)
   *   +  position bonus `(1000 - first) / 1000` favouring early matches.
   */
  static run(index: readonly SearchIndexEntry[], query: string): SearchHit[] {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const hits: SearchHit[] = [];
    for (const e of index) {
      const { snippet, count, first } = buildSnippet(e.text, trimmed);
      if (count === 0) continue;

      let score = count;
      if (first >= 0 && first < titleLength(e.text)) score += 10;
      if (e.type === 'synthese') score += 3;
      if (first >= 0) score += Math.max(0, (1000 - first) / 1000);

      hits.push({ date: e.date, scope: e.scope, type: e.type, snippet, score });
    }

    return hits.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.score - a.score;
    });
  }
}
