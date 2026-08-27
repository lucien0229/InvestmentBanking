"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "../../lib/supabase-browser";

const supabaseMode = process.env.NEXT_PUBLIC_AUTH_MODE === "supabase";

export default function AccountAccessPage() {
  const router = useRouter();
  const [email, setEmail] = useState("banker-a@example.test");
  const [token, setToken] = useState("");
  const [providerAccessToken, setProviderAccessToken] = useState("");
  const [status, setStatus] = useState("Enter a mailbox to begin the Supabase Magic Link bootstrap.");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabaseMode) return;
    let cancelled = false;
    async function restoreProviderSession() {
      try {
        const supabase = supabaseBrowserClient();
        const session = (await supabase.auth.getSession()).data.session;
        if (!session || cancelled) return;
        setProviderAccessToken(session.access_token);
        const response = await fetch("/api/v1/session");
        if (!cancelled && response.ok) {
          const body = await response.json();
          setStatus(body.posture === "passkey_required" ? "Mailbox verified. Register the mandatory Passkey." : "Passkey registered. Authenticate with it to create the ordinary Banker Session.");
        }
      } catch {
        // The sign-in form remains available when there is no provider session.
      }
    }
    void restoreProviderSession();
    return () => { cancelled = true; };
  }, []);

  async function requestMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/v1/session/bootstrap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const body = await response.json();
    if (!response.ok) return setError(body.detail ?? "Magic Link request failed.");
    if (body.test_verification_token) setToken(body.test_verification_token);
    setStatus(supabaseMode ? "Magic Link sent. Open it from the same browser to continue." : "Magic Link sent. In the local acceptance adapter, the one-time verification token is shown for the black-box test only.");
  }

  async function verifyMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/v1/session/bootstrap/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    const body = await response.json();
    if (!response.ok) return setError(body.detail ?? "Magic Link verification failed.");
    setStatus("Mailbox verified. Register the mandatory Passkey.");
  }

  async function registerPasskey() {
    setError("");
    if (supabaseMode) {
      try {
        const supabase = supabaseBrowserClient();
        const { data, error } = await supabase.auth.registerPasskey();
        if (error) throw error;
        const session = (await supabase.auth.getSession()).data.session;
        if (!session) throw new Error("The Supabase session is unavailable.");
        setProviderAccessToken(session.access_token);
        const response = await fetch("/api/v1/session/passkey/register", { method: "POST", headers: { authorization: `Bearer ${session.access_token}` } });
        if (!response.ok) throw new Error((await response.json()).detail ?? "Passkey registration failed.");
        setStatus("Passkey registered. Authenticate with it to create the ordinary Banker Session.");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Passkey registration failed.");
      }
      return;
    }
    const response = await fetch("/api/v1/session/passkey/register", { method: "POST" });
    const body = await response.json();
    if (!response.ok) return setError(body.detail ?? "Passkey registration failed.");
    setStatus("Passkey registered. Authenticate with it to create the ordinary Banker Session.");
  }

  async function authenticatePasskey() {
    setError("");
    if (supabaseMode) {
      try {
        const supabase = supabaseBrowserClient();
        const { data, error } = await supabase.auth.signInWithPasskey();
        if (error || !data.session) throw error ?? new Error("Passkey authentication failed.");
        setProviderAccessToken(data.session.access_token);
        const response = await fetch("/api/v1/session/passkey/authenticate", { method: "POST", headers: { authorization: `Bearer ${data.session.access_token}` } });
        if (!response.ok) throw new Error((await response.json()).detail ?? "Passkey authentication failed.");
        router.push("/app/deals/project-northstar/overview");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Passkey authentication failed.");
      }
      return;
    }
    const response = await fetch("/api/v1/session/passkey/authenticate", { method: "POST" });
    const body = await response.json();
    if (!response.ok) return setError(body.detail ?? "Passkey authentication failed.");
    router.push("/app/deals/project-northstar/overview");
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 48 }}>
      <a href="/">← Public entry</a>
      <h1>Account Access Gateway</h1>
      <p>{status}</p>
      {error && <p role="alert" style={{ color: "#a22" }}>{error}</p>}
      <form onSubmit={requestMagicLink} style={{ display: "grid", gap: 12, maxWidth: 480 }}>
        <label htmlFor="email">Email</label>
        <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        <button type="submit">Send Magic Link</button>
      </form>
      {!supabaseMode && <form onSubmit={verifyMagicLink} style={{ display: "grid", gap: 12, maxWidth: 480, marginTop: 24 }}>
        <label htmlFor="token">One-time Magic Link token</label>
        <input id="token" value={token} onChange={(event) => setToken(event.target.value)} minLength={16} required />
        <button type="submit">Verify mailbox</button>
      </form>}
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button type="button" onClick={registerPasskey}>Register mandatory Passkey</button>
        <button type="button" onClick={authenticatePasskey}>Sign in with Passkey</button>
      </div>
      <p style={{ marginTop: 28, fontSize: 13, color: "#566" }}>The browser holds only the provider session and transient bootstrap state. Account, Deal, Workspace and Audit authority comes from the API and PostgreSQL.</p>
    </main>
  );
}
