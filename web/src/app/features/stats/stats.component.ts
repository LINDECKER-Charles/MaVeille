import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DigestStore } from '../../core/digest-store.service';
import { formatDateShort } from '../../core/date.util';
import { HeatmapComponent } from '../../shared/heatmap.component';
import { LineChartComponent } from '../../shared/line-chart.component';
import { BarChartComponent, BarSeries } from '../../shared/bar-chart.component';

@Component({
  selector: 'app-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeatmapComponent, LineChartComponent, BarChartComponent],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css'
})
export class StatsComponent implements OnInit {
  private readonly store = inject(DigestStore);
  private readonly title = inject(Title);

  readonly s = this.store.stats;

  readonly avgSubjects = computed(() =>
    this.s.totalDigests ? (this.s.totalSubjects / this.s.totalDigests).toFixed(1) : '0'
  );

  readonly periodLabel = `${formatDateShort(this.s.firstDate)} → ${formatDateShort(this.s.lastDate)}`;

  readonly categoryBars: BarSeries[] = this.s.categories.map((c) => ({
    label: this.store.labelFor(c.category),
    value: c.totalSubjects,
    accent: this.store.accentFor(c.category),
    sub: `${c.daysCovered} jour${c.daysCovered > 1 ? 's' : ''} couvert${
      c.daysCovered > 1 ? 's' : ''
    } · ${c.totalSources} source${c.totalSources > 1 ? 's' : ''}`
  }));

  readonly sourceBars: BarSeries[] = this.s.categories.map((c) => ({
    label: this.store.labelFor(c.category),
    value: c.totalSources,
    accent: this.store.accentFor(c.category)
  }));

  ngOnInit(): void {
    this.title.setTitle('Veille — Statistiques');
  }
}
