import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarSeries {
  label: string;
  value: number;
  sub?: string;
  accent?: string;
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="bars" role="list">
      @for (d of data(); track d.label) {
        <li>
          <div class="bar-head">
            <span class="bar-label">{{ d.label }}</span>
            <span class="bar-val">{{ d.value }}{{ unit() ? ' ' + unit() : '' }}</span>
          </div>
          <div
            class="bar-track"
            role="progressbar"
            [attr.aria-valuenow]="d.value"
            aria-valuemin="0"
            [attr.aria-valuemax]="max()"
            [attr.aria-label]="d.label + ' — ' + d.value + (unit() ? ' ' + unit() : '')"
          >
            <div
              class="bar-fill"
              [style.width.%]="pct(d.value)"
              [style.--bar-accent]="d.accent || 'var(--accent)'"
            ></div>
          </div>
          @if (d.sub) {
            <p class="bar-sub">{{ d.sub }}</p>
          }
        </li>
      }
    </ul>
  `,
  styles: [
    `
      .bars {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .bar-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 0.3rem;
      }
      .bar-label {
        color: var(--text);
        font-weight: 500;
      }
      .bar-val {
        color: var(--text-dim);
        font-variant-numeric: tabular-nums;
        font-size: 0.9rem;
      }
      .bar-track {
        background: var(--bg-soft);
        height: 10px;
        border-radius: 999px;
        overflow: hidden;
        border: 1px solid var(--border);
      }
      .bar-fill {
        height: 100%;
        background: linear-gradient(
          90deg,
          var(--bar-accent, var(--accent)),
          color-mix(in srgb, var(--bar-accent, var(--accent)) 60%, var(--success))
        );
        border-radius: inherit;
        transition: width 0.4s ease;
      }
      .bar-sub {
        margin: 0.25rem 0 0;
        color: var(--text-dim);
        font-size: 0.8rem;
      }
      @media (prefers-reduced-motion: reduce) {
        .bar-fill {
          transition: none;
        }
      }
    `
  ]
})
export class BarChartComponent {
  readonly data = input<BarSeries[]>([]);
  readonly unit = input<string>('');

  readonly max = computed(() => Math.max(1, ...this.data().map((d) => d.value)));

  pct(value: number): number {
    return Math.round((value / this.max()) * 100);
  }
}
