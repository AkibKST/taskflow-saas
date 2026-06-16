# TaskFlow — Project Documentation

A single-page technical reference for the TaskFlow multi-tenant SaaS: architecture, data model, REST API, real-time events, auth, and permissions.

---

## 1. Overview

TaskFlow is a team project- and task-management SaaS. Each registered **organization (tenant)** gets an isolated workspace where members create **projects**, manage **tasks** on a Kanban board, comment, and collaborate in real time. The system is a TypeScript monorepo with three npm-workspace packages:

```
taskflow-SaaS/
├── client/    # Next.js 14 web app (App Router, Zustand, Tailwind)
├── server/    # Express 5 + Socket.IO API, Prisma ORM
├── shared/    # @taskflow/shared — enums, statuses, socket-event names
└── package.json   # workspace root + dev/build/db scripts
```

**`@taskflow/shared` is the single source of truth.** Every role, status string, priority, notification type, and socket-event name is defined once in `shared/index.ts` and imported by both client and server.

---

## 2. Architecture

```
┌─────────────────┐     REST (JWT)      ┌──────────────────┐
│   Next.js app   │ ──────────────────► │   Express API    │
│  (client :3000) │ ◄──── WebSocket ──► │  + Socket.IO     │
│  Zustand stores │   (presence/live)   │   (server :5000) │
└─────────────────┘                     └────────┬─────────┘
                                                  │ Prisma
                                                  ▼
                                         ┌──────────────────┐
                                         │   PostgreSQL     │
                                         │   (Neon)         │
                                         └──────────────────┘
                                                  │
                                         (optional) Redis
                                         ┌──────────────────┐
                                         │  @socket.io/     │
                                         │  redis-adapter   │
                                         │  (horizontal     │
                                         │   scaling)       │
                                         └──────────────────┘
```

- **Client** talks to the API over REST for all CRUD, and holds a Socket.IO connection for live task/project/comment/notification updates and presence.
- **Server** is organized by feature module — each module has `route`, `controller`, `service`, and `model` (Zod schema) files: `auth`, `invite`, `project`, `task`, `comment`, `notification`, `users`.
- **Socket layer** authenticates the WebSocket handshake with the same JWT, puts each user in a private room (`user:<id>`) and each open project in a shared room (`project:<id>`), tracks presence in memory (or Redis if configured).

### Backend layering
| Layer | Responsibility |
| --- | --- |
| `route` | Path, HTTP method, middleware (auth + role guards + project-membership guard) |
| `controller` | Parse/validate request, call service, send response |
| `service` | Business logic + Prisma data access |
| `model` | Zod input schemas |
| `middleware` | `verifyToken`, `requireRole`, `requireProjectMember`, global error handler, 404, rate limiting |
| `socket` | Real-time rooms, presence, broadcast helpers; optional Redis adapter |
| `jobs` | Scheduled maintenance tasks (`pruneRefreshTokens`, `hardDeleteSoftDeleted`) |

---

## 3. Data model

PostgreSQL via Prisma. Every business entity carries a `tenantId` so tenants are fully isolated.

| Model | Purpose | Key fields / relations |
| --- | --- | --- |
| **Tenant** | An organization workspace | `name`, `slug` (unique), `isActive`; owns users, projects, tasks, notifications, inviteTokens |
| **User** | A person in a tenant | `name`, `email`, `passwordHash`, `role`; unique per `(tenantId, email)` |
| **RefreshToken** | Issued refresh tokens | `token` (unique), `expiresAt`, `isRevoked`; pruned by scheduled job |
| **InviteToken** | Workspace invite links | `email`, `role`, `token` (unique hex), `expiresAt` (72h), `isAccepted`; created by OWNER/ADMIN |
| **Project** | A unit of work | `name`, `description`, `color`, `status`, `startDate`/`endDate`, soft-delete `isDeleted` |
| **ProjectMember** | User ↔ Project link | `role` (project-level), unique per `(projectId, userId)` |
| **Task** | A work item | `title`, `description`, `status`, `priority`, `dueDate`, `order`, self-relation `parentTaskId` for sub-tasks, soft-delete |
| **TaskAssignee** | Task ↔ User assignment | unique per `(taskId, userId)` |
| **Comment** | Discussion on a task | `content`, `parentId` (threading), `isEdited`, soft-delete |
| **Notification** | Per-user alert | `type`, `message`, `linkUrl`, `isRead` |

### Database indexes
All FK columns and the following composite indexes are declared in `schema.prisma`:
- `Task(projectId, tenantId, status)` — hot filter path for Kanban board
- `Task(projectId, order)` — drag-and-drop sort
- `Notification(userId, isRead, createdAt)` — notification list
- `RefreshToken(userId)`, `RefreshToken(expiresAt)` — prune job + lookup
- `InviteToken(tenantId)`, `InviteToken(email)` — duplicate-invite check
- `ProjectMember(userId)`, `ProjectMember(projectId)`
- `Comment(taskId, isDeleted)`, `Comment(userId)`

### Enums (from `@taskflow/shared`)
- **Role** (org-level): `OWNER`, `ADMIN`, `MANAGER`, `MEMBER`, `VIEWER`
- **ProjectRole**: `MANAGER`, `MEMBER`, `VIEWER`
- **ProjectStatus**: `ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED`
- **TaskStatus**: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `BLOCKED`
- **Priority**: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- **NotificationType**: `TASK_ASSIGNED`, `TASK_COMMENTED`, `DUE_SOON`, `MENTIONED`, `MEMBER_JOINED`

> **Kanban board columns** (display order): `TODO → IN_PROGRESS → IN_REVIEW → DONE`. `BLOCKED` is a valid status outside the main flow.

---

## 4. Authentication & authorization

### Token flow
1. **Register** creates a tenant **and** an `OWNER` user in one transaction, then issues tokens.
2. **Login** verifies the bcrypt password hash (cost 12) and issues tokens.
3. **Invite** flow allows OWNER/ADMIN to send workspace invite links; accepting the link creates a new User and immediately issues tokens.
4. **Access token** — short-lived (`JWT_EXPIRES_IN`, default 15m), sent on each request.
5. **Refresh token** — long-lived (`JWT_REFRESH_EXPIRES_IN`, default 7d), stored in the DB and revocable; **rotated on every use** — every `POST /auth/refresh` issues a new pair and revokes the old one.
6. **Reuse detection** — replaying a previously revoked refresh token triggers revocation of the entire token family for that user, forcing re-login.
7. **Logout** revokes the refresh token (`isRevoked = true`).

### Authorization layers
1. **`verifyToken`** — validates JWT, attaches `{ userId, tenantId, role, email }` to `req.user`.
2. **`requireRole(...roles)`** — org-level role gate (e.g., `canManage`, `canWrite`).
3. **`requireProjectMember`** — checks `ProjectMember` table for the `:projectId` in the route; `OWNER`/`ADMIN` bypass. Closes the intra-tenant access leak where any tenant user could access any project.

### Security middleware
`helmet` (custom CSP), `cors`, `express-rate-limit` (global 100/min; all auth + refresh routes 5/min; invite accept 10/15min), `cookie-parser`, 10 MB JSON body limit.

---

## 5. REST API

> See **[API_LIST.md](API_LIST.md)** for the full endpoint reference with request/response shapes.

Base URL: `/api/v1`. Module route map:
- `/auth` — register, login, refresh (with rotation), logout, me, update profile (`PATCH /me`), change password (`PATCH /me/password`)
- `/invite` — create invite, validate token, accept invite
- `/projects` — CRUD + member management (project-membership gated)
- `/projects/:projectId/tasks` — CRUD + batch reorder
- `/projects/:projectId/tasks/:taskId/comments` — CRUD comments
- `/notifications` — list + mark-read
- `/users` — list tenant users

### Health endpoints
- `GET /health` — liveness (process is running)
- `GET /health/ready` — readiness (`SELECT 1` DB check; use as Kubernetes readiness probe)

---

## 6. Real-time (Socket.IO)

### Rooms
- `user:<userId>` — private room, auto-joined on connect (notifications).
- `project:<projectId>` — shared room, joined on `project:join` event (tasks, presence, comments).

### Events
| Event | Direction | Payload | Meaning |
| --- | --- | --- | --- |
| `project:join` | client → server | `projectId` | Enter a project room |
| `project:leave` | client → server | `projectId` | Leave a project room |
| `presence:update` | server → room | `{ projectId, onlineUserIds }` | Online presence |
| `task:created` | server → room | task DTO | New task |
| `task:updated` | server → room | task DTO or `{ _batchReorder, updates[] }` | Task change or batch reorder |
| `task:deleted` | server → room | `{ id }` | Task removed |
| `project:updated` | server → room | project | Project details changed |
| `comment:created` | server → room | `{ taskId, comment }` | New comment |
| `comment:updated` | server → room | `{ taskId, comment }` | Edited comment |
| `comment:deleted` | server → room | `{ taskId, commentId }` | Removed comment |
| `notification:new` | server → user | notification | Alert for one user |

> **Convention exception:** the three `comment:*` events are emitted from the code, but their names are defined locally in `modules/comment/comment.service.ts` (`COMMENT_EVENTS`) rather than in `shared/index.ts`'s `SOCKET_EVENTS`. To honour the single-source-of-truth rule (§12), move these into `SOCKET_EVENTS`.

### Optimistic UI + conflict handling
`store/taskStore.ts` applies mutations immediately (optimistic), stores a `_snapshot` and `_mutationId` for rollback, then confirms/rolls-back on the server response. Socket echoes of own mutations are detected by comparing `_mutationId` in the pending set. `syncUpdated` merges rather than replaces when a local mutation is in flight. The `isMutating` flag is exposed to the UI to show a "Saving…" indicator and prevent conflicting interactions.

### Horizontal scaling
Attach the Redis adapter by setting `REDIS_URL`. The socket module detects the env var, dynamically imports `@socket.io/redis-adapter` + `redis`, and connects; it falls back to in-memory if the packages are not installed or Redis is unavailable.

---

## 7. Scheduled jobs

Registered in `server.ts` via `setInterval` at boot:

| Job | Interval | Action |
| --- | --- | --- |
| `pruneRefreshTokens` | 6 hours | Hard-deletes expired or revoked `RefreshToken` rows |
| `hardDeleteSoftDeleted` | 24 hours | Hard-deletes `Project`, `Task`, `Comment` rows that have `isDeleted=true` and `updatedAt < now − 30 days` |

---

## 8. CI

`.github/workflows/ci.yml` runs on push to `main`/`develop` and PRs to `main`:
- **Server job**: `npm ci` → `prisma generate` → `tsc --noEmit`
- **Client job**: `npm ci` → `tsc --noEmit` → `next lint`

---

## 9. Frontend

Next.js 14 App Router. Key additions:

| Path | Description |
| --- | --- |
| `components/layout/AppHeader.tsx` | Shared authenticated-app header — primary nav (Dashboard, Projects, My Tasks, Team), role-gated Admin links, notification bell with live unread badge, and a profile/settings dropdown (also exposes nav on mobile). Doubles as the **client-side auth gate**: redirects to `/login` once auth state has rehydrated with no user |
| `store/authStore.ts` | Persisted `user` + in-memory access token; `hasHydrated` flag so the auth gate doesn't false-redirect on first paint |
| `app/settings/page.tsx` | Account settings — update name/email + change password (wired to `PATCH /auth/me` and `/auth/me/password`) |
| `app/team/page.tsx` | Team members list + **Invite member** form (OWNER/ADMIN only) |
| `app/invite/[token]/page.tsx` | Accept-invite page — validates token, collects name+password, creates account |
| `store/taskStore.ts` | Optimistic task state with `mutationId` tracking, `isMutating`, merge-on-update |
| `hooks/useTasks.ts` | Task data/state + `reorderTasks` (batch) + own-echo filtering |

> See **[FRONTEND_PAGES.md](FRONTEND_PAGES.md)** for the full page inventory and status.

---

## 10. Environment variables (server)

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default 5000) |
| `NODE_ENV` | `development` / `production` |
| `CLIENT_URL` | Allowed CORS origin + socket origin + invite link base URL |
| `DATABASE_URL` | Pooled Postgres connection (PgBouncer/Neon) |
| `DIRECT_URL` | Direct connection, used for migrations |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Access-token secret + lifetime |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` | Refresh-token secret + lifetime |
| `REDIS_URL` | *(optional)* Redis connection string; enables Socket.IO Redis adapter |

---

## 11. Running locally

```bash
npm install                           # install all workspaces
cp server/.env.example server/.env    # fill in values
cd server && npx prisma migrate dev --name init   # apply schema + indexes
npm run dev                           # server :5000 + client :3000
```

To enable Redis adapter locally:
```bash
cd server && npm install @socket.io/redis-adapter redis
# Then set REDIS_URL=redis://localhost:6379 in server/.env
```

See **[README.md](README.md)** for the product-level overview and full script list.

---

## 12. Conventions

- **No hardcoded enums** — always import from `@taskflow/shared`.
- **Soft deletes** — projects, tasks, and comments use `isDeleted` + a 30-day retention job.
- **Tenant isolation** — every query is scoped by `tenantId` from the JWT.
- **Project isolation** — every project-scoped route is guarded by `requireProjectMember`.
- **Feature-module backend** — keep new server features in their own `route/controller/service/model` set.
- **Standard responses** — controllers use `sendResponse` + `catchAsync`; errors flow through the global error handler.
- **Batch over N+1** — assignee notifications and Kanban reorders are executed in parallel (`Promise.all`) / in a single batch endpoint, not serial loops.
