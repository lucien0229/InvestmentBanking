import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("generated API contract declares the Reference Deal seam and stable problem media type", () => {
  const contract = JSON.parse(fs.readFileSync("contracts/openapi.json", "utf8")) as {
    servers: Array<{ url: string }>;
    paths: Record<string, { get?: { responses?: Record<string, { content?: Record<string, unknown> }> }; post?: { responses?: Record<string, { content?: Record<string, unknown> }> } }>;
    components: { schemas: Record<string, { properties?: Record<string, unknown> }> };
  };
  assert.deepEqual(contract.servers, [{ url: "/" }]);
  assert.ok(contract.paths["/api/v1/session/bootstrap"]);
  assert.ok(contract.paths["/api/v1/deals/{deal_id}/overview"]?.get);
  assert.ok(contract.paths["/api/v1/deals/{deal_id}/overview"]?.get?.responses?.["200"]?.content?.["application/json"]);
  assert.ok(contract.paths["/api/v1/deals/{deal_id}/overview"]?.get?.responses?.["404"]?.content?.["application/problem+json"]);
  assert.ok(contract.paths["/api/v1/deals/{deal_id}/reference-jobs"]?.post);
  assert.ok(contract.paths["/api/v1/jobs/{job_id}"]?.get);
  assert.ok(contract.paths["/api/v1/jobs/{job_id}/events"]?.get?.responses?.["200"]?.content?.["text/event-stream"]);
  assert.ok(contract.components.schemas.Job.properties?.scope);
  assert.ok(contract.components.schemas.Problem.properties?.code);
  assert.ok(contract.components.schemas.DealOverviewProjection.properties?.authorization);
});

test("generated API contract declares the isolated Project Northstar synthetic proof seam", () => {
  const contract = JSON.parse(fs.readFileSync("contracts/openapi.json", "utf8")) as {
    paths: Record<string, { get?: unknown; post?: unknown }>;
    components: { schemas: Record<string, { properties?: Record<string, unknown> }> };
  };
  assert.ok(contract.paths["/api/v1/public/project-northstar"]?.get);
  assert.ok(contract.paths["/api/v1/public/project-northstar/sessions"]?.post);
  assert.ok(contract.paths["/api/v1/public/project-northstar/sessions/{session_id}/observations"]?.post);
  assert.ok(contract.paths["/api/v1/public/project-northstar/sessions/{session_id}/artifact-inspections"]?.post);
  assert.ok(contract.paths["/api/v1/public/project-northstar/sessions/{session_id}/revisions"]?.post);
  assert.ok(contract.paths["/api/v1/public/project-northstar/artifacts/{artifact_id}/download"]?.get);
  assert.ok(contract.components.schemas.SyntheticProof.properties?.real_uploads_allowed);
  assert.ok(contract.components.schemas.SyntheticArtifactMetadata.properties?.sha256);
  assert.ok(contract.components.schemas.SyntheticProofObservation);
});

test("generated API contract declares source intake protected Source intake and Object Gateway seams", () => {
  const contract = JSON.parse(fs.readFileSync("contracts/openapi.json", "utf8")) as {
    paths: Record<string, { get?: any; post?: any; patch?: any }>;
    components: { schemas: Record<string, any> };
  };
  assert.ok(contract.paths["/api/v1/deals/{deal_id}/upload-sessions"]?.post);
  assert.ok(contract.paths["/api/v1/upload-sessions/{upload_session_id}/files/{file_id}"]?.patch);
  assert.ok(contract.paths["/api/v1/upload-sessions/{upload_session_id}/finalizations"]?.post);
  assert.ok(contract.paths["/api/v1/deals/{deal_id}/source-materials/{source_material_id}/record-acceptances"]?.post);
  assert.ok(contract.paths["/objects/{protected_object_id}"]?.get);
  assert.equal(contract.paths["/api/v1/upload-sessions/{upload_session_id}/files/{file_id}"]?.patch?.parameters?.some((p: any) => /authorization|cookie|token/i.test(p.name)), false);
  assert.equal(contract.components.schemas.UploadSessionCreate.properties.purpose.const, "source_intake");
  assert.ok(contract.components.schemas.UploadSessionCreate.required.includes("operation_preview_id"));
  assert.equal(contract.components.schemas.UploadSessionCreate.properties.files.maxItems, 50);
  assert.equal(contract.paths["/api/v1/upload-sessions/{upload_session_id}/cancellations"]?.post?.parameters?.some((p: any) => p.name === "If-Match" || p.$ref === "#/components/parameters/IfMatch"), true);
  assert.equal(contract.components.schemas.ObjectGrant.properties.operation.const, "read");
  assert.ok(contract.components.schemas.SourceRecord.required.includes("limitations"));
});
