# Confirmed Design Inputs

## Current baseline

- Name: Deal Control high-fidelity prototype
- Version: Prototype Design v1.0
- Status: Confirmed Prototype Design
- Confirmed on: 2026-08-09
- Confirmed by: Product Founder
- Location: `prototypes/deal-control-high-fidelity/`
- OpenDesign project: `fa5ba593-3875-442a-87a9-1807527b2bbb`

## Authority

The prototype is a mandatory but subordinate design input. It does not override the confirmed Product Specification, canonical domain terms, accepted ADRs, confirmed UX documentation, or technical contracts.

When sources disagree, do not silently choose or modify either side. Follow the applicable higher-authority document where it is clear; otherwise surface the discrepancy as a design decision.

## Required consumers

Read the prototype when planning, specifying, ticketing, implementing, testing, reviewing, or performing QA for customer-facing routes, layout, interaction, state, accessibility, responsive behavior, or visible control boundaries.

Backend, API, data, security, or infrastructure work reads it only when the work implements a visible state, authority boundary, or control represented by the prototype.

Research, commercial strategy, infrastructure operations, and pure domain-modeling work do not consume it by default.

## Reading depth

1. Every applicable task reads this file and the prototype `README.md`.
2. Planning, specification, ticketing, review, and QA also read `prototype-brief.md` and `page-coverage.md`.
3. Implementation and testing read only the source routes, components, state, and tests relevant to the current vertical slice.
4. No workflow must load the entire prototype when a narrower read is sufficient.

## Interpretation boundaries

Use the prototype as evidence for confirmed composition, navigation, interaction, visible states, responsive boundaries, accessibility behavior, and representative acceptance paths.

Do not promote synthetic data, Vite scaffolding, demo persistence, mocked integrations, unconfirmed brand material, or legal copy into production requirements.

## Change control

The confirmed prototype is read-only unless a task explicitly requests a prototype change.

A behavior-affecting design change first changes the prototype status to `Candidate`. After validation and Product Founder confirmation, update the version and restore `Confirmed Prototype Design`.

Non-behavioral maintenance may be applied without reconfirmation.

Implementation divergence never updates the prototype automatically. Resolve it against higher-authority documents or record an explicit design discrepancy.
