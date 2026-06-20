import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DigestStore } from '../../core/digest-store.service';
import { formatDateShort } from '../../core/date.util';
import type { DayActivity } from '../../data/types';
import { HeatmapComponent } from '../../shared/heatmap.component';
import { LineChartComponent } from '../../shared/line-chart.component';
import { BarChartComponent, BarSeries } from '../../shared/bar-chart.component';
import { DonutComponent, DonutSegment } from '../../shared/donut.component';

type Window = 30 | 90 | 0;

interface WindowOption {
  readonly id: Window;
  readonly label: string;
}

interface CategoryLegendItem {
  readonly label: string;
  readonly accent: string;
}

@Component({
  selector: 'app-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeatmapComponent, LineChartComponent, BarChartComponent, DonutComponent],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css'
})
export class StatsComponent implements OnInit {
  private readonly store = inject(DigestStore);
  private readonly title = inject(Title);

  readonly s = this.store.stats;

  readonly periodLabel = `${formatDateShort(this.s.firstDate)} → ${formatDateShort(this.s.lastDate)}`;

  /** Avg subjects per digest — target band is ~8–12/jour. */
  readonly avgSubjects = computed(() =>
    this.s.totalDigests ? (this.s.totalSubjects / this.s.totalDigests).toFixed(1) : '0'
  );

  /** Regularity: covered days vs. the full calendar span. */
  readonly coveragePct = computed(() => {
    const span = this.spanDays();
    return span ? Math.round((this.s.daysCovered / span) * 100) : 0;
  });

  private spanDays(): number {
    if (!this.s.firstDate || !this.s.lastDate) return 0;
    const first = Date.parse(this.s.firstDate);
    const last = Date.parse(this.s.lastDate);
    if (Number.isNaN(first) || Number.isNaN(last)) return 0;
    return Math.round((last - first) / 86_400_000) + 1;
  }

  // --- Timeline window selector (capped density) ---------------------------
  readonly windowOptions: readonly WindowOption[] = [
    { id: 30, label: '30 j' },
    { id: 90, label: '90 j' },
    { id: 0, label: 'Tout' }
  ];
  readonly activeWindow = signal<Window>(0);

  readonly timeline = computed<DayActivity[]>(() => {
    const all = this.s.timeline;
    const w = this.activeWindow();
    return w === 0 ? all : all.slice(-w);
  });

  setWindow(w: Window): void {
    this.activeWindow.set(w);
  }

  // --- Charts --------------------------------------------------------------
  readonly categoryBars: BarSeries[] = this.s.categories.map((c) => ({
    label: this.store.labelFor(c.category),
    value: c.totalSubjects,
    accent: this.store.accentFor(c.category),
    sub: `${c.daysCovered} jour${c.daysCovered > 1 ? 's' : ''} · ${c.totalSources} source${
      c.totalSources > 1 ? 's' : ''
    }`
  }));

  readonly categoryLegend: CategoryLegendItem[] = this.s.categories.map((c) => ({
    label: this.store.labelFor(c.category),
    accent: this.store.accentFor(c.category)
  }));

  readonly categorySegments: DonutSegment[] = this.s.categories.map((c) => ({
    label: this.store.labelFor(c.category),
    value: c.totalSubjects,
    color: this.store.accentFor(c.category)
  }));

  ngOnInit(): void {
    this.title.setTitle('Veille — Statistiques');
  }
}
