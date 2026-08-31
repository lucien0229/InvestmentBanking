import ProofClient from "../ProofClient";

export default async function ProjectNorthstarStatePage({ params }: { params: Promise<{ "proof-state": string }> }) {
  const { "proof-state": proofState } = await params;
  return <ProofClient initialState={proofState} />;
}
