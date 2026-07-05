import { execSync } from "node:child_process";
import path from "node:path";

/**
 * Runs once before the integration suite: validates the target database and
 * applies migrations to it. Table truncation happens per test file (see
 * helpers.resetDb) so files can't leak state into each other.
 */
export default function globalSetup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Integration tests need TEST_DATABASE_URL (a DISPOSABLE database — " +
        "every table in it gets truncated). Example:\n" +
        "  TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskflow_test " +
        "npm run test:integration"
    );
  }

  const serverRoot = path.resolve(__dirname, "../../..");
  execSync("npx prisma migrate deploy", {
    cwd: serverRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: url,
      DIRECT_URL: process.env.TEST_DIRECT_URL ?? url,
    },
  });
}
