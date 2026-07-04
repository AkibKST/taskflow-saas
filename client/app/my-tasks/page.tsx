"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DEFAULT_PROJECT_COLOR } from "@taskflow/shared";
import { api } from "@/lib/api";
import AppHeader from "@/components/layout/AppHeader";
import { Card, Badge, EmptyState, SectionHeader } from "@/components/ui";
import { cx, pageBg, priorityBadge, taskStatusBadge } from "@/lib/ui";
import { useAuthStore } from "@/store/authStore";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  project?: { id: string; name: string };
  assignees?: { userId: string }[];
}

interface Project {
  id: string;
  name: string;
  color?: string | null;
}

type StatusFilter = "ALL" | string;

const STATUSES = ["ALL", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"];

export default function MyTasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get<Project[]>("/projects")
      .then(async (projRes) => {
        if (!active) return;
        const projs = projRes.data as unknown as (Project & { members?: { userId: string; user: unknown }[] })[];
        setProjects(projs);

        const all: Task[] = [];
        await Promise.allSettled(
          projs.map((p) =>
            api
              .get<Task[]>(`/projects/${p.id}/tasks`)
              .then((r) => {
                (r.data as unknown as Task[]).forEach((t) => {
                  all.push({ ...t, project: { id: p.id, name: p.name } });
                });
              })
              .catch(() => {}),
          ),
        );
        if (!active) return;
        const mine = all.filter((t) =>
          t.assignees?.some((a) => a.userId === user?.id),
        );
        setTasks(mine);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user?.id]);

  const filtered = tasks.filter((t) => {
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.project?.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const overdue = filtered.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE",
  );

  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : null;

  const projectColor = (id?: string) =>
    projects.find((p) => p.id === id)?.color ?? DEFAULT_PROJECT_COLOR;

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tasks assigned to you across all projects
          </p>
        </div>

        {overdue.length > 0 && (
          <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
            <p className="text-sm font-medium text-rose-700">
              {overdue.length} overdue task{overdue.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        <Card>
          <SectionHeader
            title={`Tasks (${filtered.length})`}
            action={
              <span className="text-sm text-gray-500">
                {tasks.filter((t) => t.status !== "DONE").length} open
              </span>
            }
          />

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              placeholder="Search tasks or projects…"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-400"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "All statuses" : s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl shimmer" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              emoji="✅"
              title={search || statusFilter !== "ALL" ? "No matching tasks" : "No tasks assigned to you"}
              hint={!search && statusFilter === "ALL" ? "Tasks you're assigned to will appear here." : undefined}
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: projectColor(t.project?.id) }}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/projects/${t.project?.id}/tasks/${t.id}`}
                      className="block truncate text-sm font-medium text-gray-800 hover:text-brand-600"
                    >
                      {t.title}
                    </Link>
                    {t.project && (
                      <Link
                        href={`/projects/${t.project.id}/tasks`}
                        className="truncate text-xs text-gray-500 hover:text-brand-500"
                      >
                        {t.project.name}
                      </Link>
                    )}
                  </div>
                  {t.dueDate && (
                    <span
                      className={cx(
                        "shrink-0 text-xs",
                        new Date(t.dueDate) < new Date() && t.status !== "DONE"
                          ? "font-semibold text-rose-500"
                          : "text-gray-500",
                      )}
                    >
                      {fmt(t.dueDate)}
                    </span>
                  )}
                  <Badge className={priorityBadge[t.priority] ?? priorityBadge.MEDIUM}>
                    {t.priority}
                  </Badge>
                  <Badge className={taskStatusBadge[t.status] ?? taskStatusBadge.TODO}>
                    {t.status.replace("_", " ")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
