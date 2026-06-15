"use client";
import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TASK_STATUS, PRIORITY } from "@taskflow/shared";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/apiError";
import { showToast } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
import AppHeader from "@/components/layout/AppHeader";
import { Card, Badge, EmptyState, SectionHeader } from "@/components/ui";
import {
  btnPrimary,
  btnGhost,
  cx,
  pageBg,
  priorityBadge,
  taskStatusBadge,
} from "@/lib/ui";

interface Assignee {
  userId: string;
  user: { id: string; name: string; email: string };
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  order?: number;
  assignees?: Assignee[];
  createdAt?: string;
  updatedAt?: string;
}

interface Member {
  userId: string;
  user: { id: string; name: string; email: string };
}

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30";

export default function TaskDetailPage() {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const role = (user?.role ?? "MEMBER").toUpperCase();
  const canWrite = ["OWNER", "ADMIN", "MANAGER", "MEMBER"].includes(role);

  const [task, setTask] = useState<Task | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState<{
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: string;
  }>({
    title: "",
    description: "",
    status: TASK_STATUS.TODO as string,
    priority: PRIORITY.MEDIUM as string,
    dueDate: "",
  });

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get<{ data: Task[] }>(`/projects/${projectId}/tasks`),
      api.get<{ members?: Member[] }[]>("/projects"),
    ]).then(([tasksRes, projectsRes]) => {
      if (!active) return;
      if (tasksRes.status === "fulfilled") {
        const list = (tasksRes.value.data as unknown as Task[]);
        const found = list.find((t) => t.id === taskId) ?? null;
        if (!found) {
          setLoadError("Task not found.");
        } else {
          setTask(found);
          setForm({
            title: found.title,
            description: found.description ?? "",
            status: found.status,
            priority: found.priority,
            dueDate: found.dueDate ? found.dueDate.split("T")[0] : "",
          });
        }
      } else {
        setLoadError("Could not load task.");
      }
      if (projectsRes.status === "fulfilled") {
        const projects = projectsRes.value.data as unknown as { id: string; members?: Member[] }[];
        const proj = projects.find((p) => p.id === projectId);
        setMembers(proj?.members ?? []);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [projectId, taskId]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      };
      const res = await api.patch<Task>(`/projects/${projectId}/tasks/${taskId}`, payload);
      setTask((t) => (t ? { ...t, ...res.data } : res.data));
      showToast("Task updated", "success");
    } catch (err) {
      showToast(parseApiError(err).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`);
      showToast("Task deleted", "success");
      router.push(`/projects/${projectId}/tasks`);
    } catch (err) {
      showToast(parseApiError(err).message, "error");
      setDeleting(false);
    }
  };

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link
          href={`/projects/${projectId}/tasks`}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Back to board
        </Link>

        {loading ? (
          <div className="mt-4 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-3xl shimmer" />
            ))}
          </div>
        ) : loadError ? (
          <Card className="mt-4">
            <EmptyState emoji="⚠️" title="Couldn't load task" hint={loadError} />
          </Card>
        ) : (
          <>
            <div className="mb-6 mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{task?.title}</h1>
              <Badge className={taskStatusBadge[task?.status ?? "TODO"]}>
                {task?.status?.replace("_", " ")}
              </Badge>
              <Badge className={priorityBadge[task?.priority ?? "MEDIUM"]}>
                {task?.priority}
              </Badge>
            </div>

            <Card className="mb-6">
              <SectionHeader title="Details" />
              {!canWrite && (
                <p className="mb-4 rounded-xl bg-gray-50 px-4 py-2 text-sm text-gray-500">
                  You have read-only access.
                </p>
              )}
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600">Title</label>
                  <input
                    className={inputClass}
                    value={form.title}
                    disabled={!canWrite}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600">Description</label>
                  <textarea
                    className={cx(inputClass, "min-h-[100px] resize-y")}
                    value={form.description}
                    disabled={!canWrite}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Add a description…"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-600">Status</label>
                    <select
                      className={inputClass}
                      value={form.status}
                      disabled={!canWrite}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      {Object.values(TASK_STATUS).map((s) => (
                        <option key={s} value={s}>{String(s).replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-600">Priority</label>
                    <select
                      className={inputClass}
                      value={form.priority}
                      disabled={!canWrite}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    >
                      {Object.values(PRIORITY).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-600">Due date</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={form.dueDate}
                      disabled={!canWrite}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                {canWrite && (
                  <button type="submit" disabled={saving} className={btnPrimary}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                )}
              </form>
            </Card>

            {members.length > 0 && (
              <Card className="mb-6">
                <SectionHeader title="Assignees" />
                {!task?.assignees || task.assignees.length === 0 ? (
                  <EmptyState emoji="👤" title="No assignees" hint="Edit the task on the board to assign people." />
                ) : (
                  <ul className="space-y-3">
                    {task.assignees.map((a) => (
                      <li key={a.userId} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white">
                          {a.user.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800">{a.user.name}</p>
                          <p className="truncate text-xs text-gray-400">{a.user.email}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {canWrite && (
              <Card className="border border-rose-100 !ring-rose-100">
                <SectionHeader title="Danger zone" />
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <p className="text-sm text-gray-500">Deleting a task cannot be undone.</p>
                  {confirmDelete ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                      >
                        {deleting ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button onClick={() => setConfirmDelete(false)} className={cx(btnGhost, "!px-4 !py-2")}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="shrink-0 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Delete task
                    </button>
                  )}
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
