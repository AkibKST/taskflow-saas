"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SOCKET_EVENTS } from "@taskflow/shared";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/authStore";
import { Project } from "@/store/projectStore";
import {
  Badge,
  Card,
  EmptyState,
  IconBadge,
  SectionHeader,
  StatCard,
} from "@/components/ui";
import {
  btnGhost,
  cx,
  pageBg,
  priorityBadge,
  projectStatusBadge,
  roleBadge,
  sectionLabel,
  taskStatusBadge,
} from "@/lib/ui";

/* ----------------------------- types ----------------------------- */
interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  project?: { id: string; name: string };
}
interface DashboardSummary {
  // tenant-wide (OWNER / ADMIN)
  totalUsers?: number;
  activeUsers?: number;
  totalProjects?: number;
  totalTasks?: number;
  // per-user
  myTasks?: Task[];
  recentProjects?: Project[];
  unreadNotifications?: number;
  team?: { id: string; name: string; email: string; role: string }[];
  tasksByStatus?: Record<string, number>;
}

/* --------------------------- tiny icons -------------------------- */
const I = {
  users: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 5a3 3 0 0 1 0 6M21 20c0-2.5-2-4-4-4.5" />
    </svg>
  ),
  folder: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  ),
  check: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  bell: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a2 2 0 0 0 3.4 0" />
    </svg>
  ),
};

const ROLE_GREETING: Record<string, string> = {
  OWNER: "Here's everything happening across your organization.",
  ADMIN: "Manage members, projects and activity across the workspace.",
  MANAGER: "Track your team's projects and workload at a glance.",
  MEMBER: "Here's what's on your plate today.",
  VIEWER: "A read-only overview of the projects you can access.",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({});
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const role = (user?.role ?? "MEMBER").toUpperCase();
  const isAdmin = role === "OWNER" || role === "ADMIN";
  const isManager = role === "MANAGER";

  useEffect(() => {
    let active = true;
    (async () => {
      // Projects endpoint exists; summary is best-effort (graceful fallback).
      const [projRes, sumRes, notifRes] = await Promise.allSettled([
        api.get<Project[]>("/projects"),
        api.get<DashboardSummary>("/dashboard/summary"),
        api.get<{ isRead: boolean }[]>("/notifications"),
      ]);
      if (!active) return;
      if (projRes.status === "fulfilled") setProjects(projRes.value.data);
      if (sumRes.status === "fulfilled") setSummary(sumRes.value.data);
      if (notifRes.status === "fulfilled")
        setUnread(notifRes.value.data.filter((n) => !n.isRead).length);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Live notification badge over the user's private socket room.
  useEffect(() => {
    const socket = getSocket();
    const handler = () => setUnread((u) => u + 1);
    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handler);
    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handler);
    };
  }, []);

  const handleLogout = async () => {
    await api.post("/auth/logout").catch(() => {});
    clearAuth();
    router.push("/login");
  };

  // Derive stats from whatever data we have (summary preferred, else projects).
  const stats = useMemo(() => {
    const totalProjects = summary.totalProjects ?? projects.length;
    const totalTasks =
      summary.totalTasks ??
      projects.reduce((n, p) => n + (p._count?.tasks ?? 0), 0);
    const myOpenTasks = (summary.myTasks ?? []).filter(
      (t) => t.status !== "DONE",
    ).length;
    return { totalProjects, totalTasks, myOpenTasks };
  }, [summary, projects]);

  const myTasks = summary.myTasks ?? [];

  return (
    <div className={cx("min-h-screen", pageBg)}>
      {/* ----------------------------- header ----------------------------- */}
      <header className="sticky top-0 z-10 border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <IconBadge>{I.check}</IconBadge>
            <span className="text-lg font-bold text-gray-900">TaskFlow</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/notifications" className="relative text-gray-400 hover:text-gray-600" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
              {I.bell}
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <Link href="/profile" className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-gray-100">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white">
                {(user?.name ?? "U").charAt(0).toUpperCase()}
              </span>
              <div className="hidden pr-2 sm:block">
                <p className="text-sm font-semibold leading-tight text-gray-800">{user?.name}</p>
                <Badge className={roleBadge[role] ?? roleBadge.MEMBER}>{role}</Badge>
              </div>
            </Link>
            <button onClick={handleLogout} className={cx(btnGhost, "!px-4 !py-2")}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* ----------------------------- greeting ----------------------------- */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {ROLE_GREETING[role] ?? ROLE_GREETING.MEMBER}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-3xl shimmer" />
            ))}
          </div>
        ) : (
          <>
            {/* ----------------------------- stat cards ----------------------------- */}
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {isAdmin && (
                <StatCard
                  label="Members"
                  value={summary.totalUsers ?? "—"}
                  hint={summary.activeUsers ? `${summary.activeUsers} active` : undefined}
                  icon={I.users}
                />
              )}
              <StatCard label="Projects" value={stats.totalProjects} icon={I.folder} />
              <StatCard label="Tasks" value={stats.totalTasks} icon={I.check} />
              <StatCard
                label={isAdmin ? "Open tasks" : "My open tasks"}
                value={isAdmin ? stats.totalTasks : stats.myOpenTasks}
                icon={I.check}
              />
              {!isAdmin && (
                <StatCard
                  label="Notifications"
                  value={unread}
                  hint="unread"
                  icon={I.bell}
                />
              )}
            </section>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* ----------------------------- main column ----------------------------- */}
              <div className="space-y-6 lg:col-span-2">
                {/* My tasks — relevant to MEMBER / MANAGER / VIEWER */}
                {role !== "OWNER" && role !== "ADMIN" && (
                  <Card>
                    <SectionHeader
                      title="My tasks"
                      action={
                        <Link href="/projects" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                          View all
                        </Link>
                      }
                    />
                    {myTasks.length === 0 ? (
                      <EmptyState emoji="✅" title="No tasks assigned" hint="You're all caught up." />
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {myTasks.slice(0, 6).map((t) => (
                          <li key={t.id} className="flex items-center gap-3 py-3">
                            <span className={cx("h-2 w-2 shrink-0 rounded-full", t.status === "DONE" ? "bg-emerald-400" : "bg-brand-400")} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-800">{t.title}</p>
                              {t.project && <p className="truncate text-xs text-gray-400">{t.project.name}</p>}
                            </div>
                            <Badge className={priorityBadge[t.priority] ?? priorityBadge.MEDIUM}>{t.priority}</Badge>
                            <Badge className={taskStatusBadge[t.status] ?? taskStatusBadge.TODO}>
                              {t.status.replace("_", " ")}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                )}

                {/* Projects overview — everyone */}
                <Card>
                  <SectionHeader
                    title={isAdmin || isManager ? "All projects" : "My projects"}
                    action={
                      <Link href="/projects" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                        Manage
                      </Link>
                    }
                  />
                  {projects.length === 0 ? (
                    <EmptyState emoji="📋" title="No projects yet" hint="Create your first project to get started." />
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {projects.slice(0, 6).map((p) => (
                        <Link
                          key={p.id}
                          href={`/projects/${p.id}/tasks`}
                          className="group rounded-2xl border border-gray-100 p-4 transition-shadow hover:shadow-md"
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.color ?? "#6366f1" }} />
                            <h3 className="truncate font-semibold text-gray-900 group-hover:text-brand-600">{p.name}</h3>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {p._count?.tasks ?? 0} tasks · {p.members?.length ?? 0} members
                            </span>
                            <Badge className={projectStatusBadge[p.status] ?? projectStatusBadge.ACTIVE}>
                              {p.status?.replace("_", " ")}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* ----------------------------- side column ----------------------------- */}
              <div className="space-y-6">
                {/* Task status breakdown — MANAGER / ADMIN / OWNER */}
                {(isAdmin || isManager) && (
                  <Card>
                    <SectionHeader title="Task breakdown" />
                    <div className="space-y-3">
                      {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"].map((s) => {
                        const count = summary.tasksByStatus?.[s] ?? 0;
                        const total = stats.totalTasks || 1;
                        return (
                          <div key={s}>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="font-medium text-gray-600">{s.replace("_", " ")}</span>
                              <span className="text-gray-400">{count}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
                                style={{ width: `${Math.round((count / total) * 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* Team / members — OWNER / ADMIN / MANAGER */}
                {(isAdmin || isManager) && (
                  <Card>
                    <SectionHeader
                      title="Team"
                      action={
                        isAdmin ? (
                          <Link href="/members" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                            Manage
                          </Link>
                        ) : undefined
                      }
                    />
                    {!summary.team || summary.team.length === 0 ? (
                      <EmptyState emoji="👥" title="No members to show" />
                    ) : (
                      <ul className="space-y-3">
                        {summary.team.slice(0, 6).map((m) => (
                          <li key={m.id} className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white">
                              {m.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-800">{m.name}</p>
                              <p className="truncate text-xs text-gray-400">{m.email}</p>
                            </div>
                            <Badge className={roleBadge[m.role?.toUpperCase()] ?? roleBadge.MEMBER}>
                              {m.role}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                )}

                {/* Read-only notice for viewers */}
                {role === "VIEWER" && (
                  <Card className="!bg-gradient-to-br !from-brand-50 !to-white">
                    <p className={sectionLabel}>Read-only access</p>
                    <p className="mt-2 text-sm text-gray-600">
                      You can view projects and tasks but can&apos;t make changes.
                      Contact an admin to request edit access.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
