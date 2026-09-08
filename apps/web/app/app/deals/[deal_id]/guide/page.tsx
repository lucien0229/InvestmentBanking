"use client";
import { useParams } from "next/navigation";
import { GuideWorkspace } from "../../../../../components/deal-control/guide-workspace";
export default function FirstDealGuidePage() {
  const { deal_id: dealId } = useParams<{ deal_id: string }>();
  return <main className="dc-page"><GuideWorkspace dealId={dealId} /></main>;
}
