import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  "supabase/migrations/20260909180000_preparation_package_readiness.sql",
  "utf8",
);

test("preparation package migration defines immutable execution package snapshot and readiness projection", () => {
  assert.match(migration, /CREATE SCHEMA IF NOT EXISTS deal/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS deal\.execution_package/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS deal\.package_snapshot/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS deal\.package_snapshot_revision/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS projection\.package_readiness/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION deal\.create_package_snapshot/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION deal\.get_package_readiness/);
  assert.match(migration, /package_snapshot_immutable/);
  assert.match(migration, /not_stage_required/);
  assert.match(migration, /external_use_authorized.*false/s);
  assert.doesNotMatch(migration, /global_ready|readiness_score|percentage_ready/);
});

test("preparation package API exposes package, snapshot and exact readiness seams", () => {
  const source = fs.readFileSync("apps/api/src/preparation-package.ts", "utf8");
  for (const token of ["execution-packages", "package_id", "snapshots", "snapshot_id", "readiness"]) {
    assert.ok(source.includes(token), `missing API seam token: ${token}`);
  }
  assert.match(source, /readiness/i);
});
