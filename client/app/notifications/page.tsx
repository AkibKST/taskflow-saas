"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SOCKET_EVENTS } from "@taskflow/shared";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import AppHeader from "@/components/layout/AppHeader";
import { Card, EmptyState } from "@/components/ui";
import { parseApiError } from "@/lib/apiError";
import { showToast } from "@/store/toastStore";
import { btnGhost, cx, pageBg } from "@/lib/ui";

interface Notification {
  id: string;
  type: string;
  message: string;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

/* type → emoji icon, matching the backend NotificationType enum */
const TYPE_ICON: Record<string, string> = {
  TASK_ASSIGNED: "📌",
  TASK_COMMENTED: "💬",
  DUE_SOON: "⏰",
  MENTIONED: "@",
  MEMBER_JOINED: "👋",
};

/* compact relative time, e.g. "3h ago" */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<Notification[]>("/notifications")
      .then((res) => {
        if (active) setItems(res.data);
      })
      .catch((err) => {
        if (active) setError(parseApiError(err).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Live updates — new notifications arrive on the user's private socket room.
  useEffect(() => {
    const socket = getSocket();
    const handler = (n: Notification) =>
      setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handler);
    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handler);
    };
  }, []);

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);
  const visible = filter === "unread" ? items.filter((n) => !n.isRead) : items;

  const markOne = async (id: string) => {
    const target = items.find((n) => n.id === id);
    if (!target || target.isRead) return;
    // optimistic
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
      showToast(parseApiError(err).message, "error");
    }
  };

  const markAll = async () => {
    if (unreadCount === 0) return;
    setMarking(true);
    const snapshot = items;
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.patch("/notifications/read-all");
      showToast("All notifications marked as read", "success");
    } catch (err) {
      setItems(snapshot);
      showToast(parseApiError(err).message, "error");
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="mt-1 text-sm text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
            </p>
          </div>
          <button
            onClick={markAll}
            disabled={unreadCount === 0 || marking}
            className={cx(btnGhost, "!px-4 !py-2")}
          >
            Mark all as read
          </button>
        </div>

        {/* filter tabs */}
        <div className="mb-4 inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-gray-100">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cx(
                "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                filter === f ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-800",
              )}
            >
              {f}
              {f === "unread" && unreadCount > 0 && ` (${unreadCount})`}
            </button>
          ))}
        </div>

        <Card className="!p-0">
          {loading ? (
            <div className="space-y-1 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-2xl shimmer" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6">
              <EmptyState emoji="⚠️" title="Couldn't load notifications" hint={error} />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              emoji="🔔"
              title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
              hint="Activity on your projects and tasks will show up here."
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {visible.map((n) => {
                const body = (
                  <div className="flex items-start gap-3 px-5 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-base">
                      {TYPE_ICON[n.type] ?? "🔔"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cx("text-sm", n.isRead ? "text-gray-600" : "font-semibold text-gray-900")}>
                        {n.message}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                  </div>
                );

                return (
                  <li
                    key={n.id}
                    onClick={() => markOne(n.id)}
                    className={cx(
                      "cursor-pointer transition-colors hover:bg-gray-50",
                      !n.isRead && "bg-brand-50/40",
                    )}
                  >
                    {n.linkUrl ? (
                      <Link href={n.linkUrl} className="block">
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
