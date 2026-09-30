# ADR 0044 — Accept narrative content before artifact Revisions

Status: accepted design, 2026-09-30. Extends [ADR 0032](0032-persist-narrative-deliverable-content-as-schema-governed-payloads.md).

Narrative content acceptance creates an immutable Accepted Content Version under the Deliverable, with closed schema, exact typed authority bindings, digest and audience/purpose. It does not require or create a Revision. A later successful build transaction creates the Revision, binds that accepted content and verified artifact set, and advances the current pointer under CAS. An empty Deliverable may have no current Revision. Workbook authority remains relational.

This avoids blank placeholder Revisions and permits content inspection/retry before a renderer succeeds. The cost is a separate immutable content identity and a Revision-to-content binding. Failed or competing builds retain accepted content but cannot expose partial Revisions. Content acceptance never inherits QC, Review or external authorization. The complete transaction and failure cases are in [Control consistency](../technical/control-consistency.md#1-accepted-content-before-the-first-narrative-revision).
