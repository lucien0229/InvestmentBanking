# Store current state with append-only material history

V1 stores authoritative current state directly in a transactional relational system and does not use full event sourcing. Source Records, Process Events, material object versions, Human Decisions, Deliverable Revisions, Impact Assessments, QC runs, External-Use Decisions, entitlement mutations, exports, and deletion events retain append-only history so the system can reconstruct material changes without imposing event-sourced read-model and migration complexity on every module.
