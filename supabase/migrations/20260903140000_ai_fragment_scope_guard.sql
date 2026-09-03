CREATE OR REPLACE FUNCTION source.validate_fragment_scope()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, pg_catalog AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source.source_representation r
     WHERE r.id=NEW.representation_id
       AND r.account_id=NEW.account_id
       AND r.deal_id=NEW.deal_id
       AND r.source_record_id=NEW.source_record_id
  ) THEN
    RAISE EXCEPTION 'ai_fragment_scope_mismatch' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ai_fragment_scope_guard ON source.source_fragment;
CREATE TRIGGER ai_fragment_scope_guard
  BEFORE INSERT OR UPDATE ON source.source_fragment
  FOR EACH ROW EXECUTE FUNCTION source.validate_fragment_scope();
ALTER FUNCTION source.validate_fragment_scope() OWNER TO app_ai_owner;
