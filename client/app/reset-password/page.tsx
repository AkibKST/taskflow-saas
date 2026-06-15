"use client";
import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { pageBg, inputPill, iconBadge } from "@/lib/ui";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  };

  const lockIcon = (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );

  return (
    <div className={`flex min-h-screen items-center justify-center ${pageBg} p-4`}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            {lockIcon}
          </span>
          <h1 className="text-2xl font-bold text-gray-800">
            {done ? "Password reset!" : "Set new password"}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {done
              ? "Your password has been updated. Redirecting to login…"
              : "Choose a strong new password for your account."}
          </p>
        </div>

        {!done && (
          <>
            {!token && (
              <div className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
                Invalid or expired reset link.{" "}
                <Link href="/forgot-password" className="font-semibold underline">
                  Request a new one
                </Link>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className={inputPill}>
                <span className={iconBadge}>{lockIcon}</span>
                <input
                  type="password"
                  placeholder="New password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
              <div className={inputPill}>
                <span className={iconBadge}>{lockIcon}</span>
                <input
                  type="password"
                  placeholder="Confirm password"
                  required
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>

              {error && (
                <p className="px-4 text-xs font-medium text-rose-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="mx-auto mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-brand-500/30 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Resetting…" : "Reset password"}
              </button>

              <Link href="/login" className="block text-center text-xs font-semibold text-brand-600 hover:text-brand-700">
                Back to sign in
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
