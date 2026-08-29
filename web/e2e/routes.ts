// Liste centrale des routes pour les specs smoke / a11y / responsive.
// `E2E_EXCLUDE_ROUTES` (séparé par des virgules, match par préfixe) permet d'en
// écarter en CI.

export interface RouteSpec {
  path: string;
  /** Doit correspondre au `<h1>` de la page — asserté par smoke.spec.ts. */
  heading: RegExp;
}

const ALL_ROUTES: RouteSpec[] = [
  { path: '/', heading: /Briefing du/i },
  { path: '/fil', heading: /Tous les sujets/i },
  { path: '/jours', heading: /Par jour/i },
  { path: '/rapports', heading: /Rapports hebdomadaires/i },
  { path: '/rapports/2026-W24', heading: /./ },
  { path: '/stats', heading: /Régularité/i },
  { path: '/stats-perso', heading: /Ma lecture/i },
  { path: '/digest/2026-06-20', heading: /Briefing du/i }
];

export function activeRoutes(): RouteSpec[] {
  const excluded = (process.env['E2E_EXCLUDE_ROUTES'] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (excluded.length === 0) return ALL_ROUTES;
  return ALL_ROUTES.filter((r) => !excluded.some((ex) => r.path === ex || r.path.startsWith(ex)));
}
