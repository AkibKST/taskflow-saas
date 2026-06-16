# TaskFlow — Frontend Pages

A checklist of every page the TaskFlow client needs. Built on Next.js 14 App Router.
Status legend: ✅ done · 🚧 partial (UI only / not persisted) · ⬜ to build.

> Last reviewed: 2026-06-17 — navigation, auth flow and shared header pass.

---

## 1. Public / Marketing

| Page | Route | Status | Purpose |
|------|-------|:------:|---------|
| Landing / Home | `/` | ✅ | Marketing page — hero, features, CTA. Now links to all marketing pages and redirects nowhere |
| Pricing | `/pricing` | ✅ | Plan tiers & billing CTA |
| Features | `/features` | ✅ | Detailed feature breakdown |
| About | `/about` | ✅ | Company / product story |
| Contact | `/contact` | ✅ | Contact form / support links |
| Not Found (404) | `*` | ✅ | Catch-all error page |

---

## 2. Authentication

| Page | Route | Status | Purpose |
|------|-------|:------:|---------|
| Login | `/login` | ✅ | Email + password sign-in. Redirects already-authenticated users to `/dashboard` |
| Register | `/register` | ✅ | Create org (tenant) + owner account. Redirects authenticated users to `/dashboard` |
| Forgot Password | `/forgot-password` | 🚧 | Request password reset link — UI only, **no backend endpoint** yet |
| Reset Password | `/reset-password` | 🚧 | Set new password from emailed token — UI only, **no backend endpoint** yet |
| Verify Email | `/verify-email` | 🚧 | Confirm email address — UI only, **no backend endpoint** yet |
| Accept Invite | `/invite/[token]` | ✅ | Join a tenant/project from invite link |

---

## 3. App Core (authenticated)

| Page | Route | Status | Purpose |
|------|-------|:------:|---------|
| Dashboard | `/dashboard` | ✅ | Overview — my tasks, recent activity, role-aware stats |
| Projects List | `/projects` | ✅ | All projects the user can access. Cards open the project overview; "+ New project" opens the form |
| Create Project | `/projects/new` | ✅ | New project form (name, description, color, status, dates) |
| Project Board (Kanban) | `/projects/[projectId]/tasks` | ✅ | Kanban board — TODO → IN_PROGRESS → IN_REVIEW → DONE / BLOCKED, drag & drop, cards link to task detail |
| Project Overview | `/projects/[projectId]` | ✅ | Project summary, progress, members, dates |
| Project Settings | `/projects/[projectId]/settings` | ✅ | Edit project, color, dates, manage members |
| Task Detail | `/projects/[projectId]/tasks/[taskId]` | ✅ | Full task view — description, status, priority, due date, assignees, delete |
| My Tasks | `/my-tasks` | ✅ | All tasks assigned to the current user across projects, with filters |
| Calendar | `/calendar` | ⬜ | Tasks by due date |

---

## 4. Collaboration

| Page | Route | Status | Purpose |
|------|-------|:------:|---------|
| Notifications | `/notifications` | ✅ | Assignments, comments, mentions, due-soon, member-joined; live via socket |
| Team / Members | `/team` | ✅ | Tenant-wide member list, search, invite people (OWNER/ADMIN) |

---

## 5. User & Account

| Page | Route | Status | Purpose |
|------|-------|:------:|---------|
| Profile | `/profile` | ✅ | View own profile, role & permissions; links to account settings |
| Account Settings | `/settings` | ✅ | Update name/email + change password (wired to `PATCH /auth/me` and `/auth/me/password`) |
| Notification Preferences | `/settings/notifications` | 🚧 | Toggle notification types — UI only, not yet persisted |

---

## 6. Admin / Owner (role-gated)

| Page | Route | Status | Purpose |
|------|-------|:------:|---------|
| Workspace Settings | `/admin/workspace` | 🚧 | Tenant name, branding (OWNER/ADMIN) — UI only, not yet persisted |
| User Management | `/admin/users` | 🚧 | Lists users & tenant roles (OWNER/ADMIN). View-only; role editing not yet implemented |
| Billing | `/admin/billing` | 🚧 | Subscription & invoices (OWNER only) — demo data, no payment provider connected |

---

## Cross-cutting (shared shell)

- **Shared header** — `components/layout/AppHeader.tsx` is used by every authenticated page (dashboard, projects, board, my-tasks, team, profile, settings, admin). It provides the primary nav (Dashboard, Projects, My Tasks, Team), a role-gated **Admin** link, a notification bell with a live unread badge, and a profile dropdown (Profile, Account settings, Notifications, admin links, Logout) that also exposes the nav on mobile.
- **Auth gate** — AppHeader redirects to `/login` once the persisted auth state has rehydrated and no user is present (`hasHydrated` flag in `store/authStore.ts`). `/login` and `/register` redirect authenticated users to `/dashboard`.
- **Role-aware UI** — dashboard, project settings (`canManage`), task detail (`canWrite`, read-only) and the admin pages all adapt to the user's role.

---

## Remaining work

1. **Calendar** `/calendar` — tasks by due date (only unbuilt page)
2. **Backend for password reset & email verification** — `/forgot-password`, `/reset-password`, `/verify-email` pages exist but have no API endpoints
3. **Persist** notification preferences (`/settings/notifications`) and workspace settings (`/admin/workspace`)
4. **User management actions** on `/admin/users` (change/assign roles, deactivate)
5. **Billing integration** on `/admin/billing` (connect a real payment provider)

---

### Built (29 pages)
All routes above except `/calendar`. Marketing (`/`, `/pricing`, `/features`, `/about`, `/contact`, 404),
auth (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/invite/[token]`),
app core (`/dashboard`, `/projects`, `/projects/new`, `/projects/[id]`, `/projects/[id]/tasks`,
`/projects/[id]/settings`, `/projects/[id]/tasks/[taskId]`, `/my-tasks`), collaboration (`/notifications`, `/team`),
account (`/profile`, `/settings`, `/settings/notifications`), admin (`/admin/workspace`, `/admin/users`, `/admin/billing`).
