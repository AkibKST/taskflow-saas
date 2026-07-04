/**
 * Transactional email templates. Email clients strip <style> and external CSS,
 * so everything is inline-styled. Each builder returns { subject, html, text }
 * — the plain-text part improves deliverability and accessibility.
 */

const BRAND = "#00ff41";
const BG = "#0b0f0c";
const CARD = "#111814";
const TEXT = "#e6f1ea";
const MUTED = "#9fb4a8";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );

interface Layout {
  title: string;
  intro: string;
  buttonLabel: string;
  buttonUrl: string;
  footnote?: string;
}

const layout = ({ title, intro, buttonLabel, buttonUrl, footnote }: Layout): string => `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${BG};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:${CARD};border:1px solid #1f2b24;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:28px 32px 8px;">
            <div style="font-weight:700;font-size:20px;color:${BRAND};letter-spacing:.5px;">TaskFlow</div>
          </td></tr>
          <tr><td style="padding:8px 32px 0;">
            <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${TEXT};">${escapeHtml(title)}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${MUTED};">${intro}</p>
            <a href="${buttonUrl}" style="display:inline-block;background:${BRAND};color:#03130a;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:8px;">${escapeHtml(buttonLabel)}</a>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${MUTED};">Or paste this link into your browser:<br/>
              <a href="${buttonUrl}" style="color:${BRAND};word-break:break-all;">${escapeHtml(buttonUrl)}</a>
            </p>
            ${footnote ? `<p style="margin:20px 0 0;font-size:12px;color:${MUTED};">${escapeHtml(footnote)}</p>` : ""}
          </td></tr>
          <tr><td style="padding:28px 32px;">
            <div style="border-top:1px solid #1f2b24;padding-top:16px;font-size:12px;color:${MUTED};">
              You received this email from TaskFlow. If you weren't expecting it, you can safely ignore it.
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

export const inviteTemplate = (opts: {
  inviterName: string;
  tenantName: string;
  inviteUrl: string;
}) => ({
  subject: `${opts.inviterName} invited you to ${opts.tenantName} on TaskFlow`,
  html: layout({
    title: `Join ${escapeHtml(opts.tenantName)} on TaskFlow`,
    intro: `<strong style="color:${TEXT}">${escapeHtml(opts.inviterName)}</strong> has invited you to collaborate in the <strong style="color:${TEXT}">${escapeHtml(opts.tenantName)}</strong> workspace.`,
    buttonLabel: "Accept invitation",
    buttonUrl: opts.inviteUrl,
    footnote: "This invitation link expires in 72 hours.",
  }),
  text: `${opts.inviterName} invited you to join ${opts.tenantName} on TaskFlow.\nAccept: ${opts.inviteUrl}\n(This link expires in 72 hours.)`,
});

export const passwordResetTemplate = (opts: { resetUrl: string }) => ({
  subject: "Reset your TaskFlow password",
  html: layout({
    title: "Reset your password",
    intro: "We received a request to reset your TaskFlow password. Click below to choose a new one.",
    buttonLabel: "Reset password",
    buttonUrl: opts.resetUrl,
    footnote: "This link expires in 1 hour. If you didn't request a reset, ignore this email.",
  }),
  text: `Reset your TaskFlow password: ${opts.resetUrl}\n(This link expires in 1 hour. If you didn't request it, ignore this email.)`,
});

export const verificationTemplate = (opts: { verifyUrl: string }) => ({
  subject: "Verify your TaskFlow email",
  html: layout({
    title: "Confirm your email address",
    intro: "Please verify your email to secure your TaskFlow account and unlock all features.",
    buttonLabel: "Verify email",
    buttonUrl: opts.verifyUrl,
    footnote: "This link expires in 24 hours.",
  }),
  text: `Verify your TaskFlow email: ${opts.verifyUrl}\n(This link expires in 24 hours.)`,
});
