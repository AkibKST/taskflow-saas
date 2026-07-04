"use client";
import { useEffect, useState, FormEvent } from "react";
import { useAuthStore } from "@/store/authStore";
import { showToast } from "@/store/toastStore";
import { api } from "@/lib/api";
import AppHeader from "@/components/layout/AppHeader";
import { Card, EmptyState, SectionHeader } from "@/components/ui";
import { btnPrimary, cx, pageBg } from "@/lib/ui";

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30";

interface Workspace {
  name: string;
  logoUrl?: string | null;
}

export default function WorkspaceSettingsPage() {
  const { user } = useAuthStore();
  const role = (user?.role ?? "MEMBER").toUpperCase();
  const isAdmin = role === "OWNER" || role === "ADMIN";

  const [form, setForm] = useState({ workspaceName: "", logoUrl: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .get<Workspace>("/settings/workspace")
      .then((res) =>
        setForm({ workspaceName: res.data.name, logoUrl: res.data.logoUrl ?? "" }),
      )
      .catch(() => {});
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className={cx("min-h-screen", pageBg)}>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-6 py-8">
          <Card>
            <EmptyState emoji="🔒" title="Access denied" hint="Only Owners and Admins can manage workspace settings." />
          </Card>
        </main>
      </div>
    );
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/settings/workspace", {
        name: form.workspaceName,
        logoUrl: form.logoUrl,
      });
      showToast("Workspace settings saved", "success");
    } catch (err) {
      showToast((err as Error)?.message || "Couldn't save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Workspace settings</h1>

        <Card className="mb-6">
          <SectionHeader title="General" />
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">Workspace name</label>
              <input
                className={inputClass}
                value={form.workspaceName}
                onChange={(e) => setForm({ ...form, workspaceName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">Logo URL (optional)</label>
              <input
                type="url"
                className={inputClass}
                placeholder="https://…"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Displayed in the sidebar and email notifications.
              </p>
            </div>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Card>

        <Card>
          <SectionHeader title="Admin navigation" />
          <ul className="space-y-2">
            {[
              { href: "/admin/users", label: "User management" },
              { href: "/admin/billing", label: "Billing & subscription" },
            ].map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span>{label}</span>
                  <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </div>
  );
}
