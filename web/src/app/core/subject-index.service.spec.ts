import { TestBed } from '@angular/core/testing';
import { SubjectIndexService, subjectKey } from './subject-index.service';
import type { SubjectEntry } from '../data/types';

function entry(partial: Partial<SubjectEntry> & { title: string; date: string }): SubjectEntry {
  return {
    category: 'IA',
    slug: 'ia',
    mono: 'AI',
    index: '1',
    readingMinutes: 3,
    ...partial
  };
}

describe('SubjectIndexService', () => {
  let service: SubjectIndexService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubjectIndexService);
    service.all.set([
      entry({ title: 'Angular 22 GA — Signal Forms', date: '2026-06-20' }),
      entry({ title: 'Migrer vers Signal Forms', date: '2026-06-12', index: '2' }),
      entry({ title: 'Déjà vu : accents et recherche', date: '2026-06-01', index: '3' })
    ]);
  });

  it('exige au moins un mot', () => {
    expect(service.search('')).toEqual([]);
    expect(service.search('   ')).toEqual([]);
  });

  it('exige que chaque mot de la requête apparaisse', () => {
    expect(service.search('signal forms').length).toBe(2);
    expect(service.search('signal absent').length).toBe(0);
  });

  it('remonte le titre qui commence par la requête', () => {
    const hits = service.search('migrer');

    expect(hits[0].title).toBe('Migrer vers Signal Forms');
  });

  it('ignore la casse et les accents', () => {
    expect(service.search('deja vu').length).toBe(1);
  });

  it('départage les scores égaux par date décroissante', () => {
    const hits = service.search('signal forms');

    expect(hits[0].date).toBe('2026-06-20');
    expect(hits[1].date).toBe('2026-06-12');
  });

  it('respecte la limite demandée', () => {
    expect(service.search('signal forms', 1).length).toBe(1);
  });
});

describe('subjectKey', () => {
  it('assemble le slug et le numéro', () => {
    expect(subjectKey('ia', '3')).toBe('ia-3');
  });
});
