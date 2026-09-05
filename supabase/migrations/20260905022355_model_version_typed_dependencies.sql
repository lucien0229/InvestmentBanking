-- Materialize the typed Model dependencies required by artifact lineage.
CREATE FUNCTION analysis.materialize_model_dependencies() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 INSERT INTO analysis.model_version_calculation(account_id,deal_id,model_version_id,calculation_version_id)
 SELECT NEW.account_id,NEW.deal_id,NEW.id,c.id FROM unnest(NEW.calculation_version_ids) x(id) JOIN analysis.calculation_version c ON c.id=x.id AND c.account_id=NEW.account_id AND c.deal_id=NEW.deal_id;
 IF (SELECT count(*) FROM analysis.model_version_calculation WHERE model_version_id=NEW.id)<>cardinality(NEW.calculation_version_ids) THEN RAISE EXCEPTION 'cross_deal_dependency'; END IF;
 INSERT INTO analysis.model_version_fact(account_id,deal_id,model_version_id,fact_id) SELECT NEW.account_id,NEW.deal_id,NEW.id,f.id FROM unnest(NEW.fact_ids) x(id) JOIN knowledge.fact f ON f.id=x.id AND f.account_id=NEW.account_id AND f.deal_id=NEW.deal_id;
 IF (SELECT count(*) FROM analysis.model_version_fact WHERE model_version_id=NEW.id)<>cardinality(NEW.fact_ids) THEN RAISE EXCEPTION 'cross_deal_dependency'; END IF;
 INSERT INTO analysis.model_version_assumption(account_id,deal_id,model_version_id,assumption_id) SELECT NEW.account_id,NEW.deal_id,NEW.id,a.id FROM unnest(NEW.assumption_ids) x(id) JOIN knowledge.assumption a ON a.id=x.id AND a.account_id=NEW.account_id AND a.deal_id=NEW.deal_id;
 IF (SELECT count(*) FROM analysis.model_version_assumption WHERE model_version_id=NEW.id)<>cardinality(NEW.assumption_ids) THEN RAISE EXCEPTION 'cross_deal_dependency'; END IF;
 RETURN NEW;
END $$;
GRANT CREATE ON SCHEMA analysis TO app_analysis_owner;
ALTER FUNCTION analysis.materialize_model_dependencies() OWNER TO app_analysis_owner;
REVOKE CREATE ON SCHEMA analysis FROM app_analysis_owner;
REVOKE ALL ON FUNCTION analysis.materialize_model_dependencies() FROM PUBLIC;
CREATE TRIGGER model_version_materialize_dependencies AFTER INSERT ON analysis.model_version FOR EACH ROW EXECUTE FUNCTION analysis.materialize_model_dependencies();
-- Deterministic materialization of previously accepted exact IDs; no values or versions are rewritten.
INSERT INTO analysis.model_version_calculation(account_id,deal_id,model_version_id,calculation_version_id) SELECT m.account_id,m.deal_id,m.id,c.id FROM analysis.model_version m CROSS JOIN LATERAL unnest(m.calculation_version_ids) x(id) JOIN analysis.calculation_version c ON c.id=x.id AND c.account_id=m.account_id AND c.deal_id=m.deal_id ON CONFLICT DO NOTHING;
INSERT INTO analysis.model_version_fact(account_id,deal_id,model_version_id,fact_id) SELECT m.account_id,m.deal_id,m.id,f.id FROM analysis.model_version m CROSS JOIN LATERAL unnest(m.fact_ids) x(id) JOIN knowledge.fact f ON f.id=x.id AND f.account_id=m.account_id AND f.deal_id=m.deal_id ON CONFLICT DO NOTHING;
INSERT INTO analysis.model_version_assumption(account_id,deal_id,model_version_id,assumption_id) SELECT m.account_id,m.deal_id,m.id,a.id FROM analysis.model_version m CROSS JOIN LATERAL unnest(m.assumption_ids) x(id) JOIN knowledge.assumption a ON a.id=x.id AND a.account_id=m.account_id AND a.deal_id=m.deal_id ON CONFLICT DO NOTHING;
