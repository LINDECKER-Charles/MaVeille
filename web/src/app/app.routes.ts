import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent)
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
    path: 'digest/:date',
    loadComponent: () =>
      import('./features/digest/digest-page.component').then((m) => m.DigestPageComponent)
  },
  { path: '**', redirectTo: '' }
];
