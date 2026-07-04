"use client";
import { useState, useEffect, SyntheticEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PLAN_CATALOG } from "@taskflow/shared";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/apiError";
import { useAuthStore, User } from "@/store/authStore";
import { Button, Field } from "@/components/ui";
import Alert from "@/components/ui/Alert";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField from "@/components/auth/PasswordField";

interface RegisterForm {
  orgName: string;
  name: string;
  email: string;
  password: string;
}

const STEPS = [
  {
    title: "Create your workspace",
    desc: "Your organization gets its own private, isolated space.",
  },
  {
    title: "Invite your team",
    desc: "Add teammates with the right role — from viewer to admin.",
  },
  {
    title: "Plan, track and ship",
    desc: "Boards, tasks and comments update for everyone in real time.",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  // Already signed in → skip the form.
  useEffect(() => {
    if (hasHydrated && user) router.replace("/dashboard");
  }, [hasHydrated, user, router]);

  const [form, setForm] = useState<RegisterForm>({ orgName: "", name: "", email: "", password: "" });
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
        "/auth/register",
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
    <AuthShell
      title="Create your workspace"
      subtitle="Start free — no credit card required."
      aside={
        <>
          <h2 className="text-3xl font-bold leading-snug text-white">
            Set your team up in minutes.
          </h2>
          <ol className="mt-8 space-y-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white ring-1 ring-white/25">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-white">{step.title}</p>
                  <p className="mt-0.5 text-sm text-brand-100">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">
              Free plan includes
            </p>
            <p className="mt-1 text-sm text-brand-50">
              {PLAN_CATALOG.FREE.features.join(" · ")}
            </p>
          </div>
        </>
      }
      switchLink={{
        prompt: "Already have an account?",
        label: "Sign in",
        href: "/login",
      }}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <Field
          label="Organization name"
          type="text"
          name="orgName"
          placeholder="e.g. Acme Inc."
          autoComplete="organization"
          required
          value={form.orgName}
          onChange={handleInputChange}
          error={fieldErrors.orgName}
        />

        <Field
          label="Full name"
          type="text"
          name="name"
          placeholder="Your name"
          autoComplete="name"
          required
          value={form.name}
          onChange={handleInputChange}
          error={fieldErrors.name}
        />

        <Field
          label="Work email"
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
          placeholder="Create a password"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.password}
          onChange={handleInputChange}
          error={fieldErrors.password}
          hint="8+ chars, 1 uppercase, 1 number"
        />

        <Button type="submit" fullWidth loading={loading}>
          {loading ? "Creating workspace…" : "Create workspace"}
        </Button>

        <p className="text-center text-xs text-gray-500">
          By creating a workspace you agree to our{" "}
          <Link href="/about" className="font-medium text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-gray-900">
            terms of service
          </Link>{" "}
          and{" "}
          <Link href="/about" className="font-medium text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-gray-900">
            privacy policy
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
}
