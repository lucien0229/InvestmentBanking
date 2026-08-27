import crypto from "node:crypto";
import fs from "node:fs";
import pg from "pg";

const { Pool } = pg;

export type Queryable = Pick<pg.PoolClient, "query" | "release">;

export class Database {
  readonly pool: pg.Pool;

  constructor(options: { connectionString?: string } = {}) {
    const connectionString = options.connectionString ?? process.env.DATABASE_URL;
    if (process.env.APP_ENV === "production" && !connectionString) throw new Error("DATABASE_URL is required in production");
    const sslCaFile = process.env.DATABASE_SSL_CA_FILE;
    const ssl = sslCaFile ? { ca: fs.readFileSync(sslCaFile, "utf8") } : undefined;
    this.pool = new Pool({ connectionString: connectionString ?? "postgres://app_runtime:app_runtime_dev@localhost:55432/investment_banking", ...(ssl ? { ssl } : {}) });
  }

  async withContext<T>(sessionToken: string, dealId: string | null, fn: (client: pg.PoolClient, context: { accountId: string; actorId: string; passkeyVerified: boolean; mode: string }) => Promise<T>): Promise<{ kind: "invalid" } | { kind: "not_found" } | { kind: "passkey_required" } | { kind: "ok"; value: T }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const sessionHash = hashToken(sessionToken);
      const result = await client.query<{ account_id: string; actor_id: string; passkey_verified: boolean; mode: string }>("SELECT * FROM app.begin_request($1, $2)", [sessionHash, dealId]);
      if (result.rowCount === 0) {
        const base = await client.query<{ account_id: string; actor_id: string; passkey_verified: boolean; mode: string }>("SELECT * FROM app.begin_request($1, NULL)", [sessionHash]);
        await client.query("ROLLBACK");
        if (base.rowCount === 0) return { kind: "invalid" };
        if (!base.rows[0].passkey_verified) return { kind: "passkey_required" };
        return { kind: "not_found" };
      }
      const context = result.rows[0];
      if (!context.passkey_verified) {
        await client.query("ROLLBACK");
        return { kind: "passkey_required" };
      }
      const value = await fn(client, { accountId: context.account_id, actorId: context.actor_id, passkeyVerified: context.passkey_verified, mode: context.mode });
      await client.query("SELECT app.clear_request()");
      await client.query("COMMIT");
      return { kind: "ok", value };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async withPendingSession<T>(sessionToken: string, fn: (client: pg.PoolClient) => Promise<T>): Promise<T | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ account_id: string; actor_id: string; passkey_verified: boolean; mode: string }>("SELECT * FROM app.begin_request($1, NULL)", [hashToken(sessionToken)]);
      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }
      const value = await fn(client);
      await client.query("SELECT app.clear_request()");
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }

  static hashToken(value: string) { return hashToken(value); }
}

export function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
