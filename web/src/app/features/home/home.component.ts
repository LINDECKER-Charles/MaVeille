import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild
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
import type { SearchHit } from '../../data/types';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FrDatePipe, DigestCardComponent, SearchBoxComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  readonly store = inject(DigestStore);
  private readonly searchService = inject(SearchService);
  private readonly seen = inject(SeenService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly searchBox = viewChild(SearchBoxComponent);

  readonly digests = this.store.digests;
  readonly totals = this.store.totals;

  readonly query = signal('');
  readonly hits = signal<SearchHit[]>([]);
  readonly isSearching = computed(() => this.query().trim().length >= 2);

  readonly newCount = computed(() =>
    this.seen.countNew(this.digests.map((d) => d.date))
  );

  ngOnInit(): void {
    this.title.setTitle('Veille — Digests quotidiens');
    this.meta.updateTag({
      name: 'description',
      content: `Veille tech quotidienne — ${this.totals.digests} digests, ${this.totals.subjects} sujets analysés.`
    });

    if (this.isBrowser) {
      this.searchService.preload();
      const initial = this.route.snapshot.queryParamMap.get('q') ?? '';
      if (initial) {
        this.query.set(initial);
        this.searchBox()?.setValue(initial);
        void this.runSearch(initial);
      }
    }
  }

  isNew(date: string): boolean {
    return this.seen.isNew(date);
  }

  onQueryChange(q: string): void {
    this.query.set(q);
    this.syncUrl(q.trim());
    void this.runSearch(q);
  }

  private async runSearch(q: string): Promise<void> {
    if (q.trim().length < 2) {
      this.hits.set([]);
      this.searchBox()?.setHelp('');
      return;
    }
    const results = await this.searchService.search(q);
    this.hits.set(results);
    const n = results.length;
    this.searchBox()?.setHelp(`${n} résultat${n > 1 ? 's' : ''} pour « ${q.trim()} »`);
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

  safeSnippet(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  typeLabel(t: SearchHit['type']): string {
    return t === 'synthese' ? 'Synthèse' : 'Détail';
  }

  scopeLabel(scope: string): string {
    return this.store.labelFor(scope);
  }
}
