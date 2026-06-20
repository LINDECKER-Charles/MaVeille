import { RenderMode, ServerRoute } from '@angular/ssr';
import { digests, weeklies } from './data/generated/index';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'digest/:date',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => digests.map((d) => ({ date: d.date }))
  },
  {
    path: 'rapports/:week',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => weeklies.map((w) => ({ week: w.id }))
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
