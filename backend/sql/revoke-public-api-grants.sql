-- ============================================================
-- INCIDENT & FIX RECORD — 2026-07-10
-- ============================================================
-- FINDING: The DB SECURITY test section revealed that the anon and
-- authenticated Postgres roles held FULL table grants (SELECT, INSERT,
-- UPDATE, DELETE, and even TRUNCATE) on public schema tables. This meant
-- anyone with the project URL + anon key could read users (incl.
-- password_hash), password_reset_tokens, and chat_messages via the public
-- PostgREST REST API, and could insert/delete/truncate data.
--
-- ROOT CAUSE: Enabling RLS alone did not block access because these roles
-- retained direct table GRANTs. (Separately, the test .env briefly held a
-- service_role key, which bypasses RLS by design — corrected separately.)
--
-- FIX: Revoke all grants from anon/authenticated and prevent future tables
-- from auto-granting to them. Backend is unaffected (connects as postgres,
-- the table owner). Legacy JWT-based API keys were subsequently disabled.
-- Verified by test-suite.js DB SECURITY section: 23/23 passing.
-- ============================================================

-- Revoke all current access from the public-facing roles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Prevent FUTURE tables/sequences/functions from auto-granting to them
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;