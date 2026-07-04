"use client";
import { useState, useEffect, SyntheticEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/apiError";
import { useAuthStore, User } from "@/store/authStore";
import { Button, Field } from "@/components/ui";
import Alert from "@/components/ui/Alert";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField from "@/components/auth/PasswordField";

interface LoginForm {
  email: string;
  password: string;
}

const HIGHLIGHTS = [
  "Pick up right where your team left off",
  "Boards, tasks and comments in real time",
  "Everything synced across your workspace",
];

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  // Already signed in → skip the form.
  useEffect(() => {
    if (hasHydrated && user) router.replace("/dashboard");
  }, [hasHydrated, user, router]);

  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [remember, setRemember] = useState<boolean>(false);
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
      if (res) setAuth(res.data.user, res.data.accessToken, remember);
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
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your TaskFlow workspace."
      aside={
        <>
          <h2 className="text-3xl font-bold leading-snug text-white">
            Everything your team needs to ship work, in one place.
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-brand-50">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M5 12.5 10 17.5 19 6.5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </>
      }
      switchLink={{
        prompt: "New to TaskFlow?",
        label: "Create workspace",
        href: "/register",
      }}
      footer={
        <>
          New to TaskFlow?{" "}
          <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Create a workspace
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <Field
          label="Email"
          type="email"
          name="email"
          placeholder="you@company.com"
          autoComplete="email"
          required
          value={form.email}
          onChange={handleInputChange}
          error={fieldErrors.email}
        />

        <PasswordField
          name="password"
          placeholder="Your password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={handleInputChange}
          error={fieldErrors.password}
        />

        <div className="flex items-center justify-between text-sm">
          <label
            className="flex cursor-pointer items-center gap-2 text-gray-600"
            title="Stay signed in on this device after closing the browser"
          >
            <input
              type="checkbox"
              name="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 accent-brand-600"
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth loading={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
