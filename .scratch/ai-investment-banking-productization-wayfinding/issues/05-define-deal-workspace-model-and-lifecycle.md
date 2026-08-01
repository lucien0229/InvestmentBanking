# Define the Deal Workspace Information Model and Lifecycle

Type: grilling
Status: resolved
Blocked by: 04

## Question

Which canonical concepts, relationships, states, and lifecycle transitions must the Deal Workspace support so that the selected first workflow is coherent and later Official Capability Baseline workflows can be added without becoming disconnected tools?

Resolve through `domain-modeling` and live one-question-at-a-time grilling. Define only business concepts such as Deal, source material, evidence, fact, claim, assumption, issue, analysis, model, scenario, deliverable, revision, and human decision where the selected workflow requires them. Keep `CONTEXT.md` free of implementation detail. Do not design database tables, APIs, advanced team permissions, or the final application interface.

## Answer

Resolved through live, one-question-at-a-time `grilling` and `domain-modeling`. Every material decision below was explicitly confirmed by the user. The resulting canonical terms were recorded incrementally in the root `CONTEXT.md`; this answer owns the relationships, lifecycle, state semantics, impact rules, and release boundary.

### 1. Governing model

The canonical hierarchy is:

`Deal → Deal Workspace → Controlled Sell-Side Auction Deal Book`

- A **Deal** is the durable transaction mandate. Its identity is defined by the client or represented party, transaction subject and perimeter, banker role or side, and mandate objective.
- A **Sell-Side Auction** is the primary business process within that Deal, not another Deal, a Deal stage, or a Deliverable. A move from broad auction to limited outreach, bilateral negotiation, or exclusivity remains within the same Deal when the identity-defining elements remain unchanged.
- One Deal has one **Deal Workspace** in the Individual-First Release. The Deal Workspace is the persistent authoritative working context for all current and historical information, analysis, process state, Deliverables, Decisions, and unresolved work.
- The **Controlled Sell-Side Auction Deal Book** is the governed current execution view within the Deal Workspace. It is a revisioned business outcome composed from current applicable Deal state; it is not a second container, a single file, a duplicate source of truth, or a claim that everything it contains is approved for external use.
- Internal drafts, unresolved conflicts, rejected judgments, superseded Revisions, and other history remain in the Deal Workspace without automatically entering the current Deal Book.
- Official Capability Baseline workflows must operate on these shared Deal objects. They may enrich the Deal Workspace but may not create disconnected sources, models, decisions, or approval histories.

Material identity changes create a new, linkable Deal. A new source version, monthly update, revised CIM, new Bid, process recut, pause, restart, or failed exclusivity does not by itself create a new Deal.

### 2. Source and information relationships

The canonical source chain is:

`Source Material → Source Record → Source Packet`

- **Source Material** is original business content received, obtained, or recorded for the Deal. Product-generated extraction, normalization, summary, or inference is derived work, not Source Material.
- A **Source Record** represents one exact version or point-in-time observation of Source Material with its provenance, date, scope, location, authority, confidentiality, and reliance posture. A later version creates another Source Record; prior history is never overwritten.
- A **Source Packet** is a banker-controlled collection of exact Source Records selected for a stated purpose, stage, or decision scope. Inclusion defines the source perimeter but does not make the contents true, current, unconflicted, or externally usable.

The canonical proposition chain is:

`Source Record → Evidence ↔ Claim → Fact`

with **Assumption** remaining a separate branch.

- **Evidence** is a precisely located, context-preserving part of a Source Record that supports or challenges a proposition. Evidence is not itself a Fact.
- A **Claim** is an evaluable proposition asserted by a seller, management team, third party, AI, or banker. Repetition, inclusion in a Model, or appearance in a Deliverable does not promote it.
- A **Fact** is a Claim supported by appropriate Evidence, free of unresolved material conflict, and explicitly accepted by the Individual Banker as currently reliable for a stated scope and purpose. It remains bounded by period, definition, unit, and other qualifications.
- An **Assumption** is an explicitly adopted input or premise used where Evidence does not determine what the work requires. Banker approval authorizes its stated use but never turns it into a Fact.
- AI may extract Evidence, propose Claims, and suggest Assumptions. It may not silently create a banker-confirmed Fact or approve a material Assumption.

### 3. Calculation, analysis, Model, and Scenario

- A **Calculation** is a reproducible quantitative transformation from stated inputs using a stated formula or method.
- A **Model** is a coherent set of interdependent Calculations, definitions, Assumptions, and output relationships organized to answer a Deal question. A workbook can represent the Model but is not the Model itself.
- A **Scenario** is a named alternative set of inputs, Assumptions, or conditions applied to a Model or Analysis. It is not a separate Model or a prediction asserted as Fact.
- An **Analysis** interprets or compares Evidence, Facts, Claims, Assumptions, Calculations, Models, or Scenarios to answer a stated Deal question. Its conclusion may still require a Human Decision.

**Mechanical Validity** and **Professional Usability** are independent:

- Mechanically valid means the stated formulas, structure, deterministic checks, or tie-outs operate as defined.
- Professionally usable means the sources, definitions, Assumptions, scope, conflicts, and judgment are suitable for a stated banker purpose.
- A zero-error Model can be professionally unusable; a professionally useful qualitative Analysis may have no applicable mechanical check.

### 4. Diligence and unresolved work

- A **Diligence Issue** is a material uncertainty, conflict, gap, or anomaly that may affect judgment, value, risk, process, or Deliverable reliability. It retains explicit resolution criteria and any effect on intended use.
- An **Information Request** asks a management team, seller, buyer, adviser, or other source for specific Source Material or clarification. Receipt or response does not prove that the associated issue is resolved.
- An **Open Item** is an unresolved action with a next step or owner. It tracks work, not Evidence, risk, or judgment.

A Diligence Issue may produce several Information Requests and Open Items; a single request may serve several issues. Closing requests and actions does not silently close the Diligence Issue. The Individual Banker explicitly resolves, accepts, reclassifies, or withdraws the issue.

### 5. Buyer universe and outreach control

The canonical progression is:

`Buyer Candidate → Approved Buyer → Outreach Wave → authorized external execution`

- A **Buyer Candidate** is under consideration based on a stated rationale. Candidacy does not imply approval, contactability, interest, capacity, or participation.
- An **Approved Buyer** has been explicitly accepted by the Individual Banker into the controlled buyer universe. Approval does not authorize outreach, disclosure, materials delivery, NDA treatment, Data-Room Access, or another external action.
- An **Outreach Wave** is a sequenced group of Approved Buyers organized around a stated purpose, timing, disclosure posture, and materials conditions. AI may recommend tiers and waves; only the Individual Banker may authorize external execution.

Candidate status, buyer approval, outreach authorization, actual contact, actual interest, NDA status, access, Bid status, process selection, conflict, do-not-contact, confidentiality, and hold status remain independent. No score, source repetition, or AI recommendation may be presented as actual interest or permission.

### 6. Process objects and chronology

- A **Process Event** is a source-traceable occurrence at a stated time that affects or evidences process state. Events append to history; drafts and inferred activity are not Process Events.
- An **NDA** is the confidentiality arrangement with a counterparty, including its applicable version and posture. Execution does not itself authorize disclosure or access.
- **Data-Room Access** is a time-bounded authorization for a specific counterparty or person to a stated Deal Materials scope. Grant, suspension, expiry, and revocation are distinct events under explicit human control.
- A **Bid** is a versioned transaction proposal for a stated round and time, including material economics, structure, conditions, financing, and timing. A new Bid may supersede an earlier Bid; receipt does not constitute acceptance or selection.
- A **Milestone** is a process control point with a target date and completion criteria. A planned Milestone becomes achieved only when the applicable Process Event and Evidence satisfy those criteria.

Current Process State is derived from the complete event and decision history. NDA execution, Data-Room Access, Bid receipt, buyer selection, and Milestone achievement are separate. Authorization is a Human Decision; actual sending, disclosure, access change, or other external occurrence is a Process Event.

### 7. Deliverables, Revisions, and artifacts

The canonical relationship is:

`Deliverable → Revision → Native Artifact`

- A **Deliverable** is a banker work product for a stated Deal purpose, audience, or decision. It is a continuing business object rather than one file.
- A **Revision** is an immutable, identifiable version of the Deliverable that preserves its applicable source, analysis, process, and use context at a stated time. A later Revision may become current or supersede an earlier one without overwriting it.
- A **Native Artifact** is the editable or operational representation of a Revision in the form expected for the banker work. Successful creation proves only that the Artifact exists.
- A materially changed number, claim, assumption, scope, judgment, or disclosure requires a new Revision. A content-equivalent representation may remain another Artifact of the same Revision.
- Review, QC, and external-use conclusions bind to the exact Revision and do not automatically carry forward.
- The Controlled Sell-Side Auction Deal Book may reference multiple current applicable Deliverable Revisions; it is not itself a single super-artifact.

### 8. Review, QC, and human control

- A **Review** is a scoped examination of a specific object or Revision against a stated purpose and standard by an identified human, AI, or mechanical reviewer. Reviewer type is never concealed.
- A **QC Finding** is a location-specific defect, gap, or judgment item with Evidence, severity, impact, remediation posture, and intended-use consequence. It may expose or create a related Diligence Issue but does not replace one.
- A **Human Decision** is the Individual Banker's explicit, traceable choice about a stated question and scope: confirming a Fact, approving an Assumption or Buyer, resolving a conflict, accepting risk, selecting a Bid, or another material judgment.
- An **External-Use Decision** is a specialized Human Decision authorizing one exact object or Revision for a stated audience, purpose, time, and set of conditions.

Review may establish an internal readiness posture; it cannot authorize external use. A circulation candidate remains internal until the applicable External-Use Decision exists. An authorization for one Revision, audience, wave, or purpose cannot be reused for another. Actual external use is recorded separately as a Process Event. AI may propose readiness, Findings, remediation, or decision language, but may not make Human Decisions or External-Use Decisions.

### 9. Information currency, conflict, and history

Information state is multidimensional rather than one mutually exclusive status:

| Dimension | State | Meaning |
| --- | --- | --- |
| Temporal applicability | **Current** | Designated as presently applicable for a stated scope and purpose; not necessarily verified, confirmed, usable, or externally authorized. |
| Temporal applicability | **Stale** | Freshness is insufficient or uncertain for the intended current use; may remain useful historically. |
| Temporal applicability | **Historical** | Retained to explain a prior source, judgment, process state, Revision, or Decision rather than represent current state. |
| Conflict overlay | **Conflicted** | A material disagreement about value, definition, period, scope, version, or meaning remains unresolved. Current items may still be conflicted. |
| Disposition | **Superseded** | Explicitly replaced for a stated scope by later information or a later Human Decision; retained historically and not necessarily wrong or stale. |
| Disposition | **Withdrawn** | Explicitly removed from current reliance or use, with or without a replacement; content, reason, and prior uses remain historical. |

Stale does not mean superseded; superseded does not mean erroneous; withdrawn does not mean deleted; historical does not mean irrelevant. Conflicts may not be silently blended, averaged, overwritten, or resolved by choosing the newest file without an applicable decision.

Later Evidence may make current Facts, Analysis, Models, Deliverables, or Decisions stale or conflicted. It does not rewrite what was known and decided earlier. A new Human Decision may establish the current judgment and supersede the old one; the old judgment and its original Evidence remain historical.

### 10. Deal lifecycle

The **Deal Business Stage** is:

`Initiated → Preparation → In Market → Bid Evaluation → Exclusive Execution → Signed → Closed`

with **Terminated** as an explicit end state when the Deal ends without closing.

| Stage | Business meaning and transition evidence |
| --- | --- |
| Initiated | Deal identity, mandate objective, and perimeter have been established. |
| Preparation | Source control, diligence, financial work, materials, buyer strategy, and process preparation are being performed internally. |
| In Market | Authorized external outreach has actually begun. Artifact completion alone cannot trigger this stage. |
| Bid Evaluation | Formal or substantive IOIs or Bids are being received, compared, and selected. |
| Exclusive Execution | A preferred Buyer has been selected and the Deal is in exclusive or substantively bilateral confirmatory diligence, financing, and documentation. |
| Signed | The controlling definitive transaction agreement has been executed, but closing has not occurred. |
| Closed | The transaction has completed. |
| Terminated | The Deal has explicitly ended without completing the transaction. |

- **Paused** is an independent activity posture. It preserves the prior Business Stage; resumption explicitly returns the Deal to a stated stage.
- **Archived** is an independent record posture. It is not a transaction result and may follow Closed, Terminated, or an explicit decision to archive a paused Deal.
- Stage transitions require applicable Process Events, Evidence, and Human Decisions. AI may recommend but cannot silently move the Deal.
- Explicit backtracking is allowed: failed exclusivity may return the Deal to In Market or Bid Evaluation, and a process recut may change the path. Every transition remains in history.
- Milestones are control points inside stages, not stages themselves.

Deal Business Stage and artifact readiness never substitute for each other. A Deal can be In Market while a CIM Revision is blocked; an internal Model may be senior-review-ready while the Deal remains in Preparation.

### 11. Independent state families

There is no global Deal Workspace `ready` status. Four state families remain independent:

| State family | Required semantics |
| --- | --- |
| **Source Reliance State** | One exact Source Record is unassessed, reliance-limited, reliance-eligible, or blocked for a stated purpose, with freshness, conflict, and disposition tracked independently. |
| **Analysis State** | Calculation, Analysis, Model, and Scenario work retains working posture, applicable mechanical-validation result, Professional Usability, senior-review posture, and blockers as separate dimensions. |
| **Deliverable Readiness** | An exact Revision progresses through working-draft, analysis-ready, senior-review-ready, and circulation-candidate; blocked may apply at any gate. |
| **Process State** | Outreach, NDA, Data-Room Access, diligence, Bid, selection, and Milestone postures are event-supported and distinct, while Deal Business Stage remains separate. |

The required readiness distinctions are:

- **Senior-Review-Ready**: sufficiently complete and explicit for effective senior review, with known issues and unresolved judgments visible; senior review is not yet necessarily complete.
- **Circulation Candidate**: the applicable professional review, QC, remediation, and material judgments are complete for a stated audience and purpose; external use is still unauthorized.
- **External use authorized**: exists only through an applicable External-Use Decision.
- **External use occurred**: exists only through the corresponding Process Event.

Every relevant object also retains independent **Origin** and **Human Confirmation**:

- Origin records human-authored, AI-generated, deterministically generated, imported, or another actual origin and never changes because of later approval.
- Human Confirmation records the Individual Banker's confirmation, rejection, or override for a stated scope.
- A banker-confirmed AI output remains AI-origin. A confirmed Assumption remains an Assumption. AI-generated and banker-confirmed are not opposite ends of one state.

### 12. Change impact and forced lifecycle actions

Every material change first creates an **Impact Assessment** across affected current Deal objects. It may have four independent results:

| Result | Trigger |
| --- | --- |
| **Recalculation Required** | A dependent Fact, Assumption, definition, formula, period, unit, Source Record, Model rule, or Scenario input changed. |
| **Regeneration Required** | The change affects numbers, text, charts, buyer logic, process state, disclosure, conclusion, or use in a Deliverable. |
| **Re-review Required** | The change may invalidate a prior Review's scope or conclusion, Professional Usability, material judgment, Evidence sufficiency, cross-Deliverable consistency, visual quality, or QC posture. |
| **Circulation Blocked** | A circulation candidate or pending External-Use Decision no longer satisfies a material source, content, Revision, audience, confidentiality, QC, or authorization condition. |

Impact Assessment is triggered by:

- a new, corrected, stale, conflicted, superseded, or withdrawn Source Record;
- a changed Fact, Claim, Assumption, definition, Calculation, Model, Scenario, or Model logic;
- a new Process Event, Bid, NDA, access change, Milestone, or Deal Business Stage change;
- a changed, superseded, or withdrawn Human Decision;
- a new material Diligence Issue, QC Finding, or Open Item;
- a new Deliverable Revision; or
- a changed audience, purpose, confidentiality scope, or external-use condition.

AI and deterministic checks may identify dependencies, execute mechanical recalculation, and propose materiality. The Individual Banker retains materiality and professional disposition. Recalculation preserves prior results; regeneration creates a new Revision; re-review is limited to affected review scopes but requires a recorded rationale when waived; unresolved material impact immediately blocks prospective circulation.

An External-Use Decision whose conditions no longer hold remains historical but is ineffective for future use. Already completed external use remains a Process Event; correction, withdrawal, or recirculation requires a new Human Decision and a new Process Event.

### 13. Individual-First Release ownership

The Individual-First Release owns the complete business semantics, current state, history, and human-control relationships for:

1. Deal, Sell-Side Auction, Deal Workspace, Controlled Sell-Side Auction Deal Book, lifecycle, pause, and archive;
2. Source Material, Source Record, Source Packet, Evidence, Claim, Fact, Assumption, information currency, conflict, and disposition;
3. Calculation, Analysis, Model, Scenario, Diligence Issue, Information Request, and Open Item;
4. Buyer Candidate, Approved Buyer, Outreach Wave, Process Event, NDA, Data-Room Access, Bid, and Milestone;
5. Deliverable, Revision, Native Artifact, Review, QC Finding, Human Decision, and External-Use Decision; and
6. the independent state families, Origin, Human Confirmation, Impact Assessment, recalculation, regeneration, re-review, and circulation blocking.

V1 ownership means these concepts must remain coherent for the complete Sell-Side Auction. It does not decide database schemas, APIs, technology architecture, detailed UI, final Deliverable formats, or the implementation depth of every possible Model and artifact type.

### 14. Reserved Official Capability Baseline expansion

Later workflows reuse the V1-owned core and add only their specialized business concepts:

- Sponsor buy-side: sponsor underwriting, return cases, debt sizing, and IC-specific judgments.
- ECM, DCM, LevFin, and private credit: Instrument, Security, Facility, Tranche, Lender, ratings posture, credit recommendation, and financing execution state.
- Covenant work: Covenant, Basket, restricted group, headroom, amendment/waiver, and counsel-review posture.
- Restructuring: Claim Class, lien, guarantor, collateral, value break, fulcrum, Recovery Case, and separate legal-entitlement versus negotiated-plan economics.
- Board, deal committee, and fairness support: Committee, meeting package, committee decision, specialist review, and the explicit support-not-opinion boundary.
- Enterprise expansion: multi-user collaboration, granular permissions, approval routing, information barriers, organization administration, and enterprise governance.

Reserved concepts are not empty V1 placeholders or a generic financial-object abstraction. When introduced, they must link to the existing Deal, Source Records, Evidence, Calculations, Models, Deliverables, Revisions, Reviews, and Human Decisions and may not create a parallel fact, version, or approval system. Future workflows may add specialized states but may not weaken evidence lineage, revision binding, the Banker Control Boundary, or External-Use Decisions.

Advanced collaboration is deferred, but every current Individual Banker decision remains a durable original decision that can later participate in a team workflow without being rewritten or lost.

### 15. Non-negotiable invariants

1. One Deal has one authoritative Deal Workspace; the Controlled Sell-Side Auction Deal Book is its controlled current view.
2. A Source Packet contains exact Source Records, not ambiguous filenames or automatically trusted content.
3. Source Material is not Evidence; Evidence is not a Fact; an approved Assumption remains an Assumption.
4. AI-generated and banker-confirmed are independent; AI may never silently perform material human promotion, judgment, or external authorization.
5. Mechanically valid does not mean professionally usable.
6. Senior-review-ready does not mean circulation-candidate; circulation-candidate does not mean authorized; authorized does not mean the external action occurred.
7. Deal Business Stage, Source Reliance State, Analysis State, Deliverable Readiness, and Process State do not promote each other.
8. Current does not mean verified; conflicted may coexist with current; superseded and withdrawn information remains historical.
9. A Review, QC conclusion, or External-Use Decision applies only to its exact object, Revision, scope, audience, purpose, and conditions.
10. New Evidence may supersede current judgment but never rewrites the history of what was known and decided earlier.
11. Material changes create an Impact Assessment and may force recalculation, regeneration, re-review, and circulation blocking.
12. External outreach, disclosure, Data-Room Access, Bid selection, and circulation always require explicit human control; actual external actions are separate Process Events.

No new ticket or graduated fog item is required. Existing downstream tickets already own the data/confidentiality boundary, the detailed AI/evidence/deterministic/human-control contract, Deliverable quality, first-value prototype, monetization, acquisition, and final V1 `/to-spec` boundary. The expansion-sequence fog still depends on those remaining decisions.
