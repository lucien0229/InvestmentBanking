# Establish the Data, Source Access, and Confidentiality Boundary

> 保留设计，待用户优化。此文保留重启前的产品设计内容；既往确认、任务措辞与实施结果仅为历史来源，本阶段没有启用任务队列或实现。


## Original design question

Which user-controlled files, public sources, licensed data, customer-authorized connectors, and sensitive deal materials are necessary or optional for the selected first workflow, and what boundary keeps onboarding self-serve while preserving professional usefulness and confidentiality?

Research source ownership, commercial-use constraints, connector feasibility, data-room and document behavior, freshness, file formats, security expectations, retention and deletion needs, and the practical difference between plugin-configured access and access available to an independent product. Define a minimum viable source perimeter, optional enrichments, explicit unavailable or deferred sources, and the consequence of each missing source. Produce a linked Markdown asset; do not purchase data, install connectors, or design production infrastructure.

## Retained design decision

Resolved by [V1 Data, Source Access, and Confidentiality Boundary](../assets/data-source-access-confidentiality-boundary.md).

The Individual-First Release is upload/export-first and connector-independent: authorized user-controlled Deal files and primary public sources are sufficient for the Controlled Sell-Side Auction Deal Book. PDF, PPTX, XLSX, DOCX, CSV, bounded ZIP/VDR exports, and bounded email/process-record exports become immutable, versioned Source Records with native-location citations. Connectors and paid data are optional or deferred; no plugin manifest or provider entry establishes authentication, entitlement, licensing, readability, or rights.

Real Confidential Deal Materials remain prohibited until authentication, tenant/account and Deal isolation, encryption in transit and at rest, secret handling, self-serve export/deletion, audit/provenance, accurate provider-retention disclosure, and no-shared-model-training controls are implemented and verified. Missing, rights-blocked, stale, conflicted, withdrawn, or insufficiently parsed material caps downstream readiness and blocks circulation as specified in the linked consequence matrices.

No new ticket or fog item is required. Existing downstream tickets own the AI/Human Control Contract, detailed Deliverable quality standards, prototype, monetization, acquisition, and final blueprint.
