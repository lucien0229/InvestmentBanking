import { notFound } from "next/navigation";

const states: Record<string, { title: string; detail: string; tone: "info" | "warning" | "critical" | "success" }> = {
  "email-sent": { title: "Magic Link sent", detail: "Open the message in this same browser. The link is single-use and does not grant ordinary Banker access until Passkey registration is complete.", tone: "success" },
  "verify-email": { title: "Verify your mailbox", detail: "Use the single-use link from the mailbox, then return here to continue with mandatory Passkey registration.", tone: "info" },
  "recovery": { title: "Security recovery", detail: "Re-authentication is required before this protected action can continue. No Deal Material is included in this recovery surface.", tone: "warning" },
  "session-expired": { title: "Session expired", detail: "Your protected Banker session ended. Re-authenticate with Passkey to return to the saved task.", tone: "warning" },
  denied: { title: "Access denied", detail: "This Account or Deal is not available to the current session. Return to Account Access without exposing protected object details.", tone: "critical" },
  reauthenticate: { title: "Re-authenticate sensitive action", detail: "Use a fresh Passkey posture before a single-use grant can be consumed. No protected payload is included in this screen.", tone: "warning" },
  "recovery/restricted": { title: "Restricted recovery", detail: "Recovery is limited to restoring Account access. Deal material, export payloads and authorization details remain isolated.", tone: "warning" },
};

export default async function AccountAccessStatePage({ params }: { params: Promise<{ state: string[] }> }) {
  const { state } = await params;
  const key = state.join("/");
  const passkey = key === "passkey/register" ? { title: "Register mandatory Passkey", detail: "Mailbox verification is complete. Register a Passkey before ordinary Banker access can be created.", tone: "info" as const } : key === "passkey/sign-in" ? { title: "Sign in with Passkey", detail: "Use the registered Passkey to create the ordinary Banker session and return to the saved task.", tone: "info" as const } : undefined;
  const content = states[key] ?? passkey;
  if (!content) notFound();
  return <main className="dc-page"><a href="/account-access">← Account Access Gateway</a><p className="dc-eyebrow">ACCOUNT ACCESS / {key.replaceAll("/", " · ")}</p><h1>{content.title}</h1><div className="dc-state-panel" data-tone={content.tone}><span className="dc-state-label">Recovery state</span><strong className="dc-state-title">{content.title}</strong><span className="dc-state-detail">{content.detail}</span><a href="/account-access">Return to Account Access</a></div></main>;
}
