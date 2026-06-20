import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DigestStore } from '../../core/digest-store.service';
import { FrDatePipe } from '../../core/date.pipe';
import { MarkdownComponent } from '../../shared/markdown.component';
import type { WeeklyReport } from '../../data/types';

@Component({
  selector: 'app-rapport-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FrDatePipe, MarkdownComponent],
  template: `
    <nav class="breadcrumb" aria-label="Fil d'Ariane">
      <a routerLink="/rapports">← Tous les rapports</a>
    </nav>

    @if (report(); as r) {
      <header class="page-head">
        <h1>{{ r.title }}</h1>
        <p class="sub">
          {{ r.id }}
          @if (r.rangeStart && r.rangeEnd) {
            · {{ r.rangeStart | frDate: 'short' }} → {{ r.rangeEnd | frDate: 'short' }}
          } @else if (r.range) {
            · {{ r.range }}
          }
        </p>
      </header>

      <app-markdown [html]="r.html" />
    } @else if (notFound()) {
      <header class="page-head">
        <h1>Rapport introuvable</h1>
        <p class="sub">Aucun rapport pour cette semaine.</p>
      </header>
    }
  `,
  styles: [
    `
      .breadcrumb {
        margin-bottom: 1.5rem;
        font-size: 0.9rem;
      }
      .breadcrumb a {
        color: var(--text-dim);
        border-bottom: none;
      }
      .breadcrumb a:hover {
        color: var(--accent);
      }
      .breadcrumb a:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
        border-radius: 2px;
      }
      .page-head {
        margin-bottom: 2rem;
      }
      .page-head h1 {
        margin: 0 0 0.4rem;
        font-size: 1.9rem;
        letter-spacing: -0.02em;
        line-height: 1.2;
      }
      .sub {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.9rem;
        font-variant-numeric: tabular-nums;
      }
    `
  ]
})
export class RapportDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(DigestStore);
  private readonly title = inject(Title);

  readonly report = signal<WeeklyReport | null>(null);
  readonly notFound = signal(false);

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
