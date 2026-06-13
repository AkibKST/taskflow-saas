"use client";
/**
 * Shared top navigation bar for the authenticated app (dashboard, projects,
 * notifications, settings…). Keeps the glassy header, notification bell with a
 * live unread badge, profile chip and logout in one place so every page stays
 * visually consistent with the login / dashboard theme.
 */
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { SOCKET_EVENTS } from "@taskflow/shared";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/authStore";
import { Badge, IconBadge } from "@/components/ui";
import { btnGhost, cx, roleBadge } from "@/lib/ui";

interface Notification {
  id: string;
  isRead: boolean;
}

const checkIcon = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const bellIcon = (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a2 2 0 0 0 3.4 0" />
  </svg>
);

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const [unread, setUnread] = useState(0);

  const role = (user?.role ?? "MEMBER").toUpperCase();

  useEffect(() => {
    let active = true;
    api
      .get<Notification[]>("/notifications")
      .then((res) => {
        if (active) setUnread(res.data.filter((n) => !n.isRead).length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  // Live badge — bump the count when a new notification arrives over the socket.
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

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={cx(
        "hidden rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:inline-block",
        pathname.startsWith(href)
          ? "bg-brand-50 text-brand-700"
          : "text-gray-500 hover:text-gray-800",
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <IconBadge>{checkIcon}</IconBadge>
          <span className="text-lg font-bold text-gray-900">TaskFlow</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLink("/dashboard", "Dashboard")}
          {navLink("/projects", "Projects")}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/notifications"
            className="relative text-gray-400 transition-colors hover:text-gray-600"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          >
            {bellIcon}
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
  );
}
