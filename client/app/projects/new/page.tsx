"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/apiError";
import { showToast } from "@/store/toastStore";
import AppHeader from "@/components/layout/AppHeader";
import { Card, SectionHeader } from "@/components/ui";
import { btnPrimary, btnGhost, cx, pageBg } from "@/lib/ui";

const PROJECT_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30";

interface Project {
  id: string;
  name: string;
}

export default function CreateProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: "#6366f1",
    status: "ACTIVE",
    startDate: "",
    endDate: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post<Project>("/projects", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: form.color,
        status: form.status,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      });
      showToast("Project created", "success");
      router.push(`/projects/${res.data.id}/tasks`);
    } catch (err) {
      showToast(parseApiError(err).message, "error");
      setSaving(false);
    }
  };

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-2xl px-6 py-8">
        <Link href="/projects" className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to projects
        </Link>

        <h1 className="mb-6 mt-3 text-2xl font-bold text-gray-900">New project</h1>

        <Card>
          <SectionHeader title="Project details" />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                autoFocus
                required
                className={inputClass}
                placeholder="e.g. Website Redesign"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">Description</label>
              <textarea
                className={cx(inputClass, "min-h-[80px] resize-y")}
                placeholder="What is this project about?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">Status</label>
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">Start date</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">End date</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="h-10 w-20 cursor-pointer rounded-xl border border-gray-200 bg-white px-1"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
                <span className="text-xs text-gray-400">Pick a color to identify this project</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/projects" className={cx(btnGhost, "!px-5 !py-2.5")}>
                Cancel
              </Link>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? "Creating…" : "Create project"}
              </button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
