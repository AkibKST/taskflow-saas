"use client";
import { useState, SyntheticEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button, Field } from "@/components/ui";
import AuthCard from "@/components/auth/AuthCard";

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
    <AuthCard
      title={sent ? "Check your inbox" : "Forgot password?"}
      subtitle={
        sent
          ? `If an account exists for ${email}, we've sent a reset link.`
          : "Enter your email and we'll send you a reset link."
      }
      icon={
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <Button variant="ghost" fullWidth onClick={() => setSent(false)}>
            Use a different email
          </Button>
          <Link
            href="/login"
            className="block text-center text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field
            label="Email"
            type="email"
            name="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button type="submit" fullWidth loading={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>

          <Link
            href="/login"
            className="block text-center text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Back to sign in
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
