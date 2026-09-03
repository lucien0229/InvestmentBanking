import fs from "node:fs/promises";
import path from "node:path";

const roots = ["apps", "packages", "scripts", "supabase/migrations", "tests", "deploy", ".github"];
const ignoredNames = new Set(["node_modules", ".git", ".next", "output", ".local-protected-storage"]);
const deliveryWord = ["t", "icket"].join("");
const identifierPattern = new RegExp(`${deliveryWord}\\s*[-_ ]?\\d+`, "i");
const ignoredFiles = new Set([path.resolve("scripts/check-domain-identifiers.mjs")]);

async function walk(current) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredNames.has(entry.name)) continue;
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

const violations = [];
for (const root of roots) {
  const absoluteRoot = path.resolve(root);
  for (const file of await walk(absoluteRoot)) {
    if (ignoredFiles.has(path.resolve(file))) continue;
    const text = await fs.readFile(file, "utf8");
    if (identifierPattern.test(file) || identifierPattern.test(text)) violations.push(path.relative(process.cwd(), file));
  }
}

if (violations.length > 0) {
  console.error("domain identifier check failed:");
  for (const file of violations.sort()) console.error(`- ${file}`);
  process.exit(1);
}

console.log("domain identifier check: no delivery-number identifiers in implementation paths");
