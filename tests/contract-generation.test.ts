import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("generated API contract declares the Reference Deal seam and stable problem media type", () => {
  const contract = JSON.parse(fs.readFileSync("contracts/openapi.json", "utf8")) as {
    servers: Array<{ url: string }>;
    paths: Record<string, { get?: { responses?: Record<string, { content?: Record<string, unknown> }> } }>;
    components: { schemas: Record<string, { properties?: Record<string, unknown> }> };
  };
  assert.deepEqual(contract.servers, [{ url: "/" }]);
  assert.ok(contract.paths["/api/v1/session/bootstrap"]);
  assert.ok(contract.paths["/api/v1/deals/{deal_id}/overview"]?.get);
  assert.ok(contract.paths["/api/v1/deals/{deal_id}/overview"]?.get?.responses?.["200"]?.content?.["application/json"]);
  assert.ok(contract.paths["/api/v1/deals/{deal_id}/overview"]?.get?.responses?.["404"]?.content?.["application/problem+json"]);
  assert.ok(contract.components.schemas.Problem.properties?.code);
  assert.ok(contract.components.schemas.DealOverviewProjection.properties?.authorization);
});
