"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { pageBg } from "@/lib/ui";

type Status = "verifying" | "success" | "error" | "no-token";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "no-token");

  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => {
      setStatus("success");
    }, 800);
    return () => clearTimeout(timer);
  }, [token]);

  const config = {
    verifying: { emoji: "⏳", title: "Verifying your email…", hint: "Please wait a moment." },
    success: { emoji: "✅", title: "Email verified!", hint: "Your email has been confirmed. You can now sign in." },
    error: { emoji: "⚠️", title: "Verification failed", hint: "The link may have expired. Request a new one." },
    "no-token": { emoji: "🔗", title: "Invalid link", hint: "This verification link is missing a token." },
  }[status];

  return (
    <div className={`flex min-h-screen items-center justify-center ${pageBg} p-4`}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 text-center shadow-2xl sm:p-10">
        <p className="mb-4 text-5xl">{config.emoji}</p>
        <h1 className="text-2xl font-bold text-gray-800">{config.title}</h1>
        <p className="mt-2 text-sm text-gray-400">{config.hint}</p>

        <div className="mt-8 space-y-3">
          {status === "success" && (
            <Link
              href="/login"
              className="block w-full rounded-full bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30"
            >
              Sign in
            </Link>
          )}
          {(status === "error" || status === "no-token") && (
            <Link
              href="/register"
              className="block w-full rounded-full bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30"
            >
              Back to register
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
