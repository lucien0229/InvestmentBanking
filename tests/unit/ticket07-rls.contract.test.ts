import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { createTestDatabase } from "../../apps/api/src/test-database.js";

test("Ticket 07 migration declares immutable public observations and Account template quarantine boundaries", async (t) => {
  const migration = await fs.readFile("db/migrations/0006-web-evidence-account-templates.sql", "utf8");
  for (const token of [
    "source.web_evidence_observation",
    "source.account_template_upload_session",
    "source.account_reusable_template",
    "source.account_reusable_template_version",
    "source.account_template_compatibility",
    "source.prevent_web_observation_mutation",
    "source.prevent_account_template_version_mutation",
    "web_evidence_observation_source_record_fk",
    "account_reusable_template",
    "public_https_capture",
  ]) assert.match(migration, new RegExp(token.replaceAll(".", "\\.")), token);

  const database = await createTestDatabase();
  t.after(() => database.close());
  const tables = await database.ownerPool.query<{ schema: string; name: string; forced: boolean }>(
    `SELECT n.nspname AS schema, c.relname AS name, c.relforcerowsecurity AS forced
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE (n.nspname='source' AND c.relname = ANY($1))
     ORDER BY n.nspname, c.relname`,
    [["web_evidence_observation", "account_template_upload_session", "account_reusable_template", "account_reusable_template_version", "account_template_compatibility"]],
  );
  assert.equal(tables.rows.length, 5);
  assert.ok(tables.rows.every((row) => row.forced));
  const owner = await database.ownerPool.query<{ owner_name: string; can_login: boolean; bypass: boolean }>(
    `SELECT r.rolname AS owner_name, r.rolcanlogin AS can_login, r.rolbypassrls AS bypass
     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner
     WHERE n.nspname='source' AND p.proname = ANY($1)`,
    [["create_web_evidence_observation", "create_account_template_upload_session", "create_account_reusable_template", "create_account_template_preflight"]],
  );
  assert.equal(owner.rows.length, 4);
  assert.ok(owner.rows.every((row) => row.owner_name === "app_source_owner" && !row.can_login && row.bypass));
});
