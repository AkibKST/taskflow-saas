import { isProd } from "../config/env";

/**
 * Tiny structured logger. In production it emits one JSON object per line
 * (friendly to log shippers / Sentry breadcrumbs); in dev it prints readable,
 * emoji-tagged lines. Prefer this over bare `console.*` so log output is
 * consistent and greppable, and so a request id can be threaded through.
 */
type Level = "debug" | "info" | "warn" | "error";

const LEVEL_TAG: Record<Level, string> = {
  debug: "🐛",
  info: "ℹ️ ",
  warn: "⚠️ ",
  error: "❌",
};

const emit = (level: Level, message: string, meta?: Record<string, unknown>) => {
  if (isProd) {
    process.stdout.write(
      JSON.stringify({
        level,
        message,
        time: new Date().toISOString(),
        ...meta,
      }) + "\n"
    );
    return;
  }

  const parts = [`${LEVEL_TAG[level]} ${message}`];
  if (meta && Object.keys(meta).length) parts.push(JSON.stringify(meta));
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](...parts);
};

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) =>
    emit("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    emit("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    emit("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    emit("error", message, meta),
};
