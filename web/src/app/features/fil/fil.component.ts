import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageMetaService } from '../../core/page-meta.service';
import { map } from 'rxjs';
import { DigestStore } from '../../core/digest-store.service';
import { SubjectIndexService, subjectKey } from '../../core/subject-index.service';
import { parseIso, toIso } from '../../core/date.util';
import { IconComponent } from '../../ui/icon.component';
import { SegmentedControlComponent, SegmentOption } from '../../ui/segmented-control.component';
import type { SubjectEntry } from '../../data/types';

type Period = '30' | '90' | 'all';

const PERIODS: SegmentOption<Period>[] = [
  { value: '30', label: '30 j' },
  { value: '90', label: '90 j' },
  { value: 'all', label: 'Tout' }
];

const PAGE = 60;

/** Le fil : tous les sujets de tous les jours, filtrables par thématique et période. */
@Component({
  selector: 'app-fil',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, SegmentedControlComponent],
  styleUrl: './fil.component.css',
  template: `
    <div class="screen">
      <div class="screen__head">
        <span class="screen__glyph"><app-icon name="list" [size]="17" /></span>
        <div class="screen__heading">
          <h1 class="screen__title">{{ heading() }}</h1>
          <div class="screen__sub">
            {{ store.stats.totalSubjects }} sujets sur {{ store.stats.totalDigests }} jours · du plus
            récent au plus ancien
          </div>
        </div>
      </div>

      <div class="screen__toolbar">
        <button
          type="button"
          class="etb-tag etb-tag--interactive"
          [class.etb-tag--selected]="!slug()"
          [attr.aria-pressed]="!slug()"
          (click)="selectCategory(null)"
        >
          Tout
        </button>
        @for (c of store.registry; track c.slug) {
          <button
            type="button"
            class="etb-tag etb-tag--interactive"
            [class.etb-tag--selected]="slug() === c.slug"
            [attr.aria-pressed]="slug() === c.slug"
            (click)="selectCategory(c.slug)"
          >
            {{ c.label }}
          </button>
        }
        <span class="etb-toolbar__sep"></span>
        <app-segmented-control size="sm" label="Période" [options]="periods" [(value)]="period" />
        <span class="etb-toolbar__spacer"></span>
        <span class="fil__count">{{ filtered().length }} résultat{{ filtered().length > 1 ? 's' : '' }}</span>
      </div>

      <div class="screen__body">
        @if (!loaded()) {
          <p class="fil__void">Chargement de l'index…</p>
        } @else if (!filtered().length) {
          <p class="fil__void">Aucun sujet sur cette période.</p>
        } @else {
          <table class="etb-table etb-table--dense fil__table">
            <caption class="visually-hidden">
              Sujets filtrés, du plus récent au plus ancien
            </caption>
            <thead>
              <tr>
                <th scope="col" class="fil__col-mono"><span class="visually-hidden">Thématique</span></th>
                <th scope="col">Sujet</th>
                <th scope="col" class="fil__col-source">Source</th>
                <th scope="col" class="fil__col-date">Date</th>
                <th scope="col" class="fil__col-read">Lecture</th>
              </tr>
            </thead>
            <tbody>
              @for (s of page(); track s.date + s.slug + s.index) {
                <tr>
                  <td><span class="mono-chip mono-chip--sm">{{ s.mono }}</span></td>
                  <td>
                    <a
                      class="fil__link"
                      [routerLink]="['/digest', s.date]"
                      [queryParams]="{ sujet: key(s) }"
                    >
                      {{ s.title }}
                    </a>
                  </td>
                  <td class="etb-table__mono fil__col-source">{{ s.domain ?? s.source ?? '—' }}</td>
                  <td class="etb-table__mono fil__col-date">{{ s.date }}</td>
                  <td class="etb-table__num fil__col-read">{{ s.readingMinutes }} min</td>
                </tr>
              }
            </tbody>
          </table>

          @if (page().length < filtered().length) {
            <div class="fil__more">
              <button type="button" class="etb-btn etb-btn--secondary etb-btn--sm" (click)="showMore()">
                Afficher {{ nextChunk() }} sujets de plus
              </button>
              <span class="fil__more-hint">{{ page().length }} / {{ filtered().length }}</span>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class FilComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly index = inject(SubjectIndexService);
  private readonly pageMeta = inject(PageMetaService);
  readonly store = inject(DigestStore);

  protected readonly periods = PERIODS;
  protected readonly period = signal<Period>('all');
  protected readonly limit = signal(PAGE);
  protected readonly loaded = signal(false);

  /** Thématique active, pilotée par l'URL — le rail pointe sur `/fil?cat=<slug>`. */
  protected readonly slug = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('cat'))), {
    initialValue: null
  });

  protected readonly heading = computed(() => {
    const s = this.slug();
    const entry = s ? this.store.registry.find((c) => c.slug === s) : null;
    return entry ? `Sujets · ${entry.label}` : 'Tous les sujets';
  });

  protected readonly filtered = computed(() => {
    const slug = this.slug();
    const cutoff = this.cutoff();
    return this.index
      .all()
      .filter((s) => (!slug || s.slug === slug) && (!cutoff || s.date >= cutoff))
      .slice()
      .sort((a, b) =>
        a.date === b.date ? a.category.localeCompare(b.category) : a.date < b.date ? 1 : -1
      );
  });

  protected readonly page = computed(() => this.filtered().slice(0, this.limit()));

  protected readonly nextChunk = computed(() =>
    Math.min(PAGE, this.filtered().length - this.page().length)
  );

  constructor() {
    this.pageMeta.set(
      'Tous les sujets',
      'Tous les sujets de la veille, du plus récent au plus ancien, filtrables par thématique et par période.'
    );
    void this.index.load().then(() => this.loaded.set(true));
  }

  protected selectCategory(slug: string | null): void {
    this.limit.set(PAGE);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cat: slug },
      queryParamsHandling: 'merge'
    });
  }

  protected showMore(): void {
    this.limit.update((n) => n + PAGE);
  }

  /** Clé d'URL du sujet — même format que partout ailleurs dans l'app. */
  protected key(s: SubjectEntry): string {
    return subjectKey(s.slug, s.index);
  }

  /** Date ISO minimale de la fenêtre choisie, ou null pour « Tout ». */
  private cutoff(): string | null {
    const period = this.period();
    if (period === 'all') return null;
    const last = this.store.stats.lastDate;
    if (!last) return null;
    const from = parseIso(last);
    from.setDate(from.getDate() - Number(period));
    return toIso(from);
  }
}
