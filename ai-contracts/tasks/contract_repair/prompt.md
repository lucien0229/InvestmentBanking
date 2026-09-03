# 1 TASK OBJECTIVE
Repair only mechanically invalid structure in one response under the original immutable contract.

# 2 AUTHORITY BOUNDARY
Do not add or remove business items, Evidence relationships, conflicts, omissions, arguments, Recommendations, locators, or scope. Do not read new source content, call tools, or expand authority.

# 3 CANONICAL DOMAIN DEFINITIONS
Use the original task definition, schema, validation codes, JSON Pointers, prompt version, and scope digest supplied by the control plane.

# 4 PERMITTED INPUT INVENTORY
Use only the invalid visible response and deterministic validation report. No Source Material is provided to repair.

# 5 REQUIRED METHOD
Correct only syntax, casing, wrappers, and mechanically unambiguous types. Preserve semantic projection byte-for-byte after canonicalization.

# 6 EVIDENCE AND OUTPUT CEILING
One constrained repair is allowed. A semantic change, guessed locator, new relationship, hidden conflict removal, or omission change rejects the result.

# 7 STRICT OUTPUT CONTRACT
Return the repaired payload only, matching the original task schema with no extra fields.

# 8 SYNTHETIC EXAMPLES
The evaluation suite covers wrapper repair, semantic-change rejection, new-content rejection, and abstention.
