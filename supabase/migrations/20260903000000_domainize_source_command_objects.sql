-- Forward-only domain rename for the Ticket 08 command-replay objects.
-- Earlier migration files are immutable once recorded in a migration ledger;
-- this migration moves existing development databases without rewriting that
-- history. Fresh databases follow the same path after the original objects
-- are created by 20260830120000/20260830150000.

DO $$
BEGIN
  IF to_regclass('source.source_packet_command_idempotency') IS NOT NULL
     AND to_regclass('source.packet_command_idempotency') IS NULL THEN
    ALTER TABLE source.source_packet_command_idempotency RENAME TO packet_command_idempotency;
  END IF;

  IF to_regprocedure('source.ticket08_command_replay(uuid,uuid,uuid,text,text,text)') IS NOT NULL
     AND to_regprocedure('source.packet_command_replay(uuid,uuid,uuid,text,text,text)') IS NULL THEN
    ALTER FUNCTION source.ticket08_command_replay(uuid,uuid,uuid,text,text,text) RENAME TO packet_command_replay;
  END IF;

  IF to_regprocedure('source.ticket08_command_record(uuid,uuid,uuid,text,text,text,jsonb,integer)') IS NOT NULL
     AND to_regprocedure('source.packet_command_record(uuid,uuid,uuid,text,text,text,jsonb,integer)') IS NULL THEN
    ALTER FUNCTION source.ticket08_command_record(uuid,uuid,uuid,text,text,text,jsonb,integer) RENAME TO packet_command_record;
  END IF;

  -- PL/pgSQL stores relation names in its function body text. Recompile the
  -- renamed functions so their first invocation resolves the new table name
  -- rather than the legacy relation that was renamed above.
  IF to_regprocedure('source.packet_command_replay(uuid,uuid,uuid,text,text,text)') IS NOT NULL THEN
    EXECUTE replace(
      pg_get_functiondef('source.packet_command_replay(uuid,uuid,uuid,text,text,text)'::regprocedure),
      'source.source_packet_command_idempotency',
      'source.packet_command_idempotency'
    );
  END IF;
  IF to_regprocedure('source.packet_command_record(uuid,uuid,uuid,text,text,text,jsonb,integer)') IS NOT NULL THEN
    EXECUTE replace(
      pg_get_functiondef('source.packet_command_record(uuid,uuid,uuid,text,text,text,jsonb,integer)'::regprocedure),
      'source.source_packet_command_idempotency',
      'source.packet_command_idempotency'
    );
  END IF;

  IF to_regclass('source.packet_command_idempotency') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polrelid = 'source.packet_command_idempotency'::regclass
         AND polname = 'source_packet_command_idempotency_scope'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polrelid = 'source.packet_command_idempotency'::regclass
         AND polname = 'packet_command_idempotency_scope'
     ) THEN
    ALTER POLICY source_packet_command_idempotency_scope
      ON source.packet_command_idempotency
      RENAME TO packet_command_idempotency_scope;
  END IF;
END
$$;
