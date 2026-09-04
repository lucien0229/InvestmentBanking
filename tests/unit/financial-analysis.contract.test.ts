import assert from "node:assert/strict";
import test from "node:test";
import { decimalAdd, decimalSubtract, normalizeFinancialValue, replayCalculation, runEvToEquityTieOut } from "../../apps/api/src/financial-analysis.js";

test("financial values use exact decimal arithmetic and preserve precision", () => {
  assert.equal(decimalAdd("100.00", "4.70", "-10.00"), "94.7");
  assert.equal(decimalSubtract("96.20", "94.70"), "1.5");
  assert.deepEqual(normalizeFinancialValue({ definition: "cash", period: "FY2025E", unit: "USD million", currency: "USD", sign: "positive", value: "4.70", actualForecast: "forecast", sourceLocator: { sheet: "Operating Case", cell: "F42" }, decisionId: "dec-014", assumptionId: null }), {
    definition: "cash", period: "FY2025E", unit: "USD million", currency: "USD", sign: "positive", precision: 2, value: "4.7", actualForecast: "forecast", sourceLocator: { sheet: "Operating Case", cell: "F42" }, decisionId: "dec-014", assumptionId: null,
  });
});

test("EV-to-equity tie-out records deterministic checks and replays identically", () => {
  const run = runEvToEquityTieOut({ enterpriseValue: "100.0", cash: "6.2", debt: "10.0", expectedEquityValue: "94.7" });
  assert.equal(run.result.derivedEquityValue, "96.2");
  assert.equal(run.result.difference, "1.5");
  assert.equal(run.result.passed, false);
  assert.equal(run.checks.length, 7);
  assert.deepEqual(replayCalculation(run), run);
  const corrected = runEvToEquityTieOut({ ...run.inputs, cash: "4.7" });
  assert.equal(corrected.result.difference, "0");
  assert.equal(corrected.result.passed, true);
});

test("financial normalization rejects exponent notation and sign/precision mismatches", () => {
  assert.throws(() => normalizeFinancialValue({ definition: "cash", period: "FY2025E", unit: "USD million", currency: "USD", sign: "positive", value: "4.7e0", actualForecast: "forecast", sourceLocator: {}, decisionId: null, assumptionId: null }), /invalid_decimal/);
  assert.throws(() => normalizeFinancialValue({ definition: "cash", period: "FY2025E", unit: "USD million", currency: "USD", sign: "negative", value: "4.7", precision: 1, actualForecast: "forecast", sourceLocator: {}, decisionId: null, assumptionId: null }), /sign_mismatch/);
  assert.throws(() => normalizeFinancialValue({ definition: "cash", period: "FY2025E", unit: "USD million", currency: "USD", sign: "positive", value: "4.70", precision: 1, actualForecast: "forecast", sourceLocator: {}, decisionId: null, assumptionId: null }), /precision_mismatch/);
});
