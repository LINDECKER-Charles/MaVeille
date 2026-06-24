import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from './core/theme.service';
import { PrefsService } from './core/prefs.service';
import { DigestStore } from './core/digest-store.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly store = inject(DigestStore);
  readonly prefs = inject(PrefsService);

  readonly theme = this.themeService.theme;

  /** Ouverture du menu mobile (hamburger) — pertinent sous 900px (cf. app.css). */
  readonly menuOpen = signal(false);

  readonly navLinks = [
    { path: '/', label: "Aujourd'hui", exact: true },
    // Le dernier digest connu (digests triés du plus récent au plus ancien).
    ...(this.store.digests[0]
      ? [{ path: `/digest/${this.store.digests[0].date}`, label: 'Digest', exact: false }]
      : []),
    { path: '/rapports', label: 'Rapport hebdo', exact: false },
    { path: '/stats', label: 'Stats', exact: false },
    { path: '/stats-perso', label: 'Mes stats', exact: false }
  ];

  ngOnInit(): void {
    this.themeService.init();
    this.prefs.init();
    // Referme le menu mobile après toute navigation (clic sur un lien interne).
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  setDensity(d: 'comfort' | 'compact'): void {
    this.prefs.setDensity(d);
  }

  /**
   * Bouton "Rechercher" / raccourci `/` : navigue vers la home avec le
   * queryParam `?focus=search`. La HomeComponent lit ce param et focus le
   * champ de recherche, puis le nettoie de l'URL. Voir CONTRAT (agent Home).
   */
  goSearch(): void {
    this.router.navigate(['/'], { queryParams: { focus: 'search' } });
  }
}
