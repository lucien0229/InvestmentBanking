import fs from "node:fs/promises";
import path from "node:path";

const migrationDir = path.join(process.cwd(), "supabase/migrations");
const entries = (await fs.readdir(migrationDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort();

const versions = new Set();
for (const name of entries) {
  const match = /^(\d{14})_([a-z0-9_]+)\.sql$/.exec(name);
  if (!match) throw new Error(`invalid migration filename: ${name}; expected YYYYMMDDHHmmss_description.sql`);
  const [, version] = match;
  if (versions.has(version)) throw new Error(`duplicate migration version: ${version}`);
  versions.add(version);
}

for (let index = 1; index < entries.length; index += 1) {
  const previous = entries[index - 1].slice(0, 14);
  const current = entries[index].slice(0, 14);
  if (current <= previous) throw new Error(`migration versions are not strictly increasing: ${previous}, ${current}`);
}

console.log(`migration validation: ${entries.length} files, unique ordered versions`);
