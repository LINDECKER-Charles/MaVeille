import { test, expect } from '@playwright/test';
import { activeRoutes } from './routes';

// Breakpoints couvrant téléphone → desktop, dont la bascule du rail (900px).
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

// Le lecteur de sujet est la vue la plus riche (code, tableaux, diagrammes,
// citations longues) : c'est là que le débordement apparaît le plus facilement.
const READER_ROUTE = '/digest/2026-06-20';
const SUBJECTS = ['ia-1', 'ia-2', 'tech-1', 'tech-2'];

for (const width of BREAKPOINTS) {
  test(`responsive (lecteur): ${READER_ROUTE} ne déborde pas à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });

    for (const sujet of SUBJECTS) {
      await page.goto(`${READER_ROUTE}?sujet=${sujet}`);
      await expect(page.locator('main h1')).toBeVisible();
      // Le diagramme Mermaid est rendu côté client : il doit être mesuré aussi.
      await page.locator('pre.mermaid svg').first().waitFor({ timeout: 10000 });
      expect(await horizontalOverflow(page), `sujet ${sujet}`).toBeLessThanOrEqual(1);
    }
  });
}

test('rail: le tiroir sous 900px ouvre/ferme et navigue', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');

  const toggle = page.locator('.nav-toggle');
  const drawerLink = page.locator('#mobile-menu .nav-link', { hasText: 'Rapports hebdo' });

  // En mobile : le rail est masqué, le bouton « … » est visible.
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

test('rail: visible en desktop (≥900px), bouton « … » masqué', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/');
  await expect(page.locator('.primary-nav')).toBeVisible();
  await expect(page.locator('.nav-toggle')).toBeHidden();
});

test('mobile: la barre d’onglets remplace le rail', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');

  const tabs = page.locator('.shell__tabs .tab');
  await expect(tabs).toHaveCount(4);
  await tabs.filter({ hasText: 'Fil' }).click();
  await expect(page).toHaveURL(/\/fil$/);
});
