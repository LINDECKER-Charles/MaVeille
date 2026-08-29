import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { activeRoutes } from './routes';

/** Le shell pose `data-theme` au boot : c'est le signal d'hydratation. */
async function ready(page: Page): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-theme', /^(dark|light)$/);
}

/** Violations WCAG 2 A/AA de niveau critical ou serious — les seules bloquantes. */
async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
}

for (const route of activeRoutes()) {
  test(`a11y: ${route.path} has no critical/serious violations`, async ({ page }) => {
    await page.goto(route.path);
    await page.locator('main h1').first().waitFor();

    const serious = await seriousViolations(page);
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}

// Les états ouverts ne sont sur aucune route : sans ces trois cas, la palette,
// le lecteur de sujet et le tiroir mobile ne seraient jamais audités.

test('a11y: le lecteur de sujet', async ({ page }) => {
  await page.goto('/digest/2026-06-20?sujet=ia-1');
  await ready(page);
  await expect(page.locator('main h1')).toBeVisible();

  const serious = await seriousViolations(page);
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});

test('a11y: la palette de recherche ouverte', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.keyboard.press('ControlOrMeta+k');
  await page.locator('#search-input').fill('Angular');
  await expect(page.locator('[role="option"]').first()).toBeVisible({ timeout: 8000 });

  const serious = await seriousViolations(page);
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});

test('a11y: le tiroir mobile ouvert', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await ready(page);
  await page.locator('.nav-toggle').click();
  await expect(page.locator('#mobile-menu .nav-link').first()).toBeVisible();

  const serious = await seriousViolations(page);
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
