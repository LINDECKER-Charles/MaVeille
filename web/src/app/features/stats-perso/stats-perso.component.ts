import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DigestStore } from '../../core/digest-store.service';
import { ReadStateService } from '../../core/read-state.service';
import { FrDatePipe } from '../../core/date.pipe';
import type { DayActivity, DigestMeta } from '../../data/types';
import { HeatmapComponent } from '../../shared/heatmap.component';
import { BarChartComponent, BarSeries } from '../../shared/bar-chart.component';
import { DonutComponent, DonutSegment } from '../../shared/donut.component';

interface CategoryLegendItem {
  readonly label: string;
  readonly accent: string;
}

/**
 * Tableau de bord personnel : croise la liste complète des digests
 * ({@link DigestStore}) avec l'état lu/non-lu local ({@link ReadStateService}).
 * Tout est dérivé en `computed` du signal `readState.ids` : la page reste à jour
 * quand un digest est coché/décoché ailleurs dans l'app.
 */
@Component({
  selector: 'app-stats-perso',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FrDatePipe, HeatmapComponent, BarChartComponent, DonutComponent],
  templateUrl: './stats-perso.component.html',
  styleUrl: './stats-perso.component.css'
})
export class StatsPersoComponent implements OnInit {
  readonly store = inject(DigestStore);
  private readonly readState = inject(ReadStateService);
  private readonly title = inject(Title);

  /** Digests marqués lus, du plus récent au plus ancien (digests déjà triés). */
  readonly readDigests = computed<DigestMeta[]>(() => {
    const ids = this.readState.ids();
    return this.store.digests.filter((d) => ids.has(d.date));
  });

  readonly total = this.store.digests.length;
  readonly readCount = computed(() => this.readDigests().length);
  readonly progressPct = computed(() =>
    this.total ? Math.round((this.readCount() / this.total) * 100) : 0
  );

  /** Digest lu le plus récent (la liste est déjà triée décroissant). */
  readonly latestRead = computed<DigestMeta | null>(() => this.readDigests()[0] ?? null);

  // --- Répartition des lus par catégorie -----------------------------------
  private readonly categoryCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const d of this.readDigests()) {
      for (const cat of d.categories) counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  });

  readonly categorySegments = computed<DonutSegment[]>(() =>
    this.categoryCounts().map((c) => ({
      label: this.store.labelFor(c.category),
      value: c.count,
      color: this.store.accentFor(c.category)
    }))
  );

  readonly categoryBars = computed<BarSeries[]>(() =>
    this.categoryCounts().map((c) => ({
      label: this.store.labelFor(c.category),
      value: c.count,
      accent: this.store.accentFor(c.category),
      sub: `${c.count} digest${c.count > 1 ? 's' : ''} lu${c.count > 1 ? 's' : ''}`
    }))
  );

  readonly categoryLegend = computed<CategoryLegendItem[]>(() =>
    this.categoryCounts().map((c) => ({
      label: this.store.labelFor(c.category),
      accent: this.store.accentFor(c.category)
    }))
  );

  // --- Heatmap des lectures (sujets du digest lu, sinon 0) ------------------
  readonly readActivity = computed<DayActivity[]>(() =>
    this.readDigests().map((d) => ({
      date: d.date,
      subjects: d.totalSubjects,
      categories: d.categories.length
    }))
  );

  ngOnInit(): void {
    this.title.setTitle('Veille — Mes stats');
  }

  toggleRead(date: string): void {
    this.readState.toggle(date);
  }

  reset(): void {
    if (this.readCount() === 0) return;
    if (confirm('Réinitialiser toutes les lectures ? Cette action est irréversible.')) {
      this.readState.reset();
    }
  }
}
