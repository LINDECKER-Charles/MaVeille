import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DigestStore } from '../../core/digest-store.service';
import { FrDatePipe } from '../../core/date.pipe';

@Component({
  selector: 'app-rapports-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FrDatePipe],
  template: `
    <header class="page-head">
      <h1>Rapports hebdomadaires</h1>
      <p class="sub">Synthèses transversales par semaine ISO (du lundi au dimanche).</p>
    </header>

    @if (weeklies.length === 0) {
      <p class="empty">Aucun rapport disponible pour le moment.</p>
    } @else {
      <ul class="reports" aria-label="Liste des rapports">
        @for (w of weeklies; track w.id) {
          <li>
            <a class="card" [routerLink]="['/rapports', w.id]">
              <div class="card-head">
                <span class="title">{{ w.title }}</span>
                <span class="id">{{ w.id }}</span>
              </div>
              @if (w.rangeStart && w.rangeEnd) {
                <p class="range">
                  {{ w.rangeStart | frDate: 'short' }} → {{ w.rangeEnd | frDate: 'short' }}
                </p>
              } @else if (w.range) {
                <p class="range">{{ w.range }}</p>
              }
            </a>
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      .page-head {
        margin-bottom: 2rem;
      }
      .page-head h1 {
        margin: 0 0 0.4rem;
        font-size: 2rem;
        letter-spacing: -0.02em;
      }
      .sub {
        margin: 0;
        color: var(--text-muted);
      }
      .empty {
        color: var(--text-dim);
        padding: 3rem 0;
        text-align: center;
      }
      .reports {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .card {
        display: block;
        padding: 1.1rem 1.25rem;
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text);
        border-bottom: 1px solid var(--border);
        transition: border-color 0.15s ease, transform 0.15s ease;
      }
      .card:hover,
      .card:focus-visible {
        border-color: var(--accent);
        transform: translateY(-1px);
        outline: none;
      }
      .card:focus-visible {
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .card-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
      }
      .title {
        font-weight: 600;
        font-size: 1.05rem;
      }
      .id {
        color: var(--text-dim);
        font-variant-numeric: tabular-nums;
        font-size: 0.85rem;
        white-space: nowrap;
      }
      .range {
        margin: 0.35rem 0 0;
        color: var(--text-dim);
        font-size: 0.88rem;
      }
      @media (prefers-reduced-motion: reduce) {
        .card {
          transition: none !important;
        }
        .card:hover,
        .card:focus-visible {
          transform: none;
        }
      }
    `
  ]
})
export class RapportsListComponent implements OnInit {
  private readonly store = inject(DigestStore);
  private readonly title = inject(Title);
  readonly weeklies = this.store.weeklies;

  ngOnInit(): void {
    this.title.setTitle('Veille — Rapports hebdomadaires');
  }
}
