# TaskFlow — API Reference

All REST endpoints, request bodies, and real-time socket events for the TaskFlow backend.

- **Base URL:** `http://localhost:5000`
- **API prefix:** `/api/v1`
- **Auth:** JWT access token in `Authorization: Bearer <token>` (refresh token is sent as an httpOnly cookie).
- **Rate limits:** global `100 req/min`; auth routes `5 req/min`.
- **Response shape:** `{ success, message, data, meta? }` via `sendResponse`.

Roles legend — `canManage` = OWNER/ADMIN/MANAGER · `canWrite` = OWNER/ADMIN/MANAGER/MEMBER · 🔓 public · ✅ any authenticated user.

---

## 0. System

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/` | 🔓 | Welcome message |
| GET | `/health` | 🔓 | Health check — `{ status, time }` |

---

## 1. Auth — `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/register` | 🔓 (5/min) | Create org (tenant) + owner account |
| POST | `/login` | 🔓 (5/min) | Sign in, returns access token + sets refresh cookie |
| POST | `/refresh` | 🔓 (cookie) | Rotate access token using refresh cookie |
| POST | `/logout` | ✅ | Invalidate refresh token |
| GET | `/me` | ✅ | Current authenticated user |

**POST `/register`**
```json
{
  "orgName": "Acme Inc",        // 2–100 chars
  "name": "Jane Doe",           // 2–100 chars
  "email": "jane@acme.com",
  "password": "Secret123"        // min 8, ≥1 uppercase, ≥1 number
}
```

**POST `/login`**
```json
{ "email": "jane@acme.com", "password": "Secret123" }
```

---

## 2. Projects — `/api/v1/projects`

> All routes require authentication (`verifyToken`).

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/` | ✅ | List projects the user can access |
| POST | `/` | canManage | Create a project |
| GET | `/:projectId` | ✅ | Get one project |
| PATCH | `/:projectId` | canManage | Update a project |
| DELETE | `/:projectId` | canManage | Delete a project |
| POST | `/:projectId/members` | canManage | Add a member |
| DELETE | `/:projectId/members/:userId` | canManage | Remove a member |

**POST `/` (create project)**
```json
{
  "name": "Website Redesign",      // required, 1–100
  "description": "...",            // optional, ≤500
  "color": "#3b82f6",             // optional, hex #RRGGBB
  "status": "ACTIVE",             // optional, PROJECT_STATUS enum
  "startDate": "2026-06-14",      // optional
  "endDate": "2026-08-01"         // optional
}
```
**PATCH `/:projectId`** — all fields above, partial.

**POST `/:projectId/members`**
```json
{ "userId": "<uuid>", "role": "MEMBER" }   // role optional: MANAGER | MEMBER | VIEWER
```

---

## 3. Tasks — `/api/v1/projects/:projectId/tasks`

> Nested under a project. All require authentication.

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/` | ✅ | List tasks in project (filterable, paginated) |
| POST | `/` | canWrite | Create a task |
| PATCH | `/:taskId` | canWrite | Update a task |
| DELETE | `/:taskId` | canWrite | Delete a task |

**GET `/` query params**
```
?status=TODO        // TASK_STATUS enum
&priority=HIGH      // PRIORITY enum
&assigneeId=<uuid>
&page=1             // default 1
&limit=20           // default/limits from PAGINATION
```

**POST `/` (create task)**
```json
{
  "title": "Build login page",     // required, 1–200
  "description": "...",            // optional, ≤2000
  "status": "TODO",               // optional, TASK_STATUS
  "priority": "MEDIUM",           // optional, PRIORITY
  "dueDate": "2026-06-20",        // optional
  "order": 0,                      // optional int
  "parentTaskId": "<uuid>",       // optional (sub-task)
  "assigneeIds": ["<uuid>"]       // optional
}
```
**PATCH `/:taskId`** — all fields above, partial.

---

## 4. Notifications — `/api/v1/notifications`

> All require authentication.

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/` | ✅ | List current user's notifications |
| PATCH | `/read-all` | ✅ | Mark all as read |
| PATCH | `/:notificationId/read` | ✅ | Mark one as read |

**Notification types:** `TASK_ASSIGNED`, `TASK_COMMENTED`, `DUE_SOON`, `MENTIONED`, `MEMBER_JOINED`.

---

## 5. Users — `/api/v1/users`

> All require authentication.

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/` | ✅ | List users in the current tenant |

---

## 6. Real-time — Socket.IO

- **Connect:** same origin as API; JWT passed via `socket.handshake.auth.token` or `Authorization` header.
- **Auto-join:** each user joins a private room `user:<userId>` on connect.

### Client → Server (emit)

| Event | Constant | Payload | Effect |
|-------|----------|---------|--------|
| `project:join` | `PROJECT_JOIN` | `projectId` | Join project room, register presence |
| `project:leave` | `PROJECT_LEAVE` | `projectId` | Leave room, update presence |

### Server → Client (listen)

| Event | Constant | Sent to | Payload |
|-------|----------|---------|---------|
| `presence:update` | `PRESENCE_UPDATE` | project room | `{ projectId, onlineUserIds[] }` |
| `task:created` | `TASK_CREATED` | project room | task |
| `task:updated` | `TASK_UPDATED` | project room | task |
| `task:deleted` | `TASK_DELETED` | project room | `{ taskId }` |
| `project:updated` | `PROJECT_UPDATED` | project room | project |
| `notification:new` | `NOTIFICATION_NEW` | `user:<id>` | notification |

---

## Enums (from `@taskflow/shared`)

| Enum | Values |
|------|--------|
| `ROLES` (tenant) | OWNER, ADMIN, MANAGER, MEMBER, VIEWER |
| `PROJECT_ROLES` | MANAGER, MEMBER, VIEWER |
| `PROJECT_STATUS` | (see `shared/index.ts`) |
| `TASK_STATUS` | TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED |
| `PRIORITY` | LOW → URGENT |
| `NOTIFICATION_TYPES` | TASK_ASSIGNED, TASK_COMMENTED, DUE_SOON, MENTIONED, MEMBER_JOINED |

---

*Source of truth: route files under `server/src/modules/*/`, `server/src/app.ts`, `server/src/socket/index.ts`, and `shared/index.ts`.*
</content>
