import DealSurfacePage from "../../../../../components/deal-control/surfaces";

export default async function DealSurfaceRoute({ params }: { params: Promise<{ deal_id: string; slug?: string[] }> }) {
  const { deal_id: dealId, slug = [] } = await params;
  return <main className="dc-page"><DealSurfacePage dealId={dealId} slug={slug} /></main>;
}
