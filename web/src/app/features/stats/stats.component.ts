import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PageMetaService } from '../../core/page-meta.service';
import { DigestStore } from '../../core/digest-store.service';
import { formatDateShort } from '../../core/date.util';
import type { DayActivity } from '../../data/types';
import { BarChartComponent, BarSeries } from '../../shared/bar-chart.component';
import { DonutComponent, DonutSegment } from '../../shared/donut.component';
import { HeatmapComponent } from '../../shared/heatmap.component';
import { LineChartComponent } from '../../shared/line-chart.component';
import { IconComponent } from '../../ui/icon.component';
import { PanelComponent } from '../../ui/panel.component';
import { SegmentedControlComponent, SegmentOption } from '../../ui/segmented-control.component';

type Period = '30' | '90' | 'all';

const PERIODS: SegmentOption<Period>[] = [
  { value: '30', label: '30 j' },
  { value: '90', label: '90 j' },
  { value: 'all', label: 'Tout' }
];

/** Une entrée de légende : le libellé d'une thématique et son accent de graphique. */
interface CategoryLegendItem {
  readonly label: string;
  readonly accent: string;
}

/**
 * Part des jours du calendrier réellement couverts, en pourcentage.
 * Le dénominateur est l'étendue bornes incluses, pas le nombre de digests :
 * un trou dans la série doit faire baisser le chiffre.
 */
function coverage(daysCovered: number, first: string | null, last: string | null): number {
  if (!first || !last) return 0;
  const from = Date.parse(first);
  const to = Date.parse(last);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  const span = Math.round((to - from) / 86_400_000) + 1;
  return span > 0 ? Math.round((daysCovered / span) * 100) : 0;
}

/** La régularité de la veille : couverture, volume, répartition de l'effort. */
@Component({
  selector: 'app-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BarChartComponent,
    DonutComponent,
    HeatmapComponent,
    LineChartComponent,
    IconComponent,
    PanelComponent,
    SegmentedControlComponent
  ],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css'
})
export class StatsComponent {
  private readonly store = inject(DigestStore);

  /** Statistiques figées au build : aucune de ces valeurs ne bouge à l'exécution. */
  protected readonly s = this.store.stats;

  /** Fenêtre de la heatmap — la légende et le composant lisent la même valeur. */
  protected readonly heatmapWeeks = 26;

  protected readonly periodLabel = `${formatDateShort(this.s.firstDate)} → ${formatDateShort(this.s.lastDate)}`;

  /** Moyenne de sujets par digest — la routine vise une bande de 8 à 12 par jour. */
  protected readonly avgSubjects = this.s.totalDigests
    ? (this.s.totalSubjects / this.s.totalDigests).toFixed(1)
    : '0';

  protected readonly coveragePct = coverage(this.s.daysCovered, this.s.firstDate, this.s.lastDate);

  // --- Fenêtre du graphique de volume ---------------------------------------
  protected readonly periods = PERIODS;
  protected readonly period = signal<Period>('all');

  /** La courbe se lit mal au-delà de quelques dizaines de points : on la borne. */
  protected readonly timeline = computed<DayActivity[]>(() => {
    const all = this.s.timeline;
    const p = this.period();
    return p === 'all' ? all : all.slice(-Number(p));
  });

  // --- Répartition par thématique -------------------------------------------
  protected readonly categoryBars: BarSeries[] = this.s.categories.map((c) => ({
    label: this.store.labelFor(c.category),
    value: c.totalSubjects,
    accent: this.store.accentFor(c.category),
    sub: `${c.daysCovered} jour${c.daysCovered > 1 ? 's' : ''} · ${c.totalSources} source${
      c.totalSources > 1 ? 's' : ''
    }`
  }));

  protected readonly categoryLegend: CategoryLegendItem[] = this.s.categories.map((c) => ({
    label: this.store.labelFor(c.category),
    accent: this.store.accentFor(c.category)
  }));

  protected readonly categorySegments: DonutSegment[] = this.s.categories.map((c) => ({
    label: this.store.labelFor(c.category),
    value: c.totalSubjects,
    color: this.store.accentFor(c.category)
  }));

  constructor() {
    inject(PageMetaService).set(
      'Régularité',
      'La régularité de la veille : couverture des jours, volume de sujets et répartition de l\'effort par thématique.'
    );
  }
}
