import { TestBed } from '@angular/core/testing';
import { ReadStateService } from './read-state.service';

describe('ReadStateService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function create(): ReadStateService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(ReadStateService);
  }

  it('starts with nothing read', () => {
    const s = create();
    expect(s.isRead('2026-06-20')).toBeFalse();
    expect(s.count()).toBe(0);
  });

  it('toggles read state and persists it', () => {
    const s = create();
    s.toggle('2026-06-20');
    expect(s.isRead('2026-06-20')).toBeTrue();
    expect(s.count()).toBe(1);
    expect(JSON.parse(localStorage.getItem('veille-read-digests')!)).toEqual(['2026-06-20']);

    s.toggle('2026-06-20');
    expect(s.isRead('2026-06-20')).toBeFalse();
    expect(JSON.parse(localStorage.getItem('veille-read-digests')!)).toEqual([]);
  });

  it('setRead is idempotent', () => {
    const s = create();
    s.setRead('2026-06-20', true);
    s.setRead('2026-06-20', true);
    expect(s.count()).toBe(1);
    s.setRead('2026-06-20', false);
    s.setRead('2026-06-20', false);
    expect(s.count()).toBe(0);
  });

  it('hydrates from persisted storage', () => {
    localStorage.setItem('veille-read-digests', JSON.stringify(['2026-06-18', '2026-06-19']));
    const s = create();
    expect(s.isRead('2026-06-18')).toBeTrue();
    expect(s.isRead('2026-06-19')).toBeTrue();
    expect(s.isRead('2026-06-20')).toBeFalse();
    expect(s.count()).toBe(2);
  });

  it('ignores corrupt storage', () => {
    localStorage.setItem('veille-read-digests', '{not json');
    const s = create();
    expect(s.count()).toBe(0);
  });

  it('reset forgets everything', () => {
    const s = create();
    s.toggle('2026-06-20');
    s.reset();
    expect(s.count()).toBe(0);
    expect(JSON.parse(localStorage.getItem('veille-read-digests')!)).toEqual([]);
  });
});
