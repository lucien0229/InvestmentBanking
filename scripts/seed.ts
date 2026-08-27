import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const client = new Client({ connectionString: process.env.MIGRATION_DATABASE_URL ?? "postgres://postgres:postgres@localhost:55432/investment_banking" });
await client.connect();
try {
  await client.query("DELETE FROM app.audit_event WHERE deal_id IN (SELECT id FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal'))");
  await client.query("DELETE FROM app.deal_workspace WHERE deal_id IN (SELECT id FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal'))");
  await client.query("DELETE FROM app.deal WHERE name IN ('Project Northstar', 'Other Deal')");
  await client.query(await fs.readFile(path.join(process.cwd(), "db/seed.sql"), "utf8"));
  console.log("db seed: reference fixtures ready");
} finally {
  await client.end();
}
