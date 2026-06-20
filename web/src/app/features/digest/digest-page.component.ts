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
      <a routerLink="/">← Tous les digests</a>
    </nav>

    @if (digest(); as d) {
      <header class="day-head">
        <h1>{{ d.date | frDate }}</h1>
        <p class="day-meta">Digest quotidien</p>
      </header>

      <app-digest-tabs [digest]="d" />
    } @else if (notFound()) {
      <header class="day-head">
        <h1>Digest introuvable</h1>
        <p class="day-meta">Aucun contenu pour cette date.</p>
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
      .day-head {
        margin-bottom: 2rem;
      }
      .day-head h1 {
        margin: 0 0 0.3rem;
        font-size: 1.8rem;
        letter-spacing: -0.02em;
        line-height: 1.25;
      }
      .day-meta {
        margin: 0;
        color: var(--text-dim);
        font-size: 0.9rem;
        text-transform: capitalize;
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
