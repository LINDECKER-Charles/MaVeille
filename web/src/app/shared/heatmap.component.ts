import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { DayActivity } from '../data/types';

const CELL = 15;
const GAP = 4;
const LABEL_W = 28;
const TOP_H = 16;
const RADIUS = 3.5;

interface Cell {
  date: string;
  subjects: number;
  level: number;
  x: number;
  y: number;
  fill: string;
  tooltip: string;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function startMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const offset = (day + 6) % 7;
  r.setDate(r.getDate() - offset);
  return r;
}

@Component({
  selector: 'app-heatmap',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hm-wrap">
      <svg
        [attr.viewBox]="'0 0 ' + width() + ' ' + height"
        role="img"
        [attr.aria-label]="ariaLabel()"
        preserveAspectRatio="xMinYMin meet"
      >
        @for (ml of monthLabels(); track ml.x) {
          <text [attr.x]="ml.x" [attr.y]="topH - 5" class="axis">{{ ml.label }}</text>
        }
        @for (rl of rowLabels; track $index) {
          @if (rl) {
            <text
              [attr.x]="labelW - 7"
              [attr.y]="topH + $index * (cell + gap) + cell - 3"
              text-anchor="end"
              class="axis"
            >{{ rl }}</text>
          }
        }
        @for (c of cells(); track c.date) {
          <rect
            [attr.x]="c.x"
            [attr.y]="c.y"
            [attr.width]="cell"
            [attr.height]="cell"
            [attr.rx]="radius"
            [attr.fill]="c.fill"
          >
            <title>{{ c.tooltip }}</title>
          </rect>
        }
      </svg>

      <div class="hm-legend" aria-hidden="true">
        <span>Moins</span>
        <span class="sw" style="background: var(--heatmap-0)"></span>
        <span class="sw" style="background: var(--heatmap-1)"></span>
        <span class="sw" style="background: var(--heatmap-2)"></span>
        <span class="sw" style="background: var(--heatmap-3)"></span>
        <span class="sw" style="background: var(--heatmap-4)"></span>
        <span>Plus</span>
      </div>
    </div>
  `,
  styles: [
    `
      .hm-wrap {
        overflow-x: auto;
      }
      svg {
        display: block;
        min-width: 100%;
      }
      .axis {
        fill: var(--faint, var(--text-dim));
        font-size: 10px;
        font-family: var(--font-mono);
      }
      rect {
        cursor: default;
      }
      .hm-legend {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 12px;
        color: var(--faint, var(--text-dim));
        font-size: 11px;
        font-family: var(--font-mono);
        justify-content: flex-end;
      }
      .sw {
        width: 13px;
        height: 13px;
        border-radius: 4px;
      }
    `
  ]
})
export class HeatmapComponent {
  readonly activity = input<DayActivity[]>([]);
  readonly weeks = input<number>(26);

  readonly cell = CELL;
  readonly gap = GAP;
  readonly labelW = LABEL_W;
  readonly topH = TOP_H;
  readonly radius = RADIUS;
  readonly height = TOP_H + 7 * (CELL + GAP);
  readonly rowLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  private readonly today = (() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  })();

  private readonly start = computed(() => {
    const lastCellMonday = startMonday(this.today);
    const s = new Date(lastCellMonday);
    s.setDate(s.getDate() - 7 * (this.weeks() - 1));
    return s;
  });

  readonly width = computed(() => LABEL_W + this.weeks() * (CELL + GAP));

  readonly ariaLabel = computed(() => `Carte d'activité des ${this.weeks()} dernières semaines`);

  private levelFor(n: number, m: number): number {
    if (n === 0) return 0;
    const intensity = n / m;
    if (intensity < 0.25) return 1;
    if (intensity < 0.5) return 2;
    if (intensity < 0.75) return 3;
    return 4;
  }

  private tooltip(date: string, subjects: number): string {
    const [y, m, dd] = date.split('-').map(Number);
    const d = new Date(y, m - 1, dd);
    const fmt = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return subjects > 0
      ? `${fmt} — ${subjects} sujet${subjects > 1 ? 's' : ''}`
      : `${fmt} — pas de digest`;
  }

  readonly cells = computed<Cell[]>(() => {
    const byDate = new Map<string, number>();
    for (const a of this.activity()) byDate.set(a.date, a.subjects);
    const start = this.start();
    const raw: { date: string; subjects: number; col: number; row: number }[] = [];
    for (let col = 0; col < this.weeks(); col++) {
      for (let row = 0; row < 7; row++) {
        const d = new Date(start);
        d.setDate(start.getDate() + col * 7 + row);
        if (d > this.today) continue;
        const iso = isoDate(d);
        raw.push({ date: iso, subjects: byDate.get(iso) ?? 0, col, row });
      }
    }
    const max = Math.max(1, ...raw.map((c) => c.subjects));
    return raw.map((c) => {
      const level = this.levelFor(c.subjects, max);
      return {
        date: c.date,
        subjects: c.subjects,
        level,
        x: LABEL_W + c.col * (CELL + GAP),
        y: TOP_H + c.row * (CELL + GAP),
        fill: `var(--heatmap-${level})`,
        tooltip: this.tooltip(c.date, c.subjects)
      };
    });
  });

  readonly monthLabels = computed(() => {
    const labels: { x: number; label: string }[] = [];
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const start = this.start();
    let lastMonth = -1;
    for (let col = 0; col < this.weeks(); col++) {
      const d = new Date(start);
      d.setDate(start.getDate() + col * 7);
      if (d.getMonth() !== lastMonth) {
        labels.push({ x: LABEL_W + col * (CELL + GAP), label: months[d.getMonth()] });
        lastMonth = d.getMonth();
      }
    }
    return labels;
  });
}
