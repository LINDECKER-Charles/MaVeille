import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DigestStore } from '../../core/digest-store.service';
import { SeenService } from '../../core/seen.service';
import { FrDatePipe } from '../../core/date.pipe';
import { formatDateFull } from '../../core/date.util';
import { DigestTabsComponent } from './digest-tabs.component';
import type { RenderedDigest } from '../../data/types';

@Component({
  selector: 'app-digest-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FrDatePipe, DigestTabsComponent],
  template: `
    <nav class="breadcrumb" aria-label="Fil d'Ariane">
      <a routerLink="/">&larr; Briefing</a>
    </nav>

    @if (digest(); as d) {
      <header class="day-head">
        <p class="eyebrow">Digest du jour</p>
        <h1>{{ d.date | frDate }}</h1>
      </header>

      <app-digest-tabs [digest]="d" />
    } @else if (notFound()) {
      <header class="day-head">
        <p class="eyebrow">Digest du jour</p>
        <h1>Digest introuvable</h1>
        <p class="day-meta">Aucun contenu pour cette date.</p>
      </header>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 1080px;
        margin: 0 auto;
        padding: 28px 24px 80px;
      }
      @media (max-width: 600px) {
        :host { padding: 24px 16px 64px; }
      }
      .breadcrumb {
        margin-bottom: 1.1rem;
        font-size: 13px;
      }
      .breadcrumb a {
        color: var(--faint);
        border-bottom: none;
        transition: color 0.15s ease;
      }
      .breadcrumb a:hover {
        color: var(--text);
      }
      .breadcrumb a:focus-visible {
        outline: 2px solid var(--brand);
        outline-offset: 2px;
        border-radius: 3px;
      }
      .day-head {
        margin-bottom: 0.4rem;
      }
      .eyebrow {
        margin: 0 0 0.35rem;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--faint);
      }
      .day-head h1 {
        margin: 0;
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1.2;
        text-transform: capitalize;
      }
      .day-meta {
        margin: 0.4rem 0 0;
        color: var(--faint);
        font-size: 0.9rem;
      }
    `
  ]
})
export class DigestPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(DigestStore);
  private readonly seen = inject(SeenService);
  private readonly title = inject(Title);

  readonly digest = signal<RenderedDigest | null>(null);
  readonly notFound = signal(false);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const date = params.get('date')!;
      this.title.setTitle(`Veille — ${formatDateFull(date)}`);
      void this.load(date);
    });
  }

  private async load(date: string): Promise<void> {
    const d = await this.store.loadDigest(date);
    if (d) {
      this.digest.set(d);
      this.notFound.set(false);
      this.seen.acknowledge(date);
    } else {
      this.digest.set(null);
      this.notFound.set(true);
    }
  }
}
