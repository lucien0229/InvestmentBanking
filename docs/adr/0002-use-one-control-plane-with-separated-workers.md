# Use one control plane with separated workers

V1 uses one modular product control plane with separated background worker processes rather than a network of product microservices. The control plane owns authenticated commands, business invariants, authoritative state, entitlements, and user-visible Job state; workers perform bounded parsing, AI, deterministic calculation, artifact, rendering, comparison, export, and evaluation work through durable contracts. This preserves transactional control and operability while isolating long-running and untrusted processing.
