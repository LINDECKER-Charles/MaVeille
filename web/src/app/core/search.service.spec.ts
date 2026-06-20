import { SearchService } from './search.service';
import type { SearchIndexEntry } from '../data/types';

const INDEX: SearchIndexEntry[] = [
  { date: '2026-06-20', scope: 'Angular', type: 'synthese', text: 'Angular 22 introduit les Signal Forms.' },
  { date: '2026-06-20', scope: 'IA', type: 'detail', text: 'DeepSeek V4 et les modèles MoE. Angular cité une fois.' },
  { date: '2026-06-19', scope: 'Tech', type: 'synthese', text: 'Rien sur ce mot-clé précis ici.' }
];

describe('SearchService.run', () => {
  it('returns nothing for queries shorter than 2 chars', () => {
    expect(SearchService.run(INDEX, 'a')).toEqual([]);
  });

  it('matches case-insensitively and highlights with <mark>', () => {
    const hits = SearchService.run(INDEX, 'angular');
    expect(hits.length).toBe(2);
    expect(hits[0].snippet).toContain('<mark>');
  });

  it('ranks by date desc, then by score desc', () => {
    const hits = SearchService.run(INDEX, 'angular');
    expect(hits.every((h) => h.date === '2026-06-20')).toBeTrue();
    expect(hits[0].score).toBeGreaterThanOrEqual(hits[1].score);
  });

  it('boosts a title (leading) match over a late, off-title hit', () => {
    const hits = SearchService.run(INDEX, 'angular');
    // Title + synthese match (entry 0) must outrank the late detail hit (entry 1).
    expect(hits[0].scope).toBe('Angular');
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
  });

  it('escapes HTML in the snippet text', () => {
    const idx: SearchIndexEntry[] = [
      { date: '2026-06-20', scope: 'Tech', type: 'detail', text: 'a <script> tag with keyword token here' }
    ];
    const hits = SearchService.run(idx, 'keyword');
    expect(hits[0].snippet).toContain('&lt;script&gt;');
    expect(hits[0].snippet).not.toContain('<script>');
  });

  it('filters by category scope', () => {
    const hits = SearchService.run(INDEX, 'angular', { category: 'IA' });
    expect(hits.length).toBe(1);
    expect(hits[0].scope).toBe('IA');
  });

  it('filters by type scope', () => {
    const hits = SearchService.run(INDEX, 'angular', { type: 'detail' });
    expect(hits.length).toBe(1);
    expect(hits[0].type).toBe('detail');
  });

  it('treats null scope fields as no filter', () => {
    const hits = SearchService.run(INDEX, 'angular', { category: null, type: null });
    expect(hits.length).toBe(2);
  });
});

describe('SearchService.list', () => {
  it('returns nothing without any scope', () => {
    expect(SearchService.list(INDEX, {})).toEqual([]);
  });

  it('lists entries for a category scope, newest first', () => {
    const hits = SearchService.list(INDEX, { category: 'Angular' });
    expect(hits.length).toBe(1);
    expect(hits[0].scope).toBe('Angular');
  });

  it('lists entries for a type scope', () => {
    const hits = SearchService.list(INDEX, { type: 'synthese' });
    expect(hits.length).toBe(2);
    expect(hits.every((h) => h.type === 'synthese')).toBeTrue();
  });
});
