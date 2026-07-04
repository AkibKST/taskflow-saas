"use client";
import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui";
import Alert from "@/components/ui/Alert";
import AuthCard from "@/components/auth/AuthCard";
import PasswordField from "@/components/auth/PasswordField";

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
    try {
      await api.post("/auth/reset-password", { token, password: form.password });
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(
        (err as Error)?.message ||
          "Couldn't reset your password. The link may have expired.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title={done ? "Password reset!" : "Set new password"}
      subtitle={
        done
          ? "Your password has been updated. Redirecting to login…"
          : "Choose a strong new password for your account."
      }
      icon={
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      }
    >
      {!done && (
        <>
          {!token && (
            <div className="mb-5">
              <Alert>
                Invalid or expired reset link.{" "}
                <Link href="/forgot-password" className="font-semibold underline">
                  Request a new one
                </Link>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <PasswordField
              label="New password"
              placeholder="At least 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <PasswordField
              label="Confirm password"
              placeholder="Repeat the password"
              required
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />

            {error && <Alert>{error}</Alert>}

            <Button type="submit" fullWidth loading={loading} disabled={!token}>
              {loading ? "Resetting…" : "Reset password"}
            </Button>

            <Link
              href="/login"
              className="block text-center text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Back to sign in
            </Link>
          </form>
        </>
      )}
    </AuthCard>
  );
}
