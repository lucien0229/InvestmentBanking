# Domain migration baseline

**Status: integrated on `main`; development compatibility rollout pending**

This file defines the development-database baseline for the product after the
implementation is reorganized by business domain. Delivery Tickets remain
traceability references in historical evidence, but they are not migration,
database-object, runtime, or module boundaries.

## Migration order

The existing dependency order is retained so the baseline can be rebuilt
without changing table semantics while the implementation is de-ticketized:

1. `20260830000000_reference_deal.sql` — reference data and Deal foundations
2. `20260830010000_supabase_identity.sql` — Identity and Account foundations
3. `20260830020000_commerce_entitlement.sql` — Commerce and entitlements
4. `20260830030000_durable_reference_job.sql` — Jobs and durable execution
5. `20260830040000_deal_setup_paid_preflight.sql` — Deal Lifecycle and Paid Preflight
6. `20260830050000_protected_source_intake.sql` — Source Intake and protected objects
7. `20260830060000_web_evidence_account_templates.sql` — Web Evidence and Account Templates
8. `20260830070000_source_packet_output_ceiling.sql` — Source Packets and output ceilings
9. `20260830080000_source_packet_projection_guard.sql` — Source Packet projection guards
10. `20260830090000_source_condition_selection_guard.sql` — Source condition and selection guards
11. `20260830100000_source_reliance_assessment.sql` — Source reliance assessment
12. `20260830110000_source_packet_version_projection_guard.sql` — Packet version projection guards
13. `20260830120000_source_packet_command_idempotency.sql` — Packet command idempotency
14. `20260830130000_source_condition_reliance_guard.sql` — Condition/reliance integrity guards
15. `20260830140000_source_packet_preflight_cap.sql` — Packet preflight and output caps
16. `20260830150000_source_packet_idempotency_retention.sql` — Command retention
17. `20260903000000_domainize_source_command_objects.sql` — Forward-only command-object domain rename

The first sixteen files are immutable history and must not be edited after
they have been recorded in a migration ledger. The seventeenth migration
renames the already-created Ticket 08 command table/functions/policy to their
domain names on both existing and fresh databases.

## Object naming changes

- `source.source_packet_command_idempotency` becomes
  `source.packet_command_idempotency`.
- `source.ticket08_command_replay(...)` becomes
  `source.packet_command_replay(...)`.
- `source.ticket08_command_record(...)` becomes
  `source.packet_command_record(...)`.
- Ticket-labelled RLS policies are renamed to the domain they protect (for
  example, `account_template_upload_scope`,
  `web_evidence_observation_scope`, and `deal_template_selection_scope`).
- Lock keys, parser identities, and version identifiers use domain names such
  as `deal-active-capacity`, `source-safety-scanner-v1`, and
  `public-web-evidence-v1`.

## Rebuild acceptance checks

After the development database is cleared and rebuilt, validation must show:

- every product table remains forced-RLS and has an owner-safe access path;
- no current database function, policy, or table contains a Ticket-shaped
  identifier (immutable historical migration SQL may retain legacy names);
- packet command replay/record calls and idempotency rows use the renamed
  `packet_*` objects;
- the migration ledger contains the 16 immutable historical files followed by
  `20260903000000_domainize_source_command_objects.sql`; and
- application, HTTP, and contract tests address product capabilities and
  domains rather than delivery-ticket names.

## Development application evidence

On 2026-09-02 the development Supabase branch was cleared and rebuilt from
the first 16 files. The migration ledger contains those versions; the new
forward-only compatibility migration is integrated on `main` and still needs
to run through the development migration gate before this domain rename is
claimed as deployed evidence.
80 product tables were recreated, all with forced RLS, and the rebuilt product
schemas contain no table, function, or policy whose name contains `ticket`.
The only expected row after the rebuild is the durable-worker principal
`app.runtime_principal(reference_worker)`; application and test data were
intentionally not reseeded.

The managed Supabase migration role cannot alter the `SUPERUSER` attribute of
an existing role. The baseline therefore leaves that attribute untouched while
enforcing `NOLOGIN`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`, and
`NOBYPASSRLS`/`BYPASSRLS` as appropriate for each product role.
