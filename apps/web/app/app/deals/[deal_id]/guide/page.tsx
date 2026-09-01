"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function FirstDealGuidePage() {
  const { deal_id: dealId } = useParams<{ deal_id: string }>();
  const [guide, setGuide] = useState<any>(null);
  useEffect(() => { void fetch(`/api/v1/deals/${dealId}/guide`, { cache: "no-store" }).then((response) => response.json()).then((body) => setGuide(body.data)); }, [dealId]);
  return <main style={{ maxWidth: 760, margin: "0 auto", padding: 40 }}><a href={`/app/deals/${dealId}/setup`}>← Deal Setup</a><h1>First Deal Guide</h1>{guide ? <><p>Status: {guide.status}</p><p>Next controlled action: {guide.current_action}</p></> : <p>Loading…</p>}</main>;
}
