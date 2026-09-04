import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/migrations/20260904010000_deterministic_analysis_loop.sql", "utf8");

test("deterministic Analysis persists typed, immutable and isolated lineage", () => {
  for (const table of ["normalized_financial_value", "calculation", "calculation_version", "calculation_input_fact", "calculation_input_assumption", "calculation_input_measure", "calculation_run", "calculation_check", "model", "model_version", "model_version_calculation", "model_version_fact", "model_version_assumption", "scenario", "scenario_version", "analysis", "analysis_version", "analysis_model_version", "analysis_scenario_version", "analysis_calculation_run", "analysis_fact", "analysis_assumption", "analysis_evidence", "analysis_state_assessment", "deterministic_validation_record"]) assert.match(migration, new RegExp(`analysis\\.${table}`), table);
  assert.match(migration, /CREATE ROLE app_analysis_owner[^;]*BYPASSRLS/);
  assert.match(migration, /ALTER TABLE analysis\.%I FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON ALL TABLES IN SCHEMA analysis FROM app_runtime/);
  assert.doesNotMatch(migration, /GRANT (?:INSERT|UPDATE|DELETE).*TO app_runtime/);
  assert.match(migration, /create_calculation_run/);
  assert.match(migration, /create_deterministic_validation/);
});
