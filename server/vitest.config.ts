import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Dummy values so modules that eagerly load config/env don't throw during
    // unit tests. Integration tests that need a real DB set their own env.
    env: {
      NODE_ENV: "test",
      PORT: "5000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      DIRECT_URL: "postgresql://test:test@localhost:5432/test",
      JWT_SECRET: "test-secret",
      JWT_EXPIRES_IN: "15m",
      JWT_REFRESH_SECRET: "test-refresh-secret",
      JWT_REFRESH_EXPIRES_IN: "7d",
      CLIENT_URL: "http://localhost:3000",
    },
  },
});
