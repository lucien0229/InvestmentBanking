import { DeletionStatusPage } from "../../../components/deal-control/surfaces";

export default async function DeletionStatusRoute({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  return <DeletionStatusPage slug={slug} />;
}
