import { defineConfig } from "vitest/config";

// Integration tests hit the real Express app against a REAL database.
// They require TEST_DATABASE_URL (never DATABASE_URL — the suite TRUNCATES
// every table, so pointing it at a dev/prod database must be impossible by
// accident). Locally: any disposable Postgres (or a dedicated Neon database);
// in CI: the postgres service container.
//
//   TEST_DATABASE_URL=postgresql://... npm run test:integration
//
const url = process.env.TEST_DATABASE_URL ?? "";
const directUrl = process.env.TEST_DIRECT_URL ?? url;

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/integration/**/*.int.test.ts"],
    globalSetup: ["src/test/integration/globalSetup.ts"],
    // One shared database — run test files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: "test",
      PORT: "5000",
      DATABASE_URL: url,
      DIRECT_URL: directUrl,
      JWT_SECRET: "integration-test-secret",
      JWT_EXPIRES_IN: "15m",
      JWT_REFRESH_SECRET: "integration-test-refresh-secret",
      JWT_REFRESH_EXPIRES_IN: "7d",
      CLIENT_URL: "http://localhost:3000",
      REQUIRE_EMAIL_VERIFICATION: "false",
      ...(process.env.DATABASE_DRIVER
        ? { DATABASE_DRIVER: process.env.DATABASE_DRIVER }
        : {}),
    },
  },
});
