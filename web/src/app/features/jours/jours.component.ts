import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageMetaService } from '../../core/page-meta.service';
import { DigestStore } from '../../core/digest-store.service';
import { ReadStateService } from '../../core/read-state.service';
import { formatDateShort, parseIso } from '../../core/date.util';
import { IconComponent } from '../../ui/icon.component';

const MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.'
];

/** L'historique jour par jour, du plus récent au plus ancien. */
@Component({
  selector: 'app-jours',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  styleUrl: './jours.component.css',
  template: `
    <div class="screen">
      <div class="screen__head">
        <span class="screen__glyph"><app-icon name="clock" [size]="17" /></span>
        <div class="screen__heading">
          <h1 class="screen__title">Par jour</h1>
          <div class="screen__sub">{{ period() }}</div>
        </div>
      </div>

      <div class="screen__body">
        <div class="days">
          @for (d of days(); track d.date) {
            <a class="day" [routerLink]="['/digest', d.date]" [class.day--read]="d.read">
              <span class="day__stamp">
                <span class="day__num">{{ d.day }}</span>
                <span class="day__month">{{ d.month }}</span>
              </span>
              <span class="day__rule"></span>
              <span class="day__main">
                <span class="day__headline">{{ d.headline }}</span>
                <span class="day__meta">{{ d.meta }}</span>
              </span>
              <span class="day__aside">
                @if (d.read) {
                  <app-icon name="circle-check" [size]="14" label="Digest lu" />
                }
                <span class="day__cats">{{ d.cats }}</span>
                <app-icon name="chevron-right" [size]="15" />
              </span>
            </a>
          }
        </div>
      </div>
    </div>
  `
})
export class JoursComponent {
  private readonly store = inject(DigestStore);
  private readonly readState = inject(ReadStateService);

  protected readonly period = computed(() => {
    const s = this.store.stats;
    return `${s.totalDigests} digests · ${formatDateShort(s.firstDate)} → ${formatDateShort(s.lastDate)}`;
  });

  protected readonly days = computed(() => {
    const read = this.readState.ids();
    return this.store.digests.map((d) => {
      const date = parseIso(d.date);
      return {
        date: d.date,
        day: `${date.getDate()}`,
        month: MONTHS[date.getMonth()],
        headline: d.headline ?? d.categories.map((c) => this.store.labelFor(c)).join(' · '),
        meta:
          `${d.totalSubjects} sujet${d.totalSubjects > 1 ? 's' : ''} · ` +
          `${d.totalSources} source${d.totalSources > 1 ? 's' : ''} · lecture ~${d.readingMinutes} min`,
        cats: d.categories.map((c) => this.store.monogramFor(c)).join(' '),
        read: read.has(d.date)
      };
    });
  });

  constructor() {
    inject(PageMetaService).set(
      'Par jour',
      "L'historique de la veille jour par jour, avec l'accroche et le volume de chaque digest."
    );
  }
}
