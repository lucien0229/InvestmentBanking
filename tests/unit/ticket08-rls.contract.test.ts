import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { createTestDatabase } from "../../apps/api/src/test-database.js";

test("Ticket 08 migration declares immutable packet, objective, ceiling, and condition boundaries", async (t) => {
  const migration = await fs.readFile("db/migrations/0007-source-packet-output-ceiling.sql", "utf8");
  for (const token of [
    "source.source_packet",
    "source.source_packet_version",
    "source.source_packet_member",
    "app.work_objective",
    "app.output_ceiling_assessment",
    "source.source_condition_assessment",
    "source.prevent_source_packet_version_mutation",
    "source.get_source_packet_projection",
  ]) assert.match(migration, new RegExp(token.replaceAll(".", "\\.")), token);
  const idempotencyMigration = await fs.readFile("db/migrations/0012-source-packet-command-idempotency.sql", "utf8");
  assert.match(idempotencyMigration, /source\.source_packet_command_idempotency/);
  assert.match(idempotencyMigration, /ticket08_command_replay/);

  const contract = await fs.readFile("contracts/openapi.json", "utf8");
  for (const token of ["/api/v1/deals/{deal_id}/source-packets", "create_source_packet_version", "get_source_packet_version", "create_work_objective", "create_source_condition_assessment", "create_source_rights_assessment", "SourcePacketVersionCreate", "WorkObjectiveCreate"]) assert.match(contract, new RegExp(token.replace(/[{}]/g, "\\$&")), token);

  const database = await createTestDatabase();
  t.after(() => database.close());
  const tables = await database.ownerPool.query<{ schema: string; name: string; forced: boolean }>(
    `SELECT n.nspname AS schema, c.relname AS name, c.relforcerowsecurity AS forced
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE (n.nspname, c.relname) IN (('source','source_packet'),('source','source_packet_version'),('source','source_packet_member'),('app','work_objective'),('app','output_ceiling_assessment'),('source','source_condition_assessment'),('source','source_packet_command_idempotency'))
     ORDER BY n.nspname, c.relname`,
  );
  assert.equal(tables.rows.length, 7);
  assert.ok(tables.rows.every((row) => row.forced));
});
