import dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
  PORT: string;
  DATABASE_URL: string;
  DIRECT_URL: string;
  NODE_ENV: "development" | "production" | "test";
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  CLIENT_URL: string;

  // ── Infrastructure (optional) ──
  /** When behind a proxy/LB. `true`, `false`, or a hop count. Default: 1 in prod. */
  TRUST_PROXY?: string;
  /** Redis connection — enables the Socket.IO adapter, presence, rate-limit store and job locks. */
  REDIS_URL?: string;
  /** Max JSON body size. Default: 256kb (largest legitimate payload is a comment). */
  JSON_BODY_LIMIT: string;

  // ── Email provider (optional; falls back to console in dev) ──
  RESEND_API_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_SECURE?: string;
  /** From address for all transactional mail, e.g. "TaskFlow <no-reply@taskflow.app>". */
  EMAIL_FROM: string;

  // ── Billing / Stripe (optional; falls back to the stub provider) ──
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO?: string;
  STRIPE_PRICE_ENTERPRISE?: string;

  // ── Object storage for attachments (optional; falls back to local disk) ──
  STORAGE_DRIVER: "local" | "s3";
  STORAGE_LOCAL_DIR: string;
  S3_BUCKET?: string;
  S3_REGION?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_ENDPOINT?: string;
  S3_PUBLIC_URL?: string;

  // ── Observability (optional) ──
  SENTRY_DSN?: string;

  // ── Policy toggles ──
  /** Require a verified email before inviting teammates / changing billing. */
  REQUIRE_EMAIL_VERIFICATION: boolean;
}

const bool = (v: string | undefined, fallback: boolean): boolean => {
  if (v === undefined) return fallback;
  return v === "true" || v === "1";
};

const loadEnvVariables = (): EnvConfig => {
  const requiredEnvVariables: string[] = [
    "PORT",
    "DATABASE_URL",
    "NODE_ENV",
    "DIRECT_URL",
    "JWT_SECRET",
    "JWT_EXPIRES_IN",
    "JWT_REFRESH_EXPIRES_IN",
    "JWT_REFRESH_SECRET",
    "CLIENT_URL",
  ];

  requiredEnvVariables.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable ${key}`);
    }
  });

  const nodeEnv = process.env.NODE_ENV as EnvConfig["NODE_ENV"];

  // A production deployment must ship a real email + billing provider, not the
  // dev stubs. Fail fast rather than silently logging invites to stdout.
  if (nodeEnv === "production") {
    const hasEmail =
      !!process.env.RESEND_API_KEY || !!process.env.SMTP_HOST;
    if (!hasEmail) {
      throw new Error(
        "Production requires an email provider — set RESEND_API_KEY or SMTP_HOST"
      );
    }
  }

  return {
    PORT: process.env.PORT as string,
    DATABASE_URL: process.env.DATABASE_URL!,
    DIRECT_URL: process.env.DIRECT_URL!,
    NODE_ENV: nodeEnv,
    JWT_SECRET: process.env.JWT_SECRET as string,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN as string,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN as string,
    CLIENT_URL: process.env.CLIENT_URL as string,

    TRUST_PROXY: process.env.TRUST_PROXY,
    REDIS_URL: process.env.REDIS_URL,
    JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT ?? "256kb",

    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_SECURE: process.env.SMTP_SECURE,
    EMAIL_FROM: process.env.EMAIL_FROM ?? "TaskFlow <no-reply@taskflow.local>",

    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO,
    STRIPE_PRICE_ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,

    STORAGE_DRIVER: (process.env.STORAGE_DRIVER as EnvConfig["STORAGE_DRIVER"]) ?? "local",
    STORAGE_LOCAL_DIR: process.env.STORAGE_LOCAL_DIR ?? "uploads",
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_PUBLIC_URL: process.env.S3_PUBLIC_URL,

    SENTRY_DSN: process.env.SENTRY_DSN,

    REQUIRE_EMAIL_VERIFICATION: bool(
      process.env.REQUIRE_EMAIL_VERIFICATION,
      false
    ),
  };
};

export const envVars = loadEnvVariables();

export const isProd = envVars.NODE_ENV === "production";
export const isTest = envVars.NODE_ENV === "test";
