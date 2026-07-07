import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  isDevMode,
  signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DigestStore } from '../../core/digest-store.service';
import { MarkdownComponent } from '../../shared/markdown.component';
import { SpeakerPlayerComponent } from '../../shared/speaker-player.component';
import { DonutComponent, type DonutSegment } from '../../shared/donut.component';
import { formatFrRange, resolveCurrentWeekId } from './rapports-list.component';
import type { WeeklyReport } from '../../data/types';

interface DistRow {
  label: string;
  count: number;
  pct: number;
  color: string;
}

@Component({
  selector: 'app-rapport-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MarkdownComponent, DonutComponent, SpeakerPlayerComponent],
  template: `
    <article class="doc">
      <nav class="breadcrumb" aria-label="Fil d'Ariane">
        <a routerLink="/rapports">← Tous les rapports</a>
      </nav>

      @if (report(); as r) {
        <p class="meta">
          <span class="id">{{ r.id }}</span>
          @if (range(); as rg) {
            <span class="range">{{ rg }}</span>
          }
          @if (isCurrent()) {
            <span class="badge-current">EN COURS</span>
          }
        </p>

        <h1>{{ r.title }}</h1>

        <!-- Lecture vocale — dev uniquement : @if(isDev) → zéro empreinte en prod. -->
        @if (isDev) {
          <app-speaker-player [veilleId]="'weekly/' + r.id + '_weekly'" />
        }

        @if (distribution(); as dist) {
          <section class="effort" aria-labelledby="effort-h">
            <h2 id="effort-h">Où est allé l'effort</h2>
            <div class="effort-body">
              <app-donut [segments]="segments()" [centerLabel]="'sujets'" />
              <ul class="dist" aria-label="Répartition des sujets par catégorie">
                @for (d of dist; track d.label) {
                  <li>
                    <span class="dot" [style.background]="d.color" aria-hidden="true"></span>
                    <span class="dist-label">{{ d.label }}</span>
                    <span class="dist-count">{{ d.count }} sujets</span>
                    <span class="dist-pct">{{ d.pct }}%</span>
                  </li>
                }
              </ul>
            </div>
          </section>
        }

        <app-markdown [html]="r.html" />
      } @else if (notFound()) {
        <div class="not-found">
          <h1>Rapport introuvable</h1>
          <p class="sub">Aucun rapport ne correspond à cette semaine.</p>
          <a class="back" routerLink="/rapports">← Revenir aux rapports</a>
        </div>
      }
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 40px 24px 90px;
      }
      @media (max-width: 600px) {
        :host { padding: 28px 16px 64px; }
      }
      .doc {
        max-width: 760px;
        margin: 0 auto;
      }
      .breadcrumb {
        margin-bottom: 1.75rem;
        font-size: 13px;
      }
      .breadcrumb a {
        color: var(--faint, var(--text-dim));
        border-bottom: none;
      }
      .breadcrumb a:hover {
        color: var(--brand, var(--accent));
      }
      .breadcrumb a:focus-visible {
        outline: 2px solid var(--brand, var(--accent));
        outline-offset: 2px;
        border-radius: 3px;
      }
      .meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.65rem;
        margin: 0 0 0.85rem;
      }
      .id {
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 600;
        color: var(--brand, var(--accent));
        background: var(--brand-soft, var(--accent-soft));
        border-radius: 999px;
        padding: 2px 9px;
        font-variant-numeric: tabular-nums;
      }
      .range {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--faint, var(--text-dim));
        font-variant-numeric: tabular-nums;
      }
      .badge-current {
        font-family: var(--font-mono);
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.04em;
        color: var(--high, var(--accent));
        border: 1px solid var(--high, var(--accent));
        border-radius: 999px;
        padding: 1px 8px;
      }
      h1 {
        margin: 0 0 1.75rem;
        font-size: 38px;
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: 1.1;
      }
      .effort {
        background: var(--surface, var(--bg-elevated));
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 24px;
        margin: 0 0 2.25rem;
      }
      .effort h2 {
        margin: 0 0 1.1rem;
        font-size: 17px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .effort-body {
        display: flex;
        align-items: center;
        gap: 32px;
      }
      .dist {
        list-style: none;
        margin: 0;
        padding: 0;
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
      }
      .dist li {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 14px;
      }
      .dot {
        flex: none;
        width: 11px;
        height: 11px;
        border-radius: 4px;
      }
      .dist-label {
        font-weight: 500;
      }
      .dist-count {
        margin-left: auto;
        color: var(--muted, var(--text-muted));
        font-variant-numeric: tabular-nums;
      }
      .dist-pct {
        width: 38px;
        text-align: right;
        color: var(--faint, var(--text-dim));
        font-variant-numeric: tabular-nums;
      }
      .not-found {
        padding: 2rem 0;
      }
      .not-found h1 {
        margin-bottom: 0.5rem;
      }
      .not-found .sub {
        margin: 0 0 1.25rem;
        color: var(--muted, var(--text-muted));
      }
      .not-found .back {
        color: var(--brand, var(--accent));
        font-size: 14px;
        border-bottom: none;
      }
      @media (max-width: 720px) {
        .effort-body {
          flex-direction: column;
          align-items: stretch;
          gap: 20px;
        }
        h1 {
          font-size: 30px;
        }
      }
    `
  ]
})
export class RapportDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(DigestStore);
  private readonly title = inject(Title);

  /** Vrai en `ng serve` / dev, faux en build prod → aucune empreinte en production. */
  readonly isDev = isDevMode();

  readonly report = signal<WeeklyReport | null>(null);
  readonly notFound = signal(false);

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

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('week')!;
      const report = this.store.weekly(id);
      if (!report) {
        this.report.set(null);
        this.notFound.set(true);
        this.title.setTitle('Veille — Rapport introuvable');
        return;
      }
      this.title.setTitle(`Veille — ${report.title}`);
      this.report.set(report);
      this.notFound.set(false);
    });
  }
}
