# TaskFlow — Backup, Restore & Disaster Recovery

What needs protecting, how to back it up, and how to get back to a working
state. Two stores matter:

1. **Postgres** — all application data (tenants, users, projects, tasks,
   comments, billing rows, audit log).
2. **Attachment files** — S3 bucket in production (`STORAGE_DRIVER=s3`);
   the local `uploads/` directory only in development.

Everything else (code, config, migrations) lives in git.

---

## 1. Postgres

### Option A — Neon point-in-time restore (primary, if hosted on Neon)

Neon keeps a continuous WAL history, so any moment inside the retention
window can be restored without ever having taken a manual dump.

- **Restore:** Neon console → the project → *Restore* (branch to a
  timestamp). This creates a branch of the database as it was at that
  moment. Point `DATABASE_URL`/`DIRECT_URL` at the new branch's connection
  string, restart the server, verify, then promote/clean up.
- **Check your retention window** (plan-dependent; days on free tiers) and
  treat anything older as gone unless you also keep dumps (Option B).
- Test databases (`taskflow_test`, `taskflow_shadow`) need no backups —
  they are disposable by design.

### Option B — `pg_dump` (works everywhere, keeps long-term copies)

Take a compressed, consistent snapshot (use the **direct**, non-pooler URL):

```bash
pg_dump "$DIRECT_URL" --format=custom --no-owner --file=taskflow-$(date +%F).dump
```

Restore into an **empty** database:

```bash
createdb taskflow_restore            # or create it in the Neon console
pg_restore --dbname="$RESTORE_URL" --no-owner --clean --if-exists taskflow-$(date +%F).dump
```

Recommended cadence until a managed scheduler exists: nightly dump from a
cron/CI job, retained 14–30 days, stored outside the database provider
(e.g. an S3 bucket with lifecycle rules). Never commit dumps to git — they
contain user data and password hashes.

### After any restore

```bash
cd server && npx prisma migrate deploy   # no-op if the dump is current; applies newer migrations otherwise
```

Then verify: `GET /health/ready` returns `db: ok`, a test login works, and
a board loads with its tasks.

---

## 2. Attachments (S3)

- Enable **bucket versioning** so deleted/overwritten files are
  recoverable.
- Optionally add cross-region replication or a lifecycle copy to a second
  bucket for real DR.
- The `Attachment` table stores object keys — DB and bucket restores must
  come from roughly the same point in time or you'll have rows pointing at
  missing objects (harmless but ugly: downloads 404).
- Development's local `uploads/` is explicitly not durable (the server
  warns about this in production); nothing to back up there.

---

## 3. Disaster-recovery drill (run once, then yearly)

A backup that has never been restored is a hope, not a backup.

1. Take a fresh dump (Option B) or pick a Neon restore point.
2. Restore into a scratch database/branch.
3. Point a locally-running server at it (`DATABASE_URL`/`DIRECT_URL`).
4. Log in as a real account, open a project board, download one
   attachment.
5. Record how long steps 1–4 took — that duration is your actual RTO.

**Targets to aim for:** RPO (max acceptable data loss) — minutes with Neon
PITR, ≤24 h with nightly dumps. RTO (time to restore) — under an hour.

---

## 4. Secrets

`JWT_SECRET` / `JWT_REFRESH_SECRET` and provider keys are not in the
database. Keep them in the hosting platform's secret store; losing them
does not lose data, but rotating `JWT_*` invalidates all sessions (users
just log in again).
