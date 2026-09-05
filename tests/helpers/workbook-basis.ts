import crypto from "node:crypto";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";

/** Synthetic, disclosed assumptions created through public command seams. */
export async function createWorkbookBasis(
  api: FastifyInstance,
  deal: string,
  cookie: string,
) {
  const command = async (
    path: string,
    payload: Record<string, unknown>,
    etag?: number,
  ) => {
    const response = await api.inject({
      method: "POST",
      url: `/api/v1/deals/${deal}/${path}`,
      headers: {
        cookie,
        "idempotency-key": crypto.randomUUID(),
        ...(etag ? { "if-match": `"${etag}"` } : {}),
      },
      payload,
    });
    assert.ok(
      [200, 201, 202].includes(response.statusCode),
      `${path}: ${response.body}`,
    );
    return response.json().data;
  };
  const measures = [];
  for (const [key, value] of [
    ["enterprise_value", "100.0"],
    ["cash", "4.7"],
    ["debt", "10.0"],
  ]) {
    const assumption = await command("assumptions", {
      proposition: `Synthetic ${key} assumption`,
      value,
      purpose: "Internal valuation review",
      scope: "Synthetic valuation acceptance",
      rationale:
        "Synthetic acceptance fixture; does not describe a real transaction.",
      bounds: {
        actual_forecast: "forecast",
        unit: "USD million",
        period: "FY2025E",
      },
      invalidation_triggers: ["Synthetic fixture replaced"],
    });
    const decision = await command(`assumptions/${assumption.id}/approvals`, {
      purpose: "Internal valuation review",
      scope: "Synthetic valuation acceptance",
      allowed_uses: ["Internal valuation review"],
      rationale:
        "Approve this disclosed synthetic assumption for development acceptance only.",
    });
    measures.push({
      measure_key: key,
      definition: key,
      period: "FY2025E",
      unit: "USD million",
      currency: "USD",
      sign: "positive",
      precision: 1,
      value_text: value,
      source_locator: { kind: "banker_assumption", decision_id: decision.id },
      fact_id: null,
      assumption_id: assumption.id,
      decision_id: decision.id,
    });
  }
  const calculation = await command("calculations", {
    calculation_code: `synthetic-${crypto.randomUUID().slice(0, 8)}`,
    label: "Synthetic EV to equity",
  });
  const version = await command(
    `calculations/${calculation.id}/versions`,
    {
      method_code: "ev_to_equity_tie_out",
      formula_text: "EV + Cash - Debt = Equity",
      method_version: "2",
      unit: "USD million",
      currency: "USD",
      period: "FY2025E",
      input_digest: "sha256:synthetic-acceptance",
      definition: { measures },
    },
    1,
  );
  const run = await command(`calculations/${calculation.id}/runs`, {
    calculation_version_id: version.id,
    enterprise_value: "100.0",
    cash: "4.7",
    debt: "10.0",
    expected_equity_value: "94.7",
  });
  const model = await command("models", {
    model_code: `synthetic-${crypto.randomUUID().slice(0, 8)}`,
    label: "Synthetic approved-input model",
  });
  const mv = await command(
    `models/${model.id}/versions`,
    {
      definition: { label: "Synthetic acceptance" },
      calculation_version_ids: [version.id],
      assumption_ids: measures.map((m) => m.assumption_id),
    },
    1,
  );
  const scenario = await command("scenarios", {
    scenario_code: `synthetic-${crypto.randomUUID().slice(0, 8)}`,
    label: "Base case — synthetic",
  });
  const sv = await command(
    `scenarios/${scenario.id}/versions`,
    { model_version_id: mv.id, overrides: {} },
    1,
  );
  return {
    calculation_run_id: run.id,
    model_version_id: mv.id,
    scenario_version_id: sv.id,
  };
}
