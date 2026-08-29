import { test, expect, type Page } from '@playwright/test';

/**
 * E2E de « Ma lecture » (/stats-perso). L'état de lecture vit dans localStorage
 * sous `veille-read-digests` ; chaque test le sème ou le vide via un init script
 * pour rester déterministe et indépendant des autres.
 */

const STORAGE_KEY = 'veille-read-digests';

/** Sème `veille-read-digests` avant l'exécution du moindre code applicatif. */
async function seedReadState(page: Page, dates: string[]): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [STORAGE_KEY, JSON.stringify(dates)] as const
  );
}

/** Vide `veille-read-digests` avant l'exécution du moindre code applicatif. */
async function clearReadState(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    window.localStorage.removeItem(key);
  }, STORAGE_KEY);
}

const readingLink = (page: Page) => page.getByRole('link', { name: /Ma lecture/ }).first();

test.describe('Ma lecture', () => {
  test('marquer un briefing comme lu le fait apparaître sur /stats-perso', async ({ page }) => {
    await clearReadState(page);
    await page.goto('/digest/2026-06-20');

    // Le bouton du briefing bascule l'état de lecture sans naviguer.
    const mark = page.getByRole('button', { name: 'Marquer comme lu' });
    await expect(mark).toBeVisible();
    await mark.click();
    await expect(page.getByRole('button', { name: 'Lu', exact: true })).toBeVisible();

    await readingLink(page).click();
    await expect(page).toHaveURL(/\/stats-perso$/);
    await expect(page.locator('main h1')).toHaveText('Ma lecture');

    // Le premier KPI (digests lus) reflète la lecture.
    await expect(page.locator('.kpi-num').first()).toContainText('1');

    // Le digest apparaît dans la liste, avec un lien vers sa page.
    await expect(page.locator('.read-list a.read-link[href="/digest/2026-06-20"]')).toBeVisible();
  });

  test('état vide quand rien n’a été lu', async ({ page }) => {
    await clearReadState(page);
    await page.goto('/stats-perso');

    await expect(page.locator('main h1')).toHaveText('Ma lecture');
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state')).toContainText("Rien à afficher pour l'instant");
    await expect(page.locator('.read-list')).toHaveCount(0);

    // Premier KPI (Digests lus) à 0.
    await expect(page.locator('.kpi-num').first()).toContainText('0');

    // Le CTA de l'état vide renvoie au briefing.
    await expect(page.locator('.empty-state a.cta')).toHaveAttribute('href', '/');
  });

  test('Réinitialiser vide la liste (confirm natif accepté)', async ({ page }) => {
    await seedReadState(page, ['2026-06-21', '2026-06-20']);
    await page.goto('/stats-perso');

    await expect(page.locator('.read-list .read-item')).toHaveCount(2);
    await expect(page.locator('.kpi-num').first()).toContainText('2');

    // Accepte le confirm() natif déclenché par Réinitialiser.
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Réinitialiser' }).click();

    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.read-list')).toHaveCount(0);
    await expect(page.locator('.kpi-num').first()).toContainText('0');
  });

  test('les digests lus sont listés du plus récent au plus ancien', async ({ page }) => {
    await seedReadState(page, ['2026-06-20', '2026-06-21']);
    await page.goto('/stats-perso');

    const links = page.locator('.read-list a.read-link');
    await expect(links).toHaveCount(2);
    // Le composant suit l'ordre du store (plus récent d'abord), pas celui de la graine.
    await expect(links.nth(0)).toHaveAttribute('href', '/digest/2026-06-21');
    await expect(links.nth(1)).toHaveAttribute('href', '/digest/2026-06-20');
  });
});
