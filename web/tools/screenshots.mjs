// One-off: capture screenshots of the built static site for the README.
// Usage: node tools/screenshots.mjs  (expects dist/veille/browser built + http-server)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SHOT_BASE ?? 'http://127.0.0.1:4321';
const OUT = new URL('../../docs/screenshots/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

mkdirSync(OUT, { recursive: true });

const shots = [
  { name: 'home', path: '/', theme: 'dark', full: false },
  { name: 'home-light', path: '/', theme: 'light', full: false },
  { name: 'digest', path: '/digest/2026-06-24', theme: 'dark', full: false },
  { name: 'stats', path: '/stats', theme: 'dark', full: false },
  { name: 'rapports', path: '/rapports', theme: 'dark', full: false },
  { name: 'mobile-home', path: '/', theme: 'dark', full: false, mobile: true }
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: s.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: s.theme === 'light' ? 'light' : 'dark'
  });
  // Seed theme before app boots.
  await ctx.addInitScript((t) => localStorage.setItem('veille-theme', t), s.theme);
  const page = await ctx.newPage();
  await page.goto(BASE + s.path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const file = `${OUT}/${s.name}.png`;
  await page.screenshot({ path: file, fullPage: s.full });
  console.log('saved', file);
  await ctx.close();
}
await browser.close();
