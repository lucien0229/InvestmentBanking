import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const generated = path.join(root, "packages/contracts/generated/openapi.ts");
const result = spawnSync(process.execPath, [path.join(root, "scripts/generate-contract.mjs")], { stdio: "inherit" });
if (result.status !== 0 || !fs.existsSync(generated)) process.exit(result.status ?? 1);
const text = fs.readFileSync(generated, "utf8");
const contract = JSON.parse(fs.readFileSync(path.join(root, "contracts/openapi.json"), "utf8"));
const paths = Object.keys(contract.paths ?? {});
const serverUrl = contract.servers?.[0]?.url ?? "";
if (serverUrl.endsWith("/api/v1") && paths.some((entry) => entry.startsWith("/api/v1/"))) {
  console.error("OpenAPI server base duplicates the versioned route prefix.");
  process.exit(1);
}
if (!paths.includes("/api/v1/deals/{deal_id}/overview") || !text.includes("application/problem+json")) {
  console.error("Generated contract is missing the Reference Deal seam.");
  process.exit(1);
}
console.log("contract check: ok");
