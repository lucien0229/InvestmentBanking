import { PublicMechanismPage } from "../../../components/deal-control/surfaces";
import { PublicShell } from "../../../components/deal-control/ui";

export default async function ResourcesPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  return <PublicShell><main className="dc-page"><PublicMechanismPage namespace="resources" slug={slug} /></main></PublicShell>;
}
