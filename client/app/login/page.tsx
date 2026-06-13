"use client";
import { useState, SyntheticEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/apiError";
import { useAuthStore, User } from "@/store/authStore";
import { pageBg, inputPill, inputPillError, fieldErrorText, iconBadge, cx } from "@/lib/ui";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  // --- state variables ---
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [remember, setRemember] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear a field's error as soon as the user edits it.
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await api.post<{ user: User; accessToken: string }>(
        "/auth/login",
        form
      );
      if (res) setAuth(res.data.user, res.data.accessToken);
      router.push("/dashboard");
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex min-h-screen items-center justify-center ${pageBg} p-4`}>
      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-2xl md:min-h-[580px] md:grid-cols-2">
        {/* ---------- Form panel ---------- */}
        <div className="flex flex-col justify-center px-8 py-12 sm:px-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">Hello!</h1>
            <p className="mt-1 text-sm text-gray-400">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <div className={cx(fieldErrors.email ? inputPillError : inputPill)}>
                <span className={iconBadge}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                  value={form.email}
                  onChange={handleInputChange}
                  aria-invalid={!!fieldErrors.email}
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
              {fieldErrors.email && <p className={fieldErrorText}>{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className={cx(fieldErrors.password ? inputPillError : inputPill)}>
                <span className={iconBadge}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="11" width="16" height="9" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleInputChange}
                  aria-invalid={!!fieldErrors.password}
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
              </div>
              {fieldErrors.password && <p className={fieldErrorText}>{fieldErrors.password}</p>}
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between px-1 text-xs">
              <label className="flex cursor-pointer items-center gap-2 text-gray-500">
                <input
                  type="checkbox"
                  name="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 accent-brand-600"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-gray-400 hover:text-brand-600">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mx-auto mt-2 flex w-44 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-brand-500/30 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                </svg>
              )}
              {loading ? "Signing in" : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Create
            </Link>
          </p>
        </div>

        {/* ---------- Welcome panel ---------- */}
        <div className="relative flex min-h-[180px] items-center justify-center overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-brand-700 p-8 md:min-h-0 md:p-12">
          {/* Cloud edge (side-by-side layout only) */}
          <svg
            className="absolute inset-y-0 -left-1 hidden h-full text-white md:block"
            viewBox="0 0 120 400"
            preserveAspectRatio="none"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M0,0 H40 C20,40 60,70 30,110 C5,145 55,170 25,210 C0,245 50,275 20,315 C-2,350 45,375 30,400 H0 Z" />
          </svg>

          {/* Wave between white form (top) and purple panel (bottom) on mobile */}
          <svg
            className="absolute inset-x-0 -top-1 h-10 w-full text-white md:hidden"
            viewBox="0 0 400 40"
            preserveAspectRatio="none"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M0,0 H400 V14 C350,34 300,4 250,17 C200,29 150,4 100,17 C50,29 25,9 0,19 Z" />
          </svg>

          <div className="relative z-10 max-w-xs text-white">
            <h2 className="text-3xl font-bold">Welcome Back!</h2>
            <p className="mt-4 text-sm leading-relaxed text-brand-100">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
              pharetra magna nisl, at posuere sem dapibus sed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}