"use client";
/**
 * Shared top navigation bar for the authenticated app (dashboard, projects,
 * tasks, team, settings, admin…). Keeps the glassy header, primary nav, a
 * notification bell with a live unread badge, and a profile menu (which also
 * exposes the nav + role-gated admin links on small screens) in one place so
 * every page stays visually consistent and fully reachable.
 *
 * It also acts as the client-side auth gate: once the persisted auth state has
 * rehydrated, a missing user means there's no session, so we redirect to /login.
 */
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { SOCKET_EVENTS } from "@taskflow/shared";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/authStore";
import { Badge, IconBadge } from "@/components/ui";
import GlobalSearch from "@/components/layout/GlobalSearch";
import { btnGhost, cx, roleBadge } from "@/lib/ui";

interface Notification {
  id: string;
  isRead: boolean;
}

/** Primary nav — visible to every authenticated role. */
const NAV: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/my-tasks", label: "My Tasks" },
  { href: "/calendar", label: "Calendar" },
  { href: "/team", label: "Team" },
];

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

const chevronIcon = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth, hasHydrated } = useAuthStore();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const role = (user?.role ?? "MEMBER").toUpperCase();
  const isAdmin = role === "OWNER" || role === "ADMIN";
  const isOwner = role === "OWNER";

  // Auth gate — once persisted state has rehydrated, no user means no session.
  useEffect(() => {
    if (hasHydrated && !user) router.replace("/login");
  }, [hasHydrated, user, router]);

  useEffect(() => {
    let active = true;
    api
      .get<Notification[]>("/notifications")
      .then((res) => {
        if (!active) return;
        // Prefer the server's tenant-wide unread count (meta); fall back to
        // counting the returned page if meta is absent.
        const meta = (res as { meta?: { unread?: number } }).meta;
        setUnread(meta?.unread ?? res.data.filter((n) => !n.isRead).length);
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

  // Close the profile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await api.post("/auth/logout").catch(() => {});
    clearAuth();
    router.push("/login");
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const navLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={cx(
        "hidden rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:inline-block",
        isActive(href) ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:text-gray-800",
      )}
    >
      {label}
    </Link>
  );

  const menuItem = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      role="menuitem"
      className={cx(
        "block rounded-lg px-3 py-2 text-sm transition-colors",
        isActive(href) ? "bg-brand-50 font-medium text-brand-700" : "text-gray-700 hover:bg-gray-50",
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
          {NAV.map((n) => navLink(n.href, n.label))}
          {isAdmin && navLink("/admin/users", "Admin")}
        </nav>

        <div className="flex items-center gap-3">
          <GlobalSearch />
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

          {/* Profile menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-gray-100"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white">
                {(user?.name ?? "U").charAt(0).toUpperCase()}
              </span>
              <div className="hidden pr-1 text-left sm:block">
                <p className="text-sm font-semibold leading-tight text-gray-800">{user?.name}</p>
                <Badge className={roleBadge[role] ?? roleBadge.MEMBER}>{role}</Badge>
              </div>
              <span className="hidden text-gray-400 sm:block">{chevronIcon}</span>
            </button>

            {menuOpen && (
              <>
                {/* click-away backdrop */}
                <button
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl bg-white p-2 shadow-xl ring-1 ring-gray-100"
                >
                  {/* identity (mobile, where the chip text is hidden) */}
                  <div className="border-b border-gray-100 px-3 pb-2 pt-1 sm:hidden">
                    <p className="truncate text-sm font-semibold text-gray-800">{user?.name}</p>
                    <p className="truncate text-xs text-gray-400">{user?.email}</p>
                  </div>

                  {/* primary nav — only needed on small screens */}
                  <div className="sm:hidden">
                    {NAV.map((n) => menuItem(n.href, n.label))}
                    <div className="my-1 border-t border-gray-100" />
                  </div>

                  {menuItem("/profile", "Profile")}
                  {menuItem("/settings", "Account settings")}
                  {menuItem("/notifications", "Notifications")}

                  {isAdmin && (
                    <>
                      <div className="my-1 border-t border-gray-100" />
                      <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Admin
                      </p>
                      {menuItem("/admin/users", "User management")}
                      {menuItem("/admin/workspace", "Workspace settings")}
                      {isOwner && menuItem("/admin/billing", "Billing")}
                    </>
                  )}

                  <div className="my-1 border-t border-gray-100" />
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>

          <button onClick={handleLogout} className={cx(btnGhost, "hidden !px-4 !py-2 sm:inline-flex")}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
