"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "../../../lib/supabase-browser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your mailbox…");

  useEffect(() => {
    let cancelled = false;
    async function complete() {
      try {
        const supabase = supabaseBrowserClient();
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) throw error ?? new Error("The authentication session is unavailable.");
        const response = await fetch("/api/v1/session/bootstrap/verify", {
          method: "POST",
          headers: { authorization: `Bearer ${data.session.access_token}` },
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.detail ?? "Mailbox verification failed.");
        }
        if (!cancelled) router.replace("/account-access?bootstrap=verified");
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Mailbox verification failed.");
      }
    }
    void complete();
    return () => { cancelled = true; };
  }, [router]);

  return <main style={{ maxWidth: 720, margin: "0 auto", padding: 48 }}><h1>Account Access Gateway</h1><p role="status">{message}</p></main>;
}
