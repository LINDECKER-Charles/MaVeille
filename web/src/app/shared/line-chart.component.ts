import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { DayActivity } from '../data/types';

const PAD_L = 32;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 24;
const WIDTH = 720;

@Component({
  selector: 'app-line-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + width + ' ' + height()"
      role="img"
      aria-label="Évolution du nombre de sujets par jour"
      preserveAspectRatio="xMidYMid meet"
    >
      @for (t of ticks(); track t) {
        <line [attr.x1]="padL" [attr.x2]="width - padR" [attr.y1]="yPos(t)" [attr.y2]="yPos(t)" class="grid" />
        <text [attr.x]="padL - 6" [attr.y]="yPos(t) + 3" text-anchor="end" class="axis">{{ t }}</text>
      }

      @if (!empty()) {
        <path [attr.d]="areaPath()" class="area" />
        <polyline [attr.points]="pts()" fill="none" class="line" />
        @for (d of data(); track d.date; let i = $index) {
          <g>
            <circle [attr.cx]="xPos(i)" [attr.cy]="yPos(d.subjects)" r="3" class="dot" />
            <title>{{ d.date }} — {{ d.subjects }} sujet{{ d.subjects > 1 ? 's' : '' }}</title>
          </g>
        }
        @for (d of data(); track d.date; let i = $index) {
          @if (i % step() === 0 || i === n() - 1) {
            <text [attr.x]="xPos(i)" [attr.y]="height() - 6" text-anchor="middle" class="axis">
              {{ shortDate(d.date) }}
            </text>
          }
        }
      } @else {
        <text [attr.x]="width / 2" [attr.y]="height() / 2" text-anchor="middle" class="axis-empty">
          Aucune donnée
        </text>
      }
    </svg>
  `,
  styles: [
    `
      svg {
        display: block;
        width: 100%;
        height: auto;
      }
      .grid {
        stroke: var(--border);
        stroke-width: 0.5;
        stroke-dasharray: 2 4;
      }
      .axis {
        fill: var(--text-dim);
        font-size: 10px;
        font-family: var(--font-mono);
      }
      .axis-empty {
        fill: var(--text-dim);
        font-size: 12px;
      }
      .line {
        stroke: var(--accent);
        stroke-width: 1.8;
        stroke-linejoin: round;
        stroke-linecap: round;
      }
      .area {
        fill: var(--accent);
        fill-opacity: 0.15;
      }
      .dot {
        fill: var(--bg-elevated);
        stroke: var(--accent);
        stroke-width: 1.5;
      }
    `
  ]
})
export class LineChartComponent {
  readonly data = input<DayActivity[]>([]);
  readonly height = input<number>(160);

  readonly width = WIDTH;
  readonly padL = PAD_L;
  readonly padR = PAD_R;

  private readonly chartW = WIDTH - PAD_L - PAD_R;
  readonly chartH = computed(() => this.height() - PAD_T - PAD_B);
  readonly empty = computed(() => this.data().length === 0);
  readonly n = computed(() => this.data().length);
  readonly max = computed(() =>
    this.empty() ? 1 : Math.max(1, ...this.data().map((d) => d.subjects))
  );

  xPos(i: number): number {
    const count = this.n();
    if (count <= 1) return PAD_L + this.chartW / 2;
    return PAD_L + (i * this.chartW) / (count - 1);
  }

  yPos(v: number): number {
    return PAD_T + this.chartH() - (v / this.max()) * this.chartH();
  }

  readonly pts = computed(() =>
    this.data()
      .map((d, i) => `${this.xPos(i)},${this.yPos(d.subjects)}`)
      .join(' ')
  );

  readonly areaPath = computed(() => {
    if (this.empty()) return '';
    const n = this.n();
    return `M ${this.xPos(0)},${PAD_T + this.chartH()} L ${this.pts().replace(/ /g, ' L ')} L ${this.xPos(n - 1)},${PAD_T + this.chartH()} Z`;
  });

  readonly ticks = computed(() => {
    const m = this.max();
    return [0, Math.ceil(m / 2), m];
  });

  readonly step = computed(() => Math.max(1, Math.ceil(this.n() / 6)));

  shortDate(iso: string): string {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  }
}
