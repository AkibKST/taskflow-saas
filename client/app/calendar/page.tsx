"use client";
/**
 * Calendar — every task with a due date, laid out on a month grid.
 *
 * Reads the existing tasks API (no dedicated endpoint): load the tenant's
 * projects, fan out to each project's tasks, flatten them with their project
 * label, then bucket by local due date. Mirrors the data-loading shape of
 * /my-tasks so the two views stay consistent.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import AppHeader from "@/components/layout/AppHeader";
import { Card, EmptyState } from "@/components/ui";
import { cx, pageBg, priorityBadge } from "@/lib/ui";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  project?: { id: string; name: string };
}

interface Project {
  id: string;
  name: string;
  color?: string | null;
}

const STATUSES = ["ALL", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Stable local-date key (avoids UTC drift from toISOString). */
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);

/** Priority → dot color, reusing the badge palette's hue. */
const priorityDot: Record<string, string> = {
  LOW: "bg-gray-400",
  MEDIUM: "bg-sky-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-rose-500",
};

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  // First day of the month currently in view.
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    let active = true;
    api
      .get<Project[]>("/projects")
      .then(async (projRes) => {
        if (!active) return;
        const projs = projRes.data as unknown as Project[];
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
        if (active) setTasks(all);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const scheduled = useMemo(
    () =>
      tasks.filter(
        (t) => t.dueDate && (statusFilter === "ALL" || t.status === statusFilter),
      ),
    [tasks, statusFilter],
  );

  const unscheduledCount = tasks.filter((t) => !t.dueDate).length;

  // due-date key → tasks on that day.
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of scheduled) {
      const key = dayKey(new Date(t.dueDate as string));
      (map.get(key) ?? map.set(key, []).get(key)!).push(t);
    }
    return map;
  }, [scheduled]);

  // 6×7 grid starting from the Sunday on/before the 1st.
  const cells = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(1 - start.getDay());
    return [...Array(42)].map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const today = new Date();
  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  const goToday = () =>
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));

  const navBtn =
    "rounded-full px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800";

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="mt-1 text-sm text-gray-500">
              Tasks across all projects, by due date
            </p>
          </div>
          <select
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-400 sm:w-44"
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

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{monthLabel}</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => shiftMonth(-1)} className={navBtn} aria-label="Previous month">
                ‹ Prev
              </button>
              <button onClick={goToday} className={navBtn}>
                Today
              </button>
              <button onClick={() => shiftMonth(1)} className={navBtn} aria-label="Next month">
                Next ›
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {[...Array(42)].map((_, i) => (
                <div key={i} className="h-24 rounded-lg shimmer" />
              ))}
            </div>
          ) : scheduled.length === 0 ? (
            <EmptyState
              emoji="🗓️"
              title={statusFilter !== "ALL" ? "No matching tasks with due dates" : "No tasks with due dates yet"}
              hint="Tasks with a due date show up here on the day they're due."
            />
          ) : (
            <>
              <div className="mb-1 grid grid-cols-7 gap-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="px-1 py-1 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day) => {
                  const inMonth = day.getMonth() === cursor.getMonth();
                  const isToday = sameDay(day, today);
                  const dayTasks = tasksByDay.get(dayKey(day)) ?? [];
                  return (
                    <div
                      key={day.toISOString()}
                      className={cx(
                        "flex min-h-24 flex-col gap-1 rounded-lg border p-1.5",
                        inMonth ? "border-gray-100 bg-white" : "border-transparent bg-gray-50/60",
                        isToday && "ring-2 ring-brand-400",
                      )}
                    >
                      <span
                        className={cx(
                          "text-xs font-semibold",
                          isToday
                            ? "text-brand-600"
                            : inMonth
                              ? "text-gray-600"
                              : "text-gray-300",
                        )}
                      >
                        {day.getDate()}
                      </span>
                      <div className="flex flex-col gap-1">
                        {dayTasks.slice(0, 3).map((t) => {
                          const overdue =
                            new Date(t.dueDate as string) < today && t.status !== "DONE";
                          return (
                            <Link
                              key={t.id}
                              href={`/projects/${t.project?.id}/tasks/${t.id}`}
                              title={`${t.title} · ${t.project?.name ?? ""}`}
                              className={cx(
                                "flex items-center gap-1 truncate rounded-md px-1.5 py-1 text-xs transition-colors",
                                t.status === "DONE"
                                  ? "bg-gray-50 text-gray-500 line-through hover:bg-gray-100"
                                  : overdue
                                    ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                                    : "bg-gray-50 text-gray-700 hover:bg-brand-50 hover:text-brand-700",
                              )}
                            >
                              <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", priorityDot[t.priority] ?? priorityDot.MEDIUM)} />
                              <span className="truncate">{t.title}</span>
                            </Link>
                          );
                        })}
                        {dayTasks.length > 3 && (
                          <span className="px-1.5 text-[11px] text-gray-500">
                            +{dayTasks.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!loading && unscheduledCount > 0 && (
            <p className="mt-4 text-xs text-gray-500">
              {unscheduledCount} task{unscheduledCount !== 1 ? "s" : ""} without a due date{" "}
              {unscheduledCount !== 1 ? "are" : "is"} not shown.
            </p>
          )}
        </Card>

        {/* Priority legend — mirrors the dot colors above. */}
        {!loading && scheduled.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-4 px-1 text-xs text-gray-500">
            {Object.keys(priorityBadge).map((p) => (
              <span key={p} className="flex items-center gap-1.5">
                <span className={cx("h-1.5 w-1.5 rounded-full", priorityDot[p])} />
                {p}
              </span>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
