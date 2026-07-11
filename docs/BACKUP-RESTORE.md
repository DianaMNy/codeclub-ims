# Database Backup & Restore — Code Club IMS

## Why

Supabase **Free tier has no automatic backups** — no daily snapshots, no
point-in-time recovery. If the database is dropped, corrupted, or wiped by
a bad migration, there is nothing to fall back on except whatever backup
we took ourselves. This runbook is that mechanism, and right now it's the
*only* one.

## How to back up

Run the script:

```powershell
$env:SUPABASE_DB_URL = "postgresql://postgres.xxxx:PASSWORD@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
.\backend\sql\backup-restore.ps1
```

Or run `pg_dump` directly, if you'd rather not use the script:

```powershell
pg_dump $env:SUPABASE_DB_URL --no-owner --no-privileges --format=plain --file=backend\sql\db-backups\codeclub-backup-2026-07-11.sql
```

**Where the connection string comes from**: Supabase dashboard → **Connect**
→ **Session pooler** (port **5432**). Copy that connection string and
substitute in the actual database password. Use the **Session pooler
specifically** — not the Transaction pooler (port 6543), which is what the
app itself uses at runtime (see `DATABASE_URL` in `backend/.env`).
`pg_dump` needs session-level features that PgBouncer's transaction
pooling mode doesn't support; a dump attempted through port 6543 will fail
or come out unusable.

**Where the backup goes**: `backend/sql/db-backups/`, named
`codeclub-backup-<YYYY-MM-DD>.sql`. This folder is listed in the repo
root's `.gitignore` (`backend/sql/db-backups/`) — **real data never hits
GitHub**. Don't move backups outside this folder into anywhere that isn't
similarly ignored.

## How to restore (verified 2026-07-11)

1. **Create a target database** to restore into — never restore directly
   over the live production database except in an actual emergency, and
   even then, prefer restoring into a fresh database first to confirm the
   dump is good before touching anything live.
2. Run:
   ```powershell
   psql <target-connection-string> -f backend\sql\db-backups\codeclub-backup-2026-07-11.sql
   ```
   or via the script: `.\backend\sql\backup-restore.ps1 -Restore -BackupFile backend\sql\db-backups\codeclub-backup-2026-07-11.sql`
   (with `$env:SUPABASE_DB_URL` pointed at the target database).
3. **Expect errors on Supabase-internal schemas** — `supabase_vault`,
   `vault.secrets`, `auth`, and similar. These come from objects Supabase
   itself manages and that a plain `pg_dump`/`psql` restore can't fully
   recreate outside a real Supabase project. **These errors are not data
   loss** — none of our application tables live in those schemas.
4. **Confirm success by row counts**, not by a clean exit code (`psql`
   will exit non-zero because of the harmless errors above — that's
   expected, not a failure signal on its own). As last verified on
   2026-07-11:
   - `schools_and_centres` = 126
   - `teachers` = 185
   - `mentors` = 21
   - `session_observations` = 21
   - etc. — spot-check whichever tables matter most for the situation at
     hand; if the counts on the restored database match the source, the
     restore succeeded.

## Cadence

- **Before any risky migration** (schema change, bulk data edit, RLS
  policy change) — always back up first.
- **On a regular schedule** — weekly, at minimum.
- **Store copies off-machine** — Google Drive, an external drive, or
  similar. A backup that lives only on the same machine as the database
  connection doesn't protect against machine loss/theft/failure.

## Note

Recommend EmpServe consider **Supabase Pro ($25/mo)** for automatic daily
backups and point-in-time recovery. This runbook is a solid manual
safety net, but it depends entirely on someone remembering to run it —
Pro's automatic backups would be a belt-and-suspenders addition on top of,
not a replacement for, this process.
