"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import AppHeader from "@/components/layout/AppHeader";
import { Card, Badge, EmptyState, SectionHeader } from "@/components/ui";
import { cx, pageBg, roleBadge } from "@/lib/ui";
import { useAuthStore } from "@/store/authStore";

interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function TeamPage() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get<TenantUser[]>("/users")
      .then((res) => active && setMembers(res.data))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  );

  const roleOrder = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"];
  const sorted = [...filtered].sort(
    (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role),
  );

  const role = (user?.role ?? "MEMBER").toUpperCase();
  const isAdmin = role === "OWNER" || role === "ADMIN";

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team</h1>
            <p className="mt-1 text-sm text-gray-500">
              {members.length} member{members.length !== 1 ? "s" : ""} in your workspace
            </p>
          </div>
          {isAdmin && (
            <a
              href="/admin/users"
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Manage users
            </a>
          )}
        </div>

        <Card>
          <SectionHeader title="Members" />

          <div className="mb-4">
            <input
              type="search"
              placeholder="Search by name or email…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl shimmer" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState
              emoji="👥"
              title={search ? "No matches" : "No members yet"}
              hint={search ? "Try a different search term." : undefined}
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {sorted.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {m.name}
                      {m.id === user?.id && (
                        <span className="ml-2 text-xs font-normal text-gray-400">(you)</span>
                      )}
                    </p>
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
      </main>
    </div>
  );
}
