import { RecipientSurfacePage } from "../../../components/deal-control/surfaces";
import { RecipientShell } from "../../../components/deal-control/ui";

export default async function RecipientAccessPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  return <RecipientShell><RecipientSurfacePage slug={slug} /></RecipientShell>;
}
