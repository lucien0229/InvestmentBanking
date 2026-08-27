import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.MIGRATION_DATABASE_URL ?? "postgres://postgres:postgres@localhost:55432/investment_banking";
const client = new Client({ connectionString });
await client.connect();
try {
  const migrationDir = path.join(process.cwd(), "db/migrations");
  const migrations = (await fs.readdir(migrationDir)).filter((name) => name.endsWith(".sql")).sort();
  for (const name of migrations) {
    await client.query(await fs.readFile(path.join(migrationDir, name), "utf8"));
    console.log(`db migration: ${name} applied`);
  }
} finally {
  await client.end();
}
