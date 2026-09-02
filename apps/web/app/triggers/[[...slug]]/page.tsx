import { PublicMechanismPage } from "../../../components/deal-control/surfaces";
import { PublicShell } from "../../../components/deal-control/ui";

export default async function TriggersPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  return <PublicShell><main className="dc-page"><PublicMechanismPage namespace="triggers" slug={slug} /></main></PublicShell>;
}
