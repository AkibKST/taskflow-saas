# TaskFlow — API Reference

All REST endpoints, request bodies, and real-time socket events for the TaskFlow backend.

- **Base URL:** `http://localhost:5000`
- **API prefix:** `/api/v1`
- **Auth:** JWT access token in `Authorization: Bearer <token>` (refresh token is sent as an httpOnly cookie).
- **Rate limits:** global `100 req/min`; auth + refresh routes `5 req/min`.
- **Response shape:** `{ success, message, data, meta? }` via `sendResponse`.

Roles legend — `canManage` = OWNER/ADMIN/MANAGER · `canWrite` = OWNER/ADMIN/MANAGER/MEMBER · `canInvite` = OWNER/ADMIN · 🔓 public · ✅ any authenticated user.

---

## 0. System

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/` | 🔓 | Welcome message |
| GET | `/health` | 🔓 | Liveness check — `{ status, time }` |
| GET | `/health/ready` | 🔓 | Readiness check — verifies DB connection |

---

## 1. Auth — `/api/v1/auth`

> All mutation routes are rate-limited to **5 req/min**.

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/register` | 🔓 (5/min) | Create org (tenant) + owner account |
| POST | `/login` | 🔓 (5/min) | Sign in, returns access token + sets refresh cookie |
| POST | `/refresh` | 🔓 (5/min) | **Rotate** refresh token pair; sets new refresh cookie |
| POST | `/logout` | ✅ | Revoke refresh token |
| GET | `/me` | ✅ | Current authenticated user |
| PATCH | `/me` | ✅ | Update own profile (name / email) |
| PATCH | `/me/password` | ✅ | Change own password (verifies current password) |

**POST `/register`**
```json
{
  "orgName": "Acme Inc",
  "name": "Jane Doe",
  "email": "jane@acme.com",
  "password": "Secret123"
}
```

**POST `/login`**
```json
{ "email": "jane@acme.com", "password": "Secret123" }
```

**POST `/refresh`** — no body; uses `refreshToken` httpOnly cookie.
Returns `{ accessToken }` and sets a **new rotated** `refreshToken` cookie.
Replayed revoked tokens trigger full token-family revocation (reuse detection).

**PATCH `/me`** — partial; at least one field required. Returns the updated user.
```json
{ "name": "Jane D.", "email": "jane.d@acme.com" }
```
Changing `email` is rejected with `409` if it already belongs to another user.

**PATCH `/me/password`**
```json
{ "currentPassword": "Secret123", "newPassword": "NewSecret1" }
```
`newPassword` must be ≥ 8 chars with 1 uppercase + 1 number. Returns `400` if `currentPassword` is incorrect.

---

## 2. Invitations — `/api/v1/invite`

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/` | canInvite | Send workspace invite email to a new member |
| GET | `/:token` | 🔓 | Validate invite token (used by accept-invite page) |
| POST | `/:token/accept` | 🔓 (10/15min) | Create account + log in on acceptance |

**POST `/`**
```json
{ "email": "newmember@example.com", "role": "MEMBER" }
```
`role` is optional (defaults to `MEMBER`). Allowed values: OWNER, ADMIN, MANAGER, MEMBER, VIEWER.

**GET `/:token`** — returns:
```json
{
  "email": "newmember@example.com",
  "role": "MEMBER",
  "tenantName": "Acme Inc",
  "inviterName": "Jane Doe"
}
```

**POST `/:token/accept`**
```json
{ "name": "Bob Smith", "password": "NewPass1" }
```
Returns `{ accessToken, user, tenant }` and sets `refreshToken` cookie (user is immediately signed in).

---

## 3. Projects — `/api/v1/projects`

> All routes require authentication. Project-scoped routes also require `requireProjectMember`
> (OWNER/ADMIN bypass; other roles must be a ProjectMember).

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/` | ✅ | List all projects in the tenant |
| POST | `/` | canManage | Create a project |
| GET | `/:projectId` | member | Get one project |
| PATCH | `/:projectId` | canManage + member | Update a project |
| DELETE | `/:projectId` | canManage + member | Soft-delete a project |
| POST | `/:projectId/members` | canManage + member | Add a member |
| DELETE | `/:projectId/members/:userId` | canManage + member | Remove a member |

**POST `/` (create project)**
```json
{
  "name": "Website Redesign",
  "description": "...",
  "color": "#3b82f6",
  "status": "ACTIVE",
  "startDate": "2026-06-14",
  "endDate": "2026-08-01"
}
```
**PATCH `/:projectId`** — all fields above, partial.

**POST `/:projectId/members`**
```json
{ "userId": "<uuid>", "role": "MEMBER" }
```

---

## 4. Tasks — `/api/v1/projects/:projectId/tasks`

> Nested under a project. Require authentication + project membership.

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/` | member | List tasks (filterable, paginated) |
| POST | `/` | canWrite | Create a task |
| PATCH | `/reorder` | canWrite | **Batch reorder** tasks in one request |
| PATCH | `/:taskId` | canWrite | Update a task |
| DELETE | `/:taskId` | canWrite | Soft-delete a task |

**GET `/` query params**
```
?status=TODO
&priority=HIGH
&assigneeId=<uuid>
&page=1
&limit=20
```

**POST `/`**
```json
{
  "title": "Build login page",
  "description": "...",
  "status": "TODO",
  "priority": "MEDIUM",
  "dueDate": "2026-06-20",
  "order": 0,
  "parentTaskId": "<uuid>",
  "assigneeIds": ["<uuid>"]
}
```

**PATCH `/reorder`** — replaces N parallel PATCH calls with one atomic write:
```json
{
  "updates": [
    { "id": "<uuid>", "order": 0, "status": "IN_PROGRESS" },
    { "id": "<uuid>", "order": 1 }
  ]
}
```

**PATCH `/:taskId`** — all create fields, partial.

---

## 5. Comments — `/api/v1/projects/:projectId/tasks/:taskId/comments`

> Require authentication + project membership.

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/` | member | List comments on a task (newest last) |
| POST | `/` | canWrite | Post a comment |
| PATCH | `/:commentId` | canWrite | Edit own comment |
| DELETE | `/:commentId` | canWrite | Soft-delete own comment |

**POST `/`**
```json
{ "content": "Looks good!", "parentId": "<uuid>" }
```
`parentId` is optional (for threaded replies).

**PATCH `/:commentId`**
```json
{ "content": "Updated text" }
```

---

## 6. Notifications — `/api/v1/notifications`

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/` | ✅ | List current user's notifications (last 50) |
| PATCH | `/read-all` | ✅ | Mark all as read |
| PATCH | `/:notificationId/read` | ✅ | Mark one as read |

**Notification types:** `TASK_ASSIGNED`, `TASK_COMMENTED`, `DUE_SOON`, `MENTIONED`, `MEMBER_JOINED`.

---

## 7. Users — `/api/v1/users`

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/` | ✅ | List all active users in the current tenant |

---

## 8. Real-time — Socket.IO

- **Connect:** same origin as API; JWT passed via `socket.handshake.auth.token` or `Authorization` header.
- **Auto-join:** each user joins a private room `user:<userId>` on connect.
- **Scaling:** attach Redis adapter via `REDIS_URL` env var for horizontal scaling.

### Client → Server (emit)

| Event | Constant | Payload | Effect |
|-------|----------|---------|--------|
| `project:join` | `PROJECT_JOIN` | `projectId` | Join project room, register presence |
| `project:leave` | `PROJECT_LEAVE` | `projectId` | Leave room, update presence |

### Server → Client (listen)

| Event | Sent to | Payload |
|-------|---------|---------|
| `presence:update` | project room | `{ projectId, onlineUserIds[] }` |
| `task:created` | project room | task DTO |
| `task:updated` | project room | task DTO or `{ _batchReorder: true, updates[] }` |
| `task:deleted` | project room | `{ id }` |
| `project:updated` | project room | project |
| `comment:created` | project room | `{ taskId, comment }` |
| `comment:updated` | project room | `{ taskId, comment }` |
| `comment:deleted` | project room | `{ taskId, commentId }` |
| `notification:new` | `user:<id>` | notification |

---

## Enums (from `@taskflow/shared`)

| Enum | Values |
|------|--------|
| `ROLES` (tenant) | OWNER, ADMIN, MANAGER, MEMBER, VIEWER |
| `PROJECT_ROLES` | MANAGER, MEMBER, VIEWER |
| `PROJECT_STATUS` | ACTIVE, ON_HOLD, COMPLETED, ARCHIVED |
| `TASK_STATUS` | TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED |
| `PRIORITY` | LOW, MEDIUM, HIGH, URGENT |
| `NOTIFICATION_TYPES` | TASK_ASSIGNED, TASK_COMMENTED, DUE_SOON, MENTIONED, MEMBER_JOINED |

---

*Source of truth: route files under `server/src/modules/*/`, `server/src/app.ts`, `server/src/socket/index.ts`, and `shared/index.ts`.*
