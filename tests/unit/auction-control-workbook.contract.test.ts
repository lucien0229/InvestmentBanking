import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/migrations/20260909130000_auction_control_workbook.sql", "utf8");
const api = fs.readFileSync("apps/api/src/deliverables.ts", "utf8");
const runtime = fs.readFileSync("apps/api/src/workbook-runtime.ts", "utf8");
const ui = fs.readFileSync("apps/web/components/deal-control/workbooks.tsx", "utf8");

test("auction control workbook keeps a separate governed deliverable and template", () => {
  assert.match(migration, /auction_control_workbook/);
  assert.match(migration, /auction-control-1\.0\.0/);
  assert.match(migration, /build_auction_control_input/);
  assert.match(migration, /process\.get_buyer_candidate_projection/);
});

test("auction workbook API exposes scoped create and revision commands", () => {
  assert.match(api, /auction-control-workbooks/);
  assert.match(api, /create_auction_control_deliverable/);
  assert.match(api, /create_auction_control_revision/);
});

test("renderer and UI preserve native-reader identity and no aggregate readiness", () => {
  assert.match(runtime, /build_auction_control_workbook/);
  assert.match(runtime, /auction-control\.xlsx/);
  assert.match(ui, /Auction Control Workbook/);
  assert.match(ui, /No aggregate ready \/ OK score is calculated/);
});
