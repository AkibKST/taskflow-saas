# TaskFlow — Feature List

A complete inventory of what **TaskFlow** (multi-tenant project & task-management SaaS) actually does today. Each item reflects the current code, not aspirations.

**Status legend:** ✅ implemented & wired end-to-end · 🚧 partial (UI present, not persisted / no provider) · ⬜ planned

> Last verified: 2026-06-17 against `server/src/modules/*`, `server/src/app.ts`, `shared/index.ts`, and `client/app/*`.

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
| Forgot / reset password | 🚧 | Frontend pages exist (`/forgot-password`, `/reset-password`); **no backend endpoint yet** |
| Email verification | 🚧 | Frontend page exists (`/verify-email`); **no backend endpoint yet** |

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
| Calendar (tasks by due date) | ⬜ | Only unbuilt app page |

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
| Notification preferences (toggles) | 🚧 | `/settings/notifications` UI only — not yet persisted |

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

## 10. Frontend pages (29 built)

**Marketing/public** ✅ — Landing `/`, Pricing, Features, About, Contact, 404
**Auth** ✅ — Login, Register, Accept Invite `/invite/[token]` · 🚧 Forgot/Reset Password, Verify Email (UI only)
**App core** ✅ — Dashboard, Projects list, Create project, Project overview, Project settings, Kanban board, Task detail, My Tasks · ⬜ Calendar
**Collaboration** ✅ — Notifications, Team
**Account** ✅ — Profile, Account settings · 🚧 Notification preferences
**Admin (role-gated)** 🚧 — Workspace settings (UI only), User management (view-only), Billing (demo data, no payment provider)

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
| Scheduled: hard-delete soft-deleted | ✅ | Every 24h — purges `isDeleted` rows older than 30 days |
| Standard response envelope | ✅ | `{ success, message, data, meta? }` via `sendResponse` |
| Database indexes for hot paths | ✅ | Kanban filter, drag-and-drop sort, notification list, token prune, etc. |
| CI pipeline | ✅ | `.github/workflows/ci.yml` — server (`prisma generate` + `tsc --noEmit`) & client (`tsc --noEmit` + `next lint`) |
| `@taskflow/shared` single source of truth | ✅ | All enums, statuses, socket-event names defined once |

---

## 13. Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, Zustand, Tailwind CSS, Socket.IO client |
| Backend | Node.js, Express 5, Socket.IO, Zod validation |
| Database | PostgreSQL (Neon) via Prisma ORM |
| Auth | JWT (access + refresh w/ rotation), bcrypt, role-based middleware |
| Realtime scaling | Optional `@socket.io/redis-adapter` |
| Repo | npm-workspaces monorepo: `client`, `server`, `shared` |

---

## 14. Remaining / not-yet-implemented

1. **Calendar** page (`/calendar`) — tasks by due date (only unbuilt page)
2. **Backend for password reset & email verification** — frontend pages exist, no API endpoints
3. **Persist** notification preferences (`/settings/notifications`) and workspace settings (`/admin/workspace`)
4. **User management actions** on `/admin/users` (change/assign roles, deactivate) — currently view-only
5. **Billing integration** on `/admin/billing` — demo data, no payment provider connected

---

*Source of truth: route files under `server/src/modules/*/`, `server/src/app.ts`, `server/src/socket/index.ts`, `shared/index.ts`, and `client/app/*`. See also [API_LIST.md](API_LIST.md), [DOCUMENTATION.md](DOCUMENTATION.md), and [FRONTEND_PAGES.md](FRONTEND_PAGES.md).*