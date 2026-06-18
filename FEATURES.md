# TaskFlow — Feature List

A complete inventory of what **TaskFlow** (multi-tenant project & task-management SaaS) actually does today. Each item reflects the current code, not aspirations.

**Status legend:** ✅ implemented & wired end-to-end · 🚧 partial (UI present, not persisted / no provider) · ⬜ planned

> Last verified: 2026-06-18 against `server/src/modules/*`, `server/src/app.ts`, `shared/index.ts`, and `client/app/*`.

---

## 1. Multi-tenancy

| Feature | Status | Notes |
|---------|:------:|-------|
| Organization (tenant) workspaces | ✅ | Registering creates a `Tenant` with a unique `slug` plus an `OWNER` user in one transaction |
| Full tenant data isolation | ✅ | Every business entity carries `tenantId`; every query is scoped by the `tenantId` from the JWT |
| Per-tenant unique user email | ✅ | Users are unique per `(tenantId, email)`, so the same email can exist in different tenants |
| Tenant active/inactive flag | ✅ | `Tenant.isActive` field |

---

## 2. Authentication

| Feature | Status | Notes |
|---------|:------:|-------|
| Email + password registration (org + owner) | ✅ | `POST /api/v1/auth/register` |
| Login | ✅ | `POST /api/v1/auth/login` — bcrypt verify (cost 12), issues access + refresh tokens |
| JWT access tokens | ✅ | Short-lived (`JWT_EXPIRES_IN`, default 15m), sent as `Authorization: Bearer` |
| Refresh tokens (httpOnly cookie) | ✅ | Long-lived (default 7d), stored in DB and revocable |
| **Refresh token rotation** | ✅ | Every `POST /auth/refresh` issues a new pair and revokes the old one |
| **Reuse detection** | ✅ | Replaying a revoked refresh token revokes the entire token family, forcing re-login |
| Logout (token revocation) | ✅ | `POST /auth/logout` sets `isRevoked = true` |
| Get current user | ✅ | `GET /auth/me` |
| Update own profile (name / email) | ✅ | `PATCH /auth/me`; rejects email already taken by another user (`409`) |
| Change own password | ✅ | `PATCH /auth/me/password`; verifies current password, enforces ≥8 chars + 1 uppercase + 1 number |
| Forgot / reset password | ✅ | `POST /auth/forgot-password` + `POST /auth/reset-password`; single-use token (1h TTL), reset revokes all refresh tokens, no account enumeration |
| Email verification | ✅ | Verification email on register; `POST /auth/verify-email` + `POST /auth/resend-verification`; `User.emailVerifiedAt`, single-use token (24h TTL) |

---

## 3. Authorization & roles

| Feature | Status | Notes |
|---------|:------:|-------|
| Org-level roles | ✅ | `OWNER`, `ADMIN`, `MANAGER`, `MEMBER`, `VIEWER` |
| Project-level roles | ✅ | `MANAGER`, `MEMBER`, `VIEWER` (per `ProjectMember`) |
| `verifyToken` middleware | ✅ | Validates JWT, attaches `{ userId, tenantId, role, email }` to `req.user` |
| `requireRole(...)` role gate | ✅ | Helpers: `canManage` (OWNER/ADMIN/MANAGER), `canWrite` (+MEMBER), `canInvite` (OWNER/ADMIN) |
| `requireProjectMember` guard | ✅ | Enforces project membership on project-scoped routes; OWNER/ADMIN bypass — closes intra-tenant access leak |
| Role-aware UI | ✅ | Dashboard, project settings, task detail (read-only for viewers), and admin links adapt to role |

---

## 4. Team & invitations

| Feature | Status | Notes |
|---------|:------:|-------|
| Send workspace invite (email + role) | ✅ | `POST /api/v1/invite` (OWNER/ADMIN); creates an `InviteToken` (72h expiry, unique hex) |
| Validate invite token | ✅ | `GET /invite/:token` — returns email, role, tenant & inviter name |
| Accept invite (create account + auto-login) | ✅ | `POST /invite/:token/accept` (rate-limited 10/15min); returns tokens immediately |
| List tenant users | ✅ | `GET /api/v1/users` — all active users in the tenant |
| Team members page | ✅ | `/team` — member list, search, invite form (OWNER/ADMIN) |
| `MEMBER_JOINED` notification | ✅ | Fired when a member joins |

---

## 5. Projects

| Feature | Status | Notes |
|---------|:------:|-------|
| List projects | ✅ | `GET /api/v1/projects` |
| Create project | ✅ | `POST /projects` (canManage) — name, description, color, status, start/end dates |
| Get one project | ✅ | `GET /projects/:projectId` (member) |
| Update project | ✅ | `PATCH /projects/:projectId` (canManage + member) |
| Soft-delete project | ✅ | `DELETE /projects/:projectId` — sets `isDeleted` |
| Project status | ✅ | `ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED` |
| Add member to project | ✅ | `POST /projects/:projectId/members` |
| Remove member from project | ✅ | `DELETE /projects/:projectId/members/:userId` |
| Project pages | ✅ | List, create, overview, settings, Kanban board |

---

## 6. Tasks & Kanban

| Feature | Status | Notes |
|---------|:------:|-------|
| List tasks (filter + paginate) | ✅ | `GET .../tasks` — filter by `status`, `priority`, `assigneeId`; `page`/`limit` |
| Create task | ✅ | `POST .../tasks` (canWrite) |
| Update task | ✅ | `PATCH .../tasks/:taskId` (canWrite) |
| Soft-delete task | ✅ | `DELETE .../tasks/:taskId` |
| **Batch reorder** | ✅ | `PATCH .../tasks/reorder` — one atomic write replaces N parallel PATCHes |
| Task statuses | ✅ | `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `BLOCKED` |
| Kanban board with drag & drop | ✅ | Columns TODO → IN_PROGRESS → IN_REVIEW → DONE (BLOCKED outside main flow) |
| Priorities | ✅ | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| Due dates | ✅ | `dueDate` field |
| Sub-tasks | ✅ | Self-relation via `parentTaskId` |
| Multiple assignees per task | ✅ | `TaskAssignee` join table; `assigneeIds` on create/update |
| `TASK_ASSIGNED` notification | ✅ | Sent to assignees (batched via `Promise.all`) |
| My Tasks view | ✅ | `/my-tasks` — tasks assigned to the current user across all projects, with filters |
| Task detail page | ✅ | Description, status, priority, due date, assignees, delete |
| Calendar (tasks by due date) | ✅ | `/calendar` — month grid grouping tasks by `dueDate` across all projects (reuses the tasks API) |

---

## 7. Comments

| Feature | Status | Notes |
|---------|:------:|-------|
| List comments on a task | ✅ | `GET .../comments` (newest last) |
| Post comment | ✅ | `POST .../comments` (canWrite) |
| Threaded replies | ✅ | Optional `parentId` |
| Edit own comment | ✅ | `PATCH .../comments/:commentId`; sets `isEdited` |
| Soft-delete own comment | ✅ | `DELETE .../comments/:commentId` |
| `TASK_COMMENTED` notification | ✅ | Fired on new comment |

---

## 8. Notifications

| Feature | Status | Notes |
|---------|:------:|-------|
| List notifications | ✅ | `GET /api/v1/notifications` (last 50) |
| Mark one as read | ✅ | `PATCH /notifications/:id/read` |
| Mark all as read | ✅ | `PATCH /notifications/read-all` |
| Notification types | ✅ | `TASK_ASSIGNED`, `TASK_COMMENTED`, `DUE_SOON`, `MENTIONED`, `MEMBER_JOINED` |
| Live unread badge | ✅ | Notification bell in shared header updates via socket |
| Notifications page | ✅ | `/notifications` — live via socket |
| Notification preferences (toggles) | ✅ | `/settings/notifications` persisted via `NotificationPreference` (`GET`/`PATCH /settings/notifications`) |

---

## 9. Real-time collaboration (Socket.IO)

| Feature | Status | Notes |
|---------|:------:|-------|
| JWT-authenticated WebSocket handshake | ✅ | Token via `socket.handshake.auth.token` or `Authorization` header |
| Private per-user room | ✅ | `user:<userId>` auto-joined on connect (for notifications) |
| Project rooms | ✅ | `project:<projectId>` joined on `project:join` |
| **Live presence** | ✅ | `presence:update` broadcasts `onlineUserIds` per project |
| Live task create / update / delete | ✅ | `task:created`, `task:updated`, `task:deleted` |
| Live batch reorder | ✅ | `task:updated` with `{ _batchReorder, updates[] }` |
| Live project updates | ✅ | `project:updated` |
| Live notifications | ✅ | `notification:new` to `user:<id>` |
| **Optimistic UI + conflict handling** | ✅ | `taskStore` applies mutations immediately, tracks `_mutationId`/`_snapshot`, rolls back on failure, merges on update, exposes `isMutating` "Saving…" state |
| Own-echo filtering | ✅ | Socket echoes of own mutations detected via `_mutationId` pending set |
| Live comment create / update / delete | ✅ | `comment:created/updated/deleted` to the project room |
| Horizontal scaling (Redis adapter) | ✅ | Enabled by `REDIS_URL`; falls back to in-memory if Redis/packages unavailable |

> Note: the `comment:*` events are emitted and working, but their names are defined locally in `comment.service.ts` (`COMMENT_EVENTS`) rather than in `shared/index.ts`'s `SOCKET_EVENTS` — a convention exception worth tidying up.

---

## 10. Frontend pages (30 built)

**Marketing/public** ✅ — Landing `/`, Pricing, Features, About, Contact, 404
**Auth** ✅ — Login, Register, Accept Invite `/invite/[token]`, Forgot/Reset Password, Verify Email (wired to backend)
**App core** ✅ — Dashboard, Projects list, Create project, Project overview, Project settings, Kanban board, Task detail, My Tasks, Calendar
**Collaboration** ✅ — Notifications, Team
**Account** ✅ — Profile, Account settings, Notification preferences (persisted)
**Admin (role-gated)** ✅ — Workspace settings (persisted), User management (role change + activate/deactivate), Billing (live subscription + invoices)

**Cross-cutting** — Shared `AppHeader` (nav, role-gated admin links, live notification bell, profile dropdown, mobile nav) that doubles as the client-side **auth gate** (redirects to `/login` after auth rehydration when no user); `/login` & `/register` redirect authenticated users to `/dashboard`.

---

## 11. Security

| Feature | Status | Notes |
|---------|:------:|-------|
| Password hashing | ✅ | bcrypt, cost 12 |
| Helmet security headers (custom CSP) | ✅ | |
| CORS (locked to `CLIENT_URL`) | ✅ | |
| Global rate limiting | ✅ | 100 req/min |
| Auth/refresh rate limiting | ✅ | 5 req/min on all auth mutation routes |
| Invite-accept rate limiting | ✅ | 10 req / 15 min |
| Request body size limit | ✅ | 10 MB JSON |
| httpOnly refresh cookie | ✅ | Refresh token never exposed to JS |

---

## 12. Platform & operations

| Feature | Status | Notes |
|---------|:------:|-------|
| Health (liveness) | ✅ | `GET /health` |
| Readiness (DB check) | ✅ | `GET /health/ready` — `SELECT 1` |
| Soft deletes + 30-day retention | ✅ | Projects, tasks, comments |
| Scheduled: prune refresh tokens | ✅ | Every 6h — hard-deletes expired/revoked tokens |
| Scheduled: prune auth tokens | ✅ | Every 6h — deletes expired/used password-reset & email-verification tokens |
| Scheduled: hard-delete soft-deleted | ✅ | Every 24h — purges `isDeleted` rows older than 30 days |
| Standard response envelope | ✅ | `{ success, message, data, meta? }` via `sendResponse` |
| Database indexes for hot paths | ✅ | Kanban filter, drag-and-drop sort, notification list, token prune, etc. |
| CI pipeline | ✅ | `.github/workflows/ci.yml` — server (`prisma generate` + `tsc --noEmit`) & client (`tsc --noEmit` + `next lint`) |
| `@taskflow/shared` single source of truth | ✅ | All enums, statuses, socket-event names defined once |

---

## 13. Account & workspace settings

| Feature | Status | Notes |
|---------|:------:|-------|
| Notification preferences | ✅ | Per-user toggles persisted in `NotificationPreference`; `GET`/`PATCH /settings/notifications` |
| Workspace settings (name, logo) | ✅ | `GET /settings/workspace` (any member) · `PATCH /settings/workspace` (OWNER/ADMIN); stored on `Tenant.name` / `Tenant.logoUrl` |
| User management — change role | ✅ | `PATCH /api/v1/users/:userId/role` (OWNER/ADMIN); role hierarchy enforced (admins can't touch owners/admins or assign those roles) |
| User management — activate / deactivate | ✅ | `PATCH /api/v1/users/:userId/status`; deactivation revokes the user's sessions |
| Last-owner & self-edit protection | ✅ | Can't demote/deactivate the last active owner; can't change your own role/status |
| Admin user listing (incl. inactive) | ✅ | `GET /api/v1/users/manage` (OWNER/ADMIN) — all users with status & join date |

---

## 14. Billing & subscriptions

| Feature | Status | Notes |
|---------|:------:|-------|
| Subscription per tenant | ✅ | `Subscription` model (plan, status, seats, period); auto-created as `FREE` on first access |
| Plan catalog | ✅ | `FREE` / `PRO` / `ENTERPRISE` defined once in `@taskflow/shared` (`PLAN_CATALOG`) — price + seat limits |
| View billing | ✅ | `GET /api/v1/billing` (OWNER) — subscription, live seat usage, invoices, plan catalog |
| Change plan | ✅ | `POST /api/v1/billing/change-plan` (OWNER); generates an `Invoice` for paid plans |
| Cancel subscription | ✅ | `POST /api/v1/billing/cancel` (OWNER) — flags `cancelAtPeriodEnd` |
| Invoice history | ✅ | `Invoice` model, listed on `/admin/billing` |
| Provider-agnostic design | ✅ | `BillingProvider` interface + built-in **stub** (instant activation, no charge); Stripe drop-in documented — mirrors the email-stub pattern |
| Real payment provider | ⬜ | No Stripe/charges yet; stub activates immediately |
| Seat-limit enforcement | ⬜ | Seat usage shown but not enforced on invite/activate |

---

## 15. Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, Zustand, Tailwind CSS, Socket.IO client |
| Backend | Node.js, Express 5, Socket.IO, Zod validation |
| Database | PostgreSQL (Neon) via Prisma ORM |
| Auth | JWT (access + refresh w/ rotation), bcrypt, role-based middleware |
| Realtime scaling | Optional `@socket.io/redis-adapter` |
| Repo | npm-workspaces monorepo: `client`, `server`, `shared` |

---

## 16. Remaining / not-yet-implemented

All five gaps from the previous revision are now implemented end-to-end: calendar page, password-reset/email-verification backend, settings persistence, user-management actions, and billing. What's left is hardening:

1. **Real email provider** — `utils/email.ts` is still a console stub (swap in Resend/SES)
2. **Real payment provider** — billing runs on the built-in stub provider; wire Stripe behind the `BillingProvider` interface
3. **Seat-limit enforcement** — plan seat usage is displayed but not enforced when inviting/activating members

> **Deploy note:** the schema change ships as `server/prisma/migrations/20260618223642_settings_billing_auth_tokens`. Run `npx prisma migrate deploy` (server/) to apply it — the new settings/billing/auth-token endpoints require it.

---

*Source of truth: route files under `server/src/modules/*/`, `server/src/app.ts`, `server/src/socket/index.ts`, `shared/index.ts`, and `client/app/*`. See also [API_LIST.md](API_LIST.md), [DOCUMENTATION.md](DOCUMENTATION.md), and [FRONTEND_PAGES.md](FRONTEND_PAGES.md).*