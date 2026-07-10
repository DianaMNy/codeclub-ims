-- Performance indexes for Code Club IMS — 2026-07-10
--
-- Forward-looking: these tables gain roughly one row per field visit,
-- device audit, or flag/evaluation action, and today only their primary
-- keys are indexed (verified via pg_indexes) — every join/filter column
-- below does a full table scan. Small now; won't stay that way.
--
-- CREATE INDEX CONCURRENTLY does not take the write-blocking lock a plain
-- CREATE INDEX does, so this is safe to run against the live DB — but it
-- CANNOT run inside a transaction block. Run this file with autocommit on
-- (plain `psql -f`, or a client that doesn't wrap statements in BEGIN/COMMIT
-- for you) — do not wrap it in a transaction.
--
-- Column names were verified directly against the live schema
-- (information_schema.columns) and the route handlers that actually query
-- them, not assumed from the table name — several differ from the naming
-- in the original brief; each substitution is called out inline.

-- ── session_observations (biggest future grower) ───────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_observations_school_id
  ON session_observations (school_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_observations_mentor_id
  ON session_observations (mentor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_observations_teacher_id
  ON session_observations (teacher_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_observations_pathway_id
  ON session_observations (pathway_id);
-- date_of_visit, not created_at: routes/visits.js sorts on it directly
-- (`ORDER BY so.date_of_visit DESC`, twice). created_at also exists on
-- this table but no query filters or sorts on it.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_observations_date_of_visit
  ON session_observations (date_of_visit);

-- ── device_audits ───────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_audits_school_id
  ON device_audits (school_id);
-- audit_date, not created_at: routes/deviceAudits.js sorts
-- `ORDER BY da.audit_date DESC, da.created_at DESC` — audit_date is the
-- leading sort key and the one that matters for a single-column index.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_audits_audit_date
  ON device_audits (audit_date);

-- ── teachers ─────────────────────────────────────────────────────────────
-- mentor_id skipped: teachers has no mentor_id column. The mentor
-- relationship goes through schools_and_centres.mentor_id, joined via
-- school_id (see routes/teachers.js) — already covered by the index below.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teachers_school_id
  ON teachers (school_id);

-- ── pathway_progress ─────────────────────────────────────────────────────
-- Column is `pathway` (varchar code such as 'scratch', 'python'), not
-- `pathway_id` — there is no pathway_id column on this table.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pathway_progress_school_id
  ON pathway_progress (school_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pathway_progress_pathway
  ON pathway_progress (pathway);

-- ── flags ────────────────────────────────────────────────────────────────
-- Column is `flagged_at`, not `created_at` — flags has no created_at
-- column. flagged_at is set on insert and is what routes/flags.js sorts
-- by (`ORDER BY f.flagged_at DESC`).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flags_school_id
  ON flags (school_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flags_flagged_at
  ON flags (flagged_at);

-- ── star_club_evaluations ─────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_star_club_evaluations_school_id
  ON star_club_evaluations (school_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_star_club_evaluations_created_at
  ON star_club_evaluations (created_at);

-- ── mentor_visits ──────────────────────────────────────────────────────────
-- NOTE: as of this writing, no route under backend/src/routes references
-- mentor_visits — it exists in the schema with exactly the requested
-- columns but appears to be an unused/legacy table (or a not-yet-wired
-- feature). Indexed anyway per the forward-looking brief; worth confirming
-- with the team whether it's still needed.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mentor_visits_school_id
  ON mentor_visits (school_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mentor_visits_mentor_id
  ON mentor_visits (mentor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mentor_visits_created_at
  ON mentor_visits (created_at);

-- ── Update planner stats ───────────────────────────────────────────────
ANALYZE session_observations;
ANALYZE device_audits;
ANALYZE teachers;
ANALYZE pathway_progress;
ANALYZE flags;
ANALYZE star_club_evaluations;
ANALYZE mentor_visits;
