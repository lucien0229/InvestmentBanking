import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseAuthAdapter } from "../../apps/api/src/auth.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";

test("Supabase Auth identity is mapped to one product actor and requires passkey assurance", async () => {
  const database = await createTestDatabase();
  const fakeClient = {
    auth: {
      getUser: async (token: string) => ({ data: { user: { id: "supabase-user-01", email: "banker-a@example.test" } }, error: null, token }),
      getClaims: async (token: string) => ({ data: { claims: { amr: token === "passkey-token" ? [{ method: "passkey" }] : [{ method: "otp" }] } }, error: null }),
    },
  } as unknown as SupabaseClient;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-publishable-key";
  const adapter = new SupabaseAuthAdapter(database, fakeClient);
  try {
    const { sessionToken } = await adapter.verifyMagicLink("magic-link-access-token");
    await adapter.registerPasskey(sessionToken, "magic-link-access-token");
    await assert.rejects(() => adapter.authenticatePasskey(sessionToken, "magic-link-access-token"), { code: "passkey_required" });
    await adapter.authenticatePasskey(sessionToken, "passkey-token");
    const result = await database.withContext(sessionToken, "00000000-0000-4000-8000-000000000101", async (client) => {
      const overview = await client.query<{ name: string }>("SELECT name FROM app.deal WHERE id = $1", ["00000000-0000-4000-8000-000000000101"]);
      return overview.rows[0]?.name;
    });
    assert.deepEqual(result, { kind: "ok", value: "Project Northstar" });
  } finally {
    await database.close();
  }
});
