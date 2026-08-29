import { test, expect, type Page } from '@playwright/test';
import { activeRoutes } from './routes';

/**
 * Le site est prérendu : avant l'hydratation, aucun écouteur clavier n'est
 * branché et une frappe est perdue. `ThemeService.init()` pose `data-theme` au
 * boot du shell — c'est le premier signal fiable que l'app est vivante.
 */
async function waitForHydration(page: Page): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-theme', /^(dark|light)$/);
}

/** Le jour de référence : 4 sujets détaillés, du mermaid et du shiki dans chacun. */
const DIGEST_ROUTE = '/digest/2026-06-20';
const digestExcluded = !activeRoutes().some((r) => r.path === DIGEST_ROUTE);

for (const route of activeRoutes()) {
  test(`smoke: ${route.path} loads and renders its heading`, async ({ page }) => {
    const res = await page.goto(route.path);
    expect(res?.ok()).toBeTruthy();
    const h1 = page.locator('main h1').first();
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(route.heading);
    await expect(page.locator('header .wordmark')).toHaveText(/Veille/);
  });
}

test('palette: ⌘K ouvre la recherche et compte les résultats', async ({ page }) => {
  await page.goto('/');
  await waitForHydration(page);
  await page.keyboard.press('ControlOrMeta+k');

  const input = page.locator('#search-input');
  // Marge généreuse : sous forte contention, l'hydratation puis le montage de
  // la palette peuvent dépasser le délai par défaut de 5 s.
  await expect(input).toBeFocused({ timeout: 15000 });
  await input.fill('Angular');

  // Debounce 180 ms, puis chargement asynchrone de l'index plein texte.
  await expect(page.locator('#search-help')).toContainText(/résultat/i, { timeout: 5000 });
  await expect(page.locator('[role="option"]').first()).toBeVisible();

  // Échap referme la palette.
  await page.keyboard.press('Escape');
  await expect(input).toHaveCount(0);
});

test('palette: ↵ ouvre le sujet sélectionné', async ({ page }) => {
  await page.goto('/');
  await waitForHydration(page);
  await page.keyboard.press('ControlOrMeta+k');
  await page.locator('#search-input').fill('CVE');
  await expect(page.locator('[role="option"]').first()).toBeVisible({ timeout: 5000 });

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/digest\/\d{4}-\d{2}-\d{2}\?sujet=/);
  await expect(page.locator('main h1')).toBeVisible();
});

test('rapport hebdo : la semaine ISO reste identifiable sur la page', async ({ page }) => {
  await page.goto('/rapports/2026-W24');
  // Le <h1> porte le titre rédigé ; l'identifiant de semaine, lui, est garanti
  // par le fil d'Ariane et la pastille — c'est sur eux qu'on s'appuie.
  await expect(page.locator('.etb-crumbs__current')).toHaveText('2026-W24');
  await expect(page.getByText('2026-W24').first()).toBeVisible();
});

test('theme toggle switches data-theme', async ({ page }) => {
  await page.goto('/');
  await waitForHydration(page);

  const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    before === 'dark' ? 'light' : 'dark'
  );
});

test('briefing: la première ligne de sujet ouvre le lecteur', async ({ page }) => {
  test.skip(digestExcluded, `${DIGEST_ROUTE} excluded via E2E_EXCLUDE_ROUTES`);
  await page.goto(DIGEST_ROUTE);

  const first = page.locator('.row-card').first();
  await expect(first).toBeVisible();
  const title = (await first.locator('.row-card__title').textContent())?.trim();
  await first.click();

  await expect(page).toHaveURL(/\?sujet=/);
  await expect(page.locator('main h1')).toHaveText(title!);
  // Le lecteur donne le sommaire du sujet et la navigation vers le suivant.
  await expect(page.getByRole('link', { name: /Sujet suivant/ }).first()).toBeVisible();
});

test('sujet: le corps rend un SVG Mermaid et un bloc Shiki', async ({ page }) => {
  test.skip(digestExcluded, `${DIGEST_ROUTE} excluded via E2E_EXCLUDE_ROUTES`);

  // ia-1 contient un diagramme Mermaid et deux blocs de code coloriés par Shiki.
  await page.goto(`${DIGEST_ROUTE}?sujet=ia-1`);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('pre.mermaid svg').first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator('pre.shiki').first()).toBeVisible({ timeout: 10000 });

  // La vue « Code seul » ne garde que les blocs de code : le diagramme sort.
  await waitForHydration(page);
  await page.getByRole('tab', { name: 'Code seul' }).click();
  await expect(page.locator('pre.shiki').first()).toBeVisible();
  await expect(page.locator('pre.mermaid')).toHaveCount(0);
});

test('sujet: prev/next enchaîne les sujets du jour', async ({ page }) => {
  test.skip(digestExcluded, `${DIGEST_ROUTE} excluded via E2E_EXCLUDE_ROUTES`);
  await page.goto(`${DIGEST_ROUTE}?sujet=ia-1`);

  await page.getByRole('link', { name: /Sujet suivant/ }).first().click();
  await expect(page).toHaveURL(/\?sujet=ia-2/);

  await page.getByRole('link', { name: 'Précédent' }).click();
  await expect(page).toHaveURL(/\?sujet=ia-1/);
});
