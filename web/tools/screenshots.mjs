// Captures du site statique construit, pour le README.
// Usage : node tools/screenshots.mjs   (attend dist/veille/browser servi par http-server)
// `playwright` n'est pas une dépendance directe : on passe par @playwright/test,
// qui réexporte les mêmes lanceurs et est déjà installé pour les e2e.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.SHOT_BASE ?? 'http://127.0.0.1:4321';
const OUT = resolve(HERE, '..', '..', 'docs', 'screenshots');

mkdirSync(OUT, { recursive: true });

/** Date du digest de référence : la plus récente, lue dans les données générées. */
function latestDate() {
  const index = readFileSync(join(HERE, '..', 'src', 'app', 'data', 'generated', 'index.ts'), 'utf8');
  return index.match(/"date":"(\d{4}-\d{2}-\d{2})"/)?.[1] ?? '';
}

const date = latestDate();

const shots = [
  { name: 'home', path: '/', theme: 'dark' },
  { name: 'home-light', path: '/', theme: 'light' },
  // Le lecteur de sujet : le cœur du parcours briefing → sujet → suivant.
  { name: 'digest', path: `/digest/${date}?sujet=ia-1`, theme: 'dark', wait: 1600 },
  { name: 'fil', path: '/fil', theme: 'dark' },
  { name: 'stats', path: '/stats', theme: 'dark' },
  { name: 'rapports', path: '/rapports', theme: 'dark' },
  { name: 'mobile-home', path: '/', theme: 'dark', mobile: true }
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: s.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: s.theme === 'light' ? 'light' : 'dark'
  });
  // Sème le thème avant le boot de l'app.
  await ctx.addInitScript((t) => localStorage.setItem('veille-theme', t), s.theme);
  const page = await ctx.newPage();
  await page.goto(BASE + s.path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(s.wait ?? 700);
  const file = join(OUT, `${s.name}.png`);
  await page.screenshot({ path: file });
  console.log('saved', file);
  await ctx.close();
}
await browser.close();
