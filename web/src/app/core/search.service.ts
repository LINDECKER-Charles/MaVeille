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

/** Ports the SvelteKit `buildSnippet` + `search` ranking exactly. */
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

  async search(query: string): Promise<SearchHit[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    const index = await this.ensureIndex();
    return SearchService.run(index, trimmed);
  }

  /** Pure ranking over a provided index (extracted for testability). */
  static run(index: readonly SearchIndexEntry[], query: string): SearchHit[] {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const hits: SearchHit[] = [];
    for (const e of index) {
      const { snippet, count } = buildSnippet(e.text, trimmed);
      if (count > 0) {
        hits.push({ date: e.date, scope: e.scope, type: e.type, snippet, score: count });
      }
    }
    return hits.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.score - a.score;
    });
  }
}
