import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DigestStore } from '../../core/digest-store.service';
import type { WeeklyReport } from '../../data/types';

@Component({
  selector: 'app-rapports-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <header class="page-head">
      <p class="eyebrow">Rapports hebdo</p>
      <h1>Rapports hebdomadaires</h1>
      <p class="sub">Synthèses transversales par semaine ISO (du lundi au dimanche).</p>
    </header>

    @if (weeklies.length === 0) {
      <p class="empty">Aucun rapport disponible pour le moment.</p>
    } @else {
      <ul class="reports" aria-label="Liste des rapports">
        @for (w of weeklies; track w.id) {
          <li>
            <a class="card" [routerLink]="['/rapports', w.id]">
              <div class="card-meta">
                <span class="id">{{ w.id }}</span>
                @if (w.rangeStart && w.rangeEnd) {
                  <span class="range">{{ frRange(w.rangeStart, w.rangeEnd) }}</span>
                } @else if (w.range) {
                  <span class="range">{{ w.range }}</span>
                }
                @if (w.id === currentId()) {
                  <span class="badge-current">EN COURS</span>
                }
              </div>
              <span class="title">{{ w.title }}</span>
            </a>
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 1080px;
        margin: 0 auto;
        padding: 32px 24px 80px;
      }
      @media (max-width: 600px) {
        :host { padding: 24px 16px 64px; }
      }
      .page-head {
        margin-bottom: 2rem;
      }
      .eyebrow {
        margin: 0 0 0.5rem;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--faint, var(--text-dim));
      }
      .page-head h1 {
        margin: 0 0 0.4rem;
        font-size: 2rem;
        font-weight: 800;
        letter-spacing: -0.02em;
      }
      .sub {
        margin: 0;
        color: var(--muted, var(--text-muted));
      }
      .empty {
        color: var(--faint, var(--text-dim));
        padding: 3rem 0;
        text-align: center;
      }
      .reports {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: var(--feed-gap, 0.8rem);
      }
      .card {
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
        padding: var(--card-pad, 1.1rem) 1.25rem;
        background: var(--surface, var(--bg-elevated));
        border: 1px solid var(--border);
        border-radius: 14px;
        color: var(--text);
        transition: border-color 0.14s ease, transform 0.14s ease, box-shadow 0.14s ease;
      }
      .card:hover,
      .card:focus-visible {
        border-color: var(--border-strong, var(--accent));
        transform: translateY(-2px);
        box-shadow: var(--shadow);
        outline: none;
      }
      .card:focus-visible {
        outline: 2px solid var(--brand, var(--accent));
        outline-offset: 2px;
      }
      .card-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.6rem;
      }
      .id {
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 600;
        color: var(--brand, var(--accent));
        background: var(--brand-soft, var(--accent-soft));
        border-radius: 999px;
        padding: 2px 9px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .range {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--faint, var(--text-dim));
        font-variant-numeric: tabular-nums;
      }
      .badge-current {
        font-family: var(--font-mono);
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.04em;
        color: var(--high, var(--accent));
        border: 1px solid var(--high, var(--accent));
        border-radius: 999px;
        padding: 1px 8px;
      }
      .title {
        font-weight: 600;
        font-size: 1.05rem;
        letter-spacing: -0.01em;
      }
      @media (prefers-reduced-motion: reduce) {
        .card {
          transition: none !important;
        }
        .card:hover,
        .card:focus-visible {
          transform: none;
        }
      }
    `
  ]
})
export class RapportsListComponent implements OnInit {
  private readonly store = inject(DigestStore);
  private readonly title = inject(Title);
  readonly weeklies = this.store.weeklies;

  /** Id of the in-progress week: current ISO week if present, else the latest still-open report. */
  readonly currentId = computed(() => resolveCurrentWeekId(this.weeklies));

  frRange(start: string, end: string): string {
    return formatFrRange(start, end);
  }

  ngOnInit(): void {
    this.title.setTitle('Veille — Rapports hebdomadaires');
  }
}

/**
 * "EN COURS" = the report covering the current ISO week (id match). If no report
 * matches today's ISO week, fall back to the most recent report whose covered
 * range has not ended yet (rangeEnd >= today) — pragmatic for reports authored
 * mid-week.
 */
export function resolveCurrentWeekId(weeklies: readonly WeeklyReport[]): string | null {
  if (weeklies.length === 0) return null;
  const today = isoToday();
  const nowWeek = currentIsoWeekId();
  if (weeklies.some((w) => w.id === nowWeek)) return nowWeek;

  let best: WeeklyReport | null = null;
  for (const w of weeklies) {
    if (w.rangeEnd && w.rangeEnd >= today && (!best || w.id > best.id)) best = w;
  }
  return best?.id ?? null;
}

function isoToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Current ISO-8601 week id, e.g. "2026-W25". */
function currentIsoWeekId(): string {
  const d = new Date();
  // ISO week: Thursday-anchored. Work in UTC to avoid DST drift.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7; // Mon=1..Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${`${week}`.padStart(2, '0')}`;
}

/** "16 – 20 juin 2026" — collapses shared month/year. */
export function formatFrRange(startIso: string, endIso: string): string {
  return formatFrRangeImpl(startIso, endIso);
}

function formatFrRangeImpl(startIso: string, endIso: string): string {
  const start = parseLocal(startIso);
  const end = parseLocal(endIso);
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

function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
