-- Rollback for add-performance-indexes.sql — 2026-07-10
--
-- DROP INDEX CONCURRENTLY, like CREATE INDEX CONCURRENTLY, cannot run
-- inside a transaction block. Run this file with autocommit on — do not
-- wrap it in BEGIN/COMMIT.

DROP INDEX CONCURRENTLY IF EXISTS idx_session_observations_school_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_session_observations_mentor_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_session_observations_teacher_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_session_observations_pathway_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_session_observations_date_of_visit;

DROP INDEX CONCURRENTLY IF EXISTS idx_device_audits_school_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_device_audits_audit_date;

DROP INDEX CONCURRENTLY IF EXISTS idx_teachers_school_id;

DROP INDEX CONCURRENTLY IF EXISTS idx_pathway_progress_school_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_pathway_progress_pathway;

DROP INDEX CONCURRENTLY IF EXISTS idx_flags_school_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_flags_flagged_at;

DROP INDEX CONCURRENTLY IF EXISTS idx_star_club_evaluations_school_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_star_club_evaluations_created_at;

DROP INDEX CONCURRENTLY IF EXISTS idx_mentor_visits_school_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_mentor_visits_mentor_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_mentor_visits_created_at;
