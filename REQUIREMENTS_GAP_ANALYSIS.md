# TaskFlow — Requirements Gap Analysis

> A senior-engineer audit of what the project **lacks today**, based on a full read
> of the current code (branch state as of 2026-07-04). This supersedes the gap
> sections of `TECHNICAL_ASSESSMENT.md`, most of whose items have since been
> implemented (invites, comments, refresh rotation, indexes, CI, graceful
> shutdown, batch reorder, cleanup jobs, billing/settings/user-admin modules).
> Every finding below was verified against the code as it exists now, with file
> references.

**Legend:** 🔴 launch blocker · 🟠 high (security/correctness) · 🟡 medium (product gap) · ⚪ low (quality/ops)

> **Status (2026-07-04):** every finding in this audit has since been
> implemented. See [`GAP_RESOLUTION.md`](./GAP_RESOLUTION.md) for the item-by-item
> mapping of gap → change → files. This document is retained as the original
> reference audit.

---

## 1. Executive summary

The codebase is a well-structured, near-feature-complete MVP: clean module
architecture, working multi-user collaboration, rotated refresh tokens,
project-membership authorization on REST routes, optimistic UI, CI typechecking,
and maintenance jobs. What it lacks now falls into four clusters:

1. **Two provider stubs block production entirely** — email and billing both
   log/no-op instead of doing real work. No user can recover a password, verify
   an email, or receive an invite in production; no revenue can be collected.
2. **The real-time layer skipped the authorization hardening the REST layer got**
   — any authenticated user can join any project's socket room, including
   projects of **other tenants**, and receive their live task/comment events.
3. **Several features are wired only halfway** — plans/seats are displayed but
   never enforced; notification preferences are stored but never read;
   `DUE_SOON`/`MENTIONED` notification types can never fire; sub-tasks exist in
   the schema but have no UI; `ProjectRole` is attached to requests but never
   checked.
4. **Zero tests and no deployment story** — no test runner, no test files, no
   Dockerfile, no migration step in any pipeline.

---

## 2. 🔴 Launch blockers

### 2.1 Email subsystem is a console stub
`server/src/utils/email.ts` prints invite, password-reset, and verification
links to stdout. In production this means:

- **Password reset is unusable** — the reset flow works end-to-end but the link
  only appears in server logs.
- **Team invitations don't reach anyone** — the core growth loop is dead.
- **Email verification can never complete** for real users.

*Required:* integrate a transactional provider (Resend / SES / Postmark) behind
the existing function signatures, add minimal HTML templates, handle provider
errors (the register flow already treats send failure as non-fatal — good), and
add the provider key to `config/env.ts` + `.env.example`.

### 2.2 Billing is a stub with no lifecycle
`billing.provider.ts` always returns `stubProvider`; `getBillingProvider()` has
the Stripe branch commented out.

- Plan changes activate instantly with **no payment**; invoices are fabricated
  rows (`INV-<random>`), not real charges.
- **No webhook handler** — even with Stripe wired, there is no endpoint to
  receive `invoice.paid` / `payment_failed` / subscription-updated events, so
  `PAST_DUE` and involuntary churn can never be represented.
- **`cancelAtPeriodEnd` is set but never acted on** (`billing.service.ts:120`).
  No job downgrades or expires a subscription when `currentPeriodEnd` passes —
  a canceled PRO tenant keeps PRO forever.
- Invoice `number` is 4 random bytes with a `@unique` constraint — collisions
  will eventually throw; use a sequence per tenant/subscription.

### 2.3 Plans and seat limits are not enforced anywhere
`PLAN_CATALOG` defines seat counts (3/25/200) and the billing page shows
`seatsUsed`, but:

- `createInviteService` / `acceptInviteService` (`invite.service.ts`) never
  check the tenant's seat count — a FREE tenant can invite 50 people.
- `setUserActiveService` (reactivation) never checks seats.
- `changePlanService` allows downgrading PRO→FREE with 20 active users; it just
  writes `seats: 3` and moves on.
- Feature strings like "Advanced roles" and "SSO & audit logs" exist only as
  marketing text — there is no entitlement check of any kind in the codebase.

*Required:* a single `assertSeatAvailable(tenantId)` guard used by invite-create,
invite-accept, and user-reactivate; a downgrade pre-check; and a place where
plan → entitlement decisions live (even if it's a simple map).

### 2.4 Zero automated tests
No test runner, no `test` script in any of the four `package.json` files, no
`*.test.*`/`*.spec.*` files. CI (`.github/workflows/ci.yml`) runs only
`tsc --noEmit` and `next lint`. For a codebase carrying auth, token rotation,
multi-tenant isolation, RBAC, and billing, this is the largest engineering risk:
none of the security-sensitive behaviors verified in this document are protected
against regression.

*Required (minimum viable):* Vitest + Supertest integration tests for the auth
lifecycle (register/login/refresh/reuse-detection/reset), tenant isolation
(cross-tenant 404s), project-membership authorization, and invite accept; wire
into CI.

### 2.5 No deployment story
- No `Dockerfile`, no compose file, no platform config (Render/Fly/Railway…).
- `prisma migrate deploy` is not run anywhere — there is no defined way for
  migrations to reach a production database.
- CI never runs `npm run build`, so production-build breakage (Next.js SSG
  errors, tsc emit issues) isn't caught. Note the client CI job runs `npm ci`
  inside `client/` with its own lockfile, which does not reflect how the npm
  workspace resolves `@taskflow/shared` at the root — the CI environment is not
  the environment the app actually builds in.
- `.env.example` omits variables the code reads: `REDIS_URL` (socket adapter)
  and the client's `NEXT_PUBLIC_API_URL` (no `client/.env.example` at all).

---

## 3. 🟠 Security gaps

### 3.1 Socket.IO rooms have no authorization (cross-tenant leak)
`socket/index.ts:88` — on `PROJECT_JOIN`, the server does
`socket.join("project:" + projectId)` with **no check** that the project belongs
to the caller's tenant, let alone that the caller is a member. The handshake JWT
proves identity only. Consequences:

- Any authenticated user from **any tenant** who obtains/guesses a project UUID
  receives that project's live `task:*` and `comment:*` events and presence
  updates — a direct cross-tenant data leak that bypasses the carefully built
  `requireProjectMember` REST middleware.
- Within a tenant, non-members can watch projects they were never added to.

This is the highest-severity finding in this audit: the REST layer was hardened
(per `TECHNICAL_ASSESSMENT.md` item 2 ✅) but the socket layer was not, and the
socket layer carries the same data.

*Required:* on `PROJECT_JOIN`, verify `ProjectMember` (or tenant OWNER/ADMIN +
same-tenant) before joining; re-verify or force-disconnect on membership
removal and user deactivation.

### 3.2 `ProjectRole` is decorative — project VIEWERs can write
`requireProjectMember` attaches `req.projectRole`, but a repo-wide search shows
**nothing ever reads it**. Write access on tasks/comments is gated only by the
*org* role (`canWrite = OWNER|ADMIN|MANAGER|MEMBER` in `task.route.ts`). An org
MEMBER added to a project as `VIEWER` can create, edit, delete, and reorder
tasks in it. The `ProjectRole` enum (MANAGER/MEMBER/VIEWER) has no effect on
anything.

### 3.3 Email verification is never enforced
`emailVerifiedAt` is stamped by `verifyEmailService`, but no middleware or
route checks it. Unverified accounts have full, permanent access — the entire
verification subsystem (tokens, emails, page, pruning job) currently changes no
behavior. Decide the policy (e.g. block after N days, or gate invites/billing)
and enforce it in `verifyToken` or a dedicated guard.

### 3.4 Same email in two tenants breaks login
The schema allows one email in multiple tenants (`@@unique([tenantId, email])`),
and `acceptInviteService` only checks duplicates **within** the invited tenant —
so an existing user invited to a second workspace gets a second `User` row. But
`loginService` does `findFirst({ where: { email } })` (`auth.service.ts:126`):
login resolves to an **arbitrary** one of the two accounts, and the other
workspace becomes unreachable. Meanwhile `registerService` rejects an email that
exists in *any* tenant — the two flows disagree about the rule.

*Required:* pick a model — (a) global-unique user with tenant memberships
(bigger refactor, enables workspace switching), or (b) tenant-scoped login
(workspace slug on the login form). Today's code is an inconsistent middle.

### 3.5 Deactivation doesn't end live access
`verifyToken` trusts the JWT alone — a deactivated user (`isActive: false`)
keeps API access until the access token expires (≤15 min) and, worse, **already-
connected sockets stay connected indefinitely** (the handshake check runs once).
Role changes have the same lag: `role` is baked into the JWT. Acceptable only if
documented; a disconnect-on-deactivate (emit to `user:<id>` room + disconnect)
is cheap since sessions are already revoked in `setUserActiveService`.

### 3.6 Profile email change is under-protected
`updateProfileService` (`auth.service.ts:191`) changes the account email
**without requiring the current password and without resetting
`emailVerifiedAt`** or re-verifying. A hijacked session (XSS, stolen laptop) can
be converted into permanent account takeover by swapping the email and then
using password-reset. Also, its uniqueness check is global-across-tenants,
compounding §3.4's inconsistency.

### 3.7 Proxy/infrastructure hardening
- **`app.set("trust proxy", …)` is never called.** Behind any load balancer or
  reverse proxy (i.e. every real deployment), `express-rate-limit` keys all
  users on the proxy's IP — one shared 5/min bucket for *all* logins — and
  `secure` cookie/protocol detection misbehaves.
- Rate-limit state is **in-memory**: it resets on every deploy and is per-
  instance once the app scales; the login limiter can be dodged by hitting
  different instances.
- `express.json({ limit: "10mb" })` is a generous DoS surface for an API whose
  largest legitimate payload is a comment.
- No per-account lockout/backoff (only per-IP), no CAPTCHA escalation.

### 3.8 Deeper defense-in-depth (unchanged from prior assessment)
Still absent: Postgres row-level security (tenant isolation remains app-code
only — one forgotten `tenantId` filter is a silent leak), an audit log of
security-relevant events (role changes, deactivations, plan changes, deletions),
and a CSRF token on the cookie-authenticated `/auth/refresh` (mitigated today by
`sameSite: lax` + bearer-token architecture, but unstated as a decision).

---

## 4. 🟡 Functional gaps — features that exist only halfway

| Gap | Evidence | Effect |
| --- | --- | --- |
| **`DUE_SOON` notifications never fire** | Type exists (`NotificationType`), preference toggle exists (`taskDue`), but no job scans `Task.dueDate` — the three scheduled jobs are prune/prune/hard-delete only (`server.ts:34-57`) | Users enable a notification that cannot happen; due dates are display-only |
| **`MENTIONED` notifications never fire** | No `@mention` parsing in `comment.service.ts` — commenting notifies assignees only | Mentions advertised in README/notifications page don't exist |
| **Notification preferences are ignored** | `createNotificationService` never reads `NotificationPreference` | The whole settings/notifications page is decorative |
| **Sub-tasks have no UI** | Schema + `_count.subTasks` exist; zero client references to `parentTaskId` | Advertised in README ("break tasks into sub-tasks"), unusable |
| **No invite management** | `invite.route.ts` = create/validate/accept only | Can't list pending invites, revoke a mis-sent invite, or resend an expired one; team page can't show "invited, not joined" |
| **No search** | No search endpoint or UI anywhere | Finding a task by text requires scrolling the board; painful past ~50 tasks |
| **No file attachments** | No upload handling, storage config, or schema model | Table-stakes for task collaboration |
| **No task activity history** | No model/endpoint for status/assignee change events | "Who moved this to Done and when" is unanswerable; also the audit-log gap (§3.8) |
| **Unpaginated lists** | `project.service.ts` `findMany` (no `take`); users list; comments list; notifications hard-capped at `take: 50` with no cursor | Degrades linearly with tenant size; notifications silently truncate |
| **No data export / account deletion** | Nothing for tenant data export or right-to-erasure | GDPR/DPA blockers for selling to EU businesses |
| **Tenant/workspace management is minimal** | `Tenant.logoUrl` never settable; no workspace rename UI path beyond settings module; no tenant deletion/offboarding | Admin "workspace" page underpowered |

---

## 5. ⚪ Operations, scalability & quality

- **Presence does not actually scale — even with Redis.** The comment in
  `socket/index.ts:9` says presence is "replaced by Redis when REDIS_URL is
  set", but the code always uses the module-level `localPresence` Map; the Redis
  adapter only bridges room *broadcasts*. With 2+ instances, each node reports
  only its own connections — presence lists will be wrong. Move presence to
  Redis (or drop the claim).
- **In-process `setInterval` jobs duplicate under scale.** All three maintenance
  jobs run inside each server instance with no distributed lock; two instances =
  double execution. Also no run-at-startup, so the first prune happens 6h after
  boot. Fine single-instance; needs a lock or an external scheduler before
  scaling.
- **Observability is logs-only.** No error tracker (Sentry), no metrics, no
  request IDs for correlating a user report to a log line. `console.log`
  scattered through services rather than a logger abstraction.
- **No DB operations story** — no backup/restore procedure, no seed script for
  local dev (`prisma/seed` absent, so a new contributor starts with an empty DB
  and no demo data).
- **Client robustness gaps** — no `error.tsx` or `loading.tsx` anywhere in the
  App Router (an uncaught render error white-screens the app); no Next.js
  `middleware.ts`, so route protection is entirely client-side (protected pages
  flash before redirect, and rely on a `localStorage`-persisted `user`).
- **Docs have drifted** — `FRONTEND_PAGES.md` still marks forgot/reset/verify
  as "no backend endpoint yet" and calendar as ⬜ to-build, but all four now
  exist. Stale status docs are worse than none; a fresh pass or deletion of the
  status columns is warranted.

---

## 6. Prioritized roadmap

**P0 — before any real customer (≈ the launch line)**
1. Real email provider behind `utils/email.ts` (§2.1) — unblocks recovery + growth.
2. Socket room authorization (§3.1) — closes the cross-tenant leak. Small change, top severity.
3. Seat/plan enforcement on invite/accept/reactivate + downgrade check (§2.3).
4. `trust proxy` + body-limit + shared rate-limit store decision (§3.7) — one config PR.
5. Test suite covering auth, tenant isolation, and authorization; run in CI (§2.4).
6. Dockerfile + migration deploy step + CI production build (§2.5).

**P1 — first paying customers**
7. Stripe provider + webhooks + period-end lifecycle job (§2.2).
8. Resolve the email-identity model (global user vs tenant-scoped login) (§3.4).
9. Enforce `ProjectRole` on writes; enforce (or remove) email verification (§3.2, §3.3).
10. Honor notification preferences; implement `DUE_SOON` job and `@mention` parsing (§4).
11. Invite list/revoke/resend; paginate projects/notifications/comments (§4).

**P2 — competitive completeness**
12. Search, attachments, task activity history, sub-task UI (§4).
13. Presence in Redis + distributed job locking (§5).
14. Error tracking + metrics; `error.tsx`/`loading.tsx`; edge route protection (§5).
15. Data export / account deletion (compliance); Postgres RLS; audit log (§4, §3.8).

---

*Files read for this audit: all of `server/src` (app, server, socket, config,
middleware, jobs, and the auth/user/invite/project/task/comment/notification/
settings/billing modules), `prisma/schema.prisma` + migrations, `shared/index.ts`,
the client's stores/lib/hooks and app routes, both CI jobs, all root docs, and
every `package.json`. Where this document and the code disagree, the code wins.*
