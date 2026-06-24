import { test, expect } from '@playwright/test';
import { activeRoutes } from './routes';

// Breakpoints couvrant téléphone → desktop, dont la bascule du menu mobile (900px).
const BREAKPOINTS = [320, 375, 414, 600, 768, 900, 1024, 1280];

// Largeur de scroll du document : si elle dépasse la fenêtre, il y a un
// débordement horizontal (barre de scroll latérale) — interdit à tout breakpoint.
async function horizontalOverflow(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

for (const route of activeRoutes()) {
  for (const width of BREAKPOINTS) {
    test(`responsive: ${route.path} n'a pas de débordement horizontal à ${width}px`, async ({
      page
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route.path);
      await expect(page.locator('main h1').first()).toBeVisible();
      // Tolérance 1px (arrondis sub-pixel).
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    });
  }
}

// La vue digest en mode « Détail » déplie des snippets riches (code, tableaux,
// citations longues) — c'est là que le débordement horizontal apparaît le plus
// facilement. On force le mode via localStorage (lu par PrefsService au boot),
// puis on déplie tous les sujets de CHAQUE catégorie avant de mesurer.
const DETAIL_DIGEST = '/digest/2026-06-20';

for (const width of BREAKPOINTS) {
  test(`responsive (détail): ${DETAIL_DIGEST} déplié n'a pas de débordement à ${width}px`, async ({
    page
  }) => {
    await page.addInitScript(() => localStorage.setItem('veille-depth', 'det'));
    await page.setViewportSize({ width, height: 900 });
    await page.goto(DETAIL_DIGEST);
    await expect(page.locator('main h1').first()).toBeVisible();

    const tabs = page.locator('.tabs .tab');
    const tabCount = await tabs.count();
    for (let i = 0; i < tabCount; i++) {
      await tabs.nth(i).click();
      // « Tout déplier » n'existe que si la catégorie a des sujets détaillés.
      const toggle = page.locator('.toc-toggle');
      if ((await toggle.count()) > 0 && (await toggle.textContent())?.includes('déplier')) {
        await toggle.click();
      }
      // Toléance 1px (arrondis sub-pixel).
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    }
  });
}

test('header: menu hamburger sous 900px ouvre/ferme et navigue', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');

  const toggle = page.locator('.nav-toggle');
  const drawerLink = page.locator('#mobile-menu .nav-link', { hasText: 'Rapport hebdo' });

  // En mobile : la nav inline est masquée, le hamburger est visible.
  await expect(toggle).toBeVisible();
  await expect(page.locator('.primary-nav')).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  // Ouverture du tiroir.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(drawerLink).toBeVisible();

  // Un clic sur un lien navigue et referme le tiroir.
  await drawerLink.click();
  await expect(page).toHaveURL(/\/rapports$/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('header: nav inline visible et hamburger masqué en desktop (≥900px)', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/');
  await expect(page.locator('.primary-nav')).toBeVisible();
  await expect(page.locator('.nav-toggle')).toBeHidden();
});
