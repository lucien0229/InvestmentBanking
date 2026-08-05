# UX Spec — Controlled Sell-Side Auction Execution Workspace V1

Status: confirmed

Confirmed on: 2026-08-03

## Purpose

This document defines the implementation-facing customer experience for the V1 Controlled Sell-Side Auction Execution Workspace. It specifies page composition, field behavior, validation timing, interaction patterns, feedback, recovery, interface copy, accessibility, and responsive behavior across the Public Site, Account Access Gateway, Banker Account, Deal Workspace, and Recipient Access.

It turns the confirmed User Journey Map, User Flow, and Information Architecture into a behavioral delivery contract. It is not a visual-design system, wireframe, brand specification, API design, database schema, provider decision, or implementation plan.

## Authority and scope

This UX Spec is governed by, in order:

1. the confirmed [V1 Product Specification](../../.scratch/ai-investment-banking-productization-wayfinding/spec.md);
2. the canonical [Domain Context](../../CONTEXT.md);
3. the confirmed [User Journey Map](user-journey-map.md);
4. the confirmed [User Flow](user-flow.md);
5. the confirmed [Information Architecture](information-architecture.md);
6. [ADR 0001 — Separate internal controlled export from externally authorized delivery](../adr/0001-separate-internal-export-from-external-delivery.md); and
7. resolved Wayfinder assets when the higher-authority documents do not answer a question.

This document may refine interface labels when needed for comprehension, but it may not change the nine confirmed Deal work domains, canonical object ownership, product roles, business states, gates, or authority boundaries.

### Included

- page-level composition and behavior for every V1 customer surface;
- fields, required status, helper text, validation and draft behavior for material forms;
- tables, object pages, inspectors, drawers, dialogs and Control Reviews;
- empty, loading, waiting, success, blocker, error, confirmation, notification and denial behavior;
- Evidence location, Lineage, Impact Assessment and comparison interactions;
- keyboard, focus, screen-reader and asynchronous-status behavior;
- desktop, compact-desktop and bounded small-screen behavior; and
- English interface copy sufficient to implement all material states.

### Excluded

- visual identity, typography scale, color palette, icon style, illustration and motion direction;
- production component-library selection or design tokens;
- authentication, billing, model, parser, calculation, renderer, storage or notification vendors;
- exact file-size, packet, Office-version, browser or assistive-technology support values that require technical verification;
- an Operator Console or internal operations information architecture;
- Team membership, collaboration, approval routing or organization administration;
- production code, implementation tickets, deployment or analytics implementation; and
- any weakening of security, Evidence, professional-control or exact-Revision external-use gates.

## Experience actors and visibility

| Actor | Primary surfaces | May do | Must not do |
|---|---|---|---|
| Prospective Individual Banker | Public Site, Project Northstar, Pricing, Qualification, Account Access | Inspect synthetic proof, evaluate fit and terms, create or access an account, purchase | Upload real Deal Materials before entitlement and Paid Preflight |
| Individual Banker | Banker Account and own Deal Workspaces | Perform every V1 Banker task and record every reserved Human Decision | Delegate professional authority to AI or treat payment as source authority |
| External Recipient | Isolated Recipient Access | Authenticate and inspect one exact authorized Revision | Enter a Deal Workspace, discover other objects, edit, download or share onward |
| Deployment Operator | Outside customer IA | Deploy, observe, isolate, restart, rotate and recover through privacy-safe operational metadata | Enter a Banker/Recipient session, inspect or decrypt Deal content, mutate domain state or provide Banker review |
| AI responsibility plane | Contextual product surfaces only | Extract, compare, propose, analyze, draft, explain, flag and recommend | Promote a Claim to Fact, approve an Assumption or authorize external use |
| Deterministic responsibility plane | Contextual product surfaces only | Calculate, validate, tie out and enforce mechanically decidable gates | Establish Professional Usability or replace a Human Decision |

Senior bankers, specialists, management, sellers, Buyers and counterparties are Deal-domain participants, not V1 product members. Their inputs enter through the Individual Banker with provenance.

## Global experience principles

1. **Object before conversation.** Durable work belongs to canonical Deal objects and versions. There is no global chatbot, transcript authority or official-skill menu.
2. **One Deal, one authority.** Every summary, action, search result, notification and Job returns to the one authoritative Deal Workspace and exact object/version.
3. **Current and historical truth coexist.** Current pointers may change; Source Records, Process Events, Human Decisions and Revisions remain immutable and addressable.
4. **Independent states remain independent.** No scalar score or global `ready`, `approved` or `complete` state collapses Source, Analysis, Deliverable, Process, Job or external-use posture.
5. **Actions retain exact scope.** A state-changing action binds Deal, object, version, purpose, authority, actor and time.
6. **Accepted progress survives failure.** Retry, reauthentication, viewport change, navigation and session recovery preserve every durable checkpoint and safe draft.
7. **Readiness is not authorization.** Content, QC, Package Readiness, External-Use Decision, delivery creation and actual external use remain separate.
8. **Mechanism-bound language.** Copy says what the product inspected, traced, calculated, preserved, blocked or recorded; it never asserts unsupported accuracy, autonomy or professional approval.
9. **Desktop is complete; small-screen is bounded.** Smaller viewports preserve inspection and exit tasks without compressing material decisions into unsafe controls.
10. **Accessibility is release behavior.** All customer surfaces target WCAG 2.2 AA; a critical flow that cannot be completed accessibly is not complete.

## Cross-surface shell contract

### Public shell

The Public Site uses the confirmed navigation labels in this order:

1. Outcome
2. Project Northstar
3. How It Works
4. Security & Data Use
5. Pricing
6. Qualification
7. Resources
8. Account Access

Every public page exposes a route to Project Northstar, Pricing or Qualification. Trigger pages and Resources preserve their entry context when they deep-link into a matching proof state.

### Banker Account shell

`Deals` is the authenticated default and the only primary business collection. Usage & Plan, Billing & Invoices, Notifications, Account & Security, Data, Export & Deletion, and Help & Support remain low-frequency account utilities.

The Banker Account never exposes cross-Deal financial content, Evidence, Buyers, Deliverables or a global business dashboard.

### Deal Workspace shell

At desktop widths the Deal Workspace contains four regions:

1. **Persistent domain navigation** — the nine confirmed work domains plus contextual Guide and Deal Controls entries.
2. **Deal context header** — Deal identity, Deal Business Stage, activity/record posture and safe account/Deal switching.
3. **Primary work region** — the current collection, canonical object, task or control page.
4. **Context inspector** — a collapsible preview for related objects, blockers, status detail or action preparation.

The nine work domains remain, in order:

1. Overview
2. Action Center
3. Sources
4. Evidence & Decisions
5. Analysis
6. Auction Process
7. Execution Package
8. Review & Readiness
9. History & Portability

No Deal Business Stage, AI workflow, file type or provider changes this navigation structure.

## Common page and component contracts

### Collection page

Professional business-object collections use a table by default. Deals, public proof entry points and small summary groups may use cards.

Every table provides:

- a visible page title and collection description;
- a result count and current/history posture;
- search within the permitted surface;
- explicit filters for applicable independent states;
- controlled sort behavior;
- column visibility control;
- pagination with current position and total when known;
- a keyboard-operable row action to open the record;
- an optional context-inspector preview; and
- an explicit empty, loading or failure state in the table region.

Search, filters, sort, pagination and current/history choice are represented in the URL. Refresh, browser Back and an authorized shared deep link restore the same collection view.

The default is current information only. Historical information appears after an explicit `Include history` action and retains its exact Historical, Superseded, Withdrawn, Stale or Conflicted condition.

V1 provides product-defined views such as `Needs decision`, `Blocked` and `Current revisions`. It does not include a custom Saved View builder.

Bulk selection may support read-only inspection, export selection or marking New Events as viewed. It may not perform a material Human Decision, External-Use Decision, Deal Business Stage change, lifecycle action or deletion.

### Canonical object detail

Every durable object has a full, independently addressable detail page. Its header contains:

- object type and stable identity;
- Deal identity;
- Origin;
- current or historical designation;
- exact version and time;
- applicable independent-state summary; and
- valid actions for the exact object, version, purpose, mode and viewport.

The body uses five stable regions:

1. `Overview`
2. `Lineage & Impact`
3. `Controls & Decisions`
4. `Versions & History`
5. `Related Objects`

Object-specific content belongs in Overview. The selected region, version and return context persist in the URL. A context inspector may preview an object, but every durable item in the inspector links to its full page.

Historical objects display a persistent banner:

> Historical version
> You are inspecting {object} version {version}. It cannot be edited in place. Open the current version or create a correction from the applicable current context.

### Context inspector

The inspector may:

- preview a related object or version;
- show a blocker and its affected scope;
- expose a short Job status;
- compare a single relationship; or
- prepare a bounded reversible action.

It may not be the only home of durable information or the final container for a material Human Decision, External-Use Decision, stage transition, lifecycle action or deletion.

Opening the inspector moves focus to its heading. Closing it restores focus to the invoking element. On compact desktop it overlays the primary region without destroying page state.

### Dialog

A dialog is limited to short, bounded confirmation or data collection. It must have a programmatic name, initial focus, contained Tab order, Escape behavior when cancellation is safe, an explicit cancel action and deterministic focus restoration.

Dialogs may not contain long forms, Evidence review, complex comparison or material Control Review.

### Control Review

A Control Review is a dedicated page for a material Human Decision, External-Use Decision, Deal Business Stage change or consequential lifecycle action. It displays:

- exact object and version;
- purpose and scope;
- supporting and challenging Evidence;
- alternatives and current conditions;
- affected and unaffected downstream objects;
- required rationale, bounds and triggers;
- the immutable record that will be created; and
- a specific submit verb that names the result.

There is no generic `Approve AI`, `Approve`, `Confirm` or `Are you sure?` action for a material control.

### Action-safety levels

| Level | Applies to | Required behavior |
|---|---|---|
| 1 — reversible | Local view preferences and reversible attention state | Execute inline, announce result and offer Undo where meaningful |
| 2 — state-changing | Changes that create a new version or can be corrected through controlled history | Show exact scope and result preview, then require explicit submit |
| 3 — material control | Human Decisions, External-Use Decisions, stage and consequential lifecycle changes | Dedicated Control Review with Evidence, impact, rationale and immutable receipt |
| 4 — destructive | Deal or account deletion | Reauthentication, exact scope, typed object identity, final warning and durable receipt |

### Form and draft behavior

Complex forms use a full task page with logical sections. Required fields are identified in labels; optional fields are explicitly marked only where ambiguity would otherwise exist.

- Format and local constraint validation occurs on blur and again on Review.
- Cross-field, authority, version and domain validation occurs when the user requests Review.
- An error summary appears at the top, receives focus after failed Review and links to each invalid field.
- Conditional fields disclose what a selection will change before they appear.
- Safe product fields autosave as Draft and expose `Saving`, `Saved {time}` or `Save failed`.
- A Draft never activates a Human Decision, External-Use Decision, stage change or lifecycle action.
- Async validation preserves input and permits work that does not depend on the pending result.
- Version or permission conflict preserves the Draft and opens comparison/reconfirmation.
- Passwords, payment credentials and reauthentication secrets are never stored in product Draft state.

Standard form copy:

- Draft saved: `Draft saved at {time}. No decision or authorization has been recorded.`
- Save failure: `Draft not saved. Keep this page open and retry. No submitted record was changed.`
- Validation summary title: `Review the fields that need attention`
- Version conflict: `The underlying record changed while this draft was open. Compare the current version before submitting.`

### State Summary

An object State Summary displays only applicable dimensions and never produces an aggregate score. States are grouped as:

- Source & Evidence;
- Analysis & Mechanical;
- Deliverable & Review;
- Process; and
- External Use.

Each state exposes its label, exact object/version, basis, last change, blocker and next valid action. Exceptions, pending decisions and recent changes receive priority; passing states remain inspectable with lower visual emphasis.

`not stage-required`, `not evaluated`, `unknown`, `blocked` and `passed` are distinct. Color is supplementary; each state has text and programmatic meaning.

### Asynchronous Job

Every durable Job exposes:

- accepted input perimeter;
- affected object and version;
- exact Job State;
- current phase without a fabricated overall percentage;
- accepted durable progress;
- last heartbeat;
- safe continuation;
- cancellation and retry posture;
- smallest recovery action;
- expected return point; and
- allowance and Guarantee consequence.

The canonical object displays its relevant Job state and Action Center → Jobs indexes all Deal Jobs. A transient message may confirm command acceptance but cannot be the only status record.

When no reliable ETA exists, the interface shows elapsed time and last heartbeat instead. Status changes use a polite live region and do not repeatedly steal focus.

### Material feedback

Every material success, waiting, blocker or failure response follows this sequence:

1. Outcome
2. Exact scope
3. Consequence
4. Safe continuation
5. Smallest recovery action
6. Durable record

The following types remain distinct: `success`, `waiting-for-user`, `waiting-for-source`, `blocked`, `failed-retryable`, `failed-terminal`, `canceled`, `conflict` and `safe denial`.

### Empty state

An empty state stays at its canonical destination and answers:

1. what belongs here;
2. why it is empty;
3. whether the condition is normal, dependency-bound or blocking;
4. the applicable Output Ceiling;
5. the smallest valid next action; and
6. the return point after recovery.

It does not redirect to a chatbot or unrelated Dashboard and does not use illustration as the only explanation.

### Interface language

All V1 UI, help, input-understanding and Deliverable language is English. Copy uses sentence case, exact canonical terms and mechanism-bound verbs such as `inspect`, `trace`, `compare`, `calculate`, `tie out`, `preserve`, `record`, `block` and `export`.

Avoid `all clear`, `100% complete`, `ready to send`, `approved`, `we fixed it`, `AI-powered magic`, `smart recommendation` and other language that collapses responsibility or overstates evidence.

## Public Site page contracts

### Outcome `/`

**Purpose:** Establish the intended Individual Banker, live Sell-Side Auction problem, controlled outcome and self-serve product boundary.

**Composition:**

1. outcome statement and Initial Design ICP;
2. Controlled Auction Execution Package preview;
3. evidence-to-decision-to-consequence mechanism;
4. exact product boundary and non-goals;
5. Project Northstar entry;
6. implemented trust evidence;
7. price and qualification continuation.

**Primary actions:** `Inspect Project Northstar`, `Check qualification`, `View pricing`.

The page does not lead with a chat box, list of AI skills, quantified time-saving claim or unverified security badge.

### Project Northstar `/project-northstar/{proof-state}`

**Purpose:** Provide a no-signup, synthetic, guided and freely inspectable proof of the production interaction model.

**Persistent disclosure:**

> Synthetic Deal proof
> Every company, source, value, action and artifact in Project Northstar is synthetic. This proof demonstrates the product interaction and control model; it is not evidence that production processing or security requirements have passed.

**Guided proof sequence:**

1. inspect the complete synthetic Package outcome;
2. trace the `$18.4m` and `$17.8m` EBITDA conflict;
3. inspect the original `$6.2m` Cash extraction;
4. record the synthetic correction to `$4.7m` while preserving the original;
5. observe the `$1.5m` deterministic recovery;
6. inspect affected workbook, CIM, Reader Copy, QC and Package Readiness;
7. append SR-006 and compare Revision 0.3 with 0.4;
8. verify that prior authorization remains bound to Revision 0.3;
9. inspect or download rights-cleared synthetic artifacts and manifest.

The proof uses the same object, State Summary, Evidence Inspector, comparison and receipt grammar as the authenticated product. Its shell is intentionally narrower than the full Deal Workspace and does not expose fake production operations.

Users may leave the guide to inspect available synthetic objects and return to the last proof checkpoint. Proof completion is recorded only after all required mechanism steps were observed in the same resumable synthetic session.

**Alternative:** `Watch the accessible walkthrough` opens a captioned recording with transcript, chapter links and the same continuation actions. Watching does not emit interactive proof completion.

**Unavailable copy:**

> Interactive proof unavailable
> The synthetic workspace could not load. No account or Deal information was affected. Use the recorded walkthrough or retry the interactive proof.

### How It Works `/how-it-works/*`

Each mechanism page follows `input → control → product work → Banker decision → durable result`. It deep-links to the matching Project Northstar state and never presents the official plugin skills as navigation.

Required mechanism topics are Evidence & Decisions, deterministic validation, Revisions & Impact, and Native & Reader Artifacts.

### Security & Data Use `/security-data/*`

This surface describes only implemented and verified source-rights, confidentiality, provider-processing, support-access, retention, export and deletion behavior. Each claim links to its current scope or limitation. Unimplemented certifications and absolute claims remain absent.

### Pricing `/pricing`

The Pricing page shows:

- `$995 per month`;
- `$10,950 per year paid upfront`;
- annual equivalent and discount computed from the exact terms;
- one named Individual Banker;
- two concurrent Active Deal Workspaces;
- the current per-Deal file, logical-page, storage and full-workflow-operation envelope;
- additional Active Deal, intensive-processing and archive-capacity packs;
- unmetered Evidence inspection, correction, deterministic validation, QC, Review, Human Decision, normal targeted Revision and export behavior;
- Guarantee, cancellation and Post-Term Access; and
- links to Qualification and the current Capability Manifest.

Monthly and annual terms expose identical product capability. Prompts, model calls, tokens, citations, corrections, reviews and exports do not appear as paid units.

### Qualification `/qualification`

Qualification accepts no real files or Confidential/Restricted content.

| Section | Fields | Required behavior |
|---|---|---|
| Banker context | `Banker role`, `Can you purchase independently?` | Purchase authority is separate from every later source-use declaration |
| Intended work | `Deal type`, `Intended use`, `Intended audience` | Only the confirmed Sell-Side Auction boundary may pass cleanly |
| Inputs | `Expected source types`, `Expected template types`, `Known special structures` | Values are evaluated against the current Capability Manifest |
| Authority | `Can you confirm authority to use each source?` | A positive answer is a preview, not a source-specific decision |
| Confidentiality | `Expected confidentiality class`, `Employer or client restrictions` | The form accepts categories and restrictions, not Deal content |
| Processing | `Known provider or geographic restrictions` | Unknown is allowed and produces a constraint result |
| Packet | `Expected minimum Source Packet` | Incompleteness affects the result without inviting invented Facts |

Qualification produces exactly one result:

- `Likely compatible`
- `Potential constraint — review before purchase`
- `Not supported for this intended use`

Every result explains its basis, unverified conditions, what Paid Preflight will re-evaluate and the valid Pricing, Security & Data Use or exit action.

Standard result qualification:

> This result is based on the non-confidential information provided here. It does not authorize a Source, establish compatibility for an exact file, or replace Paid Preflight.

### Resources and trigger pages

Resources contain only rights-cleared synthetic artifacts, bounded utilities and recorded proof. A utility result is never a production Deal result. Each trigger route opens the matching Project Northstar state and retains a return link to the originating context.

## Account Access Gateway

The Gateway begins with `Email address` and `Continue`. The user does not have to select Create Account versus Sign In before the system can safely determine the next route.

Required states are:

- create account;
- sign in;
- verify identity or email;
- recover account;
- reset or replace an applicable credential;
- reauthentication;
- session expired; and
- access denied.

The configured credential, passkey, one-time-link or MFA method is an implementation decision. The UX contract requires:

- no company-email requirement;
- a generic response that does not reveal whether an account or protected object exists;
- preservation of an authorized return target without displaying its payload;
- safe Draft preservation across session expiry;
- successful dispatch to the exact authorized Banker or Recipient route; and
- a safe fallback to Deals or Recipient Access when the original target is no longer valid.

Standard access copy:

- Generic email response: `If this address can continue, we sent the next step.`
- Session expired: `Your session ended before this action was submitted. Sign in again to return to the saved task.`
- Safe denial: `This access cannot be completed. Verify the account used for this link or return to account access.`

## Checkout and entitlement

Checkout is a four-step durable flow: `Order → Terms → Payment → Confirmation`. Browser refresh, account recovery and payment failure preserve the current Order and exact step. Recovery is an exception state and route that returns to the preserved checkpoint; it is not a fifth step.

### Order

Fields and displayed terms:

- `Billing term` — Monthly or Annual;
- selected add-on capacity, if any;
- amount due now;
- renewal date and amount;
- tax treatment when known;
- two Active Deals;
- current allowances;
- unmetered professional-control actions; and
- annual equivalent and discount.

### Terms

Required acknowledgements:

- purchase authority;
- purchase does not establish authority to upload or use any Source;
- Guarantee conditions;
- cancellation and refund terms;
- Post-Term Access;
- export, retention and deletion terms; and
- provider and processing boundary disclosed on Security & Data Use.

### Payment

Fields are `Payment method`, `Billing name`, `Billing address`, `Country or region`, and applicable invoice/tax identity fields. Credential entry is owned by the configured payment integration and is not saved as product Draft data.

The submit action is `Pay {amount} and start {term}`.

### Confirmation

Confirmation shows:

- payment and entitlement status;
- term and renewal;
- Active Deal capacity;
- receipt and invoice entry;
- Guarantee posture; and
- `Set up first Deal`.

Payment states remain distinct:

| State | Message contract | Primary recovery |
|---|---|---|
| Failed | Payment did not complete; Order and Qualification remain saved | `Retry payment` or `Use another payment method` |
| Pending | No duplicate retry is required while the processor result remains pending | `Check payment status` |
| Requires action | The exact additional payment step is shown without losing Order state | `Continue payment verification` |
| Duplicate charge | The detected duplicate and refund posture are displayed | `View refund record` |
| Success | Entitlement was created exactly once | `Set up first Deal` |

## Banker Account pages

### Deals

Deals is the authenticated default. It supports search and the fixed posture filters `Active`, `Setup / Preflight-Restricted`, `Paused`, `Closed / Terminated`, and `Archived`.

Each row or card displays only:

- Deal identity;
- Deal Business Stage;
- workspace posture;
- Paid Preflight posture;
- current Revision or Package posture summary;
- blocker and pending-action counts;
- last durable update;
- next controlled action; and
- Active Deal capacity effect.

With no Deal, the page remains at Deals and opens Deal Setup:

> Set up your first Deal
> No Deal Workspace exists yet. Establish the Deal identity and Paid Preflight boundary before adding real Deal Materials.
> `Start Deal Setup`

### Usage & Plan

Displays entitlement, term, Active Deal capacity, allowances, forecast thresholds, add-on options and cancellation entry. At 70% forecast it explains expected remaining use; at 90% it displays exact remaining capacity and available options. Before an operation would exceed allowance, it pauses and requires an explicit pack purchase or renewal decision. There is no retroactive overage.

### Billing & Invoices

Displays subscription status, payment methods, invoices, receipts, Guarantee/refund status, renewal and cancellation. It does not imply source or external-use authority.

An open Payment Dispute shows the exact restricted allowlist and that every already-active Recipient Access is suspended rather than revoked. A won or reversed dispute never shows Access as restored automatically: each still-valid unchanged Access requires a new Control Review and explicit resumption, and the Recipient must verify again. A lost dispute shows revocation before Post-Term entry.

### Notifications

Owns notification history, delivery preferences, digest and snooze. Notification records link to the authorized return target but do not own the underlying Job, Process Event or Decision state.

### Account & Security

Owns named Individual identity, configured authentication methods, recovery, sessions, reauthentication and security events. It contains no Deal roles or Team membership.

When an Account Security Restriction is active, ordinary authenticated routes resolve to a dedicated recovery shell rather than exposing Account or Deal content. The shell shows only the privacy-safe restriction state, required identity/ownership proof, session/grant invalidation controls, suspended-Access counts and opaque identifiers, and the exact clearance action. Clearance requires fresh authentication, ends the Recovery Session, and returns to a new ordinary login; it never restores prior sessions or Recipient Access automatically.

### Data, Export & Deletion

Owns account-level export/deletion information, Post-Term clock, account deletion and deletion receipts. Deal-level Internal Controlled Exports remain under the exact Deal and History & Portability.

### Help & Support

Help content is organized by user task and canonical domain object. A Support request attaches privacy-safe identifiers, Job State, reason code, product version and time by default. It does not attach files, Source text, values, screenshots, Findings or Decision content.

V1 provides no support-personnel role, Banker impersonation, administrative Deal viewer or content-level break-glass path. When diagnosis would require content access, Help & Support presents the smallest user-controlled retry, re-upload, recovery or Internal Controlled Export path and never promises Banker review or manual Deal completion.

## Deal Setup, Paid Preflight and First Deal Guide

### Create Deal `/app/deals/new`

Deal Setup begins as a full task page. Accepting the identity-defining fields creates the authoritative Preflight-Restricted Deal Workspace and returns the user to `/app/deals/{deal-id}/setup`.

#### Deal Identity

| Field | Required | Behavior and helper text |
|---|---:|---|
| `Client or represented party` | Yes | `Identify the party whose Sell-Side Auction this Deal represents.` |
| `Transaction subject` | Yes | The company, business, asset or perimeter being marketed |
| `Transaction perimeter` | Yes | Include explicit inclusions and exclusions |
| `Banker role or side` | Yes | V1 requires the supported sell-side execution role |
| `Mandate objective` | Yes | Describe the authorized transaction objective, not an AI instruction |

A material change to these identity-defining fields does not edit the Deal in place. It starts a new linkable Deal and preserves the original.

#### Deal Context

| Field | Required | Behavior |
|---|---:|---|
| `Deal Business Stage` | Yes | Initiated, Preparation, In Market, Bid Evaluation, Exclusive Execution, Signed, Closed or Terminated, subject to entry requirements |
| `Intended purpose` | Yes | Exact initial purpose for Deal work |
| `Intended audience` | Yes | Internal audience or intended external audience class; not authorization |
| `Currency` | Yes | Explicit reporting currency |
| `Units` | Yes | Exact units such as actual, thousands or millions |

#### Authority & Confidentiality

| Field | Required | Behavior |
|---|---:|---|
| `Purchase authority` | Yes | Separate acknowledgement; never copied into Source authority |
| `Deal authority` | Yes | Basis for establishing and operating the Deal |
| `Expected source-use authority` | Yes | Preview only; each Source still requires its own record |
| `Confidentiality class` | Yes | Drives permitted processing paths and hard gates |
| `Employer or client restrictions` | Yes | `None known` is an explicit value, not an omitted field |

#### Processing & Compatibility

| Field | Required | Behavior |
|---|---:|---|
| `Intended processing path` | Yes | Constrained to verified paths for the confidentiality class |
| `Expected file families` | Yes | Checked against the current Capability Manifest |
| `Expected template posture` | Yes | Customer template, product default or not yet known |
| `Provider restrictions` | Yes | Unknown remains visible and may require recovery |
| `Special structures` | No | Encryption, macros, connections, embedded packages or known unsupported features |

### Paid Preflight `/app/deals/{deal-id}/controls/preflight`

Paid Preflight evaluates purchase authority, Deal identity, intended use/audience, source-use authority, confidentiality, processing compatibility, minimum security, input/template posture, minimum Source Packet and Guarantee eligibility.

| Outcome | Page behavior | Primary action |
|---|---|---|
| `pass` | Displays exact permitted scope and expiry/re-evaluation triggers | `Continue to source intake` |
| `limited-proceed` | Displays permitted scope, exclusions, Output Ceiling and invalidation triggers | `Accept limited scope` or `Resolve constraint` |
| `waiting-for-user` | Displays the exact missing declaration and safe work | `Provide required information` |
| `blocked` | Displays the hard gate, affected scope and smallest valid recovery | Context-specific recovery or `Exit Deal Setup` |

Pass copy:

> Paid Preflight passed for this scope
> This Deal may receive the permitted Source types through the stated processing path. Passing Preflight does not establish source truth, Professional Usability or external-use authorization.

Limited Proceed copy:

> Review the permitted scope
> Work may continue only within the scope below. The excluded actions remain blocked, and the current Output Ceiling still applies.

Blocked copy:

> Substantive processing is blocked
> {condition} prevents this Deal from receiving or processing the affected material. No payment, Assumption or navigation action can waive this gate. {recovery action}.

Material changes to use, audience, Source rights/confidentiality, processing path, compatibility or an expired basis trigger Targeted Re-Preflight. Only affected prospective work is blocked when safe continuation remains possible.

### First Deal Guide `/app/deals/{deal-id}/guide`

The Guide is an embedded, resumable task rail inside the Deal Workspace. Normal navigation remains visible. Each task opens the real canonical page or Control Review; no Guide-only domain object exists.

Required phases are:

1. Establish Deal identity and Paid Preflight;
2. Accept the minimum Source perimeter;
3. Build the Source Packet and Work Objective;
4. Observe controlled processing;
5. Inspect exact Evidence;
6. Record a typed Decision or correction;
7. complete applicable deterministic validation;
8. inspect Impact Assessment and affected Native/Reader results;
9. inspect QC and Package Readiness consequence;
10. create an Internal Controlled Export; and
11. explicitly enter the Deal Execution Desk.

Task completion is derived from canonical state and cannot be manually checked. Locked tasks show the unmet dependency, safe available work and return target. After graduation, Overview becomes the default and the Guide remains reopenable.

Graduation copy:

> First controlled loop complete
> The exact Evidence, your recorded Decision, deterministic result and affected Revision consequences are preserved. Continue in the Deal Execution Desk; the First Deal Guide remains available from Overview.

## Deal Workspace page contracts

### Overview

Overview is the ordinary return page and uses this priority:

1. Deal identity, Business Stage and activity/record posture;
2. Paid Preflight, permitted scope and Output Ceiling;
3. one `Next controlled action`;
4. material blockers, pending Human Decisions and required Sources;
5. current Source Packet and Work Objective;
6. Package and current Revision summary;
7. stage-applicable Milestones and Deliverables;
8. recent accepted Process Events and material changes;
9. First Deal Guide entry or completed-loop summary; and
10. Deal Controls.

Every summary links to its canonical object. Overview has no cross-Deal comparison, valuation dashboard, global readiness score or generic AI input.

Preflight-Restricted copy:

> Deal processing is restricted
> Paid Preflight has not permitted substantive processing for the affected scope. Review the exact gate and recovery action.
> `Open Paid Preflight`

### Action Center

Action Center contains five separate queues:

- Needs Decision;
- Needs Source;
- Blocked;
- Jobs; and
- New Events.

Each item exposes exact Deal, object, version, reason, affected scope, priority basis, smallest valid action and return target. Default ordering considers materiality, deadline/expiry, blocked dependency scope and entry time.

Selecting an item opens a context preview; completing the task opens the canonical object or Control Review. Action Center cannot independently mark the domain work complete.

Only New Events may be marked viewed in bulk. Viewing changes attention state, not Process Event truth. Resolved items leave the current queue and remain discoverable through history.

No-current-action copy:

> No current controlled action
> No unresolved action is assigned to this queue. This does not change the Deal Business Stage, Package Readiness or external-use posture.
> `Return to Overview`

### Sources

Sources uses the confirmed subareas: Source Overview, Source Records, Source Packets, Intake & Processing, Rights/Confidentiality/Compatibility, and Parsing Coverage.

#### Add Source

Source intake has four phases.

**1. Source declaration**

| Field | Required | Behavior |
|---|---:|---|
| `Source category` | Yes | Business-specific source family |
| `Origin or acquisition` | Yes | Where and how the Source Material was obtained |
| `Authority basis` | Yes | Exact basis for possession and use |
| `Permitted purpose` | Yes | Scope-specific permitted use |
| `Confidentiality class` | Yes | Cannot be inherited silently from another Source |
| `Processing restrictions` | Yes | `None known` is explicit |
| `Known special structures` | No | Encryption, macros, connections, embedded or active content |

**2. Safe receive**

Batch file selection is allowed, but safety and authority outcomes remain per Source. Files pass type, size, archive, malware and active-content screening before AI, parsing or rendering. Rejected and quarantined inputs never enter substantive processing.

**3. Source Record inspection**

Each accepted candidate displays:

- content identity and immutable original receipt;
- Origin and acquisition;
- authority, rights and permitted purpose;
- confidentiality and processing path;
- immutable Source Record identity, its stable Source Material, and relevant dates;
- file/format posture;
- parse, OCR, table and visual coverage;
- native locator capability;
- freshness, conflict and disposition;
- Source Reliance State; and
- current dependencies.

**4. Source Packet selection**

The user selects exact immutable Source Records, states the packet purpose and links a Work Objective. The product displays missing Sources, conflicts, limitations, current Output Ceiling and the next smallest source or confirmation.

| Field | Required | Behavior |
|---|---:|---|
| `Source Packet name` | Yes | Human-readable label; stable packet identity is system-owned |
| `Purpose` | Yes | Exact Deal purpose for this packet version |
| `Selected Source Records` | Yes | Each immutable record ID must be explicit; the system never substitutes another record from the same Source Material |
| `Declared exclusions` | Yes | `None` is explicit; omitted material is not silently treated as included |
| `Work Objective` | Yes | Authorized question, Deliverable, Analysis or process scope |
| `Intended use and audience` | Yes | Must remain within current Paid Preflight scope |
| `Output Ceiling acceptance` | Yes | Records the current supported ceiling and recovery plan, not an Assumption waiver |

#### Upload and Compatibility states

| State | Required feedback |
|---|---|
| Rejected | Exact safety or format reason; no substantive processing occurred |
| Quarantined | Why isolation was required; what metadata remains visible; who may recover |
| Supported | Exact Capability Manifest version and accepted scope |
| Supported with limitations | Coverage limitation, downstream consequence and recovery |
| Replacement/default required | Required export or product template and return point |
| Unsupported | Unsupported capability and safe exit; no false retry |

No-source copy:

> Add an authorized anchor Source
> This Deal has no Source Record. Add one supported Source you are authorized to use. The product will establish its exact coverage and Output Ceiling before substantive work proceeds.

Anchor-only copy:

> Source perimeter remains limited
> One anchor Source supports bounded inventory and Claim mapping. The complete Execution Package is not yet supportable. Review the missing-source plan.

### Evidence & Decisions

This domain contains Evidence, Claims, Facts, Assumptions, Conflicts and Human Decisions as distinct collections.

#### Evidence Inspector

The Inspector is a split view with a format-aware Source representation and structured Evidence/control pane. It opens at the exact native locator while preserving surrounding context.

Locator presentation is format-specific:

- PDF — page, region and text/table selector;
- PPTX — slide, shape/object and notes context;
- XLSX — workbook, sheet, cell/range and table/chart context;
- DOCX — section, heading, paragraph, table, footnote or comment;
- CSV — version, stable row and column;
- Web — captured representation or digest, URL, access time and permitted excerpt selector.

The structured pane shows Evidence, proposition, Origin, definition, period, unit, currency, scope, supporting/challenging relationships, Decision posture and downstream uses. A keyboard-accessible locator list is always available.

Unavailable visual representation copy:

> Source representation is limited
> The product preserved the accepted Source Record and locator data, but this region could not be rendered with the coverage required for visual inspection. Review the Compatibility Report and available native location.

#### Human Decision Control Review

Required fields vary by Decision type but draw from:

| Field | When required |
|---|---|
| `Decision type` | Always |
| `Object and exact version` | Always, read-only binding |
| `Scope and purpose` | Always |
| `Selected outcome` | Always |
| `Rationale` | Material Decisions |
| `Conditions or bounds` | Assumptions, limited acceptance and conditional actions |
| `Owner` | When follow-up responsibility exists |
| `Replacement Evidence` | Bounded Assumptions or temporary decisions |
| `Review or expiry trigger` | Time-, event- or source-bound Decisions |

The page displays supporting and challenging Evidence, alternatives, current deterministic result and Impact Assessment before submit.

Specific submit verbs include `Accept as Fact for this scope`, `Approve bounded Assumption`, `Resolve conflict using this source`, `Approve Buyer for this wave`, and `Select Bid for recommendation`.

After submission, the immutable Decision receipt shows actor, time, exact scope/version, Evidence, rationale, conditions, triggers and affected objects.

### Analysis

Analysis contains Calculations, Models, Scenarios, Analyses and Deterministic Validation Records.

Every Calculation page shows inputs, versions, formula or method, units, currency, period, precision and Mechanical Validity. Every Model shows dependent Calculations, definitions, Assumptions, Scenarios and output relationships. Every Analysis shows its question, Source Packet, Work Objective, Evidence, method, professional-judgment requirements and downstream uses.

AI proposals are attached to the applicable object and display Origin, Task and contract versions, input perimeter, supporting/challenging Evidence, validation, missing/conflicted Evidence, assumptions, uncertainty, downstream use and abstention/blockers. V1 does not expose the raw Prompt, provider request or provider response in the UI or Internal Controlled Export. There is no aggregate confidence score or global AI transcript authority.

Available actions are `Inspect evidence`, `Correct extraction`, `Prepare decision` and `Reject proposal`. Rejection records disposition without deleting the proposal.

Deterministic Validation Records display:

- applicability;
- exact inputs and versions;
- rule set and engine version;
- coverage;
- result;
- exceptions;
- unresolved judgment;
- time; and
- blockers cleared or created.

A deterministic pass clears only its declared gate.

### Auction Process

Auction Process is organized by stable object family: Timeline & Milestones, Buyers & Outreach Waves, NDA & Data-Room Access, Diligence Issues & Information Requests, Bids & Recommendations, and Stage Transitions. Deal Business Stage changes default emphasis and filters, not information ownership.

Collections preserve proposed, approved, occurred and current conditions separately. A planned outreach action is not actual outreach; an Approved Buyer is not evidence that outreach occurred; an NDA is not Data-Room Access; a recommendation is not Bid selection.

#### Auction object field contracts

All objects include the canonical identity, Origin, exact version, state, history and relationship fields. The following object-specific fields are additionally required:

| Object | Object-specific fields and distinctions |
|---|---|
| Buyer Candidate | `Buyer identity`, `Candidate rationale`, `Source context`, `Restrictions`, `Proposed fit factors`; candidate status must not imply approval, contactability, capacity or interest |
| Approved Buyer | Exact Buyer Candidate version, approval Decision, approved scope, restrictions, permitted wave/audience and invalidation triggers |
| Outreach Wave | Exact Approved Buyer set, purpose, timing, disclosure posture, material conditions and current planned/approved/occurred state |
| NDA | Counterparty, exact document/source, execution state, dates, parties, scope, conditions and supporting Process Event; execution does not imply disclosure permission |
| Data-Room Access | Buyer/recipient, external system, permission scope, granted/suspended/expired/revoked state, effective time and supporting Decision/Event; the product records but does not execute access |
| Diligence Issue | Issue statement, Evidence, materiality, affected scope, resolution criteria, current disposition and Banker Decision |
| Information Request | Exact requested information, linked Issue, recipient/owner, requested/due/received state and received Source link; closing the request does not resolve the Issue |
| Open Item | Required next action, linked object, owner, target time and completion evidence; it is work to do, not Evidence or risk |
| Bid | Bidder, exact Source Record/version, received time, economics, structure, conditions, financing, approvals, timing, comparability gaps and current Bid version |
| Milestone | Milestone type, planned time, completion criteria, supporting Process Events, current state and affected work; a date alone cannot mark completion |
| Process Event | Event type, occurred time, actor/party, exact related objects, supporting Evidence or Source, Origin and accepted current/historical consequence |

Bid comparison uses exact versions and displays economics, structure, conditions, financing, approvals, timing and source support as separate comparison dimensions. A revised Bid invalidates affected comparison/recommendation state and triggers an Impact Assessment.

#### Stage-transition Control Review

The page displays current stage, proposed stage, supporting Evidence, required Human Decision, required Process Event, affected work, applicable Package changes and valid backward-transition consequences.

| Transition | Minimum visible control |
|---|---|
| Initiated → Preparation | Confirmed Deal identity, authority and applicable preparation scope |
| Preparation → In Market | Actual authorized outreach Process Event, not Package readiness alone |
| In Market → Bid Evaluation | Applicable Bid events and comparable exact versions |
| Bid Evaluation → Exclusive Execution | Banker selection/decision and exact conditions |
| Exclusive Execution → Signed | Actual signed event and continuing conditions |
| Signed → Closed | Actual closing event |
| Any applicable stage → Terminated | Termination reason and Process Event |
| Backward transition | Reason, triggering event and affected current work |

Submit verbs name the result, for example `Move Deal to Bid Evaluation` or `Record Deal termination`. A successful transition appends history and returns to the exact current stage; it does not approve related Sources, Analyses, Buyers, Bids or Deliverables.

### Execution Package

The Package Overview groups Deliverables as:

- always required;
- current-stage required;
- conditional; and
- not stage-required.

Always-required Native Artifact spines are the Analysis and Valuation Workbook and Auction Control Workbook. Stage-triggered artifacts include applicable Teaser, CIM and Bid Evaluation and Recommendation Memo with exact Reader Copies. Conditional materials appear only when applicable.

Each Deliverable page shows:

- stable identity and owner;
- purpose, stage and audience;
- confidentiality;
- applicability;
- current Revision and complete history;
- Native Artifact and Reader Copy;
- Source, Model and process dependencies;
- lineage;
- Reviews and QC summary;
- Deliverable Readiness;
- Decisions and external-use posture; and
- valid Internal Controlled Export or Revision actions.

#### Templates & Compatibility

`Templates & Compatibility` is the canonical Deal-level home for Artifact Templates. It separates product-provided defaults from user-supplied templates and shows, for every exact template version:

- Deal or artifact-class scope;
- Origin and rights posture;
- Capability Manifest and Compatibility Report versions;
- integrity, active-content, link, font, layout, style and required-role coverage;
- supported, limited-fidelity, fallback or blocked posture;
- currently bound Deliverables and Revisions; and
- valid replacement, preflight or history actions.

Each Deliverable page displays its bound Artifact Template and exact version and links to this canonical record. Template intake or replacement uses a full task page with rights declaration and compatibility preflight. An incompatible user template offers the named limited-fidelity mapping, a product default while preserving the upload as reference, or a blocker; it never silently discards native structure.

`not stage-required` copy:

> Not required for the current stage
> This Deliverable is not applicable to the current Deal Business Stage and purpose. It is not missing and does not block Package Readiness.

#### Revision comparison

Ordinary comparison shows old and new Revisions side by side, including semantic content, dependency, state, Review/QC and authorization changes. Prior authorization is visibly attached only to its exact Revision.

#### Native Artifact and Reader Copy parity

A synchronized dual viewer aligns applicable sheet/slide/page positions and displays QC Findings by exact location and severity. Text, numbers, charts, tables, citations, confidentiality markings, order and qualification are compared independently.

#### Reimport and three-way comparison

Reimport always compares:

1. the original Internal Controlled Export;
2. the externally edited artifact; and
3. the current controlled Revision.

Differences are classified as `unchanged`, `Banker edit`, `generated-region change`, `conflict`, `unsupported` or `requires review`. Numerical/formula, text, structure, format, hidden-content and unsupported-feature differences remain distinct.

The system may propose a match or merge but cannot accept a material change automatically. Accepted state first produces an Impact Assessment, then a new immutable Revision. A conflict preserves all three inputs.

### Review & Readiness

Review & Readiness owns Reviews, QC Findings, Impact Assessments, Package Readiness, External-Use Decisions, Externally Authorized Deliveries and Recipient Access Control.

Execution Package pages show linked summaries of these records but do not duplicate ownership.

#### QC Finding

Fields are:

- `Finding type`;
- exact artifact, Revision and location;
- `Severity`;
- Evidence, deterministic rule or reviewer Origin;
- `Impact`;
- `Owner`;
- `Remediation state`;
- intended-use consequence; and
- re-test result.

Closing a Finding requires the applicable remediation and re-test. Dismissal or accepted limitation remains an explicit Human Decision, not deletion.

#### Impact Assessment

The default view is task-oriented rather than a full unconstrained graph. It first summarizes upstream change, direct dependencies, downstream affected/unaffected counts and new blockers.

Affected items are grouped as:

- recalculation required;
- regeneration required;
- re-review required;
- circulation blocked; and
- inspected and unaffected.

The user can expand an exact source-to-output path. Every node includes object, version, state and locator and links to its canonical page. A bounded visual graph is optional for the selected path; an equivalent hierarchical list/table is always available.

#### Package Readiness

Package Readiness uses a blocker-first matrix with one row per applicable requirement or Deliverable. Columns are `Requirement`, `Exact scope`, `Current posture`, `Evidence or control record`, `Blocker`, and `Next controlled action`.

It does not use a scalar score or a master green state. `working-draft`, `analysis-ready`, `senior-review-ready`, `circulation-candidate` and `blocked` remain exact-Revision and intended-use bound.

No-current-Finding copy:

> No unresolved QC Findings
> No unresolved QC Findings apply to this Revision. This does not establish Professional Usability or authorize external use.
> `Review Package Readiness`

#### External-Use Decision

Only an eligible circulation-candidate exact Revision may enter this Control Review.

| Field | Required | Behavior |
|---|---:|---|
| `Revision and artifact hashes` | Yes | Read-only exact binding |
| `Recipient or audience` | Yes | Specific recipient or controlled audience class |
| `Purpose` | Yes | Exact external purpose |
| `Channel or time` | Yes | Intended channel and applicable time window |
| `Rights and disclosure basis` | Yes | Must match current Source restrictions |
| `Confidentiality conditions` | Yes | Exact applicable conditions |
| `Limitations` | Yes | `None` must be explicit |
| `Required specialist or firm conditions` | When applicable | Cannot be inferred from readiness |
| `Authority basis` | Yes | Decision-maker's authority for this use |
| `Invalidation triggers` | Yes | Source, Revision, audience, purpose, time or condition changes |

The review displays Native/Reader parity, QC, unresolved limitations, Package Readiness and active blockers. Submit is `Authorize this Revision for the stated external use`.

Success copy:

> External-Use Decision recorded
> Revision {revision} is authorized only for {recipient/audience}, {purpose}, under the stated conditions. No delivery or external-use event has occurred.

#### Externally Authorized Delivery and Recipient Access

Delivery creation is available only from a matching active External-Use Decision. The form re-displays exact Revision, recipient, purpose, conditions, expiry and permissions.

V1 Recipient Access is authenticated, recipient-specific, read-only, non-downloadable, expiring and revocable. Creation does not prove that the recipient accessed the content.

### History & Portability

History & Portability provides four linked views:

1. business and Process Event timeline;
2. object/version and Revision history;
3. Human Decision, External-Use Decision and External-Use Event history; and
4. system, audit and portability records.

Every event displays actor, Origin, time, object, exact version, event type and result. Filters cover object type, event type, actor, date and current/history posture. The history log cannot be edited to change current domain state.

#### Internal Controlled Export

The export review displays:

- exact objects and Revisions;
- Native Artifact and Reader Copy identity/hash;
- current readiness and limitations;
- rights/confidentiality restrictions;
- included/excluded files and control records;
- intended internal use;
- manifest version; and
- reimport relationship.

Ordinary readiness blockers may remain visible on an Internal Controlled Export, but rights, confidentiality, isolation, corruption or required-record failures block the affected export.

Submit is `Create internal controlled export`.

Success copy:

> Internal Controlled Export created
> This export preserves the exact Revision, current posture, limitations and manifest. It does not authorize external circulation.

#### Record product-external use

The Banker may record actual use that occurred outside the product. Required fields are exact Revision, matching External-Use Decision, recipient/audience, purpose, actual channel, actual time and supporting receipt when available. This creates an External-Use Event and does not modify the prior Decision.

#### Archive package

The page validates required files, hashes, lineage records, Decisions and declared exclusions before creation. Failure identifies each missing or invalid item. Success exposes an index-first package and manifest without representing unresolved work as resolved.

## Deal lifecycle controls

Lifecycle actions live at `/app/deals/{deal-id}/controls/lifecycle`. The page displays current Deal Business Stage, activity posture, record posture, recent Process Events, Active Deal capacity and applicable Recipient Access.

| Action | Required review | Result |
|---|---|---|
| Pause | Reason, expected return condition, current Jobs, suspended work and continuing Recipient Access | Paused posture takes effect immediately; underlying Business Stage and committed history are preserved; new Job claims and later domain-result commits are fenced |
| Resume | Current return condition, elapsed time, new changes and required targeted re-preflight/impact work | Active posture at the explicit return stage; no prior external Access is newly authorized by resume |
| Advance / Move Backward | Evidence, Human Decision, Process Event and affected work | New current stage with append-only history |
| Close | Actual closing event and remaining conditions | Closed outcome; not automatically Archived |
| Terminate | Termination reason, event and unresolved work | Terminated outcome; history preserved |
| Archive | Read-only effect, running/queued/waiting/blocked Jobs, finish-or-cancel choice, capacity release and Recipient Access reminder | Archive remains pending until every domain-mutating Job finishes or safely cancels, then enters Archived record posture with no grandfathered commit |
| Reactivate | Capacity, new changes and current Preflight posture | Same Deal identity becomes Active if permitted |
| Delete Deal | Reauthentication, exact scope, typed Deal identity and retention disclosure | Normal access removed and deletion lifecycle begins |

Archive copy:

> Archive this Deal Workspace
> Archiving makes the Deal read-only and releases Active Deal capacity. It does not change the Deal outcome or automatically revoke valid Recipient Access.

Closed and Terminated remain Deal Business Stages rather than permission postures. They do not make the Workspace read-only by themselves; Paused, Archived, commercial, security, deletion and exact resource controls determine available actions independently.

Delete confirmation requires the user to type the exact displayed Deal identity. The final submit verb is `Delete Deal and remove normal access`.

## Subscription cancellation and Post-Term Access

Cancellation is available from Usage & Plan and Billing & Invoices. Before confirmation the page displays paid-term end, new-work cutoff, Recipient Access consequence, the 30-day Post-Term window, permitted inspection/Internal Controlled Export/deletion actions and prohibited new work/delivery/sharing.

Submit is `Cancel at end of paid term`. Success creates a durable cancellation receipt.

During Post-Term Access the same Account and Deal routes remain in a visible read-only mode. Every page displays the exact end time and allowed actions. Later resubscription does not restore old Recipient Access.

Post-Term banner:

> Post-Term Access ends {date and time}
> You may inspect existing records, create permitted Internal Controlled Exports and delete data. New Deal work, external delivery and sharing are unavailable.

## Deletion lifecycle

Before Deal or Account deletion, the Control Review lists immediate access loss, access revocation, active-store/index/provider/back-up handling, expected processing stages and the minimum payment/security/legal-preservation records that may remain.

After confirmation, normal access is removed immediately and a privacy-safe deletion request receipt is created. Status values are:

- request accepted;
- normal access removed;
- active deletion in progress;
- scheduled backup expiry;
- completed; and
- preservation exception.

The restricted status view contains request identity, exact scope, submitted time, current stage, applicable dates, preservation category/reason and completion receipt. It never reopens deleted content.

Partial or failed deletion enters durable recovery and cannot display a completed state.

## Recipient Access

Recipient Access is a navigation-free single-task surface:

1. Verify Recipient Identity;
2. Access Check;
3. Exact Revision Viewer; or
4. Unavailable State.

The verification contract is fixed: a fragment-carried one-time link secret is explicitly exchanged, an email code proves mailbox control, and a separate Recipient Session cookie carries the resulting narrow session. Only the provider-specific email delivery and framework implementation remain deferred. The UX always rechecks recipient identity, active Access, matching External-Use Decision, exact Revision, expiry, revocation and invalidation before content appears.

The Viewer exposes only:

- Deliverable identity;
- exact Revision identity;
- Reader Copy;
- authorizing party;
- stated recipient/audience and purpose;
- conditions and limitations;
- validity/expiry; and
- safe access help.

It exposes no Deal navigation, other Revision, editing, download, onward sharing, internal Evidence, internal QC or account utility.

When access expires, is revoked, is invalidated, targets another identity or cannot be safely established, use the same non-enumerating outcome:

> This access is unavailable
> The requested content cannot be opened with the current access. Verify the identity used for this link or contact the authorizing party.

A changed Deliverable never redirects the recipient to a newer Revision. A new exact Revision requires a new matching External-Use Decision and Recipient Access.

## Capability Manifest and Compatibility Report

### Capability Manifest

The public and authenticated product use the same versioned Capability Manifest. Each declared capability includes:

- file family and extension;
- verified maximum file, archive, packet and concurrency limits;
- encryption/password behavior;
- macros, external links, connections and embedded-content behavior;
- parse, OCR, table, chart and visual coverage;
- target Native Application and Reader versions;
- native edit, render, export, reimport and round-trip behavior;
- known limitations; and
- last verified product version/date.

The UX renders only verified values supplied by technical acceptance. It does not substitute `unlimited`, `fully supported` or an inferred version.

### Compatibility Report

Every proposed or received supported-input candidate binds its Report to the exact Source/Artifact identity, applicable Capability Manifest version and Deal control context.

Allowed outcomes are:

- supported;
- supported with limitations;
- replacement or default template required;
- quarantined; and
- unsupported.

The Report states coverage, special structures, safety outcome, affected downstream work, Output Ceiling, replacement/default path and return target. Later product capability changes do not rewrite the historical Report.

## Notification contract

Notifications use five classes:

1. Action required;
2. Job exception;
3. Material Deal change;
4. Access and security; and
5. Billing and lifecycle.

Authenticated in-app records may link to the complete authorized context. External email or notification payload contains only a generic event class and authenticated deep link. It excludes Deal/client/Buyer names, filenames, values, Bids, Source text, formulas, Findings, Decision text and artifact excerpts.

Default delivery behavior:

| Class | In app | Immediate email | Digest/snooze |
|---|---:|---:|---:|
| Action required | Yes | Yes for material or expiring action | Configurable |
| Job exception | Yes | Material failed/blocked only | Configurable |
| Material Deal change | Yes | Only authorization invalidation or similarly consequential change | Default digest |
| Access and security | Yes | Yes | Security-critical items cannot be disabled |
| Billing and lifecycle | Yes | Yes | Payment/deletion receipts cannot be disabled |

Multiple effects from one root event are grouped into one notification with affected counts. Notifications retain delivery history but never become Process Event or Job truth.

Standard external copy:

- Action required: `A task in your Deal Workspace requires your attention. Sign in to review it.`
- Job exception: `A product task could not continue. Sign in to review preserved progress and recovery.`
- Material change: `A material Deal Workspace change is ready for review.`
- Access/security: `An account or access event requires review.`
- Post-Term: `Your read-only export and deletion window is approaching its end.`

## Responsive interaction contract

Responsive behavior is based on CSS viewport, not device detection.

### Full workspace — 1280px and wider

- persistent domain navigation, primary work region and context inspector may coexist;
- complete V1 Banker actions are available;
- dense tables expose their configured default columns; and
- Evidence, artifact and comparison split views may use simultaneous panes.

### Compact workspace — 1024px to 1279px

- domain navigation collapses to a labeled rail or temporary panel;
- the context inspector opens as an overlay or replaces a secondary pane;
- tables reduce default columns while retaining column controls;
- split views allow pane switching or controlled resizing; and
- complete V1 Banker actions remain available.

### Bounded small-screen — below 1024px

Primary navigation is reduced to:

- Deals;
- Overview;
- Action Center;
- Read-only Object Viewer;
- History & Internal Exports; and
- Account.

| Action | Small-screen behavior |
|---|---|
| Account access and recovery | Supported |
| Safe notification return | Supported |
| Read-only object, Evidence and status inspection | Supported |
| Job/status inspection | Supported |
| Existing Internal Controlled Export access | Supported |
| Create new Internal Controlled Export | Visible, blocked with desktop handoff |
| Subscription cancellation | Supported |
| Deal or Account deletion | Supported with full reauthentication/confirmation |
| Source upload or reimport | Visible, blocked with desktop handoff |
| Native Artifact editing | Native application/desktop only |
| Material Human Decision | Visible, blocked with desktop handoff |
| Deal Business Stage change | Visible, blocked with desktop handoff |
| External-Use Decision | Visible, blocked with desktop handoff |
| Create Recipient Access or Delivery | Visible, blocked with desktop handoff |

Crossing into small-screen mode preserves every Draft and durable checkpoint. A prohibited action remains visible in exact context with:

> Continue on desktop
> This action requires the complete workspace because it changes {exact scope}. Your current progress is saved.

Available handoff actions are `Copy secure link` and `Send secure link to my account email`. The link carries authorized return context without payload, expires, and reauthorizes Account, Deal, object and version on open. It is created only after safe Draft save succeeds.

## Accessibility interaction contract

All customer-facing surfaces target WCAG 2.2 AA. Purchase, Paid Preflight, Source/Evidence inspection, Human Decision, Package/readiness review, export, Recipient Access and deletion are release-blocking critical flows.

### Structure and navigation

- Every page has one descriptive level-one heading and a logical heading hierarchy.
- Skip links reach primary navigation, main content and contextual status where present.
- Breadcrumbs identify Account → Deal → domain → object → version.
- Landmarks and accessible names distinguish navigation, main region, inspector and supporting regions.
- Browser title includes the safe object type and page context; it must not expose confidential payload beyond the authenticated surface.

### Keyboard and focus

- Every interactive action is keyboard reachable in a logical order.
- Focus is always visibly indicated.
- Route change moves focus to the new page heading unless focus must return to a preserved task.
- Inspector/dialog close restores the invoking control.
- Table rows expose explicit `Open {object}` actions rather than relying on pointer-only row clicks.
- Drag, pan, resize or graph interactions have keyboard alternatives.

### Forms and errors

- Labels, descriptions, required state and error relationships are programmatic.
- Failed Review focuses the error-summary heading; summary links move focus to the field.
- Error text states the problem and valid correction, not color or icon alone.
- Conditional fields announce their insertion without unexpectedly moving focus.
- Destructive typed confirmation does not disable paste solely as a friction device; exact-value comparison and reauthentication provide the safety control.

### Status and live updates

- Command acceptance and material Job-state change use polite live regions.
- Security timeout or imminent irreversible session loss may use assertive announcement.
- Heartbeats do not announce every refresh; only meaningful state changes are announced.
- Loading skeletons have an accessible status and do not replace the page heading.

### Tables, comparisons and Lineage

- Table headers expose scope and sort state.
- Pagination identifies current position and result range.
- Side-by-side diff has a linear difference list with old/new values and classification.
- Lineage graphs always have an equivalent hierarchical list or table.
- Native/Reader visual comparison exposes structured finding descriptions and exact locators.

### Public proof alternative

Project Northstar includes a captioned recording, transcript, chapter navigation and deep links to the same proof facts. It does not emit interactive-completion events.

The exact supported browser, screen-reader and assistive-technology matrix remains a technical verification decision and must be published only after representative testing.

## Standard state and recovery copy

The following English copy is normative except where bracketed content must be supplied from exact state.

| Context | Title | Body | Primary action |
|---|---|---|---|
| Paid Account, no Deal | `Set up your first Deal` | `Establish the Deal identity and Paid Preflight boundary before adding real Deal Materials.` | `Start Deal Setup` |
| Preflight pass | `Paid Preflight passed for this scope` | `The permitted processing scope is recorded. Source truth, Professional Usability and external-use authorization remain separate.` | `Continue to source intake` |
| Limited Proceed | `Review the permitted scope` | `Only the stated work may continue. Excluded actions remain blocked and the current Output Ceiling applies.` | `Accept limited scope` |
| Waiting for user | `A decision is required` | `{object} cannot continue until you record {required decision}. Accepted progress is preserved.` | `Review decision` |
| Waiting for Source | `A Source is required` | `{work} requires {source or clarification}. Other work within {safe scope} may continue.` | `Add or identify Source` |
| Blocked | `This work is blocked` | `{gate} blocks {affected scope}. {safe continuation}. Resolve {recovery} to return to {return point}.` | Context-specific recovery |
| Retryable failure | `The task could not continue` | `Accepted progress through {checkpoint} is preserved. Retrying will not repeat accepted domain or commercial effects.` | `Retry from checkpoint` |
| Terminal failure | `This task cannot be completed as requested` | `{reason}. Preserved state remains available. Use {alternative path} or open product support.` | Context-specific alternative |
| Canceled | `Task canceled` | `{completed scope} remains accepted. {uncompleted scope} was not applied.` | `View preserved state` |
| Conflict | `Conflicting information requires review` | `The product preserved each exact source and did not select one as true. Review the definitions, periods and Evidence.` | `Review conflict` |
| Completed Job | `Declared task scope completed` | `{result} completed for {object/version}. This does not establish unrelated readiness or authorization.` | `View result` |
| Historical object | `Historical version` | `You are inspecting {object/version}. It cannot be edited in place.` | `Open current version` |
| Not stage-required | `Not required for the current stage` | `This Deliverable is not applicable to the current Deal Business Stage and does not count as a blocker.` | `View applicability` |
| Archived Deal | `Archived Deal Workspace` | `This Deal is read-only. You may inspect, export, delete or reactivate it if capacity and controls permit.` | `Review lifecycle options` |
| Post-Term | `Post-Term Access ends {time}` | `Inspection, permitted Internal Controlled Export and deletion remain available. New work and external delivery are unavailable.` | `Review export and deletion` |
| Safe denial | `This access is unavailable` | `The requested content cannot be opened with the current access.` | `Return to account access` |
| Internal export success | `Internal Controlled Export created` | `The export preserves exact identity, posture and limitations. It does not authorize external circulation.` | `View export record` |
| External authorization success | `External-Use Decision recorded` | `The exact Revision is authorized only for the stated recipient/audience, purpose and conditions. No delivery or use has occurred.` | `Review delivery options` |
| Deletion accepted | `Deletion request accepted` | `Normal access to {scope} has been removed. Track active deletion, scheduled expiry and any preservation exception here.` | `View deletion status` |

## Traceability to User Flow

| UX Spec area | User Flow coverage |
|---|---|
| Outcome, Project Northstar, How It Works, Resources | UF-01, UF-02 |
| Qualification, Account Access, Checkout, entitlement | UF-03, UF-04 |
| Deal Setup and Paid Preflight | UF-05, UF-06, UF-07 |
| Sources, Compatibility Report, Source Packet and Work Objective | UF-08, UF-09 |
| First Deal Guide and controlled Jobs | UF-10, UF-11 |
| Evidence Inspector and Human Decision Control Review | UF-12, UF-13, UF-14 |
| Graduation and Overview return | UF-15, UF-16 |
| Canonical object work and stage changes | UF-17, UF-18 |
| Auction Process | UF-19 |
| Execution Package, QC and Package Readiness | UF-20 |
| Internal Controlled Export and reimport | UF-21, UF-22 |
| External-Use Decision and delivery | UF-23, UF-24 |
| Recipient Access and product-external use | UF-25, UF-26 |
| Impact Assessment and new Revision | UF-27, UF-28 |
| Pause, archive, close, terminate and Post-Term Access | UF-29, UF-30, UF-31, UF-32 |
| Deal and Account deletion | UF-33, UF-34 |
| Feedback, empty states, notifications and responsive handoff | UF-35, UF-36, UF-37, UF-38 |

## Implementation-deferred values

The UX behavior is complete without inventing the following values. They must be supplied by technical design and verified acceptance evidence before the relevant interface or claim is enabled:

- authentication credential, MFA and provider implementation;
- payment, tax, invoice and refund providers;
- exact file, archive, packet, concurrency and timeout limits;
- parsing, OCR, table, chart and visual-coverage engines;
- supported Excel, PowerPoint, Word and PDF versions/renderers;
- macro, external-link, connection, embedded-content and unsupported-OOXML matrix;
- stable native-locator implementation details;
- digest, signing and manifest canonicalization;
- notification delivery provider and authenticated-link implementation;
- provider/framework implementation details for the confirmed one-time-link, email-code and isolated Recipient Session verification contract;
- retention coordination and backup-expiry implementation;
- browser and assistive-technology verification matrix; and
- statistical quality, materiality and performance thresholds beyond the product's already confirmed behavioral gates.

An implementation-deferred value appears in the UI only through a current verified Capability Manifest, configuration-backed term or exact runtime state. It is never represented as an assumed success.

## UX Spec completion criteria

The experience conforms to this UX Spec only when it can demonstrate all of the following without weakening an upstream contract:

- every V1 surface enters the correct information and authority domain;
- every durable object/version has a full canonical page and safe return path;
- the complete First Deal Guide uses real Deal objects, reaches First Unmistakable Value, creates the first permitted Internal Controlled Export and requires explicit graduation;
- fields, Drafts, validation and Control Reviews preserve exact scope and authority;
- long-running work exposes independent durable Job states and recovery;
- Evidence, AI proposal, deterministic result and Human Decision remain visibly distinct;
- Package content, QC/readiness, authorization, delivery and actual use remain separate;
- Internal Controlled Export remains distinct from Externally Authorized Delivery under ADR 0001;
- empty, waiting, blocker, failure and denial states preserve accepted state and name the next valid action;
- all 38 User Flows are represented through the traceability table and page contracts;
- desktop supports the complete workflow while bounded small-screen mode preserves its exact allowed actions and desktop handoff;
- all customer surfaces target WCAG 2.2 AA and critical flows pass the required interaction contract;
- Capability and Compatibility language is bound to verified versioned records; and
- no implementation-deferred vendor, numeric limit, compatibility range or performance claim is invented by the UX layer.
