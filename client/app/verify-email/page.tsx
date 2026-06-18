"use client";
import { useEffect, useRef, useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { pageBg } from "@/lib/ui";

type Status = "verifying" | "success" | "error" | "no-token";

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
    verifying: { emoji: "⏳", title: "Verifying your email…", hint: "Please wait a moment." },
    success: { emoji: "✅", title: "Email verified!", hint: "Your email has been confirmed. You can now sign in." },
    error: { emoji: "⚠️", title: "Verification failed", hint: "The link may have expired. Request a new one below." },
    "no-token": { emoji: "🔗", title: "Invalid link", hint: "This verification link is missing a token." },
  }[status];

  const showResend = status === "error" || status === "no-token";

  return (
    <div className={`flex min-h-screen items-center justify-center ${pageBg} p-4`}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 text-center shadow-2xl sm:p-10">
        <p className="mb-4 text-5xl">{config.emoji}</p>
        <h1 className="text-2xl font-bold text-gray-800">{config.title}</h1>
        <p className="mt-2 text-sm text-gray-400">{config.hint}</p>

        {showResend && (
          <div className="mt-6 border-t border-gray-100 pt-6 text-left">
            {resent ? (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700">
                If your account needs verification, a new link is on its way.
              </p>
            ) : (
              <form onSubmit={handleResend} className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Resend verification email
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30"
                />
                <button
                  type="submit"
                  disabled={resending}
                  className="w-full rounded-full bg-gradient-to-r from-brand-600 to-brand-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 disabled:opacity-60"
                >
                  {resending ? "Sending…" : "Send new link"}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="mt-8 space-y-3">
          {status === "success" && (
            <Link
              href="/login"
              className="block w-full rounded-full bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30"
            >
              Sign in
            </Link>
          )}
          <Link href="/login" className="block text-xs font-semibold text-brand-600 hover:text-brand-700">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
