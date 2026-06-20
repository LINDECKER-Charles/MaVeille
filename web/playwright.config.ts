import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env['E2E_PORT'] ?? 4321);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Serve the prerendered static site. `pree2e` runs the build beforehand.
  webServer: {
    command: `npx http-server dist/veille/browser -p ${PORT} -s -c-1`,
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env['CI']
  }
});
