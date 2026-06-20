import { test, expect } from '@playwright/test';
import { activeRoutes } from './routes';

const DIGEST_ROUTE = '/digest/2026-06-20';
const digestExcluded = !activeRoutes().some((r) => r.path === DIGEST_ROUTE);

for (const route of activeRoutes()) {
  test(`smoke: ${route.path} loads and renders an h1`, async ({ page }) => {
    const res = await page.goto(route.path);
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.locator('header .brand-text')).toHaveText(/Veille/);
  });
}

test('home: search filters results', async ({ page }) => {
  await page.goto('/');
  await page.locator('#search-input').fill('Angular');
  // Debounced search (200ms) then async index load.
  await expect(page.locator('#search-help')).toContainText(/résultat/i, { timeout: 5000 });
});

test('digest: tablist supports arrow-key navigation', async ({ page }) => {
  await page.goto('/digest/2026-06-20');
  const tabs = page.getByRole('tab');
  await expect(tabs.first()).toBeVisible();
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  // A different tab should now be selected.
  await expect(page.getByRole('tab', { selected: true })).toHaveCount(1);
});

test('theme toggle switches data-theme', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.locator('.theme-toggle').click();
  const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(after).not.toBe(before);
});

test('digest: IA detail renders a Mermaid SVG and a Shiki code block', async ({ page }) => {
  test.skip(digestExcluded, `${DIGEST_ROUTE} excluded via E2E_EXCLUDE_ROUTES`);
  await page.goto(DIGEST_ROUTE);

  // Inactive panels stay in the DOM (toggled via `hidden`); scope every action
  // to a specific panel by id so hidden duplicates never interfere.
  const panel = (cat: string) => page.locator(`#panel-${cat}`);

  // IA: switch the tab + its detailed analysis view, open the first subject.
  await page.getByRole('tab', { name: 'IA' }).click();
  await expect(panel('IA')).toBeVisible();
  await panel('IA').getByRole('radio', { name: 'Analyse détaillée' }).click();
  await panel('IA').locator('.snippets .snippet summary').first().click();

  // Mermaid renders client-side into an <svg> inside the marker element.
  await expect(panel('IA').locator('pre.mermaid svg').first()).toBeVisible({ timeout: 10000 });

  // Tech: a Shiki-highlighted code block (the C# snippet, second subject).
  await page.getByRole('tab', { name: 'Tech' }).click();
  await expect(panel('Tech')).toBeVisible();
  await panel('Tech').getByRole('radio', { name: 'Analyse détaillée' }).click();
  await panel('Tech').locator('.snippets .snippet summary').nth(1).click();
  await expect(panel('Tech').locator('pre.shiki').first()).toBeVisible({ timeout: 10000 });
});
