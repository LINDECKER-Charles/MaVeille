import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DigestStore } from '../core/digest-store.service';
import { ReadStateService } from '../core/read-state.service';
import { IconComponent } from '../ui/icon.component';
import { EXACT_PATH, EXACT_QUERY, NavGroup, PATH_PREFIX } from './nav.model';

/**
 * Rail de navigation groupé. Rendu deux fois : dans la colonne de gauche en
 * desktop, et dans le tiroir mobile — même markup, même état actif, un seul
 * modèle de données.
 */
@Component({
  selector: 'app-shell-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  host: { class: 'etb-nav' },
  template: `
    @for (group of groups(); track group.title) {
      <div class="etb-nav__group">{{ group.title }}</div>
      @for (entry of group.entries; track entry.label) {
        <a
          class="etb-nav__item nav-link"
          [routerLink]="entry.path"
          [queryParams]="entry.queryParams ?? null"
          routerLinkActive="etb-nav__item--on"
          [routerLinkActiveOptions]="entry.activeOptions"
          #rla="routerLinkActive"
          [attr.aria-current]="rla.isActive ? 'page' : null"
          (click)="navigated.emit()"
        >
          @if (entry.icon; as ic) {
            <app-icon [name]="ic" [size]="15" />
          } @else {
            <span class="mono-chip mono-chip--sm">{{ entry.mono }}</span>
          }
          <span class="etb-nav__label">{{ entry.label }}</span>
          @if (entry.meta; as m) {
            <span class="etb-nav__meta">{{ m }}</span>
          }
        </a>
      }
    }
  `
})
export class ShellNavComponent {
  private readonly store = inject(DigestStore);
  private readonly readState = inject(ReadStateService);

  /** Émis à chaque clic sur une destination — le tiroir mobile s'en sert pour se refermer. */
  readonly navigated = output<void>();

  private readonly latest = this.store.digests[0] ?? null;

  /** Pourcentage de digests marqués comme lus, recalculé à chaque changement. */
  private readonly readPct = computed(() => {
    const total = this.store.digests.length;
    return total === 0 ? 0 : Math.round((this.readState.count() / total) * 100);
  });

  protected readonly groups = computed<NavGroup[]>(() => {
    const s = this.store.stats;
    const byCategory = new Map(s.categories.map((c) => [c.category, c]));

    return [
      {
        title: "Aujourd'hui",
        entries: [
          { path: '/', label: 'Briefing', icon: 'sun', activeOptions: EXACT_PATH },
          // Raccourci de lecture : la même journée, ouverte sur son premier sujet.
          // La clé vient de l'index eager, donc sans charger la charge du jour.
          ...(this.latest?.firstSubject
            ? [
                {
                  path: `/digest/${this.latest.date}`,
                  label: 'Sujets du jour',
                  icon: 'file-text' as const,
                  queryParams: { sujet: this.latest.firstSubject },
                  activeOptions: EXACT_PATH,
                  meta: `${this.latest.totalSubjects}`
                }
              ]
            : [])
        ]
      },
      {
        title: 'Fil',
        entries: [
          {
            path: '/fil',
            label: 'Tous les sujets',
            icon: 'list',
            activeOptions: EXACT_QUERY,
            meta: `${s.totalSubjects}`
          },
          {
            path: '/jours',
            label: 'Par jour',
            icon: 'clock',
            activeOptions: EXACT_PATH,
            meta: `${s.totalDigests}`
          },
          {
            path: '/rapports',
            label: 'Rapports hebdo',
            icon: 'folder',
            activeOptions: PATH_PREFIX,
            meta: `${this.store.weeklies.length}`
          }
        ]
      },
      {
        title: 'Thématiques',
        entries: this.store.registry.map((c) => ({
          path: '/fil',
          label: c.label,
          mono: c.monogram,
          queryParams: { cat: c.slug },
          activeOptions: EXACT_QUERY,
          meta: `${byCategory.get(c.name)?.totalSubjects ?? 0}`
        }))
      },
      {
        title: 'Suivi',
        entries: [
          {
            path: '/stats',
            label: 'Régularité',
            icon: 'git-branch',
            activeOptions: EXACT_PATH
          },
          {
            path: '/stats-perso',
            label: 'Ma lecture',
            icon: 'check',
            activeOptions: EXACT_PATH,
            meta: `${this.readPct()} %`
          }
        ]
      }
    ];
  });
}
