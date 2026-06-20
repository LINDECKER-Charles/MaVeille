import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DigestStore } from '../../core/digest-store.service';
import { FrDatePipe } from '../../core/date.pipe';
import { parseIso } from '../../core/date.util';
import type { DigestMeta } from '../../data/types';

const MONTHS_SHORT = [
  'jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc'
];

/**
 * Feed card (spec §4.1): left border = dominant category, date block,
 * category badges (§4.2) + NOUVEAU badge, derived title/preview and subject meta.
 */
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
      [style.--cat-accent]="dominantAccent()"
      [attr.aria-label]="
        'Digest du ' + (digest().date | frDate) + (isNew() ? ', nouveau' : '')
      "
    >
      <div class="date-block" aria-hidden="true">
        <span class="day">{{ day() }}</span>
        <span class="month">{{ month() }}</span>
      </div>
      <span class="vrule" aria-hidden="true"></span>
      <div class="body">
        <div class="badges">
          @for (cat of digest().categories; track cat) {
            <span
              class="cat-badge"
              [style.--cat-accent]="store.accentFor(cat)"
              [style.--cat-soft]="store.softFor(cat)"
            >
              <span class="mono" aria-hidden="true">{{ store.monogramFor(cat) }}</span>
              {{ store.labelFor(cat) }}
            </span>
          }
          @if (isNew()) {
            <span class="new-badge">NOUVEAU</span>
          }
        </div>
        <span class="title">{{ title() }}</span>
        <span class="preview">{{ preview() }}</span>
      </div>
      <div class="meta" aria-hidden="true">
        <span class="subjects">
          {{ digest().totalSubjects }} sujet{{ digest().totalSubjects > 1 ? 's' : '' }}
        </span>
        <span class="arrow">→</span>
      </div>
    </a>
  `,
  styles: [
    `
      .card {
        display: flex;
        gap: 16px;
        align-items: stretch;
        padding: var(--card-pad);
        background: var(--surface);
        border: 1px solid var(--border);
        border-left: 3px solid var(--cat-accent, var(--border-strong));
        border-radius: 12px;
        color: var(--text);
        text-decoration: none;
        transition: transform 0.14s ease, border-color 0.14s, box-shadow 0.14s;
      }
      .card:hover,
      .card:focus-visible {
        transform: translateY(-2px);
        box-shadow: var(--shadow);
        border-color: var(--border-strong);
        border-left-color: var(--cat-accent, var(--border-strong));
        outline: none;
      }
      .card:focus-visible {
        outline: 2px solid var(--brand);
        outline-offset: 2px;
      }
      .date-block {
        flex: none;
        width: 56px;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 2px;
        justify-content: center;
      }
      .day {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .month {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--faint);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .vrule {
        flex: none;
        width: 1px;
        background: var(--border);
      }
      .body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .badges {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }
      .cat-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px 2px 6px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 600;
        color: var(--cat-accent);
        background: var(--cat-soft);
        white-space: nowrap;
      }
      .cat-badge .mono {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        border-radius: 4px;
        background: var(--cat-accent);
        color: var(--bg);
        font-size: 9px;
        font-weight: 800;
        font-family: var(--font-mono);
      }
      .new-badge {
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.03em;
        color: var(--brand);
        border: 1px solid var(--brand);
        border-radius: 999px;
        padding: 1px 7px;
      }
      .title {
        font-size: 15.5px;
        font-weight: 600;
        letter-spacing: -0.01em;
      }
      .preview {
        font-size: 13.5px;
        color: var(--muted);
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .meta {
        flex: none;
        align-self: center;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--faint);
        font-size: 12px;
      }
      .subjects {
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .arrow {
        font-size: 18px;
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

  readonly dominantAccent = computed(() => {
    const cats = this.digest().categories;
    return cats.length ? this.store.accentFor(cats[0]) : 'var(--border-strong)';
  });

  readonly day = computed(() => String(parseIso(this.digest().date).getDate()));

  readonly month = computed(() => MONTHS_SHORT[parseIso(this.digest().date).getMonth()]);

  readonly title = computed(() => {
    const labels = this.digest().categories.map((c) => this.store.labelFor(c));
    if (labels.length === 0) return 'Digest du jour';
    if (labels.length <= 3) return labels.join(' · ');
    return `${labels.slice(0, 3).join(' · ')} +${labels.length - 3}`;
  });

  readonly preview = computed(() => {
    const m = this.digest();
    return `${m.totalSubjects} sujet${m.totalSubjects > 1 ? 's' : ''} sur ${m.categories.length} catégorie${m.categories.length > 1 ? 's' : ''}, ${m.totalSources} source${m.totalSources > 1 ? 's' : ''} croisée${m.totalSources > 1 ? 's' : ''}.`;
  });
}
