"use client";
import { useEffect, useState, FormEvent } from "react";
import { api } from "@/lib/api";
import AppHeader from "@/components/layout/AppHeader";
import { Card, Badge, EmptyState, SectionHeader } from "@/components/ui";
import { cx, pageBg, roleBadge } from "@/lib/ui";
import { useAuthStore } from "@/store/authStore";
import { ROLES } from "@taskflow/shared";

interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  invitedBy?: { name: string };
}

const ROLE_VALUES = [ROLES.MEMBER, ROLES.MANAGER, ROLES.ADMIN];

export default function TeamPage() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Invite form + pending-invite state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>(ROLES.MEMBER);
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, setPending] = useState<PendingInvite[]>([]);

  const currentRole = (user?.role ?? "MEMBER").toUpperCase();
  const canInvite = currentRole === "OWNER" || currentRole === "ADMIN";

  const loadInvites = () => {
    if (!canInvite) return;
    api
      .get<PendingInvite[]>("/invite")
      .then((res) => setPending(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    let active = true;
    api
      .get<TenantUser[]>("/users")
      .then((res) => active && setMembers(res.data))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    loadInvites();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevoke = async (id: string) => {
    try {
      await api.delete(`/invite/${id}`);
      setPending((p) => p.filter((i) => i.id !== id));
    } catch {
      /* ignore */
    }
  };

  const handleResend = async (id: string) => {
    try {
      await api.post(`/invite/${id}/resend`);
      setInviteMsg({ type: "ok", text: "Invite re-sent" });
      loadInvites();
    } catch (err: any) {
      setInviteMsg({ type: "err", text: err.message || "Failed to resend" });
    }
  };

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  );

  const roleOrder = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"];
  const sorted = [...filtered].sort(
    (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role),
  );

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    try {
      await api.post("/invite", { email: inviteEmail, role: inviteRole });
      setInviteMsg({ type: "ok", text: `Invite sent to ${inviteEmail}` });
      setInviteEmail("");
      setInviteRole(ROLES.MEMBER);
      loadInvites();
    } catch (err: any) {
      setInviteMsg({ type: "err", text: err.message || "Failed to send invite" });
    } finally {
      setInviting(false);
    }
  };

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
          {canInvite && (
            <button
              onClick={() => { setShowInvite((v) => !v); setInviteMsg(null); }}
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {showInvite ? "Cancel" : "+ Invite member"}
            </button>
          )}
        </div>

        {/* Invite form */}
        {showInvite && canInvite && (
          <Card className="mb-6">
            <SectionHeader title="Invite a new member" />
            <form onSubmit={handleInvite} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                >
                  {ROLE_VALUES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={inviting}
                className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {inviting ? "Sending…" : "Send invite"}
              </button>
            </form>
            {inviteMsg && (
              <p className={`mt-3 text-sm ${inviteMsg.type === "ok" ? "text-green-600" : "text-red-500"}`}>
                {inviteMsg.text}
              </p>
            )}
          </Card>
        )}

        {/* Pending invites */}
        {canInvite && pending.length > 0 && (
          <Card className="mb-6">
            <SectionHeader title={`Pending invites (${pending.length})`} />
            <ul className="mt-2 divide-y divide-gray-100">
              {pending.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm">
                    ✉️
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{inv.email}</p>
                    <p className="truncate text-xs text-gray-500">
                      Invited as {inv.role} · expires{" "}
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResend(inv.id)}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Resend
                  </button>
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

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
                        <span className="ml-2 text-xs font-normal text-gray-500">(you)</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-gray-500">{m.email}</p>
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
