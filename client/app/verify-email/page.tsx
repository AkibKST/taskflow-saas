"use client";
import { useEffect, useRef, useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button, Field } from "@/components/ui";
import Alert from "@/components/ui/Alert";
import AuthCard from "@/components/auth/AuthCard";
import { buttonClasses } from "@/lib/ui";

type Status = "verifying" | "success" | "error" | "no-token";

const ICONS: Record<Status, React.ReactNode> = {
  verifying: (
    <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  ),
  success: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5 10 17.5 19 6.5" />
    </svg>
  ),
  error: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  "no-token": (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  ),
};

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "no-token");
  const [resendEmail, setResendEmail] = useState("");
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  // Verify exactly once even under React 18 StrictMode double-effect.
  const verified = useRef(false);

  useEffect(() => {
    if (!token || verified.current) return;
    verified.current = true;
    api
      .post("/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  const handleResend = async (e: FormEvent) => {
    e.preventDefault();
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email: resendEmail });
      setResent(true);
    } catch {
      // Endpoint never reveals account existence — show neutral confirmation.
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  const config = {
    verifying: { title: "Verifying your email…", hint: "Please wait a moment." },
    success: { title: "Email verified!", hint: "Your email has been confirmed. You can now sign in." },
    error: { title: "Verification failed", hint: "The link may have expired. Request a new one below." },
    "no-token": { title: "Invalid link", hint: "This verification link is missing a token." },
  }[status];

  const showResend = status === "error" || status === "no-token";

  return (
    <AuthCard title={config.title} subtitle={config.hint} icon={ICONS[status]}>
      {showResend && (
        <div className="border-t border-gray-100 pt-6">
          {resent ? (
            <Alert variant="success">
              If your account needs verification, a new link is on its way.
            </Alert>
          ) : (
            <form onSubmit={handleResend} className="space-y-4">
              <Field
                label="Resend verification email"
                type="email"
                required
                placeholder="you@company.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
              />
              <Button type="submit" fullWidth loading={resending}>
                {resending ? "Sending…" : "Send new link"}
              </Button>
            </form>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {status === "success" && (
          <Link href="/login" className={buttonClasses("primary", "md", "w-full")}>
            Sign in
          </Link>
        )}
        <Link
          href="/login"
          className="block text-center text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
