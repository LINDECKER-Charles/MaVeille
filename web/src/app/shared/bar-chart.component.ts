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
        <li class="bar-row" [style.--bar-accent]="d.accent || 'var(--brand, var(--accent))'">
          <span class="bar-label">
            <span class="dot" aria-hidden="true"></span>
            <span class="name">{{ d.label }}</span>
          </span>
          <div
            class="bar-track"
            role="progressbar"
            [attr.aria-valuenow]="d.value"
            aria-valuemin="0"
            [attr.aria-valuemax]="max()"
            [attr.aria-label]="d.label + ' — ' + d.value + (unit() ? ' ' + unit() : '')"
          >
            <div class="bar-fill" [style.width.%]="pct(d.value)"></div>
          </div>
          <span class="bar-val">{{ d.value }}{{ unit() ? ' ' + unit() : '' }}</span>
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
        gap: 10px;
      }
      .bar-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .bar-label {
        flex: none;
        width: 58px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        color: var(--text);
        font-size: 12.5px;
        font-weight: 500;
      }
      .dot {
        flex: none;
        width: 11px;
        height: 11px;
        border-radius: 4px;
        background: var(--bar-accent, var(--brand, var(--accent)));
      }
      .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .bar-track {
        flex: 1;
        background: var(--surface-2, var(--bg-soft));
        height: 22px;
        border-radius: 5px;
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        background: var(--bar-accent, var(--brand, var(--accent)));
        border-radius: inherit;
        transition: width 0.4s ease;
      }
      .bar-val {
        flex: none;
        width: 26px;
        text-align: right;
        color: var(--muted, var(--text-dim));
        font-family: var(--font-mono);
        font-variant-numeric: tabular-nums;
        font-size: 12.5px;
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
