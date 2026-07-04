"use client";
import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DEFAULT_PROJECT_COLOR } from "@taskflow/shared";
import { api } from "@/lib/api";
import AppHeader from "@/components/layout/AppHeader";
import { Card, Badge, EmptyState, SectionHeader } from "@/components/ui";
import { parseApiError } from "@/lib/apiError";
import { showToast } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
import {
  btnPrimary,
  btnGhost,
  cx,
  pageBg,
  projectStatusBadge,
  roleBadge,
} from "@/lib/ui";

interface Member {
  id: string;
  role: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  status: string;
  members?: Member[];
}

const PROJECT_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];
const PROJECT_ROLES = ["MANAGER", "MEMBER", "VIEWER"];

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30";

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const role = (user?.role ?? "MEMBER").toUpperCase();
  const canManage = ["OWNER", "ADMIN", "MANAGER"].includes(role);

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // edit form
  const [form, setForm] = useState({ name: "", description: "", color: DEFAULT_PROJECT_COLOR, status: "ACTIVE" });
  const [saving, setSaving] = useState(false);

  // add member form
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [newMember, setNewMember] = useState({ userId: "", role: "MEMBER" });
  const [adding, setAdding] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let active = true;
    // listProjects includes members + counts; getProject does not, so we
    // source the full record (with members) from the list endpoint.
    api
      .get<Project[]>("/projects")
      .then((res) => {
        if (!active) return;
        const found = res.data.find((p) => p.id === projectId) ?? null;
        if (!found) {
          setLoadError("Project not found.");
          return;
        }
        setProject(found);
        setMembers(found.members ?? []);
        setForm({
          name: found.name ?? "",
          description: found.description ?? "",
          color: found.color ?? DEFAULT_PROJECT_COLOR,
          status: found.status ?? "ACTIVE",
        });
      })
      .catch((err) => active && setLoadError(parseApiError(err).message))
      .finally(() => active && setLoading(false));

    // Tenant users for the member picker (best-effort — fails silently).
    if (canManage) {
      api
        .get<TenantUser[]>("/users")
        .then((res) => active && setUsers(res.data))
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [projectId, canManage]);

  // Users not already on the project — candidates for the add-member picker.
  const availableUsers = users.filter(
    (u) => !members.some((m) => m.userId === u.id),
  );

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch<Project>(`/projects/${projectId}`, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: form.color,
        status: form.status,
      });
      setProject((p) => (p ? { ...p, ...res.data } : res.data));
      showToast("Project updated", "success");
    } catch (err) {
      showToast(parseApiError(err).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMember.userId.trim()) return;
    setAdding(true);
    try {
      const res = await api.post<Member>(`/projects/${projectId}/members`, {
        userId: newMember.userId.trim(),
        role: newMember.role,
      });
      setMembers((m) => [...m, res.data]);
      setNewMember({ userId: "", role: "MEMBER" });
      showToast("Member added", "success");
    } catch (err) {
      showToast(parseApiError(err).message, "error");
    } finally {
      setAdding(false);
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    const snapshot = members;
    setMembers((m) => m.map((x) => (x.userId === userId ? { ...x, role } : x)));
    try {
      // POST upserts the membership — reusing it to change an existing role.
      await api.post(`/projects/${projectId}/members`, { userId, role });
      showToast("Role updated", "success");
    } catch (err) {
      setMembers(snapshot);
      showToast(parseApiError(err).message, "error");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const snapshot = members;
    setMembers((m) => m.filter((x) => x.userId !== userId));
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      showToast("Member removed", "success");
    } catch (err) {
      setMembers(snapshot);
      showToast(parseApiError(err).message, "error");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/projects/${projectId}`);
      showToast("Project deleted", "success");
      router.push("/projects");
    } catch (err) {
      showToast(parseApiError(err).message, "error");
      setDeleting(false);
    }
  };

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href={`/projects/${projectId}/tasks`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to board
        </Link>

        {loading ? (
          <div className="mt-4 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-3xl shimmer" />
            ))}
          </div>
        ) : loadError ? (
          <Card className="mt-4">
            <EmptyState emoji="⚠️" title="Couldn't load project" hint={loadError} />
          </Card>
        ) : (
          <>
            <div className="mb-6 mt-3 flex items-center gap-3">
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: project?.color ?? DEFAULT_PROJECT_COLOR }} />
              <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
              <Badge className={projectStatusBadge[project?.status ?? "ACTIVE"]}>
                {project?.status?.replace("_", " ")}
              </Badge>
            </div>

            {/* ---------------- General settings ---------------- */}
            <Card className="mb-6">
              <SectionHeader title="General" />
              {!canManage && (
                <p className="mb-4 rounded-xl bg-gray-50 px-4 py-2 text-sm text-gray-500">
                  You have read-only access to this project.
                </p>
              )}
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600">Name</label>
                  <input
                    className={inputClass}
                    value={form.name}
                    disabled={!canManage}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600">Description</label>
                  <textarea
                    className={cx(inputClass, "min-h-[80px] resize-y")}
                    value={form.description}
                    disabled={!canManage}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What is this project about?"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-600">Status</label>
                    <select
                      className={inputClass}
                      value={form.status}
                      disabled={!canManage}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      {PROJECT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-600">Color</label>
                    <input
                      type="color"
                      className="h-10 w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-1"
                      value={form.color}
                      disabled={!canManage}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                    />
                  </div>
                </div>
                {canManage && (
                  <button type="submit" disabled={saving} className={btnPrimary}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                )}
              </form>
            </Card>

            {/* ---------------- Members ---------------- */}
            <Card className="mb-6">
              <SectionHeader title={`Members (${members.length})`} />

              {members.length === 0 ? (
                <EmptyState emoji="👥" title="No members yet" />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 py-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white">
                        {m.user.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{m.user.name}</p>
                        <p className="truncate text-xs text-gray-500">{m.user.email}</p>
                      </div>
                      {canManage ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleChangeRole(m.userId, e.target.value)}
                          className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 outline-none focus:border-brand-400"
                          aria-label={`Role for ${m.user.name}`}
                        >
                          {PROJECT_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge className={roleBadge[m.role] ?? roleBadge.MEMBER}>{m.role}</Badge>
                      )}
                      {canManage && (
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          className="ml-1 text-gray-300 transition-colors hover:text-rose-500"
                          aria-label={`Remove ${m.user.name}`}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {canManage && (
                <form onSubmit={handleAddMember} className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row">
                  <select
                    className={cx(inputClass, "flex-1")}
                    value={newMember.userId}
                    onChange={(e) => setNewMember({ ...newMember, userId: e.target.value })}
                  >
                    <option value="">
                      {availableUsers.length ? "Select a teammate…" : "No teammates available"}
                    </option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                  <select
                    className={cx(inputClass, "sm:w-36")}
                    value={newMember.role}
                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  >
                    {PROJECT_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button type="submit" disabled={adding || !newMember.userId} className={cx(btnPrimary, "shrink-0")}>
                    {adding ? "Adding…" : "Add"}
                  </button>
                </form>
              )}
            </Card>

            {/* ---------------- Danger zone ---------------- */}
            {canManage && (
              <Card className="border border-rose-100 !ring-rose-100">
                <SectionHeader title="Danger zone" />
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <p className="text-sm text-gray-500">
                    Deleting a project hides it and all its tasks. This cannot be undone from the UI.
                  </p>
                  {confirmDelete ? (
                    <div className="flex shrink-0 gap-2">
                      <button onClick={handleDelete} disabled={deleting} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                        {deleting ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button onClick={() => setConfirmDelete(false)} className={cx(btnGhost, "!px-4 !py-2")}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)} className="shrink-0 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                      Delete project
                    </button>
                  )}
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
