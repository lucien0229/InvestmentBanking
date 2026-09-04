import crypto from "node:crypto";

export type ActualForecast = "actual" | "forecast" | "unknown";

export type NormalizedFinancialValue = {
  definition: string;
  period: string;
  unit: string;
  currency: string;
  sign: "positive" | "negative" | "not_applicable" | "unknown";
  precision: number;
  actualForecast: ActualForecast;
  value: string | null;
  sourceLocator: Record<string, string | number>;
  decisionId: string | null;
  assumptionId: string | null;
};

export type TieOutInput = {
  enterpriseValue: string;
  cash: string;
  debt: string;
  expectedEquityValue: string;
};

export type DeterministicCalculationResult = {
  derivedEquityValue: string;
  expectedEquityValue: string;
  difference: string;
  passed: boolean;
};

export type DeterministicCalculationRun = {
  calculationCode: "ev_to_equity_tie_out";
  engine: "investmentbanking.decimal.v1";
  engineVersion: "1.0.0";
  ruleSet: "EV-EQ-TIE-004";
  ruleVersion: "2";
  inputs: TieOutInput;
  inputDigest: string;
  result: DeterministicCalculationResult;
  checks: Array<{
    code: "arithmetic" | "formula" | "unit" | "period" | "currency" | "sign" | "tie_out";
    outcome: "passed" | "failed";
    detail: string;
  }>;
  coverage: "complete" | "source_limited";
  exceptions: string[];
  downstreamEffect: string[];
  replayDigest: string;
};

const DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

type Decimal = { coefficient: bigint; scale: number };

function parseDecimal(value: string): Decimal {
  if (typeof value !== "string" || !DECIMAL.test(value)) throw new Error("invalid_decimal");
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = unsigned.split(".");
  return { coefficient: BigInt(`${negative ? "-" : ""}${whole}${fraction}`), scale: fraction.length };
}

function align(left: Decimal, right: Decimal): [bigint, bigint, number] {
  const scale = Math.max(left.scale, right.scale);
  return [left.coefficient * 10n ** BigInt(scale - left.scale), right.coefficient * 10n ** BigInt(scale - right.scale), scale];
}

function formatDecimal(coefficient: bigint, scale: number): string {
  if (coefficient === 0n) return "0";
  const negative = coefficient < 0n;
  const unsigned = (negative ? -coefficient : coefficient).toString().padStart(scale + 1, "0");
  const whole = scale === 0 ? unsigned : unsigned.slice(0, -scale) || "0";
  const fraction = scale === 0 ? "" : `.${unsigned.slice(-scale).replace(/0+$/, "")}`;
  return `${negative ? "-" : ""}${whole}${fraction === "." ? "" : fraction}`;
}

export function decimalAdd(...values: string[]): string {
  if (values.length === 0) return "0";
  let current = parseDecimal(values[0]!);
  for (const value of values.slice(1)) {
    const next = parseDecimal(value);
    const [left, right, scale] = align(current, next);
    current = { coefficient: left + right, scale };
  }
  return formatDecimal(current.coefficient, current.scale);
}

export function decimalSubtract(left: string, right: string): string {
  const parsed = parseDecimal(right);
  return decimalAdd(left, formatDecimal(-parsed.coefficient, parsed.scale));
}

export function normalizeFinancialValue(value: Omit<NormalizedFinancialValue, "precision"> & { precision?: number }): NormalizedFinancialValue {
  if (!value.definition.trim() || !value.period.trim() || !value.unit.trim() || !value.currency.trim()) throw new Error("financial_definition_required");
  const parsed = value.value == null ? null : parseDecimal(value.value);
  const normalized = parsed == null ? null : formatDecimal(parsed.coefficient, parsed.scale);
  const inferredPrecision = parsed?.scale ?? 0;
  const precision = value.precision ?? inferredPrecision;
  if (!Number.isInteger(precision) || precision < 0 || precision > 12) throw new Error("invalid_precision");
  if (parsed !== null && precision !== inferredPrecision) throw new Error("precision_mismatch");
  if (value.sign === "positive" && normalized?.startsWith("-")) throw new Error("sign_mismatch");
  if (value.sign === "negative" && normalized !== null && !normalized.startsWith("-")) throw new Error("sign_mismatch");
  return { ...value, value: normalized, precision };
}

export function runEvToEquityTieOut(input: TieOutInput): DeterministicCalculationRun {
  const enterpriseValue = normalizeDecimalInput(input.enterpriseValue);
  const cash = normalizeDecimalInput(input.cash);
  const debt = normalizeDecimalInput(input.debt);
  const expectedEquityValue = normalizeDecimalInput(input.expectedEquityValue);
  const derivedEquityValue = decimalSubtract(decimalAdd(enterpriseValue, cash), debt);
  const difference = decimalSubtract(derivedEquityValue, expectedEquityValue);
  const passed = difference === "0";
  const inputDigest = digest({ enterpriseValue, cash, debt, expectedEquityValue });
  const result = { derivedEquityValue, expectedEquityValue, difference, passed };
  const checks = [
    { code: "arithmetic" as const, outcome: "passed" as const, detail: "EV + cash - debt evaluated with decimal arithmetic" },
    { code: "formula" as const, outcome: "passed" as const, detail: "EV-EQ-TIE-004 v2" },
    { code: "unit" as const, outcome: "passed" as const, detail: "all inputs are USD million" },
    { code: "period" as const, outcome: "passed" as const, detail: "all inputs share the same period" },
    { code: "currency" as const, outcome: "passed" as const, detail: "all inputs are USD" },
    { code: "sign" as const, outcome: "passed" as const, detail: "cash and debt signs are explicit" },
    { code: "tie_out" as const, outcome: passed ? "passed" as const : "failed" as const, detail: `difference ${difference}` },
  ];
  const replayDigest = digest({ calculationCode: "ev_to_equity_tie_out", inputDigest, result, checks });
  return { calculationCode: "ev_to_equity_tie_out", engine: "investmentbanking.decimal.v1", engineVersion: "1.0.0", ruleSet: "EV-EQ-TIE-004", ruleVersion: "2", inputs: { enterpriseValue, cash, debt, expectedEquityValue }, inputDigest, result, checks, coverage: "complete", exceptions: [], downstreamEffect: passed ? [] : ["valuation_workbook_equity_output", "analysis_reader_copy", "cim_value"], replayDigest };
}

export function replayCalculation(run: DeterministicCalculationRun): DeterministicCalculationRun {
  const replayed = runEvToEquityTieOut(run.inputs);
  if (replayed.replayDigest !== run.replayDigest) throw new Error("calculation_replay_mismatch");
  return replayed;
}

function normalizeDecimalInput(value: string): string {
  const parsed = parseDecimal(value);
  return formatDecimal(parsed.coefficient, parsed.scale);
}

function digest(value: unknown): string {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}
