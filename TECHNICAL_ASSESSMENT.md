# TaskFlow — Technical Assessment

> A senior-engineer evaluation of the TaskFlow SaaS: where it stands today, what
> is missing, the risks that matter, and concrete improvements for scalability,
> performance, security, and the optimistic UI. Written for the **engineering
> team** and organized **by theme**.
>
> **Scope note:** this is an *analysis* document. For a description of how the
> system is built, see [`SYSTEM_ARCHITECTURE.md`](SYSTEM_ARCHITECTURE.md).
> Every finding below cites the file it came from; when code and this doc
> disagree, the code wins.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Business context](#2-business-context)
3. [What's lacking today](#3-whats-lacking-today)
4. [Risk register (by theme)](#4-risk-register-by-theme)
   - [4.1 Security](#41-security)
   - [4.2 Scalability](#42-scalability)
   - [4.3 Performance](#43-performance)
   - [4.4 Correctness & the optimistic UI](#44-correctness--the-optimistic-ui)
   - [4.5 Reliability & operations](#45-reliability--operations)
   - [4.6 Data integrity & code quality](#46-data-integrity--code-quality)
5. [Improvement recommendations (by theme)](#5-improvement-recommendations-by-theme)
6. [Suggested sequencing](#6-suggested-sequencing)

---

## 1. Executive summary

TaskFlow is a **well-structured MVP**. The codebase is clean and consistent: a
feature-module backend (`route → controller → service → model`), a single shared
enum/event contract (`@taskflow/shared`), proper JWT access/refresh handling, and
— pleasantly — a **real optimistic-UI layer already exists** on the client
(snapshot + rollback for task create/update/delete). The fundamentals are sound.

But it is not yet a usable multi-tenant product, and the gap is specific:

> **🚩 The single most important blocker: a tenant can only ever contain one
> user.** Registration creates the org plus one `OWNER`, and there is no endpoint
> anywhere to create or invite a second person. Every collaboration feature —
> assignees, presence, comments, notifications, project members — is built and
> wired, but unreachable because there is no second human to collaborate with.

Beyond that, the themes that need attention are: **authorization is org-role-only
and ignores project membership**, the **server is stateful and cannot scale
horizontally** (in-memory socket presence), there are **no database indexes**, and
there is **no test/CI/deploy infrastructure** at all. None of these are hard to
fix; they are the difference between a demo and a product.

---

## 2. Business context

| Dimension | Reading of the product |
| --- | --- |
| **Goal** | A multi-tenant SaaS for teams to plan projects and run a Kanban board with real-time collaboration and role-based access. |
| **Core services** | Projects & tasks, Kanban workflow (`TODO → IN_PROGRESS → IN_REVIEW → DONE`, `BLOCKED`), sub-tasks, comments, per-user notifications, live presence, org/project RBAC. |
| **Target customers** | SMB teams, **digital agencies** (multi-tenancy is a natural fit for client isolation), startups, and distributed/remote teams that need lightweight, real-time task tracking. |
| **Competitive set** | Trello, Asana, Linear, ClickUp, Jira — TaskFlow's differentiators today are real-time presence + strict tenant isolation + a simple role model. |
| **Monetization** | Implied subscription model: `/pricing` and `/admin/billing` pages exist as stubs, but **no billing is implemented**. |

**Path-to-revenue blockers (business-critical):** the team-invite gap (§3) and the
absence of billing. Until a customer can invite their team and pay, none of the
collaboration value can be sold.

---

## 3. What's lacking today

These are functional gaps that block the product promise — distinct from the
quality/risk items in §4.

### 3.1 🚩 No way to add a second user to a tenant *(critical)*
- `registerService` creates a tenant + one `OWNER` user in a transaction
  (`server/src/modules/auth/auth.service.ts`). That is the *only* code path that
  creates a `User`.
- The users module is **read-only** — `server/src/modules/users/user.route.ts`
  exposes `GET /` and nothing else.
- `addMember` (`project.service`) attaches an **existing** `userId` to a project;
  it cannot create the person.
- `/invite/[token]`, `/verify-email`, `/reset-password` exist only as client pages
  (`FRONTEND_PAGES.md` marks them ⬜/no backend).

**Effect:** assignees, comments, presence, project members, and notifications are
all built but unusable — there is never a second account in the workspace. This is
the first thing to fix.

### 3.2 No email subsystem
There is no transactional-email integration. This blocks team **invitations**,
**email verification**, **password reset**, and meaningful **due-soon** alerts —
all of which the UI anticipates.

### 3.3 No billing / subscription
The product is positioned as SaaS with pricing/billing pages, but there is no
payment provider, plan model, entitlement checks, or usage limits.

### 3.4 Smaller functional gaps
- **Comments** have a Prisma model (`Comment`) and notification type
  (`TASK_COMMENTED`) but no REST module — commenting is not implemented server-side.
- **No search**, **no file attachments**, **no activity/audit log**, **no reporting
  or analytics**, **no calendar view** (the page is a stub), **no mobile/PWA**.

---

## 4. Risk register (by theme)

### 4.1 Security

**Findings**

- **Refresh tokens are not rotated on use.** `refresh`
  (`server/src/modules/auth/auth.controller.ts`) validates the stored token and
  issues a *new access token only* — the same refresh token stays valid for its
  full 7-day life. A leaked refresh token is usable for a week with no reuse
  detection and no rotation.
- **`/auth/refresh` has no rate limiter.** Only `/register` and `/login` use
  `authLimiter` (5/min) in `auth.route.ts`; refresh falls back to the global
  100/min, leaving it comparatively open to abuse.
- **Authorization is org-role-only and ignores project membership.**
  `requireRole(...)` (`middleware/requireRole.ts`) checks `req.user.role`
  (the *tenant* role) and nothing else. Services scope by `tenantId` but **not** by
  `ProjectMember`. Consequences:
  - Any `OWNER/ADMIN/MANAGER` can manage **any** project in the tenant, member or
    not.
  - Any non-`VIEWER` can read/write tasks in **any** project in the tenant if they
    know the `projectId` (task routes only enforce `canWrite`).
  - `ProjectMember` / `ProjectRole` are effectively **decorative** today.
- **Tenant isolation is application-enforced only.** Every query manually includes
  `tenantId` from the JWT; there is no Postgres row-level security. One forgotten
  scope in a future query silently leaks cross-tenant data.
- **Weak password policy.** `registerSchema` requires only min-8 + 1 uppercase +
  1 number — no max length, no breached-password check, no symbol requirement.
- **No CSRF token.** Mitigated in practice by `sameSite: lax` cookies + a bearer
  access token, but there is no explicit protection on the cookie-bearing
  `/auth/refresh` POST.
- **`helmet()` uses defaults** — no tailored Content-Security-Policy.
- **No account lockout / progressive backoff** beyond IP rate limiting, and **no
  audit log** of security-relevant actions.

**Credit where due (already correct):** refresh token delivered as
`httpOnly` + `secure` (prod) + `sameSite=lax` cookie with a 7-day `maxAge`; access
token kept **in memory** in Zustand (not persisted to storage), shrinking the XSS
blast radius; bcrypt cost 12; separate access/refresh signing secrets; env vars
validated at boot (`config/env.ts`); logout revokes the token and scopes the lookup
to the authenticated `userId`.

### 4.2 Scalability

- **In-memory socket presence is a hard single-instance ceiling.**
  `socket/index.ts` holds presence in a module-level
  `Map<projectId, Set<userId>>` and broadcasts to **local** rooms only. Run two
  instances behind a load balancer and presence fragments and live updates miss
  clients on the other node.
- **The server is stateful**, so horizontal scaling and zero-downtime rolling
  deploys are not possible without first externalizing socket state.
- The Neon serverless driver opens a WebSocket connection per instance
  (`config/prisma.ts`); fine now, but connection management needs attention at
  scale.

### 4.3 Performance

- **No database indexes beyond unique constraints** (`server/prisma/schema.prisma`).
  Hot paths do sequential scans: `Task` filtered by `projectId`/`tenantId`/`status`/
  `priority` and ordered by `order` (`task.service.listTasksService`),
  `Notification` by `userId`, and unindexed foreign keys generally. Composite
  indexes are the highest-ROI perf change here.
- **Serial writes / N+1 on notifications.** `createTaskService` and
  `updateTaskService` loop over assignees and `await` a notification insert one at a
  time — latency scales linearly with assignee count.
- **Drag-to-reorder fires N parallel PATCH requests.** The Kanban handler in
  `app/projects/[projectId]/tasks/page.tsx` issues one `updateTask` per reordered
  card with no batching and no partial-failure recovery — a burst of writes and a
  consistency hazard if some succeed and some fail. A single batch/reorder endpoint
  would fix both.
- **Most list endpoints are unpaginated.** Only tasks honor `PAGINATION`; projects,
  notifications, and users return everything.
- **No caching layer** (HTTP/ETag or Redis) for read-heavy endpoints.

### 4.4 Correctness & the optimistic UI

The optimistic UI is **already implemented** and is a real strength — credit it.
`store/taskStore.ts` + `hooks/useTasks.ts` apply create/update/delete to local
state immediately, keep a `_snapshot`, mark pending items (`_isOptimistic`, shown at
`opacity-70`), confirm with the server response, and **roll back on error** with a
toast. The gaps are in reconciliation, not in the basic pattern:

- **Race: socket echo vs in-flight local mutation.** `syncUpdated` replaces the
  whole task unconditionally. If another user's `task:updated` echo arrives while a
  local edit is in flight (or the local PATCH response lands after a concurrent
  echo), one change silently clobbers the other — last write wins, with no guard.
- **No `order` reconciliation** on socket updates → transient column-order drift
  between clients until a refetch.
- **Reorder partial failure** leaves client and server inconsistent with no toast
  and no re-fetch to recover.
- **No `isMutating` state** is exposed, so the UI can't disable interactions during
  a flight (enabling rapid conflicting edits).

### 4.5 Reliability & operations

- **Zero automated tests.** No test runner, no `test` script in any `package.json`,
  no `*.test.*` / `*.spec.*` files. Refactoring is unguarded.
- **No CI/CD.** No `.github/workflows`, no typecheck/lint/test gate on changes.
- **No deployment artifacts.** No Dockerfile, compose, or platform config.
- **No graceful shutdown.** `server.ts` never handles `SIGTERM`/`SIGINT` to drain
  Socket.IO connections and call `prisma.$disconnect()` — deploys can drop
  in-flight requests and sockets.
- **Thin observability.** Only `morgan("dev")` request logging; no structured logs,
  no error tracking (e.g. Sentry), no metrics, and `/health` is liveness-only (it
  doesn't verify the DB, so it can't serve as a readiness probe).

### 4.6 Data integrity & code quality

- **Soft deletes accumulate.** `Project`/`Task`/`Comment` set `isDeleted` but there
  is no retention/hard-delete job — tables grow unbounded and every read carries an
  `isDeleted: false` filter.
- **No refresh-token pruning.** Expired/revoked rows in `RefreshToken` are never
  cleaned up.
- **`as any` escape hatches** weaken type safety in a few spots: JWT `expiresIn`
  casts (`auth.service.ts`), the Prisma `$transaction` callback typed `tx: any`, and
  enum coercions in `task.service.ts`.
- **Inconsistent email-uniqueness rule.** `registerService` rejects an email used in
  *any* tenant, while the DB only enforces uniqueness per `(tenantId, email)` — so
  the same person can't own two orgs even though the schema would allow it. Pick one
  intent and align both layers.

---

## 5. Improvement recommendations (by theme)

**Functional (unblock the product)**
- Add a **user-invitation flow**: an `invite` endpoint that creates a pending
  `User` in the tenant + an invite token, an accept-invite endpoint backing
  `/invite/[token]`, and wire `addMember` to it. This alone makes the whole
  collaboration feature set usable.
- Integrate **transactional email** (e.g. Resend/SES/Postmark) and back the verify,
  reset-password, invite, and due-soon flows with it.
- Implement the **Comment** REST module (it already has a model + notification type).
- Plan **billing** (Stripe) with a plan/entitlement model when monetization is on
  the roadmap.

**Security**
- **Rotate refresh tokens on every refresh** (issue + persist a new one, revoke the
  old) and add **reuse detection** (a replayed revoked token revokes the family).
- Add `authLimiter` (or stricter) to **`/auth/refresh`**.
- Make authorization **project-membership-aware**: a middleware/service guard that
  checks `ProjectMember` (and `ProjectRole`) for project- and task-scoped routes,
  not just the org role.
- Adopt **Postgres row-level security** keyed on `tenantId` as defense-in-depth, and
  centralize tenant scoping in a shared query helper.
- Strengthen the password policy and add a basic **breached-password** check; add an
  explicit **CSP** via Helmet; add **account lockout/backoff** and an **audit log**.

**Scalability**
- Add the **Socket.IO Redis adapter** and move presence to a shared store (Redis),
  then the API becomes horizontally scalable and rolling deploys are safe.

**Performance**
- Add **composite indexes** (`Task(projectId, tenantId, status)`,
  `Task(projectId, order)`, `Notification(userId, isRead, createdAt)`, and FK
  columns).
- Batch assignee-notification writes (`createMany` / parallelize), and add a single
  **batch reorder endpoint** so a drag emits one request.
- **Paginate** the projects/notifications/users lists.
- Consider **ETag/Redis caching** for read-heavy endpoints.

**Correctness / optimistic UI**
- Tag each mutation with a client **mutation id / version** so the client can
  **ignore its own socket echoes** and resolve conflicts deterministically.
- **Merge rather than replace** on `syncUpdated` while a local mutation is in flight,
  and reconcile `order`.
- Recover from reorder partial-failure (re-fetch + toast); expose `isMutating` to
  disable conflicting interactions.

**Reliability / ops**
- Establish a **test suite** (unit on services, integration on the API/auth flows)
  and a **CI pipeline** (typecheck + lint + test + migration check).
- Add a **Dockerfile** and deployment config.
- Add **graceful shutdown** (drain Socket.IO, `prisma.$disconnect()` on
  `SIGTERM`/`SIGINT`).
- Add **structured logging**, **error tracking**, basic **metrics**, and a
  DB-checking **readiness** endpoint alongside the liveness `/health`.

**Data integrity / code quality**
- Add scheduled jobs to **prune expired/revoked refresh tokens** and to enforce a
  **soft-delete retention** policy.
- Remove the `as any` casts in favor of typed payloads/Prisma types.
- Align the **email-uniqueness** rule across the validation layer and the DB schema.

---

## 6. Suggested sequencing

A pragmatic ordering — earlier items unblock or de-risk later ones.

**Now (makes it a real, safe product) — ✅ IMPLEMENTED**
1. ✅ **User invitations + email** — invite module, accept-invite page, email stub.
2. ✅ **Project-membership authorization** — `requireProjectMember` middleware on all routes.
3. ✅ **Refresh-token rotation + rate-limit `/auth/refresh`** — full rotation + reuse detection.
4. ✅ **Database indexes** — composite indexes on all hot query paths.

**Next (makes it operable and trustworthy) — ✅ IMPLEMENTED**
5. ✅ **Graceful shutdown** — SIGTERM/SIGINT drain Socket.IO + Prisma disconnect.
6. ✅ **CI** — GitHub Actions typecheck + lint for server and client.
7. ✅ **Redis socket adapter** — optional, activates when `REDIS_URL` is set.
8. ✅ **Batch reorder endpoint + optimistic-UI conflict handling** — single transaction reorder; mutationId echo filtering; merge-not-replace on socket update.
9. ✅ **Observability** — structured JSON logging in production; `GET /health/ready` DB readiness probe.

**Later (growth & monetization) — ✅ PARTIALLY IMPLEMENTED**
10. ✅ **Comments module** — full REST + socket events.
11. ✅ **Retention/cleanup jobs** — `pruneRefreshTokens` (6h) + `hardDeleteSoftDeleted` (30-day window).
12. ⬜ **Billing/subscriptions** (Stripe), search, attachments, audit log.
13. ⬜ **Real email provider** (swap console stub for Resend/SES/Postmark).
14. ⬜ **Test suite** — unit + integration tests; wire into CI.
15. ⬜ **Postgres RLS** — database-enforced tenant isolation as defense-in-depth.

---

*Findings reference files read in this assessment: `auth.controller.ts`,
`auth.route.ts`, `auth.model.ts`, `auth.service.ts`, `middleware/requireRole.ts`,
`socket/index.ts`, `task.service.ts`, `task.route.ts`, `config/prisma.ts`,
`config/env.ts`, `app.ts`, `server.ts`, `prisma/schema.prisma`, and the client's
`store/taskStore.ts`, `hooks/useTasks.ts`, `app/projects/[projectId]/tasks/page.tsx`.*