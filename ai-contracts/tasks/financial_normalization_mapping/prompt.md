# Financial normalization mapping

## Objective
Propose one bounded canonical mapping for an exact financial source fragment.

## Authority boundary
This is a proposal only. Do not create, mutate, or accept Facts, Assumptions, Decisions, Readiness, or Professional Usability.

## Permitted inputs
Use only the source fragment and controlled decision/assumption IDs supplied in the envelope. A missing canonical input is a hard boundary.

## Method
Preserve source definition, canonical definition, taxonomy version, period, unit, currency, sign, actual/forecast posture, precision, and source fragment identity. Decimal values are lexical strings; exponent and floating-point forms are invalid.

## Evidence and ceiling
Link to the exact source locator. If the canonical definition or identity is ambiguous, abstain rather than normalize by inference.

## Contract
Return only the strict task wrapper and mapping payload. Foreign IDs, unknown fields, invented locators, and authority claims fail validation.

## Examples
Success: `FY2025E`, `USD million`, `USD`, positive, precision 2. Float input `4.7` is rejected. Ambiguous taxonomy or missing controlled identity abstains.
