import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild,
  viewChildren
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title, Meta, DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DigestStore } from '../../core/digest-store.service';
import { SearchService } from '../../core/search.service';
import { SeenService } from '../../core/seen.service';
import { FrDatePipe } from '../../core/date.pipe';
import { DigestCardComponent } from './digest-card.component';
import { SearchBoxComponent } from './search-box.component';
import { SparklineComponent } from '../../shared/sparkline.component';
import type { SearchHit } from '../../data/types';

const RECENT_KEY = 'veille-recent-searches';
const RECENT_MAX = 6;
const SPARK_POINTS = 7;

type TypeFilter = 'synthese' | 'detail';

interface KpiCard {
  label: string;
  value: number;
  delta: number;
  spark: number[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FrDatePipe, DigestCardComponent, SearchBoxComponent, SparklineComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  readonly store = inject(DigestStore);
  readonly seen = inject(SeenService);
  private readonly searchService = inject(SearchService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly searchBox = viewChild(SearchBoxComponent);
  private readonly feedTop = viewChild<ElementRef<HTMLElement>>('feedTop');
  private readonly resultRefs = viewChildren<ElementRef<HTMLElement>>('resultItem');

  readonly digests = this.store.digests;
  readonly totals = this.store.totals;
  readonly briefing = this.store.briefing;
  readonly accentColor = 'var(--cat-ia)';

  // --- search state ----------------------------------------------------------
  readonly query = signal('');
  readonly hits = signal<SearchHit[]>([]);
  readonly catFilter = signal<string | null>(null);
  readonly typeFilter = signal<TypeFilter | null>(null);
  readonly recentSearches = signal<string[]>([]);
  readonly activeResult = signal(-1);

  readonly hasFilter = computed(() => this.catFilter() !== null || this.typeFilter() !== null);
  /** Search mode = a query of >=2 chars OR an active filter scope. */
  readonly isSearching = computed(() => this.query().trim().length >= 2 || this.hasFilter());
  readonly resultCount = computed(() => this.hits().length);

  // --- KPI computeds ----------------------------------------------------------
  /** Last N timeline points of subjects/day (oldest -> newest). */
  private readonly recentTimeline = computed(() =>
    this.store.stats.timeline.slice(-SPARK_POINTS)
  );

  /** subjects/day over the last N days (oldest -> newest), shared by all KPI sparks. */
  private readonly subjectsSpark = computed(() => this.recentTimeline().map((d) => d.subjects));

  readonly kpis = computed<KpiCard[]>(() => {
    const spark = this.subjectsSpark();
    // Delta = most recent timeline day vs the one before (subjects/day).
    const last = spark.length ? spark[spark.length - 1] : 0;
    const prev = spark.length > 1 ? spark[spark.length - 2] : 0;
    const delta = last - prev;
    return [
      { label: 'Digests', value: this.totals.digests, delta: spark.length ? 1 : 0, spark },
      { label: 'Sujets suivis', value: this.totals.subjects, delta, spark },
      { label: 'Sources croisées', value: this.totals.sources, delta: this.sourcesDelta(), spark }
    ];
  });

  private sourcesDelta(): number {
    const d = this.store.digests; // newest first
    if (d.length < 2) return d.length ? d[0].totalSources : 0;
    return d[0].totalSources - d[1].totalSources;
  }

  readonly newCount = computed(() => this.seen.countNew(this.digests.map((d) => d.date)));

  // --- discovery data ---------------------------------------------------------
  /** Frequent tags: derived from the category registry (no per-tag data in index). */
  readonly frequentTags = computed(() =>
    this.store.registry.map((c) => ({ label: c.slug, name: c.name }))
  );

  ngOnInit(): void {
    this.title.setTitle('Veille — Aujourd’hui');
    this.meta.updateTag({
      name: 'description',
      content: `Veille tech quotidienne — ${this.totals.digests} digests, ${this.totals.subjects} sujets analysés.`
    });

    if (!this.isBrowser) return;

    this.searchService.preload();
    this.loadRecent();

    const params = this.route.snapshot.queryParamMap;
    const initial = params.get('q') ?? '';
    if (initial) {
      this.query.set(initial);
      this.searchBox()?.setValue(initial);
      void this.runSearch();
    }

    if (params.get('focus') === 'search') {
      // Focus the search box, then strip ?focus from the URL (keep ?q).
      queueMicrotask(() => this.searchBox()?.focus());
      this.router.navigate([], {
        queryParams: { focus: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  isNew(date: string): boolean {
    return this.seen.isNew(date);
  }

  // --- search handlers --------------------------------------------------------
  onQueryChange(q: string): void {
    this.query.set(q);
    this.activeResult.set(-1);
    this.syncUrl(q.trim());
    void this.runSearch();
  }

  toggleCat(name: string): void {
    this.catFilter.update((c) => (c === name ? null : name));
    this.activeResult.set(-1);
    void this.runSearch();
  }

  toggleType(t: TypeFilter): void {
    this.typeFilter.update((c) => (c === t ? null : t));
    this.activeResult.set(-1);
    void this.runSearch();
  }

  resetFilters(): void {
    this.catFilter.set(null);
    this.typeFilter.set(null);
    this.query.set('');
    this.searchBox()?.setValue('');
    this.syncUrl('');
    this.hits.set([]);
    this.activeResult.set(-1);
  }

  runRecent(term: string): void {
    this.query.set(term);
    this.searchBox()?.setValue(term);
    this.searchBox()?.focus();
    this.syncUrl(term);
    void this.runSearch();
  }

  private async runSearch(): Promise<void> {
    const q = this.query().trim();
    if (q.length < 2 && !this.hasFilter()) {
      this.hits.set([]);
      this.searchBox()?.setHelp('');
      return;
    }
    const scope = { category: this.catFilter(), type: this.typeFilter() };
    const results =
      q.length >= 2
        ? await this.searchService.search(q, scope)
        : await this.searchService.browse(scope);
    this.hits.set(results);
    const n = results.length;
    this.searchBox()?.setHelp(`${n} résultat${n > 1 ? 's' : ''}`);
    if (q.length >= 2) this.rememberRecent(q);
  }

  // --- keyboard navigation over results --------------------------------------
  onResultsKeydown(e: KeyboardEvent): void {
    const n = this.hits().length;
    if (n === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeResult.update((i) => (i + 1) % n);
      this.focusActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeResult.update((i) => (i <= 0 ? n - 1 : i - 1));
      this.focusActive();
    } else if (e.key === 'Enter') {
      const i = this.activeResult();
      if (i >= 0) {
        e.preventDefault();
        const h = this.hits()[i];
        void this.router.navigate(['/digest', h.date]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.resetFilters();
    }
  }

  private focusActive(): void {
    const i = this.activeResult();
    this.resultRefs()[i]?.nativeElement.focus();
  }

  // --- "new" pill -> feed -----------------------------------------------------
  scrollToNew(): void {
    if (!this.isBrowser) return;
    this.feedTop()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Focus the first "new" card (it carries the is-new class) once scrolled.
    queueMicrotask(() => {
      const el = document.querySelector<HTMLElement>('.feed a.card.is-new');
      el?.focus({ preventScroll: true });
    });
  }

  /** Index of the first "new" digest in the feed (for the group separator). */
  readonly firstNewIndex = computed(() => {
    const dates = this.digests.map((d) => d.date);
    return dates.findIndex((d) => this.seen.isNew(d));
  });

  // --- recent searches (localStorage, SSR-safe) ------------------------------
  private loadRecent(): void {
    if (!this.isBrowser) return;
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.recentSearches.set(parsed.filter((x) => typeof x === 'string').slice(0, RECENT_MAX));
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
  }

  private rememberRecent(term: string): void {
    if (!this.isBrowser) return;
    const next = [term, ...this.recentSearches().filter((t) => t !== term)].slice(0, RECENT_MAX);
    this.recentSearches.set(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* storage may be unavailable */
    }
  }

  private syncUrl(q: string): void {
    if (!this.isBrowser) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: q || null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  // --- view helpers -----------------------------------------------------------
  safeSnippet(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  typeLabel(t: SearchHit['type']): string {
    return t === 'synthese' ? 'Synthèse' : 'Détail';
  }

  scopeLabel(scope: string): string {
    return this.store.labelFor(scope);
  }

  /** Leading sentence/clause of a briefing bullet (for the <strong> lead). */
  bulletLead(text: string): string {
    const m = text.match(/^([^.!?:]+[.!?:]?)/);
    return m ? m[1].trim() : text;
  }

  bulletRest(text: string): string {
    const lead = this.bulletLead(text);
    return text.slice(lead.length).trim();
  }
}
