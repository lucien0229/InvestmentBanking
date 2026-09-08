import crypto from "node:crypto";
import type pg from "pg";
import type { FastifyInstance } from "fastify";
import assert from "node:assert/strict";
import { encryptProtected } from "../../apps/api/src/sources.js";
import { sha256 } from "../../apps/api/src/artifact-integrity.js";

/** Synthetic predecessor fixture only. This does not attest a source-intake, provider-auth or payment workflow. */
export async function prepareWorkbookObjective(
  owner: pg.Pool,
  api: FastifyInstance,
  account: string,
  actor: string,
  deal: string,
  cookie: string,
) {
  const sources: string[] = [];
  for (const fixtureName of ["Valuation basis", "Cash and debt statement"]) {
    const source = crypto.randomUUID(),
      material = crypto.randomUUID(),
      session = crypto.randomUUID(),
      upload = crypto.randomUUID(),
      object = crypto.randomUUID(),
      coverage = crypto.randomUUID(),
      representation = crypto.randomUUID();
    const text =
      `${fixtureName} — synthetic predecessor context\n` +
      "Metric,Value\nEnterprise value,100.0\nCash,4.7\nDebt,10.0\nNote,Synthetic development fixture; values require separate Banker assumption Decisions.\n";
    const bytes = Buffer.from(text);
    const digest = sha256(bytes);
    const encrypted = await encryptProtected(bytes, "text/csv", object);
    const client = await owner.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE app.deal_workspace SET paid_preflight_status='pass',output_ceiling='supported_internal_processing',processing_posture='permitted',commercial_posture='entitled' WHERE account_id=$1 AND deal_id=$2`,
        [account, deal],
      );
      await client.query(
        `INSERT INTO source.upload_session(id,account_id,deal_id,actor_id,purpose_code,batch_id,consent_digest,max_files,max_total_bytes,status_code,expires_at) VALUES($1,$2,$3,$4,'source_intake',$1,$5,1,10000,'finalized',now()+interval '1 hour')`,
        [session, account, deal, actor, "sha256:" + digest],
      );
      await client.query(
        `INSERT INTO source.source_material(id,account_id,deal_id,stable_name,origin_code) VALUES($1,$2,$3,'Synthetic CSV predecessor fixture','client_supplied')`,
        [material, account, deal],
      );
      await client.query(
        `INSERT INTO source.quarantined_upload(id,account_id,deal_id,actor_id,upload_session_id,client_file_id,display_name,quarantine_storage_key,declared_media_type,declared_byte_length,source_declaration,rights_posture_inputs,confidentiality_posture,processing_posture,source_material_id,status_code,expires_at) VALUES($1,$2,$3,$4,$5,'fixture','Synthetic basis.csv',$6,'text/csv',$7,'{}','{}','{}','{}',$8,'accepted',now()+interval '1 hour')`,
        [
          upload,
          account,
          deal,
          actor,
          session,
          "fixture/" + upload,
          bytes.length,
          material,
        ],
      );
      await client.query(
        `INSERT INTO source.source_record(id,account_id,deal_id,source_material_id,version_ordinal,version_label,origin_code,acquisition_method,authority_basis,provenance_class,confidentiality_class,de_identification_posture,rights_posture,rights_basis,content_sha256,byte_length,media_type,record_date,received_at,accepted_at,native_locator_profile_code,native_locator_profile_version,provenance_receipt,accepted_upload_id) VALUES($1,$2,$3,$4,1,'fixture-1','client_supplied','synthetic_fixture','synthetic_test_scope','synthetic','internal','not_applicable','internal_use_only','{"receipt_permitted":true}',$5,$6,'text/csv',current_date,now(),now(),'csv_row','1.0.0','{"synthetic":true,"source_intake_workflow_verified":false}',$7)`,
        [source, account, deal, material, digest, bytes.length, upload],
      );
      await client.query(
        `INSERT INTO object_store.protected_object(id,account_id,deal_id,storage_key,plaintext_sha256,ciphertext_sha256,byte_length,media_type,envelope_version,kms_key_version,wrapped_dek) VALUES($1,$2,$3,$4,$5,$6,$7,'text/csv',$8,$9,$10)`,
        [
          object,
          account,
          deal,
          encrypted.storageKey,
          digest,
          encrypted.ciphertextSha256,
          bytes.length,
          encrypted.envelopeVersion,
          encrypted.kmsKeyVersion,
          encrypted.wrappedDek,
        ],
      );
      await client.query(
        `INSERT INTO source.accepted_source_object(account_id,deal_id,source_record_id,protected_object_id) VALUES($1,$2,$3,$4)`,
        [account, deal, source, object],
      );
      await client.query(
        `INSERT INTO source.processing_coverage(id,account_id,deal_id,source_record_id,coverage_code,parser_identity,coverage_payload) VALUES($1,$2,$3,$4,'parsed','synthetic-fixture-csv-1.0.0','{"substantive_parsing":true,"parse_status":"passed","synthetic_predecessor_fixture":true}')`,
        [coverage, account, deal, source],
      );
      await client.query(
        `INSERT INTO source.source_representation(id,account_id,deal_id,source_record_id,protected_object_id,content_sha256,parser_identity,processing_coverage_id) VALUES($1,$2,$3,$4,$5,$6,'synthetic-fixture-csv-1.0.0',$7)`,
        [representation, account, deal, source, object, digest, coverage],
      );
      for (const [row, content] of text.trim().split("\n").entries())
        await client.query(
          `INSERT INTO source.source_fragment(account_id,deal_id,source_record_id,representation_id,locator,content_text,content_sha256) VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [
            account,
            deal,
            source,
            representation,
            { kind: "csv_row", row: row + 1 },
            content,
            "sha256:" + sha256(content),
          ],
        );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    sources.push(source);
  }
  const post = async (path: string, body: unknown, etag?: string) => {
    const r = await api.inject({
      method: "POST",
      url: `/api/v1/deals/${deal}/${path}`,
      headers: {
        cookie,
        "idempotency-key": crypto.randomUUID(),
        ...(etag ? { "if-match": etag } : {}),
      },
      payload: body as never,
    });
    assert.ok(r.statusCode === 201 || r.statusCode === 202, r.body);
    return r;
  };
  for (const source of sources) {
    const rights = await post("rights-assessments", {
      source_record_id: source,
      purpose: "internal_deal_execution",
      rights: "allowed",
      permitted_operations: [
        "deterministic_analysis",
        "native_artifact",
        "reader_copy",
        "ai_processing",
      ],
      conditions: [],
      basis: {
        evidence: "Synthetic fixture rights under the development test scope",
      },
    });
    assert.ok(rights.json().data);
  }
  const packet = await post("source-packets", {
    name: "Synthetic workbook source perimeter",
    purpose_code: "internal_deal_execution",
  });
  const version = await post(
    `source-packets/${packet.json().data.id}/versions`,
    {
      purpose_code: "internal_deal_execution",
      scope_statement:
        "Synthetic valuation basis for exact artifact acceptance",
      change_reason: "Workbook development acceptance",
      selected_source_records: sources.map((source) => ({
        source_record_id: source,
        reason: "Disclosed synthetic CSV basis",
      })),
      declared_exclusions: [],
    },
    String(packet.headers.etag),
  );
  const objective = await post("work-objectives", {
    packet_version_id: version.json().data.id,
    objective_type: "deliverable",
    purpose: "internal_deal_execution",
    objective_text: "Inspect the exact Analysis and Valuation Workbook",
    intended_use: "internal_analysis",
    intended_audience: "Named Individual Banker",
    requested_scope:
      "Native XLSX, Reader PDF, independent QC and proposal-only commentary",
  });
  return {
    id: objective.json().data.id as string,
    packet_version_id: version.json().data.id as string,
    source_record_id: sources[0]!,
  };
}
