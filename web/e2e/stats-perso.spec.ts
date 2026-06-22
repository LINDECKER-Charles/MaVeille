import { test, expect, type Page } from '@playwright/test';

/**
 * E2E for the personal stats page (/stats-perso). Read state lives in
 * localStorage under `veille-read-digests`; every test seeds/clears it via an
 * init script so runs are deterministic and independent of prior state.
 */

const STORAGE_KEY = 'veille-read-digests';

/** Seed `veille-read-digests` before any app code runs on the page. */
async function seedReadState(page: Page, dates: string[]): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [STORAGE_KEY, JSON.stringify(dates)] as const
  );
}

/** Clear `veille-read-digests` before any app code runs on the page. */
async function clearReadState(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    window.localStorage.removeItem(key);
  }, STORAGE_KEY);
}

const statsLink = (page: Page) => page.getByRole('link', { name: 'Mes stats' });

test.describe('Mes stats', () => {
  test('marking a digest read from the feed surfaces it on /stats-perso', async ({ page }) => {
    await clearReadState(page);
    await page.goto('/');

    // First feed card (newest). Read its digest date from the card link href.
    const firstCard = page.locator('app-digest-card').first();
    await expect(firstCard).toBeVisible();
    const href = await firstCard.locator('a.card').getAttribute('href');
    expect(href).toMatch(/\/digest\/\d{4}-\d{2}-\d{2}$/);
    const date = href!.split('/').pop()!;

    // Toggle it read via the checkbox button (does not navigate).
    const toggle = firstCard.locator('.read-toggle');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Navigate to the stats page via the nav link.
    await statsLink(page).click();
    await expect(page).toHaveURL(/\/stats-perso$/);
    await expect(page.locator('main h1')).toHaveText('Mes stats');

    // KPI for read digests reflects the read (>= 1).
    const readCountKpi = page.locator('.kpi-num').first();
    await expect(readCountKpi).toContainText('1');

    // The toggled digest appears in the read list with a link to its page.
    const item = page.locator(`.read-list a.read-link[href="/digest/${date}"]`);
    await expect(item).toBeVisible();
  });

  test('empty state is shown when nothing has been read', async ({ page }) => {
    await clearReadState(page);
    await page.goto('/stats-perso');

    await expect(page.locator('main h1')).toHaveText('Mes stats');
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state')).toContainText("Rien à afficher pour l'instant");
    await expect(page.locator('.read-list')).toHaveCount(0);

    // First KPI (Digests lus) reads 0.
    await expect(page.locator('.kpi-num').first()).toContainText('0');

    // The empty-state CTA links back to the feed.
    await expect(page.locator('.empty-state a.cta')).toHaveAttribute('href', '/');
  });

  test('Réinitialiser clears the read list (native confirm accepted)', async ({ page }) => {
    // Seed two known recent digests as read up front.
    await seedReadState(page, ['2026-06-21', '2026-06-20']);
    await page.goto('/stats-perso');

    await expect(page.locator('.read-list .read-item')).toHaveCount(2);
    await expect(page.locator('.kpi-num').first()).toContainText('2');

    // Accept the native confirm() dialog triggered by Réinitialiser.
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Réinitialiser' }).click();

    // List collapses to the empty state.
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.read-list')).toHaveCount(0);
    await expect(page.locator('.kpi-num').first()).toContainText('0');
  });

  test('seeded read digests render newest-first with digest links', async ({ page }) => {
    await seedReadState(page, ['2026-06-20', '2026-06-21']);
    await page.goto('/stats-perso');

    const links = page.locator('.read-list a.read-link');
    await expect(links).toHaveCount(2);
    // Component sorts by the store order (newest first) regardless of seed order.
    await expect(links.nth(0)).toHaveAttribute('href', '/digest/2026-06-21');
    await expect(links.nth(1)).toHaveAttribute('href', '/digest/2026-06-20');
  });
});
