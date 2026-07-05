# TaskFlow — Requirements Gap Analysis

> **Revision 3 — 2026-07-05, verified against `main`.**
> The original audit (2026-07-04) was fully resolved — see
> [`GAP_RESOLUTION.md`](./GAP_RESOLUTION.md); its text is preserved in git
> history. Revision 2 listed what remained; this revision reflects the
> implementation pass that followed it. Each closed item lists its evidence;
> each open item states what is missing, why it matters, and a recommended fix.

**Legend:** P0 highest impact → P4 polish

---

## Closed in the Revision-2 → Revision-3 implementation pass

| Item | Evidence |
| --- | --- |
| **E2E test suite (was P0 #1)** | Playwright at the repo root (`e2e/`): auth lifecycle, wrong-password rejection, project + task + accessible move-menu, kanban pointer drag. Boots real server (:5001) + production client build (:3001) against a disposable DB (`E2E_DATABASE_URL`); dedicated `e2e` CI job with its own Postgres service. Run locally with `npm run test:e2e`. |
| **Touch drag & drop (was P0 #2)** | Kanban board migrated from HTML5 `draggable` to `@dnd-kit/core` (mouse + touch sensors; 5px mouse threshold, 200ms touch long-press so taps/scroll still work). Board-level `DndContext` in `tasks/page.tsx`; drop resolution extracted to the pure, unit-tested `client/lib/kanbanDnd.ts`. The accessible "move-to" menu remains. |
| **CSRF on refresh/logout (was P1 #4)** | Double-submit implemented: `verifyCsrf` middleware (`server/src/middleware/verifyCsrf.ts`, timing-safe compare), readable `csrfToken` cookie issued at register/login/refresh, `X-CSRF-Token` header attached by the client axios layer. 3 integration tests cover missing/wrong/valid header paths. |
| **Per-account login lockout (was P1 #6)** | 10 consecutive failures lock the account 15 minutes (`429`); counters on `User.failedLoginCount` / `lockedUntil` (migration `20260705120000_login_lockout`); `auth.login_locked` audit event; integration-tested end-to-end. |
| **Missing `/dashboard/summary` endpoint** | Found by the new E2E tooling: the dashboard page has always called it and silently swallowed the 404, so its stat cards never populated. Implemented in `server/src/modules/dashboard/` (per-user + admin tenant-wide aggregates), 3 integration tests, documented in `API_LIST.md`. |
| **Optimistic-create race on the board** | Found by E2E: a slow initial task fetch resolving after a quick-add wiped the optimistic card, and `confirmAdd` silently dropped the confirmed task (board showed "1 total", zero cards). `taskStore.confirmAdd` now handles wiped-temp and socket-echo-first orderings; regression unit tests added. |
| **Wrong-password error never displayed** | Found by E2E: the axios interceptor treated the login 401 as an expired session, attempted a refresh, and its failure hard-redirected to `/login` — wiping the form and the error. Auth endpoints are now excluded from the refresh-retry path. |

Earlier-closed items (client unit tests + CI wiring, SSO claim removal, storage
production warning, `client/.env.example`) are recorded in Revision 2 (git
history).

**Test baseline:** 53 server tests (17 unit + 36 integration) · 43 client
tests · 4 E2E smoke specs.

---

## P1 — Security depth (open)

### 1. No Postgres Row-Level Security (RLS)
- **Gap:** Tenant isolation lives entirely in application code — every
  Prisma query must remember to filter by `tenantId`. One forgotten filter
  is a silent cross-tenant data leak.
- **Impact:** The single largest data-breach risk in a multi-tenant SaaS.
  Consciously deferred (documented in `GAP_RESOLUTION.md`) and still open.
- **Recommendation:** Enable RLS on tenant-scoped tables (`Project`,
  `Task`, `Comment`, …) with policies keyed on
  `current_setting('app.tenant_id')`, set via a Prisma client extension
  that wraps each request in a transaction issuing
  `SET LOCAL app.tenant_id = ...`. Roll out table-by-table; the existing
  `tenantIsolation.int.test.ts` suite verifies each step.

### 2. No 2FA/MFA, OAuth login, or SSO
- **Gap:** Authentication is email + password only (the unsupported "SSO"
  marketing claim was removed earlier).
- **Impact:** Business customers ask for 2FA and SSO early in evaluation.
- **Recommendation (in order of effort):** TOTP 2FA (`otplib`, a
  `totpSecret` column, verify step in `loginService`), then Google OAuth
  (OIDC), then full SSO (SAML/OIDC) only when a concrete customer requires
  it.

---

## P2 — Architecture limits (open)

### 3. One user is limited to one workspace
- **Gap:** The globally unique email model means a user cannot belong to
  two organizations, and there is no workspace switcher.
- **Impact:** Blocks a common real-world case — a consultant or agency
  member invited into a client's workspace.
- **Recommendation:** The largest refactor on this list: split `User` into
  a global `Account` (email + password) and per-tenant `Membership` (role,
  `isActive`). JWT carries `accountId` plus the active `tenantId`; add a
  workspace-switcher endpoint and UI. Plan as its own milestone — the
  invite and login services are the main touchpoints.

### 4. Production deployment has not been executed
- **Gap:** `docker-compose.yml`, both Dockerfiles, and CI (including the
  new E2E job) exist, but the application has never been deployed to a
  production environment.
- **Impact:** The production configuration path (managed Postgres, S3
  storage, transactional email, Stripe keys, `prisma migrate deploy`) is
  unproven until a real deploy runs.
- **Recommendation:** Provision hosting (e.g. Vercel for `client/`,
  Railway or Fly for `server/`, Neon for Postgres), set
  `STORAGE_DRIVER=s3`, and wire real provider keys (Resend, Stripe test
  mode). Blocked only on account credentials, not code.

---

## P3 — Product feature gaps (vs. Trello / Asana / Linear)

These are absent entirely; prioritize based on target users:

| Feature | Notes |
| --- | --- |
| **Labels/tags on tasks** | Not yet in the Prisma schema. Add a `Label` model plus a `TaskLabel` join and filter chips on the board. Best effort-to-value ratio in this table. |
| **Board filtering/sorting** | Filter by assignee, priority, label, or due date — pairs naturally with labels. |
| **Reporting/analytics** | No burndown, throughput, or per-member workload views. A "tasks completed per week" chart on the dashboard is a good start. |
| **Rich-text comments** | Comments are plain text; no formatting or inline images. Consider Tiptap with a strict sanitizer. |
| **Recurring tasks / templates** | Not implemented. |
| **Time tracking, Gantt/timeline view** | Not implemented. |
| **Integrations** | No Slack/GitHub notifications, outgoing webhooks, or public API tokens. Per-tenant outgoing webhooks is the cheapest first step. |
| **Dark mode** | No `dark:` classes in the codebase. Mostly mechanical with Tailwind; cheaper to do before the UI grows further. |
| **i18n** | No translation layer (relevant if a Bangla localization is planned). `next-intl` fits the App Router. |

---

## P4 — Ops & documentation polish (open)

### 5. No OpenAPI/Swagger specification
- API documentation is hand-written markdown (`API_LIST.md`) that will
  drift from the code. Generate a spec from the existing Zod schemas
  (`zod-to-openapi`) and serve Swagger UI at `/api/docs`.

### 6. No backup/restore or disaster-recovery documentation
- Document the `pg_dump`/restore procedure (or Neon's point-in-time
  recovery) and test it once.

### 7. No load testing
- The socket layer and the board-reorder endpoint have never been
  benchmarked. A short k6 script against `docker compose` would establish
  a baseline.

---

## Suggested sequencing

1. **Deploy (#4)** as soon as hosting credentials are available — it is
   independent of everything else and de-risks the rest.
2. **RLS (#1)** — the remaining security-depth item; the integration suite
   is in place to verify each table's rollout.
3. **TOTP 2FA (#2, first step)** — small, self-contained, high perceived
   value.
4. **Then choose:** multi-workspace (#3) if pursuing real SaaS adoption, or
   labels + filtering + reporting (P3) if polishing the product demo.
