"use client";
import { useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore, User } from "@/store/authStore";

interface RegisterForm {
  name: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  // --- state variables ---
  const [form, setForm] = useState<RegisterForm>({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ user: User; accessToken: string }>(
        "/auth/register",
        form
      );
      if (res) setAuth(res.data.user, res.data.accessToken);
      router.push("/projects");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-2xl md:min-h-[580px] md:grid-cols-2">
        {/* ---------- Welcome panel (left) ---------- */}
        <div className="relative flex min-h-[180px] items-center justify-center overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-brand-700 p-8 md:min-h-0 md:p-12">
          {/* Cloud edge on the right side, curving into the form (side-by-side layout only) */}
          <svg
            className="absolute inset-y-0 -right-1 hidden h-full text-white md:block"
            viewBox="0 0 120 400"
            preserveAspectRatio="none"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M120,0 H80 C100,40 60,70 90,110 C115,145 65,170 95,210 C120,245 70,275 100,315 C122,350 75,375 90,400 H120 Z" />
          </svg>

          {/* Wave between purple panel (top) and white form (bottom) on mobile */}
          <svg
            className="absolute inset-x-0 -bottom-1 h-10 w-full text-white md:hidden"
            viewBox="0 0 400 40"
            preserveAspectRatio="none"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M0,40 H400 V26 C350,6 300,36 250,23 C200,11 150,36 100,23 C50,11 25,31 0,21 Z" />
          </svg>

          <div className="relative z-10 max-w-xs text-white">
            <h2 className="text-3xl font-bold">Welcome!</h2>
            <p className="mt-4 text-sm leading-relaxed text-brand-100">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
              pharetra magna nisl, at posuere sem dapibus sed.
            </p>
          </div>
        </div>

        {/* ---------- Form panel (right) ---------- */}
        <div className="flex flex-col justify-center px-8 py-12 sm:px-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
            <p className="mt-1 text-sm text-gray-400">Sign up to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <p className="rounded-full bg-red-50 px-4 py-2 text-center text-sm text-red-600">
                {error}
              </p>
            )}

            {/* Name */}
            <div className="flex items-center gap-3 rounded-full bg-gray-100 px-4 py-3 focus-within:ring-2 focus-within:ring-brand-500/40">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </span>
              <input
                type="text"
                name="name"
                placeholder="Full name"
                autoComplete="name"
                required
                value={form.name}
                onChange={handleInputChange}
                className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>

            {/* Email */}
            <div className="flex items-center gap-3 rounded-full bg-gray-100 px-4 py-3 focus-within:ring-2 focus-within:ring-brand-500/40">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
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
                className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>

            {/* Password */}
            <div className="flex items-center gap-3 rounded-full bg-gray-100 px-4 py-3 focus-within:ring-2 focus-within:ring-brand-500/40">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="11" width="16" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={handleInputChange}
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

            <p className="px-2 text-xs text-gray-400">Min. 8 characters</p>

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
              {loading ? "Creating" : "Sign up"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}