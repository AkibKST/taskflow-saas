# TaskFlow — Gap Resolution

> Implementation log for the findings in `REQUIREMENTS_GAP_ANALYSIS.md`. Every
> item below is addressed in code; the original audit is preserved as the
> reference. Providers that need real credentials (email, Stripe, S3, Sentry,
> Redis) are wired behind env-var guards with safe fallbacks, so the app builds
> and runs without them and goes live the moment keys are set.

**Legend:** ✅ done · 🟡 done with a documented decision/limitation

---

## P0 — launch blockers

| Gap | Status | What was done | Key files |
| --- | --- | --- | --- |
| §2.1 Email is a console stub | ✅ | Real transport: Resend HTTP → SMTP (nodemailer, optional dep) → console fallback. Branded, HTML+text templates with escaping. Prod boot fails fast if no provider. | `utils/email.ts`, `utils/emailTemplates.ts`, `config/env.ts` |
| §2.2 Billing stub, no lifecycle | ✅ | Guarded Stripe provider (create/update/cancel subscription), webhook receiver (raw-body, signature-verified) syncing status/invoices, period-end downgrade job, sequential invoice numbers. | `billing.provider.ts`, `billing.webhook.ts`, `billing.service.ts`, `utils/invoiceNumber.ts` |
| §2.3 Plans/seats not enforced | ✅ | `assertSeatAvailable` on invite-create (counts pending), invite-accept, and reactivation; `assertCanDowngrade` pre-check on plan change; central entitlements module. | `utils/entitlements.ts`, `invite.service.ts`, `users/user.service.ts`, `billing.service.ts` |
| §2.4 Zero tests | ✅ | Vitest unit suite (17 tests) for security-relevant pure logic (mentions, invoice numbering, pagination clamps, template escaping) **plus an HTTP-level integration suite (30 tests) against a real Postgres**: auth flows, tenant isolation, org/project RBAC, invite lifecycle + seat caps, health/hardening. Runs in CI against a postgres service container; locally via `TEST_DATABASE_URL=... npm run test:integration`. The suite already caught two real bugs: the `InviteToken` table was missing from migrations (fresh deploys had no invites — fixed by `20260705000000_add_invite_token_and_indexes`), and same-second refresh-token issuance collided on the unique token column (fixed with a `jti` claim). | `src/utils/__tests__/*`, `src/test/integration/*`, `vitest.integration.config.ts`, `.github/workflows/ci.yml` |
| §2.5 No deployment story | ✅ | Multi-stage Dockerfiles (server + client), compose with one-shot `migrate` release step + Redis, `.dockerignore`; CI now installs at the workspace root, builds shared, generates Prisma, runs tests, and runs the full production build. Fixed the **broken prod build**: `@taskflow/shared` now compiles to JS (`main` was raw `.ts`, which `node` can't require). | `server/Dockerfile`, `client/Dockerfile`, `docker-compose.yml`, `shared/*`, `ci.yml` |

## P0/P1 — security

| Gap | Status | What was done | Key files |
| --- | --- | --- | --- |
| §3.1 Socket rooms unauthorized (cross-tenant leak) | ✅ | `PROJECT_JOIN` now runs the same tenant+membership check as REST (`checkProjectAccess`) before joining; denies + acks failure. | `socket/index.ts`, `utils/projectAccess.ts` |
| §3.2 `ProjectRole` decorative | ✅ | `requireProjectWriter` blocks project VIEWERs from task/comment writes; role surfaced from `requireProjectMember`. | `middleware/requireProjectWriter.ts`, task/comment routes |
| §3.3 Email verification never enforced | 🟡 | `requireVerifiedEmail` guard on invite-create/billing, gated by `REQUIRE_EMAIL_VERIFICATION` (off by default → non-breaking, opt-in policy). | `middleware/requireVerifiedEmail.ts` |
| §3.4 Same email in two tenants breaks login | 🟡 | Chose **global-unique email** (consistent with registration): invite-create/accept and profile now reject cross-tenant duplicates, so login-by-email is unambiguous. | `invite.service.ts`, `auth.service.ts` |
| §3.5 Deactivation/role change don't end live access | ✅ | `verifyToken` re-checks the DB every request (inactive → 401, authoritative role); deactivation/role change force-disconnect sockets and emit `SESSION_REVOKED` (client auto-logs-out). | `middleware/verifyToken.ts`, `socket/index.ts`, `users/user.service.ts`, `lib/socket.ts` |
| §3.6 Profile email change under-protected | ✅ | Email change now requires the current password, resets `emailVerifiedAt`, and re-issues verification. | `auth.service.ts`, `auth.model.ts` |
| §3.7 Proxy/infra hardening | ✅ | `trust proxy` (configurable, default in prod), body limit 10mb→256kb, optional Redis-backed shared rate-limit store, stricter auth/invite limiters retained. | `app.ts`, `config/env.ts` |
| §3.8 Defense-in-depth (audit log) | 🟡 | Append-only `AuditLog` for role/plan/deactivation/deletion/export events. (Postgres RLS deliberately deferred — it needs a per-request `SET tenant` and is risky to bolt on; documented.) | `utils/audit.ts`, schema |

## P1/P2 — functional gaps

| Gap | Status | What was done | Key files |
| --- | --- | --- | --- |
| `DUE_SOON` never fires | ✅ | Hourly job notifies assignees of tasks due ≤24h, once (`dueReminderSentAt`). | `jobs/notifyDueSoon.ts` |
| `MENTIONED` never fires | ✅ | `@mention` parsing (by email or name) against project members → MENTIONED notices. | `utils/mentions.ts`, `comment.service.ts` |
| Notification prefs ignored | ✅ | `createNotificationService` checks the recipient's preference per type. | `notification.service.ts` |
| Sub-tasks have no UI/limits | ✅ | Board lists top-level tasks; sub-task list endpoint; parent validation (one level). | `task.service.ts`, `task.route.ts` |
| No invite management | ✅ | List pending / revoke / resend endpoints + team-page UI. | `invite.*`, `app/team/page.tsx` |
| No search | ✅ | Access-filtered search across projects + tasks; header search box. | `modules/search/*`, `components/layout/GlobalSearch.tsx` |
| No attachments | ✅ | Storage abstraction (local disk / guarded S3), upload/download/delete endpoints, 25MB cap. | `utils/storage.ts`, `task/attachment.*` |
| No task activity history | ✅ | `TaskActivity` feed (status/priority/assignee/title/attachment changes) + endpoint. | `task/activity.service.ts` |
| Unpaginated lists | ✅ | Projects, notifications (with unread count), comments capped; shared pagination helper. | `utils/pagination.ts`, project/notification/comment services |
| No export / account deletion | ✅ | GDPR workspace export (JSON), workspace deletion (slug-confirmed), self-account erasure. | `modules/account/*` |

## Ops, scalability & quality (§5)

| Gap | Status | What was done | Key files |
| --- | --- | --- | --- |
| Presence doesn't scale | ✅ | Reference-counted presence, Redis-backed when `REDIS_URL` set (accurate across instances). | `socket/presence.ts` |
| In-process jobs duplicate under scale | ✅ | Postgres advisory-lock guard around every scheduled job + run-at-startup. | `utils/jobLock.ts`, `server.ts` |
| Logs-only observability | ✅ | Structured logger, request IDs (traced into error responses), guarded Sentry. | `utils/logger.ts`, `middleware/requestId.ts`, `utils/observability.ts` |
| No seed / DB ops | ✅ | Idempotent dev seed with demo login. | `prisma/seed.ts` |
| Client robustness gaps | ✅ | `error.tsx`, `loading.tsx`, `global-error.tsx`, edge `middleware.ts` route protection. | `client/app/*`, `client/middleware.ts` |

---

## New environment variables

All optional unless noted; see `server/.env.example` and `client/.env.example`.
`RESEND_API_KEY`/`SMTP_*`, `EMAIL_FROM`, `STRIPE_*`, `REDIS_URL`, `TRUST_PROXY`,
`JSON_BODY_LIMIT`, `STORAGE_DRIVER`/`S3_*`, `SENTRY_DSN`, `REQUIRE_EMAIL_VERIFICATION`.

## Running

```bash
npm ci
npm run build:shared          # compile the shared package (now required)
npm run db:migrate            # dev migrate; use prisma:migrate:deploy in prod
npm run db:seed               # optional demo data
npm run dev                   # server + client

# tests / build
npm test
npm run build

# docker
docker compose build
docker compose run --rm migrate
docker compose up -d
```
