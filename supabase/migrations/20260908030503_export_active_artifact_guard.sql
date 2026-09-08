CREATE OR REPLACE FUNCTION external_use.export_scope(p_revision uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE basis jsonb; r deliverable.deliverable_revision%ROWTYPE; hard jsonb:='[]'; rights jsonb; checks jsonb; result jsonb;
BEGIN
 basis:=external_use.loop_basis(p_revision);
 SELECT * INTO r FROM deliverable.deliverable_revision WHERE id=p_revision;
 IF (SELECT count(*) FROM deliverable.artifact WHERE revision_id=r.id AND role IN ('native','reader'))<>2 THEN hard:=hard||'[{"code":"native_reader_pair_required","recovery":"Complete the exact Workbook build"}]';END IF;
 IF (SELECT count(*) FROM deliverable.artifact a JOIN object_store.protected_object o ON o.id=a.protected_object_id AND o.account_id=r.account_id AND o.deal_id=r.deal_id AND o.lifecycle_status='active' WHERE a.revision_id=r.id AND a.role IN ('native','reader'))<>2 THEN
  hard:=hard||'[{"code":"exact_artifact_unavailable","recovery":"Restore an active exact Native and Reader pair before export"}]';END IF;
 IF basis->'manifest'='null'::jsonb THEN hard:=hard||'[{"code":"signed_manifest_required","recovery":"Complete exact manifest signing"}]';END IF;
 IF jsonb_array_length(basis->'lineage')=0 OR jsonb_array_length(basis->'decisions')=0 THEN hard:=hard||'[{"code":"required_control_records_missing","recovery":"Restore exact lineage and controlling Decisions"}]';END IF;
 SELECT q.checks INTO checks FROM deliverable.qc_run q WHERE revision_id=r.id ORDER BY created_at DESC,id DESC LIMIT 1;
 IF EXISTS(SELECT 1 FROM (VALUES('native_structure'),('recalculation'),('lineage'),('native_reader_parity'),('signed_manifest')) required(code)
  WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(checks,'[]')) c WHERE c->>'code'=required.code AND c->>'outcome'='passed')) THEN
  hard:=hard||'[{"code":"artifact_integrity_unverified","recovery":"Run QC against the exact stored Native, Reader and manifest"}]';
 END IF;
 IF EXISTS(SELECT 1 FROM deliverable.qc_finding f WHERE revision_id=r.id AND severity='critical'
  AND finding_code IN ('native_structure','recalculation','lineage','native_reader_parity','signed_manifest')
  AND NOT EXISTS(SELECT 1 FROM deliverable.finding_retest t WHERE t.finding_id=f.id AND t.outcome='passed')) THEN
  hard:=hard||'[{"code":"artifact_integrity_failed","recovery":"Repair the failed file or exact control record and retest"}]';END IF;
 IF r.packet_version_id IS NULL OR r.work_objective_id IS NULL THEN hard:=hard||'[{"code":"exact_packet_required","recovery":"Bind the exact Source Packet and Work Objective"}]';
 ELSE
  rights:=source.packet_blockers(r.account_id,r.deal_id,r.packet_version_id,(SELECT purpose_code FROM source.source_packet_version WHERE id=r.packet_version_id));
  hard:=hard||coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(rights) x WHERE x->>'code' IN ('rights_blocked','rights_unassessed','withdrawn_source')),'[]');
  IF EXISTS(SELECT 1 FROM source.source_rights_current_selection cs JOIN source.source_rights_posture_assessment ra ON ra.id=cs.assessment_id
   JOIN source.source_packet_member m ON m.source_record_id=cs.source_record_id
   WHERE m.packet_version_id=r.packet_version_id AND cs.purpose_code=(SELECT purpose_code FROM source.source_packet_version WHERE id=r.packet_version_id)
   AND ra.rights_code='limited' AND NOT(ra.permitted_operations ? 'internal_controlled_export')) THEN hard:=hard||'[{"code":"rights_limit_export","recovery":"Obtain a permitted internal export basis"}]';END IF;
 END IF;
 IF r.confidentiality IN ('confidential','restricted') THEN hard:=hard||'[{"code":"confidential_export_not_enabled","recovery":"Use the configured supported synthetic development scope"}]';END IF;
 IF EXISTS(SELECT 1 FROM deliverable.artifact a JOIN object_store.protected_object o ON o.id=a.protected_object_id WHERE a.revision_id=r.id AND (o.deal_id<>r.deal_id OR o.account_id<>r.account_id)) THEN RAISE EXCEPTION 'export_scope_unavailable';END IF;
 result:=basis||jsonb_build_object('schema_version','internal-controlled-export-1.0.0','hard_blockers',hard,
  'source_records',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'content_sha256',s.content_sha256,'rights_posture',s.rights_posture,'rights_basis',s.rights_basis,'confidentiality_class',s.confidentiality_class,'disposition_code',s.disposition_code,'limitations',s.limitations) ORDER BY s.id),'[]') FROM source.source_record s WHERE s.id IN (SELECT (x->>'source_record_id')::uuid FROM jsonb_array_elements(basis->'lineage') x WHERE x->>'source_record_id' IS NOT NULL)),
  'exclusions','[{"scope":"original_source_bytes","reason":"Only source identity, permitted citation context and lineage are included"},{"scope":"ai_provider_payloads","reason":"Raw prompts, provider requests and responses are excluded"},{"scope":"other_revisions_and_deliverables","reason":"Outside the exact reviewed Revision"},{"scope":"external_use_authority","reason":"No External-Use Decision, Delivery, Recipient Access or Actual Use is created"}]'::jsonb,
  'security_epoch',(SELECT security_epoch FROM app.account WHERE id=app.policy_account_id()),
  'posture_version',(SELECT posture_version FROM app.deal_workspace WHERE deal_id=app.policy_deal_id()),
  'external_use_authorized',false);
 RETURN result;
END $$;

