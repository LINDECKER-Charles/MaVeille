import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { DayActivity } from '../data/types';

const CELL = 12;
const GAP = 3;
const LABEL_W = 28;
const LABEL_H = 14;

interface Cell {
  date: string;
  subjects: number;
  col: number;
  row: number;
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
    <div class="heatmap-wrap">
      <svg
        [attr.viewBox]="'0 0 ' + width() + ' ' + height"
        role="img"
        [attr.aria-label]="ariaLabel()"
        preserveAspectRatio="xMinYMin meet"
      >
        @for (ml of monthLabels(); track ml.x) {
          <text [attr.x]="ml.x" [attr.y]="labelH - 4" class="axis">{{ ml.label }}</text>
        }
        @for (rl of rowLabels; track $index) {
          @if (rl) {
            <text
              [attr.x]="labelW - 6"
              [attr.y]="labelH + $index * (cell + gap) + cell - 2"
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
            rx="2"
            [attr.fill]="c.fill"
            stroke="var(--border)"
            stroke-width="0.5"
          >
            <title>{{ c.tooltip }}</title>
          </rect>
        }
      </svg>

      <div class="legend" aria-hidden="true">
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
      .heatmap-wrap {
        overflow-x: auto;
      }
      svg {
        display: block;
        min-width: 100%;
      }
      .axis {
        fill: var(--text-dim);
        font-size: 10px;
        font-family: var(--font-mono);
      }
      rect {
        cursor: default;
      }
      .legend {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 0.75rem;
        color: var(--text-dim);
        font-size: 0.75rem;
        justify-content: flex-end;
      }
      .sw {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        border: 0.5px solid var(--border);
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
  readonly labelH = LABEL_H;
  readonly height = LABEL_H + 7 * (CELL + GAP);
  readonly rowLabels = ['Lun', '', 'Mer', '', 'Ven', '', 'Dim'];

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

  private colorFor(n: number, m: number): string {
    if (n === 0) return 'var(--heatmap-0)';
    const intensity = n / m;
    if (intensity < 0.25) return 'var(--heatmap-1)';
    if (intensity < 0.5) return 'var(--heatmap-2)';
    if (intensity < 0.75) return 'var(--heatmap-3)';
    return 'var(--heatmap-4)';
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
    return raw.map((c) => ({
      ...c,
      x: LABEL_W + c.col * (CELL + GAP),
      y: LABEL_H + c.row * (CELL + GAP),
      fill: this.colorFor(c.subjects, max),
      tooltip: this.tooltip(c.date, c.subjects)
    }));
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
