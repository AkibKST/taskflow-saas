// Email stub — logs invite/reset links to console in development.
// Replace the body of each function with a real provider call
// (e.g. Resend: `resend.emails.send({...})`) when ready.

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

export const sendInviteEmail = async (opts: InviteEmailOpts): Promise<void> => {
  console.log(`[EMAIL STUB] ─── Invite ───────────────────────────`);
  console.log(`  To:      ${opts.to}`);
  console.log(`  From:    ${opts.inviterName} (${opts.tenantName})`);
  console.log(`  Link:    ${opts.inviteUrl}`);
  console.log(`───────────────────────────────────────────────────`);
};

export const sendPasswordResetEmail = async (
  opts: PasswordResetEmailOpts
): Promise<void> => {
  console.log(`[EMAIL STUB] ─── Password Reset ────────────────────`);
  console.log(`  To:   ${opts.to}`);
  console.log(`  Link: ${opts.resetUrl}`);
  console.log(`───────────────────────────────────────────────────`);
};

export const sendVerificationEmail = async (
  opts: VerificationEmailOpts
): Promise<void> => {
  console.log(`[EMAIL STUB] ─── Email Verification ────────────────`);
  console.log(`  To:   ${opts.to}`);
  console.log(`  Link: ${opts.verifyUrl}`);
  console.log(`───────────────────────────────────────────────────`);
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// sendInviteEmail(opts)        → logs invite link to console; swap body for Resend/SES call
// sendPasswordResetEmail(opts) → logs reset link to console; swap body for Resend/SES call
// sendVerificationEmail(opts)  → logs verify link to console; swap body for Resend/SES call
// ──────────────────────────────────────────────────────────────────────────────
