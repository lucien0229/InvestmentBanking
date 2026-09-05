-- Bootstrap-only compatibility guard ordered before the immutable financial migration.
-- Fix its malformed insert digests without changing previously applied SQL bytes.
-- Existing databases apply this additive guard with the reviewed --include-all rollout.
CREATE OR REPLACE FUNCTION ai.guard_financial_prompt_insert() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF NEW.task_definition='financial_semantic_extraction' AND NEW.package_version='1.0.0' THEN
    NEW.prompt_digest:='sha256:3dc7dbc3328f1296a4f68d90853dd1ef92d7ffb9d851c6ce2c4c1ac84401ecbc';
    NEW.input_schema_digest:='sha256:1254c77744a740462846d88de9f16c4116d053d0cf96f337af93fcbca792c16d';
    NEW.output_schema_digest:='sha256:48e6518d178d073f356c0417e804c708c370251628934a5a182663740f3e56a8';
  END IF;
  IF NEW.task_definition='financial_normalization_mapping' AND NEW.package_version='1.0.0' THEN
    NEW.prompt_digest:='sha256:7f7d4f5589e9d61ab7ab9504af4d34e7d9ded53d0be9ec67db691d01af60789d';
    NEW.input_schema_digest:='sha256:4e00b023062b4d2f272feba925d9cf9748541da80f8094253e7cce46f87a3629';
    NEW.output_schema_digest:='sha256:4eb7a9debfd7cb78fce55af6f33640b273bfdf4c452dd908e2dd13d62c351afc';
  END IF;
  IF NEW.task_definition='sell_side_analysis_draft' AND NEW.package_version='1.0.0' THEN
    NEW.prompt_digest:='sha256:4b94eed0379c92bacf8fa9241ea464d77403f4da9a67a49cf344e2a3bf8c848b';
    NEW.input_schema_digest:='sha256:6894879ed5b741961147c8c41036e9f3f081933c0860ca797e3df176cdb828d5';
    NEW.output_schema_digest:='sha256:a279dfd712ceec65b102585c66763fae882a4d0fbed2d7298db09d5128f1e29f';
  END IF;
  IF NEW.task_definition='valuation_commentary_draft' AND NEW.package_version='1.0.0' THEN
    NEW.prompt_digest:='sha256:ba5b3e005c147aa746c2f45125bd7c8c9b1b900fe6ef1c82bd9eda141841c0f4';
    NEW.input_schema_digest:='sha256:060db85761046f677e1126e0e99349749d585e78417737e963ecf6d2203e0ae2';
    NEW.output_schema_digest:='sha256:29a8db4c1139b87e77b19ddcccfcc6ec27ec95881021b7ec123eca979eb9a91e';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION ai.guard_financial_prompt_insert() FROM PUBLIC;
CREATE TRIGGER financial_prompt_insert_guard BEFORE INSERT ON ai.prompt_package FOR EACH ROW EXECUTE FUNCTION ai.guard_financial_prompt_insert();
