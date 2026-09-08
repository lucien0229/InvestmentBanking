-- Ticket 18 hardening: bind every material section to an approved disclosure,
-- Evidence, controlled Fact/Assumption basis and an explicit qualification.
ALTER TABLE deliverable.teaser_lineage
  ADD COLUMN IF NOT EXISTS evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fact_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assumption_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS qualification text NOT NULL DEFAULT 'Proposal-only; Banker Review required',
  ADD COLUMN IF NOT EXISTS element_lineage jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION deliverable.create_teaser_deliverable(p_key text,p_digest text,p_body jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE replay jsonb; row deliverable.deliverable%ROWTYPE; objective app.work_objective%ROWTYPE; deal_stage text; stage text;
BEGIN
 PERFORM deliverable.assert_write(); replay:=deliverable.replay('create_teaser_deliverable',p_key,p_digest); IF replay IS NOT NULL THEN RETURN replay; END IF;
 SELECT * INTO objective FROM app.work_objective WHERE id=(p_body->>'work_objective_id')::uuid AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id();
 IF NOT FOUND THEN RAISE EXCEPTION 'artifact_work_objective_required'; END IF;
 SELECT lower(business_stage) INTO deal_stage FROM app.deal WHERE id=app.policy_deal_id() AND account_id=app.policy_account_id();
 stage:=CASE WHEN deal_stage IN ('preparation','in_market','first_round','bid_evaluation','exclusive_execution') THEN 'current_stage_required' ELSE 'not_stage_required' END;
 INSERT INTO deliverable.deliverable(account_id,deal_id,deliverable_type,title,purpose,audience,confidentiality,stage_applicability,owner_id,work_objective_id) VALUES(app.policy_account_id(),app.policy_deal_id(),'teaser_presentation',p_body->>'title',p_body->>'purpose',p_body->>'audience',p_body->>'confidentiality',stage,app.policy_actor_id(),objective.id) RETURNING * INTO row;
 PERFORM app.record_audit('deliverable_created','completed','deliverable',row.id::text,'teaser_presentation',gen_random_uuid()::text);
 RETURN deliverable.remember('create_teaser_deliverable',p_key,p_digest,to_jsonb(row)||jsonb_build_object('stage_basis',deal_stage,'work_objective_id',objective.id));
END $$;

CREATE OR REPLACE FUNCTION deliverable.build_teaser_input(p_deliverable uuid,p_revision uuid,p_draft jsonb,p_limitations jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deliverable,app,pg_catalog AS $$
DECLARE parent deliverable.deliverable%ROWTYPE; section jsonb; ref jsonb; evidence jsonb:=p_draft->'evidence'; basis jsonb:=p_draft->'facts_assumptions'; sections jsonb:=p_draft->'sections'; ceiling jsonb:=p_draft->'output_ceiling';
BEGIN
 SELECT * INTO parent FROM deliverable.deliverable WHERE id=p_deliverable AND deliverable_type='teaser_presentation';
 IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
 IF jsonb_typeof(p_draft)<>'object' OR p_draft->>'task_definition'<>'teaser_content_draft' OR p_draft->>'status'<>'proposal_only' OR jsonb_typeof(p_draft->'approved_disclosure_set')<>'array' OR jsonb_array_length(p_draft->'approved_disclosure_set')<1 OR jsonb_typeof(evidence)<>'array' OR jsonb_array_length(evidence)<1 OR jsonb_typeof(basis)<>'array' OR jsonb_array_length(basis)<1 OR jsonb_typeof(ceiling)<>'object' OR (ceiling->>'max_slides')::integer NOT BETWEEN 1 AND 12 OR jsonb_typeof(sections)<>'array' OR jsonb_array_length(sections)<1 OR jsonb_array_length(sections)+1>(ceiling->>'max_slides')::integer THEN RAISE EXCEPTION 'teaser_content_contract_invalid'; END IF;
 FOR ref IN SELECT value FROM jsonb_array_elements(evidence) LOOP
  IF jsonb_typeof(ref)<>'object' OR ref->>'id' IS NULL OR ref->>'source_record_id' IS NULL THEN RAISE EXCEPTION 'teaser_lineage_required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM knowledge.evidence e WHERE e.id=(ref->>'id')::uuid AND e.account_id=parent.account_id AND e.deal_id=parent.deal_id AND e.source_record_id=(ref->>'source_record_id')::uuid) THEN RAISE EXCEPTION 'teaser_evidence_scope_mismatch'; END IF;
 END LOOP;
 FOR ref IN SELECT value FROM jsonb_array_elements(basis) LOOP
  IF jsonb_typeof(ref)<>'object' OR ref->>'id' IS NULL OR ref->>'kind' NOT IN ('fact','assumption') OR ref->>'status' IS NULL THEN RAISE EXCEPTION 'teaser_controlled_basis_required'; END IF;
  IF ref->>'kind'='fact' AND NOT EXISTS (SELECT 1 FROM knowledge.fact f WHERE f.id=(ref->>'id')::uuid AND f.account_id=parent.account_id AND f.deal_id=parent.deal_id) THEN RAISE EXCEPTION 'teaser_fact_scope_mismatch'; END IF;
  IF ref->>'kind'='assumption' AND NOT EXISTS (SELECT 1 FROM knowledge.assumption a WHERE a.id=(ref->>'id')::uuid AND a.account_id=parent.account_id AND a.deal_id=parent.deal_id) THEN RAISE EXCEPTION 'teaser_assumption_scope_mismatch'; END IF;
 END LOOP;
 FOR section IN SELECT value FROM jsonb_array_elements(sections) LOOP
  IF jsonb_typeof(section)<>'object' OR section->>'section_key' IS NULL OR section->>'title' IS NULL OR section->>'body' IS NULL OR section->>'qualification' IS NULL OR jsonb_typeof(section->'citations')<>'array' OR jsonb_array_length(section->'citations')<1 OR jsonb_typeof(section->'evidence_refs')<>'array' OR jsonb_array_length(section->'evidence_refs')<1 OR jsonb_typeof(section->'source_refs')<>'array' OR jsonb_array_length(section->'source_refs')<1 THEN RAISE EXCEPTION 'teaser_citation_required'; END IF;
  FOR ref IN SELECT value FROM jsonb_array_elements(section->'citations') LOOP
   IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_draft->'approved_disclosure_set') d WHERE d#>>'{}'=ref#>>'{}') THEN RAISE EXCEPTION 'teaser_citation_not_approved'; END IF;
  END LOOP;
  FOR ref IN SELECT value FROM jsonb_array_elements(section->'evidence_refs') LOOP
   IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(evidence) e WHERE e->>'id'=ref#>>'{}') THEN RAISE EXCEPTION 'teaser_lineage_required'; END IF;
  END LOOP;
  FOR ref IN SELECT value FROM jsonb_array_elements(section->'fact_refs') LOOP
   IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(basis) e WHERE e->>'id'=ref#>>'{}' AND e->>'kind'='fact') THEN RAISE EXCEPTION 'teaser_controlled_basis_required'; END IF;
  END LOOP;
  FOR ref IN SELECT value FROM jsonb_array_elements(section->'assumption_refs') LOOP
   IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(basis) e WHERE e->>'id'=ref#>>'{}' AND e->>'kind'='assumption') THEN RAISE EXCEPTION 'teaser_controlled_basis_required'; END IF;
  END LOOP;
 END LOOP;
 RETURN jsonb_build_object('schema_version','1.0.0','task_definition','teaser_content_draft','status','proposal_only','revision_id',p_revision,'deliverable_id',parent.id,'deal_id',parent.deal_id,'template_version','teaser-1.0.0','purpose',parent.purpose,'audience',parent.audience,'confidentiality',parent.confidentiality,'evaluation_time',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'limitations',coalesce(p_limitations,'[]'::jsonb),'approved_disclosure_set',p_draft->'approved_disclosure_set','evidence',evidence,'facts_assumptions',basis,'output_ceiling',ceiling,'content_draft',p_draft);
END $$;

CREATE OR REPLACE FUNCTION deliverable.create_teaser_revision(p_parent uuid,p_expected_version bigint,p_key text,p_digest text,p_draft jsonb,p_limitations jsonb,p_release text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE parent deliverable.deliverable%ROWTYPE; objective app.work_objective%ROWTYPE; revision uuid:=gen_random_uuid(); job uuid:=gen_random_uuid(); input jsonb; ordinal integer; workspace record;
BEGIN
 PERFORM deliverable.assert_write(); PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':',app.policy_account_id(),app.policy_deal_id(),p_parent,'teaser_revision'),0));
 SELECT * INTO parent FROM deliverable.deliverable WHERE id=p_parent AND deliverable_type='teaser_presentation' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
 IF parent.row_version<>p_expected_version THEN RAISE EXCEPTION 'artifact_version_conflict'; END IF;
 IF parent.stage_applicability='not_stage_required' THEN RETURN jsonb_build_object('state','not_stage_required','deliverable_id',parent.id,'row_version',parent.row_version,'idempotent_replayed',false); END IF;
 IF deliverable.replay('create_teaser_revision',p_key,p_digest) IS NOT NULL THEN RETURN deliverable.replay('create_teaser_revision',p_key,p_digest); END IF;
 SELECT * INTO objective FROM app.work_objective WHERE id=parent.work_objective_id AND account_id=parent.account_id AND deal_id=parent.deal_id; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_work_objective_required'; END IF;
 PERFORM source.get_packet_worker_input(parent.account_id,parent.deal_id,objective.packet_version_id,objective.id,'native_artifact'); PERFORM source.get_packet_worker_input(parent.account_id,parent.deal_id,objective.packet_version_id,objective.id,'reader_copy');
 input:=deliverable.build_teaser_input(parent.id,revision,p_draft,p_limitations)||jsonb_build_object('work_objective_id',objective.id,'packet_version_id',objective.packet_version_id); SELECT coalesce(max(r.ordinal),0)+1 INTO ordinal FROM deliverable.deliverable_revision r WHERE deliverable_id=parent.id;
 INSERT INTO deliverable.deliverable_revision(id,account_id,deal_id,deliverable_id,ordinal,predecessor_id,purpose,audience,confidentiality,template_version,build_input,basis_digest,created_by,work_objective_id,packet_version_id) VALUES(revision,parent.account_id,parent.deal_id,parent.id,ordinal,parent.current_revision_id,parent.purpose,parent.audience,parent.confidentiality,'teaser-1.0.0',input,encode(extensions.digest(input::text,'sha256'),'hex'),app.policy_actor_id(),objective.id,objective.packet_version_id);
 INSERT INTO deliverable.teaser_lineage(account_id,deal_id,revision_id,section_key,claim_key,citation_refs,source_refs,native_locator,reader_locator,evidence_refs,fact_refs,assumption_refs,qualification,element_lineage)
   SELECT parent.account_id,parent.deal_id,revision,s->>'section_key',coalesce(s->>'claim_key',s->>'section_key'),s->'citations',s->'source_refs',jsonb_build_object('slide',row_number() OVER ()+1),jsonb_build_object('page',row_number() OVER ()+1),s->'evidence_refs',coalesce(s->'fact_refs','[]'::jsonb),coalesce(s->'assumption_refs','[]'::jsonb),s->>'qualification',jsonb_build_object('section',s->>'section_key','claim',coalesce(s->>'claim_key',s->>'section_key'),'table',CASE WHEN s ? 'table_rows' THEN jsonb_build_object('rows',jsonb_array_length(s->'table_rows')) ELSE NULL END,'chart',CASE WHEN s ? 'chart' THEN jsonb_build_object('series',s->'chart'->>'series_name') ELSE NULL END) FROM jsonb_array_elements(input->'content_draft'->'sections') s;
 SELECT w.posture_version,a.security_epoch INTO workspace FROM app.deal_workspace w JOIN app.account a ON a.id=w.account_id WHERE w.deal_id=parent.deal_id AND w.account_id=parent.account_id;
 INSERT INTO jobs.job(id,account_id,deal_id,actor_id,command_type,purpose_code,accepted_inputs,input_digest,input_version,workflow_version,release_id,allowance_class,allowance_quantity,allowance_posture,workspace_posture_version,security_epoch,state) VALUES(job,parent.account_id,parent.deal_id,app.policy_actor_id(),'teaser_presentation_build','teaser_presentation_build',jsonb_build_object('revision_id',revision),encode(extensions.digest(input::text,'sha256'),'hex'),'1.0.0','teaser-1.0.0',p_release,'teaser_presentation_build',1,'reserved',workspace.posture_version,workspace.security_epoch,'queued');
 INSERT INTO deliverable.workbook_job(job_id,account_id,deal_id,revision_id,input) VALUES(job,parent.account_id,parent.deal_id,revision,input); UPDATE deliverable.deliverable SET current_revision_id=revision,row_version=row_version+1 WHERE id=parent.id;
 RETURN deliverable.remember('create_teaser_revision',p_key,p_digest,jsonb_build_object('id',job,'job_type','teaser_presentation_build','state','queued','revision_id',revision,'deliverable_id',parent.id,'row_version',parent.row_version+1));
END $$;
