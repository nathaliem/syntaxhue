import { defineConfig, devices } from "@playwright/test";

/**
 * Browser checks run against the production build. Chrome and Edge use the installed apps (channels), Firefox and
 * WebKit use Playwright's own builds (`npx playwright install firefox webkit`). WebKit is the engine behind Safari,
 * not Safari itself.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: "http://localhost:4173", viewport: { width: 1440, height: 900 } },
  webServer: {
    command: "npm run build && npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 180_000,
  },
  // CI runs Playwright's own Chromium only (fast, no extra installs); run `npm run e2e` locally for all four browsers.
  projects: process.env.CI
    ? [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
    : [
        { name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
        { name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
        { name: "webkit", use: { ...devices["Desktop Safari"] } },
      ],
});
