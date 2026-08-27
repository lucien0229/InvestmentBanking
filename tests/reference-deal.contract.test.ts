import assert from "node:assert/strict";
import test from "node:test";
import { buildApi } from "../apps/api/src/app.js";
import { createTestDatabase } from "../apps/api/src/test-database.js";

const northstarDealId = "00000000-0000-4000-8000-000000000101";
const otherAccountDealId = "00000000-0000-4000-8000-000000000202";

test("a new Individual Banker completes Magic Link + mandatory Passkey and reads Project Northstar", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());

  const start = await api.inject({
    method: "POST",
    url: "/api/v1/session/bootstrap",
    payload: { email: "banker-a@example.test" },
  });
  assert.equal(start.statusCode, 202);
  const bootstrapToken = start.json().test_verification_token;
  assert.equal(typeof bootstrapToken, "string");

  const verified = await api.inject({
    method: "POST",
    url: "/api/v1/session/bootstrap/verify",
    payload: { token: bootstrapToken },
  });
  assert.equal(verified.statusCode, 200);
  const pendingCookie = verified.headers["set-cookie"];
  assert.ok(pendingCookie);

  const registered = await api.inject({
    method: "POST",
    url: "/api/v1/session/passkey/register",
    headers: { cookie: pendingCookie },
  });
  assert.equal(registered.statusCode, 201);
  assert.equal(registered.json().posture, "passkey_registered");

  const authenticated = await api.inject({
    method: "POST",
    url: "/api/v1/session/passkey/authenticate",
    headers: { cookie: pendingCookie },
  });
  assert.equal(authenticated.statusCode, 200);
  const bankerCookie = authenticated.headers["set-cookie"];
  assert.ok(bankerCookie);

  const overview = await api.inject({
    method: "GET",
    url: `/api/v1/deals/${northstarDealId}/overview`,
    headers: { cookie: bankerCookie },
  });
  assert.equal(overview.statusCode, 200);
  assert.equal(overview.headers["content-type"]?.split(";")[0], "application/json");
  const body = overview.json();
  assert.equal(body.deal.id, northstarDealId);
  assert.equal(body.deal.name, "Project Northstar");
  assert.equal(body.workspace.current_pointers.overview_revision_id, "northstar-overview-r1");
  assert.equal(body.displayed_state.stage, "Preparation");
  assert.equal(body.displayed_state.materiality, "synthetic_reference_fixture");

  const audit = await api.inject({
    method: "GET",
    url: `/api/v1/account/audit-events?deal_id=${northstarDealId}`,
    headers: { cookie: bankerCookie },
  });
  assert.equal(audit.statusCode, 200);
  assert.ok(audit.json().events.some((event: { code: string }) => event.code === "deal_overview_read"));
  assert.equal(JSON.stringify(audit.json()).includes("Project Northstar"), false);
});

test("cross-Account and cross-Deal reads return the same non-enumerating 404 problem", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());

  const cookie = await database.seedAuthenticatedSession("banker-a@example.test");
  const responses = await Promise.all([
    api.inject({
      method: "GET",
      url: `/api/v1/deals/${otherAccountDealId}/overview`,
      headers: { cookie },
    }),
    api.inject({
      method: "GET",
    url: "/api/v1/deals/00000000-0000-4000-8000-000000000404/overview",
      headers: { cookie },
    }),
  ]);

  for (const response of responses) {
    assert.equal(response.statusCode, 404);
    assert.equal(response.headers["content-type"]?.split(";")[0], "application/problem+json");
    assert.deepEqual(response.json(), {
      type: "https://investment-banking.local/problems/resource-not-found",
      title: "Resource not found",
      status: 404,
      code: "resource_not_found",
      detail: "The requested resource is not available.",
      instance: response.json().instance,
      outcome: "rejected",
      retryable: false,
      recovery_action: "return_to_safe_parent",
    });
  }
});

test("ordinary Deal access is denied until the current session has a registered Passkey", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());
  const cookie = await database.seedMagicLinkOnlySession("banker-a@example.test");

  const response = await api.inject({
    method: "GET",
    url: `/api/v1/deals/${northstarDealId}/overview`,
    headers: { cookie },
  });
  assert.equal(response.statusCode, 403);
  assert.equal(response.headers["content-type"]?.split(";")[0], "application/problem+json");
  assert.equal(response.json().code, "passkey_required");
});
