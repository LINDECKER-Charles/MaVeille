import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ContentLink,
  extractCodeBlocks,
  extractLinks,
  firstSentenceOf,
  withAnchors
} from '../../core/content.util';
import { PageMetaService } from '../../core/page-meta.service';
import { ReadStateService } from '../../core/read-state.service';
import { MarkdownComponent } from '../../shared/markdown.component';
import { ButtonComponent } from '../../ui/button.component';
import { IconComponent } from '../../ui/icon.component';
import { IconButtonComponent } from '../../ui/icon-button.component';
import { KeyValueListComponent } from '../../ui/key-value-list.component';
import { SegmentedControlComponent, SegmentOption } from '../../ui/segmented-control.component';
import type { DaySubject } from './day-subjects';

type ReaderMode = 'cours' | 'code' | 'src';

const MODES: SegmentOption<ReaderMode>[] = [
  { value: 'cours', label: 'Mini-cours' },
  { value: 'code', label: 'Code seul' },
  { value: 'src', label: 'Sources' }
];

/** Lecture d'un sujet : un mini-cours, ses sections, sa source primaire. */
@Component({
  selector: 'app-subject-reader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MarkdownComponent,
    ButtonComponent,
    IconComponent,
    IconButtonComponent,
    KeyValueListComponent,
    SegmentedControlComponent
  ],
  styleUrl: './subject-reader.component.css',
  template: `
    <div class="screen">
      <nav class="etb-crumbs reader__crumbs" aria-label="Fil d'Ariane">
        <a [routerLink]="['/digest', date()]">{{ dayTitle() }}</a>
        <span aria-hidden="true">/</span>
        <span>{{ subject().label }}</span>
        <span aria-hidden="true">/</span>
        <span class="etb-crumbs__current">Sujet {{ position() }} sur {{ siblings().length }}</span>
      </nav>

      <div class="screen__head reader__head">
        <span class="mono-chip mono-chip--lg">{{ subject().mono }}</span>
        <div class="screen__heading">
          <h1 class="reader__title">{{ subject().title }}</h1>
          <div class="screen__sub">
            Mini-cours · {{ toc().length }} section{{ toc().length > 1 ? 's' : '' }} · lecture ~{{
              subject().readingMinutes
            }}
            min
          </div>
        </div>
        <div class="screen__actions">
          <app-icon-button
            [icon]="copied() ? 'check' : 'link'"
            label="Copier le lien du sujet"
            (click)="copyLink()"
          />
        </div>
      </div>

      <div class="screen__toolbar">
        <app-segmented-control
          size="sm"
          label="Vue du sujet"
          [options]="modes"
          [(value)]="mode"
        />
        <span class="etb-toolbar__spacer"></span>
        @if (previous(); as p) {
          <a
            class="etb-btn etb-btn--ghost etb-btn--sm"
            [routerLink]="['/digest', date()]"
            [queryParams]="{ sujet: p.key }"
          >
            <app-icon name="chevron-left" [size]="14" />
            Précédent
          </a>
        } @else {
          <button type="button" class="etb-btn etb-btn--ghost etb-btn--sm" disabled>
            <app-icon name="chevron-left" [size]="14" />
            Précédent
          </button>
        }
        @if (next(); as n) {
          <a
            class="etb-btn etb-btn--secondary etb-btn--sm reader__next"
            [routerLink]="['/digest', date()]"
            [queryParams]="{ sujet: n.key }"
          >
            <span class="reader__next-label">Sujet suivant · {{ n.title }}</span>
            <app-icon name="chevron-right" [size]="14" />
          </a>
        }
      </div>

      <div class="screen__split">
        <div class="screen__body">
          <div class="prose-col">
            <app-key-value-list [items]="facts()" [bordered]="true" />

            @switch (mode()) {
              @case ('code') {
                @for (block of codeBlocks(); track $index) {
                  <app-markdown [html]="block" />
                } @empty {
                  <p class="reader__void">Ce sujet ne contient aucun bloc de code.</p>
                }
              }
              @case ('src') {
                <div class="reader__links">
                  @for (l of allLinks(); track l.href; let first = $first) {
                    <a [href]="l.href" target="_blank" rel="noopener noreferrer" class="reader__link">
                      <app-icon [name]="first && subject().sourceUrl ? 'link' : 'external-link'" [size]="13" />
                      <span class="reader__link-label">{{ l.label }}</span>
                      <span class="reader__link-href">{{ l.href }}</span>
                    </a>
                  } @empty {
                    <p class="reader__void">Ce sujet ne cite aucune source liée.</p>
                  }
                </div>
              }
              @default {
                <app-markdown [html]="body()" />
              }
            }

            <div class="reader__foot">
              <span class="reader__foot-text">
                Sujet {{ position() }} sur {{ siblings().length }} · il te reste ~{{ remaining() }} min de lecture
              </span>
              <app-button
                size="sm"
                variant="ghost"
                [iconLeft]="isRead() ? 'circle-check' : 'check'"
                (click)="toggleRead()"
              >
                {{ isRead() ? 'Journée lue' : 'Marquer comme lu' }}
              </app-button>
              @if (next(); as n) {
                <a
                  class="etb-btn etb-btn--primary etb-btn--sm"
                  [routerLink]="['/digest', date()]"
                  [queryParams]="{ sujet: n.key }"
                >
                  Sujet suivant
                  <app-icon name="arrow-right" [size]="14" />
                </a>
              } @else {
                <a class="etb-btn etb-btn--primary etb-btn--sm" [routerLink]="['/digest', date()]">
                  Retour au briefing
                  <app-icon name="arrow-right" [size]="14" />
                </a>
              }
            </div>
          </div>
        </div>

        <aside class="side-panel" aria-label="Contexte du sujet">
          @if (subject().sourceUrl; as url) {
            <div>
              <div class="panel-label"><span>Source primaire</span></div>
              <div class="source-card">
                <span class="source-card__url">{{ subject().domain }}</span>
                @if (subject().published; as pub) {
                  <span class="source-card__meta">{{ subject().source }} · publié le {{ pub }}</span>
                } @else if (subject().source; as src) {
                  <span class="source-card__meta">{{ src }}</span>
                }
                <a
                  class="etb-btn etb-btn--secondary etb-btn--sm etb-btn--block"
                  [href]="url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ouvrir la source
                  <app-icon name="external-link" [size]="14" />
                </a>
              </div>
            </div>
          }

          <!-- Les ancres ne pointent que sur le corps du mini-cours : hors de
               cette vue, le sommaire mènerait à des sections absentes. -->
          @if (toc().length && mode() === 'cours') {
            <div>
              <div class="panel-label"><span>Dans ce sujet</span></div>
              <div class="toc">
                @for (t of toc(); track t.id) {
                  <a class="toc__item" [href]="'#' + t.id">{{ t.label }}</a>
                }
              </div>
            </div>
          }

          <div>
            <div class="panel-label"><span>Sujets du jour</span></div>
            <div class="toc">
              @for (s of siblings(); track s.key) {
                <a
                  class="sibling"
                  [class.sibling--on]="s.key === subject().key"
                  [routerLink]="['/digest', date()]"
                  [queryParams]="{ sujet: s.key }"
                >
                  <span class="mono-chip mono-chip--sm">{{ s.mono }}</span>
                  <span class="sibling__title">{{ s.title }}</span>
                  <span class="sibling__rt">~{{ s.readingMinutes }} min</span>
                </a>
              }
            </div>
          </div>
        </aside>
      </div>
    </div>
  `
})
export class SubjectReaderComponent {
  private readonly pageMeta = inject(PageMetaService);
  private readonly readState = inject(ReadStateService);

  readonly subject = input.required<DaySubject>();
  readonly siblings = input.required<readonly DaySubject[]>();
  readonly date = input.required<string>();
  readonly dayTitle = input.required<string>();

  protected readonly modes = MODES;
  protected readonly mode = signal<ReaderMode>('cours');
  protected readonly copied = signal(false);

  private readonly anchored = computed(() => withAnchors(this.subject().bodyHtml));
  protected readonly body = computed(() => this.anchored().html);
  protected readonly toc = computed(() => this.anchored().toc);
  protected readonly codeBlocks = computed(() => extractCodeBlocks(this.subject().bodyHtml));
  /**
   * La vue « Sources » ouvre sur la source primaire, puis les liens cités dans
   * le corps. Sans elle, la vue serait souvent vide : beaucoup de sujets
   * n'ont pas de lien inline en plus de leur source.
   */
  protected readonly allLinks = computed<ContentLink[]>(() => {
    const s = this.subject();
    const body = extractLinks(s.bodyHtml);
    if (!s.sourceUrl) return body;
    return [
      { href: s.sourceUrl, label: s.source ?? s.domain ?? s.sourceUrl },
      ...body.filter((l) => l.href !== s.sourceUrl)
    ];
  });

  private readonly at = computed(() => this.siblings().findIndex((s) => s.key === this.subject().key));
  protected readonly position = computed(() => this.at() + 1);
  protected readonly previous = computed(() => this.siblings()[this.at() - 1] ?? null);
  protected readonly next = computed(() => this.siblings()[this.at() + 1] ?? null);

  /** Minutes restantes une fois ce sujet lu : la somme des suivants. */
  protected readonly remaining = computed(() =>
    this.siblings()
      .slice(this.at() + 1)
      .reduce((n, s) => n + s.readingMinutes, 0)
  );

  /** L'état « lu » porte sur la journée entière, comme sur le briefing. */
  protected readonly isRead = computed(() => this.readState.ids().has(this.date()));

  protected readonly facts = computed(() => {
    const s = this.subject();
    return [
      { label: 'Source', value: s.source ?? s.domain ?? '—' },
      { label: 'Publié le', value: s.published ?? '—' },
      { label: 'Thématique', value: s.label },
      { label: 'Lecture', value: `~${s.readingMinutes} min` }
    ];
  });

  constructor() {
    // Titre et description suivent le sujet ouvert : un permalien partagé est
    // lisible tel quel dans un onglet comme dans un aperçu de lien.
    effect(() =>
      this.pageMeta.set(this.subject().title, firstSentenceOf(this.subject().bodyHtml))
    );
  }

  protected toggleRead(): void {
    this.readState.toggle(this.date());
  }

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1400);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé, permission refusée).
    }
  }
}
