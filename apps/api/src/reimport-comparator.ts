export type ReimportRegion = {
  region_key: string;
  ownership: "generated-owned" | "banker-owned" | "protected-formula" | "shared-merge" | "unmanaged";
  digest: string;
  formula_digest?: string;
  style_digest?: string;
  comment_digest?: string;
  unsupported?: string[];
};

export type ReimportDifference = {
  region_key: string;
  classification: "unchanged" | "banker_edit" | "generated_region_change" | "source_formula_change" | "style_layout_change" | "comment_review_change" | "unsupported" | "requires_review" | "conflict";
  ownership: ReimportRegion["ownership"];
  detail: string;
};

/** Pure, deterministic three-way classifier. The baseline is never mutated. */
export function compareReimportRegions(baseline: ReimportRegion[], edited: ReimportRegion[], current: ReimportRegion[]): ReimportDifference[] {
  const keys = new Set([...baseline, ...edited, ...current].map((region) => region.region_key));
  return [...keys].sort().map((region_key) => {
    const original = baseline.find((region) => region.region_key === region_key);
    const imported = edited.find((region) => region.region_key === region_key);
    const generated = current.find((region) => region.region_key === region_key);
    const ownership = imported?.ownership ?? original?.ownership ?? generated?.ownership ?? "unmanaged";
    if (!original || !imported || !generated) return { region_key, ownership, classification: "requires_review", detail: "Region identity is missing from one of the three exact inputs." };
    if (imported.unsupported?.length || generated.unsupported?.length) return { region_key, ownership, classification: "unsupported", detail: [...(imported.unsupported ?? []), ...(generated.unsupported ?? [])].join("; ") };
    const bankerChanged = imported.digest !== original.digest;
    const generatorChanged = generated.digest !== original.digest;
    if (!bankerChanged && !generatorChanged) return { region_key, ownership, classification: "unchanged", detail: "All three region digests match." };
    if (ownership === "unmanaged") return { region_key, ownership, classification: "unsupported", detail: "The region is outside the declared controlled ownership map." };
    if (ownership === "protected-formula" && bankerChanged) return { region_key, ownership, classification: "unsupported", detail: "Protected formula regions cannot accept an external mutation." };
    if (ownership === "generated-owned" && bankerChanged && !generatorChanged) return { region_key, ownership, classification: "requires_review", detail: "A generated-owned region was edited outside the controlled generator." };
    if (ownership === "banker-owned" && generatorChanged && !bankerChanged) return { region_key, ownership, classification: "requires_review", detail: "The generator changed a protected Banker-owned region." };
    if (bankerChanged && generatorChanged) {
      if (imported.digest === generated.digest) return { region_key, ownership, classification: "banker_edit", detail: "Edited and current generated region converge on the same bytes." };
      return { region_key, ownership, classification: "conflict", detail: "Banker and generator changed the same region; explicit Human Decision required." };
    }
    if (bankerChanged) {
      if (imported.formula_digest !== original.formula_digest) return { region_key, ownership, classification: "source_formula_change", detail: "Imported formula/source identity changed." };
      if (imported.style_digest !== original.style_digest) return { region_key, ownership, classification: "style_layout_change", detail: "Imported style or layout changed." };
      if (imported.comment_digest !== original.comment_digest) return { region_key, ownership, classification: "comment_review_change", detail: "Imported comment or review metadata changed." };
      return { region_key, ownership, classification: "banker_edit", detail: "Banker changed the exact region." };
    }
    return { region_key, ownership, classification: "generated_region_change", detail: "The current controlled generator changed this region." };
  });
}
