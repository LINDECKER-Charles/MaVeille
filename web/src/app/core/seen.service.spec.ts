import { TestBed } from '@angular/core/testing';
import { SeenService } from './seen.service';

describe('SeenService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function create(): SeenService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(SeenService);
  }

  it('treats every digest as new on first visit', () => {
    const s = create();
    expect(s.isNew('2026-06-20')).toBeTrue();
    expect(s.countNew(['2026-06-19', '2026-06-20'])).toBe(2);
  });

  it('acknowledges a date and persists it', () => {
    const s = create();
    s.acknowledge('2026-06-20');
    expect(localStorage.getItem('veille-last-seen-date')).toBe('2026-06-20');
    expect(s.isNew('2026-06-20')).toBeFalse();
    expect(s.isNew('2026-06-21')).toBeTrue();
  });

  it('never moves the marker backwards', () => {
    const s = create();
    s.acknowledge('2026-06-20');
    s.acknowledge('2026-06-10');
    expect(localStorage.getItem('veille-last-seen-date')).toBe('2026-06-20');
  });

  it('counts only strictly newer dates', () => {
    const s = create();
    s.acknowledge('2026-06-18');
    expect(s.countNew(['2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20'])).toBe(2);
  });

  it('reset forgets the marker', () => {
    const s = create();
    s.acknowledge('2026-06-20');
    s.reset();
    expect(localStorage.getItem('veille-last-seen-date')).toBeNull();
    expect(s.isNew('2026-06-01')).toBeTrue();
  });
});
