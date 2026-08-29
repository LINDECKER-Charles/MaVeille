/**
 * Jeu d'icônes Établi — Lucide (ISC), copie conforme des SVG livrés avec le
 * design system. Chaque icône est décrite par ses primitives géométriques
 * plutôt que par du markup brut : le rendu passe alors par le compilateur
 * Angular (namespace SVG correct côté prérendu, aucun `innerHTML` à assainir).
 *
 * Toutes les icônes partagent le même gabarit : viewBox 0 0 24 24, trait de 2,
 * extrémités et jointures arrondies, `fill: none`, `stroke: currentColor`.
 */

/** Primitive géométrique d'une icône (p = path, c = circle, l = line, r = rect, e = ellipse). */
export type IconShape =
  | { readonly t: 'p'; readonly d: string }
  | { readonly t: 'c'; readonly cx: number; readonly cy: number; readonly r: number }
  | { readonly t: 'l'; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }
  | {
      readonly t: 'r';
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
      readonly rx: number;
    }
  | { readonly t: 'e'; readonly cx: number; readonly cy: number; readonly rx: number; readonly ry: number };

const p = (d: string): IconShape => ({ t: 'p', d });
const c = (cx: number, cy: number, r: number): IconShape => ({ t: 'c', cx, cy, r });
const l = (x1: number, y1: number, x2: number, y2: number): IconShape => ({ t: 'l', x1, y1, x2, y2 });
const r = (x: number, y: number, w: number, h: number, rx: number): IconShape => ({ t: 'r', x, y, w, h, rx });

export const ICONS = {
  'arrow-right': [p('M5 12h14'), p('m12 5 7 7-7 7')],
  'arrow-up-right': [p('M7 7h10v10'), p('M7 17 17 7')],
  bell: [
    p('M10.268 21a2 2 0 0 0 3.464 0'),
    p(
      'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326'
    )
  ],
  'book-open': [
    p('M12 5v16'),
    p(
      'M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z'
    )
  ],
  check: [p('M20 6 9 17l-5-5')],
  'chevron-left': [p('m15 18-6-6 6-6')],
  'chevron-right': [p('m9 18 6-6-6-6')],
  'circle-alert': [c(12, 12, 10), l(12, 8, 12, 12), l(12, 16, 12.01, 16)],
  'circle-check': [c(12, 12, 10), p('m9 12 2 2 4-4')],
  clipboard: [
    r(8, 2, 8, 4, 1),
    p('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2')
  ],
  clock: [c(12, 12, 10), p('M12 6v6l4 2')],
  database: [
    { t: 'e', cx: 12, cy: 5, rx: 9, ry: 3 } as const,
    p('M3 5V19A9 3 0 0 0 21 19V5'),
    p('M3 12A9 3 0 0 0 21 12')
  ],
  ellipsis: [c(12, 12, 1), c(19, 12, 1), c(5, 12, 1)],
  'external-link': [
    p('M15 3h6v6'),
    p('M10 14 21 3'),
    p('M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6')
  ],
  'file-text': [
    p('M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z'),
    p('M14 2v5a1 1 0 0 0 1 1h5'),
    p('M10 9H8'),
    p('M16 13H8'),
    p('M16 17H8')
  ],
  folder: [
    p('M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z')
  ],
  funnel: [
    p(
      'M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z'
    )
  ],
  'git-branch': [p('M15 6a9 9 0 0 0-9 9V3'), c(18, 6, 3), c(6, 18, 3)],
  hash: [l(4, 9, 20, 9), l(4, 15, 20, 15), l(10, 3, 8, 21), l(16, 3, 14, 21)],
  info: [c(12, 12, 10), p('M12 16v-4'), p('M12 8h.01')],
  link: [
    p('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'),
    p('M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71')
  ],
  list: [p('M3 5h.01'), p('M3 12h.01'), p('M3 19h.01'), p('M8 5h13'), p('M8 12h13'), p('M8 19h13')],
  moon: [
    p(
      'M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401'
    )
  ],
  'refresh-cw': [
    p('M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'),
    p('M21 3v5h-5'),
    p('M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'),
    p('M8 16H3v5')
  ],
  search: [p('m21 21-4.34-4.34'), c(11, 11, 8)],
  sun: [
    c(12, 12, 4),
    p('M12 2v2'),
    p('M12 20v2'),
    p('m4.93 4.93 1.41 1.41'),
    p('m17.66 17.66 1.41 1.41'),
    p('M2 12h2'),
    p('M20 12h2'),
    p('m6.34 17.66-1.41 1.41'),
    p('m19.07 4.93-1.41 1.41')
  ],
  'triangle-alert': [
    p('m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'),
    p('M12 9v4'),
    p('M12 17h.01')
  ],
  x: [p('M18 6 6 18'), p('m6 6 12 12')],
  zap: [
    p(
      'M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z'
    )
  ]
} as const satisfies Record<string, readonly IconShape[]>;

/** Noms d'icônes disponibles — typé, une faute de frappe casse la compilation. */
export type IconName = keyof typeof ICONS;
