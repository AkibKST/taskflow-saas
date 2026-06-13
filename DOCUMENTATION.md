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

**`@taskflow/shared` is the single source of truth.** Every role, status string, priority, notification type, and socket-event name is defined once in `shared/index.ts` and imported by both client and server — no enum value is hardcoded elsewhere.

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
```

- **Client** talks to the API over REST for all CRUD, and holds a Socket.IO connection for live task/project/notification updates and presence.
- **Server** is organized by feature module — each module has `route`, `controller`, `service`, and `model` (Zod schema) files: `auth`, `project`, `task`, `notification`.
- **Socket layer** authenticates the WebSocket handshake with the same JWT, puts each user in a private room (`user:<id>`) and each open project in a shared room (`project:<id>`), and tracks presence in memory.

### Backend layering
| Layer | Responsibility |
| --- | --- |
| `route` | Path, HTTP method, middleware (auth + role guards) |
| `controller` | Parse/validate request, call service, send response |
| `service` | Business logic + Prisma data access |
| `model` | Zod input schemas |
| `middleware` | `verifyToken`, `requireRole`, global error handler, 404, rate limiting |
| `socket` | Real-time rooms, presence, broadcast helpers |

---

## 3. Data model

PostgreSQL via Prisma. Every business entity carries a `tenantId` so tenants are fully isolated.

| Model | Purpose | Key fields / relations |
| --- | --- | --- |
| **Tenant** | An organization workspace | `name`, `slug` (unique), `isActive`; owns users, projects, tasks, notifications |
| **User** | A person in a tenant | `name`, `email`, `passwordHash`, `role`; unique per `(tenantId, email)` |
| **RefreshToken** | Issued refresh tokens | `token` (unique), `expiresAt`, `isRevoked` |
| **Project** | A unit of work | `name`, `description`, `color`, `status`, `startDate`/`endDate`, soft-delete `isDeleted` |
| **ProjectMember** | User ↔ Project link | `role` (project-level), unique per `(projectId, userId)` |
| **Task** | A work item | `title`, `description`, `status`, `priority`, `dueDate`, `order`, self-relation `parentTaskId` for sub-tasks, soft-delete |
| **TaskAssignee** | Task ↔ User assignment | unique per `(taskId, userId)` |
| **Comment** | Discussion on a task | `content`, `parentId` (threading), `isEdited`, soft-delete |
| **Notification** | Per-user alert | `type`, `message`, `linkUrl`, `isRead` |

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
3. **Access token** — short-lived (`JWT_EXPIRES_IN`, default 15m), sent on each request.
4. **Refresh token** — long-lived (`JWT_REFRESH_EXPIRES_IN`, default 7d), stored in the DB and revocable; used at `/auth/refresh`.
5. **Logout** revokes the refresh token (`isRevoked = true`).

The JWT payload carries `{ userId, tenantId, role, email }`, which scopes every request to a tenant.

### Role guard
`requireRole(...roles)` middleware gates write operations:
- **Projects** — create/update/delete and member management require `OWNER`, `ADMIN`, or `MANAGER`.
- **Tasks** — create/update/delete require `OWNER`, `ADMIN`, `MANAGER`, or `MEMBER` (i.e., everyone except `VIEWER`).
- **Read** routes are open to any authenticated tenant user.

### Security middleware
`helmet` (security headers), `cors` (credentialed, restricted to `CLIENT_URL`), `express-rate-limit` (global 100 req/min; auth routes a stricter 5 req/min), `cookie-parser`, and a 10 MB JSON body limit.

---

## 5. REST API

Base URL: `/api/v1`. All routes except register/login/refresh require a valid access token.

### Auth — `/api/v1/auth`
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/register` | — | Create org + owner user, return tokens |
| POST | `/login` | — | Authenticate, return tokens |
| POST | `/refresh` | refresh token | Issue a new access token |
| POST | `/logout` | ✅ | Revoke refresh token |
| GET | `/me` | ✅ | Current user profile |

### Projects — `/api/v1/projects`
| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | `/` | any | List tenant projects |
| POST | `/` | manage | Create project |
| GET | `/:projectId` | any | Get one project |
| PATCH | `/:projectId` | manage | Update project |
| DELETE | `/:projectId` | manage | Soft-delete project |
| POST | `/:projectId/members` | manage | Add a member |
| DELETE | `/:projectId/members/:userId` | manage | Remove a member |

*manage = `OWNER` / `ADMIN` / `MANAGER`*

### Tasks — `/api/v1/projects/:projectId/tasks` (nested)
| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | `/` | any | List tasks in project |
| POST | `/` | write | Create task |
| PATCH | `/:taskId` | write | Update task (status, assignees, order…) |
| DELETE | `/:taskId` | write | Soft-delete task |

*write = everyone except `VIEWER`*. The task router uses `mergeParams` to read `:projectId` from the parent.

### Notifications — `/api/v1/notifications`
| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | List current user's notifications |
| PATCH | `/read-all` | Mark all as read |
| PATCH | `/:notificationId/read` | Mark one as read |

### Utility
| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | API welcome message |
| GET | `/health` | Health check `{ status, time }` |

---

## 6. Real-time (Socket.IO)

The socket connection is authenticated with the JWT in the handshake (`auth.token` or `Authorization` header). Invalid/missing tokens are rejected.

### Rooms
- `user:<userId>` — private room each connection auto-joins, used for direct notifications.
- `project:<projectId>` — shared room a client joins when opening a project, used for live task/project updates and presence.

### Events (names from `@taskflow/shared`)
| Event | Direction | Payload | Meaning |
| --- | --- | --- | --- |
| `project:join` | client → server | `projectId` | Enter a project room (adds to presence) |
| `project:leave` | client → server | `projectId` | Leave a project room |
| `presence:update` | server → room | `{ projectId, onlineUserIds }` | Who is currently viewing the project |
| `task:created` | server → room | task | A task was created |
| `task:updated` | server → room | task | A task changed (status, move, edit) |
| `task:deleted` | server → room | task id | A task was removed |
| `project:updated` | server → room | project | Project details changed |
| `notification:new` | server → user | notification | New alert for that user |

Presence is held in an in-memory `Map<projectId, Set<userId>>`. On disconnect, the user is removed from every project they were viewing and presence is re-broadcast.

Server-side broadcast helpers: `emitToProject(projectId, event, payload)` and `emitToUser(userId, event, payload)`.

---

## 7. Frontend

Next.js 14 App Router. Key pieces:

| Path | Role |
| --- | --- |
| `app/page.tsx` | Redirects to `/projects` if authed, else `/login` |
| `app/login`, `app/register` | Auth screens |
| `app/projects` | Project list |
| `app/projects/[projectId]/tasks` | Kanban board for a project |
| `store/*` | Zustand stores: `authStore`, `projectStore`, `taskStore`, `toastStore` |
| `hooks/useSocket.ts` | Manages the Socket.IO connection + live event handling |
| `hooks/useTasks.ts` | Task data/state |
| `lib/axios.ts`, `lib/api.ts` | HTTP client with token handling |
| `lib/socket.ts` | Socket client setup |
| `components/tasks/*` | `KanbanColumn`, `TaskCard` |
| `components/ui/*` | Reusable `Button`, `Field`, `Alert`, `Toaster`, `Logo` |

State is kept in Zustand stores; `react-hot-toast` powers notifications/toasts.

---

## 8. Environment variables (server)

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default 5000) |
| `NODE_ENV` | `development` / `production` |
| `CLIENT_URL` | Allowed CORS origin + socket origin |
| `DATABASE_URL` | Pooled Postgres connection (PgBouncer/Neon) |
| `DIRECT_URL` | Direct connection, used for migrations |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Access-token secret + lifetime |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` | Refresh-token secret + lifetime |

---

## 9. Running locally

```bash
npm install                # install all workspaces
cp server/.env.example server/.env   # then fill in values
npm run db:generate        # Prisma client
npm run db:migrate         # apply schema
npm run dev                # server :5000 + client :3000
```

See **[README.md](README.md)** for the product-level overview and the full script list.

---

## 10. Conventions

- **No hardcoded enums** — always import from `@taskflow/shared`.
- **Soft deletes** — projects, tasks, and comments use `isDeleted` rather than hard deletion.
- **Tenant isolation** — every query is scoped by `tenantId` from the JWT.
- **Feature-module backend** — keep new server features in their own `route/controller/service/model` set.
- **Standard responses** — controllers use the `sendResponse` helper and `catchAsync`; errors flow through the global error handler (`AppError`, Zod, Prisma cast/duplicate handlers).
