"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { showToast } from "@/store/toastStore";
import AppHeader from "@/components/layout/AppHeader";
import { Card, SectionHeader } from "@/components/ui";
import { btnPrimary, cx, pageBg } from "@/lib/ui";

interface Pref {
  // `key` matches the NotificationPreference column / API field exactly.
  key: string;
  label: string;
  description: string;
}

const PREFS: Pref[] = [
  { key: "taskAssigned", label: "Task assigned to me", description: "When a task is assigned to you." },
  { key: "taskDue", label: "Task due soon", description: "24 hours before a due date." },
  { key: "commentMention", label: "Mentions", description: "When someone @mentions you in a comment." },
  { key: "memberJoined", label: "Member joined", description: "When a new member joins your workspace." },
  { key: "projectUpdate", label: "Project updates", description: "When a project you're on is updated." },
];

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(PREFS.map((p) => [p.key, true])),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<Record<string, boolean>>("/settings/notifications")
      .then((res) =>
        setPrefs((prev) => {
          const next = { ...prev };
          for (const p of PREFS) {
            if (typeof res.data[p.key] === "boolean") next[p.key] = res.data[p.key];
          }
          return next;
        }),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = Object.fromEntries(PREFS.map((p) => [p.key, prefs[p.key]]));
      await api.patch("/settings/notifications", body);
      showToast("Preferences saved", "success");
    } catch (err) {
      showToast((err as Error)?.message || "Couldn't save preferences", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-2xl px-6 py-8">
        <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-700">
          ← Account settings
        </Link>

        <h1 className="mb-6 mt-3 text-2xl font-bold text-gray-900">Notification preferences</h1>

        <Card>
          <SectionHeader title="Email & in-app notifications" />
          <ul className="divide-y divide-gray-100">
            {PREFS.map((p) => (
              <li key={p.key} className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">{p.label}</p>
                  <p className="text-xs text-gray-500">{p.description}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={prefs[p.key]}
                  disabled={loading}
                  onClick={() => setPrefs((prev) => ({ ...prev, [p.key]: !prev[p.key] }))}
                  className={cx(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50",
                    prefs[p.key] ? "bg-brand-600" : "bg-gray-200",
                  )}
                >
                  <span
                    className={cx(
                      "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform",
                      prefs[p.key] ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <button onClick={handleSave} disabled={saving || loading} className={btnPrimary}>
              {saving ? "Saving…" : "Save preferences"}
            </button>
          </div>
        </Card>
      </main>
    </div>
  );
}
