"""Generated, strict worker-facing AI contract models (source v1.0.0)."""
from dataclasses import dataclass
from typing import Literal, Optional

TaskDefinition = Literal[
    "source_claim_extraction",
    "claim_evidence_linking",
    "material_source_conflict_analysis",
    "contract_repair",
    "financial_semantic_extraction",
    "financial_normalization_mapping",
    "sell_side_analysis_draft",
    "valuation_commentary_draft",
    "workbook_commentary_draft",
    "deliverable_semantic_qc",
    "native_reader_semantic_parity_review",
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

@dataclass(frozen=True)
class FinancialSemanticCandidate:
    proposition: str
    definition: str
    period: str
    unit: str
    currency: str
    sign: Literal["positive", "negative", "not_applicable", "unknown"]
    precision: int
    value_text: Optional[str]
    actual_forecast: Literal["actual", "forecast", "unknown"]
    source_fragment_id: str
    source_locator: dict[str, str | int | float]
    qualification: Optional[str]

@dataclass(frozen=True)
class FinancialMappingCandidate:
    mapping_key: str
    source_fragment_id: str
    source_definition: str
    canonical_definition: str
    canonical_taxonomy_version: str
    period: str
    unit: str
    currency: str
    sign: Literal["positive", "negative", "not_applicable", "unknown"]
    precision: int
    value_text: Optional[str]
    actual_forecast: Literal["actual", "forecast", "unknown"]
    decision_id: Optional[str]
    assumption_id: Optional[str]
    mapping_notes: str

@dataclass(frozen=True)
class SellSideAnalysisDraft:
    question: str
    conclusion: str
    supporting_fact_ids: list[str]
    supporting_assumption_ids: list[str]
    supporting_calculation_run_ids: list[str]
    supporting_evidence_ids: list[str]
    limitations: list[str]
    intended_use: str
    audience: str

@dataclass(frozen=True)
class ValuationCommentaryDraft:
    valuation_question: str
    commentary: str
    model_version_id: Optional[str]
    calculation_run_ids: list[str]
    assumption_ids: list[str]
    evidence_ids: list[str]
    scenario_version_ids: list[str]
    limitations: list[str]
