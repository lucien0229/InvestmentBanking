import test from "node:test";
import assert from "node:assert/strict";
import { compareReimportRegions } from "../../apps/api/src/reimport-comparator.js";

const region = (region_key: string, digest: string, extra: Record<string, unknown> = {}) => ({ region_key, ownership: "shared-merge" as const, digest, ...extra });

test("three-way comparator preserves unchanged, banker, generator and conflict states", () => {
  const baseline = [region("A1", "a"), region("B1", "b"), region("C1", "c"), region("D1", "d")];
  const edited = [region("A1", "a"), region("B1", "banker"), region("C1", "c"), region("D1", "banker")];
  const current = [region("A1", "a"), region("B1", "b"), region("C1", "generated"), region("D1", "generated")];
  assert.deepEqual(compareReimportRegions(baseline, edited, current).map((item) => item.classification), ["unchanged", "banker_edit", "generated_region_change", "conflict"]);
});

test("unsupported or missing region identity requires review", () => {
  const baseline = [region("A1", "a")];
  assert.equal(compareReimportRegions(baseline, [{ ...region("A1", "b"), unsupported: ["external link"] }], baseline)[0].classification, "unsupported");
  assert.equal(compareReimportRegions(baseline, [], baseline)[0].classification, "requires_review");
});

test("classifies source, style, comment mutations and convergent edits explicitly", () => {
  const baseline = [region("FORMULA", "f", { formula_digest: "f0" }), region("STYLE", "s", { style_digest: "s0" }), region("NOTE", "n", { comment_digest: "n0" }), region("CONVERGED", "c")];
  const edited = [region("FORMULA", "f1", { formula_digest: "f1" }), region("STYLE", "s1", { style_digest: "s1" }), region("NOTE", "n1", { comment_digest: "n1" }), region("CONVERGED", "c1")];
  const current = [region("FORMULA", "f" , { formula_digest: "f0" }), region("STYLE", "s", { style_digest: "s0" }), region("NOTE", "n", { comment_digest: "n0" }), region("CONVERGED", "c1")];
  assert.deepEqual(compareReimportRegions(baseline, edited, current).map((item) => item.classification), ["banker_edit", "source_formula_change", "comment_review_change", "style_layout_change"]);
});

test("fails closed for protected ownership and generator-owned mutations", () => {
  const baseline = [
    { ...region("PROTECTED", "a"), ownership: "protected-formula" as const },
    { ...region("GENERATED", "b"), ownership: "generated-owned" as const },
    { ...region("UNMANAGED", "c"), ownership: "unmanaged" as const },
  ];
  const edited = [
    { ...region("PROTECTED", "edited"), ownership: "protected-formula" as const },
    { ...region("GENERATED", "edited"), ownership: "generated-owned" as const },
    { ...region("UNMANAGED", "edited"), ownership: "unmanaged" as const },
  ];
  assert.deepEqual(compareReimportRegions(baseline, edited, baseline).map((item) => item.classification), ["requires_review", "unsupported", "unsupported"]);
});
