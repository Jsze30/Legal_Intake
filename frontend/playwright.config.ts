import { defineConfig, devices } from '@playwright/test';

const remoteBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const demoMode = process.env.PLAYWRIGHT_DEMO_MODE === 'true';
const localBaseUrl = demoMode ? 'http://127.0.0.1:4174' : 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'line',
  use: {
    baseURL: remoteBaseUrl ?? localBaseUrl,
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], channel: 'chrome' },
    },
  ],
  webServer: remoteBaseUrl
    ? undefined
    : {
      command: demoMode
        ? 'npm run dev:demo -- --host 127.0.0.1 --port 4174 --strictPort'
        : 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
      url: localBaseUrl,
      reuseExistingServer: !process.env.CI,
    },
});
