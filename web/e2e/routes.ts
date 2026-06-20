// Central route list for smoke + a11y specs. Supports skipping routes in CI
// via the comma-separated E2E_EXCLUDE_ROUTES env var (matched by path prefix).

export interface RouteSpec {
  path: string;
  heading: RegExp;
}

const ALL_ROUTES: RouteSpec[] = [
  { path: '/', heading: /Digests quotidiens/i },
  { path: '/stats', heading: /Statistiques/i },
  { path: '/rapports', heading: /Rapports hebdomadaires/i },
  { path: '/rapports/2026-W24', heading: /W24/i },
  { path: '/digest/2026-06-20', heading: /./ }
];

export function activeRoutes(): RouteSpec[] {
  const excluded = (process.env['E2E_EXCLUDE_ROUTES'] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (excluded.length === 0) return ALL_ROUTES;
  return ALL_ROUTES.filter((r) => !excluded.some((ex) => r.path === ex || r.path.startsWith(ex)));
}
