import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
if (process.env.APP_ENV === "production" || process.env.SUPABASE_PROJECT_REF || process.env.SUPABASE_DB_URL) {
  throw new Error("scripts/seed.ts is local-test-only and must never run against a remote or production database");
}
const client = new Client({ connectionString: process.env.MIGRATION_DATABASE_URL ?? "postgres://postgres:postgres@localhost:55432/investment_banking" });
await client.connect();
try {
  await client.query("DELETE FROM jobs.job_event WHERE deal_id IN (SELECT id FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal'))");
  await client.query("DELETE FROM jobs.job_scope_deal WHERE deal_id IN (SELECT id FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal'))");
  await client.query("DELETE FROM jobs.job_scope WHERE deal_id IN (SELECT id FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal'))");
  await client.query("DELETE FROM jobs.job_lease WHERE deal_id IN (SELECT id FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal'))");
  await client.query("DELETE FROM jobs.job_attempt WHERE deal_id IN (SELECT id FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal'))");
  await client.query("DELETE FROM jobs.job_step WHERE deal_id IN (SELECT id FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal'))");
  await client.query("DELETE FROM commerce.usage_ledger_entry WHERE deal_id IN (SELECT id FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal'))");
  await client.query("DELETE FROM commerce.usage_reservation WHERE deal_id IN (SELECT id FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal'))");
  await client.query("DELETE FROM jobs.transactional_outbox WHERE deal_id IN (SELECT id FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal'))");
  await client.query("DELETE FROM jobs.idempotency_record WHERE account_id IN (SELECT id FROM app.account WHERE display_name IN ('Northstar Banker Account', 'Other Banker Account'))");
  await client.query("DELETE FROM jobs.job WHERE deal_id IN (SELECT id FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal'))");
  await client.query("DELETE FROM app.audit_event WHERE deal_id IN (SELECT id FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal'))");
  await client.query("DELETE FROM app.deal_workspace WHERE deal_id IN (SELECT id FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal'))");
  await client.query("DELETE FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal')");
  await client.query(await fs.readFile(path.join(process.cwd(), "supabase/seed.sql"), "utf8"));
  console.log("db seed: reference fixtures ready");
} finally {
  await client.end();
}
