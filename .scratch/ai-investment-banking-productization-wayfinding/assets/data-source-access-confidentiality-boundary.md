# V1 Data, Source Access, and Confidentiality Boundary

**Decision date:** 2026-07-31  
**Product scope:** United States-first, English-only, Individual-First Release for the Controlled Sell-Side Auction Deal Book  
**Research boundary:** product and business rules only; no connector implementation, production architecture, data purchase, provider registration, detailed AI/Human Control Contract, or Deliverable quality specification  
**External-source access date:** 2026-07-31 unless stated otherwise

## 1. Decision

### Recommended V1 boundary

The Individual-First Release is **upload/export-first, customer-controlled, connector-independent, and licensed-data-optional**.

V1 must be professionally useful from files that the Individual Banker actively uploads or exports into one Deal Workspace. It must not depend on an employer integration, a data-room API, a market-data terminal, a provider-side implementation service, or any provider named in the official plugin manifest. The minimum viable source perimeter is:

1. Deal and authority context supplied by the Individual Banker;
2. user-controlled or client/firm-authorized Deal Materials in supported files;
3. user-exported Models, Workbooks, Templates, and Process Updates;
4. primary public sources retrieved by the product or supplied by the user; and
5. optional licensed-data exports only when the customer confirms that the applicable agreement permits the product's storage, processing, AI use, derivative output, retention, and intended disclosure.

The product may inventory an incomplete authorized packet and produce source-controlled working drafts. It may not turn missing, stale, conflicted, withdrawn, rights-blocked, or unparsed material into a Fact, professionally usable conclusion, or `circulation-candidate` Deliverable Revision.

### Explicit V1 exclusions

V1 does **not**:

- require or include a live connector;
- browse a user's entire drive, mailbox, Slack workspace, Teams tenant, or VDR;
- assume FactSet, LSEG, S&P Capital IQ, PitchBook, Moody's, Third Bridge, Daloopa, Quartr, Datasite, or any other commercial provider is available;
- pool one customer's licensed data for another customer, deal, benchmark, or shared model;
- scrape paywalled or access-controlled sources;
- modify a VDR, source file, mailbox, message, tracker, or external system;
- send email, post a message, contact a Buyer, grant Data-Room Access, or disclose Deal Materials;
- execute macros, follow external workbook links, or run code embedded in an uploaded file; or
- accept real Confidential Deal Materials before the minimum confidentiality controls in §7 are implemented and verified.

### Why this preserves premium value

The premium value is not access to a terminal or a connector. It is the controlled transformation of an authorized source packet into a persistent, evidence-linked Deal Book that survives revisions. Upload/export-first still supports the core chain:

`Source Material → Source Record → Evidence → Claim / Fact / Assumption → Analysis / Model → Deliverable Revision → Review / Decision`.

Connectors reduce collection and refresh friction later. They do not create source authority, data rights, evidence quality, or permission to circulate.

## 2. Reading rules and evidence labels

This asset distinguishes:

- **Verified fact** — established by the installed official plugin or a linked primary/official source.
- **Evidence-backed inference** — a bounded conclusion from verified facts.
- **Product design decision** — the V1 rule selected here.
- **Unresolved implementation or contractual fact** — deliberately not assumed and not resolved by this ticket.

The product will be built. The official OpenAI Investment Banking plugin `v0.1.29` is the minimum capability baseline, not a competitor. Competitor or provider presence does not veto the product.

## 3. Verified facts that constrain the decision

### 3.1 Official plugin boundary

**Verified plugin facts.** The installed plugin's `.app.json` names Slack, FactSet, LSEG, S&P, PitchBook, Moody's, Third Bridge, Daloopa, Quartr, Datasite, Google Drive, and Gmail. It contains identifiers only; it does not prove that the independent product or current customer is authenticated, entitled, licensed, or able to read any of them. The plugin's own source-resolution contract explicitly says a configured entry is not proof of availability or entitlement and requires a smallest safe native read for the active run. (`.app.json`; `references/workflow-source-resolution.md`; `skills/investment-banking/SKILL.md`)

The plugin recognizes five semantic categories:

1. Deal Materials;
2. Process Updates;
3. Relationship & Counterparty Context;
4. Market Data & Public Sources; and
5. Models, Workbooks & Templates.

Its source hierarchy prefers callable systems of record, then user-provided exports/uploads/data-room files, then primary web sources, then secondary aggregators. A CIM is a Claim source, not proof. (`skills/cim-teardown/SKILL.md`; `skills/cim-teardown/references/evidence-framework.md`)

The bundled generic document inspector directly extracts TXT, CSV, Markdown, and DOCX; its PDF extraction is heuristic, low-confidence, and explicitly requires OCR/native-source support for senior-ready work. Other file types are unsupported by that generic inspector. The deck-QC path separately supports first-pass extraction from PPTX, DOCX, XLSX, CSV, TXT, and Markdown, while requiring rendered visual review for PDF, scanned, image-heavy, and PPTX materials. (`shared/document_ingestion.py`; `skills/ib-deck-qc/references/extraction-and-tieout.md`)

**Product inference.** The independent product must exceed the plugin's generic ingestion helper. File receipt, parsing, visual rendering, source location, Evidence eligibility, and readiness are separate states.

### 3.2 Public-source access is not licensed-data access

**Verified fact.** SEC EDGAR submissions and XBRL APIs require no authentication or API key; SEC says the JSON data is updated throughout the day as submissions are disseminated. SEC also says information presented on `sec.gov` is public information that users may copy or further distribute, while SEC marks and logos remain protected. [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces); [SEC Website Dissemination](https://www.sec.gov/about/privacy-information#website-dissemination).

**Product inference.** SEC filings and other authoritative government sources can be a V1 public-source lane, subject to source-specific terms, fair-access rules, precise filing/version citations, and the rights of third-party exhibits. Public availability of an issuer website, research excerpt, transcript, or database page does not by itself make that content public domain or commercially redistributable.

### 3.3 Customer-authorized access remains scoped access

Official connector documentation confirms that access is explicit and scope-bound:

- Google recommends the narrowest scopes and per-file `drive.file` access; broad `drive.readonly` is a restricted scope, and server-side storage or transmission of restricted-scope data requires a security assessment. [Google Drive API scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- `gmail.readonly` can read messages and settings but is a restricted scope; storing or transmitting restricted-scope data requires a security assessment. [Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)
- Microsoft Graph identifies delegated `Files.Read` as the least-privileged permission for downloading a user's file and exposes `eTag`/`cTag` change semantics; `Mail.Read` reads the signed-in user's mailbox, while `Mail.ReadBasic` excludes body and attachments. [Microsoft Graph driveItem content](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0); [Microsoft Graph permissions](https://learn.microsoft.com/en-us/graph/permissions-reference)
- Dropbox uses OAuth scopes plus either App Folder or Full Dropbox content access and recommends minimum permissions. [Dropbox OAuth Guide](https://developers.dropbox.com/oauth-guide)
- Slack's `channels:history` permits reading content only in public channels to which the app has been added. [Slack `channels:history`](https://docs.slack.dev/reference/scopes/channels.history/)
- Microsoft Teams delegated chat and channel message reads require separate permissions; broad application permissions can require administrator consent. [Microsoft Graph chat messages](https://learn.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0); [Microsoft Graph permissions](https://learn.microsoft.com/en-us/graph/permissions-reference)

**Product inference.** A user pressing “connect” does not prove that every relevant file/message is readable, downloadable, licensed for product processing, or current. Every imported item still becomes a versioned Source Record with a distinct rights, confidentiality, extraction, and reliance posture.

### 3.4 Datasite access is not implicit

**Verified fact.** Datasite's API Program Terms, effective April 24, 2026, state that use of the developer program does not grant access to a virtual data room or other Datasite services without a separate commercial agreement. They also warn that an enabled third-party application may transmit data outside Datasite and may expose data to that application provider. [Datasite API Program Terms](https://www.datasite.com/en/legal/api-program-terms).

**Product decision.** Datasite and every other VDR are export-only in V1. A future direct integration requires verified API availability, a commercial agreement, customer authorization, scoped read-only access, and a separate product decision. The plugin manifest is not evidence for any of those conditions.

### 3.5 Business AI defaults are relevant but insufficient

**Verified fact.** OpenAI states that API inputs and outputs are not used for model training by default unless the organization opts in. Its API data-control documentation states that default abuse-monitoring logs may contain customer content and are retained for up to 30 days; Zero Data Retention and Modified Abuse Monitoring require eligibility and approval, and endpoint-specific application-state retention still applies. [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data#default-usage-policies-by-endpoint). OpenAI also documents encryption in transit and at rest for business data. [OpenAI business data](https://openai.com/business-data/).

**Product decision.** The independent product must verify and disclose the exact model endpoint, training, retention, application-state, and subprocesser posture actually used. It cannot inherit the provider's claims by implication or send Restricted Deal Materials to a processing path whose retention is incompatible with the customer's stated policy.

### 3.6 Outsourcing does not transfer the customer's control obligations

**Verified fact.** FINRA's vendor guidance says outsourcing does not relieve a member firm of applicable obligations and highlights confidentiality, least privilege, encryption in transit and at rest, access lifecycle, data disposition, subcontractors, books/records access, and default settings. FINRA's GenAI notice says existing obligations remain applicable and identifies data privacy/integrity, reliability, accuracy, and model-risk governance. [FINRA Regulatory Notice 21-29](https://www.finra.org/rules-guidance/notices/21-29); [FINRA Regulatory Notice 24-09](https://www.finra.org/rules-guidance/notices/24-09). The SEC's 2024 Regulation S-P amendments require covered institutions to maintain incident-response policies and address unauthorized use of customer information. [SEC Release 2024-58](https://www.sec.gov/newsroom/press-releases/2024-58).

**Boundary.** These sources are conditional regulatory context, not a claim that every Initial Design ICP user or Deal is subject to the same rules. They establish why self-serve onboarding must expose data-use authority and product controls rather than hide them.

## 4. V1 Minimum Viable Source Perimeter

| Source lane | V1 posture | Product rule | Why |
| --- | --- | --- | --- |
| Individual Banker-entered Deal context and authority | **Required** | Require the banker to identify Deal perimeter, role/side, stage, intended use, and authority to upload/use the materials before live intake. | Files cannot be assigned to the correct Deal or reliance purpose without it. |
| User-controlled or authorized uploaded Deal Materials | **Required** | Accept supported files and safe archives only after authority/confidentiality preflight. Preserve exact originals and create Source Records. | This is the controlling private source lane for a sell-side auction. |
| Models, Workbooks, Templates, buyer/process trackers, and other user exports | **Required when that workstream is in scope** | Import as versioned snapshots; never overwrite the source; preserve native labels, formulas, and provenance. | Required for financial, process, buyer, bid, and artifact continuity. |
| Primary public/government/issuer sources | **Optional built-in enrichment** | Retrieve on demand for a stated claim, record URL/document/form, access/as-of dates, version/amendment, and exact location. | Supports verification and context but cannot replace private operating evidence. |
| Customer-provided licensed-data export | **Optional, rights-gated** | Use only after a source-specific rights confirmation; isolate to that customer and Deal; enforce attribution/redistribution limits. | A customer's subscription may permit some internal use but does not automatically permit third-party SaaS or AI processing. |
| Customer-authorized file connector | **Deferred; not needed for V1** | Prioritize read-only, user-selected imports after the upload path is proven. Every read is run-specific and creates a Source Record. | Convenience and refresh, not core authority. |
| Email or messaging connector | **Deferred** | User-selected/read-only import only in a later release; no send, post, edit, react, delete, or broad workspace ingestion. | Useful for Process Updates but replaceable with exported messages/trackers. |
| VDR/data-room connector | **Deferred commercial integration** | Future read-only, Deal-scoped import only after provider/customer rights are verified. | Export packages preserve V1 value without assuming provider APIs. |
| Product-owned licensed data | **Not required and not included** | No provider is bundled. A future agreement must explicitly cover commercial use, AI processing, retention, derived outputs, attribution, and customer-facing redistribution. | Avoids making launch or self-serve onboarding depend on enterprise data procurement. |
| Scraped paywalls, shared credentials, unlicensed data, or material without upload authority | **Prohibited** | Do not ingest or process. Rights cannot be cured by citation or by transforming the data. | Access is not authority. |

### Source Packet rule

A Source Packet contains exact Source Records selected for a stated purpose. It is never “all current files in a folder,” “whatever the connector can see,” or an ambiguous filename list. The banker controls inclusion. Selection does not establish truth, freshness, non-conflict, or external-use rights.

## 5. File and material behavior

### 5.1 Cross-format rules

Every accepted source must:

1. retain the immutable original bytes or exact public observation;
2. record origin, owner/authority, rights posture, confidentiality, received/retrieved time, document/effective/as-of dates, version/draft status, content identity, and intended use;
3. keep extraction/normalization/OCR output as derived work, not Source Material;
4. expose parse and visual-coverage limitations;
5. cite the exact Source Record and native location;
6. create a new Source Record for a changed version or a new point-in-time observation rather than overwrite history; and
7. run Impact Assessment when a new version, conflict, supersession, withdrawal, or stale condition affects dependent work.

Exact duplicate bytes may share a content fingerprint, but distinct provenance, receipt, confidentiality, or authority still requires a distinct receipt/provenance record. Filename equality is never version equality.

### 5.2 Format contract

| Type | V1 support | Read and parse behavior | Citation behavior | Version and update behavior | Explicit limits |
| --- | --- | --- | --- | --- | --- |
| **PDF** | **Required** | Preserve original; detect digital text vs scan; render every page; OCR when needed; extract text/tables with page/object confidence; keep visual and extraction coverage separate. | Source Record + file + page + section/table/figure and, where available, bounding region. | Re-upload or new public filing creates a new Source Record; amended filings and signed/final versions do not overwrite drafts. | Password-protected files require an authorized unlocked copy; low-confidence OCR/table extraction cannot support a Fact without review; embedded attachments/scripts are not executed. |
| **PPTX** | **Required** | Parse slide text, tables, notes, chart labels/data when embedded, and object metadata; render slides for visual inspection; detect linked/embedded objects and missing fonts/media. | Source Record + slide number + object/title/table location; chart conclusions cite underlying source/model where available. | Every changed deck is a new Source Record; comments/notes and draft/final status remain version-specific. | Do not execute macros, follow external links, or treat an image of a number as structured evidence without visual/OCR coverage. PPTM is deferred. |
| **XLSX** | **Required** | Read workbook structure, sheets, cells, formulas and available cached values, names, tables, comments/notes, hidden state, units/period labels, and external-link/macro indicators; preserve the original workbook. | Source Record + workbook + sheet + exact cell/range/table; material derived outputs retain input-cell lineage. | A new workbook version is a new Source Record; normalized outputs go to derived artifacts/new versions and never rewrite the uploaded workbook. | No macro execution, external-link refresh, password cracking, or silent formula recalculation. XLSM/XLSB are deferred unless separately qualified. Broken links/circular references are visible blockers. |
| **DOCX** | **Required** | Parse body, headings, tables, headers/footers, footnotes/endnotes, and available comments/revision metadata; render for pagination/visual coverage; detect tracked changes. | Source Record + section/heading + paragraph/table/footnote; rendered page is an aid, not the sole native locator. | Each revised or executed document is a new Source Record; draft, redline, clean, and signed versions remain distinct. | Do not silently accept or reject tracked changes, flatten comments, or treat legal drafting as a product conclusion. DOCM is deferred. |
| **CSV** | **Required** | Detect encoding/delimiter/header; preserve raw rows and native column names; profile schema, dates, units, blanks, duplicate keys, and formula-like cells; normalize only into derived data. | Source Record + file + stable row/key + column/range; if rows have no stable key, cite immutable row number plus version. | Each export is a point-in-time Source Record with system/report/filter/extract metadata. | No silent type coercion or delimiter repair that changes values; ambiguous encoding, units, or schema limits reliance. |
| **ZIP / VDR export package** | **Required convenience for supported members** | Preserve original archive and directory manifest; safely enumerate paths; treat each supported member as its own Source Record linked to the container; retain folder path, export/index metadata, and missing/unsupported members. | Container Source Record + member path + the member's native locator. | Every export is a point-in-time snapshot; a later ZIP is another version/observation and does not prove full-room completeness. | Encrypted, nested, malformed, path-traversal, executable, or unsupported members are blocked/quarantined. The user provides an authorized decrypted export; the product does not retain archive passwords. |
| **Individual email / process-record export** | **Required in bounded form** | Accept individual `.eml` plus PDF/CSV/XLSX exports; preserve headers, body, attachments, sent/received time, participants, Message-ID/thread reference, and export metadata. Attachments become separate linked Source Records. | Message Source Record + Message-ID/date/sender/recipient/subject + body paragraph or attachment native locator. | Later exports/imports add new observations; edits, replies, forwards, and duplicate quoted text are not collapsed into one authoritative event. | Bulk PST/OST/MBOX/MSG ingestion is deferred. Imported text does not prove delivery, receipt, approval, or Process Event without applicable evidence. |

### 5.3 Material semantics

| Material | V1 treatment |
| --- | --- |
| **Management materials, CIM, teaser, and management presentation** | Treat as seller/management Claims unless corroborated. Preserve version and intended audience. Draft narrative may proceed; material claims require Evidence and banker acceptance before Fact or circulation-candidate use. |
| **Financial model and management financials** | Preserve reported, adjusted, normalized, lender, covenant, and transaction bases separately. Capture period, currency, unit, definition, formula/input lineage, and source version. A mechanically valid workbook is not automatically professionally usable. |
| **Buyer list** | Import candidates, rationale, evidence, exclusions, holds, and as-of date. An imported name does not prove banker approval, relationship, capacity, contactability, interest, or permission to contact. |
| **Process tracker** | Import as a source-backed snapshot. Status columns remain Claims or recorded Process Events according to their evidence. Never overwrite historical values or infer that an action occurred because it was planned. |
| **Bid log / IOI / LOI matrix** | Preserve exact Bid version, round, time, economics, conditions, financing, and source document. Missing original Bid material limits the matrix to an attributed summary. |
| **NDA tracker and Data-Room Access log** | Keep NDA execution, disclosure authorization, access grant/suspension/expiry/revocation, and actual events distinct. A tracker value alone does not authorize disclosure or access. |
| **Diligence/QoE/legal/tax/operational materials** | Preserve preparer, scope, date, limitations, version, and specialist posture. The product may extract and analyze; it does not adopt legal, tax, accounting, or specialist conclusions as its own. |
| **Email, meeting, and workflow records** | Attribute statements and distinguish a Process Event from interpretation, proposed action, draft, or unverified recollection. Use exported records to update the Deal only through an explicit, traceable import/review step. |

## 6. Source rights and actual availability

### 6.1 Rights are a first-class gate

Before a non-public Source Record becomes processable, record:

- source owner and the party granting authority;
- the user's relationship to that authority (owner, firm user, client-authorized adviser, licensed subscriber, or other);
- allowed purposes and Deal scope;
- permission to upload to a third-party SaaS;
- permission for storage, parsing, AI/model processing, and deterministic processing;
- permission to create and retain derived outputs;
- internal-sharing and external-disclosure/redistribution limits;
- attribution, notice, expiry, deletion, and post-termination requirements; and
- any clean-team, NDA, MNPI, competitor, personal-data, or jurisdictional restrictions.

Recommended rights posture:

| Rights posture | Effect |
| --- | --- |
| `unassessed` | Metadata/intake only; no substantive processing or reliance. |
| `permitted` | Process for the recorded Deal purpose within recorded conditions. |
| `permitted-with-limits` | Enforce limits on AI path, retention, attribution, sharing, output, or audience. |
| `blocked` | Do not process or rely; exclude from Source Packets and downstream outputs. |
| `expired-or-withdrawn` | Stop prospective use; preserve only the permitted historical/audit record, run Impact Assessment, and block affected circulation. |

The user's authority attestation is necessary but not magical. If known provider terms or a supplied agreement contradict the attestation, the stricter condition controls until resolved.

### 6.2 Public versus licensed sources

| Question | Public/primary source | Licensed/commercial source |
| --- | --- | --- |
| Access | Openly accessible under source rules; some APIs may be unauthenticated. | Requires a subscription, account, entitlement, API key, contract, or authorized export. |
| Ownership | Public access does not necessarily remove copyright or third-party rights. | Provider/licensor typically retains ownership and grants limited use. |
| Product processing | Allowed only to the extent source terms and applicable rights permit. | Never assumed from the user's ability to view/download. Third-party SaaS and AI processing may require explicit permission. |
| Derived output | Cite and preserve qualifications; do not copy excessive protected content. | The contract must cover derived data and intended internal/external output. “Derived” does not automatically escape the license. |
| Redistribution | Government-source rules may permit it; issuer/third-party content varies. | Usually restricted or separately licensed; user-facing raw data delivery and cross-customer pooling are prohibited by default. |
| Freshness | Product records filing/release/access/as-of and amendments. | Product records provider, dataset, entitlement, pull time, as-of, version, and coverage. |

### 6.3 Provider-by-provider boundary

| Provider named in the official plugin | Verified public evidence | V1 decision |
| --- | --- | --- |
| **FactSet** | FactSet publishes third-party terms that can restrict information to internal use and require consent for redistribution; specific rights depend on the dataset and agreement. [FactSet Third-Party Terms](https://www.factset.com/third-party-terms) | Not bundled. Customer export is optional and rights-gated; direct access is a future commercial integration. |
| **LSEG** | LSEG distinguishes internal distribution from downstream redistribution and describes redistribution as a separately governed licensing chain, including derived-data use. [LSEG Data Redistribution](https://www.lseg.com/en/data-analytics/market-data/data-redistribution) | Not bundled. No raw or derived customer-facing use without the applicable license. |
| **S&P Capital IQ / S&P Global Market Intelligence** | S&P says its information is proprietary and commercial use requires permission; its terms include provider-specific restrictions and third-party approvals. [S&P Market Intelligence Disclosures](https://www.spglobal.com/market-intelligence/en/legal/disclosures); [S&P Terms](https://www.spglobal.com/en/terms-of-use) | Not bundled. A desktop subscription is not an integration or redistribution license. |
| **PitchBook** | PitchBook's terms tie use to an authorized subscriber/order and restrict transfer, sale, distribution, display, or disclosure except as expressly permitted. [PitchBook Terms](https://pitchbook.com/terms-of-use) | Not bundled. Customer export is rights-gated and Deal-isolated; API/product use requires a future agreement. |
| **Moody's** | Moody's terms describe its ratings/opinions and content as proprietary and subject to use restrictions; customer agreements may differ. [Moody's Terms](https://www.moodys.com/web/en/us/legal/terms-of-use.html) | Not bundled. Public ratings pages and licensed datasets retain distinct rights; do not treat either as unrestricted data. |
| **Third Bridge** | Third Bridge licenses content to authorized users, retains IP, and restricts copying, distribution, commercial exploitation, and use outside stated internal purposes. [Third Bridge Content Terms](https://www.thirdbridge.com/en-us/about-us/compliance/policies/third-bridge-content-terms-and-conditions) | Not bundled. Expert content is not a public source and cannot be pooled or exposed without explicit rights. |
| **Daloopa** | Daloopa's public terms restrict copying/storage/redistribution and explicitly restrict using content to train AI, exposing it to open/public AI, and third-party provider retention absent permitted terms. [Daloopa Terms](https://daloopa.com/terms-of-use) | Treat customer exports as **blocked for AI processing by default** unless a specific agreement affirmatively permits this product's use. Future commercial integration only. |
| **Quartr** | Quartr documents plan-specific dataset entitlements, API keys, `403` for datasets outside the plan, and separately purchased datasets. [Quartr Authentication](https://quartr.com/docs/rest-api/auth); [Quartr Data Fetching](https://quartr.com/docs/rest-api/fetching-data) | Not bundled. Callable API documentation is not entitlement; product use requires the customer's or product's applicable plan and rights. |
| **Datasite** | Developer/API participation does not grant VDR service access without a separate commercial agreement. [Datasite API Program Terms](https://www.datasite.com/en/legal/api-program-terms) | Export-only V1; direct read is future, commercial, customer-authorized, and evidence-gated. |

No provider's public marketing page establishes the product's right to store, transform, train on, or redistribute its data. The actual order form, data license, user terms, dataset licensor terms, and intended output control.

## 7. Confidentiality and data-governance boundary

### 7.1 Preconditions for real Deal Materials

The product may accept real or confidential Deal Materials only after all of these controls are implemented and verified:

1. authenticated account access;
2. tenant/account isolation and Deal-level isolation;
3. encryption in transit and at rest;
4. secure handling and separation of credentials/secrets;
5. self-serve export and deletion;
6. minimum audit records and Source Record provenance;
7. explicit model/provider settings that do not use customer Deal Materials to train shared models by default; and
8. accurate disclosure of subprocessors, external processing, training, retention, deletion, and support access.

Until then, the product is limited to public, synthetic, or genuinely de-identified materials. A filename change, masking only the company name, or replacing a few customer names is not automatically de-identification if the transaction or parties remain reasonably identifiable.

### 7.2 Data classification

| Class | Default examples | Minimum posture |
| --- | --- | --- |
| **Public** | SEC filing, government release, issuer-posted public document | Deal-scoped provenance and citation still required. |
| **Internal** | User's non-public template, personal workflow note with no live Deal content | Account-private; no cross-customer use. |
| **Confidential Deal Material** | Management financials, CIM, teaser, model, VDR export, buyer/process tracker, email, bid | Default for every non-public Deal upload; Deal-isolated, encrypted, no shared-model training, audited export/deletion. |
| **Restricted Deal Material** | Customer-level data, pricing/margin, employee data, pipeline, unannounced transaction/MNPI, clean-team or competitor-restricted material, credentials | Strongest source/audience conditions; excluded from an AI/provider path unless its retention and contractual posture satisfy the recorded restriction. No routine operator access. |

Classification attaches to the Source Record and may restrict derived Evidence, Analysis, and Deliverables. A derived summary does not automatically become less confidential.

### 7.3 Isolation

- One customer's data may not be retrieved, cached, indexed, evaluated, benchmarked, or used for another customer.
- One Deal Workspace may not retrieve from another Deal by default, even for the same Individual Banker.
- Reusable workflow structure may cross Deals; confidential facts, sources, embeddings, prompts, outputs, and decisions may not.
- Every model/provider request, extraction job, export, and audit event must remain bound to the exact Deal and source versions.
- Advanced team permissions are deferred, but deferral does not permit a global source pool.

### 7.4 Credentials and connector secrets

V1 upload/export-only operation requires no customer connector credential. For any later connector:

- use delegated OAuth or provider-supported scoped credentials, never a user's password or shared login;
- request the least privilege and prefer user-selected/read-only access;
- store secrets outside Deal Materials, logs, prompts, exports, and Source Records;
- show connection, authentication, entitlement, and successful read as separate states;
- revoke future reads on disconnect while preserving already imported Source Records only as rights/retention permit; and
- audit connection, read, refresh, failure, revoke, and secret-rotation events without logging secret values or source content unnecessarily.

### 7.5 Retention, export, deletion, and closure

**Product decision.**

- While an account is active, the user controls whether a Deal remains active, archived, exported, or deleted. Archival is not deletion.
- The product must provide a self-serve Deal export containing original user-uploaded materials, the Source Registry, permitted derived work, Deliverable Revisions, Decisions, and audit/provenance records. Provider-licensed raw content is omitted or restricted when the license forbids export.
- A Deal deletion immediately removes normal user/product access and starts permanent deletion from active systems within **30 days**; residual encrypted backup copies expire through the ordinary backup lifecycle within **90 days**, unless a disclosed legal/security preservation obligation applies.
- Account closure provides a **30-day read-only export window** by default, with an immediate-delete option. After the window, the same active-system and backup deletion clocks apply.
- Connector secrets are revoked/deleted at disconnect or closure and are never retained merely to preserve historical provenance.
- Minimum non-content billing, security, or legal records may be retained only for a stated purpose and period. They may not contain reusable Deal Materials.
- Withdrawal from reliance and deletion are different: a withdrawn Source Record remains historical when retention is permitted, but cannot support current work. Deletion removes the retained content according to the deletion policy.

These are product promises, not claims about a chosen storage or backup implementation.

### 7.6 Model-training and provider-processing rule

- Customer Confidential or Restricted Deal Materials are never used to train a shared product or foundation model by default.
- Product telemetry and evaluation datasets exclude Deal content unless the customer makes a separate, explicit, revocable opt-in for an exact purpose and dataset. Ordinary acceptance of product terms is not that opt-in.
- Feedback buttons and support tickets must not silently send the associated Deal content into model-training or provider feedback programs.
- A business/API provider's “no training by default” setting is mandatory but not sufficient. The product also records provider, endpoint/tool, region where applicable, application-state retention, abuse-monitoring retention, and any third-party tool/MCP transmission.
- Restricted Deal Materials are processed only through a path compatible with their recorded retention/rights limits; otherwise the source is excluded from AI processing and remains available only for permitted deterministic/manual handling.

### 7.7 Minimum audit and provenance record

Record, at minimum:

- actor/account, Deal, action, purpose, timestamp, and result;
- source creation, receipt/retrieval, content identity, authority, rights, confidentiality, version, and exact origin;
- parse/OCR/normalization status and coverage;
- Source Packet inclusion/removal;
- new version, conflict, freshness change, supersession, withdrawal, and deletion;
- connector authorization/read/revoke when connectors exist;
- provider/model processing dispatch and returned object/version identifiers without unnecessary source content;
- Claim/Fact/Assumption and source-reliance changes;
- Impact Assessment, recalculation/regeneration/re-review/circulation-block results;
- export, download, account closure, and deletion completion; and
- any exceptional provider/operator access, including user authorization and duration.

The provider supplies no routine human banker review and therefore has no standing reason to inspect Deal Materials. Exceptional support access must be explicit, least-privileged, time-bounded, and audited.

## 8. Customer-authorized connector priority

No connector is implemented or installed by this decision.

| Priority | Source | Decision boundary | Upload/export substitute |
| --- | --- | --- | --- |
| **V1** | Local upload and user-created export | Core path. User actively selects every file or bounded archive. | N/A |
| **P1 after V1** | Google Drive; OneDrive/SharePoint | First connectors to evaluate. Read-only, user-selected files/folders, Deal-scoped import; no broad background crawl or writeback. | Download/upload or ZIP export fully preserves V1 value. |
| **P2** | Dropbox | Read-only selected-file import. Valuable but less central than Google/Microsoft file stores for the Initial Design ICP. | Download/upload. |
| **P2** | Gmail; Outlook | User-selected message/thread and attachment import only; never send, draft, modify, delete, or mark process status. Verification/admin requirements may prevent fully frictionless setup. | `.eml`, PDF, CSV/XLSX tracker, or bounded mailbox export. |
| **P3** | Slack; Teams | Selected channel/chat/message import only after clear Deal scoping and permissions. Never post or mutate. | Message export, meeting notes, email, and process tracker. |
| **P4 / future commercial** | Datasite and other VDRs | Read-only, Deal/project-scoped access after provider contract, customer authorization, entitlement, download restrictions, and audit behavior are verified. | VDR export/ZIP and index. |
| **Future commercial or BYO-rights** | FactSet, LSEG, S&P, PitchBook, Moody's, Third Bridge, Daloopa, Quartr | Provider-specific entitlement and license; no shared pool; no assumed AI or redistribution right. | User-authorized export, public primary source, or explicit Assumption with downgraded readiness. |

The prioritization is based on V1 workflow necessity, permission friction, and the quality of an export substitute—not on competitor avoidance.

## 9. Source governance

### 9.1 Required Source Record control fields

Every Source Record must preserve:

- stable Source Record ID and Deal ID;
- Source Material identity, original filename/object/URL and native path;
- origin and acquisition method (upload, export, public retrieval, future connector);
- owner, author/issuer/system, authority basis, and rights posture;
- confidentiality class and audience/use restrictions;
- document/event/effective/as-of/access/received dates and period covered;
- version, draft/executed/amended status, and content identity;
- parse/OCR/table/visual coverage and confidence;
- source type and native citation locator;
- freshness expectation and current freshness state;
- conflict links and materiality;
- supersession/withdrawal history and reason;
- Source Reliance State for the stated purpose; and
- dependent Claims, Facts, Assumptions, Analysis, Models, Deliverables, Reviews, and Decisions.

### 9.2 Independent source dimensions

Do not collapse these dimensions into one `current` flag:

| Dimension | States / rule |
| --- | --- |
| **Rights** | unassessed, permitted, permitted-with-limits, blocked, expired/withdrawn |
| **Source Reliance State** | unassessed, reliance-limited, reliance-eligible, blocked |
| **Freshness** | current, current-but-volatile, stale-for-current-use, unknown freshness, historical |
| **Conflict** | none identified, possible, material unresolved, resolved with rationale |
| **Disposition** | active, superseded for stated scope, withdrawn, deleted |
| **Extraction** | received, parsed, OCR/table/visual work required, partially extracted, verified for stated use, blocked |

### 9.3 Governance actions

- **Freshness:** derive from the intended use and source type, not file age alone. A current market price needs a timestamp; a signed historical contract may remain authoritative for its historical scope.
- **Conflict:** retain all conflicting Source Records and identify differences in definition, period, unit, scope, version, or meaning. Never silently average or select the favorable value.
- **Supersession:** a later file does not automatically supersede an earlier one. Record the scope, replacement, effective point, actor/authority, and rationale.
- **Withdrawal:** immediately remove the source from current reliance and prospective Source Packets, retain permitted history and reason, and run Impact Assessment.
- **Stale:** preserve historical use but block current claims whose intended use requires fresher evidence.
- **Lost connector/provider access:** does not erase a lawfully retained historical Source Record, but blocks refresh and may make current use stale or rights-limited.

### 9.4 Consequence by downstream object

| Source condition | Claim / Fact | Analysis / Model | Deliverable Readiness | Circulation Candidate |
| --- | --- | --- | --- | --- |
| Missing but non-material | Omit or label unknown | Continue within stated scope | Working draft may continue | Allowed only if irrelevant to intended audience/purpose and recorded as such |
| Missing and material | Claim remains unsupported; no Fact | Draft, sensitivity, or explicit Assumption only | Cannot pass the affected readiness gate | **Blocked** |
| Rights unassessed/blocked | Do not use content substantively | Exclude or regenerate without it | Dependent work is blocked | **Blocked** |
| Parse/OCR/visual coverage insufficient | Claim limited to verified portions | No unsupported extraction as input | Draft or needs-review | **Blocked** for affected material content |
| Stale for intended use | Mark stale; no current Fact | Historical/sensitivity use only; current conclusion downgraded | Draft or re-review required | **Blocked** when the claim is time-sensitive/material |
| Material unresolved conflict | No Fact; show competing Claims | Run both cases or stop at conflict | Senior review may inspect the conflict, but professional-use posture is limited | **Blocked** until resolved or an explicit, permissible Assumption/decision governs the exact use |
| Superseded | Historical only | Prior output remains historical; recalculate if affected | New Revision/re-review may be required | Prior prospective candidate is **blocked** if controlling input changed materially |
| Withdrawn | No prospective reliance | Exclude and assess all dependents | Regeneration/re-review required where material | **Blocked** |

An explicit Banker Assumption can allow analysis to continue when Evidence does not determine an input. It cannot cure missing upload authority, provider-license restrictions, a withdrawn source, or a false claim of external authorization.

## 10. Missing-Source Consequence Matrix

| Core source or control | Work that can continue | Draft-only / downgraded work | Blocked Deliverable or external-use posture | Banker action required |
| --- | --- | --- | --- | --- |
| **Upload/use authority and rights** | Public/synthetic sample path; metadata-only intake | None on the unapproved content | All processing, reliance, and external-use states | Confirm authority and source-specific rights or remove the source |
| **Deal identity, side, perimeter, stage, and intended use** | File inventory and format preflight | Generic source checklist | Deal-specific Analysis, Process State, and Deliverables | Supply/confirm controlling context |
| **At least one identifiable seller/management source** | Public company/background research; workspace setup | Generic diligence request and source map | A Deal-specific seller-claim ledger, equity story, CIM/teaser conclusion | Upload an authorized anchor source or use the sample path |
| **Current historical financials/KPIs** | Narrative/source review, buyer/process setup | Financial sections with explicit unknowns; no current performance conclusion | Financial normalization, model-ready posture, material financial Claims, related circulation candidate | Provide current management financials/GL/TB/KPI export or accept omission; an Assumption cannot turn missing actuals into Facts |
| **Budget/forecast/current model** | Historical normalization, diligence, process work | Forecast/valuation/scenario work on explicit banker Assumptions | Forecast-dependent recommendation or externally used forecast/model output | Supply current version or approve exact Assumptions and limitations |
| **Definitions, units, periods, currency, or reconciliation support** | Source inventory; raw extraction | Comparative work with explicit alternatives | Professionally usable quantitative conclusion and affected circulation | Confirm definition/mapping or provide reconciliation |
| **QoE or other diligence report** | CIM teardown, management-claim analysis, first-wave requests | Seller/management-based EBITDA and risk view | Any claim that QoE findings are confirmed; circulation if the report is material to the stated purpose | Provide report or accept explicitly seller-claim-led posture |
| **VDR index/export completeness evidence** | Analyze files actually received | Data-room gap list; no completeness claim | Statement that diligence packet or VDR review is complete | Provide authorized index/export and explain scope/omissions |
| **Buyer universe / client preferences** | Build candidate research from public/authorized sources | Candidate universe only | Approved Buyer, Outreach Wave, or contact decision | Approve candidates and provide preferences/exclusions |
| **Do-not-contact, conflict, competitor, customer/vendor, or confidentiality restrictions** | Internal candidate research with holds | Restricted candidate list | Outreach Wave, buyer-specific disclosure, or circulation to a Buyer | Confirm restrictions and explicitly approve the intended Buyer/audience |
| **Relationship/contact/capacity evidence or licensed database** | Public-fit research and rationale | Relationship/contactability/capacity remains unknown | Claims of relationship, interest, contactability, or ability to transact | Provide authorized CRM/provider export or confirm unknown; no invented contact data |
| **Process tracker / dated process history** | Preparation work and artifact drafting | Current Process State as unknown/partial | Current claims about outreach, NDA, access, diligence, deadlines, or buyer status | Upload current tracker/export or confirm exact events |
| **Executed NDA and disclosure/access authority** | Internal work | None for buyer disclosure | Buyer-facing disclosure, material delivery, or Data-Room Access for that party | Provide applicable NDA/evidence and make a separate external-use/access decision |
| **Email/meeting/chat record** | Use tracker and signed documents if they evidence the event | Attributed recollection/management statement | Claim that an external action or approval occurred when no other evidence exists | Provide bounded export or explicitly confirm it as a Human Decision where appropriate |
| **Original IOI/Bid/LOI or exact version** | Process chronology and request for source | Attributed bid summary | Decision-grade bid comparison, selection, or claim of terms | Provide exact document/version or confirm limitations; material economics should not rest on an uncited summary |
| **Public/market data** | Private-company source work, internal diligence, process control | Market/peer/buyer context omitted or dated | Current market, comps, ratings, or benchmark conclusion | Allow primary public retrieval, provide licensed export, or accept omission/dated Assumption |
| **Firm template/style precedent** | Analysis and generic editable draft | Firm-format draft | Only a firm-template-specific readiness claim; not the underlying analysis | Upload authorized template/precedent or accept generic artifact posture |
| **Controlling source/model for an existing Deliverable Revision** | Content inventory and visual scan | Heuristic QC findings | Source/model tie-out and circulation candidate | Provide exact controlling source/model version |
| **Source date/version/freshness metadata** | Parse and historical inventory | Unknown-freshness draft | Current Fact and affected circulation | Confirm metadata or provide a current version |

The system must explain the **output ceiling** created by each gap, not merely show a missing-file warning.

## 11. Data-room and external-system boundary

### V1 rule

- Read only materials the user actively uploads or exports.
- Accept a VDR/data-room ZIP only as a snapshot supplied by an authorized user; do not imply it is complete or synchronized.
- Preserve the archive, index, directory path, export time, permissions/context supplied by the user, and all unsupported/missing members.
- Do not log into, crawl, modify, upload to, reorganize, annotate, watermark, or delete from a VDR.
- Do not grant, suspend, expire, or revoke Data-Room Access.
- Do not send source requests, emails, messages, teasers, CIMs, NDAs, or other materials.
- Do not convert an internal draft/recommendation into an external action.

### Future read-only integration rule

A future VDR or external-system connector is eligible for consideration only if evidence establishes:

1. provider API/MCP availability for the intended customer plan and geography;
2. a product/provider commercial agreement where required;
3. customer and project-level authority;
4. item-level or bounded-folder read scope and download restrictions;
5. data-processing, AI, retention, derived-output, and redistribution rights;
6. stable item/version/event provenance;
7. safe credential revocation and audit behavior; and
8. a no-mutation mode that the product can enforce.

The existence of a write-capable API does not justify enabling writes. External mutation and action remain outside V1.

## 12. Self-serve onboarding rules

### 12.1 Two entry paths

1. **Public/synthetic evaluation path** — available before the user has live-deal authority or before confidential controls are verified. Produces an inspectable sample Deal Workspace without Confidential Deal Materials.
2. **Authorized live Deal path** — requires authority/confidentiality confirmation and the minimum controls in §7 before upload.

### 12.2 Minimum to establish the first Deal Workspace

The user must provide:

- Deal identity/perimeter, sell-side role, business stage, intended purpose/audience, currency/units, and authority confirmation; and
- at least one authorized **anchor source**: a CIM, management presentation, teaser, financial pack/model, diligence document, or bounded VDR export.

That is enough to create the Source Registry, inspect the packet, extract Claims, identify gaps, and produce a controlled working-draft posture. It is **not** enough to promise the complete hero outcome.

### 12.3 Progressive source packs

| Capability level | Minimum additional source class | Maximum honest output posture |
| --- | --- | --- |
| Workspace established | Deal context + one anchor source + authority | Source inventory, Claim map, missing-source plan |
| Financial/diligence work enabled | Current historical financials/KPIs plus definitions/reconciliation; forecast/model when forward work is requested | Working draft or analysis-ready within the supported scope |
| Materials preparation enabled | Controlling management/seller sources, approved financial definitions/Assumptions, current model outputs, intended audience | Senior-review-ready draft only when material source gates pass |
| Buyer/process operation enabled | Buyer candidates/preferences/restrictions plus dated tracker/events and current NDA/access/bid sources as applicable | Current internal Deal Book/process view; no autonomous external action |
| Circulation candidacy possible | Exact intended Revision, all material controlling sources/current versions, resolved rights/freshness/conflicts, applicable QC/review and Banker judgments | `circulation-candidate`; still not externally authorized |

### 12.4 Product explanation requirement

After intake, the product must state:

- what it received and could/could not parse;
- exact versions, dates, authority, rights, and confidentiality posture;
- which source classes are absent, stale, conflicted, superseded, withdrawn, or blocked;
- the highest achievable Source Reliance, Analysis State, and Deliverable Readiness for the current packet;
- which Claims remain seller/management Claims or Assumptions;
- what work can proceed now;
- what cannot proceed or circulate; and
- the next smallest banker-provided source or confirmation that would raise the output ceiling.

This is a product rule, not a detailed UI design.

## 13. Non-negotiable invariants

1. Access is not authority; authority is not truth; truth is not external-use permission.
2. A provider named in a manifest is not installed, authenticated, entitled, licensed, readable, or contractually usable.
3. A user's provider subscription is not automatically a right to expose data to a third-party SaaS, AI provider, other user, or external audience.
4. Public availability is not automatically public-domain status or unrestricted commercial redistribution.
5. File receipt is not parsing; parsing is not Evidence; Evidence is not a Fact.
6. A later source never erases the prior Source Record or its historical use.
7. A new file does not automatically supersede the old one, and a connector refresh does not silently replace a source.
8. Missing, stale, conflicted, withdrawn, rights-blocked, or extraction-blocked material must reduce readiness or block circulation.
9. An Assumption may bridge absent Evidence for a stated analysis; it cannot cure missing rights or external authorization.
10. Confidential and Restricted Deal Materials never cross tenants or Deals and never train shared models by default.
11. V1 performs no external-system mutation or external communication.
12. `circulation-candidate` remains internal until an exact External-Use Decision exists; this ticket does not define that decision workflow in detail.

## 14. Deferred questions owned elsewhere

- The exact AI reasoning, deterministic execution, abstention, provider-routing, evaluation, and Human Confirmation rules remain with [Define the AI, Evidence, Deterministic Calculation, and Human-Control Contract](../issues/07-define-ai-evidence-human-control-contract.md).
- Exact native-artifact fidelity, visual/round-trip acceptance, QC thresholds, and detailed Deliverable standards remain with [Define the Banker Deliverable and Quality Standard](../issues/08-define-banker-deliverable-quality-standard.md).
- Connector implementation, production storage/encryption/key architecture, malware pipeline, backup mechanism, incident runbook, compliance certification, and enterprise controls remain beyond this planning ticket.
- Exact commercial/provider agreements remain unresolved until the product chooses to negotiate them. No agreement is assumed by this asset.

No new Wayfinder ticket is required. Existing downstream tickets can consume this boundary without reopening it.

## 15. Source register and limitations

### Local authoritative sources

- Root domain glossary: `CONTEXT.md`
- [Official Investment Banking Capability Baseline](official-investment-banking-capability-baseline.md)
- [First End-to-End Deal Workflow and Premium Hero Outcome](first-deal-workflow-and-premium-hero-outcome.md)
- [Define the Founder Operating Envelope for a Premium Self-Serve Product](../issues/02-define-founder-operating-envelope.md)
- [Define the Deal Workspace Information Model and Lifecycle](../issues/05-define-deal-workspace-model-and-lifecycle.md)
- Installed plugin root: `/Users/wxm/.codex/plugins/cache/openai-curated-remote/investment-banking/0.1.29`
- Plugin source and provider controls: `.app.json`, `references/workflow-source-resolution.md`, `skills/investment-banking/SKILL.md`, `skills/user-context/references/source-category-runtime.md`, and the Daloopa/Quartr internal provider guides
- Plugin evidence/file controls: `shared/document_ingestion.py`, `shared/source_gate.py`, `skills/cim-teardown/SKILL.md`, `skills/cim-teardown/references/evidence-framework.md`, `skills/investment-banking/internal-support/financial-source-of-truth/references/evidence-hierarchy.md`, `skills/investment-banking/internal-support/financial-source-of-truth/references/staleness-and-conflicts.md`, and `skills/ib-deck-qc/references/extraction-and-tieout.md`

### External primary and official sources

| Source | Material use |
| --- | --- |
| [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) and [SEC website dissemination](https://www.sec.gov/about/privacy-information#website-dissemination) | Public primary-source access, update behavior, and public-information reuse boundary |
| [Google Drive API scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Drive downloads/exports](https://developers.google.com/workspace/drive/api/guides/manage-downloads), and [Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) | Per-file/broad access, download, restricted scopes, verification/security-assessment boundary |
| [Microsoft Graph driveItem content](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0), [message access](https://learn.microsoft.com/en-us/graph/api/message-get?view=graph-rest-1.0), [chat message access](https://learn.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0), and [permissions](https://learn.microsoft.com/en-us/graph/permissions-reference) | OneDrive/SharePoint, Outlook, Teams read scopes and version/change metadata |
| [Dropbox OAuth Guide](https://developers.dropbox.com/oauth-guide) | OAuth, App Folder/Full Dropbox, and least-privilege boundary |
| [Slack `channels:history`](https://docs.slack.dev/reference/scopes/channels.history/) | Channel membership and history-read scope |
| [Datasite API Program Terms](https://www.datasite.com/en/legal/api-program-terms) | Separate VDR commercial agreement, authorization, and third-party data-transmission boundary |
| [FactSet Third-Party Terms](https://www.factset.com/third-party-terms), [LSEG Data Redistribution](https://www.lseg.com/en/data-analytics/market-data/data-redistribution), [S&P Market Intelligence Disclosures](https://www.spglobal.com/market-intelligence/en/legal/disclosures), [PitchBook Terms](https://pitchbook.com/terms-of-use), [Moody's Terms](https://www.moodys.com/web/en/us/legal/terms-of-use.html), and [Third Bridge Content Terms](https://www.thirdbridge.com/en-us/about-us/compliance/policies/third-bridge-content-terms-and-conditions) | Licensed/internal use, ownership, attribution, derivative/redistribution, and authorized-user constraints |
| [Daloopa Terms](https://daloopa.com/terms-of-use), [Quartr API authentication](https://quartr.com/docs/rest-api/auth), and [Quartr data fetching](https://quartr.com/docs/rest-api/fetching-data) | AI/content restrictions, plan-specific entitlements, API keys, dataset access, and freshness mechanics |
| [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data#default-usage-policies-by-endpoint) and [OpenAI business data](https://openai.com/business-data/) | Training default, endpoint/application retention, ZDR/MAM qualification, and provider encryption claims |
| [FINRA Regulatory Notice 21-29](https://www.finra.org/rules-guidance/notices/21-29), [FINRA Regulatory Notice 24-09](https://www.finra.org/rules-guidance/notices/24-09), and [SEC Release 2024-58](https://www.sec.gov/newsroom/press-releases/2024-58) | Conditional vendor, privacy, AI-governance, incident, access, encryption, and data-disposition context |

All external sources were accessed 2026-07-31.

### Evidence limits

- Public vendor terms are not substitutes for a customer's order form, data-license schedule, third-party licensor terms, or negotiated agreement.
- No provider account, entitlement, API key, paid trial, data purchase, or live connector was used.
- No claim is made that Google, Microsoft, Dropbox, Slack, Datasite, or a data provider will approve the future product or a particular customer configuration.
- File-format behavior is a product decision and acceptance boundary; it is not a claim that the installed plugin already implements that ingestion fidelity.
- Security and retention statements above are required product promises, not proof that a production system currently exists.
- Regulatory sources are applied conditionally and do not convert this asset into legal advice or a universal requirement for every user, firm, or transaction.
