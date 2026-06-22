import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme.service';
import { PrefsService } from './core/prefs.service';
import { DigestStore } from './core/digest-store.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly store = inject(DigestStore);
  readonly prefs = inject(PrefsService);

  readonly theme = this.themeService.theme;

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
