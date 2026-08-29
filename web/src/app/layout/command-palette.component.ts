import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  model,
  signal,
  viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { DigestStore } from '../core/digest-store.service';
import { SearchService } from '../core/search.service';
import { SubjectIndexService, subjectKey } from '../core/subject-index.service';
import { formatDateShort, formatDayMonth } from '../core/date.util';
import { IconComponent } from '../ui/icon.component';
import { KbdComponent } from '../ui/kbd.component';
import type { SubjectEntry } from '../data/types';

/** Une ligne de résultat, quelle que soit sa provenance. */
interface PaletteHit {
  readonly id: string;
  readonly mono: string;
  readonly title: string;
  readonly date: string;
  readonly commands: unknown[];
  readonly queryParams: Record<string, string> | null;
}

const DEBOUNCE_MS = 180;
const TEXT_HITS_MAX = 5;
/** Au-delà de ce nombre de titres trouvés, inutile d'ouvrir le plein texte. */
const TITLE_ENOUGH = 3;

/**
 * Palette de commandes ⌘K — la seule surface de recherche de l'application.
 *
 * Deux sources, dans cet ordre : les titres de sujets (index plat, précis), puis
 * le plein texte des digests (index existant, plus large). Les deux mènent au
 * même endroit : la journée concernée, sujet déplié quand on le connaît.
 */
@Component({
  selector: 'app-command-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, KbdComponent],
  styleUrl: './command-palette.component.css',
  template: `
    <div class="palette" role="dialog" aria-modal="true" aria-label="Rechercher un sujet">
      <button type="button" class="palette__backdrop" aria-label="Fermer la recherche" (click)="close()"></button>

      <div class="palette__panel">
        <div class="palette__field">
          <app-icon name="search" [size]="16" />
          <input
            #field
            id="search-input"
            type="search"
            class="palette__input"
            role="combobox"
            aria-label="Rechercher un sujet, une source, une techno"
            aria-controls="palette-results"
            aria-expanded="true"
            [attr.aria-activedescendant]="activeId()"
            placeholder="Chercher un sujet, une source, une techno…"
            [value]="query()"
            (input)="onInput($any($event.target).value)"
            (keydown)="onKeydown($event)"
          />
          <app-kbd keys="esc" />
        </div>

        <div class="palette__body">
          @if (subjectHits().length) {
            <div class="palette__group">Sujets · {{ subjectHits().length }}</div>
          }
          <div id="palette-results" role="listbox" aria-label="Résultats">
            @for (hit of hits(); track hit.id; let i = $index) {
              @if (i === subjectHits().length && textHits().length) {
                <div class="palette__group">Dans le texte · {{ textHits().length }}</div>
              }
              <button
                type="button"
                role="option"
                class="palette__row"
                [id]="'palette-opt-' + i"
                [class.palette__row--on]="i === active()"
                [attr.aria-selected]="i === active()"
                (click)="go(hit)"
                (mouseenter)="active.set(i)"
              >
                <span class="mono-chip mono-chip--sm">{{ hit.mono }}</span>
                <span class="palette__title">{{ hit.title }}</span>
                <span class="palette__date">{{ hit.date }}</span>
              </button>
            }
          </div>

          @if (!hits().length) {
            <p class="palette__void">
              {{ query().trim().length < 2 ? 'Tape au moins deux caractères.' : 'Aucun sujet ne correspond.' }}
            </p>
          }

          <div class="palette__foot">
            <p id="search-help" class="palette__help" role="status" aria-live="polite">{{ help() }}</p>
            <span class="palette__keys">↑↓ naviguer · ↵ ouvrir · esc fermer</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CommandPaletteComponent {
  private readonly router = inject(Router);
  private readonly store = inject(DigestStore);
  private readonly subjects = inject(SubjectIndexService);
  private readonly search = inject(SearchService);

  /** Ouverture pilotée par la coque (⌘K, bouton de la barre, onglet mobile). */
  readonly open = model.required<boolean>();

  protected readonly query = signal('');
  protected readonly active = signal(0);
  protected readonly subjectHits = signal<readonly PaletteHit[]>([]);
  protected readonly textHits = signal<readonly PaletteHit[]>([]);

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private debounce: ReturnType<typeof setTimeout> | null = null;
  private runId = 0;

  protected readonly hits = computed(() => [...this.subjectHits(), ...this.textHits()]);
  protected readonly activeId = computed(() =>
    this.hits().length ? `palette-opt-${this.active()}` : null
  );

  protected readonly help = computed(() => {
    const n = this.hits().length;
    if (this.query().trim().length < 2) return `${this.store.stats.totalSubjects} sujets indexés`;
    return `${n} résultat${n > 1 ? 's' : ''}`;
  });

  constructor() {
    // Le focus suit la disponibilité du champ : `viewChild` est un signal, donc
    // l'effet se rejoue dès que l'élément est rendu. Pas de `queueMicrotask`,
    // dont l'ordonnancement dépendait de la charge de la machine.
    effect(() => {
      if (this.open()) this.field()?.nativeElement.focus();
    });

    // À l'ouverture, on préchauffe l'index pour que la première frappe réponde
    // tout de suite. `runQuery` l'attend de toute façon : le résultat ne dépend
    // pas de qui gagne la course.
    effect(() => {
      if (this.open()) void this.subjects.load();
    });
  }

  protected close(): void {
    this.open.set(false);
  }

  protected onInput(value: string): void {
    this.query.set(value);
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.runQuery(value), DEBOUNCE_MS);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const total = this.hits().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (total) this.active.set((this.active() + 1) % total);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (total) this.active.set((this.active() - 1 + total) % total);
        break;
      case 'Enter': {
        const hit = this.hits()[this.active()];
        if (hit) {
          event.preventDefault();
          this.go(hit);
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  protected go(hit: PaletteHit): void {
    this.close();
    void this.router.navigate(hit.commands, { queryParams: hit.queryParams ?? {} });
  }

  /** Relance les deux recherches ; `runId` jette les réponses hors d'ordre. */
  private async runQuery(raw: string): Promise<void> {
    const q = raw.trim();
    const run = ++this.runId;
    this.active.set(0);

    if (q.length < 2) {
      this.subjectHits.set([]);
      this.textHits.set([]);
      return;
    }

    // Chercher avant la fin du chargement rendrait un index vide : on attend.
    await this.subjects.load();
    if (run !== this.runId) return;

    const byTitle = this.subjects.search(q).map((s) => this.toHit(s));
    this.subjectHits.set(byTitle);

    // L'index plein texte pèse ~2 Mo : on ne le télécharge que lorsque les
    // titres ne suffisent pas à répondre. Au-delà de TITLE_ENOUGH résultats,
    // la réponse est déjà là et la recherche reste instantanée.
    if (byTitle.length >= TITLE_ENOUGH) {
      this.textHits.set([]);
      return;
    }

    const textual = await this.search.search(q);
    if (run !== this.runId) return;

    // Un jour déjà remonté par un titre de sujet n'a pas à réapparaître.
    const seen = new Set(this.subjectHits().map((h) => h.id.split('#')[0]));
    this.textHits.set(
      textual
        .filter((h) => !seen.has(h.date))
        .slice(0, TEXT_HITS_MAX)
        .map((h) => ({
          id: `${h.date}#text-${h.scope}-${h.type}`,
          mono: this.store.monogramFor(h.scope),
          title: `${this.store.labelFor(h.scope)} — digest du ${formatDateShort(h.date)}`,
          date: formatDayMonth(h.date),
          commands: ['/digest', h.date],
          queryParams: null
        }))
    );
  }

  private toHit(s: SubjectEntry): PaletteHit {
    return {
      id: `${s.date}#${s.slug}-${s.index}`,
      mono: s.mono,
      title: s.title,
      date: formatDayMonth(s.date),
      commands: ['/digest', s.date],
      queryParams: { sujet: subjectKey(s.slug, s.index) }
    };
  }
}
