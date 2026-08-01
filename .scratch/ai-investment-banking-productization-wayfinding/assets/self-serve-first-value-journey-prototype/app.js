/*
 * PROTOTYPE / THROWAWAY — Ticket 9 only.
 * Three structurally independent UI variants share one synthetic fixture and
 * one in-memory state model. No production services or real Deal data.
 */

const VARIANTS = {
  A: "Guided First-Deal Journey",
  B: "Deal Execution Desk",
  C: "Package Readiness Workbench",
  H: "Validated Hybrid · C → A → B",
};

const FIXTURE = {
  deal: {
    id: "DEAL-NORTHSTAR-001",
    name: "Project Northstar",
    entity: "Northstar Industrial Systems, Inc.",
    side: "Sell-Side",
    stage: "Preparation",
    currency: "USD",
    intendedUse: "Prepare a controlled auction launch package",
  },
  sources: [
    {
      id: "SR-001",
      name: "Draft_CIM_v3.pdf",
      type: "PDF",
      locator: "display p.18 · Table 4 · Adjusted EBITDA row",
      value: "$18.4m",
      claim: "Seller-reported Adjusted EBITDA",
      rights: "permitted-with-limits",
      confidentiality: "Confidential Deal Material",
      freshness: "current",
      extraction: "OCR/table verification required",
      reliance: "reliance-limited",
    },
    {
      id: "SR-002",
      name: "Management_Model_v7.xlsx",
      type: "XLSX",
      locator: "Operating Case!F42 / Balance Sheet!F28",
      value: "$17.8m EBITDA · $4.7m Cash",
      claim: "Management model operating case",
      rights: "permitted",
      confidentiality: "Confidential Deal Material",
      freshness: "current",
      extraction: "parsed · one corrected field",
      reliance: "reliance-eligible after decisions",
    },
    {
      id: "SR-003",
      name: "Customer_Cohorts_Q2.csv",
      type: "CSV",
      locator: "row C-104 · retention_rate",
      value: "96%",
      claim: "Retention Claim with incomplete definition",
      rights: "internal-analysis-only",
      confidentiality: "Restricted Deal Material",
      freshness: "current",
      extraction: "parsed",
      reliance: "blocked for buyer-facing use",
    },
    {
      id: "SR-004",
      name: "Process_Tracker.xlsx",
      type: "XLSX",
      locator: "Milestones!A12:H24",
      value: "Preparation process snapshot",
      claim: "Process status observations",
      rights: "permitted",
      confidentiality: "Confidential Deal Material",
      freshness: "current",
      extraction: "parsed",
      reliance: "reliance-eligible",
    },
    {
      id: "SR-005",
      name: "Synthetic_QoE_Summary.pdf",
      type: "PDF",
      locator: "display p.6 · Adjusted EBITDA bridge",
      value: "$17.8m scoped support",
      claim: "Synthetic corroborating QoE evidence",
      rights: "permitted",
      confidentiality: "Synthetic / public-safe",
      freshness: "current",
      extraction: "native text + reviewed table",
      reliance: "reliance-eligible",
    },
    {
      id: "SR-006",
      name: "July_Actuals.xlsx",
      type: "XLSX",
      locator: "Monthly Actuals!G8:G41",
      value: "July actuals event",
      claim: "New current-period management results",
      rights: "permitted",
      confidentiality: "Synthetic / public-safe",
      freshness: "new",
      extraction: "parsed after event",
      reliance: "impact assessment required",
    },
  ],
  artifacts: [
    { id: "analysis", name: "Analysis & Valuation Workbook", format: "XLSX", role: "Quantitative spine", required: true },
    { id: "auction", name: "Auction Control Workbook", format: "XLSX", role: "Process spine", required: true },
    { id: "teaser", name: "Blind Teaser", format: "PPTX", role: "Stage-triggered marketing artifact", required: true },
    { id: "cim", name: "CIM / Information Memorandum", format: "PPTX", role: "Stage-triggered marketing artifact", required: true },
    { id: "memo", name: "Bid Evaluation & Recommendation Memo", format: "DOCX", role: "Decision artifact", required: false },
    { id: "reader", name: "Exact Reader-Facing Copies", format: "PDF", role: "Frozen representations", required: true },
    { id: "records", name: "Evidence & Control Records", format: "CSV / JSON", role: "Lineage, QC, decisions", required: true },
    { id: "archive", name: "Deal Export / Archive Package", format: "ZIP", role: "Immutable portable package", required: true },
  ],
};

const JOURNEY_STEPS = [
  "Public discovery",
  "Simulated purchase",
  "Create first Deal",
  "Authority & confidentiality",
  "Select Source Packet",
  "Authorize work objective",
  "Supervise work state",
  "Recover exceptions",
  "Evidence & Human Decisions",
  "Deterministic QC",
  "Package & reader review",
  "External use, export & return",
];

const B_TABS = [
  ["deal", "Deal Brief"],
  ["events", "Event Inbox"],
  ["sources", "Sources"],
  ["work", "Work Queue"],
  ["evidence", "Evidence & Decisions"],
  ["analysis", "Analysis"],
  ["package", "Execution Package"],
  ["readiness", "QC & Readiness"],
  ["history", "History & Export"],
];

function initialState() {
  return {
    screen: "discovery",
    showProof: false,
    modal: null,
    toast: "",
    clock: 0,
    journeyIndex: 0,
    bTab: "deal",
    cArtifact: "analysis",
    selectedEvidence: "cash",
    dealCreated: false,
    authorityConfirmed: false,
    packetSelected: false,
    selectedSources: ["SR-001", "SR-002", "SR-003", "SR-004"],
    objectiveAuthorized: false,
    workStarted: false,
    packageGenerated: false,
    qcRun: false,
    qcPassed: false,
    readiness: "working-draft",
    currentRevision: "0.3",
    priorRevision: null,
    externalAuthorized: false,
    exported: false,
    returned: false,
    refreshCompleted: false,
    decisions: {
      factAccepted: false,
      factRejected: false,
      assumptionApproved: false,
      conflictResolved: false,
      unsupportedExcluded: false,
      impactReviewed: false,
    },
    correction: {
      originalCash: 6.2,
      currentCash: 6.2,
      version: 1,
      history: ["v1 · AI extracted Cash as $6.2m from SR-002 / Balance Sheet!F28"],
    },
    issues: {
      missing: true,
      stale: false,
      ocr: true,
      tieout: true,
      conflict: true,
      unsupported: true,
      restriction: true,
      circulationHold: true,
    },
    impact: [
      "Waiting for a material correction or new Source Record",
    ],
    events: [
      { time: "09:00", text: "Synthetic Project Northstar session opened in browser memory." },
    ],
    lastUpdate: "09:00 · Prototype opened",
  };
}

let state = initialState();

function variantFromUrl() {
  const value = new URLSearchParams(window.location.search).get("variant") || "A";
  return VARIANTS[value] ? value : "A";
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nextTime() {
  state.clock += 1;
  const minutes = state.clock * 3;
  const hour = 9 + Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function record(text) {
  const time = nextTime();
  state.events.unshift({ time, text });
  state.events = state.events.slice(0, 28);
  state.lastUpdate = `${time} · ${text}`;
}

function notify(text) {
  state.toast = text;
}

function activeIssueKeys() {
  return Object.entries(state.issues)
    .filter(([, active]) => active)
    .map(([key]) => key);
}

function activeBlockers() {
  const labels = {
    missing: "Material QoE source missing",
    stale: "Process tracker stale for current use",
    ocr: "Material OCR/table region unverified",
    tieout: "EV-to-equity tie-out failed by $1.5m",
    conflict: "Adjusted EBITDA source conflict unresolved",
    unsupported: "96% retention Claim unsupported",
    restriction: "Restricted source reaches reader copy",
    circulationHold: "Internal circulation hold active",
  };
  const issueBlockers = activeIssueKeys().map((key) => labels[key]);
  if (state.workStarted && !state.decisions.factAccepted) issueBlockers.push("Material Fact acceptance pending");
  if (state.workStarted && !state.decisions.assumptionApproved) issueBlockers.push("FY27 8.0% growth Assumption pending");
  return issueBlockers;
}

function pendingDecisions() {
  if (!state.workStarted) return 0;
  return [
    state.decisions.factAccepted,
    state.decisions.assumptionApproved,
    state.decisions.conflictResolved,
    state.decisions.unsupportedExcluded,
    state.decisions.impactReviewed,
  ].filter((done) => !done).length;
}

function packetName() {
  if (!state.packetSelected) return "Not selected";
  return `Preparation Packet v${state.returned ? "2" : "1"} · ${state.selectedSources.length} records`;
}

function workStage() {
  if (!state.dealCreated) return "No Deal";
  if (!state.authorityConfirmed) return "Authority preflight";
  if (!state.packetSelected) return "Source intake";
  if (!state.objectiveAuthorized) return "Objective selection";
  if (!state.workStarted) return "Ready to authorize work";
  if (activeBlockers().length) return "Controlled work · exceptions open";
  if (!state.qcRun) return "Awaiting deterministic QC";
  if (!state.packageGenerated) return "Deliverable generation";
  if (state.returned && !state.refreshCompleted) return "Impact-driven refresh";
  return "Package review";
}

function statusClass(value) {
  const lower = String(value).toLowerCase();
  if (lower.includes("pass") || lower.includes("candidate") || lower.includes("authorized") || lower.includes("complete")) return "good";
  if (lower.includes("block") || lower.includes("fail") || lower.includes("missing") || lower.includes("restricted")) return "bad";
  if (lower.includes("pending") || lower.includes("draft") || lower.includes("review") || lower.includes("not")) return "warn";
  return "neutral";
}

function pill(value, tone = statusClass(value)) {
  return `<span class="status-pill ${tone}">${esc(value)}</span>`;
}

function topbar(variant, extra = "") {
  return `
    <header class="topbar">
      <div>
        <div class="wordmark">Controlled Deal Workspace</div>
        <div class="muted" style="font-size:.72rem">Synthetic Project Northstar</div>
      </div>
      <div class="top-actions">
        ${extra}
        <span class="prototype-flag">Prototype / throwaway</span>
        <button class="button-quiet" data-action="reset">Reset state</button>
      </div>
    </header>`;
}

function statusGrid() {
  const blockers = activeBlockers();
  const qc = !state.qcRun ? "not run" : state.qcPassed ? "passed" : "failed / blocked";
  const cells = [
    ["Deal", state.dealCreated ? "Project Northstar" : "Not created"],
    ["Source Packet", packetName()],
    ["Work stage", workStage()],
    ["Blockers", blockers.length ? `${blockers.length} material` : "none active"],
    ["QC / readiness", `${qc} · ${state.readiness}`],
    ["Human Decisions", `${pendingDecisions()} pending`],
    ["Deliverable Revision", `Rev ${state.currentRevision}`],
    ["Last update", state.lastUpdate],
  ];
  return `<div class="status-grid">${cells.map(([label, value]) => `
    <div class="status-cell"><span class="label">${label}</span><strong title="${esc(value)}">${esc(value)}</strong></div>`).join("")}</div>`;
}

function commonDiscoveryProof() {
  return `
    <div class="proof-panel">
      <div class="section-head">
        <div>
          <div class="eyebrow">Inspectable product proof · synthetic</div>
          <h3>One number, its conflict, and the controlled output path</h3>
        </div>
        ${pill("No real Deal data", "neutral")}
      </div>
      <div class="evidence-chain">
        <span class="evidence-node">SR-002 · Operating Case!F42</span><span class="chain-arrow">→</span>
        <span class="evidence-node">$17.8m proposed Fact</span><span class="chain-arrow">→</span>
        <span class="evidence-node">Analysis XLSX cell</span><span class="chain-arrow">→</span>
        <span class="evidence-node">CIM Rev 0.3 slide</span><span class="chain-arrow">→</span>
        <span class="evidence-node">Exact PDF reader copy</span>
      </div>
      <p class="muted">SR-001 separately reports $18.4m. The product preserves both, requires a scoped Banker conflict decision, then reruns deterministic checks. A circulation candidate still requires a separate exact-Revision External-Use Decision.</p>
    </div>`;
}

function checkoutMarkup(variant) {
  return `
    <div class="checkout-shell">
      <div class="simulated-box">
        <div class="eyebrow">Simulated checkout · no charge · no account created</div>
        <div class="section-head">
          <div>
            <h1 style="font-size:2.6rem">Individual Deal Workspace</h1>
            <p class="muted">Pricing placeholder only. Ticket 10 owns price, billing unit, limits, trial, and refund policy.</p>
          </div>
          <div class="proof-number">$TBD</div>
        </div>
        <div class="two-grid">
          <div class="card card-pad">
            <h3>Self-serve access placeholder</h3>
            <p class="muted">Create one synthetic Deal, supervise controlled work, inspect lineage, preview native and reader-facing artifacts, and exercise the return loop.</p>
          </div>
          <div class="card card-pad">
            <h3>What this does not grant</h3>
            <p class="muted">Purchasing software does not grant authority to upload, process, rely on, or disclose Confidential Deal Materials.</p>
          </div>
        </div>
        <label class="check-row"><input id="purchase-authority" type="checkbox" /> <span>I confirm I am authorized to evaluate or purchase this software in this simulation.</span></label>
        <label class="check-row"><input id="data-boundary-understood" type="checkbox" /> <span>I understand purchase authority and Deal-material use authority are separate.</span></label>
        <div class="button-row">
          <button class="button" data-action="complete-checkout">Complete simulated checkout</button>
          <button class="button-secondary" data-action="go-discovery">Back to public proof</button>
        </div>
      </div>
    </div>`;
}

function dealForm() {
  return `
    <div class="card card-pad">
      <div class="eyebrow">First Deal creation · synthetic values</div>
      <div class="field-grid">
        <div class="field"><label for="deal-name">Deal identity</label><input id="deal-name" value="Project Northstar" /></div>
        <div class="field"><label for="entity-name">Transaction subject</label><input id="entity-name" value="Northstar Industrial Systems, Inc." /></div>
        <div class="field"><label for="deal-side">Role / side</label><select id="deal-side"><option>Sell-Side</option></select></div>
        <div class="field"><label for="deal-stage">Business stage</label><select id="deal-stage"><option>Preparation</option></select></div>
        <div class="field"><label for="deal-currency">Currency</label><select id="deal-currency"><option>USD</option></select></div>
        <div class="field"><label for="intended-use">Intended use</label><input id="intended-use" value="Prepare a controlled auction launch package" /></div>
      </div>
      <div class="button-row"><button class="button" data-action="create-deal">Create synthetic Deal Workspace</button></div>
    </div>`;
}

function authorityForm() {
  return `
    <div class="card card-pad">
      <div class="eyebrow">Upload / use authority and confidentiality preflight</div>
      <h2>Access is not authority; authority is not truth; truth is not external-use permission.</h2>
      <label class="check-row"><input id="upload-authority" type="checkbox" /> <span>I am authorized to upload and use these synthetic materials for this stated Deal purpose.</span></label>
      <label class="check-row"><input id="processing-authority" type="checkbox" /> <span>I permit simulated AI and deterministic processing and creation of derived work.</span></label>
      <label class="check-row"><input id="confidentiality-understood" type="checkbox" /> <span>I understand confidentiality, source rights, and intended audience continue to constrain every output.</span></label>
      <div class="button-row"><button class="button" data-action="confirm-authority">Confirm synthetic authority scope</button></div>
    </div>`;
}

function sourceRows() {
  const visible = FIXTURE.sources.filter((source) => {
    if (source.id === "SR-005") return state.selectedSources.includes("SR-005") || state.issues.missing;
    if (source.id === "SR-006") return state.returned;
    return source.id !== "SR-005";
  });
  return `<div class="source-list">${visible.map((source) => {
    const included = state.selectedSources.includes(source.id);
    const missing = source.id === "SR-005" && !included;
    const stale = source.id === "SR-004" && state.issues.stale;
    const restriction = source.id === "SR-003" && state.issues.restriction;
    return `
      <div class="source-row">
        <div class="source-head">
          <div><strong>${source.id} · ${source.name}</strong><div class="muted mono" style="margin-top:4px">${source.locator}</div></div>
          ${pill(missing ? "material missing" : included ? "in Source Packet" : "available", missing ? "bad" : included ? "good" : "neutral")}
        </div>
        <p class="issue-copy">${source.claim} · ${source.value}</p>
        <div class="meta-row">
          ${pill(stale ? "stale-for-current-use" : source.freshness, stale ? "bad" : "neutral")}
          ${pill(restriction ? "restricted reader use" : source.rights, restriction ? "bad" : "neutral")}
          ${pill(source.extraction, source.id === "SR-001" && state.issues.ocr ? "warn" : "neutral")}
          ${pill(source.reliance, source.reliance.includes("blocked") ? "bad" : "neutral")}
        </div>
      </div>`;
  }).join("")}</div>`;
}

function sourcePacketPanel() {
  return `
    <div class="section-head">
      <div><div class="eyebrow">Upload/export-first · exact Source Records</div><h2>Preparation Packet ${state.returned ? "v2" : "v1"}</h2></div>
      ${pill(packetName(), state.packetSelected ? "good" : "warn")}
    </div>
    ${sourceRows()}
    <div class="button-row">
      ${!state.packetSelected ? '<button class="button" data-action="select-packet">Select current exact records</button>' : ""}
      ${state.issues.missing ? '<button class="button-secondary" data-action="resolve-missing">Add missing synthetic QoE Source Record</button>' : ""}
      ${state.issues.stale ? '<button class="button-secondary" data-action="resolve-stale">Add current synthetic process snapshot</button>' : ""}
    </div>
    <p class="muted" style="margin-top:12px">Packet inclusion defines the perimeter. It does not establish truth, freshness, non-conflict, professional usability, or permission to circulate.</p>`;
}

function objectivePanel() {
  return `
    <div class="card card-pad">
      <div class="eyebrow">Scoped work objective</div>
      <h2>Prepare Project Northstar Rev ${state.currentRevision} for senior review</h2>
      <p>Normalize historical financials, create the valuation spine, initialize auction controls, and generate controlled reader previews from the selected Source Packet.</p>
      <div class="responsibility-grid">
        <div class="responsibility-card ai"><h3>AI proposes</h3><p class="muted">Extract, classify, compare, draft, detect issues, and propose Facts or Assumptions. It cannot establish truth or authorize action.</p></div>
        <div class="responsibility-card deterministic"><h3>Deterministic closure</h3><p class="muted">Recalculate, tie out, validate units/periods/signs, resolve citations, check versions, enforce confidentiality, and compare artifacts.</p></div>
        <div class="responsibility-card banker"><h3>Banker decides</h3><p class="muted">Accept Facts, approve Assumptions, resolve conflict, judge suitability, select audience, and record exact-version External Use.</p></div>
      </div>
      <p class="mono" style="margin-top:14px">Source perimeter: ${esc(state.selectedSources.join(" · "))}</p>
      <div class="button-row"><button class="button" data-action="authorize-objective">Authorize this scoped handoff</button></div>
    </div>`;
}

function pipelinePanel() {
  const lanes = [
    ["Ingestion", !state.workStarted ? "not started" : state.issues.missing ? "degraded" : "complete", state.issues.missing ? "4 received; SR-005 missing. Inventory work may continue." : `${state.selectedSources.length} exact Source Records received and Deal-bound.`],
    ["Extraction", !state.workStarted ? "not started" : state.issues.ocr ? "needs review" : "complete", state.issues.ocr ? "Material PDF table region awaits review; verified regions only." : "Material regions reviewed; corrected values retain version history."],
    ["Analysis", !state.workStarted ? "not started" : state.issues.conflict || state.issues.unsupported ? "needs decision" : "complete", "Claims, Fact proposals, Assumption, conflict, and output ceilings remain distinct."],
    ["Deterministic validation", !state.workStarted ? "not started" : state.issues.tieout ? "failed" : state.qcRun ? "passed" : "ready", state.issues.tieout ? "EV-to-equity tie-out differs by $1.5m." : "Recalculation and tie-out ready/passed; professional suitability remains separate."],
    ["Deliverable generation", !state.packageGenerated ? "waiting" : state.readiness, state.packageGenerated ? `Package Rev ${state.currentRevision} exists in ${state.readiness} posture.` : "Working artifacts wait on authorized work and controlled generation."],
  ];
  return `
    <div class="section-head"><div><div class="eyebrow">Recoverable work state · no aggregate percentage</div><h2>Five independent work lanes</h2></div>${pill(workStage())}</div>
    <div class="pipeline-list">${lanes.map(([name, status, text]) => `
      <div class="pipeline-row"><strong>${name}</strong>${pill(status)}<span class="muted">${text}</span></div>`).join("")}</div>
    <div class="button-row">
      ${!state.workStarted ? '<button class="button" data-action="start-work">Start simulated controlled work</button>' : '<button class="button-secondary" data-action="open-events">Inspect event history</button>'}
    </div>`;
}

const ISSUE_CONFIG = {
  missing: {
    title: "Material source missing",
    why: "SR-005 is absent. Seller-claim inventory may continue, but QoE-supported Fact promotion and affected circulation are blocked.",
    recover: "resolve-missing",
    recoverLabel: "Add synthetic SR-005",
  },
  stale: {
    title: "Stale process source",
    why: "SR-004 is stale for current Process State. Historical inspection may continue; current status claims cannot.",
    recover: "resolve-stale",
    recoverLabel: "Add current snapshot",
  },
  ocr: {
    title: "Parse / OCR limitation",
    why: "Draft CIM p.18 Table 4 has an unverified material table region. Only verified portions may support work.",
    recover: "resolve-ocr",
    recoverLabel: "Confirm synthetic native region",
  },
  tieout: {
    title: "Deterministic tie-out failure",
    why: "AI extracted Cash as $6.2m instead of $4.7m, creating a $1.5m EV-to-equity difference. Mechanical falsehood cannot be waived.",
    recover: "select-evidence-cash",
    recoverLabel: "Inspect and correct Cash",
  },
  conflict: {
    title: "Material EBITDA conflict",
    why: "SR-001 reports $18.4m and SR-002 reports $17.8m. Both remain visible until a scoped Banker treatment is recorded.",
    recover: "resolve-conflict",
    recoverLabel: "Record $17.8m scoped treatment",
  },
  unsupported: {
    title: "Unsupported 96% retention Claim",
    why: "SR-003 lacks a complete definition and evidence perimeter. It cannot silently become a Fact or buyer-facing statement.",
    recover: "reject-claim",
    recoverLabel: "Exclude from reader copy",
  },
  restriction: {
    title: "Confidentiality / rights restriction",
    why: "SR-003 is internal-analysis-only. Its derived content currently reaches a buyer-facing representation.",
    recover: "resolve-restriction",
    recoverLabel: "Exclude restricted content",
  },
  circulationHold: {
    title: "Internal circulation hold",
    why: "The Banker placed an explicit hold on external-use preparation. Readiness does not override a human hold.",
    recover: "clear-circulation-hold",
    recoverLabel: "Clear simulated hold",
  },
};

function issuePanel(compact = false) {
  return `
    <div class="section-head">
      <div><div class="eyebrow">Failure and degraded-state lab</div><h2>${activeIssueKeys().length} active control exceptions</h2></div>
      ${pill(activeIssueKeys().length ? "circulation blocked" : "exceptions cleared", activeIssueKeys().length ? "bad" : "good")}
    </div>
    <div class="issue-list">${Object.entries(ISSUE_CONFIG).map(([key, config]) => {
      const active = state.issues[key];
      return `
        <div class="issue-row ${active ? "active" : "resolved"}">
          <div class="issue-head"><strong>${config.title}</strong>${pill(active ? "active" : "recovered", active ? "bad" : "good")}</div>
          ${compact ? "" : `<p class="issue-copy">${config.why}</p>`}
          <div class="button-row" style="margin-top:9px">
            ${active
              ? `<button class="button-secondary" data-action="${config.recover}">${config.recoverLabel}</button>`
              : `<button class="button-quiet" data-action="trigger-issue" data-issue="${key}">Trigger again</button>`}
          </div>
        </div>`;
    }).join("")}</div>
    <p class="muted" style="margin-top:12px">Each exception exposes why work is blocked, affected objects, work that may continue, the exact recovery action, and the return point. No issue is hidden inside an AI confidence score.</p>`;
}

function evidenceSelector() {
  return `
    <div class="button-row" style="margin-top:0">
      <button class="button-secondary" data-action="select-evidence-cash">Cash correction</button>
      <button class="button-secondary" data-action="select-evidence-ebitda">EBITDA conflict</button>
      <button class="button-secondary" data-action="select-evidence-retention">Unsupported retention</button>
    </div>`;
}

function evidenceDetail() {
  if (state.selectedEvidence === "ebitda") {
    return `
      <div class="value-compare">
        <div class="value-box"><span class="label">SR-001 · Seller Claim</span><strong>$18.4m</strong><span class="muted mono">PDF p.18 · Table 4</span></div>
        <div class="value-box"><span class="label">SR-002 · Proposed controlling Fact</span><strong>$17.8m</strong><span class="muted mono">Operating Case!F42</span></div>
        <div class="value-box"><span class="label">Current treatment</span><strong>${state.decisions.conflictResolved ? "$17.8m" : "unresolved"}</strong><span class="muted">For Rev ${state.currentRevision} valuation purpose only</span></div>
      </div>
      <div class="evidence-chain">
        <span class="evidence-node">two exact Source Records</span><span class="chain-arrow">→</span>
        <span class="evidence-node">material conflict</span><span class="chain-arrow">→</span>
        <span class="evidence-node">Banker treatment</span><span class="chain-arrow">→</span>
        <span class="evidence-node">Analysis!F42</span><span class="chain-arrow">→</span>
        <span class="evidence-node">CIM EBITDA statement</span>
      </div>
      <p class="muted">Both values remain in history. The selected treatment is object-, scope-, purpose-, and Revision-bound; it does not erase the seller Claim.</p>
      <div class="button-row"><button class="button" data-action="resolve-conflict">Use $17.8m for stated purpose</button></div>`;
  }

  if (state.selectedEvidence === "retention") {
    return `
      <div class="value-compare">
        <div class="value-box"><span class="label">Exact source</span><strong>SR-003</strong><span class="muted mono">C-104.retention_rate</span></div>
        <div class="value-box"><span class="label">Atomic Claim</span><strong>96%</strong><span class="muted">definition incomplete</span></div>
        <div class="value-box"><span class="label">Current disposition</span><strong>${state.decisions.unsupportedExcluded ? "excluded" : "unsupported"}</strong><span class="muted">reader-facing output</span></div>
      </div>
      <p class="muted">The product can keep this as an attributed Claim, request a definition and Evidence, or omit it. It cannot accept the number as a Fact merely because it was parsed successfully.</p>
      <div class="button-row"><button class="button" data-action="reject-claim">Reject Fact promotion and exclude</button></div>`;
  }

  return `
    <div class="value-compare">
      <div class="value-box"><span class="label">Original AI extraction · v1</span><strong>$${state.correction.originalCash.toFixed(1)}m</strong><span class="muted">preserved historical derived work</span></div>
      <div class="value-box"><span class="label">Visible native source</span><strong>$4.7m</strong><span class="muted mono">SR-002 · Balance Sheet!F28</span></div>
      <div class="value-box"><span class="label">Current controlled value · v${state.correction.version}</span><strong>$${state.correction.currentCash.toFixed(1)}m</strong><span class="muted">${state.issues.tieout ? "tie-out failed" : "tie-out passed"}</span></div>
    </div>
    <div class="evidence-chain">
      <span class="evidence-node">SR-002 / Balance Sheet!F28</span><span class="chain-arrow">→</span>
      <span class="evidence-node">extraction v${state.correction.version}</span><span class="chain-arrow">→</span>
      <span class="evidence-node">Cash Fact proposal</span><span class="chain-arrow">→</span>
      <span class="evidence-node">EV-to-equity calculation</span><span class="chain-arrow">→</span>
      <span class="evidence-node">Analysis XLSX / CIM / PDF</span>
    </div>
    <div class="field-grid">
      <div class="field"><label for="corrected-cash">Corrected Cash value ($m)</label><input id="corrected-cash" type="number" step="0.1" value="4.7" /></div>
      <div class="field"><label for="correction-reason">Correction reason</label><input id="correction-reason" value="Verified against visible native cell F28" /></div>
    </div>
    <div class="button-row"><button class="button" data-action="correct-cash">Save correction as a new version</button></div>`;
}

function decisionPanel() {
  return `
    <div class="card card-pad">
      <div class="section-head"><div><div class="eyebrow">Typed Banker decisions</div><h2>Decisions are not one generic Approve action</h2></div>${pill(`${pendingDecisions()} pending`, pendingDecisions() ? "warn" : "good")}</div>
      <div class="decision-list">
        <div class="decision-row">
          <div class="source-head"><div><strong>Accept or reject Cash $4.7m as a Fact</strong><p class="issue-copy">Scope: Rev ${state.currentRevision} valuation analysis · Source: SR-002 F28 · no unresolved Cash conflict.</p></div>${pill(state.decisions.factAccepted ? "accepted" : state.decisions.factRejected ? "rejected" : "pending")}</div>
          <div class="button-row"><button class="button-secondary" data-action="accept-fact">Accept Fact</button><button class="button-quiet" data-action="reject-fact">Reject Fact</button></div>
        </div>
        <div class="decision-row">
          <div class="source-head"><div><strong>Approve FY27 revenue growth 8.0% Assumption</strong><p class="issue-copy">Scope: Operating Case · expires on new forecast or source update · remains an Assumption.</p></div>${pill(state.decisions.assumptionApproved ? "approved Assumption" : "pending")}</div>
          <div class="button-row"><button class="button-secondary" data-action="approve-assumption">Approve bounded Assumption</button></div>
        </div>
        <div class="decision-row">
          <div class="source-head"><div><strong>Review Impact Assessment</strong><p class="issue-copy">Affected: EV bridge, valuation summary, CIM statement, reader copy, QC, readiness, External-Use validity.</p></div>${pill(state.decisions.impactReviewed ? "reviewed" : "pending")}</div>
          <div class="button-row"><button class="button-secondary" data-action="review-impact">Record material impact disposition</button></div>
        </div>
      </div>
    </div>`;
}

function evidencePanel() {
  return `
    <div class="section-head"><div><div class="eyebrow">Evidence inspection and correction</div><h2>Trace output to exact Source Record</h2></div>${pill(`Rev ${state.currentRevision}`)}</div>
    ${evidenceSelector()}
    <div class="card card-pad" style="margin-top:12px">
      ${evidenceDetail()}
      <div class="meta-row">
        ${pill("exact Source Record", "neutral")}${pill("native locator", "neutral")}${pill("rights visible", "neutral")}${pill("freshness visible", "neutral")}${pill("origin preserved", "neutral")}
      </div>
      <details style="margin-top:12px"><summary><strong>Version history and Impact Assessment</strong></summary>
        <div class="event-list" style="margin-top:10px">${state.correction.history.map((entry, index) => `<div class="event-row"><span class="event-time">v${index + 1}</span><span>${entry}</span></div>`).join("")}</div>
        <div class="event-list" style="margin-top:10px">${state.impact.map((entry, index) => `<div class="event-row"><span class="event-time">IA-${String(index + 1).padStart(2, "0")}</span><span>${entry}</span></div>`).join("")}</div>
      </details>
    </div>
    <div style="margin-top:12px">${decisionPanel()}</div>`;
}

function qcPanel() {
  const checks = [
    ["Arithmetic / formulas", state.issues.tieout ? "failed" : "passed"],
    ["Source / model tie-outs", state.issues.tieout || state.issues.conflict ? "blocked" : "passed"],
    ["Unit / period / currency / sign", state.workStarted ? "passed" : "not run"],
    ["Citation resolution", state.issues.missing || state.issues.ocr ? "blocked" : "passed"],
    ["Cross-artifact consistency", state.packageGenerated && !state.issues.tieout ? "passed" : "not run"],
    ["Native editability", state.packageGenerated ? "simulated pass" : "not run"],
    ["Render / PDF parity", state.packageGenerated ? "simulated pass" : "not run"],
    ["Confidentiality leak scan", state.issues.restriction ? "failed" : "passed"],
  ];
  return `
    <div class="section-head"><div><div class="eyebrow">Deterministic checks separate from professional judgment</div><h2>QC and readiness gates</h2></div>${pill(state.qcRun ? state.qcPassed ? "QC passed" : "QC failed" : "QC not run")}</div>
    <div class="two-grid">${checks.map(([name, status]) => `<div class="source-row"><div class="source-head"><strong>${name}</strong>${pill(status)}</div></div>`).join("")}</div>
    <div class="button-row">
      <button class="button" data-action="run-qc">Run simulated deterministic QC</button>
      ${state.qcPassed && state.readiness !== "circulation-candidate" ? '<button class="button-secondary" data-action="promote-candidate">Record professional suitability → circulation candidate</button>' : ""}
    </div>
    <p class="muted" style="margin-top:12px">A mechanical pass removes only the tested mechanical blocker. It does not establish source sufficiency, professional suitability, or external authorization.</p>`;
}

function artifactStatus(artifact) {
  if (artifact.id === "memo") return "not yet stage-required";
  if (artifact.id === "archive") return state.exported ? "exported simulated package" : "awaiting export decision";
  if (!state.packageGenerated) return "not built";
  return state.readiness;
}

function packageRows(compact = false) {
  return `<div class="artifact-list">${FIXTURE.artifacts.map((artifact) => `
    <div class="artifact-row">
      <div class="artifact-head">
        <div><strong>${artifact.name}</strong>${compact ? "" : `<div class="muted" style="margin-top:4px">${artifact.role}</div>`}</div>
        ${pill(artifactStatus(artifact))}
      </div>
      <div class="meta-row">${pill(artifact.format, "neutral")}${pill(`Rev ${state.currentRevision}`, "neutral")}${artifact.id !== "memo" ? pill("lineage attached", "neutral") : ""}</div>
      ${compact ? "" : `<div class="button-row" style="margin-top:9px"><button class="button-quiet" data-action="preview-artifact" data-artifact="${artifact.id}">Inspect simulated artifact</button></div>`}
    </div>`).join("")}</div>`;
}

function packagePanel() {
  return `
    <div class="section-head"><div><div class="eyebrow">Controlled Auction Execution Package</div><h2>One controlled family, not a file dump</h2></div>${pill(`Rev ${state.currentRevision} · ${state.readiness}`)}</div>
    <div class="button-row" style="margin:0 0 14px">
      ${!state.packageGenerated ? '<button class="button" data-action="generate-package">Generate simulated working Revision</button>' : ""}
      <button class="button-secondary" data-action="preview-reader">Preview reader-facing representation</button>
    </div>
    ${packageRows(false)}
    <div style="margin-top:14px">${qcPanel()}</div>`;
}

function readinessLadder() {
  const states = ["working-draft", "analysis-ready", "senior-review-ready", "circulation-candidate"];
  return `
    <div class="evidence-chain">${states.map((item, index) => `${pill(item, item === state.readiness ? statusClass(item) : "neutral")}${index < states.length - 1 ? '<span class="chain-arrow">→</span>' : ""}`).join("")}</div>
    <p>${pill("blocked overlay", activeBlockers().length ? "bad" : "neutral")} ${pill(state.externalAuthorized ? "external-use authorized" : "external use unauthorized", state.externalAuthorized ? "good" : "warn")}</p>
    <p class="muted"><strong>Circulation candidate ≠ External-Use authorization ≠ external use occurred.</strong> The prototype never performs a real external action.</p>`;
}

function externalUsePanel() {
  return `
    <div class="card card-pad">
      <div class="eyebrow">Exact-version External-Use Decision · simulated</div>
      <div class="field-grid">
        <div class="field"><label>Exact Revision</label><input value="Project Northstar · Package Rev ${state.currentRevision}" readonly /></div>
        <div class="field"><label>Locked native / reader hashes</label><input value="sha256:synthetic-${state.currentRevision.replace(".", "")}-native / -pdf" readonly /></div>
        <div class="field"><label for="external-audience">Audience</label><input id="external-audience" value="Northstar client management" /></div>
        <div class="field"><label for="external-purpose">Purpose</label><input id="external-purpose" value="Review controlled auction launch package" /></div>
        <div class="field"><label for="external-time">Decision time</label><input id="external-time" value="2026-08-01 10:30 ET" /></div>
        <div class="field"><label for="external-conditions">Conditions</label><input id="external-conditions" value="NDA-qualified use; no further edit; specified audience only" /></div>
      </div>
      <div class="button-row"><button class="button" data-action="record-external-use">Record simulated External-Use Decision</button></div>
    </div>`;
}

function exportReturnPanel() {
  return `
    <div class="card card-pad">
      <div class="eyebrow">Simulated export and repeat loop</div>
      <h2>${state.returned ? `Revision ${state.currentRevision} impact branch` : "Portable controlled package"}</h2>
      <p class="muted">Simulated native artifacts, exact reader copies, evidence/control records, manifest, hashes, QC, and Decision history. No Office or archive file is actually generated.</p>
      <div class="button-row">
        <button class="button-secondary" data-action="simulate-export">Simulate native + reader + archive export</button>
        ${state.exported && !state.returned ? '<button class="button" data-action="simulate-return-event">Return when July actuals arrive</button>' : ""}
        ${state.returned && !state.refreshCompleted ? '<button class="button" data-action="complete-refresh">Recalculate, regenerate and re-review Rev 0.4</button>' : ""}
      </div>
      ${state.returned ? `
        <div class="revision-graph">
          <div class="revision-node"><strong>Rev 0.3 · immutable history</strong><div class="muted">Prior QC, artifacts and exact External-Use Decision retained; no future-use carry-forward.</div></div>
          <div class="revision-node"><strong>SR-006 · July Actuals</strong><div class="muted">Impact Assessment: Facts, workbook cells, valuation outputs, CIM slides, PDF copy and authorization.</div></div>
          <div class="revision-node"><strong>Rev 0.4 · ${state.readiness}</strong><div class="muted">New Revision; recalculation/regeneration/re-review ${state.refreshCompleted ? "complete for affected scope" : "required"}.</div></div>
        </div>` : ""}
    </div>`;
}

function eventPanel() {
  return `
    <div class="section-head"><div><div class="eyebrow">Append-only event history</div><h2>Recoverable state and handoffs</h2></div>${pill(state.lastUpdate, "neutral")}</div>
    <div class="event-list">${state.events.map((event) => `<div class="event-row"><span class="event-time">${event.time}</span><span>${event.text}</span></div>`).join("")}</div>`;
}

function allRequiredDecisionsComplete() {
  return state.decisions.factAccepted
    && state.decisions.assumptionApproved
    && state.decisions.conflictResolved
    && state.decisions.unsupportedExcluded
    && state.decisions.impactReviewed;
}

function maybeRestoreReadiness() {
  if (state.packageGenerated && activeBlockers().length === 0 && allRequiredDecisionsComplete()) {
    state.readiness = state.qcPassed ? "senior-review-ready" : "analysis-ready";
  } else if (state.packageGenerated && activeBlockers().length > 0) {
    state.readiness = "blocked";
  }
}

function resetControlsAfterMaterialChange(reason) {
  state.qcRun = false;
  state.qcPassed = false;
  state.externalAuthorized = false;
  state.exported = false;
  if (state.packageGenerated) state.readiness = "blocked";
  state.impact.unshift(reason);
}

function requiredChecks(...ids) {
  return ids.every((id) => document.getElementById(id)?.checked);
}

function triggerIssue(key) {
  state.issues[key] = true;
  if (key === "missing") {
    state.selectedSources = state.selectedSources.filter((id) => id !== "SR-005");
    state.decisions.factAccepted = false;
  }
  if (key === "tieout") {
    state.correction.currentCash = 6.2;
    state.correction.version += 1;
    state.correction.history.push(`v${state.correction.version} · Simulated regression restored erroneous $6.2m extraction.`);
    state.decisions.factAccepted = false;
  }
  if (key === "conflict") state.decisions.conflictResolved = false;
  if (key === "unsupported") state.decisions.unsupportedExcluded = false;
  resetControlsAfterMaterialChange(`${ISSUE_CONFIG[key].title} was reintroduced; affected prior gates invalidated.`);
  record(`Scenario triggered: ${ISSUE_CONFIG[key].title}.`);
}

function handleAction(action, element) {
  switch (action) {
    case "reset":
      state = initialState();
      notify("Prototype state reset. The URL variant was preserved.");
      break;
    case "show-proof":
      state.showProof = !state.showProof;
      record(state.showProof ? "Synthetic product proof expanded." : "Synthetic product proof collapsed.");
      break;
    case "inspect-sample":
      state.modal = "sample";
      break;
    case "go-checkout":
      state.screen = "checkout";
      state.journeyIndex = 1;
      record("Simulated self-serve purchase path opened.");
      break;
    case "go-discovery":
      state.screen = "discovery";
      state.journeyIndex = 0;
      record("Returned to public product proof.");
      break;
    case "complete-checkout":
      if (!requiredChecks("purchase-authority", "data-boundary-understood")) {
        notify("Confirm both purchase-authority statements to continue.");
        break;
      }
      state.screen = "workspace";
      state.journeyIndex = 2;
      state.bTab = variantFromUrl() === "H" ? "guide" : "deal";
      record("Simulated checkout completed; no card charged and no account created.");
      break;
    case "create-deal":
      state.dealCreated = true;
      state.journeyIndex = Math.max(state.journeyIndex, 3);
      record("Project Northstar Deal Workspace created from synthetic identity and intended use.");
      break;
    case "confirm-authority":
      if (!requiredChecks("upload-authority", "processing-authority", "confidentiality-understood")) {
        notify("Confirm all three authority and confidentiality statements.");
        break;
      }
      state.authorityConfirmed = true;
      state.journeyIndex = Math.max(state.journeyIndex, 4);
      record("Synthetic upload/use authority, processing scope and confidentiality conditions confirmed.");
      break;
    case "select-packet":
      if (!state.authorityConfirmed) {
        notify("Complete the authority preflight before selecting substantive Source Records.");
        break;
      }
      state.packetSelected = true;
      state.journeyIndex = Math.max(state.journeyIndex, 5);
      record("Preparation Packet v1 selected with exact SR-001 through SR-004 records.");
      break;
    case "authorize-objective":
      if (!state.packetSelected) {
        notify("Select an exact Source Packet before authorizing work.");
        break;
      }
      state.objectiveAuthorized = true;
      state.journeyIndex = Math.max(state.journeyIndex, 6);
      record("Scoped first-value objective authorized with visible AI, deterministic and Banker responsibilities.");
      break;
    case "start-work":
      if (!state.objectiveAuthorized) {
        notify("Authorize the scoped objective before starting controlled work.");
        break;
      }
      state.workStarted = true;
      state.journeyIndex = Math.max(state.journeyIndex, 7);
      record("Simulated ingestion, extraction, analysis and validation lanes started; exceptions surfaced.");
      break;
    case "resolve-missing":
      if (!state.selectedSources.includes("SR-005")) state.selectedSources.push("SR-005");
      state.issues.missing = false;
      record("SR-005 Synthetic QoE Summary added as a new exact Source Record; affected work may resume.");
      maybeRestoreReadiness();
      break;
    case "resolve-stale":
      state.issues.stale = false;
      record("Current synthetic Process Tracker snapshot added; prior SR-004 posture retained historically.");
      maybeRestoreReadiness();
      break;
    case "resolve-ocr":
      state.issues.ocr = false;
      record("Material PDF table region confirmed against synthetic native representation; OCR history retained.");
      maybeRestoreReadiness();
      break;
    case "resolve-restriction":
      state.issues.restriction = false;
      record("SR-003-derived content excluded from the buyer-facing reader copy; internal restriction preserved.");
      maybeRestoreReadiness();
      break;
    case "clear-circulation-hold":
      state.issues.circulationHold = false;
      record("Simulated internal circulation hold cleared by the Banker; other gates remain independent.");
      maybeRestoreReadiness();
      break;
    case "trigger-issue":
      triggerIssue(element.dataset.issue);
      break;
    case "select-evidence-cash":
      state.selectedEvidence = "cash";
      state.journeyIndex = Math.max(state.journeyIndex, 8);
      state.bTab = state.bTab === "work" ? "evidence" : state.bTab;
      break;
    case "select-evidence-ebitda":
      state.selectedEvidence = "ebitda";
      break;
    case "select-evidence-retention":
      state.selectedEvidence = "retention";
      break;
    case "correct-cash": {
      const value = Number(document.getElementById("corrected-cash")?.value);
      const reason = document.getElementById("correction-reason")?.value || "Banker correction";
      if (!Number.isFinite(value)) {
        notify("Enter a valid corrected Cash value.");
        break;
      }
      state.correction.currentCash = value;
      state.correction.version += 1;
      state.correction.history.push(`v${state.correction.version} · Banker corrected Cash to $${value.toFixed(1)}m. Reason: ${reason}`);
      state.issues.tieout = Math.abs(value - 4.7) > 0.001;
      state.decisions.factAccepted = false;
      state.decisions.impactReviewed = false;
      state.impact.unshift("Cash correction affected EV bridge, valuation output, CIM statement, reader copy, QC, readiness and prior authorization.");
      resetControlsAfterMaterialChange("Correction created Recalculation Required, Regeneration Required, Re-review Required and Circulation Blocked results.");
      record(`Cash extraction corrected as version ${state.correction.version}; deterministic tie-out ${state.issues.tieout ? "still failed" : "recovered"}.`);
      break;
    }
    case "accept-fact":
      if (state.issues.tieout) {
        notify("Correct the extracted Cash and pass the tie-out before accepting this Fact.");
        break;
      }
      state.decisions.factAccepted = true;
      state.decisions.factRejected = false;
      record(`Cash $${state.correction.currentCash.toFixed(1)}m accepted as a Fact for Rev ${state.currentRevision} valuation purpose only.`);
      maybeRestoreReadiness();
      break;
    case "reject-fact":
      state.decisions.factRejected = true;
      state.decisions.factAccepted = false;
      record("Cash Fact proposal rejected; proposed downstream factual reliance remains blocked.");
      maybeRestoreReadiness();
      break;
    case "approve-assumption":
      state.decisions.assumptionApproved = true;
      record(`FY27 growth 8.0% approved as an Assumption for Rev ${state.currentRevision} Operating Case; it did not become a Fact.`);
      maybeRestoreReadiness();
      break;
    case "resolve-conflict":
      state.selectedEvidence = "ebitda";
      state.issues.conflict = false;
      state.decisions.conflictResolved = true;
      record(`$17.8m selected as the controlling EBITDA treatment for Rev ${state.currentRevision} valuation purpose; $18.4m seller Claim retained.`);
      maybeRestoreReadiness();
      break;
    case "reject-claim":
      state.selectedEvidence = "retention";
      state.issues.unsupported = false;
      state.decisions.unsupportedExcluded = true;
      record("96% retention Fact promotion rejected and Claim excluded from reader-facing output; source history retained.");
      maybeRestoreReadiness();
      break;
    case "review-impact":
      state.decisions.impactReviewed = true;
      record("Banker recorded material impact disposition: recalculate, regenerate, targeted re-review and circulation block.");
      maybeRestoreReadiness();
      break;
    case "generate-package":
      if (!state.workStarted) {
        notify("Start the scoped controlled work before generating a package Revision.");
        break;
      }
      state.packageGenerated = true;
      state.readiness = activeBlockers().length || !allRequiredDecisionsComplete() ? "blocked" : "analysis-ready";
      state.journeyIndex = Math.max(state.journeyIndex, 10);
      record(`Controlled Auction Execution Package Rev ${state.currentRevision} generated as simulated native/reader work; posture ${state.readiness}.`);
      break;
    case "run-qc":
      state.qcRun = true;
      state.qcPassed = activeIssueKeys().length === 0 && allRequiredDecisionsComplete() && state.packageGenerated;
      state.readiness = state.qcPassed ? "senior-review-ready" : "blocked";
      state.journeyIndex = Math.max(state.journeyIndex, 9);
      record(state.qcPassed
        ? `Deterministic QC passed for Rev ${state.currentRevision}; Banker professional suitability remains required.`
        : `QC failed or was blocked for Rev ${state.currentRevision}; exact exceptions remain visible.`);
      break;
    case "promote-candidate":
      if (!state.qcPassed) {
        notify("A circulation candidate requires passed applicable QC and completed decisions.");
        break;
      }
      state.readiness = "circulation-candidate";
      record(`Banker recorded professional suitability for Rev ${state.currentRevision}; it is a circulation candidate, not externally authorized.`);
      break;
    case "record-external-use":
      if (state.readiness !== "circulation-candidate") {
        notify("Only an exact circulation-candidate Revision can receive this External-Use Decision.");
        break;
      }
      state.externalAuthorized = true;
      state.journeyIndex = 11;
      record(`Simulated External-Use Decision recorded for exact Rev ${state.currentRevision}, Northstar client management, stated purpose and conditions. Nothing was sent.`);
      break;
    case "simulate-export":
      if (!state.externalAuthorized) {
        notify("Record an exact-version simulated External-Use Decision before this export exercise.");
        break;
      }
      state.exported = true;
      record(`Simulated export receipt created for Rev ${state.currentRevision}: native artifacts, exact reader copies, control records and archive manifest. No file generated.`);
      break;
    case "simulate-return-event":
      if (!state.exported) {
        notify("Complete the simulated export before exercising the return loop.");
        break;
      }
      state.priorRevision = "0.3";
      state.currentRevision = "0.4";
      state.returned = true;
      state.refreshCompleted = false;
      if (!state.selectedSources.includes("SR-006")) state.selectedSources.push("SR-006");
      state.externalAuthorized = false;
      state.qcRun = false;
      state.qcPassed = false;
      state.readiness = "working-draft";
      state.decisions.impactReviewed = false;
      state.impact.unshift("SR-006 July Actuals affected current Facts, Analysis Workbook cells, valuation outputs, CIM slides, reader copies, QC and future-use authorization.");
      state.bTab = "events";
      record("SR-006 July Actuals arrived. Rev 0.4 forked; Rev 0.3 remained immutable and its authorization did not carry forward.");
      break;
    case "complete-refresh":
      state.refreshCompleted = true;
      state.decisions.impactReviewed = true;
      state.qcRun = true;
      state.qcPassed = true;
      state.readiness = "senior-review-ready";
      record("Affected Rev 0.4 calculations, artifacts and citations recalculated/regenerated; targeted re-review and QC completed.");
      break;
    case "preview-reader":
      state.modal = "reader";
      break;
    case "preview-artifact":
      state.modal = `artifact:${element.dataset.artifact}`;
      break;
    case "open-events":
      state.modal = "events";
      break;
    case "close-modal":
      state.modal = null;
      break;
    case "journey-step":
      state.journeyIndex = Number(element.dataset.step);
      if (state.journeyIndex === 0) state.screen = "discovery";
      else if (state.journeyIndex === 1) state.screen = "checkout";
      else state.screen = "workspace";
      break;
    case "b-tab":
      state.bTab = element.dataset.tab;
      break;
    case "c-artifact":
      state.cArtifact = element.dataset.artifact;
      break;
    case "graduate-hybrid":
      state.bTab = "events";
      record("First-value guide completed; Project Northstar graduated into the persistent Deal Execution Desk.");
      break;
    default:
      break;
  }
}

function journeyStepState(index) {
  const completed = [
    state.screen !== "discovery",
    state.screen === "workspace",
    state.dealCreated,
    state.authorityConfirmed,
    state.packetSelected,
    state.objectiveAuthorized,
    state.workStarted,
    state.workStarted && activeIssueKeys().length === 0,
    state.workStarted && allRequiredDecisionsComplete(),
    state.qcPassed,
    state.packageGenerated,
    state.exported,
  ];
  if (completed[index]) return "complete";
  if (index >= 7 && state.workStarted && activeBlockers().length) return "blocked";
  return "pending";
}

function renderADiscovery() {
  return `
    <main class="variant-a a-public">
      ${topbar("A")}
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">For an individual sell-side banker · self-serve</div>
          <h1>Build the first controlled auction package without surrendering source control.</h1>
          <p>Start from exported Deal materials. Supervise evidence-bounded AI, deterministic checks and exact Banker decisions. Leave with editable native work, matched reader copies and a repeatable Deal Workspace.</p>
          <div class="button-row"><button class="button" data-action="go-checkout">Start a simulated first Deal</button><button class="button-secondary" data-action="inspect-sample">Inspect a synthetic output sample</button></div>
          <p class="muted">High-value promise: shorten the path from raw materials to a controlled, inspectable working package. No claim of autonomous deal execution.</p>
        </div>
        <div class="card card-pad">
          <div class="eyebrow">First unmistakable value proof</div>
          <div class="proof-number">1 conflict</div>
          <h2>found before it reaches a reader copy</h2>
          <p class="muted">$18.4m seller Claim versus $17.8m model value, traced to native locations and held for a scoped Banker decision.</p>
          <button class="button-quiet" data-action="show-proof">${state.showProof ? "Hide" : "Show"} evidence path</button>
        </div>
      </section>
      <section class="proof-grid">
        <article class="proof-card"><div class="proof-number">2</div><h3>editable workbook spines</h3><p class="muted">Analysis & Valuation plus Auction Control.</p></article>
        <article class="proof-card"><div class="proof-number">5</div><h3>readiness postures</h3><p class="muted">Working draft through circulation candidate, plus blocked.</p></article>
        <article class="proof-card"><div class="proof-number">1:1</div><h3>native-to-reader match</h3><p class="muted">Exact Revision, lineage, QC and external-use scope remain bound.</p></article>
      </section>
      ${state.showProof ? commonDiscoveryProof() : ""}
    </main>`;
}

function renderBDiscovery() {
  return `
    <main class="variant-b b-public">
      ${topbar("B")}
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">Individual sell-side banker · persistent execution desk</div>
          <h1>Run the Deal from one live control surface.</h1>
          <p>Sources, work queues, evidence, analysis, package state, readiness, events and Revision history stay attached to the Deal—not buried in chat or scattered file versions.</p>
          <div class="button-row"><button class="button" data-action="go-checkout">Open simulated execution desk</button><button class="button-secondary" data-action="show-proof">Inspect proof</button></div>
          <p class="muted">The product accelerates controlled work; the Banker retains every professional and external-use decision.</p>
        </div>
        <div class="mini-desk">
          <div class="mini-desk-card"><span class="label">Current Deal</span><strong>Project Northstar</strong><span class="muted">Sell-Side · Preparation</span></div>
          <div class="mini-desk-card"><span class="label">Work lane</span><strong>Validation blocked</strong><span class="muted">$1.5m tie-out exception</span></div>
          <div class="mini-desk-card"><span class="label">Revision</span><strong>Rev 0.3</strong><span class="muted">working-draft</span></div>
          <div class="mini-desk-card"><span class="label">Next controlled action</span><strong>Inspect Cash lineage</strong><span class="muted">SR-002 · F28</span></div>
        </div>
      </section>
      <section class="three-grid">
        <article class="proof-card"><h3>Observable work</h3><p class="muted">Independent ingestion, extraction, analysis, validation and generation lanes.</p></article>
        <article class="proof-card"><h3>Typed decisions</h3><p class="muted">Fact, Assumption, conflict, professional suitability and external use remain different acts.</p></article>
        <article class="proof-card"><h3>Event-driven return</h3><p class="muted">New actuals fork a Revision and invalidate only affected downstream control results.</p></article>
      </section>
      ${state.showProof ? commonDiscoveryProof() : ""}
    </main>`;
}

function renderCDiscovery() {
  return `
    <main class="variant-c c-public">
      ${topbar("C")}
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">Outcome-first · controlled sell-side auction</div>
          <h1>See the execution package you are building before you upload a file.</h1>
          <p>Begin with the editable workbook spines, stage-triggered artifacts, exact reader copies, evidence records and archive contract. The workbench then asks only for the sources and decisions each output requires.</p>
          <div class="button-row"><button class="button" data-action="go-checkout">Build a simulated package</button><button class="button-secondary" data-action="preview-reader">Preview reader representation</button></div>
          <p class="muted">Product proof is structural: every promised output exposes its dependencies, output ceiling and readiness gate.</p>
        </div>
        <div class="package-proof-map">
          <div class="package-spine-preview">
            <div class="spine-chip"><strong>Analysis & Valuation</strong><span class="muted">editable XLSX spine</span></div>
            <div class="spine-chip"><strong>Auction Control</strong><span class="muted">editable XLSX spine</span></div>
            <div class="spine-chip"><strong>Teaser · CIM · Memo</strong><span class="muted">stage-triggered native artifacts</span></div>
            <div class="spine-chip"><strong>Reader · records · archive</strong><span class="muted">exact controlled representations</span></div>
          </div>
          <div class="dependency-preview">
            <span class="dependency-node">source</span><span class="chain-arrow">→</span><span class="dependency-node">evidence</span><span class="chain-arrow">→</span><span class="dependency-node">decision</span><span class="chain-arrow">→</span><span class="dependency-node">QC</span><span class="chain-arrow">→</span><span class="dependency-node">exact output</span>
          </div>
        </div>
      </section>
      ${state.showProof ? commonDiscoveryProof() : ""}
    </main>`;
}

function renderHybridDiscovery() {
  return `
    <main class="variant-c variant-h c-public">
      ${topbar("H", pill("Validated synthesis", "good"))}
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">Outcome-first discovery · self-serve individual banker</div>
          <h1>See the controlled execution package, then build the first one with evidence in view.</h1>
          <p>The product opens with the premium outcome, guides the first Deal through its minimum control path, then becomes a persistent execution desk for every later source, Revision and decision.</p>
          <div class="button-row"><button class="button" data-action="go-checkout">Start the validated first-Deal journey</button><button class="button-secondary" data-action="preview-reader">Preview exact reader copy</button></div>
          <p class="muted">Validated product form: C for discovery, A for first correct use, B as the durable Deal Workspace shell.</p>
        </div>
        <div class="package-proof-map">
          <div class="package-spine-preview">
            <div class="spine-chip"><strong>Analysis & Valuation</strong><span class="muted">editable XLSX spine</span></div>
            <div class="spine-chip"><strong>Auction Control</strong><span class="muted">editable XLSX spine</span></div>
            <div class="spine-chip"><strong>Stage artifacts</strong><span class="muted">Teaser · CIM · recommendation memo</span></div>
            <div class="spine-chip"><strong>Reader · records · archive</strong><span class="muted">exact controlled representations</span></div>
          </div>
          <div class="hybrid-proof-sequence">
            <span class="dependency-node">C · understand outcome</span><span class="chain-arrow">→</span>
            <span class="dependency-node">A · reach controlled first value</span><span class="chain-arrow">→</span>
            <span class="dependency-node">B · operate and return</span>
          </div>
        </div>
      </section>
      ${commonDiscoveryProof()}
    </main>`;
}

function renderCheckout(variant) {
  const classes = variant === "H" ? "variant-c variant-h" : `variant-${variant.toLowerCase()}`;
  return `<main class="${classes}">${topbar(variant)}${checkoutMarkup(variant)}</main>`;
}

function renderAStage() {
  switch (state.journeyIndex) {
    case 0:
      return renderADiscovery();
    case 1:
      return checkoutMarkup("A");
    case 2:
      return dealForm();
    case 3:
      return authorityForm();
    case 4:
      return sourcePacketPanel();
    case 5:
      return objectivePanel();
    case 6:
      return pipelinePanel();
    case 7:
      return issuePanel(false);
    case 8:
      return evidencePanel();
    case 9:
      return qcPanel();
    case 10:
      return packagePanel();
    case 11:
      return `${readinessLadder()}${externalUsePanel()}<div style="margin-top:14px">${exportReturnPanel()}</div>`;
    default:
      return pipelinePanel();
  }
}

function renderAWorkspace() {
  const rail = JOURNEY_STEPS.map((name, index) => {
    const status = journeyStepState(index);
    return `<button class="journey-step ${index === state.journeyIndex ? "active" : ""} ${status}" data-action="journey-step" data-step="${index}">
      <span class="step-index">${status === "complete" ? "✓" : index + 1}</span><span class="step-name">${name}</span>
    </button>`;
  }).join("");
  return `
    <main class="variant-a">
      ${topbar("A", pill("Guided mode", "neutral"))}
      ${statusGrid()}
      <div class="a-workspace">
        <aside class="journey-rail"><div class="eyebrow" style="padding:0 8px 10px">Recoverable first-Deal journey</div>${rail}</aside>
        <section class="stage-canvas">
          <div class="section-head"><div><div class="eyebrow">Stage ${state.journeyIndex + 1} of 12</div><h1>${JOURNEY_STEPS[state.journeyIndex]}</h1></div>${pill(journeyStepState(state.journeyIndex))}</div>
          ${renderAStage()}
        </section>
        <aside class="control-snapshot">
          <div class="eyebrow">Control snapshot</div>
          <div class="snapshot-list">
            <div class="snapshot-item"><span class="label">Deal</span><strong>${state.dealCreated ? "Project Northstar" : "not created"}</strong></div>
            <div class="snapshot-item"><span class="label">Source Packet</span><strong>${packetName()}</strong></div>
            <div class="snapshot-item"><span class="label">Blockers</span><strong>${activeBlockers().length}</strong></div>
            <div class="snapshot-item"><span class="label">Pending decisions</span><strong>${pendingDecisions()}</strong></div>
            <div class="snapshot-item"><span class="label">QC</span><strong>${state.qcRun ? state.qcPassed ? "passed" : "failed" : "not run"}</strong></div>
            <div class="snapshot-item"><span class="label">Revision</span><strong>Rev ${state.currentRevision}</strong></div>
            <div class="snapshot-item"><span class="label">Readiness</span><strong>${state.readiness}</strong></div>
          </div>
          <button class="button-quiet" style="margin-top:12px" data-action="open-events">Open event history</button>
        </aside>
      </div>
    </main>`;
}

function renderBTab() {
  switch (state.bTab) {
    case "deal":
      if (!state.dealCreated) return dealForm();
      if (!state.authorityConfirmed) return authorityForm();
      return `<div class="section-head"><div><div class="eyebrow">Deal control plane</div><h1>Project Northstar</h1></div>${pill("Sell-Side · Preparation")}</div>${statusGrid()}<div style="margin-top:14px">${readinessLadder()}</div>`;
    case "events":
      return `${eventPanel()}${state.exported || state.returned ? `<div style="margin-top:14px">${exportReturnPanel()}</div>` : ""}`;
    case "sources":
      return sourcePacketPanel();
    case "work":
      if (!state.objectiveAuthorized) return objectivePanel();
      return `${pipelinePanel()}<div style="margin-top:14px">${issuePanel(true)}</div>`;
    case "evidence":
      return `${evidenceSelector()}${decisionPanel()}`;
    case "analysis":
      return `${qcPanel()}<div style="margin-top:14px">${state.impact.length ? `<div class="card card-pad"><div class="eyebrow">Impact Assessment ledger</div>${state.impact.map((entry) => `<p>${entry}</p>`).join("")}</div>` : ""}</div>`;
    case "package":
      return packagePanel();
    case "readiness":
      return `${readinessLadder()}<div style="margin-top:14px">${externalUsePanel()}</div>`;
    case "history":
      return `${exportReturnPanel()}<div style="margin-top:14px">${eventPanel()}</div>`;
    default:
      return dealForm();
  }
}

function bInspector() {
  if (state.bTab === "evidence") {
    return `<div class="eyebrow">Evidence inspector</div><h3>${state.selectedEvidence === "cash" ? "Cash / SR-002" : state.selectedEvidence === "ebitda" ? "EBITDA conflict" : "Retention Claim"}</h3>${evidenceDetail()}`;
  }
  return `<div class="eyebrow">Live dependency inspector</div>
    <h3>What constrains the current work</h3>
    <div class="snapshot-list">
      <div class="snapshot-item"><span class="label">Source perimeter</span><strong>${state.selectedSources.join(" · ")}</strong></div>
      <div class="snapshot-item"><span class="label">Active exceptions</span><strong>${activeIssueKeys().length}</strong></div>
      <div class="snapshot-item"><span class="label">Human Decisions</span><strong>${pendingDecisions()} pending</strong></div>
      <div class="snapshot-item"><span class="label">Exact Revision</span><strong>Rev ${state.currentRevision}</strong></div>
      <div class="snapshot-item"><span class="label">External use</span><strong>${state.externalAuthorized ? "authorized" : "unauthorized"}</strong></div>
    </div>
    <div class="button-row"><button class="button-quiet" data-action="b-tab" data-tab="evidence">Inspect lineage</button><button class="button-quiet" data-action="b-tab" data-tab="readiness">Open gates</button></div>`;
}

function renderBWorkspace() {
  const nav = B_TABS.map(([id, label]) => `<button class="b-nav-button ${state.bTab === id ? "active" : ""}" data-action="b-tab" data-tab="${id}">${label}</button>`).join("");
  return `
    <main class="variant-b">
      ${topbar("B", pill("Execution desk", "neutral"))}
      <div class="b-live-controls">
        <div class="b-control-cell"><span class="label">Deal</span><strong>${state.dealCreated ? "Project Northstar" : "create Deal"}</strong></div>
        <div class="b-control-cell"><span class="label">Work</span><strong>${workStage()}</strong></div>
        <div class="b-control-cell"><span class="label">Exceptions</span><strong>${activeBlockers().length}</strong></div>
        <div class="b-control-cell"><span class="label">Revision</span><strong>${state.currentRevision}</strong></div>
        <div class="b-control-cell"><span class="label">Readiness</span><strong>${state.readiness}</strong></div>
        <div class="b-control-cell"><span class="label">Last update</span><strong>${state.lastUpdate}</strong></div>
      </div>
      <div class="b-desk">
        <nav class="b-nav"><div class="eyebrow" style="padding:8px">Deal domains</div>${nav}</nav>
        <section class="b-surface">${renderBTab()}</section>
        <aside class="b-inspector">${bInspector()}</aside>
        <aside class="b-package-lane"><div class="eyebrow">Package lane</div><h3>Rev ${state.currentRevision}</h3>${packageRows(true)}<button class="button-quiet" data-action="b-tab" data-tab="package">Open package</button></aside>
      </div>
    </main>`;
}

function cSetupPanel() {
  if (!state.dealCreated) return `<div class="eyebrow">Output contract needs a Deal identity</div><h1>Bind this package to its transaction and intended use</h1>${dealForm()}`;
  if (!state.authorityConfirmed) return `<div class="eyebrow">Package dependency 1</div><h1>Confirm authority before source intake</h1>${authorityForm()}`;
  if (!state.packetSelected) return `<div class="eyebrow">Package dependency 2</div><h1>Select the minimum Source Packet</h1>${sourcePacketPanel()}`;
  if (!state.objectiveAuthorized) return `<div class="eyebrow">Package dependency 3</div><h1>Authorize the output-building objective</h1>${objectivePanel()}`;
  if (!state.workStarted) return `<div class="eyebrow">Package dependency 4</div><h1>Start observable controlled work</h1>${pipelinePanel()}`;
  return null;
}

function cArtifactCanvas() {
  const setup = cSetupPanel();
  if (setup) return setup;
  const artifact = FIXTURE.artifacts.find((item) => item.id === state.cArtifact) || FIXTURE.artifacts[0];
  let controlSurface = qcPanel();
  if (artifact.id === "analysis" || artifact.id === "records") controlSurface = evidencePanel();
  if (artifact.id === "auction") controlSurface = issuePanel(false);
  if (artifact.id === "reader") controlSurface = packagePanel();
  if (artifact.id === "archive") controlSurface = `${readinessLadder()}<div style="margin-top:14px">${externalUsePanel()}</div><div style="margin-top:14px">${exportReturnPanel()}</div>`;
  return `
    <div class="section-head"><div><div class="eyebrow">Selected package object · ${artifact.format}</div><h1>${artifact.name}</h1><p class="muted">${artifact.role}</p></div>${pill(artifactStatus(artifact))}</div>
    <div class="preview-shell">
      ${artifact.id === "analysis" || artifact.id === "auction"
        ? `<div class="preview-sheet"><span><strong>Controlled workbook spine</strong></span><span>Visible formulas</span><span>Stable tabs</span><span>Source citations</span><span>Exception register</span><span>Revision ${state.currentRevision}</span></div>`
        : `<div class="preview-page"><div class="eyebrow">Simulated ${artifact.format} representation</div><h2>Project Northstar · ${artifact.name}</h2><p>Every material statement traces through a Deliverable Reference to exact Evidence and an exact Source locator.</p><div class="evidence-chain"><span class="evidence-node">Source</span><span class="chain-arrow">→</span><span class="evidence-node">Fact / Assumption</span><span class="chain-arrow">→</span><span class="evidence-node">Artifact object</span></div></div>`}
    </div>
    <div class="button-row"><button class="button-secondary" data-action="preview-artifact" data-artifact="${artifact.id}">Inspect this simulated artifact</button>${artifact.id === "reader" || artifact.id === "archive" ? "" : !state.packageGenerated ? '<button class="button" data-action="generate-package">Build working package Revision</button>' : '<button class="button" data-action="c-artifact" data-artifact="reader">Inspect reader copy</button>'}</div>
    <div style="margin-top:16px">${controlSurface}</div>`;
}

function cDependencies() {
  const selected = state.selectedEvidence === "cash"
    ? ["Cash Fact proposal", "SR-002 · Balance Sheet!F28", `$${state.correction.currentCash.toFixed(1)}m · v${state.correction.version}`, state.issues.tieout ? "tie-out failed" : "tie-out passed"]
    : state.selectedEvidence === "ebitda"
      ? ["Adjusted EBITDA conflict", "SR-001 p.18 / SR-002 F42", state.decisions.conflictResolved ? "$17.8m scoped treatment" : "$18.4m vs $17.8m", state.issues.conflict ? "decision required" : "resolved for stated purpose"]
      : ["Retention Claim", "SR-003 · C-104", "96% · definition incomplete", state.decisions.unsupportedExcluded ? "excluded" : "unsupported"];
  return `<div class="eyebrow">Build dependency / backtrace</div>
    <div class="dependency-flow"><span class="dependency-node">${packetName()}</span><span class="dependency-node">Evidence Objects + native locators</span><span class="dependency-node">Typed Banker Decisions</span><span class="dependency-node">Deterministic QC</span><span class="dependency-node">Rev ${state.currentRevision} exact output</span></div>
    <div style="margin-top:16px"><h3>Current ceiling</h3>${pill(activeBlockers().length ? "blocked" : state.readiness, activeBlockers().length ? "bad" : statusClass(state.readiness))}<p class="muted">${activeBlockers().length ? `${activeBlockers().length} material constraints prevent affected reliance or circulation.` : "No active material control exception; readiness and external use remain independent."}</p></div>
    <div style="margin-top:16px"><h3>Selected lineage</h3><div class="snapshot-list"><div class="snapshot-item"><span class="label">Object</span><strong>${selected[0]}</strong></div><div class="snapshot-item"><span class="label">Native source</span><strong>${selected[1]}</strong></div><div class="snapshot-item"><span class="label">Current value</span><strong>${selected[2]}</strong></div><div class="snapshot-item"><span class="label">Control state</span><strong>${selected[3]}</strong></div></div></div>
    <div style="margin-top:16px"><h3>Revision contract</h3>${readinessLadder()}</div>`;
}

function renderCWorkspace() {
  const spine = FIXTURE.artifacts.map((artifact) => `<button class="artifact-spine-button ${state.cArtifact === artifact.id ? "active" : ""}" data-action="c-artifact" data-artifact="${artifact.id}"><strong>${artifact.name}</strong><small>${artifact.format} · ${artifactStatus(artifact)}</small></button>`).join("");
  return `
    <main class="variant-c">
      ${topbar("C", pill("Outcome contract", "neutral"))}
      <div class="c-contract-head">
        <div class="c-head-cell"><span class="label">Outcome</span><strong>Controlled Auction Execution Package</strong></div>
        <div class="c-head-cell"><span class="label">Deal</span><strong>${state.dealCreated ? "Project Northstar" : "not bound"}</strong></div>
        <div class="c-head-cell"><span class="label">Revision / readiness</span><strong>${state.currentRevision} · ${state.readiness}</strong></div>
        <div class="c-head-cell"><span class="label">Source Packet</span><strong>${packetName()}</strong></div>
        <div class="c-head-cell"><span class="label">Control state</span><strong>${activeBlockers().length} blockers · ${pendingDecisions()} decisions</strong></div>
        <div class="c-head-cell"><span class="label">Last update</span><strong>${state.lastUpdate}</strong></div>
      </div>
      <div class="c-workbench">
        <nav class="artifact-spine"><div class="eyebrow" style="padding:8px">Package artifact spine</div>${spine}</nav>
        <section class="artifact-canvas">${cArtifactCanvas()}${state.cArtifact !== "archive" && (state.externalAuthorized || state.exported || state.returned) ? `<div style="margin-top:16px">${exportReturnPanel()}</div>` : ""}</section>
        <aside class="dependency-inspector">${cDependencies()}</aside>
      </div>
    </main>`;
}

const HYBRID_TABS = [
  ["guide", "First Deal Guide"],
  ["events", "Event Inbox"],
  ["sources", "Sources"],
  ["work", "Work Queue"],
  ["evidence", "Evidence & Decisions"],
  ["analysis", "Analysis"],
  ["package", "Execution Package"],
  ["readiness", "QC & Readiness"],
  ["history", "History & Export"],
];

function firstValueAchieved() {
  return state.workStarted
    && !state.issues.tieout
    && state.decisions.factAccepted
    && !state.issues.conflict
    && state.decisions.conflictResolved;
}

function hybridGuideProgress() {
  const steps = [
    ["Deal identity", state.dealCreated],
    ["Authority", state.authorityConfirmed],
    ["Source Packet", state.packetSelected],
    ["Work objective", state.objectiveAuthorized],
    ["Controlled work", state.workStarted],
    ["Evidence-backed first value", firstValueAchieved()],
  ];
  return `<div class="hybrid-guide-progress">${steps.map(([label, done], index) => `<div class="hybrid-guide-step ${done ? "complete" : ""}"><span>${done ? "✓" : index + 1}</span><strong>${label}</strong></div>`).join("")}</div>`;
}

function hybridGuidePanel() {
  let current = "";
  if (!state.dealCreated) current = dealForm();
  else if (!state.authorityConfirmed) current = authorityForm();
  else if (!state.packetSelected) current = sourcePacketPanel();
  else if (!state.objectiveAuthorized) current = objectivePanel();
  else if (!state.workStarted) current = pipelinePanel();
  else current = `
    <div class="hybrid-first-value ${firstValueAchieved() ? "achieved" : ""}">
      <div class="eyebrow">First unmistakable value moment</div>
      <h1>${firstValueAchieved() ? "The Deal has reached controlled first value" : "Find, trace and close the first material exception"}</h1>
      <p>${firstValueAchieved()
        ? "The $18.4m / $17.8m EBITDA conflict is preserved and scoped, the $6.2m Cash extraction is corrected to $4.7m, and the EV-to-equity tie-out has recovered. The affected workbook, CIM and reader-copy path is now visible."
        : "The first-value proof is not a generated draft. It is a material source conflict plus a deterministic failure, shown with exact native lineage and recoverable Banker actions."}</p>
      ${firstValueAchieved() ? `<div class="button-row"><button class="button" data-action="graduate-hybrid">Graduate into the persistent execution desk</button></div>` : ""}
    </div>
    <div class="hybrid-guide-grid">
      <section>${issuePanel(true)}</section>
      <section>${evidencePanel()}</section>
    </div>`;
  return `
    <div class="section-head"><div><div class="eyebrow">Embedded guided mode inside the Deal Workspace</div><h1>Project Northstar · first-Deal control path</h1></div>${pill(firstValueAchieved() ? "first value reached" : "guide active", firstValueAchieved() ? "good" : "warn")}</div>
    ${hybridGuideProgress()}
    <div style="margin-top:16px">${current}</div>`;
}

function hybridPackageWorkbench() {
  const spine = FIXTURE.artifacts.map((artifact) => `<button class="artifact-spine-button ${state.cArtifact === artifact.id ? "active" : ""}" data-action="c-artifact" data-artifact="${artifact.id}"><strong>${artifact.name}</strong><small>${artifact.format} · ${artifactStatus(artifact)}</small></button>`).join("");
  return `
    <div class="section-head"><div><div class="eyebrow">C retained as a core B workspace view</div><h1>Controlled Auction Execution Package</h1></div>${pill(`Rev ${state.currentRevision} · ${state.readiness}`)}</div>
    <div class="hybrid-package-workbench">
      <nav class="hybrid-artifact-spine">${spine}</nav>
      <section class="hybrid-artifact-canvas">${cArtifactCanvas()}</section>
    </div>`;
}

function renderHybridTab() {
  if (state.bTab === "guide") return hybridGuidePanel();
  if (state.bTab === "package") return hybridPackageWorkbench();
  return renderBTab();
}

function renderHybridWorkspace() {
  const nav = HYBRID_TABS.map(([id, label]) => `<button class="b-nav-button ${state.bTab === id ? "active" : ""}" data-action="b-tab" data-tab="${id}">${label}</button>`).join("");
  return `
    <main class="variant-b variant-h">
      ${topbar("H", `${pill("Persistent Deal Workspace", "neutral")}${pill(firstValueAchieved() ? "first value reached" : "guided first use", firstValueAchieved() ? "good" : "warn")}`)}
      <div class="b-live-controls">
        <div class="b-control-cell"><span class="label">Deal</span><strong>${state.dealCreated ? "Project Northstar" : "create Deal"}</strong></div>
        <div class="b-control-cell"><span class="label">First-use mode</span><strong>${firstValueAchieved() ? "graduation available" : "guided"}</strong></div>
        <div class="b-control-cell"><span class="label">Work</span><strong>${workStage()}</strong></div>
        <div class="b-control-cell"><span class="label">Exceptions</span><strong>${activeBlockers().length}</strong></div>
        <div class="b-control-cell"><span class="label">Revision</span><strong>${state.currentRevision}</strong></div>
        <div class="b-control-cell"><span class="label">Readiness</span><strong>${state.readiness}</strong></div>
        <div class="b-control-cell"><span class="label">Human Decisions</span><strong>${pendingDecisions()} pending</strong></div>
        <div class="b-control-cell"><span class="label">Last update</span><strong>${state.lastUpdate}</strong></div>
      </div>
      <div class="b-desk hybrid-desk">
        <nav class="b-nav"><div class="eyebrow" style="padding:8px">B · persistent work domains</div>${nav}</nav>
        <section class="b-surface">${renderHybridTab()}</section>
        <aside class="b-inspector">${bInspector()}</aside>
        <aside class="b-package-lane"><div class="eyebrow">C · outcome contract</div><h3>Rev ${state.currentRevision}</h3>${packageRows(true)}<button class="button-quiet" data-action="b-tab" data-tab="package">Open package readiness</button></aside>
      </div>
    </main>`;
}

function modalMarkup() {
  if (!state.modal) return "";
  let content = "";
  if (state.modal === "sample") {
    content = `<div class="eyebrow">Synthetic sample · no real Deal data</div><h1>Analysis & Valuation Workbook preview</h1><div class="preview-sheet"><span><strong>Metric</strong></span><span><strong>FY25A</strong></span><span><strong>FY26E</strong></span><span>Revenue</span><span>$84.2m</span><span>$92.1m</span><span>Adjusted EBITDA</span><span>$17.8m</span><span>$19.2m</span><span>Cash</span><span>$4.7m</span><span>SR-002!F28</span></div><p class="muted">Visible formulas, native locators, proposed Fact state, conflict register and exact Revision references would travel with the editable workbook.</p>`;
  } else if (state.modal === "reader") {
    content = `<div class="eyebrow">Simulated reader-facing PDF representation</div><h1>Project Northstar · CIM Rev ${state.currentRevision}</h1><div class="preview-page"><p class="label">Selected Financial Highlights · Draft / ${state.readiness}</p><h2>Adjusted EBITDA: ${state.decisions.conflictResolved ? "$17.8m" : "BLOCKED — source conflict"}</h2><p>Cash: ${state.decisions.factAccepted ? `$${state.correction.currentCash.toFixed(1)}m · accepted Fact` : "BLOCKED — Fact decision pending"}</p><p>FY27 growth: ${state.decisions.assumptionApproved ? "8.0% · approved Assumption" : "BLOCKED — Assumption decision pending"}</p><hr /><p class="muted">Exact reader copy is bound to Rev ${state.currentRevision}. Circulation-candidate status and External-Use authorization remain separate.</p></div>`;
  } else if (state.modal === "events") {
    content = eventPanel();
  } else if (state.modal.startsWith("artifact:")) {
    const id = state.modal.split(":")[1];
    const artifact = FIXTURE.artifacts.find((item) => item.id === id) || FIXTURE.artifacts[0];
    content = `<div class="eyebrow">Simulated artifact inspection · ${artifact.format}</div><h1>${artifact.name}</h1><p>${artifact.role}. Status: <strong>${artifactStatus(artifact)}</strong>.</p><div class="evidence-chain"><span class="evidence-node">exact Sources</span><span class="chain-arrow">→</span><span class="evidence-node">Evidence / Decisions</span><span class="chain-arrow">→</span><span class="evidence-node">${artifact.name}</span><span class="chain-arrow">→</span><span class="evidence-node">Rev ${state.currentRevision} reader/control record</span></div><p class="muted">This is an interface-only preview. No Office, PDF, CSV, JSON or ZIP file was generated.</p>`;
  }
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><div class="section-head"><div></div><button class="icon-button" data-action="close-modal" aria-label="Close dialog">×</button></div>${content}</section></div>`;
}

function switcherMarkup(variant) {
  if (!window.__THROWAWAY_PROTOTYPE__) return "";
  return `<div class="prototype-switcher" aria-label="Prototype variant testing controls">
    <button data-action="previous-variant" aria-label="Previous prototype variant">←</button>
    <div class="switcher-label"><small>Testing tool · ← / →</small><strong>${variant} · ${VARIANTS[variant]}</strong></div>
    <button data-action="next-variant" aria-label="Next prototype variant">→</button>
  </div>`;
}

function changeVariant(delta) {
  const keys = Object.keys(VARIANTS);
  const current = keys.indexOf(variantFromUrl());
  const next = keys[(current + delta + keys.length) % keys.length];
  const url = new URL(window.location.href);
  url.searchParams.set("variant", next);
  window.history.pushState({}, "", url);
  render();
}

function render() {
  const variant = variantFromUrl();
  document.title = `PROTOTYPE ${variant} — ${VARIANTS[variant]}`;
  document.body.dataset.variant = variant;
  let page = "";
  if (state.screen === "discovery") {
    page = variant === "A" ? renderADiscovery() : variant === "B" ? renderBDiscovery() : variant === "C" ? renderCDiscovery() : renderHybridDiscovery();
  } else if (state.screen === "checkout") {
    page = renderCheckout(variant);
  } else {
    page = variant === "A" ? renderAWorkspace() : variant === "B" ? renderBWorkspace() : variant === "C" ? renderCWorkspace() : renderHybridWorkspace();
  }
  document.getElementById("app").innerHTML = `${page}${modalMarkup()}${state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ""}`;
  document.getElementById("prototype-switcher").innerHTML = switcherMarkup(variant);
}

document.addEventListener("click", (event) => {
  const element = event.target.closest("[data-action]");
  if (!element) return;
  const action = element.dataset.action;
  state.toast = "";
  if (action === "previous-variant") changeVariant(-1);
  else if (action === "next-variant") changeVariant(1);
  else {
    handleAction(action, element);
    render();
  }
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const editing = target instanceof HTMLElement
    && (target.matches("input, textarea, select") || target.isContentEditable);
  if (editing || state.modal) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    changeVariant(-1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    changeVariant(1);
  }
});

window.addEventListener("popstate", render);
render();
