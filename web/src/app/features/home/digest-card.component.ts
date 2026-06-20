import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DigestStore } from '../../core/digest-store.service';
import { FrDatePipe } from '../../core/date.pipe';
import type { DigestMeta } from '../../data/types';

@Component({
  selector: 'app-digest-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FrDatePipe],
  template: `
    <a
      [routerLink]="['/digest', digest().date]"
      class="card"
      [class.is-new]="isNew()"
      [attr.aria-label]="
        'Digest du ' + (digest().date | frDate) + (isNew() ? ', nouveau' : '')
      "
    >
      <div class="card-head">
        <span class="date">
          {{ digest().date | frDate }}
          @if (isNew()) {
            <span class="new-dot" aria-hidden="true" title="Nouveau"></span>
          }
        </span>
        <span class="rel">{{ digest().date | frDate: 'relative' }}</span>
      </div>
      <div class="card-meta">
        @for (cat of digest().categories; track cat) {
          <span
            class="badge"
            [style.--cat-accent]="store.accentFor(cat)"
          >{{ store.labelFor(cat) }}</span>
        }
        @if (digest().totalSubjects > 0) {
          <span
            class="badge badge-count"
            [title]="digest().totalSubjects + ' sujets, ' + digest().totalSources + ' sources'"
          >
            {{ digest().totalSubjects }} sujet{{ digest().totalSubjects > 1 ? 's' : '' }}
          </span>
        }
      </div>
    </a>
  `,
  styles: [
    `
      .card {
        display: block;
        padding: 1rem 1.25rem;
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
      .card.is-new {
        border-left: 3px solid var(--accent);
        padding-left: calc(1.25rem - 3px + 1px);
      }
      .card-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.6rem;
      }
      .date {
        font-weight: 600;
        text-transform: capitalize;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      .new-dot {
        display: inline-block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 8px var(--accent);
      }
      .rel {
        color: var(--text-dim);
        font-size: 0.85rem;
        font-variant-numeric: tabular-nums;
      }
      .card-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
      }
      .badge {
        font-size: 0.75rem;
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
        background: var(--bg-soft);
        color: var(--text-muted);
        border: 1px solid var(--border);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
        border-left: 2px solid var(--cat-accent, transparent);
      }
      .badge-count {
        text-transform: none;
        letter-spacing: 0;
        color: var(--text-muted);
        border-left-color: transparent;
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
export class DigestCardComponent {
  readonly digest = input.required<DigestMeta>();
  readonly isNew = input<boolean>(false);
  readonly store = inject(DigestStore);
}
