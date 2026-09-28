# Allow explicit development workbook alternatives

Decision date: 2026-09-06. Scope: the user's explicit instruction to replace the
three unavailable Ticket 12 dependencies and complete development validation.

For synthetic development acceptance only, a pinned LibreOffice Calc runtime
may generate/recalculate the editable XLSX and render its same-Revision PDF;
a separate host-owned Ed25519 signer may hold the development Artifact key;
and the exact installed LibreOffice application/build may supply actual
open/edit/save/reopen/reimport evidence. Private signing material remains
outside API/Worker mounts and is separate from the Audit key. The signing
protocol, canonical bytes, offline verification and immutable history remain.

This is a bounded exception to ADR 0007, 0008 and 0029 for the explicit
`development_foss_v1` profile. It does not establish Microsoft Excel Windows
compatibility, cloud-KMS custody, or production readiness. The production
profile retains its original requirements and cannot silently fall back.

An administrator may bind this acceptance profile to an exact synthetic
Revision; ordinary Account/Deal commands cannot enable it. The binding,
manifest, Office evidence and displayed readiness must identify the profile.
All structural, formula, lineage, native/reader parity, clean-copy, exact
signature, professional Review and scope gates still apply. A failed check
remains failed; old evaluation artifacts and Findings remain immutable.

Tradeoff: no paid engine/Office license or Google identity is needed for this
development proof. Host root can still reach the separate signer's key, unlike
cloud custody. LibreOffice may preserve or render OOXML differently; exact
native structures, values, comments, fonts, charts and actual save/reopen
results must be observed, not inferred from file-extension support.

Evidence claims outside this profile require their original lab/provider proof.
No Ticket 13 export workflow or Ticket 15 full reimport workflow is added.

Official interfaces: [LibreOffice licenses](https://www.libreoffice.org/licenses/),
[headless parameters](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html),
[Calc recalculation](https://api.libreoffice.org/docs/idl/ref/interfacecom_1_1sun_1_1star_1_1sheet_1_1XCalculatable.html).


Implemented development path: LibreOffice Calc 7.4.7.2 40(Build:2) on Linux,
with openpyxl 3.1.5 and PyMuPDF 1.28.2. The Calc PDF pages are serialized as
PDF 1.7, then independently inspected. Native worksheet PNGs are exported
directly from exact XLSX selections with `calc_png_Export`; Reader PNGs come
from the separate PDF. Native worksheet and Reader page pagination may differ
and the UI labels each explicitly. The returned-file smoke compares chart
content and axes while ignoring newly allocated internal axis IDs and the
explicit default position of hidden labels. Numbers, format linkage and
visible properties remain checked.
