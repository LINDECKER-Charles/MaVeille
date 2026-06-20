import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { activeRoutes } from './routes';

for (const route of activeRoutes()) {
  test(`a11y: ${route.path} has no critical/serious violations`, async ({ page }) => {
    await page.goto(route.path);
    await page.locator('main h1').first().waitFor();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}
