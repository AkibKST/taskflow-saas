"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import AppHeader from "@/components/layout/AppHeader";
import { Card, Badge, EmptyState, SectionHeader, StatCard } from "@/components/ui";
import { cx, pageBg, projectStatusBadge, roleBadge, taskStatusBadge } from "@/lib/ui";

interface Member {
  id: string;
  role: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  members?: Member[];
  _count?: { tasks?: number };
}

const taskIcon = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
const usersIcon = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 5a3 3 0 0 1 0 6M21 20c0-2.5-2-4-4-4.5" />
  </svg>
);

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get<Project[]>("/projects"),
      api.get<Task[]>(`/projects/${projectId}/tasks`),
    ]).then(([projRes, tasksRes]) => {
      if (!active) return;
      if (projRes.status === "fulfilled") {
        const found = (projRes.value.data as Project[]).find((p) => p.id === projectId) ?? null;
        setProject(found);
      }
      if (tasksRes.status === "fulfilled") {
        setTasks(tasksRes.value.data as unknown as Task[]);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [projectId]);

  const tasksByStatus = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  const donePct = tasks.length
    ? Math.round(((tasksByStatus["DONE"] ?? 0) / tasks.length) * 100)
    : 0;

  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-4xl px-6 py-8">
        <Link href="/projects" className="text-sm text-gray-400 hover:text-gray-600">
          ← Projects
        </Link>

        {loading ? (
          <div className="mt-4 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-3xl shimmer" />
            ))}
          </div>
        ) : !project ? (
          <Card className="mt-4">
            <EmptyState emoji="⚠️" title="Project not found" />
          </Card>
        ) : (
          <>
            <div className="mb-6 mt-3 flex flex-wrap items-center gap-3">
              <span
                className="h-5 w-5 shrink-0 rounded-full"
                style={{ backgroundColor: project.color ?? "#6366f1" }}
              />
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <Badge className={projectStatusBadge[project.status] ?? projectStatusBadge.ACTIVE}>
                {project.status?.replace("_", " ")}
              </Badge>
              <div className="ml-auto flex gap-2">
                <Link
                  href={`/projects/${projectId}/tasks`}
                  className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Open board
                </Link>
                <Link
                  href={`/projects/${projectId}/settings`}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Settings
                </Link>
              </div>
            </div>

            {project.description && (
              <p className="mb-6 text-sm text-gray-500">{project.description}</p>
            )}

            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total tasks" value={tasks.length} icon={taskIcon} />
              <StatCard label="Done" value={tasksByStatus["DONE"] ?? 0} icon={taskIcon} hint={`${donePct}%`} />
              <StatCard label="In progress" value={tasksByStatus["IN_PROGRESS"] ?? 0} icon={taskIcon} />
              <StatCard label="Members" value={project.members?.length ?? 0} icon={usersIcon} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <SectionHeader title="Progress" />
                <div className="mb-4">
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>Overall completion</span>
                    <span className="font-medium text-gray-700">{donePct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all"
                      style={{ width: `${donePct}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"].map((s) => (
                    <div key={s} className="flex items-center justify-between text-sm">
                      <Badge className={taskStatusBadge[s]}>{s.replace("_", " ")}</Badge>
                      <span className="font-medium text-gray-700">{tasksByStatus[s] ?? 0}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Start</span>
                    <span>{fmt(project.startDate)}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>End</span>
                    <span>{fmt(project.endDate)}</span>
                  </div>
                </div>
              </Card>

              <Card>
                <SectionHeader
                  title={`Members (${project.members?.length ?? 0})`}
                  action={
                    <Link
                      href={`/projects/${projectId}/settings`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Manage
                    </Link>
                  }
                />
                {!project.members || project.members.length === 0 ? (
                  <EmptyState emoji="👥" title="No members yet" />
                ) : (
                  <ul className="space-y-3">
                    {project.members.map((m) => (
                      <li key={m.id} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white">
                          {m.user.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800">{m.user.name}</p>
                          <p className="truncate text-xs text-gray-400">{m.user.email}</p>
                        </div>
                        <Badge className={roleBadge[m.role] ?? roleBadge.MEMBER}>{m.role}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
