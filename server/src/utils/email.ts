import { envVars, isProd } from "../config/env";
import { logger } from "./logger";
import {
  inviteTemplate,
  passwordResetTemplate,
  verificationTemplate,
} from "./emailTemplates";

/**
 * Transactional email. The transport is chosen at runtime:
 *   1. RESEND_API_KEY  → Resend HTTP API (no SDK/dependency needed).
 *   2. SMTP_HOST        → any SMTP server via nodemailer (optional dependency).
 *   3. neither (dev)    → log to the console so links are still reachable.
 *
 * Callers use the three send* helpers; they don't know or care which transport
 * is active. env.ts guarantees a real transport exists in production.
 */

export interface InviteEmailOpts {
  to: string;
  inviterName: string;
  tenantName: string;
  inviteUrl: string;
}
export interface PasswordResetEmailOpts {
  to: string;
  resetUrl: string;
}
export interface VerificationEmailOpts {
  to: string;
  verifyUrl: string;
}

interface Message {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const sendViaResend = async (msg: Message): Promise<void> => {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${envVars.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: envVars.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }
};

// nodemailer is an optional dependency — lazy require so the server runs without
// it when Resend (or the console fallback) is used instead.
let cachedTransport: any;
const sendViaSmtp = async (msg: Message): Promise<void> => {
  if (!cachedTransport) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require("nodemailer");
    cachedTransport = nodemailer.createTransport({
      host: envVars.SMTP_HOST,
      port: Number(envVars.SMTP_PORT ?? 587),
      secure: envVars.SMTP_SECURE === "true",
      auth: envVars.SMTP_USER
        ? { user: envVars.SMTP_USER, pass: envVars.SMTP_PASSWORD }
        : undefined,
    });
  }
  await cachedTransport.sendMail({
    from: envVars.EMAIL_FROM,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
};

const logToConsole = (msg: Message): void => {
  logger.info(`[EMAIL:dev] "${msg.subject}" → ${msg.to}`);
  // The action link is the only thing a developer needs; surface it clearly.
  const link = /href="([^"]+)"/.exec(msg.html)?.[1];
  if (link) logger.info(`[EMAIL:dev] link → ${link}`);
};

const deliver = async (msg: Message): Promise<void> => {
  try {
    if (envVars.RESEND_API_KEY) return await sendViaResend(msg);
    if (envVars.SMTP_HOST) return await sendViaSmtp(msg);
    logToConsole(msg);
  } catch (err) {
    // Never crash a request because email failed; log and (in dev) show the link.
    logger.error("email delivery failed", { to: msg.to, err: String(err) });
    if (!isProd) logToConsole(msg);
    throw err;
  }
};

export const sendInviteEmail = async (opts: InviteEmailOpts): Promise<void> => {
  const t = inviteTemplate(opts);
  await deliver({ to: opts.to, ...t });
};

export const sendPasswordResetEmail = async (
  opts: PasswordResetEmailOpts
): Promise<void> => {
  const t = passwordResetTemplate(opts);
  await deliver({ to: opts.to, ...t });
};

export const sendVerificationEmail = async (
  opts: VerificationEmailOpts
): Promise<void> => {
  const t = verificationTemplate(opts);
  await deliver({ to: opts.to, ...t });
};
