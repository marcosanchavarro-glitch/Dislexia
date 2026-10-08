import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5187',
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
  },
  webServer: {
    command: 'npm run dev -- --port 5187 --strictPort',
    url: 'http://localhost:5187',
    reuseExistingServer: false,
  },
  reporter: 'list',
});
