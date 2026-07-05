import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke suite. Boots the real server + client against a DISPOSABLE
 * database and drives the customer journey in a browser.
 *
 *   E2E_DATABASE_URL=postgresql://... npx playwright test
 *
 * Dedicated ports (5001/3001) so a running dev environment is never reused —
 * E2E must not touch the development database.
 */
const E2E_DB = process.env.E2E_DATABASE_URL ?? "";
const API_PORT = 5001;
const WEB_PORT = 3001;
const API_URL = `http://localhost:${API_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // smoke specs share one server; keep runs deterministic
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 90_000, // remote test DBs make some roundtrips slow

  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  expect: { timeout: 10_000 },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: [
    {
      command: "npm run dev --workspace server",
      url: `${API_URL}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        NODE_ENV: "test", // disables the per-IP rate limiter for test churn
        PORT: String(API_PORT),
        CLIENT_URL: WEB_URL,
        DATABASE_URL: E2E_DB,
        DIRECT_URL: E2E_DB,
      },
    },
    {
      // Production build: `next dev` compiles pages on first visit, which
      // stalls specs for tens of seconds and blows their timeouts.
      command: `npm run build --workspace client && npm run start --workspace client -- -p ${WEB_PORT}`,
      url: WEB_URL,
      timeout: 420_000,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_API_URL: `${API_URL}/api/v1`,
        NEXT_PUBLIC_SOCKET_URL: API_URL,
      },
    },
  ],
});
