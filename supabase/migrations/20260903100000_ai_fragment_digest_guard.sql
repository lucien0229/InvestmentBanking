GRANT USAGE ON SCHEMA extensions TO app_ai_owner;
GRANT EXECUTE ON FUNCTION extensions.digest(text,text) TO app_ai_owner;

CREATE OR REPLACE FUNCTION source.validate_fragment_digest()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.content_sha256 IS DISTINCT FROM 'sha256:' || encode(extensions.digest(NEW.content_text, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'ai_fragment_digest_mismatch' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ai_fragment_digest_guard ON source.source_fragment;
CREATE TRIGGER ai_fragment_digest_guard
  BEFORE INSERT OR UPDATE ON source.source_fragment
  FOR EACH ROW EXECUTE FUNCTION source.validate_fragment_digest();
GRANT CREATE ON SCHEMA source TO app_ai_owner;
ALTER FUNCTION source.validate_fragment_digest() OWNER TO app_ai_owner;
REVOKE CREATE ON SCHEMA source FROM app_ai_owner;
