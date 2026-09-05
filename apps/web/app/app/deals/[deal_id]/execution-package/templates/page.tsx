"use client";
import { useParams } from "next/navigation";
import { TemplateWorkspace } from "../../../../../../components/deal-control/template-workspace";
export default function TemplatesPage() {
  const { deal_id } = useParams<{ deal_id: string }>();
  return <TemplateWorkspace dealId={deal_id} />;
}
