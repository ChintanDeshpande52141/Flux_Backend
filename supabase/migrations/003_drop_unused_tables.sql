-- ============================================================
-- DROP UNUSED TABLES
-- ============================================================
-- credit_health: no write path exists anywhere in src/ (see TASK-031,
--   which removed the last reader, getCreditHealth). The GET
--   /analytics/credit-health endpoint always 404'd in practice.
-- ai_suggestions: no read or write path exists anywhere in src/.
--
-- Confirmed zero references to either table name in src/ before this
-- migration was added. Additive only — does not edit 001_init.sql or
-- 002_fix_schema_mismatches.sql.

DROP TABLE IF EXISTS credit_health;
DROP TABLE IF EXISTS ai_suggestions;
