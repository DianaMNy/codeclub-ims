-- Enables RLS on the 9 remaining tables — 2026-07-09
-- No policies defined = deny ALL access except the table owner
-- (our backend's postgres connection). Locks out the public REST API.
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecosystem_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE heads_of_school ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_observations ENABLE ROW LEVEL SECURITY;