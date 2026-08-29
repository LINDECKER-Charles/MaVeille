import { Routes } from '@angular/router';

/**
 * Le briefing du jour et la lecture d'un sujet partagent la même route :
 * `/digest/:date` avec `?sujet=<slug>-<index>`. On garde ainsi un permalien par
 * sujet sans prérendre une page par sujet.
 */
const briefing = () =>
  import('./features/briefing/briefing-page.component').then((m) => m.BriefingPageComponent);

export const routes: Routes = [
  { path: '', loadComponent: briefing },
  { path: 'digest/:date', loadComponent: briefing },
  {
    path: 'fil',
    loadComponent: () => import('./features/fil/fil.component').then((m) => m.FilComponent)
  },
  {
    path: 'jours',
    loadComponent: () => import('./features/jours/jours.component').then((m) => m.JoursComponent)
  },
  {
    path: 'rapports',
    loadComponent: () =>
      import('./features/rapports/rapports-list.component').then((m) => m.RapportsListComponent)
  },
  {
    path: 'rapports/:week',
    loadComponent: () =>
      import('./features/rapports/rapport-detail.component').then((m) => m.RapportDetailComponent)
  },
  {
    path: 'stats',
    loadComponent: () => import('./features/stats/stats.component').then((m) => m.StatsComponent)
  },
  {
    path: 'stats-perso',
    loadComponent: () =>
      import('./features/stats-perso/stats-perso.component').then((m) => m.StatsPersoComponent)
  },
  { path: '**', redirectTo: '' }
];
