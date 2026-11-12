import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', timeout: 30_000, fullyParallel: true,
  use: { baseURL: 'http://localhost:3100', viewport: { width: 1280, height: 900 }, trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --port 3100', url: 'http://localhost:3100/login', reuseExistingServer: false, timeout: 120_000,
    env: { NEXT_DIST_DIR: '.next-e2e', NEXT_PUBLIC_API_BASE_URL: '' } },
});
