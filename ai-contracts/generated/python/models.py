"""Generated, strict worker-facing AI contract models (source v1.0.0)."""
from dataclasses import dataclass
from typing import Literal, Optional

TaskDefinition = Literal[
    "source_claim_extraction",
    "claim_evidence_linking",
    "material_source_conflict_analysis",
    "contract_repair",
]
SupportStatus = Literal[
    "supported", "challenged", "conflicted", "insufficient_support",
    "unresolved_locator", "coverage_incomplete", "rights_blocked",
    "out_of_scope", "not_applicable",
]

@dataclass(frozen=True)
class EvidenceLink:
    fragment_id: str
    relationship: Literal["supports", "challenges"]
    proposition_scope: str
    qualification: Optional[str]
    limitation: Optional[str]

@dataclass(frozen=True)
class SourceClaimCandidate:
    proposition: str
    attribution: str
    definition: str
    period: str
    unit: str
    currency: str
    sign: str
    value: Optional[float]
    text: Optional[str]
    source_fragment_id: str
    qualification: Optional[str]

@dataclass(frozen=True)
class ClaimEvidenceLinkCandidate:
    proposition_key: str
    fragment_id: str
    relationship: Literal["supports", "challenges"]
    supported_scope: str
    qualification: Optional[str]
    relationship_limitation: Optional[str]

@dataclass(frozen=True)
class MaterialSourceConflictCandidate:
    conflict_key: str
    dimension: Literal["definition", "period", "unit", "currency", "sign", "value", "source_version", "scope", "meaning"]
    competing_refs: list[str]
    affected_scope: str
    unresolved_alternatives: list[str]
    affected_uses: list[str]

@dataclass(frozen=True)
class ContractRepairCandidate:
    original_candidate_key: str
    repaired_payload: dict[str, object]
