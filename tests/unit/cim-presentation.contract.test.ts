import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/migrations/20260909170000_cim_presentation.sql", "utf8");
const api = fs.readFileSync("apps/api/src/deliverables.ts", "utf8");
const runtime = fs.readFileSync("apps/api/src/workbook-runtime.ts", "utf8");
const supervisor = fs.readFileSync("services/office/supervisor.py", "utf8");
const ui = fs.readFileSync("apps/web/components/deal-control/workbooks.tsx", "utf8");

 test("CIM keeps a separate governed narrative deliverable and template", () => {
  assert.match(migration, /cim_presentation/);
  assert.match(migration, /cim-1\.0\.0/);
  assert.match(migration, /cim_content_draft/);
  assert.match(migration, /cim_lineage/);
  assert.match(migration, /cim-presentation-qc-1\.0\.0/);
  assert.match(migration, /e->>'source_record_id'=ref#>>'\{\}'/);
});

test("CIM API is Deal-scoped and idempotent through the canonical revision path", () => {
  assert.match(api, /\/cims/);
  assert.match(api, /create_cim_deliverable/);
  assert.match(api, /create_cim_revision/);
  assert.match(api, /cimDraft/);
});

test("CIM Native/Reader renderer, observer and UI preserve exact identity", () => {
  assert.match(runtime, /build_cim_presentation/);
  assert.match(runtime, /cim\.pptx/);
  assert.match(supervisor, /inspect_cim_presentation/);
  assert.match(ui, /CimSurface/);
  assert.match(ui, /Exact Native \/ Reader pair/);
  assert.match(ui, /QC-022/);
  assert.match(ui, /Confidential Information Memorandum/);
});
