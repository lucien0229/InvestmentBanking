"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "../../lib/supabase-browser";
import { StatePanel } from "../../components/deal-control/ui";

const supabaseMode = process.env.NEXT_PUBLIC_AUTH_MODE === "supabase";
type AccessStep = "email" | "sent" | "register" | "signin" | "authenticated";

export default function AccountAccessPage({ initialStep = "email" }: { initialStep?: AccessStep }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<AccessStep>(initialStep);
  const [returnTo, setReturnTo] = useState("/app/deals");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("return_to");
    const safe = requested && /^\/(?:app|checkout)(?:\/|$)/.test(requested) && !/[\\\r\n]/.test(requested);
    if (safe) {
      setReturnTo(requested);
      sessionStorage.setItem("account-access-return", requested);
    } else {
      const saved = sessionStorage.getItem("account-access-return");
      if (saved && /^\/(?:app|checkout)(?:\/|$)/.test(saved) && !/[\\\r\n]/.test(saved)) setReturnTo(saved);
    }
    let disposed = false;
    void fetch("/api/v1/session", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const body = await response.json();
      if (!disposed && (body.posture === "passkey_backed_session" || initialStep !== "signin")) setStep(body.posture === "passkey_backed_session" ? "authenticated" : "register");
    }).catch(() => undefined);
    return () => { disposed = true; };
  }, [initialStep]);

  async function command(url: string, body?: object, providerToken?: string) {
    const response = await fetch(url, { method: "POST", headers: { ...(body ? { "content-type": "application/json" } : {}), ...(providerToken ? { authorization: `Bearer ${providerToken}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.detail ?? "Account access could not be completed. Please try again.");
    return result;
  }

  async function perform(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Account access could not be completed."); }
    finally { setBusy(false); }
  }

  function requestMagicLink(event: React.FormEvent) {
    event.preventDefault();
    void perform(async () => {
      const result = await command("/api/v1/session/bootstrap", { email });
      if (!supabaseMode && result.test_verification_token) {
        await command("/api/v1/session/bootstrap/verify", { token: result.test_verification_token });
        setStep("register");
      } else setStep("sent");
    });
  }

  function registerPasskey() {
    void perform(async () => {
      let providerToken: string | undefined;
      if (supabaseMode) {
        const client = supabaseBrowserClient();
        const { error } = await client.auth.registerPasskey();
        if (error) throw error;
        providerToken = (await client.auth.getSession()).data.session?.access_token;
        if (!providerToken) throw new Error("Your mailbox verification expired. Request a new Magic Link.");
      }
      await command("/api/v1/session/passkey/register", undefined, providerToken);
      setStep("signin");
    });
  }

  function authenticatePasskey() {
    void perform(async () => {
      let providerToken: string | undefined;
      if (supabaseMode) {
        const { data, error } = await supabaseBrowserClient().auth.signInWithPasskey();
        if (error || !data.session) throw error ?? new Error("Passkey verification was not completed. Try again.");
        providerToken = data.session.access_token;
      }
      await command("/api/v1/session/passkey/authenticate", undefined, providerToken);
      sessionStorage.removeItem("account-access-return");
      router.replace(returnTo);
    });
  }

  const content = {
    email: ["Secure account gateway", "Continue to account access", "Enter your email to receive the next safe step. Returning access uses your Passkey."],
    sent: ["Mailbox verification", "Check your email for the next step", "If this address can continue, we sent a Magic Link. Open it in this browser to continue."],
    register: ["Required security setup", "Create a Passkey before entering your account", "Your mailbox is verified. Register a Passkey using your browser's secure prompt."],
    signin: ["Returning access", "Sign in with your Passkey", "Use your registered Passkey to open your account and return to your saved task."],
    authenticated: ["Account access", "Your account is ready", "Your current session has completed Passkey verification."],
  }[step];

  return <main className="dc-access-page"><section className="dc-access-panel" aria-labelledby="account-access-title">
    <a className="dc-brand" href="/" aria-label="Deal Control public overview"><span className="dc-brand-mark" aria-hidden="true">DC</span></a>
    <p className="dc-eyebrow">{content[0]}</p><h1 id="account-access-title">{content[1]}</h1><p>{content[2]}</p>
    {error && <StatePanel tone="critical" label="Access could not be completed" title={error} />}
    {step === "email" && <form onSubmit={requestMagicLink}><label htmlFor="email">Email address</label><input id="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required disabled={busy} /><button className="dc-button" disabled={busy}>{busy ? "Sending…" : "Continue"}</button></form>}
    {step === "sent" && <StatePanel tone="info" label="Email sent" title="Check your inbox" detail="Mailbox verification alone does not open Account or Deal content." />}
    {step === "register" && <button className="dc-button dc-access-primary" disabled={busy} onClick={registerPasskey}>{busy ? "Waiting for your browser…" : "Register Passkey and continue"}</button>}
    {step === "signin" && <><div className="dc-access-state"><strong>Passkey required</strong><span>Follow your device's secure verification prompt.</span></div><button className="dc-button dc-access-primary" disabled={busy} onClick={authenticatePasskey}>{busy ? "Verifying…" : "Continue with Passkey"}</button></>}
    {step === "authenticated" && <a className="dc-button dc-access-primary" href={returnTo}>Continue to your account</a>}
    <div className="dc-access-links"><a href="/account-access/recovery">Recover access</a>{step === "email" || step === "sent" ? <button type="button" disabled={busy} onClick={() => { setError(""); setStep("signin"); }}>Sign in with Passkey</button> : <a href="/account-access">Return to account access</a>}</div>
  </section></main>;
}
