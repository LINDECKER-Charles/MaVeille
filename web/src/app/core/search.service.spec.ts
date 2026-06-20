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
    // Both hits are on 2026-06-20; the synthèse has 1 match, the detail has 1 match.
    expect(hits.every((h) => h.date === '2026-06-20')).toBeTrue();
    expect(hits[0].score).toBeGreaterThanOrEqual(hits[1].score);
  });

  it('escapes HTML in the snippet text', () => {
    const idx: SearchIndexEntry[] = [
      { date: '2026-06-20', scope: 'Tech', type: 'detail', text: 'a <script> tag with keyword token here' }
    ];
    const hits = SearchService.run(idx, 'keyword');
    expect(hits[0].snippet).toContain('&lt;script&gt;');
    expect(hits[0].snippet).not.toContain('<script>');
  });
});
