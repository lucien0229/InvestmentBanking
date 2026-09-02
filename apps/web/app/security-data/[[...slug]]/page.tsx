import { PublicMechanismPage } from "../../../components/deal-control/surfaces";
import { PublicShell } from "../../../components/deal-control/ui";

export default async function SecurityDataPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  return <PublicShell><main className="dc-page"><PublicMechanismPage namespace="security & data" slug={slug} /></main></PublicShell>;
}
