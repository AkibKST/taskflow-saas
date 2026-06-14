# TaskFlow — Frontend Pages

A checklist of every page the TaskFlow client needs. Built on Next.js 14 App Router.
Status legend: ✅ exists · 🚧 partial · ⬜ to build.

---

## 1. Public / Marketing

| Page | Route | Status | Purpose |
|------|-------|:------:|---------|
| Landing / Home | `/` | ✅ | Marketing page — hero, features, why-TaskFlow, CTA to register |
| Pricing | `/pricing` | ⬜ | Plan tiers & billing CTA |
| Features | `/features` | ⬜ | Detailed feature breakdown |
| About | `/about` | ⬜ | Company / product story |
| Contact | `/contact` | ⬜ | Contact form / support links |
| Not Found (404) | `*` | ✅ | Catch-all error page |

---

## 2. Authentication

| Page | Route | Status | Purpose |
|------|-------|:------:|---------|
| Login | `/login` | ✅ | Email + password sign-in |
| Register | `/register` | ✅ | Create org (tenant) + owner account |
| Forgot Password | `/forgot-password` | ✅ | Request password reset link |
| Reset Password | `/reset-password` | ⬜ | Set new password from emailed token |
| Verify Email | `/verify-email` | ⬜ | Confirm email address |
| Accept Invite | `/invite/[token]` | ⬜ | Join a tenant/project from invite link |

---

## 3. App Core (authenticated)

| Page | Route | Status | Purpose |
|------|-------|:------:|---------|
| Dashboard | `/dashboard` | ✅ | Overview — my tasks, recent activity, stats |
| Projects List | `/projects` | ✅ | All projects the user can access |
| Create Project | `/projects/new` | ⬜ | New project form (or modal) |
| Project Board (Kanban) | `/projects/[projectId]/tasks` | ✅ | Kanban board — TODO → IN_PROGRESS → IN_REVIEW → DONE / BLOCKED |
| Project Overview | `/projects/[projectId]` | ⬜ | Project summary, progress, members, dates |
| Project Settings | `/projects/[projectId]/settings` | ✅ | Edit project, color, dates, manage members |
| Task Detail | `/projects/[projectId]/tasks/[taskId]` | ⬜ | Full task view — sub-tasks, comments, assignees, priority, due date |
| My Tasks | `/my-tasks` | ⬜ | All tasks assigned to the current user across projects |
| Calendar | `/calendar` | ⬜ | Tasks by due date |

---

## 4. Collaboration

| Page | Route | Status | Purpose |
|------|-------|:------:|---------|
| Notifications | `/notifications` | ✅ | Assignments, comments, mentions, due-soon, member-joined |
| Team / Members | `/team` | ⬜ | Tenant-wide member list, roles, invite people |

---

## 5. User & Account

| Page | Route | Status | Purpose |
|------|-------|:------:|---------|
| Profile | `/profile` | ✅ | View / edit own profile, avatar |
| Account Settings | `/settings` | ⬜ | Password, email, preferences |
| Notification Preferences | `/settings/notifications` | ⬜ | Toggle notification channels/types |

---

## 6. Admin / Owner (role-gated)

| Page | Route | Status | Purpose |
|------|-------|:------:|---------|
| Workspace Settings | `/admin/workspace` | ⬜ | Tenant name, branding (OWNER/ADMIN) |
| User Management | `/admin/users` | ⬜ | Manage users & tenant roles (OWNER/ADMIN) |
| Billing | `/admin/billing` | ⬜ | Subscription & invoices (OWNER only) |

---

## Suggested build order

1. **Task Detail** `/projects/[projectId]/tasks/[taskId]` — core of the product
2. **Create Project** `/projects/new`
3. **Project Overview** `/projects/[projectId]`
4. **Team / Members** `/team`
5. **My Tasks** `/my-tasks`
6. **Account Settings** `/settings`
7. **Admin pages** (workspace, users, billing)
8. **Marketing pages** (pricing, features, about, contact)

---

### Already built (9)
`/` · `/login` · `/register` · `/forgot-password` · `/dashboard` · `/projects` · `/projects/[projectId]/tasks` · `/projects/[projectId]/settings` · `/notifications` · `/profile` · 404
</content>
</invoke>
