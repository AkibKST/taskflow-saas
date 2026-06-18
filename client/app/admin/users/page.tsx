"use client";
import { useEffect, useState } from "react";
import { ROLES } from "@taskflow/shared";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { showToast } from "@/store/toastStore";
import AppHeader from "@/components/layout/AppHeader";
import { Card, Badge, EmptyState, SectionHeader } from "@/components/ui";
import { cx, pageBg, roleBadge } from "@/lib/ui";

interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  emailVerifiedAt?: string | null;
  createdAt?: string;
}

const ALL_ROLES = Object.values(ROLES);

export default function AdminUsersPage() {
  const { user } = useAuthStore();
  const role = (user?.role ?? "MEMBER").toUpperCase();
  const isAdmin = role === "OWNER" || role === "ADMIN";
  const isOwner = role === "OWNER";

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    api
      .get<TenantUser[]>("/users/manage")
      .then((res) => setUsers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className={cx("min-h-screen", pageBg)}>
        <AppHeader />
        <main className="mx-auto max-w-4xl px-6 py-8">
          <Card>
            <EmptyState emoji="🔒" title="Access denied" hint="Only Owners and Admins can manage users." />
          </Card>
        </main>
      </div>
    );
  }

  // Mirrors the backend guard: admins can't touch owners/admins; nobody edits self.
  const canManage = (u: TenantUser) =>
    u.id !== user?.id && (isOwner || (u.role !== "OWNER" && u.role !== "ADMIN"));

  // Admins can't assign OWNER/ADMIN.
  const roleOptions = isOwner ? ALL_ROLES : ALL_ROLES.filter((r) => r !== "OWNER" && r !== "ADMIN");

  const applyUpdate = (updated: TenantUser) =>
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

  const handleRoleChange = async (u: TenantUser, newRole: string) => {
    if (newRole === u.role) return;
    setBusyId(u.id);
    try {
      const res = await api.patch<TenantUser>(`/users/${u.id}/role`, { role: newRole });
      applyUpdate(res.data);
      showToast(`${u.name} is now ${newRole}`, "success");
    } catch (err) {
      showToast((err as Error)?.message || "Couldn't change role", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleStatus = async (u: TenantUser) => {
    setBusyId(u.id);
    try {
      const res = await api.patch<TenantUser>(`/users/${u.id}/status`, { isActive: !u.isActive });
      applyUpdate(res.data);
      showToast(res.data.isActive ? `${u.name} activated` : `${u.name} deactivated`, "success");
    } catch (err) {
      showToast((err as Error)?.message || "Couldn't update status", "error");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User management</h1>
            <p className="mt-1 text-sm text-gray-500">{users.length} users in this workspace</p>
          </div>
        </div>

        <Card>
          <SectionHeader title="All users" />

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
          ) : filtered.length === 0 ? (
            <EmptyState emoji="👥" title="No users found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <th className="pb-3 pr-4">User</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Joined</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((u) => {
                    const manageable = canManage(u);
                    const busy = busyId === u.id;
                    return (
                      <tr key={u.id} className={cx("group", !u.isActive && "opacity-60")}>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white">
                              {u.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-800">
                                {u.name}
                                {u.id === user?.id && (
                                  <span className="ml-1 text-xs font-normal text-gray-400">(you)</span>
                                )}
                              </p>
                              <p className="truncate text-xs text-gray-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {manageable ? (
                            <select
                              value={u.role}
                              disabled={busy}
                              onChange={(e) => handleRoleChange(u, e.target.value)}
                              className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-700 outline-none focus:border-brand-400 disabled:opacity-50"
                            >
                              {/* Keep the user's current role selectable even if it's outside the actor's assignable set. */}
                              {Array.from(new Set([u.role, ...roleOptions])).map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          ) : (
                            <Badge className={roleBadge[u.role?.toUpperCase()] ?? roleBadge.MEMBER}>
                              {u.role}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge className={u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}>
                            {u.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-gray-400">{fmt(u.createdAt)}</td>
                        <td className="py-3 text-right">
                          {manageable ? (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={busy}
                              className={cx(
                                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                                u.isActive
                                  ? "text-rose-600 hover:bg-rose-50"
                                  : "text-emerald-600 hover:bg-emerald-50",
                              )}
                            >
                              {busy ? "…" : u.isActive ? "Deactivate" : "Activate"}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
