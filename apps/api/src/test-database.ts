import crypto from "node:crypto";
import pg from "pg";
import { Database, hashToken } from "./database.js";

export async function createTestDatabase() {
  const database = new Database();
  const owner = new pg.Pool({ connectionString: process.env.MIGRATION_DATABASE_URL ?? "postgres://postgres:postgres@localhost:55432/investment_banking" });
  const closeRuntime = database.close.bind(database);

  async function issueSession(email: string, passkey: boolean) {
    const emailDigest = hashToken(email);
    const magicToken = crypto.randomBytes(24).toString("base64url");
    const sessionToken = crypto.randomBytes(24).toString("base64url");
    await owner.query("SELECT * FROM app.issue_magic_link($1, $2)", [emailDigest, hashToken(magicToken)]);
    const verified = await owner.query("SELECT * FROM app.verify_magic_link($1, $2)", [hashToken(magicToken), hashToken(sessionToken)]);
    if (verified.rowCount !== 1) throw new Error("test session bootstrap failed");
    if (passkey) {
      await owner.query("SELECT app.register_passkey($1, $2)", [hashToken(sessionToken), hashToken(`test-credential:${email}`)]);
      await owner.query("SELECT app.authenticate_passkey($1)", [hashToken(sessionToken)]);
    }
    return { raw: sessionToken, cookie: `${passkey ? "__Host-banker_session" : "__Host-pending_passkey"}=${sessionToken}; Path=/` };
  }

  return Object.assign(database, {
    seedAuthenticatedSession: async (email: string) => (await issueSession(email, true)).cookie,
    seedMagicLinkOnlySession: async (email: string) => (await issueSession(email, false)).cookie,
    ownerPool: owner,
    close: async () => {
      await closeRuntime();
      await owner.end();
    },
  });
}
