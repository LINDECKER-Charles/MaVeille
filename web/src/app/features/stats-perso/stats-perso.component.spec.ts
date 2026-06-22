import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StatsPersoComponent } from './stats-perso.component';
import { DigestStore } from '../../core/digest-store.service';
import { ReadStateService } from '../../core/read-state.service';

/**
 * Unit spec for the "Mes stats" page. Exercises the real {@link DigestStore}
 * (generated metadata) crossed with the real {@link ReadStateService}, seeding
 * read state through the service API and asserting on the derived computed
 * signals + the rendered template.
 */
describe('StatsPersoComponent', () => {
  let fixture: ComponentFixture<StatsPersoComponent>;
  let component: StatsPersoComponent;
  let store: DigestStore;
  let readState: ReadStateService;

  /** First `n` real digest dates, newest first (digests are pre-sorted). */
  function recentDates(n: number): string[] {
    return store.digests.slice(0, n).map((d) => d.date);
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [StatsPersoComponent],
      providers: [provideRouter([])]
    });

    fixture = TestBed.createComponent(StatsPersoComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(DigestStore);
    readState = TestBed.inject(ReadStateService);
  });

  afterEach(() => localStorage.clear());

  it('has digests to test against', () => {
    expect(store.digests.length).toBeGreaterThan(0);
  });

  describe('empty state', () => {
    it('renders the empty-state block and a zeroed KPI when nothing is read', () => {
      fixture.detectChanges();

      expect(component.readCount()).toBe(0);
      expect(component.progressPct()).toBe(0);
      expect(component.readDigests()).toEqual([]);
      expect(component.latestRead()).toBeNull();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.empty-state')).not.toBeNull();
      expect(el.querySelector('.read-list')).toBeNull();
      expect(text()).toContain("Rien à afficher pour l'instant");
    });

    it('"Restants" equals the full total when nothing is read', () => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const kpiNums = Array.from(el.querySelectorAll('.kpi-num')).map((n) => n.textContent?.trim());
      // KPIs: [readCount / total], [progress%], [restants], [dernier lu]
      expect(kpiNums[0]).toContain('0');
      expect(kpiNums[0]).toContain(String(component.total));
      expect(kpiNums[1]).toBe('0%');
      expect(kpiNums[2]).toBe(String(component.total));
    });
  });

  describe('with read digests', () => {
    let seeded: string[];

    beforeEach(() => {
      seeded = recentDates(3);
      seeded.forEach((d) => readState.setRead(d, true));
      fixture.detectChanges();
    });

    it('reflects the read count, percentage and remaining in the computed signals', () => {
      const total = component.total;
      const n = seeded.length;

      expect(component.readCount()).toBe(n);
      expect(component.progressPct()).toBe(Math.round((n / total) * 100));
      expect(total - component.readCount()).toBe(total - n);
    });

    it('lists exactly the seeded dates, newest first', () => {
      const expected = [...seeded].sort((a, b) => b.localeCompare(a));
      expect(component.readDigests().map((d) => d.date)).toEqual(expected);
      expect(component.latestRead()?.date).toBe(expected[0]);
    });

    it('renders the read list (and not the empty state) with one item per read digest', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.empty-state')).toBeNull();

      const items = el.querySelectorAll('.read-list .read-item');
      expect(items.length).toBe(seeded.length);

      // Each item links to its digest page.
      const hrefs = Array.from(el.querySelectorAll<HTMLAnchorElement>('.read-list .read-link')).map(
        (a) => a.getAttribute('href')
      );
      const expected = [...seeded].sort((a, b) => b.localeCompare(a));
      expect(hrefs).toEqual(expected.map((d) => `/digest/${d}`));
    });

    it('renders the read-count KPI matching the seeded total', () => {
      const el = fixture.nativeElement as HTMLElement;
      const firstKpi = el.querySelector('.kpi-num')?.textContent?.trim() ?? '';
      expect(firstKpi).toContain(String(seeded.length));
    });
  });

  describe('reactivity', () => {
    it('updates the derived state when a digest is toggled after init', () => {
      fixture.detectChanges();
      expect(component.readCount()).toBe(0);

      const [date] = recentDates(1);
      // Toggle through the service to mimic an external change.
      readState.toggle(date);
      fixture.detectChanges();

      expect(component.readCount()).toBe(1);
      expect(component.readDigests().map((d) => d.date)).toEqual([date]);
      expect((fixture.nativeElement as HTMLElement).querySelector('.read-list')).not.toBeNull();

      // Toggle off again -> back to empty state.
      readState.toggle(date);
      fixture.detectChanges();
      expect(component.readCount()).toBe(0);
      expect((fixture.nativeElement as HTMLElement).querySelector('.empty-state')).not.toBeNull();
    });

    it('toggleRead() on the component flips the underlying service state', () => {
      fixture.detectChanges();
      const [date] = recentDates(1);

      component.toggleRead(date);
      fixture.detectChanges();
      expect(readState.isRead(date)).toBeTrue();
      expect(component.readCount()).toBe(1);
    });
  });

  describe('reset', () => {
    it('clears the list and returns to the empty state', () => {
      recentDates(2).forEach((d) => readState.setRead(d, true));
      fixture.detectChanges();
      expect(component.readCount()).toBe(2);

      readState.reset();
      fixture.detectChanges();

      expect(component.readCount()).toBe(0);
      expect(component.readDigests()).toEqual([]);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.read-list')).toBeNull();
      expect(el.querySelector('.empty-state')).not.toBeNull();
    });

    it('component.reset() is a no-op (no confirm) when nothing is read', () => {
      const confirmSpy = spyOn(window, 'confirm');
      fixture.detectChanges();

      component.reset();

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(component.readCount()).toBe(0);
    });

    it('component.reset() clears read state when confirmed', () => {
      const confirmSpy = spyOn(window, 'confirm').and.returnValue(true);
      recentDates(2).forEach((d) => readState.setRead(d, true));
      fixture.detectChanges();

      component.reset();
      fixture.detectChanges();

      expect(confirmSpy).toHaveBeenCalled();
      expect(component.readCount()).toBe(0);
    });

    it('component.reset() keeps read state when the confirm is dismissed', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      recentDates(2).forEach((d) => readState.setRead(d, true));
      fixture.detectChanges();

      component.reset();
      fixture.detectChanges();

      expect(component.readCount()).toBe(2);
    });
  });
});
