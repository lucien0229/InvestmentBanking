import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type pg from "pg";
import { z } from "zod";
import { Database } from "./database.js";
import { canonicalDigest } from "./commerce.js";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { decryptProtected, protectedPath } from "./sources.js";
import { sha256 } from "./artifact-integrity.js";

const uuid = z.string().uuid();
type Dependencies = {
  requireBanker: (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<string | null>;
  commandKey: (request: FastifyRequest, reply: FastifyReply) => string | null;
};
const text = z.string().trim().min(1).max(240);
export const deliverableBody = z
  .object({
    work_objective_id: uuid,
    title: text,
    purpose: text,
    audience: text,
    confidentiality: z.enum([
      "public",
      "internal",
      "confidential",
      "restricted",
    ]),
  })
  .strict();
export const revisionBody = z
  .object({
    basis: z
      .array(
        z
          .object({
            calculation_run_id: uuid,
            model_version_id: uuid,
            scenario_version_id: uuid,
          })
          .strict(),
      )
      .min(1)
      .max(24),
    limitations: z.array(z.string().min(1).max(500)).max(20),
  })
  .strict();
export const reviewBody = z
  .object({
    revision_id: uuid,
    purpose: text,
    audience: text,
    scope: z.string().min(1).max(1000),
    standard: z.enum([
      "method_review",
      "review_scope",
      "rights_confidentiality",
      "professional_suitability",
      "office_roundtrip",
      "native_reader_parity",
    ]),
    conclusion: z.enum(["passed", "failed", "limited"]),
    rationale: z.string().min(20).max(4000),
    limitations: z.array(z.string().min(1).max(500)).max(20),
    evidence: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
function problem(
  reply: FastifyReply,
  status: number,
  code: string,
  url: string,
) {
  return reply
    .code(status)
    .type("application/problem+json")
    .send({
      type: `https://investment-banking.local/problems/${code.replaceAll("_", "-")}`,
      title: code.replaceAll("_", " "),
      status,
      code,
      detail: code.replaceAll("_", " "),
      instance: url,
      outcome: "rejected",
      retryable: false,
      recovery_action:
        status === 401
          ? "reauthenticate"
          : status === 404
            ? "return_to_safe_parent"
            : status === 412
              ? "reload_and_compare"
              : "inspect_and_correct_request",
    });
}
function failure(error: unknown, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof z.ZodError)
    return problem(reply, 400, "invalid_request", request.url);
  const code = error instanceof Error ? error.message : "unknown";
  if (["artifact_scope_unavailable", "artifact_parent_mismatch"].includes(code))
    return problem(reply, 404, "resource_not_found", request.url);
  if (code === "artifact_version_conflict")
    return problem(reply, 412, code, request.url);
  if (
    [
      "idempotency_key_reused",
      "workspace_processing_blocked",
      "controlled_basis_required",
      "calculation_integrity_failed",
      "unsupported_formula",
      "model_basis_mismatch",
      "scenario_calculation_not_pinned",
      "controlled_input_authority_required",
      "fact_basis_changed",
      "assumption_basis_mismatch",
      "input_decision_not_current",
      "exact_source_locator_required",
      "artifact_confidentiality_downgrade",
      "controlled_inputs_incomplete",
      "exact_artifact_evidence_required",
      "critical_finding_cannot_be_waived",
      "native_reader_pair_required",
      "artifact_work_objective_required",
      "artifact_packet_scope_mismatch",
      "output_ceiling_missing",
      "output_ceiling_exceeded",
      "source_condition_blocked",
      "artifact_job_not_cancelable",
      "ai_artifact_scope_invalid",
      "ai_packet_scope_mismatch",
    ].includes(code)
  )
    return problem(reply, 409, code, request.url);
  throw error;
}
export function registerDeliverableRoutes(
  api: FastifyInstance,
  database: Database,
  deps: Dependencies,
) {
  const scoped =
    (
      operation: (
        client: pg.PoolClient,
        request: FastifyRequest,
      ) => Promise<unknown>,
      options: { status?: number; command?: boolean } = {},
    ) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await deps.requireBanker(request, reply);
      if (!session) return;
      if (options.command && !deps.commandKey(request, reply)) return;
      try {
        const deal = uuid.parse(
          (request.params as { deal_id: string }).deal_id,
        );
        const result = await database.withContext(session, deal, (client) =>
          operation(client, request),
        );
        if (result.kind !== "ok")
          return problem(
            reply,
            result.kind === "invalid"
              ? 401
              : result.kind === "passkey_required"
                ? 403
                : 404,
            result.kind === "invalid"
              ? "session_expired"
              : result.kind === "passkey_required"
                ? "passkey_required"
                : "resource_not_found",
            request.url,
          );
        if (result.value === null)
          return problem(reply, 404, "resource_not_found", request.url);
        const value = result.value as Record<string, unknown>;
        if (value?.row_version) reply.header("ETag", `"${value.row_version}"`);
        return reply
          .code(value?.idempotent_replayed ? 200 : (options.status ?? 200))
          .header("Cache-Control", "private, no-store")
          .send({ data: result.value });
      } catch (error) {
        return failure(error, request, reply);
      }
    };
  const query = async (
    client: pg.PoolClient,
    sql: string,
    parameters: unknown[] = [],
  ) =>
    (await client.query<{ data: unknown }>(sql, parameters)).rows[0]?.data ??
    null;
  const root = "/api/v1/deals/:deal_id";
  const revisionRoot = `${root}/deliverables/:deliverable_id/revisions/:revision_id`;
  const ids = (request: FastifyRequest) => {
    const p = request.params as Record<string, string>;
    return {
      parent: uuid.parse(p.deliverable_id),
      revision: uuid.parse(p.revision_id),
    };
  };
  const parentCheck = async (
    client: pg.PoolClient,
    parent: string,
    revision: string,
  ) => {
    if (
      !(
        await client.query(
          "SELECT 1 FROM deliverable.deliverable_revision WHERE id=$1 AND deliverable_id=$2",
          [revision, parent],
        )
      ).rowCount
    )
      throw new Error("artifact_parent_mismatch");
  };
  const commandArgs = (request: FastifyRequest, body: unknown) => [
    Database.hashToken(String(request.headers["idempotency-key"])),
    canonicalDigest({ method: "POST", route: request.url, body }),
  ];
  api.get(
    `${root}/workbook-bases`,
    scoped((client) =>
      query(
        client,
        `SELECT coalesce(jsonb_agg(jsonb_build_object('calculation_run_id',r.id,'model_version_id',m.id,'scenario_version_id',s.id,'label',concat(sm.label,' · ',mm.label,' · ',c.label,' · ',left(r.id::text,8)))),'[]') AS data FROM analysis.calculation_run r JOIN analysis.calculation_version v ON v.id=r.calculation_version_id JOIN analysis.calculation c ON c.id=v.calculation_id JOIN analysis.model_version_calculation mc ON mc.calculation_version_id=v.id JOIN analysis.model_version m ON m.id=mc.model_version_id JOIN analysis.model mm ON mm.id=m.model_id JOIN analysis.scenario_version s ON s.model_version_id=m.id JOIN analysis.scenario sm ON sm.id=s.scenario_id WHERE (r.result->>'passed')::boolean AND r.coverage='complete' AND s.overrides='{}'::jsonb`,
      ),
    ),
  );
  api.get(
    `${root}/artifacts`,
    scoped((client, request) => {
      const q = z
        .object({ revision_id: uuid.optional() })
        .strict()
        .parse(request.query);
      return query(
        client,
        "SELECT coalesce(jsonb_agg(to_jsonb(a)-'protected_object_id'),'[]') AS data FROM deliverable.artifact a WHERE ($1::uuid IS NULL OR revision_id=$1)",
        [q.revision_id ?? null],
      );
    }),
  );
  api.get(
    `${root}/artifacts/:id`,
    scoped((client, request) =>
      query(
        client,
        "SELECT to_jsonb(a)-'protected_object_id' AS data FROM deliverable.artifact a WHERE id=$1",
        [uuid.parse((request.params as Record<string, string>).id)],
      ),
    ),
  );
  api.get(
    `${root}/artifacts/:id/manifest`,
    scoped((client, request) =>
      query(
        client,
        "SELECT to_jsonb(m)||jsonb_build_object('public_key_pem',k.public_key_pem) AS data FROM deliverable.artifact a JOIN deliverable.artifact_manifest m ON m.revision_id=a.revision_id JOIN deliverable.integrity_key k USING(key_version) WHERE a.id=$1",
        [uuid.parse((request.params as Record<string, string>).id)],
      ),
    ),
  );
  api.get(
    `${root}/deliverables`,
    scoped((client) =>
      query(
        client,
        "SELECT coalesce(jsonb_agg(to_jsonb(d)||jsonb_build_object('current_revision_ordinal',(SELECT ordinal FROM deliverable.deliverable_revision WHERE id=d.current_revision_id),'reader_available',EXISTS(SELECT 1 FROM deliverable.artifact WHERE revision_id=d.current_revision_id AND role='reader')) ORDER BY d.created_at DESC),'[]') AS data FROM deliverable.deliverable d",
      ),
    ),
  );
  api.get(
    `${root}/deliverables/:deliverable_id`,
    scoped((client, request) =>
      query(
        client,
        "SELECT to_jsonb(d) AS data FROM deliverable.deliverable d WHERE id=$1",
        [uuid.parse((request.params as Record<string, string>).deliverable_id)],
      ),
    ),
  );
  api.post(
    `${root}/deliverables`,
    scoped(
      (client, request) => {
        const body = deliverableBody.parse(request.body);
        return query(
          client,
          "SELECT deliverable.create_deliverable($1,$2,$3) AS data",
          [...commandArgs(request, body), body],
        );
      },
      { command: true, status: 201 },
    ),
  );
  api.get(
    `${root}/deliverables/:deliverable_id/revisions`,
    scoped(async (client, request) => {
      const parent = uuid.parse(
        (request.params as Record<string, string>).deliverable_id,
      );
      if (
        !(
          await client.query(
            "SELECT 1 FROM deliverable.deliverable WHERE id=$1",
            [parent],
          )
        ).rowCount
      )
        return null;
      return query(
        client,
        "SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.ordinal DESC),'[]') AS data FROM deliverable.deliverable_revision r WHERE deliverable_id=$1",
        [parent],
      );
    }),
  );
  api.post(
    `${root}/deliverables/:deliverable_id/revisions`,
    async (request, reply) => {
      const match = String(request.headers["if-match"] ?? "").match(
        /^"([1-9]\d*)"$/,
      );
      if (!match) return problem(reply, 428, "if_match_required", request.url);
      return scoped(
        (client, req) => {
          const body = revisionBody.parse(req.body);
          return query(
            client,
            "SELECT deliverable.create_revision($1,$2,$3,$4,$5,$6,$7) AS data",
            [
              uuid.parse((req.params as Record<string, string>).deliverable_id),
              Number(match[1]),
              ...commandArgs(req, body),
              JSON.stringify(body.basis),
              JSON.stringify(body.limitations),
              process.env.RELEASE_ID ?? "local-development",
            ],
          );
        },
        { command: true, status: 202 },
      )(request, reply);
    },
  );
  api.get(
    revisionRoot,
    scoped(async (client, request) => {
      const p = ids(request);
      await parentCheck(client, p.parent, p.revision);
      return query(
        client,
        `SELECT to_jsonb(r)||jsonb_build_object('artifacts',(SELECT coalesce(jsonb_agg(to_jsonb(a)-'protected_object_id'),'[]') FROM deliverable.artifact a WHERE a.revision_id=r.id),'jobs',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',j.id,'job_type',j.command_type,'state',j.state,'problem',j.problem,'progress',j.progress) ORDER BY j.created_at DESC),'[]') FROM jobs.job j WHERE j.accepted_inputs->>'revision_id'=r.id::text)) AS data FROM deliverable.deliverable_revision r WHERE r.id=$1`,
        [p.revision],
      );
    }),
  );
  api.get(
    `${revisionRoot}/artifacts`,
    scoped(async (client, request) => {
      const p = ids(request);
      await parentCheck(client, p.parent, p.revision);
      return query(
        client,
        "SELECT coalesce(jsonb_agg(to_jsonb(a)-'protected_object_id'),'[]') AS data FROM deliverable.artifact a WHERE revision_id=$1",
        [p.revision],
      );
    }),
  );
  api.get(
    `${revisionRoot}/manifest`,
    scoped(async (client, request) => {
      const p = ids(request);
      await parentCheck(client, p.parent, p.revision);
      return query(
        client,
        "SELECT to_jsonb(m)||jsonb_build_object('public_key_pem',k.public_key_pem) AS data FROM deliverable.artifact_manifest m JOIN deliverable.integrity_key k USING(key_version) WHERE revision_id=$1",
        [p.revision],
      );
    }),
  );
  api.get(
    `${revisionRoot}/lineage`,
    scoped(async (client, request) => {
      const p = ids(request);
      await parentCheck(client, p.parent, p.revision);
      return query(
        client,
        "SELECT coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('region',to_jsonb(r),'artifact_role',a.role)),'[]') AS data FROM deliverable.artifact_region_lineage l JOIN deliverable.artifact_region r ON r.id=l.region_id JOIN deliverable.artifact a ON a.id=r.artifact_id WHERE a.revision_id=$1",
        [p.revision],
      );
    }),
  );
  api.get(
    `${revisionRoot}/readiness`,
    scoped(async (client, request) => {
      const p = ids(request);
      await parentCheck(client, p.parent, p.revision);
      const q = z
        .object({ purpose: text, audience: text })
        .strict()
        .parse(request.query);
      return query(
        client,
        "SELECT deliverable.assess_readiness($1,$2,$3) AS data",
        [p.revision, q.purpose, q.audience],
      );
    }),
  );
  api.post(
    `${revisionRoot}/ai-reviews`,
    scoped(
      async (client, request) => {
        const p = ids(request);
        await parentCheck(client, p.parent, p.revision);
        const body = z
          .object({
            task_definition: z.enum([
              "workbook_commentary_draft",
              "deliverable_semantic_qc",
              "native_reader_semantic_parity_review",
            ]),
            packet_version_id: uuid,
            work_objective_id: uuid,
          })
          .strict()
          .parse(request.body);
        return query(
          client,
          "SELECT deliverable.create_ai_review_job($1,$2,$3,$4,$5) AS data",
          [
            p.revision,
            ...commandArgs(request, body),
            body,
            process.env.RELEASE_ID ?? "local-development",
          ],
        );
      },
      { status: 202, command: true },
    ),
  );
  api.get(
    `${revisionRoot}/office-runs`,
    scoped(async (client, request) => {
      const p = ids(request);
      await parentCheck(client, p.parent, p.revision);
      return query(
        client,
        "SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY recorded_at DESC),'[]') AS data FROM deliverable.office_compatibility_run r WHERE revision_id=$1",
        [p.revision],
      );
    }),
  );
  api.get(
    `${revisionRoot}/ai-reviews`,
    scoped(async (client, request) => {
      const p = ids(request);
      await parentCheck(client, p.parent, p.revision);
      return query(
        client,
        "SELECT coalesce(jsonb_agg(ai.get_run_projection(app.policy_account_id(),app.policy_actor_id(),app.policy_deal_id(),a.ai_run_id)),'[]') AS data FROM deliverable.ai_revision_run a WHERE a.revision_id=$1",
        [p.revision],
      );
    }),
  );
  for (const [path, table] of [
    ["reviews", "review"],
    ["qc-runs", "qc_run"],
    ["qc-findings", "qc_finding"],
  ] as const) {
    api.get(
      `${root}/${path}`,
      scoped((client, request) => {
        const filter = z
          .object({ revision_id: uuid.optional() })
          .strict()
          .parse(request.query);
        return query(
          client,
          `SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC),'[]') AS data FROM deliverable.${table} r WHERE ($1::uuid IS NULL OR revision_id=$1)`,
          [filter.revision_id ?? null],
        );
      }),
    );
    api.get(
      `${root}/${path}/:id`,
      scoped((client, request) =>
        query(
          client,
          `SELECT to_jsonb(r) AS data FROM deliverable.${table} r WHERE id=$1`,
          [uuid.parse((request.params as Record<string, string>).id)],
        ),
      ),
    );
  }
  api.post(
    `${root}/qc-runs`,
    scoped(
      (client, request) => {
        const body = z
          .object({
            revision_id: uuid,
            ruleset: z.literal("analysis-workbook-qc-1.0.0"),
          })
          .strict()
          .parse(request.body);
        return query(
          client,
          "SELECT deliverable.create_qc_job($1,NULL,$2,$3,$4) AS data",
          [
            body.revision_id,
            ...commandArgs(request, body),
            process.env.RELEASE_ID ?? "local-development",
          ],
        );
      },
      { status: 202, command: true },
    ),
  );
  api.post(
    `${root}/qc-findings/:id/retests`,
    scoped(
      (client, request) => {
        const body = z
          .object({
            revision_id: uuid,
            ruleset: z.literal("analysis-workbook-qc-1.0.0"),
          })
          .strict()
          .parse(request.body);
        return query(
          client,
          "SELECT deliverable.create_qc_job($1,$2,$3,$4,$5) AS data",
          [
            body.revision_id,
            uuid.parse((request.params as Record<string, string>).id),
            ...commandArgs(request, body),
            process.env.RELEASE_ID ?? "local-development",
          ],
        );
      },
      { status: 202, command: true },
    ),
  );
  api.get(
    `${root}/qc-findings/:id/retests`,
    scoped((client, request) =>
      query(
        client,
        "SELECT CASE WHEN EXISTS(SELECT 1 FROM deliverable.qc_finding WHERE id=$1) THEN (SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY created_at DESC),'[]') FROM deliverable.finding_retest t WHERE finding_id=$1) END AS data",
        [uuid.parse((request.params as Record<string, string>).id)],
      ),
    ),
  );
  api.post(
    `${root}/reviews`,
    scoped(
      (client, request) => {
        const body = reviewBody.parse(request.body);
        return query(
          client,
          "SELECT deliverable.create_review($1,$2,$3) AS data",
          [...commandArgs(request, body), body],
        );
      },
      { status: 201, command: true },
    ),
  );
  api.post(
    `${root}/qc-findings/:id/dispositions`,
    scoped(
      (client, request) => {
        const body = z
          .object({
            disposition: z.enum([
              "confirmed",
              "remediation_required",
              "accepted_limitation",
              "rejected",
            ]),
            purpose: text,
            rationale: z.string().min(20).max(4000),
          })
          .strict()
          .parse(request.body);
        return query(
          client,
          "SELECT deliverable.create_finding_disposition($1,$2,$3,$4) AS data",
          [
            uuid.parse((request.params as Record<string, string>).id),
            ...commandArgs(request, body),
            body,
          ],
        );
      },
      { status: 201, command: true },
    ),
  );
  api.get("/.well-known/integrity-keys.json", async (request, reply) => {
    const purpose = z
      .object({ purpose: z.literal("artifact") })
      .strict()
      .safeParse(request.query);
    if (!purpose.success)
      return problem(reply, 400, "invalid_request", request.url);
    const keys = await database.pool.query(
      "SELECT key_version,algorithm,public_key_pem,retained_at FROM deliverable.integrity_key ORDER BY retained_at",
    );
    return reply
      .header("Cache-Control", "public, max-age=300")
      .send({ purpose: "artifact", keys: keys.rows });
  });
  api.post(
    `${root}/artifacts/:id/preview-grants`,
    scoped(
      async (client, request) => {
        z.object({ purpose: z.literal("artifact_inspection") })
          .strict()
          .parse(request.body);
        const token = crypto.randomBytes(32).toString("base64url");
        const session = request.cookies["__Host-banker_session"]!;
        const result = (await query(
          client,
          "SELECT deliverable.create_preview_grant($1,$2,$3) AS data",
          [
            uuid.parse((request.params as Record<string, string>).id),
            Database.hashToken(session),
            Database.hashToken(token),
          ],
        )) as Record<string, unknown>;
        return { ...result, grant_token: token };
      },
      { status: 201 },
    ),
  );
  api.get(`${root}/artifacts/:id/preview`, async (request, reply) => {
    const session = await deps.requireBanker(request, reply);
    if (!session) return;
    const authorization = request.headers.authorization?.match(
      /^ObjectGrant ([A-Za-z0-9_-]{43})$/,
    );
    if (!authorization)
      return problem(reply, 401, "object_grant_invalid", request.url);
    try {
      const params = request.params as Record<string, string>;
      const result = await database.withContext(
        session,
        uuid.parse(params.deal_id),
        (client) =>
          query(
            client,
            "SELECT deliverable.resolve_preview_grant($1,$2,$3) AS data",
            [
              uuid.parse(params.id),
              Database.hashToken(session),
              Database.hashToken(authorization[1]!),
            ],
          ),
      );
      if (result.kind !== "ok" || !result.value)
        return problem(reply, 404, "resource_not_found", request.url);
      const object = result.value as {
        storage_key: string;
        plaintext_sha256: string;
        ciphertext_sha256: string;
        byte_length: string;
      };
      const container = await fs.readFile(protectedPath(object.storage_key));
      if (sha256(container) !== object.ciphertext_sha256)
        throw new Error("artifact_integrity_failed");
      const decrypted = await decryptProtected(container);
      if (
        sha256(decrypted.plaintext) !== object.plaintext_sha256 ||
        decrypted.plaintext.length !== Number(object.byte_length) ||
        decrypted.plaintext.subarray(0, 8).toString("hex") !==
          "89504e470d0a1a0a"
      )
        throw new Error("artifact_integrity_failed");
      return reply
        .type("image/png")
        .header("Cache-Control", "private, no-store")
        .header("Content-Disposition", "inline")
        .header("X-Content-Type-Options", "nosniff")
        .send(decrypted.plaintext);
    } catch (error) {
      return failure(error, request, reply);
    }
  });
}
