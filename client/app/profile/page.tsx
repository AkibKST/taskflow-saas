"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import AppHeader from "@/components/layout/AppHeader";
import { Badge, Card, IconBadge, SectionHeader } from "@/components/ui";
import { btnGhost, btnPrimary, cx, pageBg, roleBadge, sectionLabel } from "@/lib/ui";

/* ----------------------------- types ----------------------------- */
interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  isActive?: boolean;
  createdAt?: string;
  tenant?: { id: string; name: string; slug: string };
}

/* ------------------- role → human description ------------------- */
const ROLE_INFO: Record<string, { label: string; blurb: string; can: string[] }> = {
  OWNER: {
    label: "Owner",
    blurb: "Full control over the entire workspace, billing and members.",
    can: ["Manage billing & workspace", "Add / remove any member", "Create & delete projects", "Full task access"],
  },
  ADMIN: {
    label: "Administrator",
    blurb: "Manage members, projects and workspace settings.",
    can: ["Manage members", "Create & delete projects", "Full task access", "Configure settings"],
  },
  MANAGER: {
    label: "Manager",
    blurb: "Lead projects and coordinate the team's workload.",
    can: ["Create & manage projects", "Assign tasks", "Manage project members", "Comment & review"],
  },
  MEMBER: {
    label: "Member",
    blurb: "Collaborate on projects and work assigned tasks.",
    can: ["View assigned projects", "Create & update tasks", "Comment on tasks"],
  },
  VIEWER: {
    label: "Viewer",
    blurb: "Read-only access to projects and tasks.",
    can: ["View projects", "View tasks", "Read comments"],
  },
};

/* ----------------------------- icons ----------------------------- */
const I = {
  mail: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
    </svg>
  ),
  building: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 21v-4h6v4" />
    </svg>
  ),
  shield: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6l8-3Z" /><path d="m9 12 2 2 4-4" />
    </svg>
  ),
  id: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M13 10h5M13 14h5M5 16c.5-1.5 2-2 4-2s3.5.5 4 2" />
    </svg>
  ),
  check: (
    <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l4 4L19 7" />
    </svg>
  ),
};

/* --------------------- single info row helper -------------------- */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <IconBadge>{icon}</IconBadge>
      <div className="min-w-0">
        <p className={sectionLabel}>{label}</p>
        <p className="truncate text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get<Profile>("/auth/me")
      .then((res) => active && setProfile(res.data))
      .catch(() => {
        // Fall back to the cached auth-store user if the request fails.
        if (active && user) setProfile({ ...user, tenantId: "" } as Profile);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user]);

  const role = (profile?.role ?? user?.role ?? "MEMBER").toUpperCase();
  const info = ROLE_INFO[role] ?? ROLE_INFO.MEMBER;

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            <div className="h-40 rounded-3xl shimmer" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-56 rounded-3xl shimmer" />
              <div className="h-56 rounded-3xl shimmer" />
            </div>
          </div>
        ) : (
          <>
            {/* ----------------------- profile banner ----------------------- */}
            <Card className="!p-0 overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-brand-600 to-brand-500" />
              <div className="flex flex-col items-center gap-4 px-6 pb-6 sm:flex-row sm:items-end">
                <span className="-mt-12 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-3xl font-bold text-white ring-4 ring-white">
                  {(profile?.name ?? "U").charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 text-center sm:pb-1 sm:text-left">
                  <h1 className="text-2xl font-bold text-gray-900">{profile?.name}</h1>
                  <p className="text-sm text-gray-500">{profile?.email}</p>
                </div>
                <div className="flex items-center gap-2 sm:pb-1">
                  <Badge className={roleBadge[role] ?? roleBadge.MEMBER}>{info.label}</Badge>
                  {profile?.isActive !== false && (
                    <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                  )}
                </div>
              </div>
            </Card>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* ----------------------- account details ----------------------- */}
              <Card>
                <SectionHeader title="Account details" />
                <div className="divide-y divide-gray-100">
                  <InfoRow icon={I.id} label="Full name" value={profile?.name} />
                  <InfoRow icon={I.mail} label="Email" value={profile?.email} />
                  <InfoRow
                    icon={I.building}
                    label="Workspace"
                    value={profile?.tenant?.name ?? profile?.tenantId ?? "—"}
                  />
                  {profile?.tenant?.slug && (
                    <InfoRow icon={I.building} label="Workspace slug" value={`@${profile.tenant.slug}`} />
                  )}
                  {profile?.createdAt && (
                    <InfoRow
                      icon={I.id}
                      label="Member since"
                      value={new Date(profile.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    />
                  )}
                  <InfoRow icon={I.id} label="User ID" value={<span className="font-mono text-xs">{profile?.id}</span>} />
                </div>
              </Card>

              {/* ------------------------ role & access ------------------------ */}
              <Card>
                <SectionHeader title="Role & access" />
                <div className="mb-4 flex items-start gap-4">
                  <IconBadge>{I.shield}</IconBadge>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{info.label}</p>
                    <p className="mt-0.5 text-sm text-gray-500">{info.blurb}</p>
                  </div>
                </div>
                <p className={cx(sectionLabel, "mb-2")}>Permissions</p>
                <ul className="space-y-2">
                  {info.can.map((perm) => (
                    <li key={perm} className="flex items-center gap-2 text-sm text-gray-700">
                      {I.check}
                      {perm}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* --------------------------- quick links --------------------------- */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/settings" className={cx(btnPrimary, "!px-5")}>
                Edit profile
              </Link>
              <Link href="/dashboard" className={cx(btnGhost, "!px-5")}>
                Back to dashboard
              </Link>
              <Link href="/projects" className={cx(btnGhost, "!px-5")}>
                My projects
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
