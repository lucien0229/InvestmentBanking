import { AccountSurfacePage } from "../../../../components/deal-control/surfaces";

export default async function AccountSurfaceRoute({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  return <main className="dc-page"><AccountSurfacePage slug={slug} /></main>;
}
