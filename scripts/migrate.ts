import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

if (process.env.APP_ENV === "production" || process.env.SUPABASE_PROJECT_REF || process.env.SUPABASE_DB_URL) {
  throw new Error("scripts/migrate.ts is local-test-only; use the Supabase CLI release migration job for remote environments");
}

const connectionString = process.env.MIGRATION_DATABASE_URL ?? "postgres://postgres:postgres@localhost:55432/investment_banking";
const client = new Client({ connectionString });
await client.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.app_local_migration_history (
      version text PRIMARY KEY,
      name text NOT NULL,
      sha256 text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const migrationDir = path.join(process.cwd(), "supabase/migrations");
  const migrations = (await fs.readdir(migrationDir)).filter((name) => name.endsWith(".sql")).sort();
  const applied = await client.query<{ version: string; name: string; sha256: string }>(
    "SELECT version, name, sha256 FROM public.app_local_migration_history",
  );
  const appliedByVersion = new Map(applied.rows.map((row) => [row.version, row]));

  for (const name of migrations) {
    const match = /^(\d{14})_[a-z0-9_]+\.sql$/.exec(name);
    if (!match) throw new Error(`invalid migration filename: ${name}`);
    const version = match[1];
    const sql = await fs.readFile(path.join(migrationDir, name), "utf8");
    const sha256 = createHash("sha256").update(sql).digest("hex");
    const previous = appliedByVersion.get(version);
    if (previous) {
      if (previous.name !== name || previous.sha256 !== sha256) {
        throw new Error(`migration drift detected for ${version}: history=${previous.name}/${previous.sha256}, file=${name}/${sha256}`);
      }
      console.log(`db migration: ${name} already applied`);
      continue;
    }

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO public.app_local_migration_history(version, name, sha256) VALUES ($1, $2, $3)",
        [version, name, sha256],
      );
      await client.query("COMMIT");
      console.log(`db migration: ${name} applied`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.end();
}
