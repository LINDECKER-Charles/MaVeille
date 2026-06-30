import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DigestStore } from '../../core/digest-store.service';
import { SeenService } from '../../core/seen.service';
import { ReadStateService } from '../../core/read-state.service';
import { FrDatePipe } from '../../core/date.pipe';
import { formatDateFull } from '../../core/date.util';
import { DigestTabsComponent } from './digest-tabs.component';
import type { DigestMeta, RenderedDigest } from '../../data/types';

@Component({
  selector: 'app-digest-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FrDatePipe, DigestTabsComponent],
  template: `
    <nav class="breadcrumb" aria-label="Fil d'Ariane">
      <a routerLink="/">&larr; Briefing</a>
    </nav>

    @if (digest(); as d) {
      <header class="day-head">
        <div class="head-text">
          <p class="eyebrow">Digest du jour</p>
          <h1>{{ d.date | frDate }}</h1>
        </div>

        <div class="head-actions">
          <div class="nav-pair" role="group" aria-label="Naviguer entre les digests">
            @if (older(); as o) {
              <a
                class="nav-btn"
                [routerLink]="['/digest', o.date]"
                [attr.aria-label]="'Digest précédent — ' + (o.date | frDate)"
                [attr.title]="'Précédent — ' + (o.date | frDate)"
              >
                <span aria-hidden="true">←</span>
              </a>
            } @else {
              <span class="nav-btn is-disabled" aria-hidden="true">←</span>
            }
            @if (newer(); as n) {
              <a
                class="nav-btn"
                [routerLink]="['/digest', n.date]"
                [attr.aria-label]="'Digest suivant — ' + (n.date | frDate)"
                [attr.title]="'Suivant — ' + (n.date | frDate)"
              >
                <span aria-hidden="true">→</span>
              </a>
            } @else {
              <span class="nav-btn is-disabled" aria-hidden="true">→</span>
            }
          </div>

          <button
            type="button"
            class="read-toggle"
            [class.checked]="isRead()"
            role="checkbox"
            [attr.aria-checked]="isRead()"
            [attr.aria-label]="
              (isRead() ? 'Marquer comme non lu' : 'Marquer comme lu') +
              ' — digest du ' + (d.date | frDate)
            "
            (click)="toggleRead()"
          >
            <span class="check" aria-hidden="true">✓</span>
            <span class="read-label">{{ isRead() ? 'Lu' : 'Marquer comme lu' }}</span>
          </button>
        </div>
      </header>

      <app-digest-tabs [digest]="d" />

      @if (older() || newer()) {
        <nav class="pager" aria-label="Navigation entre digests">
          @if (older(); as o) {
            <a class="pager-link prev" [routerLink]="['/digest', o.date]">
              <span class="pager-dir"><span aria-hidden="true">←</span> Précédent</span>
              <span class="pager-date">{{ o.date | frDate: 'short' }}</span>
              <span class="pager-sub">{{ subjectLabel(o) }}</span>
            </a>
          } @else {
            <span class="pager-empty" aria-hidden="true"></span>
          }
          @if (newer(); as n) {
            <a class="pager-link next" [routerLink]="['/digest', n.date]">
              <span class="pager-dir">Suivant <span aria-hidden="true">→</span></span>
              <span class="pager-date">{{ n.date | frDate: 'short' }}</span>
              <span class="pager-sub">{{ subjectLabel(n) }}</span>
            </a>
          } @else {
            <span class="pager-empty" aria-hidden="true"></span>
          }
        </nav>
      }
    } @else if (notFound()) {
      <header class="day-head">
        <div class="head-text">
          <p class="eyebrow">Digest du jour</p>
          <h1>Digest introuvable</h1>
          <p class="day-meta">Aucun contenu pour cette date.</p>
        </div>
      </header>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 1080px;
        margin: 0 auto;
        padding: 28px 24px 80px;
      }
      @media (max-width: 600px) {
        :host { padding: 24px 16px 64px; }
      }
      .breadcrumb {
        margin-bottom: 1.1rem;
        font-size: 13px;
      }
      .breadcrumb a {
        color: var(--faint);
        border-bottom: none;
        transition: color 0.15s ease;
      }
      .breadcrumb a:hover {
        color: var(--text);
      }
      .breadcrumb a:focus-visible {
        outline: 2px solid var(--brand);
        outline-offset: 2px;
        border-radius: 3px;
      }
      .day-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 14px 20px;
        flex-wrap: wrap;
        margin-bottom: 0.4rem;
      }
      .head-text {
        min-width: 0;
      }
      .eyebrow {
        margin: 0 0 0.35rem;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--faint);
      }
      .day-head h1 {
        margin: 0;
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1.2;
        text-transform: capitalize;
      }
      .day-meta {
        margin: 0.4rem 0 0;
        color: var(--faint);
        font-size: 0.9rem;
      }

      /* --- header actions: prev/next + read toggle --------------------------- */
      .head-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .nav-pair {
        display: inline-flex;
        gap: 6px;
      }
      .nav-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-sm);
        background: var(--surface);
        color: var(--text);
        font-size: 16px;
        line-height: 1;
        text-decoration: none;
        transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
      }
      .nav-btn:hover {
        border-color: var(--brand);
        color: var(--brand);
      }
      .nav-btn:focus-visible {
        outline: 2px solid var(--brand);
        outline-offset: 2px;
      }
      .nav-btn.is-disabled {
        opacity: 0.4;
        color: var(--faint);
        cursor: not-allowed;
      }
      .read-toggle {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        height: 36px;
        padding: 0 12px;
        border: 1.5px solid var(--border-strong);
        border-radius: var(--radius-sm);
        background: var(--surface);
        color: var(--text);
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
      }
      .read-toggle .check {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border: 1.5px solid var(--border-strong);
        border-radius: 4px;
        font-size: 11px;
        font-weight: 800;
        line-height: 1;
        color: transparent;
        transition: inherit;
      }
      .read-toggle:hover {
        border-color: var(--brand);
      }
      .read-toggle:focus-visible {
        outline: 2px solid var(--brand);
        outline-offset: 2px;
      }
      .read-toggle.checked {
        background: var(--brand);
        border-color: var(--brand);
        color: var(--bg);
      }
      .read-toggle.checked .check {
        background: var(--bg);
        border-color: var(--bg);
        color: var(--brand);
      }

      /* --- bottom pager ------------------------------------------------------ */
      .pager {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 36px;
        padding-top: 22px;
        border-top: 1px solid var(--border);
      }
      .pager-link {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 13px 16px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
        color: var(--text);
        text-decoration: none;
        transition: transform 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease;
      }
      .pager-link:hover {
        transform: translateY(-2px);
        border-color: var(--border-strong);
        box-shadow: var(--shadow);
      }
      .pager-link:focus-visible {
        outline: 2px solid var(--brand);
        outline-offset: 2px;
      }
      .pager-link.next {
        text-align: right;
        align-items: flex-end;
      }
      .pager-dir {
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: var(--faint);
      }
      .pager-date {
        font-size: 15px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .pager-sub {
        font-size: 12px;
        color: var(--muted);
      }

      @media (max-width: 600px) {
        .read-label {
          display: none;
        }
        .read-toggle {
          padding: 0 9px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .pager-link {
          transition: none;
        }
        .pager-link:hover {
          transform: none;
        }
      }
    `
  ]
})
export class DigestPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(DigestStore);
  private readonly seen = inject(SeenService);
  private readonly readState = inject(ReadStateService);
  private readonly title = inject(Title);

  readonly digest = signal<RenderedDigest | null>(null);
  readonly notFound = signal(false);

  /**
   * Index of the displayed digest in the store's newest-first metadata list.
   * Neighbours and read state derive from the digest actually on screen, so every
   * control stays consistent while the next day is still loading.
   */
  private readonly currentIndex = computed(() => {
    const d = this.digest();
    return d ? this.store.digests.findIndex((m) => m.date === d.date) : -1;
  });

  /** Newer neighbour (later date). Store is newest-first, so it sits one index up. */
  readonly newer = computed<DigestMeta | null>(() => {
    const i = this.currentIndex();
    return i > 0 ? this.store.digests[i - 1] : null;
  });

  /** Older neighbour (earlier date), one index down in the newest-first list. */
  readonly older = computed<DigestMeta | null>(() => {
    const i = this.currentIndex();
    return i >= 0 && i < this.store.digests.length - 1 ? this.store.digests[i + 1] : null;
  });

  /** Reactive read/unread state of the displayed digest. */
  readonly isRead = computed(() => {
    const d = this.digest();
    return d ? this.readState.isRead(d.date) : false;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const date = params.get('date')!;
      this.title.setTitle(`Veille — ${formatDateFull(date)}`);
      void this.load(date);
    });
  }

  toggleRead(): void {
    const date = this.digest()?.date;
    if (date) this.readState.toggle(date);
  }

  subjectLabel(meta: DigestMeta): string {
    const n = meta.totalSubjects;
    return `${n} sujet${n > 1 ? 's' : ''}`;
  }

  private async load(date: string): Promise<void> {
    const d = await this.store.loadDigest(date);
    if (d) {
      this.digest.set(d);
      this.notFound.set(false);
      this.seen.acknowledge(date);
    } else {
      this.digest.set(null);
      this.notFound.set(true);
    }
  }
}
