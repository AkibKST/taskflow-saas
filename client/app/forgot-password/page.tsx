"use client";
import { useState, SyntheticEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { pageBg, inputPill, iconBadge } from "@/lib/ui";

/**
 * Forgot-password page — requests a reset link via POST /auth/forgot-password.
 * The endpoint always responds 200 (no account enumeration), so we show the
 * same confirmation regardless of whether the email is registered.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      // Still show the neutral confirmation — never reveal account existence.
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex min-h-screen items-center justify-center ${pageBg} p-4`}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </span>
          <h1 className="text-2xl font-bold text-gray-800">
            {sent ? "Check your inbox" : "Forgot password?"}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {sent
              ? `If an account exists for ${email}, we've sent a reset link.`
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {sent ? (
          <div className="mt-8 space-y-4">
            <button
              onClick={() => setSent(false)}
              className="w-full rounded-full bg-gray-100 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200"
            >
              Use a different email
            </button>
            <Link
              href="/login"
              className="block text-center text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className={inputPill}>
              <span className={iconBadge}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </span>
              <input
                type="email"
                name="email"
                placeholder="E-mail"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mx-auto mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-brand-500/30 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                </svg>
              )}
              {loading ? "Sending" : "Send reset link"}
            </button>

            <Link
              href="/login"
              className="block text-center text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
