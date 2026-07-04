import { envVars } from "../config/env";
import { logger } from "./logger";

/**
 * Optional error tracking via Sentry. `@sentry/node` is an OPTIONAL dependency
 * loaded lazily and only when SENTRY_DSN is set, so the app runs without it.
 * Falls back to structured error logging otherwise.
 */
let sentry: any = null;

export const initObservability = (): void => {
  if (!envVars.SENTRY_DSN) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sentry = require("@sentry/node");
    sentry.init({
      dsn: envVars.SENTRY_DSN,
      environment: envVars.NODE_ENV,
      tracesSampleRate: 0.1,
    });
    logger.info("Sentry error tracking enabled");
  } catch {
    logger.warn(
      "SENTRY_DSN set but @sentry/node not installed — run: npm i @sentry/node"
    );
  }
};

/** Report an error to Sentry (if configured) and always log it. */
export const captureException = (
  err: unknown,
  context?: Record<string, unknown>
): void => {
  if (sentry) {
    sentry.captureException(err, context ? { extra: context } : undefined);
  }
  logger.error("exception", { err: String(err), ...context });
};
