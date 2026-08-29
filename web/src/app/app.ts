import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from './core/theme.service';
import { PrefsService } from './core/prefs.service';
import { DigestStore } from './core/digest-store.service';
import { formatDateShort, relativeDay } from './core/date.util';
import { CommandPaletteComponent } from './layout/command-palette.component';
import { ShellNavComponent } from './layout/shell-nav.component';
import { EXACT_PATH, NavEntry, PATH_PREFIX } from './layout/nav.model';
import { BadgeComponent } from './ui/badge.component';
import { IconButtonComponent } from './ui/icon-button.component';
import { IconComponent } from './ui/icon.component';
import { KbdComponent } from './ui/kbd.component';

/** Le format des digests est documenté dans le dépôt, pas dans l'app. */
const DIGEST_FORMAT_URL = 'https://github.com/LINDECKER-Charles/Veille/blob/main/DIGEST_FORMAT.md';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ShellNavComponent,
    CommandPaletteComponent,
    BadgeComponent,
    IconComponent,
    IconButtonComponent,
    KbdComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly store = inject(DigestStore);
  readonly prefs = inject(PrefsService);

  readonly theme = this.themeService.theme;
  protected readonly DIGEST_FORMAT_URL = DIGEST_FORMAT_URL;
  protected readonly totalSubjects = this.store.stats.totalSubjects;

  /** Tiroir mobile (bouton « … ») — pertinent sous 900px, cf. app.css. */
  readonly menuOpen = signal(false);
  /** Palette ⌘K. Le composant n'est monté que lorsqu'elle est ouverte. */
  readonly paletteOpen = signal(false);

  /** Élément qui avait le focus avant l'ouverture de la palette, pour le lui rendre. */
  private focusBeforePalette: HTMLElement | null = null;

  constructor() {
    // À la fermeture, le focus doit revenir d'où il vient : sans ça il retombe
    // sur <body> et la navigation au clavier repart du haut de la page.
    effect(() => {
      if (this.paletteOpen()) return;
      const previous = this.focusBeforePalette;
      this.focusBeforePalette = null;
      previous?.focus?.();
    });
  }

  /** Semaine ISO du rapport hebdomadaire le plus récent, affichée près du logo. */
  protected readonly currentWeek = computed(() => this.store.weeklies[0]?.id ?? null);

  protected readonly lastDigestAgo = computed(() => {
    const last = this.store.digests[0]?.date;
    return last ? relativeDay(last) : 'aucun digest';
  });

  protected readonly period = computed(() => {
    const s = this.store.stats;
    return s.firstDate && s.lastDate
      ? `${formatDateShort(s.firstDate)} → ${formatDateShort(s.lastDate)}`
      : 'période inconnue';
  });

  /** Onglets mobiles — le sous-ensemble du rail qui porte le parcours de lecture. */
  protected readonly tabs: NavEntry[] = [
    { path: '/', label: 'Briefing', icon: 'sun', activeOptions: EXACT_PATH },
    { path: '/fil', label: 'Fil', icon: 'list', activeOptions: PATH_PREFIX },
    { path: '/rapports', label: 'Hebdo', icon: 'folder', activeOptions: PATH_PREFIX }
  ];

  ngOnInit(): void {
    this.themeService.init();
    this.prefs.init();
    // Referme le tiroir après toute navigation (lien interne, palette, retour).
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.menuOpen.set(false);
      this.paletteOpen.set(false);
    });
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  openPalette(): void {
    if (!this.paletteOpen()) {
      this.focusBeforePalette = document.activeElement as HTMLElement | null;
    }
    this.menuOpen.set(false);
    this.paletteOpen.set(true);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  /**
   * Raccourcis globaux : ⌘K/Ctrl+K et `/` ouvrent la palette, Échap referme
   * tout. `/` est ignoré dès qu'un champ a le focus, sinon on volerait la frappe.
   */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.menuOpen.set(false);
      this.paletteOpen.set(false);
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.paletteOpen()) this.paletteOpen.set(false);
      else this.openPalette();
      return;
    }

    if (event.key === '/' && !event.metaKey && !event.ctrlKey && !this.isTypingTarget(event.target)) {
      event.preventDefault();
      this.openPalette();
    }
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    const tag = el?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable === true;
  }
}
