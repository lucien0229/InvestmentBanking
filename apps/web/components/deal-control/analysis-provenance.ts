type FactBasis = { id: string; claim_id: string; evidence_relationship_ids: string[] };
type EvidenceBasis = { id: string; source_record_id: string; representation_id: string; locator: Record<string, unknown>; relationships: { id: string; claim_id: string; relationship: string }[] };

export function factEvidence(fact: FactBasis, evidence: EvidenceBasis[]) {
  return evidence.filter((item) => item.relationships.some((relation) => fact.evidence_relationship_ids.includes(relation.id) && relation.claim_id === fact.claim_id && relation.relationship === "supports"));
}
export function factSourceLocator(fact: FactBasis, evidence: EvidenceBasis[], selectedId?: string): Record<string, unknown> {
  const eligible = factEvidence(fact, evidence);
  const selected = selectedId ? eligible.find((item) => item.id === selectedId) : eligible.length === 1 ? eligible[0] : undefined;
  if (!selected || Object.keys(selected.locator).length === 0) throw new Error("Select the Fact's exact supporting Evidence location before recording this financial input.");
  // Keep the native selector intact. Fact + Decision identities retain the
  // relationship -> Evidence -> Representation -> Source Record provenance.
  return selected.locator;
}
