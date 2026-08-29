import { defineConfig, devices } from "@playwright/test";

const STATIC_PORT = 4319;

// PLAYWRIGHT_CHROMIUM_PATH is only set in sandboxed dev/CI environments that
// ship a pre-installed Chromium at a fixed path and skip `playwright install`
// (see README/agent environment notes). Leave it unset anywhere else — a
// plain `npx playwright install` provides the browser Playwright expects for
// the pinned @playwright/test version instead.
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${STATIC_PORT}`,
  },
  webServer: {
    command: `node e2e/static-server.mjs`,
    url: `http://127.0.0.1:${STATIC_PORT}/sw.js`,
    reuseExistingServer: !process.env.CI,
    env: { E2E_STATIC_PORT: String(STATIC_PORT) },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(chromiumExecutablePath ? { launchOptions: { executablePath: chromiumExecutablePath } } : {}),
      },
    },
  ],
});
