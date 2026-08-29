import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DigestStore } from '../../core/digest-store.service';
import { PrefsService } from '../../core/prefs.service';
import { ReadStateService } from '../../core/read-state.service';
import { formatDayMonth } from '../../core/date.util';
import { MarkdownComponent } from '../../shared/markdown.component';
import { BadgeComponent } from '../../ui/badge.component';
import { ButtonComponent } from '../../ui/button.component';
import { CalloutComponent } from '../../ui/callout.component';
import { IconButtonComponent } from '../../ui/icon-button.component';
import { IconComponent } from '../../ui/icon.component';
import { KeyValueListComponent } from '../../ui/key-value-list.component';
import { SegmentedControlComponent, SegmentOption } from '../../ui/segmented-control.component';
import type { DigestMeta } from '../../data/types';
import type { DaySubject, DaySynthesis, DayTakeaway } from './day-subjects';

const DEPTH_OPTIONS: SegmentOption<'syn' | 'det'>[] = [
  { value: 'syn', label: 'Synthèse' },
  { value: 'det', label: 'Sujets' }
];

const RECENT_DAYS = 4;

/** Le briefing d'une journée : ce qu'il faut retenir, puis les sujets. */
@Component({
  selector: 'app-briefing-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MarkdownComponent,
    BadgeComponent,
    ButtonComponent,
    CalloutComponent,
    IconComponent,
    IconButtonComponent,
    KeyValueListComponent,
    SegmentedControlComponent
  ],
  styleUrl: './briefing-view.component.css',
  template: `
    <div class="screen">
      <div class="screen__head">
        <span class="screen__glyph"><app-icon name="sun" [size]="17" /></span>
        <div class="screen__heading">
          <h1 class="screen__title">{{ dayTitle() }}</h1>
          <div class="screen__sub">{{ summary() }}</div>
        </div>
        <div class="screen__actions">
          <app-button
            size="sm"
            variant="ghost"
            [iconLeft]="isRead() ? 'circle-check' : 'check'"
            (click)="toggleRead()"
          >
            {{ isRead() ? 'Lu' : 'Marquer comme lu' }}
          </app-button>
          @if (subjects().length) {
            <a
              class="etb-btn etb-btn--primary etb-btn--sm"
              [routerLink]="['/digest', date()]"
              [queryParams]="{ sujet: subjects()[0].key }"
            >
              Lire le premier sujet
              <app-icon name="arrow-right" [size]="14" />
            </a>
          }
        </div>
      </div>

      <div class="screen__toolbar">
        <app-segmented-control
          size="sm"
          label="Profondeur de lecture"
          [options]="depthOptions"
          [value]="prefs.depth()"
          (valueChange)="prefs.setDepth($event)"
        />
        <span class="etb-toolbar__sep"></span>
        <app-icon-button
          icon="funnel"
          label="Filtrer les thématiques"
          [active]="filterOpen()"
          (click)="filterOpen.set(!filterOpen())"
        />
        <app-icon-button
          [icon]="copied() ? 'check' : 'clipboard'"
          label="Copier le briefing"
          (click)="copyBriefing()"
        />
        <span class="etb-toolbar__spacer"></span>
        @if (newCount() > 0) {
          <app-badge tone="info" icon="bell">
            {{ newCount() }} digest{{ newCount() > 1 ? 's' : '' }} depuis ta dernière visite
          </app-badge>
        }
      </div>

      @if (filterOpen()) {
        <div class="filters" role="group" aria-label="Filtrer par thématique">
          <button
            type="button"
            class="etb-tag etb-tag--interactive"
            [class.etb-tag--selected]="!activeCategory()"
            [attr.aria-pressed]="!activeCategory()"
            (click)="activeCategory.set(null)"
          >
            Tout
          </button>
          @for (c of presentCategories(); track c.category) {
            <button
              type="button"
              class="etb-tag etb-tag--interactive"
              [class.etb-tag--selected]="activeCategory() === c.category"
              [attr.aria-pressed]="activeCategory() === c.category"
              (click)="activeCategory.set(c.category)"
            >
              {{ c.label }}
            </button>
          }
        </div>
      }

      <div class="screen__split">
        <div class="screen__body">
          <div class="prose-col">
            @if (takeaways().length) {
              <app-callout tone="neutral" icon="zap" title="À retenir si tu n'as qu'une minute">
                <ul class="takeaways">
                  @for (t of takeaways(); track t.label) {
                    <li>
                      <span class="mono-chip mono-chip--sm">{{ t.mono }}</span>
                      <span>{{ t.text }}</span>
                    </li>
                  }
                </ul>
              </app-callout>
            }

            @if (prefs.depth() === 'det') {
              <div class="rule-label">
                <span class="rule-label__text">
                  {{ visibleSubjects().length }} sujet{{ visibleSubjects().length > 1 ? 's' : '' }} du jour
                </span>
                <span class="rule-label__line"></span>
              </div>

              <div class="row-list">
                @for (s of visibleSubjects(); track s.key) {
                  <a class="row-card" [routerLink]="['/digest', date()]" [queryParams]="{ sujet: s.key }">
                    <span class="mono-chip">{{ s.mono }}</span>
                    <span class="row-card__main">
                      <span class="row-card__title">{{ s.title }}</span>
                      <span class="row-card__meta">
                        <app-icon name="link" [size]="12" />
                        <span>{{ s.domain || s.source }}</span>
                        <span aria-hidden="true">·</span>
                        <span>{{ s.label }}</span>
                        <span aria-hidden="true">·</span>
                        <span>~{{ s.readingMinutes }} min</span>
                      </span>
                    </span>
                    <span class="row-card__aside">
                      <span class="row-card__num">{{ s.position }}</span>
                      <app-icon name="chevron-right" [size]="15" />
                    </span>
                  </a>
                } @empty {
                  <p class="empty-line">Aucun sujet détaillé pour ce filtre.</p>
                }
              </div>

              <div class="hint-strip">
                <app-icon name="info" [size]="14" />
                <span>Les sujets déjà couverts dans les 30 derniers jours sont exclus par la routine.</span>
              </div>
            } @else {
              @for (s of visibleSyntheses(); track s.label) {
                <section class="synthesis">
                  <div class="rule-label">
                    <span class="mono-chip mono-chip--sm">{{ s.mono }}</span>
                    <span class="rule-label__text">{{ s.label }}</span>
                    <span class="rule-label__line"></span>
                    <span class="rule-label__hint">~{{ s.minutes }} min</span>
                  </div>
                  <app-markdown [html]="s.html" />
                </section>
              } @empty {
                <p class="empty-line">Aucune synthèse pour ce jour.</p>
              }
            }
          </div>
        </div>

        <aside class="side-panel" aria-label="Contexte du jour">
          @if (sources().length) {
            <div>
              <div class="panel-label">
                <app-icon name="link" [size]="12" />
                <span>Sources citées ce jour</span>
              </div>
              <div class="source-list">
                @for (s of sources(); track s.key) {
                  <a [href]="s.sourceUrl" target="_blank" rel="noopener noreferrer" class="source">
                    <span class="mono-chip mono-chip--sm">{{ s.mono }}</span>
                    <span class="source__main">
                      <span class="source__domain">{{ s.domain }}</span>
                      <span class="source__title">{{ s.title }}</span>
                    </span>
                    <app-icon name="arrow-up-right" [size]="13" />
                  </a>
                }
              </div>
            </div>
          }

          <div>
            <div class="panel-label"><span>Le jour en chiffres</span></div>
            <app-key-value-list [items]="dayFacts()" [bordered]="true" />
          </div>

          @if (nearbyDays().length) {
            <div>
              <div class="panel-label"><span>Autres jours</span></div>
              <div class="recent-list">
                @for (d of nearbyDays(); track d.date) {
                  <a class="recent" [class.recent--next]="d.next" [routerLink]="['/digest', d.date]">
                    <span class="recent__date">{{ d.label }}</span>
                    <span class="recent__cats">{{ d.cats }}</span>
                    <span class="recent__n">{{ d.n }}</span>
                  </a>
                }
              </div>
            </div>
          }
        </aside>
      </div>
    </div>
  `
})
export class BriefingViewComponent {
  private readonly store = inject(DigestStore);
  private readonly readState = inject(ReadStateService);
  readonly prefs = inject(PrefsService);

  readonly date = input.required<string>();
  readonly dayTitle = input.required<string>();
  readonly subjects = input.required<readonly DaySubject[]>();
  readonly takeaways = input.required<readonly DayTakeaway[]>();
  readonly syntheses = input.required<readonly DaySynthesis[]>();
  /** Digests parus depuis la dernière visite, photographié par la page. */
  readonly newCount = input(0);

  protected readonly depthOptions = DEPTH_OPTIONS;
  protected readonly filterOpen = signal(false);
  protected readonly activeCategory = signal<string | null>(null);
  protected readonly copied = signal(false);

  protected readonly meta = computed(() => this.store.digests.find((d) => d.date === this.date()));
  protected readonly isRead = computed(() => this.readState.ids().has(this.date()));

  /** Thématiques réellement présentes ce jour-là — pas tout le registre. */
  protected readonly presentCategories = computed(() =>
    [...new Set(this.subjects().map((s) => s.category))].map((category) => ({
      category,
      label: this.store.labelFor(category)
    }))
  );

  protected readonly visibleSubjects = computed(() => {
    const cat = this.activeCategory();
    return cat ? this.subjects().filter((s) => s.category === cat) : this.subjects();
  });

  protected readonly visibleSyntheses = computed(() => {
    const cat = this.activeCategory();
    if (!cat) return this.syntheses();
    const label = this.store.labelFor(cat);
    return this.syntheses().filter((s) => s.label === label);
  });

  protected readonly summary = computed(() => {
    const m = this.meta();
    if (!m) return '';
    const cats = m.categories.length;
    return (
      `${m.totalSubjects} sujet${m.totalSubjects > 1 ? 's' : ''} · ` +
      `${cats} thématique${cats > 1 ? 's' : ''} · ` +
      `${m.totalSources} source${m.totalSources > 1 ? 's' : ''} · ` +
      `lecture ~${m.readingMinutes} min`
    );
  });

  protected readonly sources = computed(() => this.subjects().filter((s) => !!s.sourceUrl));

  protected readonly dayFacts = computed(() => {
    const m = this.meta();
    return [
      { label: 'Sujets', value: `${m?.totalSubjects ?? 0}` },
      { label: 'Sources', value: `${m?.totalSources ?? 0}` },
      { label: 'Thématiques', value: `${m?.categories.length ?? 0}` },
      { label: 'Lecture', value: `~${m?.readingMinutes ?? 0} min` },
      { label: 'Déduplication', value: '30 j' }
    ];
  });

  /**
   * Les journées voisines : la suivante quand elle existe, puis les précédentes.
   * C'est ce qui permet de remonter le fil jour par jour sans repasser par
   * l'écran « Par jour » — les digests sont triés du plus récent au plus ancien.
   */
  protected readonly nearbyDays = computed(() => {
    const all = this.store.digests;
    const at = all.findIndex((d) => d.date === this.date());
    if (at === -1) return [];

    const toRow = (d: DigestMeta, next: boolean) => ({
      date: d.date,
      next,
      label: formatDayMonth(d.date),
      cats: d.categories.map((c) => this.store.labelFor(c)).join(' · '),
      n: `${d.totalSubjects}`
    });

    const following = at > 0 ? [toRow(all[at - 1], true)] : [];
    return [...following, ...all.slice(at + 1, at + 1 + RECENT_DAYS).map((d) => toRow(d, false))];
  });

  protected toggleRead(): void {
    this.readState.toggle(this.date());
  }

  /** Copie le briefing en texte brut — de quoi le coller dans une note ou un chat. */
  protected async copyBriefing(): Promise<void> {
    const lines = [
      this.dayTitle(),
      this.summary(),
      '',
      ...this.takeaways().map((t) => `[${t.mono}] ${t.text}`),
      '',
      ...this.subjects().map((s) => `${s.index}. ${s.title}${s.sourceUrl ? ` — ${s.sourceUrl}` : ''}`)
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1400);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé, permission refusée).
    }
  }
}
