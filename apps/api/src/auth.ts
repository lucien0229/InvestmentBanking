import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Database, hashToken } from "./database.js";

export type AuthMode = "local" | "supabase";

export interface AuthAdapter {
  requestMagicLink(email: string): Promise<{ status: "magic_link_sent"; testVerificationToken?: string }>;
  verifyMagicLink(token: string): Promise<{ sessionToken: string }>;
  registerPasskey(sessionToken: string, providerToken?: string): Promise<void>;
  authenticatePasskey(sessionToken: string, providerToken?: string): Promise<void>;
  verifySensitiveSession(sessionToken: string, providerToken?: string): Promise<void>;
}

export class LocalAuthAdapter implements AuthAdapter {
  constructor(private readonly database: Database) {}

  async requestMagicLink(email: string): Promise<{ status: "magic_link_sent"; testVerificationToken?: string }> {
    const verificationToken = crypto.randomBytes(24).toString("base64url");
    await this.database.pool.query("SELECT * FROM app.issue_magic_link($1, $2)", [hashToken(email), hashToken(verificationToken)]);
    return { status: "magic_link_sent" as const, testVerificationToken: verificationToken };
  }

  async verifyMagicLink(token: string) {
    const sessionToken = crypto.randomBytes(24).toString("base64url");
    const result = await this.database.pool.query<{ session_token_hash: string }>("SELECT * FROM app.verify_magic_link($1, $2)", [hashToken(token), hashToken(sessionToken)]);
    if (result.rowCount !== 1) throw new AuthError("invalid_magic_link", "The authentication link is invalid or expired.");
    return { sessionToken };
  }

  async registerPasskey(sessionToken: string, _providerToken?: string) {
    const result = await this.database.pool.query<{ register_passkey: boolean }>("SELECT app.register_passkey($1, $2)", [hashToken(sessionToken), hashToken(`local-passkey:${sessionToken}`)]);
    if (result.rows[0]?.register_passkey !== true) throw new AuthError("authentication_required", "A verified Magic Link is required.");
  }

  async authenticatePasskey(sessionToken: string, _providerToken?: string) {
    const result = await this.database.pool.query<{ authenticate_passkey: boolean }>("SELECT app.authenticate_passkey($1)", [hashToken(sessionToken)]);
    if (result.rows[0]?.authenticate_passkey !== true) throw new AuthError("passkey_required", "Register the mandatory Passkey before ordinary product access.");
    await this.verifySensitiveSession(sessionToken);
  }

  async verifySensitiveSession(sessionToken: string) {
    if (process.env.APP_ENV === "production") throw new AuthError("passkey_required", "Local authentication is unavailable.");
    await this.database.withContext(sessionToken, null, async (client) => {
      await client.query("SELECT app.record_passkey_evidence($1,$2,$3)", [hashToken(sessionToken), new Date().toISOString(), `local-test:${hashToken(sessionToken)}`]);
    });
  }
}

/**
 * Production provider seam. Live Supabase execution is intentionally opt-in and
 * remains disabled until project URL, issuer, WebAuthn RP, and provider probes
 * are configured. No local route can silently downgrade to this adapter.
 */
export class SupabaseAuthAdapter implements AuthAdapter {
  private readonly client: SupabaseClient;

  constructor(private readonly database: Database, client?: SupabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new AuthError("provider_unavailable", "Supabase Auth is not configured for this runtime.");
    this.client = client ?? createClient(url, key, { auth: { experimental: { passkey: true }, persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  }

  async requestMagicLink(email: string): Promise<{ status: "magic_link_sent"; testVerificationToken?: string }> {
    const { error } = await this.client.auth.signInWithOtp({ email, options: { emailRedirectTo: process.env.SUPABASE_EMAIL_REDIRECT_URL } });
    if (error) throw new AuthError("provider_unavailable", "Magic Link delivery is unavailable.");
    return { status: "magic_link_sent" as const };
  }

  async verifyMagicLink(providerToken: string): Promise<{ sessionToken: string }> {
    const identity = await this.identityFromToken(providerToken);
    const sessionToken = crypto.randomBytes(24).toString("base64url");
    const result = await this.database.pool.query<{ account_id: string; actor_id: string }>(
      "SELECT * FROM app.issue_external_session($1, $2, $3)",
      [identity.subject, hashToken(identity.email), hashToken(sessionToken)],
    );
    if (result.rowCount !== 1) throw new AuthError("authentication_required", "The authentication identity is not eligible for this workspace.");
    return { sessionToken };
  }

  async registerPasskey(sessionToken: string, providerToken?: string) {
    if (!providerToken) throw new AuthError("authentication_required", "A Supabase session is required to register a Passkey.");
    const identity = await this.identityFromToken(providerToken);
    const result = await this.database.pool.query<{ register_external_passkey: boolean }>(
      "SELECT app.register_external_passkey($1, $2)",
      [hashToken(sessionToken), identity.subject],
    );
    if (result.rows[0]?.register_external_passkey !== true) throw new AuthError("authentication_required", "The authentication identity is not eligible for this workspace.");
  }

  async authenticatePasskey(sessionToken: string, providerToken?: string) {
    if (!providerToken) throw new AuthError("authentication_required", "A Supabase session is required for Passkey authentication.");
    const identity = await this.identityFromToken(providerToken);
    if (!identity.passkeyAssured) throw new AuthError("passkey_required", "A verified Passkey ceremony is required for ordinary product access.");
    const result = await this.database.pool.query<{ authenticate_external_passkey: boolean }>(
      "SELECT app.authenticate_external_passkey($1, $2)",
      [hashToken(sessionToken), identity.subject],
    );
    if (result.rows[0]?.authenticate_external_passkey !== true) throw new AuthError("authentication_required", "The authentication identity is not eligible for this workspace.");
    if (identity.passkeyTime && identity.providerSessionId) await this.database.withContext(sessionToken, null, async (client) => {
      await client.query("SELECT app.record_passkey_evidence($1,$2,$3)", [hashToken(sessionToken), identity.passkeyTime, identity.providerSessionId]);
    });
  }

  async verifySensitiveSession(sessionToken: string, providerToken?: string) {
    if (!providerToken) throw new AuthError("passkey_fresh_required", "Verify your Passkey to resume this exact action.");
    const identity = await this.identityFromToken(providerToken);
    if (!identity.passkeyTime || !identity.providerSessionId || Date.now() - Date.parse(identity.passkeyTime) > 300000) {
      throw new AuthError("passkey_fresh_required", "A Passkey ceremony no older than five minutes is required.");
    }
    // The existing authentication function verifies the product Actor against
    // the verified provider subject before any evidence can be recorded.
    await this.authenticatePasskey(sessionToken, providerToken);
  }

  private async identityFromToken(providerToken: string) {
    const { data, error } = await this.client.auth.getUser(providerToken);
    if (error || !data.user?.id || !data.user.email) throw new AuthError("authentication_required", "The authentication session is invalid or expired.");
    const claims = await this.client.auth.getClaims(providerToken);
    if (claims.error) throw new AuthError("authentication_required", "The authentication session is invalid or expired.");
    const amr = claims.data?.claims?.amr;
    const passkeyAssured = Array.isArray(amr) && amr.some((entry) => {
      const method = typeof entry === "string" ? entry : entry && typeof entry === "object" && "method" in entry ? entry.method : undefined;
      return method === "passkey" || method === "webauthn";
    });
    const timestamps: number[] = [];
    if (Array.isArray(amr)) for (const entry of amr) {
      if (entry && typeof entry === "object" && entry.method === "passkey" && typeof entry.timestamp === "number" && Number.isFinite(entry.timestamp) && entry.timestamp * 1000 <= Date.now()) timestamps.push(entry.timestamp);
    }
    const latest = timestamps.sort((a, b) => b - a)[0];
    const sessionId = claims.data?.claims?.session_id;
    return { subject: data.user.id, email: data.user.email, passkeyAssured,
      passkeyTime: latest ? new Date(latest * 1000).toISOString() : null,
      providerSessionId: typeof sessionId === "string" && sessionId.length >= 8 ? sessionId : null };
  }
}

export class AuthError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}
