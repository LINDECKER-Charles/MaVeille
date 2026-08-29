import { test, expect, type Page } from '@playwright/test';

/**
 * Parcours introduits par la refonte : bascule de profondeur du briefing,
 * filtres du fil, vues alternatives du lecteur, état actif du rail. Ce sont des
 * comportements client — chacun attend l'hydratation avant d'agir.
 */

const DIGEST = '/digest/2026-06-20';

async function ready(page: Page): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-theme', /^(dark|light)$/);
}

test.describe('Briefing', () => {
  test('la bascule Synthèse/Sujets change la vue et survit au rechargement', async ({ page }) => {
    await page.goto(DIGEST);
    await ready(page);

    // Par défaut : la liste des sujets.
    await expect(page.locator('.row-card').first()).toBeVisible();

    await page.getByRole('tab', { name: 'Synthèse' }).click();
    await expect(page.locator('.synthesis').first()).toBeVisible();
    await expect(page.locator('.row-card')).toHaveCount(0);

    // Le choix est persisté par PrefsService (localStorage `veille-depth`).
    await page.reload();
    await ready(page);
    await expect(page.locator('.synthesis').first()).toBeVisible();
  });

  test('le filtre par thématique réduit la liste des sujets', async ({ page }) => {
    await page.goto(DIGEST);
    await ready(page);

    // Le 20 juin 2026 porte 4 sujets détaillés : 2 en IA, 2 en Tech.
    const rows = page.locator('.row-card');
    await expect(rows).toHaveCount(4);

    await page.getByRole('button', { name: 'Filtrer les thématiques' }).click();
    await page.locator('.filters .etb-tag', { hasText: 'IA' }).click();

    await expect(rows).toHaveCount(2);
    await expect(page.locator('.filters .etb-tag--selected')).toHaveText(/IA/);

    // Retour à « Tout » : la liste complète revient.
    await page.locator('.filters .etb-tag', { hasText: 'Tout' }).click();
    await expect(rows).toHaveCount(4);
  });
});

test.describe('Fil', () => {
  test('?cat= filtre dès le chargement et se reflète dans le rail', async ({ page }) => {
    await page.goto('/fil?cat=ia');
    await ready(page);

    await expect(page.locator('main h1')).toHaveText(/IA/);
    // Le rail distingue les thématiques par leur query param, pas par leur chemin.
    await expect(
      page.locator('.primary-nav .etb-nav__item--on', { hasText: 'IA' })
    ).toHaveCount(1);

    const rows = page.locator('.fil__table tbody tr');
    await expect(rows.first()).toBeVisible();
    // Chaque ligne visible pointe bien vers un sujet de la thématique demandée.
    for (const href of await page.locator('.fil__link').evaluateAll((links) =>
      links.map((l) => l.getAttribute('href') ?? '')
    )) {
      expect(href).toContain('sujet=ia-');
    }
  });

  test('la pagination charge la suite des sujets', async ({ page }) => {
    await page.goto('/fil');
    await ready(page);

    const rows = page.locator('.fil__table tbody tr');
    await expect(rows).toHaveCount(60);

    await page.getByRole('button', { name: /Afficher \d+ sujets de plus/ }).click();
    await expect(rows).toHaveCount(120);
  });

  test('le sélecteur de période restreint le fil', async ({ page }) => {
    await page.goto('/fil');
    await ready(page);

    const count = async () =>
      Number((await page.locator('.fil__count').textContent())!.match(/\d+/)![0]);

    const all = await count();
    await page.getByRole('tab', { name: '30 j' }).click();

    await expect.poll(count).toBeLessThan(all);
    expect(await count()).toBeGreaterThan(0);
  });
});

test.describe('Lecteur de sujet', () => {
  test('la vue « Sources » liste les liens cités', async ({ page }) => {
    await page.goto(`${DIGEST}?sujet=ia-1`);
    await ready(page);

    await page.getByRole('tab', { name: 'Sources' }).click();
    const links = page.locator('.reader__link');
    await expect(links.first()).toBeVisible();
    await expect(links.first()).toHaveAttribute('href', /^https?:/);
  });

  test('le sommaire pointe vers des ancres qui existent', async ({ page }) => {
    await page.goto(`${DIGEST}?sujet=ia-1`);
    await ready(page);

    const items = page.locator('.toc__item');
    await expect(items.first()).toBeVisible();

    for (const href of await items.evaluateAll((links) =>
      links.map((l) => l.getAttribute('href') ?? '')
    )) {
      expect(href.startsWith('#')).toBeTruthy();
      await expect(page.locator(href)).toHaveCount(1);
    }
  });

  test('le premier sujet n’a pas de précédent, le dernier pas de suivant', async ({ page }) => {
    await page.goto(`${DIGEST}?sujet=ia-1`);
    await ready(page);
    await expect(page.getByRole('button', { name: 'Précédent' })).toBeDisabled();

    await page.goto(`${DIGEST}?sujet=tech-2`);
    await ready(page);
    await expect(page.getByRole('link', { name: /Sujet suivant/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Retour au briefing' })).toBeVisible();
  });
});
