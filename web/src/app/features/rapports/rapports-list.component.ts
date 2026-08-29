import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageMetaService } from '../../core/page-meta.service';
import { DigestStore } from '../../core/digest-store.service';
import { parseIso, toIso } from '../../core/date.util';
import { BadgeComponent } from '../../ui/badge.component';
import { IconComponent } from '../../ui/icon.component';
import type { WeeklyReport } from '../../data/types';

/** Une carte de la grille : tout est mis en forme ici pour garder le template plat. */
interface ReportCard {
  readonly id: string;
  readonly title: string;
  readonly range: string;
  readonly excerpt: string;
  readonly subjects: string;
  readonly current: boolean;
}

/** L'index des rapports hebdomadaires, du plus récent au plus ancien. */
@Component({
  selector: 'app-rapports-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BadgeComponent, IconComponent],
  styleUrl: './rapports-list.component.css',
  template: `
    <div class="screen">
      <div class="screen__head">
        <span class="screen__glyph"><app-icon name="folder" [size]="17" /></span>
        <div class="screen__heading">
          <h1 class="screen__title">Rapports hebdomadaires</h1>
          <div class="screen__sub">
            Synthèses transversales par semaine ISO, du lundi au dimanche.
          </div>
        </div>
      </div>

      <div class="screen__body">
        @if (cards().length) {
          <ul class="reports" aria-label="Rapports hebdomadaires, du plus récent au plus ancien">
            @for (c of cards(); track c.id) {
              <li class="reports__cell">
                <a class="etb-card etb-card--interactive report" [routerLink]="['/rapports', c.id]">
                  <span class="report__stamp">
                    <app-badge size="sm" [mono]="true" tone="info">{{ c.id }}</app-badge>
                    @if (c.range) {
                      <span class="report__range">{{ c.range }}</span>
                    }
                    @if (c.current) {
                      <app-badge size="sm" tone="brand">En cours</app-badge>
                    }
                  </span>

                  <span class="report__title">{{ c.title }}</span>

                  @if (c.excerpt) {
                    <span class="report__excerpt">{{ c.excerpt }}</span>
                  }

                  <span class="report__foot">
                    <span class="report__count">{{ c.subjects }}</span>
                    <span class="etb-btn etb-btn--secondary etb-btn--sm report__cta">
                      Lire
                      <app-icon name="arrow-right" [size]="14" />
                    </span>
                  </span>
                </a>
              </li>
            }
          </ul>
        } @else {
          <div class="etb-empty">
            <span class="etb-empty__icon"><app-icon name="folder" [size]="18" /></span>
            <p class="etb-empty__title">Aucun rapport pour le moment</p>
            <p class="etb-empty__desc">
              La première synthèse paraîtra à la clôture de la semaine ISO en cours.
            </p>
          </div>
        }
      </div>
    </div>
  `
})
export class RapportsListComponent {
  private readonly store = inject(DigestStore);

  protected readonly cards = computed<ReportCard[]>(() => {
    const current = resolveCurrentWeekId(this.store.weeklies);
    return this.store.weeklies.map((w) => ({
      id: w.id,
      title: w.title,
      range: rangeLabel(w),
      excerpt: w.excerpt ?? '',
      subjects: subjectsLabel(w),
      current: w.id === current
    }));
  });

  constructor() {
    inject(PageMetaService).set(
      'Rapports hebdomadaires',
      'Les synthèses hebdomadaires de la veille : une par semaine ISO, du lundi au dimanche.'
    );
  }
}

/** Plage couverte : dérivée de l'id ISO au build, `range` ne sert que de filet. */
function rangeLabel(w: WeeklyReport): string {
  if (w.rangeStart && w.rangeEnd) return formatFrRange(w.rangeStart, w.rangeEnd);
  return w.range ?? '';
}

/** Nombre de sujets couverts — la distribution manque sur les plus vieux rapports. */
function subjectsLabel(w: WeeklyReport): string {
  const total = w.distribution?.reduce((sum, d) => sum + d.count, 0) ?? 0;
  if (total === 0) return '';
  return `${total} sujet${total > 1 ? 's' : ''} couvert${total > 1 ? 's' : ''}`;
}

/**
 * « En cours » = le rapport qui couvre la semaine ISO courante (id identique).
 * Faute de correspondance, on retient le plus récent dont la plage n'est pas
 * close (rangeEnd >= aujourd'hui) — cas des rapports écrits en milieu de semaine.
 */
export function resolveCurrentWeekId(weeklies: readonly WeeklyReport[]): string | null {
  if (weeklies.length === 0) return null;
  const today = toIso(new Date());
  const nowWeek = currentIsoWeekId();
  if (weeklies.some((w) => w.id === nowWeek)) return nowWeek;

  let best: WeeklyReport | null = null;
  for (const w of weeklies) {
    if (w.rangeEnd && w.rangeEnd >= today && (!best || w.id > best.id)) best = w;
  }
  return best?.id ?? null;
}


/** Id de semaine ISO-8601 courante, ex. « 2026-W25 ». */
function currentIsoWeekId(): string {
  const d = new Date();
  // Semaine ISO : ancrée sur le jeudi. On calcule en UTC pour éviter la dérive DST.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7; // lun=1..dim=7
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${`${week}`.padStart(2, '0')}`;
}

/** « 16 – 20 juin 2026 » — le mois et l'année communs ne sont écrits qu'une fois. */
export function formatFrRange(startIso: string, endIso: string): string {
  const start = parseIso(startIso);
  const end = parseIso(endIso);
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'long' });
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const endLabel = `${end.getDate()} ${month.format(end)} ${end.getFullYear()}`;
  if (sameMonth) return `${start.getDate()} – ${endLabel}`;
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = sameYear
    ? `${start.getDate()} ${month.format(start)}`
    : `${start.getDate()} ${month.format(start)} ${start.getFullYear()}`;
  return `${startLabel} – ${endLabel}`;
}

