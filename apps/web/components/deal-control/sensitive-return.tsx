"use client";
import { useEffect, useState } from "react";
import { supabaseBrowserClient } from "../../lib/supabase-browser";
import { StatePanel } from "./ui";

const savedKey = "controlled-action-return";
export type SavedAction = { dealId: string; resourceId: string; key: string; action: "internal_controlled_export" | "export_object_retrieval"; returnPath: string };
export function savedAction(): SavedAction | null {
  try { const v = JSON.parse(sessionStorage.getItem(savedKey) ?? "null"); return v && /^[a-f0-9-]{36}$/.test(v.dealId) && /^[a-f0-9-]{36}$/.test(v.resourceId) && typeof v.key === "string" && ["internal_controlled_export", "export_object_retrieval"].includes(v.action) && typeof v.returnPath === "string" && v.returnPath.startsWith(`/app/deals/${v.dealId}/history-portability`) && !/[\\\r\n]/.test(v.returnPath) ? v : null; } catch { return null; }
}
export function saveAction(action: SavedAction) { sessionStorage.setItem(savedKey, JSON.stringify(action)); }
export function clearAction() { sessionStorage.removeItem(savedKey); }
export async function providerProof() { return process.env.NEXT_PUBLIC_AUTH_MODE === "supabase" ? (await supabaseBrowserClient().auth.getSession()).data.session?.access_token : undefined; }

export function SensitiveReauthentication() {
  const [pending, setPending] = useState<SavedAction | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { setPending(savedAction()); }, []);
  function back(outcome: string) { if (!pending) return; const path = new URL(pending.returnPath, window.location.origin); path.searchParams.set("reauth", outcome); window.location.assign(path.pathname + path.search); }
  async function authenticate() {
    setBusy(true); setError("");
    try {
      let token: string | undefined;
      if (process.env.NEXT_PUBLIC_AUTH_MODE === "supabase") { const { data, error: cause } = await supabaseBrowserClient().auth.signInWithPasskey(); if (cause || !data.session) throw cause ?? new Error("Passkey verification was not completed."); token = data.session.access_token; }
      const response = await fetch("/api/v1/session/passkey/authenticate", { method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {} });
      const result = await response.json(); if (!response.ok) throw new Error(result.detail ?? "Passkey verification was not accepted."); back("verified");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Verification was not completed. Your reviewed task is preserved."); } finally { setBusy(false); }
  }
  return <main className="dc-access-page"><section className="dc-access-panel" data-od-id="sensitive-action-reauthentication"><a className="dc-brand" href="/account-access"><span className="dc-brand-mark">DC</span></a><p className="dc-eyebrow">Sensitive action · Passkey verification</p><h1>Verify to continue your reviewed action</h1><p>Complete your device’s secure prompt. You will return to the exact saved task. Its scope is checked again before the action is accepted.</p>{error && <StatePanel tone="warning" label="Verification not completed" title={error} />}{pending ? <><button className="dc-button dc-access-primary" disabled={busy} onClick={authenticate}>{busy ? "Waiting for your device…" : "Verify with Passkey"}</button><button className="dc-button dc-button-secondary dc-access-primary" disabled={busy} onClick={() => back("canceled")}>Cancel and return to saved task</button></> : <StatePanel label="No saved action" title="Return to your workspace to review an action first"><a href="/app/deals">Open your Deals</a></StatePanel>}</section></main>;
}
