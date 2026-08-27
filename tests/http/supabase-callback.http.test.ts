import assert from "node:assert/strict";
import test from "node:test";
import { buildApi } from "../../apps/api/src/app.js";
import type { AuthAdapter } from "../../apps/api/src/auth.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";

test("Supabase callback exchanges a bearer access token and keeps the pending posture", async () => {
  const database = await createTestDatabase();
  let verifiedToken = "";
  let registeredProviderToken = "";
  const auth: AuthAdapter = {
    requestMagicLink: async () => ({ status: "magic_link_sent" }),
    verifyMagicLink: async (token) => {
      verifiedToken = token;
      return { sessionToken: "pending-session-token-123456" };
    },
    registerPasskey: async (_sessionToken, providerToken) => {
      registeredProviderToken = providerToken ?? "";
    },
    authenticatePasskey: async () => undefined,
  };
  const api = await buildApi({ database, authMode: "supabase", authAdapter: auth });
  try {
    const verified = await api.inject({
      method: "POST",
      url: "/api/v1/session/bootstrap/verify",
      headers: { authorization: "Bearer provider-access-token" },
    });
    assert.equal(verified.statusCode, 200);
    assert.equal(verified.json().posture, "passkey_required");
    assert.match(verified.headers["set-cookie"] as string, /__Host-pending_passkey=pending-session-token-123456/);
    assert.equal(verifiedToken, "provider-access-token");

    const registered = await api.inject({
      method: "POST",
      url: "/api/v1/session/passkey/register",
      headers: {
        authorization: "Bearer provider-access-token",
        cookie: "__Host-pending_passkey=pending-session-token-123456",
      },
    });
    assert.equal(registered.statusCode, 201);
    assert.equal(registeredProviderToken, "provider-access-token");
  } finally {
    await api.close();
    await database.close();
  }
});
