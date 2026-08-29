import { ChangeDetectionStrategy, Component, computed, inject, isDevMode, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageMetaService } from '../../core/page-meta.service';
import { DigestStore } from '../../core/digest-store.service';
import { MarkdownComponent } from '../../shared/markdown.component';
import { SpeakerPlayerComponent } from '../../shared/speaker-player.component';
import { DonutComponent, type DonutSegment } from '../../shared/donut.component';
import { BadgeComponent } from '../../ui/badge.component';
import { IconComponent } from '../../ui/icon.component';
import { PanelComponent } from '../../ui/panel.component';
import { formatFrRange, resolveCurrentWeekId } from './rapports-list.component';
import type { WeeklyReport } from '../../data/types';

/** Une ligne de la répartition par thématique du rapport. */
interface DistRow {
  readonly label: string;
  readonly count: number;
  readonly pct: number;
  readonly color: string;
}

/** Un rapport hebdomadaire : la synthèse, et où est allé l'effort de la semaine. */
@Component({
  selector: 'app-rapport-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MarkdownComponent,
    DonutComponent,
    SpeakerPlayerComponent,
    BadgeComponent,
    IconComponent,
    PanelComponent
  ],
  styleUrl: './rapport-detail.component.css',
  template: `
    <div class="screen">
      <nav class="etb-crumbs rapport__crumbs" aria-label="Fil d'Ariane">
        <a routerLink="/rapports">Rapports hebdomadaires</a>
        <span aria-hidden="true">/</span>
        <span class="etb-crumbs__current">{{ weekId() }}</span>
      </nav>

      @if (report(); as r) {
        <div class="screen__head">
          <span class="screen__glyph"><app-icon name="folder" [size]="17" /></span>
          <div class="screen__heading">
            <h1 class="screen__title rapport__title">{{ r.title }}</h1>
            <div class="rapport__meta">
              <app-badge size="sm" [mono]="true" tone="info">{{ r.id }}</app-badge>
              @if (range(); as rg) {
                <span class="rapport__range">{{ rg }}</span>
              }
              @if (isCurrent()) {
                <app-badge size="sm" tone="brand">En cours</app-badge>
              }
            </div>
          </div>
        </div>

        <div class="screen__split">
          <div class="screen__body">
            <div class="prose-col">
              <!-- Lecture vocale — dev uniquement : @if(isDev) → zéro empreinte en prod. -->
              @if (isDev) {
                <app-speaker-player [veilleId]="'weekly/' + r.id + '_weekly'" />
              }
              <app-markdown [html]="body()" />
            </div>
          </div>

          <aside class="side-panel" aria-label="Contexte de la semaine">
            @if (distribution(); as dist) {
              <app-panel [title]="effortTitle" icon="database">
                <div class="effort">
                  <app-donut [segments]="segments()" [size]="120" centerLabel="sujets" />
                  <ul class="dist" aria-label="Répartition des sujets par thématique">
                    @for (d of dist; track d.label) {
                      <li>
                        <span class="dist__dot" [style.background]="d.color" aria-hidden="true"></span>
                        <span class="dist__label">{{ d.label }}</span>
                        <span class="dist__count">{{ d.count }}</span>
                        <span class="dist__pct">{{ d.pct }}%</span>
                      </li>
                    }
                  </ul>
                </div>
              </app-panel>
            }

            @if (siblings().length) {
              <div>
                <div class="panel-label"><span>Autres semaines</span></div>
                <div class="weeks">
                  @for (w of siblings(); track w.id) {
                    <a class="week" [routerLink]="['/rapports', w.id]">
                      <span class="week__id">{{ w.id }}</span>
                      <span class="week__title">{{ w.title }}</span>
                    </a>
                  }
                </div>
              </div>
            }
          </aside>
        </div>
      } @else {
        <div class="screen__head">
          <div class="screen__heading">
            <h1 class="screen__title">Rapport introuvable</h1>
            <div class="screen__sub">Aucun rapport ne correspond à cette semaine.</div>
          </div>
        </div>
        <div class="screen__body">
          <a class="etb-btn etb-btn--secondary etb-btn--sm" routerLink="/rapports">
            <app-icon name="chevron-left" [size]="14" />
            Revenir aux rapports
          </a>
        </div>
      }
    </div>
  `
})
export class RapportDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(DigestStore);
  private readonly pageMeta = inject(PageMetaService);

  /** Vrai en `ng serve` / dev, faux en build prod → aucune empreinte en production. */
  readonly isDev = isDevMode();

  /** Espace insécable avant le « ? », comme partout ailleurs dans l'app. */
  protected readonly effortTitle = "Où est allé l'effort ?";

  readonly report = signal<WeeklyReport | null>(null);
  readonly weekId = signal('');
  /** Corps du rapport, chargé à la demande (hors bundle initial). */
  readonly body = signal('');

  readonly range = computed<string | null>(() => {
    const r = this.report();
    if (!r) return null;
    if (r.rangeStart && r.rangeEnd) return formatFrRange(r.rangeStart, r.rangeEnd);
    return r.range ?? null;
  });

  readonly isCurrent = computed(() => {
    const r = this.report();
    return r != null && r.id === resolveCurrentWeekId(this.store.weeklies);
  });

  readonly distribution = computed<DistRow[] | null>(() => {
    const dist = this.report()?.distribution;
    if (!dist || dist.length === 0) return null;
    const total = dist.reduce((s, d) => s + d.count, 0) || 1;
    return dist.map((d) => ({
      label: this.store.labelFor(d.category),
      count: d.count,
      pct: Math.round((d.count / total) * 100),
      color: this.store.accentFor(d.category)
    }));
  });

  readonly segments = computed<DonutSegment[]>(
    () => this.distribution()?.map((d) => ({ label: d.label, value: d.count, color: d.color })) ?? []
  );

  /** Les quatre semaines voisines, pour naviguer sans repasser par la liste. */
  readonly siblings = computed(() => {
    const id = this.weekId();
    const at = this.store.weeklies.findIndex((w) => w.id === id);
    if (at === -1) return [];
    const from = Math.max(0, at - 2);
    return this.store.weeklies.slice(from, from + 5).filter((w) => w.id !== id);
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('week') ?? '';
      this.weekId.set(id);
      this.body.set('');
      const report = this.store.weekly(id);
      this.report.set(report ?? null);
      this.pageMeta.set(
        report?.title ?? 'Rapport introuvable',
        report?.excerpt ?? "Aucun rapport ne correspond à cette semaine."
      );
      if (report) void this.store.loadWeeklyBody(id).then((html) => this.body.set(html ?? ''));
    });
  }
}
