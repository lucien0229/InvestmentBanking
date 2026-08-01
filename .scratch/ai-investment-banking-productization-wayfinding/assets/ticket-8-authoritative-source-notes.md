# Ticket 8 Authoritative Source Notes: Native Editability, Reader-Facing Representations, Structured Exports, Revisions, and Render Consistency

**Research scope:** external primary and authoritative evidence for Ticket 8, limited to file-format mechanisms and verifiable quality constraints

**Access date:** 2026-07-31

**Geography / release context:** United States, English-first

**Status:** research input; this document does not decide the final V1 deliverable architecture

## 1. Purpose and Decision Boundary

This asset supplies external evidence for a separate Ticket 8 decision about banker-native editable files, frozen reader-facing representations, structured exports, version binding, and quality verification. It does not choose the Hero Deliverable, the V1 deliverable set, readiness gates, or the interaction model.

The following repo decisions are inherited and not re-researched here:

- A `Deliverable` is a business object, not a file.
- A `Revision` is an immutable version of a Deliverable.
- A `Native Artifact` is an editable or operational representation of an exact Revision.
- File creation, schema validity, mechanical validity, professional usability, presentation readiness, and external-use authorization are separate conditions.
- AI generation is evidence-bounded and cannot replace exact-version Banker judgment or the External-Use Decision.

The source material below is used only to answer narrower mechanism questions:

1. What structures must remain present for XLSX, PPTX, and DOCX to remain genuinely editable in their native applications?
2. What can and cannot be proved through package or schema validation?
3. What must be recalculated or rendered to test business-facing quality?
4. What is PDF capable of representing, and why is it not a replacement for an editable native artifact?
5. What are CSV and JSON suitable for, and what metadata is required for portable interpretation?
6. What general provenance and revision mechanisms can inform source-to-cell, source-to-slide, source-to-paragraph, and exact-copy lineage?
7. Which US regulatory sources create useful recordkeeping constraints without defining a universal banker-deliverable quality standard?

## 2. Evidence Classification

Every substantive conclusion uses one of four labels.

- **Verified fact** — directly supported by a primary standard, regulator, or first-party format documentation.
- **Evidence-backed inference** — a necessary or strongly supported conclusion drawn from one or more verified facts; it is not stated verbatim by the source.
- **Product design implication** — a proposed constraint for Ticket 8 to consider. It is not an external industry rule.
- **Unresolved implementation/evaluation question** — a question that the cited source does not answer and that should be resolved later through product design or benchmark testing.

No source reviewed establishes a universal investment-banking threshold for slide density, acceptable numerical tolerance, workbook size, number of review rounds, or error-rate target. Any numeric threshold in later work must therefore be identified as a Product Design Decision and validated through benchmark artifacts.

## 3. Source Register

All sources were accessed on 2026-07-31.

| ID | Authority | Source | What it supports | Applicability limit |
|---|---|---|---|---|
| S01 | ECMA International | [ECMA-376, Office Open XML File Formats](https://ecma-international.org/publications-and-standards/standards/ecma-376/) | OOXML vocabularies, document representation, package model, consumer/producer requirements, markup compatibility | Defines file-format conformance, not banker usability or rendered quality |
| S02 | Microsoft Learn | [Open XML SDK for Office design considerations](https://learn.microsoft.com/en-us/office/open-xml/open-xml-sdk-design-considerations) | SDK does not guarantee validity and does not provide Word layout, Excel recalculation/data refresh, or conversion | Describes SDK boundaries; other Office automation/rendering mechanisms may exist |
| S03 | Microsoft Learn | [Structure of a SpreadsheetML document](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/structure-of-a-spreadsheetml-document) | Workbook/worksheet/package structure; separate worksheet parts; tables, chart sheets, pivots | Structural description does not prove formula or business correctness |
| S04 | Microsoft Learn | [Working with formulas](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/working-with-formulas) | Formula text in `CellFormula`; cached result in `CellValue`; formula references | Cached values can be stale and are not evidence of successful current recalculation |
| S05 | Microsoft Learn | [Working with the calculation chain](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/working-with-the-calculation-chain) | Calculation chain records last calculation order, not dependency tree | Does not by itself prove recalculation correctness or completeness |
| S06 | Microsoft Learn | [Retrieve hidden worksheets](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/how-to-retrieve-a-list-of-the-hidden-worksheets-in-a-spreadsheet) | `Hidden` and `VeryHidden` worksheet states are inspectable in the workbook | Does not prescribe whether hidden sheets are acceptable |
| S07 | Microsoft Learn | [Retrieve named ranges](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/how-to-retrieve-a-dictionary-of-all-named-ranges-in-a-spreadsheet) | Workbook defined names and their range descriptions are inspectable | Defined names are not mandatory and do not automatically establish semantic lineage |
| S08 | Microsoft Learn | [Excel recalculation](https://learn.microsoft.com/en-us/office/client-developer/excel/excel-recalculation) | Excel maintains and rebuilds dependency/calculation chains; multiple calculation modes exist | Application behavior can vary with calculation mode, functions, links, and engine version |
| S09 | Microsoft Learn | [NumberingFormats class](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.spreadsheet.numberingformats?view=openxml-3.0.1) | Number formats control displayed rendering of numeric values, including currency and dates | A format does not prove the underlying number has the correct unit, currency, or period |
| S10 | Microsoft Support | [File formats supported in Excel](https://support.microsoft.com/en-us/excel/file-formats-that-are-supported-in-excel) | XLSX is XML-based and cannot store VBA or Excel 4.0 macros; XLSM is macro-enabled | Does not decide whether the product should support active content |
| S11 | Microsoft Support | [Excel formatting and features not transferred to other file formats](https://support.microsoft.com/en-us/excel/excel-formatting-and-features-that-are-not-transferred-to-other-file-formats) | XLSX preserves workbook features; CSV/text loses formatting, graphics, objects, and often formula semantics | Product may define its own CSV schema, but CSV still cannot act as a workbook replacement |
| S12 | Microsoft Learn | [Structure of a PresentationML document](https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document) | Slides, masters, layouts, themes, notes, tables, charts, comments, and package relationships | Structural validity does not prove legibility, absence of clipping, or design quality |
| S13 | Microsoft Learn | [Working with slide masters](https://learn.microsoft.com/en-us/office/open-xml/presentation/working-with-slide-masters) | Masters contain shared shapes, text styles, color/header/footer/timing/transition properties and relate to layouts/slides | Does not prescribe a banker template or visual style |
| S14 | Microsoft Learn | [Add a comment to a slide](https://learn.microsoft.com/en-us/office/open-xml/presentation/how-to-add-a-comment-to-a-slide-in-a-presentation) | Slides may contain comments and notes; modern comments include author, time, status, and anchors | PowerPoint version support and classic versus modern comments can differ |
| S15 | Microsoft Support | [File formats supported in PowerPoint](https://support.microsoft.com/en-us/office/file-formats-that-are-supported-in-powerpoint-252c6fa0-a4bc-41be-ac82-b77c9773f9dc) | PPTX/PPTM distinctions; PDF preserves formatting for sharing; picture presentation loses information | Marketing/support description is not a rendering-conformance test |
| S16 | Microsoft Learn | [Structure of a WordprocessingML document](https://learn.microsoft.com/en-us/office/open-xml/word/structure-of-a-wordprocessingml-document) | Paragraph/run/text hierarchy and comments, headers, footers, footnotes, endnotes, settings, and styles parts | Structural model does not prove pagination or final visual layout |
| S17 | Microsoft Learn | [Working with WordprocessingML tables](https://learn.microsoft.com/en-us/office/open-xml/word/working-with-wordprocessingml-tables) | Native tables have table properties, a grid, rows, cells, and block content | Does not define banker-specific table conventions |
| S18 | Microsoft Learn | [Apply a style to a paragraph](https://learn.microsoft.com/en-us/office/open-xml/word/how-to-apply-a-style-to-a-paragraph-in-a-word-processing-document) | Paragraph styles are separately defined and referenced; a document can be valid without a styles part | Validity alone is weaker than professional editability and template compatibility |
| S19 | Microsoft Learn | [Introduction to markup compatibility](https://learn.microsoft.com/en-us/office/open-xml/general/introduction-to-markup-compatibility) | Different consumers may ignore/filter unsupported namespaces or select alternate content; preprocessing can affect saved content | Compatibility behavior depends on both the format and the consuming application |
| S20 | Adobe | [PDF Reference 1.7](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/pdfreference1.7old.pdf) | PDF page-description model and consumer/producer behavior | PDF 1.7 is an older Adobe reference; ISO 32000 governs later standardized PDF revisions |
| S21 | Adobe Acrobat | [Font embedding and substitution in PDFs](https://helpx.adobe.com/ca/acrobat/desktop/create-documents/explore-advanced-conversion-settings/font-handling-distiller.html) | Embedded fonts reduce substitution; restrictions can force substitution or rasterization and affect search/editability | Does not guarantee identical rendering in every viewer or printer |
| S22 | ISO | [ISO 19005-1:2005, PDF/A-1](https://www.iso.org/standard/38920.html) | A constrained use of PDF 1.4 for long-term preservation | PDF/A is archival; it is not automatically the right circulation format and PDF/A-1 is not the newest PDF/A part |
| S23 | IETF / RFC Editor | [RFC 4180, Common Format and MIME Type for CSV](https://www.rfc-editor.org/rfc/rfc4180.html) | `text/csv`, record/header/escaping conventions, and known variability across implementations | Informational RFC; does not provide field semantics, datatypes, IDs, or versioning |
| S24 | W3C | [Model for Tabular Data and Metadata on the Web](https://www.w3.org/TR/tabular-data-model/) | Separate metadata can describe tables, columns, rows, cells, datatypes, dialect, and validation | CSVW is a general web-data model, not an investment-banking schema requirement |
| S25 | W3C | [Metadata Vocabulary for Tabular Data](https://www.w3.org/TR/tabular-metadata/) | Metadata can support column/type/format/uniqueness validation and conversion | Adoption and implementation profile remain product choices |
| S26 | IETF / RFC Editor | [RFC 8259, JSON](https://www.rfc-editor.org/rfc/rfc8259.html) | Portable JSON grammar, unordered object members, number and Unicode interoperability considerations | JSON syntax alone does not define a stable business schema or decimal semantics |
| S27 | W3C | [PROV-O](https://www.w3.org/TR/prov-o/) | Entity/activity/agent, use/generation/derivation/attribution, revision, primary source, and invalidation relations | Does not define Office-specific cell/slide/paragraph selectors or deal semantics |
| S28 | W3C | [Selectors and States](https://www.w3.org/TR/selectors-states/) | Specific-resource selectors, quote/position/range selectors, version state; position selectors are brittle after edits | Application-specific selectors are still needed for Office package structures |
| S29 | NIST | [FIPS 180-4, Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final) | Message digests can detect whether electronic data changed after digest generation | A digest proves byte-level identity, not meaning, authorship, approval, or professional correctness |
| S30 | Microsoft Learn | [Open Packaging Conventions fundamentals](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/opc/open-packaging-conventions-overview) | Packages consist of parts and relationships; package signatures can detect modification of signed content | Package signatures require policy, signer trust, and coverage choices; signatures are not a revision model |
| S31 | FINRA | [FINRA Rule 2210, Communications with the Public](https://www.finra.org/rules-guidance/rulebooks/finra-rules/2210) | For covered member communications, record copy/use/approval/preparer data and sources of statistical tables/charts/graphs; content must be fair and not misleading | Applies only where the artifact is a covered FINRA member communication; does not define all M&A deliverables |
| S32 | FINRA | [FINRA Rule 4511, General Requirements](https://www.finra.org/rules-guidance/rulebooks/finra-rules/4511) | FINRA-required records must be preserved in media complying with Exchange Act Rule 17a-4 | Does not mean every Deal Workspace object is a required regulatory record |
| S33 | SEC | [Amendments to Electronic Recordkeeping Requirements for Broker-Dealers](https://www.sec.gov/investment/amendments-electronic-recordkeeping-requirements-broker-dealers) | Audit-trail alternative requires time-stamped history sufficient to recreate an original record after modification/deletion | Applies to records subject to Rule 17a-4 and regulated entities; product conformance is not established by an export feature alone |
| S34 | SEC EDGAR, Ryerson merger communication | [Ryerson definitive additional proxy materials, 2007](https://www.sec.gov/Archives/edgar/data/790528/000119312507205489/ddefm14a.htm) | Public transaction history identifies a confidential information memorandum, buyer confidentiality agreements, electronic data room, management presentations, bids, and merger-agreement markups | Retrospective public disclosure; not the underlying confidential artifacts and not a universal process template |
| S35 | SEC EDGAR, Fidelity National Financial merger proxy | [FNFV definitive merger proxy, 2017](https://www.sec.gov/Archives/edgar/data/1610793/000119312517281924/d419675ddefm14a.htm) | Public transaction history identifies buyer meetings, CIM and financial-model distribution, buyer access, IOIs, updated projections, final proposal requests, and agreement markups | One public deal; describes events and distributed materials but does not disclose the complete internal Deal Book |

## 4. Findings: OOXML Is a Structured Package, Not a Flat Visual Container

### 4.1 What is verified

**Verified fact F-OOXML-01.** ECMA-376 defines distinct word-processing, spreadsheet, and presentation vocabularies plus Open Packaging Conventions. OOXML files are packages of typed parts connected by relationships, not single undifferentiated documents. [S01]

**Verified fact F-OOXML-02.** SpreadsheetML uses a workbook part referencing separate worksheet parts and may also contain tables, chart sheets, pivot definitions, shared strings, styles, and related parts. [S03]

**Verified fact F-OOXML-03.** PresentationML uses separate presentation, slide, slide-master, slide-layout, theme, notes, comments, chart, media, and other parts. Each slide is a distinct part and is connected through explicit relationships. [S12]

**Verified fact F-OOXML-04.** WordprocessingML separates body paragraphs/runs from comments, headers, footers, footnotes, endnotes, document settings, styles, and other stories/parts. [S16]

**Verified fact F-OOXML-05.** Markup compatibility depends on both package markup and the consuming application. A consumer can ignore unsupported namespaces or select alternate content, and preprocessing may remove content that will then remain removed if the file is saved. [S19]

**Verified fact F-OOXML-06.** Microsoft explicitly says the Open XML SDK does not guarantee document validity and does not provide application behaviors such as Word layout, Excel recalculation, Excel data refresh, or format conversion. [S02]

### 4.2 What follows for quality control

**Evidence-backed inference I-OOXML-01.** A valid ZIP container or schema-valid OOXML package is necessary but cannot prove native editability, Excel calculation integrity, PowerPoint/Word visual quality, or PDF parity.

**Product design implication P-OOXML-01.** A Native Artifact preflight should be layered rather than collapsed into a single “file valid” flag:

1. container and content-type integrity;
2. required package parts and relationships;
3. OOXML schema/conformance checks against a declared Office target;
4. preservation/inventory of extensions, embedded packages, external relationships, comments, notes, hidden content, and active content;
5. open-and-save compatibility test in the declared target application or an explicitly benchmarked equivalent;
6. application-specific recalculation or layout/render inspection;
7. business-semantic and cross-artifact checks;
8. Banker review and exact-Revision use decision.

**Product design implication P-OOXML-02.** A flattening transformation is not a neutral implementation choice. Converting a PowerPoint table/chart to an image, an Excel model to displayed values, or a Word table to an image discards native structures that OOXML explicitly represents.

**Product design implication P-OOXML-03.** Round-trip processing must preserve package parts it does not intentionally own. Unknown or unsupported parts/extensions cannot be silently removed. If lossless preservation cannot be established, the imported artifact should be blocked from automatic rewrite and retained unchanged as a source/reference copy.

**Unresolved question Q-OOXML-01.** Which exact Microsoft Office desktop versions and platforms will define the V1 compatibility target? OOXML conformance alone does not resolve differences among Office versions, Windows/macOS, desktop/web, Strict/Transitional markup, or third-party suites.

## 5. Findings: XLSX Native Editability and Model Integrity

### 5.1 Formula and calculation mechanisms

**Verified fact F-XLSX-01.** SpreadsheetML stores formula text in the formula element and may store the last calculated result separately as a cached cell value. [S04]

**Verified fact F-XLSX-02.** The calculation-chain part records the sequence in which formula cells were last calculated. It is not a formula-dependency tree. [S05]

**Verified fact F-XLSX-03.** Excel supports different calculation behaviors and can rebuild its dependency tree and calculation chain. [S08]

**Evidence-backed inference I-XLSX-01.** Reading a cached value is not equivalent to recalculating the workbook. The cached value may predate a source update, changed input, different calculation mode, unavailable external link, unsupported function, or manual edit.

**Product design implication P-XLSX-01.** For a workbook Revision claiming current calculated outputs, retain both formula text and cached values but treat the latter only as an imported observation. The QC evidence should identify:

- calculation engine and version;
- calculation mode observed before and after processing;
- whether a full dependency-tree rebuild and full recalculation occurred;
- recalculation timestamp;
- before/after formula-cell value differences;
- unresolved external links, unsupported functions, errors, and circular references;
- whether recalculation changed any value that was previously used in another artifact.

**Product design implication P-XLSX-02.** Formula-cell edits, hardcodes, and overwritten formulas must be classified, not merely detected. A hardcode is not automatically wrong: it may be a Banker-approved input or override. The workbook must distinguish at least protected formulas, product-managed inputs, imported source values, Banker inputs/overrides, and presentation-only cells.

### 5.2 Native structures to preserve and inspect

**Verified fact F-XLSX-04.** Workbook defined names can identify ranges and are available for programmatic inspection. [S07]

**Verified fact F-XLSX-05.** Worksheets can be `Hidden` or `VeryHidden`; these states are inspectable in workbook metadata. [S06]

**Verified fact F-XLSX-06.** Spreadsheet number formats affect how numbers are rendered, including currency and date appearances. [S09]

**Verified fact F-XLSX-07.** XLSX cannot store VBA or Excel 4.0 macro code; XLSM is the macro-enabled XML format. [S10]

**Product design implication P-XLSX-03.** A banker-native workbook round trip should preserve, where present and supported:

- workbook and worksheet names/order/visibility;
- cell formulas, cached values, datatypes, styles, number formats, comments/notes, hyperlinks, validations, conditional formatting, tables, filters, freeze panes, print areas, page setup, and protection settings;
- defined names and named ranges;
- chart parts, chart series definitions, chart data references, and embedded or linked chart data;
- pivot definitions/caches if supported by the declared compatibility contract;
- external-link parts and their declared resolution posture;
- hidden rows/columns/sheets and their contents;
- calculation properties and dependency/calculation-chain state;
- custom XML and Office extension parts that are not product-owned;
- workbook metadata required to identify the source artifact and exact imported version.

This is a preservation inventory, not a claim that all features must be generated in V1.

**Product design implication P-XLSX-04.** Units, currencies, dates, periods, and sign conventions cannot be inferred safely from number formatting alone. They require explicit semantic metadata at the model/output level and visible labeling in the workbook.

**Product design implication P-XLSX-05.** Hidden or VeryHidden content, external links, and macros/active content must be surfaced in preflight. Silently ignoring them can make displayed outputs non-reproducible or conceal inputs and calculations.

**Product design implication P-XLSX-06.** If V1 only emits `.xlsx`, active-content inputs such as `.xlsm` require an explicit boundary. The system may preserve the original source without executing macros, but it must not rewrite it as `.xlsx` while implying equivalent behavior.

### 5.3 Source-to-cell and reproducibility implications

**Evidence-backed inference I-XLSX-02.** A1 cell references and named ranges provide addressability, but neither one proves source lineage. A name can be absent, changed, reused, or point to a different range in a later workbook.

**Product design implication P-XLSX-07.** A source-to-cell record should bind at least:

- Deliverable and exact Revision ID;
- Native Artifact digest;
- workbook/sheet stable identity plus visible name;
- cell or range address;
- formula text or value role at that Revision;
- Source Record exact version and Evidence selector;
- transformation/calculation activity and input lineage;
- unit, currency, period, and definition;
- origin and last human/product modification;
- status when the cell/range moves, is deleted, or is overwritten.

**Product design implication P-XLSX-08.** Refresh must be a three-way operation, not blind regeneration: compare the prior generated baseline, the Banker-edited current artifact, and the newly generated candidate. Banker-edited cells/ranges should remain protected or produce an explicit conflict requiring a decision.

**Unresolved question Q-XLSX-01.** Which Excel calculation engine qualifies for a V1 “recalculated” claim? LibreOffice or a formula library may not reproduce Excel behavior for every function, date system, external link, iterative calculation, array formula, dynamic array, or chart feature.

**Unresolved question Q-XLSX-02.** What compatibility and safety policy applies to `.xlsm`, `.xlsb`, add-ins, Power Query, data connections, external links, DDE/OLE, Excel 4.0 macros, and unsupported formulas? The format sources establish that these are distinct capabilities but not the product policy.

## 6. Findings: PPTX Native Editability, Template Compatibility, and Render QC

### 6.1 Native presentation structures

**Verified fact F-PPTX-01.** PresentationML represents slides separately from slide masters, layouts, and themes. Themes define color, font, and format schemes; masters/layouts control shared objects and formatting. [S12, S13]

**Verified fact F-PPTX-02.** Slides can contain editable shapes, text, tables, chart relationships, notes, and comments. Comments can carry author/time/status and can be anchored to slide, drawing, or text content in modern-comment structures. [S12, S14]

**Verified fact F-PPTX-03.** A PowerPoint “picture presentation” converts slides to images and loses information. Microsoft separately identifies PPTX as the editable presentation format and PDF as a sharing format that preserves document formatting. [S15]

**Evidence-backed inference I-PPTX-01.** A PPTX made of full-slide images is not equivalent to a native editable deck, even though it opens in PowerPoint and uses the `.pptx` extension.

**Product design implication P-PPTX-01.** A banker-native PPTX should preserve or create native text boxes, tables, charts, shapes, groupings, connectors, and other editable objects where those object types carry banker work. Raster images should be limited to content whose source is already raster or whose purpose is explicitly visual.

**Product design implication P-PPTX-02.** Template compatibility requires preservation of the uploaded template’s theme, slide masters, layouts, placeholder semantics, fonts, color mappings, page size/orientation, headers/footers, and slide numbering. A slide that merely imitates the template’s appearance using absolute-positioned shapes is not necessarily template-compatible.

**Product design implication P-PPTX-03.** Comments, notes, and draft markings must be inventoried independently. Whether each item appears in an internal review copy, presenter view, PDF, or circulation copy should be deliberate and testable; “not visible in slide show” does not mean “not present in the file.”

### 6.2 Charts, tables, and model lineage

**Verified fact F-PPTX-04.** Presentation slide parts may have explicit relationships to chart and embedded-package parts; the OOXML chart model is distinct from a picture part. [S12]

**Evidence-backed inference I-PPTX-02.** An editable chart object and its embedded or linked data can remain mechanically disconnected from the authoritative Deal Model. Native editability does not establish source/model consistency.

**Product design implication P-PPTX-04.** For every material chart or table, the Deal Workspace should retain:

- slide stable identity and visible slide number at the Revision;
- shape/chart/table object ID and bounding region;
- whether it is native, pasted-linked, embedded-workbook-backed, or raster;
- model output/range or structured dataset used;
- transformation and rounding rules;
- source and Evidence lineage for underlying values;
- last refresh time and model Revision;
- intentional manual adjustments or annotations;
- rendered comparison evidence after refresh.

**Product design implication P-PPTX-05.** Chart-series labels, categories, data values, legend, units, period, currency, source footnote, and any qualification should be checked against the underlying model or structured table. A visually plausible chart is insufficient.

### 6.3 Render quality and regeneration

**Verified fact F-PPTX-05.** The Open XML SDK does not provide presentation layout or file-to-PDF conversion. [S02]

**Evidence-backed inference I-PPTX-03.** XML/schema validation cannot detect overflow, clipping, illegible font size, poor alignment, overlapping shapes, excessive page density, wrong font substitution, or PDF export differences.

**Product design implication P-PPTX-06.** PPTX QC should require both structural inspection and rendered-slide inspection in the declared target PowerPoint environment. The rendered inspection set should include:

- object overflow and clipping;
- overlap and out-of-bounds content;
- line breaks and text reflow;
- font substitution and missing glyphs;
- table/chart label truncation;
- spacing/alignment and visual hierarchy;
- page density and legibility;
- notes/comments/draft-marking disposition;
- confidentiality legend and audience-specific disclosure presence;
- page-number/title/footer consistency;
- PDF export comparison for the exact same Revision.

**Product design implication P-PPTX-07.** Regeneration should operate on owned placeholders or bounded generated regions, not reconstruct the whole deck by default. If a Banker has edited a generated object, the edit should be protected or explicitly reconciled; it must not disappear silently.

**Unresolved question Q-PPTX-01.** What target renderer defines parity: a specific PowerPoint desktop version on Windows, PowerPoint on macOS, Office web, or multiple benchmarked renderers? The standard does not define one canonical pixel rendering.

**Unresolved question Q-PPTX-02.** What measured thresholds for minimum type size, safe margin, maximum table density, or acceptable pixel difference should be used? No authoritative universal investment-banking threshold was found.

## 7. Findings: DOCX Native Editability and Pagination

### 7.1 Native document structure

**Verified fact F-DOCX-01.** WordprocessingML represents paragraphs, runs, and text as separate structures and has independent parts for styles, comments, headers, footers, footnotes, endnotes, and settings. [S16]

**Verified fact F-DOCX-02.** Native Word tables contain table properties, a table grid, rows, cells, and block-level content. [S17]

**Verified fact F-DOCX-03.** Paragraph styles are separately defined and referenced, but a DOCX may still be schema-valid without a styles part. [S18]

**Evidence-backed inference I-DOCX-01.** A DOCX containing only visually positioned text, images, or unstructured formatting can be valid while being difficult to maintain, restyle, navigate, or repaginate.

**Product design implication P-DOCX-01.** Banker-native DOCX generation should preserve or create, as applicable:

- semantic heading levels and paragraph styles;
- character, paragraph, table, list/numbering, and default styles;
- native tables with repeat-header and width behavior;
- sections, page size/orientation, margins, headers, footers, and page-number fields;
- bookmarks, hyperlinks, footnotes/endnotes, cross-references, captions, and fields;
- comments, tracked changes, and revision/draft markings when used;
- text as text rather than page images;
- theme/font relationships and template-owned styles;
- source citations and qualifiers anchored to exact paragraphs/tables.

**Product design implication P-DOCX-02.** DOCX structure and pagination require separate checks. A heading-style hierarchy or schema-valid table does not prove that page breaks, widows/orphans, table splitting, headers/footers, cross-references, and footnotes render correctly.

**Product design implication P-DOCX-03.** External Banker edits should be imported as a new artifact version and compared against the prior generated baseline at paragraph/table/field level. Human-authored content must not be regenerated without an explicit conflict or scope decision.

**Unresolved question Q-DOCX-01.** Which Word features are required in V1 round trip: tracked changes, modern comments, content controls, fields, linked objects, embedded workbooks, macros, or custom XML? The format supports broader features than a minimum V1 must support.

## 8. Findings: PDF Is a Frozen Reader Representation, Not the Native Source of Truth

### 8.1 Page representation and font behavior

**Verified fact F-PDF-01.** PDF is a page-description format intended to convey the appearance of pages to consumers independently of the authoring application. [S20]

**Verified fact F-PDF-02.** Embedded fonts help prevent substitution. Font-license restrictions or missing fonts can cause substitution or conversion to bitmap content, affecting appearance, searchability, and editability. [S21]

**Verified fact F-PDF-03.** ISO 19005 defines PDF/A as a constrained use of PDF for long-term preservation. [S22]

**Verified fact F-PDF-04.** Microsoft describes PDF as preserving PowerPoint formatting for sharing, while separately identifying PPTX as the presentation format and warning that picture-based presentations lose information. [S15]

**Evidence-backed inference I-PDF-01.** PDF is appropriate for an exact reader/circulation representation, but a PDF does not preserve the complete native modeling, master/layout, formula, table, chart-data, comment, or style behavior of the source Office artifact.

**Product design implication P-PDF-01.** Each PDF should be derived from and immutably bound to one exact Native Artifact Revision. The binding should include both artifact digests, generation engine/version, timestamp, audience/purpose profile, page count, and any rendering warnings.

**Product design implication P-PDF-02.** PDF cannot be the only Banker-owned deliverable format when the work requires continued model, deck, or document editing. It is a companion reader-facing representation.

**Product design implication P-PDF-03.** “PDF generated successfully” is insufficient. QC should test:

- file opens and has the expected page count/order/size;
- all pages render without error;
- fonts are embedded or an approved substitution policy is met;
- no unexpected rasterization of text/tables/charts;
- text/search/copy behavior is preserved where intended;
- confidentiality legends, page numbers, sources, qualifiers, and audience markings are present;
- visual comparison against the source Office render detects missing/shifted/clipped content;
- Native Artifact and PDF material numbers/text/citations match;
- comments, notes, hidden content, hyperlinks, attachments, forms, scripts, and active elements are either intentionally retained or intentionally excluded.

**Product design implication P-PDF-04.** PDF/A should not be assumed as the default circulation profile. It is an archival family with its own restrictions and version choices; the product should first define circulation, confidentiality, encryption, accessibility, and archive requirements.

**Unresolved question Q-PDF-01.** Which PDF profile, version, font policy, tagging/accessibility policy, encryption policy, and validator will define V1 circulation and archive copies? “PDF” alone is underspecified.

**Unresolved question Q-PDF-02.** What visual-diff tolerance distinguishes harmless anti-aliasing differences from material layout changes? No authoritative banker-specific threshold was found.

## 9. Findings: CSV and JSON Are Portability Formats, Not Native Banker Models

### 9.1 CSV

**Verified fact F-CSV-01.** RFC 4180 documents a common CSV convention and registers `text/csv`, while acknowledging wide variation among implementations. It describes records, an optional header, quoting, commas, and line breaks. [S23]

**Verified fact F-CSV-02.** CSV syntax does not define investment-banking field semantics, datatypes, units, currency, period, primary keys, relationships, provenance, or schema version. [S23]

**Verified fact F-CSV-03.** Microsoft states that exporting an Excel workbook to CSV/text removes formatting and loses graphics, objects, and other workbook features; CSV saves values/text from one active worksheet rather than the workbook model. [S11]

**Verified fact F-CSV-04.** W3C CSVW provides a separate metadata model for table/column/row/cell annotations, datatypes, dialect, keys, and validation. [S24, S25]

**Evidence-backed inference I-CSV-01.** CSV is suitable for portable tracker rows, ledger records, schedules, and simple tables, but it cannot substitute for an XLSX model or preserve banker-native formulas and presentation behavior.

**Product design implication P-CSV-01.** Every product-owned CSV export should have a stable documented schema and include or accompany:

- schema name and version;
- export timestamp and exact Deal/Deliverable Revision identifiers;
- UTF-8 encoding and explicit delimiter/header conventions;
- stable column identifiers separate from display labels;
- datatype, null, date/time/time-zone, decimal scale, unit, currency, and period rules;
- stable row/object IDs and relationship keys;
- source/evidence references where the rows carry derived or evidentiary content;
- withdrawn/stale/superseded disposition fields where relevant;
- checksum/manifest binding inside an export package.

**Product design implication P-CSV-02.** Re-import should validate schema version, headers, row identifiers, required fields, datatype/precision, and referential integrity before creating new Deal Workspace objects. Unknown columns should be preserved or explicitly rejected, never silently dropped.

### 9.2 JSON

**Verified fact F-JSON-01.** JSON is a portable text interchange syntax; object-member ordering is not semantically significant and number interoperability depends on implementation limits. [S26]

**Evidence-backed inference I-JSON-01.** A JSON export requires a product-defined schema and version. Consumers must not derive business meaning from object property order.

**Product design implication P-JSON-01.** Financial decimals, percentages, and currency values should use an explicit schema that preserves intended precision and scale. If the implementation cannot guarantee exact numeric round trip across consumers, use a string representation plus a declared datatype/scale rather than relying on generic JSON binary floating-point behavior.

**Product design implication P-JSON-02.** JSON is appropriate for a machine-readable archive manifest, provenance graph, QC evidence, and object export. It is not automatically Banker-native merely because it is structured and portable.

**Unresolved question Q-STRUCT-01.** Will V1 expose a public structured-export schema, a private archive manifest, or both? CSVW and JSON Schema-like approaches provide mechanisms, not the product boundary.

## 10. Findings: Provenance and Exact Native Citation Locators

### 10.1 General provenance model

**Verified fact F-PROV-01.** W3C PROV distinguishes Entities, Activities, and Agents, and can represent use, generation, derivation, attribution, primary source, revision, and invalidation. [S27]

**Verified fact F-PROV-02.** W3C selectors can identify a specific resource segment using a selector and state. Text quote, text position, byte position, fragment, XPath, and range selectors are examples. The W3C warns that position selectors are brittle when the underlying resource changes and recommends also recording state. [S28]

**Evidence-backed inference I-PROV-01.** A citation that records only a human-readable footnote or only a mutable location is insufficient for durable machine lineage. It needs exact source-version identity and a selector appropriate to the source representation.

**Product design implication P-PROV-01.** The Deal Workspace can use a PROV-like pattern without adopting RDF as a V1 format:

- Source Record version, extracted Evidence, Model input, chart/table/paragraph, Native Artifact, PDF, and archive copy are identifiable entities;
- ingestion, extraction, normalization, calculation, generation, Banker edit, recalculation, render, and circulation are activities;
- human, AI, deterministic engine, and external author/provider are distinguishable agents/origins;
- `used`, `generated`, `derived from`, `revision of`, `primary source`, and `invalidated/withdrawn` relations remain queryable.

**Product design implication P-PROV-02.** An exact native citation locator should include the source version/digest plus format-specific selectors. Recommended selector profile for Ticket 8 consideration:

| Source type | Human-readable locator | Machine locator components | Stability safeguard |
|---|---|---|---|
| PDF | page, section/table/figure, quoted label | Source Record version/digest, page object/index, text quote plus prefix/suffix or region coordinates | store exact source bytes/render and quote context |
| XLSX | file, sheet, cell/range, table/name | source digest, workbook/sheet stable identity, address/table/name, formula/value role | record sheet/name/address moves and retain prior version |
| PPTX | file, slide number/title, object/footnote | source digest, slide part/stable ID, shape/chart/table ID, text quote or region | visible slide number is Revision-specific; retain slide stable ID |
| DOCX | file, heading/page, paragraph/table | source digest, document part, paragraph/bookmark/content-control ID, text quote plus context | page number may change after reflow; bind structural and quote selectors |
| HTML | URL, heading, quoted text | retrieval timestamp/state, canonical URL, DOM/CSS/XPath selector, quote context | retain captured representation because live DOM can change |
| CSV/JSON | file, row/object ID, field | source digest, schema version, stable record/object ID, field path | do not rely on row number or object-member order alone |

The Office-specific selector profile above is a Product Design Implication, not a W3C or Microsoft-mandated schema.

**Product design implication P-PROV-03.** File-visible footnotes and citations should remain reader-friendly, but the machine lineage in the Deal Workspace must be richer. A slide footnote should resolve to source-to-slide and source-to-object lineage; a workbook comment should not be the only source-to-cell record.

**Product design implication P-PROV-04.** Generated narrative cannot cite itself. It must resolve through the generation activity to Source Records/Evidence, Model outputs, Banker Assumptions, or explicitly labeled unsupported judgment. This is consistent with PROV’s separation of entities and generating/using activities and with the repo’s evidence-bounded AI contract.

**Unresolved question Q-PROV-01.** Which stable IDs can be preserved reliably through Banker edits in Excel, PowerPoint, and Word without degrading native usability? The standards provide several IDs/locations but do not guarantee that all authoring operations retain them.

## 11. Findings: Revision, Hash Binding, and Exact Circulated Copies

### 11.1 Byte identity versus semantic identity

**Verified fact F-REV-01.** NIST FIPS 180-4 defines secure hash algorithms whose digests can be used to detect whether electronic data changed after the digest was generated. [S29]

**Verified fact F-REV-02.** OPC package signatures can cover selected package parts and relationships; a validation check fails if signed content is modified. [S30]

**Evidence-backed inference I-REV-01.** A cryptographic digest can bind an exact exported file, but it does not prove that the file is correct, approved, current, safe to circulate, or semantically equivalent to another format.

**Product design implication P-REV-01.** Every Native Artifact, rendered preview, PDF, CSV/JSON export, and archive package should receive:

- immutable artifact ID;
- exact Deliverable Revision ID;
- byte digest using a current approved algorithm such as SHA-256;
- media type and format/profile version;
- generator/importer identity and version;
- creation/import time;
- parent/predecessor artifact and derivation activity;
- source/model/process snapshot identifiers;
- audience/purpose profile where applicable;
- status and supersession/withdrawal history.

**Product design implication P-REV-02.** A Native Artifact edited outside the product must not replace the prior artifact in place. Import should retain the original bytes, calculate a new digest, identify changed regions/objects, record the human-authored origin of the differences, and create a new candidate Revision or controlled artifact branch according to the later Ticket 8 revision decision.

**Product design implication P-REV-03.** An exact circulated copy should archive the actual bytes sent or made available, not merely the template and regeneration inputs. The archive manifest should bind the copy to exact Revision, audience, purpose, decision, conditions, distribution event, and digest.

**Product design implication P-REV-04.** A regenerated file that is semantically intended to be “the same” but has a different digest is a different artifact. The system may establish semantic equivalence through explicit comparison evidence, but must not represent byte identity.

**Unresolved question Q-REV-01.** Will V1 use package digital signatures, ordinary digests in a protected manifest, or both? Digital signatures introduce certificate, signer identity, trust-chain, coverage, and validation-policy questions beyond a basic exact-copy digest.

## 12. Findings: US Recordkeeping Sources Are Conditional Constraints, Not a Universal Deliverable Standard

**Verified fact F-REG-01.** FINRA Rule 2210 defines correspondence, retail communications, and institutional communications. For covered retail and institutional communications it requires records that include a copy, dates of first/last use, specified approval/preparer information, and sources of statistical tables, charts, graphs, or illustrations. It also imposes fair, balanced, non-misleading content standards. [S31]

**Verified fact F-REG-02.** FINRA Rule 4511 requires FINRA-required books and records to use media compliant with Exchange Act Rule 17a-4. [S32]

**Verified fact F-REG-03.** The SEC’s Rule 17a-4 audit-trail alternative requires a complete time-stamped audit trail of creation, modification, and deletion sufficient to recreate the original record, for records within the rule’s scope. [S33]

**Evidence-backed inference I-REG-01.** Version history, source lineage for charts/tables, exact circulated-copy retention, preparer/reviewer identity, and reproducibility are compatible with regulated broker-dealer recordkeeping expectations.

**Product design implication P-REG-01.** The Deal Workspace and export/archive design should make it possible to preserve exact copies, sources of illustrations, revisions, decisions, and a time-stamped audit trail. It should not claim FINRA/SEC compliance solely because these fields exist.

**Applicability limitation L-REG-01.** A teaser, CIM, process letter, management deck, bid analysis, or internal review artifact is not automatically a FINRA Rule 2210 communication. Applicability depends on the firm, recipient, distribution, content, and governing supervisory procedures.

**Applicability limitation L-REG-02.** FINRA and SEC sources do not define a universal “banker-ready” quality threshold for M&A work products. They should not be used to invent slide-density, valuation, model, or citation thresholds.

## 12A. SEC EDGAR Evidence of Actual Sell-Side Auction Artifact Families

Two public SEC-filed transaction histories provide narrow, primary evidence that the artifact families under consideration are used together in real sell-side processes.

**Verified fact F-DEAL-01.** Ryerson’s 2007 public transaction history describes financial-advisor work to finalize a confidential information memorandum, negotiate confidentiality agreements with potential strategic and financial buyers, establish an electronic data room, conduct management presentations, receive bids, and receive bidder markups of a proposed merger agreement. [S34]

**Verified fact F-DEAL-02.** FNFV’s 2017 merger proxy describes buyer meetings followed by distribution of a confidential information memorandum and financial model, electronic-data-room access, indications of interest, updated financial projections supplied to bidders, and requests for final proposals plus merger-agreement markups. [S35]

**Evidence-backed inference I-DEAL-01.** A sell-side auction’s banker work product is not naturally represented by one static document. The cited public histories show linked narrative materials, financial analysis/model content, buyer/process status, diligence access, bids, process communications, and legal-document responses evolving across stages.

**Product design implication P-DEAL-01.** Ticket 8 has primary-source support for treating the CIM, financial model, buyer/process tracker, management materials, bid comparison, diligence/source records, process letters, and frozen circulated copies as related but separately revisioned artifacts. The precise V1 architecture and required/conditional status remain the parent Ticket’s decision.

**Applicability limitation L-DEAL-01.** These SEC filings are retrospective public disclosures and do not reproduce the complete internal banker files, workbook structures, source ledgers, QC records, or review history. They prove the coexistence and sequencing of artifact families, not their native file format, template, required fields, or quality threshold.

**Applicability limitation L-DEAL-02.** A public-company merger proxy is not a universal template for private middle-market M&A. The examples are corroborating workflow evidence only and should not override the Initial Design ICP or V1 boundary.

## 13. Cross-Format Verifiable Quality Constraints

The following matrix translates the external evidence into candidate checks. “Candidate” means Ticket 8 may adopt or refine the check; it is not an externally mandated V1 architecture.

| Quality concern | Deterministic / structural evidence | Render or application evidence | Human / semantic evidence | External basis |
|---|---|---|---|---|
| Package corruption | ZIP/OPC open; content types; required parts; relationship targets; schema validation | native app open/save | confirm no content was intentionally omitted | S01–S03, S12, S16 |
| Unsupported extension loss | inventory namespaces/parts before and after; compare manifests | open in target app; inspect compatibility warnings | accept/reject loss | S19 |
| Formula preservation | formula-text comparison; cell role; dependency/external-link inventory | full target-engine recalc | approve inputs/overrides | S04, S05, S08 |
| Cached-value staleness | compare stored cache to recalculated value | target-engine recalc/rebuild | assess business impact | S04, S08 |
| Model errors | scan error cells, circular/external links, broken references | recalc in declared engine | judge whether intentional | S04, S08 |
| Units/currency/dates | metadata/label/number-format consistency | visual inspection | confirm meaning and convention | S09 |
| Hidden content | enumerate hidden rows/columns/sheets and active content | open target app | decide acceptability | S06, S10 |
| Native editability | count native objects versus raster replacements; preserve parts/styles/formulas | edit sample objects in native app and save/reopen | Banker judges maintainability | S03, S11–S18 |
| Template preservation | compare theme/master/layout/style/placeholder parts | render in target app | Banker assesses firm-template fit | S12, S13, S18 |
| PPTX overflow/clipping | geometry/text-bound heuristics | rendered-slide inspection | Banker visual review | S02, S12 |
| DOCX pagination | section/style/table/field integrity | render/page inspection | Banker review of pagination | S02, S16–S18 |
| PDF font/render reliability | font/embed/profile inventory; page count | render every page; compare to source render | accept material visual differences | S20–S22 |
| Native/PDF parity | structured content/number/citation comparison | page/slide visual diff | review material discrepancies | S02, S15, S20 |
| CSV portability | RFC parsing, schema/header/type/key validation | import into benchmark consumers | confirm semantics | S23–S25 |
| JSON portability | RFC parsing, schema and precision tests | round-trip through benchmark consumers | confirm financial meaning | S26 |
| Source locator durability | source digest plus selector/state validation | open exact source at target | verify citation supports claim | S27, S28, S29 |
| Exact-copy identity | digest/manifest validation | open archived bytes | verify audience/purpose/use record | S29, S30, S31, S33 |
| Revision reproducibility | regenerate from pinned inputs/engine; compare structure and material outputs | render comparison | approve expected intentional differences | S27–S30 |

### 13.1 Candidate critical failures supported by format mechanics

The following are strong candidates for a release or circulation blocker because they invalidate the artifact mechanism, not because an authority prescribed a banker-specific numeric threshold:

- the file is corrupt, cannot be opened in the declared target application, or has broken required relationships;
- recalculation produces formula errors, broken links, circular-reference behavior outside the declared model contract, or materially different outputs that have not been assessed;
- the workbook or deck silently loses formulas, chart data, comments/notes required for review, unsupported extensions, hidden dependencies, macros, or external links during round trip;
- material native text, tables, charts, or model structures are replaced with non-editable images without explicit classification;
- Native Artifact and PDF disagree on material text, numbers, tables, charts, citations, confidentiality markings, or audience qualifications;
- the PDF has missing/substituted fonts or render failures that materially change the intended reader representation;
- a source locator cannot resolve against the exact Source Record version or points to content that does not support the claim;
- the exact circulated copy cannot be identified and reproduced from archived bytes/digest;
- a new artifact or Revision incorrectly inherits prior review/authorization merely because it has the same filename or business title.

Whether a discrepancy is “material” requires the product’s severity policy and Banker judgment; no universal quantitative threshold was found.

## 14. Proposed Evidence Retained Per QC Run

This is a Product Design Implication, derived from the mechanisms above.

Every artifact QC run should retain a machine-readable and human-viewable record containing:

- Deal, Deliverable, Revision, artifact, and source/model snapshot IDs;
- artifact digest, media type, profile, size, package part inventory, and target application/version;
- validator/recalculator/renderer identity and version;
- calculation mode, recalculation method, and formula/cache/error deltas for XLSX;
- master/layout/theme/style/comment/note/external/embedded/active-content inventories for OOXML;
- render pages/slides or durable render references plus page/slide dimensions;
- PDF font/profile/encryption/attachment/script inventory and native-to-PDF comparison result;
- each finding’s exact artifact location, evidence, severity, owner, disposition, and readiness consequence;
- origin of corrections and whether protected Banker content changed;
- prior and new artifact digests after correction;
- unresolved implementation limitations and manual checks required.

This evidence is not itself an External-Use Decision.

## 15. Claim-to-Source Mapping

This table is intentionally explicit so later Ticket 8 text can distinguish external fact from product choice.

| Claim ID | Classification | Claim | Source(s) | Applicability / limitation |
|---|---|---|---|---|
| C01 | Verified fact | OOXML defines document vocabularies and package conventions for Word, Excel, and PowerPoint files | S01 | Format scope only |
| C02 | Verified fact | OOXML files contain typed parts connected by relationships | S01, S03, S12, S16 | Does not prove professional usability |
| C03 | Verified fact | Open XML SDK does not guarantee validity | S02 | Other validators may add checks |
| C04 | Verified fact | Open XML SDK does not provide Word layout | S02 | Word/other renderers can provide layout |
| C05 | Verified fact | Open XML SDK does not provide Excel recalculation/data refresh | S02 | Excel/other engines can calculate |
| C06 | Evidence-backed inference | Schema validity cannot establish render parity or business correctness | C02–C05 | Must be evaluated through layered checks |
| C07 | Verified fact | Spreadsheet formulas and cached values are stored separately | S04 | Cache may be absent or stale |
| C08 | Verified fact | Calculation chain is last calculation order, not dependency graph | S05 | Not a correctness proof |
| C09 | Verified fact | Excel supports recalculation and dependency-tree rebuild behavior | S08 | Behavior depends on workbook/engine/settings |
| C10 | Product design implication | Current model claims require target-engine recalculation evidence, not cache trust | S02, S04, S05, S08 | Exact engine/version remains open |
| C11 | Verified fact | Hidden and VeryHidden sheets are discoverable states | S06 | Acceptability is a product/user decision |
| C12 | Verified fact | Defined names can map names to ranges | S07 | Names do not prove source lineage |
| C13 | Verified fact | Cell number formats affect rendered appearance | S09 | Meaning must be carried separately |
| C14 | Verified fact | XLSX cannot store VBA/Excel 4.0 macros; XLSM is macro-enabled | S10 | Does not set V1 policy |
| C15 | Product design implication | Active content and external dependencies require explicit preflight and preservation/blocking policy | S10, S19 | Safety/product policy remains unresolved |
| C16 | Verified fact | CSV/text export loses workbook formatting and objects | S11 | Product-defined CSV remains useful for simple tables |
| C17 | Evidence-backed inference | CSV cannot substitute for an editable financial model | S11, S23 | Could carry values, not workbook behavior |
| C18 | Verified fact | PresentationML separates slides, masters, layouts, and themes | S12, S13 | No banker template prescribed |
| C19 | Verified fact | Presentation slides can include text, shapes, tables, charts, comments, and notes | S12, S14 | Feature support varies by application/version |
| C20 | Verified fact | Picture presentations lose information | S15 | Does not enumerate every lost feature |
| C21 | Evidence-backed inference | A full-slide-image PPTX is not banker-native editability | S12, S15 | Some raster content can be legitimate |
| C22 | Product design implication | Template compatibility requires preserving masters/layouts/themes/placeholders, not visual imitation only | S12, S13, S19 | Compatibility target must be declared |
| C23 | Evidence-backed inference | XML checks cannot detect clipping, overflow, hierarchy, or legibility | S02, S12 | Render and human checks required |
| C24 | Product design implication | PPTX QC requires target-application rendering and exact-Revision PDF comparison | S02, S15 | Renderer/tolerances remain open |
| C25 | Verified fact | WordprocessingML has structured paragraphs, runs, styles, tables, comments, headers/footers, notes, and settings | S16–S18 | Structure is not pagination quality |
| C26 | Evidence-backed inference | Valid DOCX can still be hard to edit or professionally unusable | S02, S16–S18 | Requires benchmark/manual review |
| C27 | Product design implication | DOCX quality requires both semantic structure checks and rendered pagination checks | S02, S16–S18 | Exact Word compatibility target open |
| C28 | Verified fact | PDF is a page-description format | S20 | PDF versions/profiles differ |
| C29 | Verified fact | Font embedding reduces substitution; restrictions can cause substitution/rasterization | S21 | Not universal pixel identity |
| C30 | Verified fact | PDF/A is a standardized long-term-preservation profile | S22 | Not automatically suitable for circulation |
| C31 | Evidence-backed inference | PDF is suited to frozen reader representation but not replacement of native Office structures | S15, S20, S21 | Some PDF editing is possible but not equivalent |
| C32 | Product design implication | Native artifact and PDF require exact Revision/digest/generator binding and parity checks | S15, S20, S21, S29 | Comparison method remains open |
| C33 | Verified fact | RFC 4180 defines a common CSV convention and acknowledges implementation variability | S23 | Informational, not a full schema standard |
| C34 | Verified fact | CSVW can attach schema-like metadata to tables and validate columns/types/keys | S24, S25 | Optional product profile |
| C35 | Product design implication | CSV export requires versioned field schema, types, IDs, units, currency, period, and source metadata | S23–S25 | Specific schema is product-owned |
| C36 | Verified fact | JSON object order is not semantically significant; number interoperability has limits | S26 | Specific consumers may impose tighter rules |
| C37 | Product design implication | JSON needs a versioned schema and explicit decimal/scale handling | S26 | Encoding choice is product-owned |
| C38 | Verified fact | PROV can represent entity/activity/agent, derivation, revision, primary source, and invalidation | S27 | General vocabulary, not Deal schema |
| C39 | Verified fact | Web selectors can identify exact resource segments and position selectors are brittle after edits | S28 | Office-specific selector profile required |
| C40 | Product design implication | Machine citations require exact source version/digest plus format-specific selector and state | S27–S29 | Selector stability must be benchmarked |
| C41 | Evidence-backed inference | File footnotes alone are insufficient for source-to-cell/slide/paragraph lineage | S27, S28 | Footnotes remain important reader UI |
| C42 | Verified fact | Secure hash digests detect byte changes | S29 | Do not prove correctness/authorship/approval |
| C43 | Verified fact | OPC signatures can detect modification to signed parts/relationships | S30 | Coverage and trust policy required |
| C44 | Product design implication | Exact circulated bytes and digest must be archived, not only regeneration inputs | S29, S30, S31, S33 | Retention duration/scope varies |
| C45 | Verified fact | FINRA 2210 can require source information for statistical tables/charts/graphs in covered communications | S31 | Conditional applicability only |
| C46 | Verified fact | FINRA-required records must comply with Rule 17a-4 media requirements | S32 | Only records within rule scope |
| C47 | Verified fact | Rule 17a-4 audit-trail alternative retains time-stamped changes and supports recreation of the original | S33 | Regulated entity/record scope only |
| C48 | Evidence-backed inference | Revision history, exact copies, source lineage, and reproducibility align with regulated recordkeeping needs | S31–S33 | Does not establish compliance certification |
| C49 | Unresolved question | No authoritative source defines banker-specific numerical quality thresholds for slide/model/document usability | S01–S35 reviewed | Must be set and benchmarked as Product Design Decisions |
| C50 | Product design implication | Native editability requires edit/save/reopen benchmark tests, not merely “file opens” | S02, S11–S19 | Benchmark suite and target apps open |
| C51 | Verified fact | SEC-filed transaction histories identify CIMs, financial models, data rooms, management presentations, bids/IOIs, process communications, and agreement markups in sell-side processes | S34, S35 | Retrospective public descriptions, not full internal files |
| C52 | Evidence-backed inference | Sell-side work products operate as a staged related set rather than one static file | S34, S35 | Exact V1 architecture remains a Product Design Decision |
| C53 | Applicability limitation | SEC public transaction histories do not establish native format, template, QC, source-lineage, or banker-readiness thresholds | S34, S35 | Use only as workflow corroboration |

## 16. Applicability Limits and Non-Claims

1. ECMA-376 and Microsoft Learn describe file structures and application behavior; they do not certify a workbook, deck, or document as professionally suitable for an M&A transaction.
2. Microsoft Support statements about PDF preserving formatting are useful first-party intent statements but are not a canonical pixel-equivalence guarantee.
3. PDF/A is an archive-focused standard family. This research does not recommend PDF/A-1, PDF/A-2, PDF/A-3, PDF/UA, PDF/X, or ordinary PDF as the V1 default.
4. RFC 4180 is informational and CSVW is a general W3C model. Neither defines the product’s tracker, ledger, or schedule schema.
5. W3C PROV and selector models provide reusable concepts. This research does not require RDF, JSON-LD, Web Annotation serialization, or public provenance APIs in V1.
6. SHA-256 or another digest can bind bytes but cannot establish that two different files are semantically equivalent or that a file is approved for external use.
7. FINRA and SEC recordkeeping rules apply conditionally. This research does not classify every Sell-Side Auction artifact as a regulated communication or required record and does not claim compliance.
8. No real confidential deal material was used. No artifact was generated, modified, opened, recalculated, rendered, or benchmarked as part of this research.
9. No external source reviewed justifies silently replacing native Office objects with images, trusting cached formula values, or treating a static PDF as the only banker-owned artifact.

## 17. Questions Ticket 8 or Later Product Design Must Resolve

These are mechanism questions, not new Wayfinder tickets unless the parent map determines they cannot fit existing Tickets 9–12.

1. Declared target versions for Excel, PowerPoint, Word, and PDF readers on Windows/macOS.
2. Strict versus Transitional OOXML, extension preservation, and compatibility-warning policy.
3. Full supported-feature inventories for XLSX/PPTX/DOCX round trip.
4. Macro-enabled files, external links, embedded packages, OLE, Power Query/data connections, and active-content policy.
5. Calculation engine, recalculation mode, iterative/circular calculation policy, and formula-compatibility benchmark.
6. Stable source-to-cell, source-to-slide/object, and source-to-paragraph selector profile through Banker edits.
7. Protected-region and three-way-merge behavior for Banker-edited native artifacts.
8. PPTX/DOCX renderer of record and acceptable parity tolerances.
9. PDF version/profile, font embedding, encryption, tagging/accessibility, hyperlink, attachment, and archive policy.
10. Versioned CSV/JSON schemas, decimal handling, metadata manifest, and re-import compatibility guarantees.
11. Artifact digest and optional signature policy.
12. Benchmark corpus and Critical/Major/Minor thresholds for structure, numeric integrity, evidence, editability, rendering, and professional usability.

## 18. Compact Handoff to the Ticket 8 Decision

The strongest externally supported conclusions are:

1. **Native editability is structural.** XLSX, PPTX, and DOCX carry formulas, parts, relationships, styles, masters, layouts, comments, notes, tables, charts, and other editable semantics that images/PDF/HTML do not replace.
2. **Conformance is not usability.** Package/schema validation is necessary, but Microsoft explicitly separates it from Word layout, Excel recalculation/refresh, and format conversion.
3. **Cached results are not current results.** XLSX formulas and cached values are distinct; a current model output requires controlled recalculation evidence.
4. **Rendering is an independent gate.** PPTX and DOCX must be rendered in a declared environment; PDF must be compared to the exact source Revision and inspected for fonts, missing content, clipping, and material differences.
5. **PDF is a frozen companion representation.** It is suitable for reader/circulation identity but cannot replace the banker-native source artifact.
6. **CSV/JSON are portability formats.** They require stable product-owned schemas, IDs, datatypes, precision, units, currency, periods, source references, and schema versions.
7. **Lineage needs version plus location.** Exact source bytes/digest plus format-specific selectors and generation/revision activities are stronger than footnotes alone.
8. **Exact circulation needs exact bytes.** Digests, immutable artifact IDs, audience/purpose binding, and archived transmitted bytes prevent a regenerated approximation from masquerading as the circulated copy.
9. **Regulatory sources support rigor but not a universal quality score.** FINRA/SEC evidence favors exact copies, sources for illustrations, review/preparer identity, and time-stamped audit trails where applicable, but does not define banker-specific aesthetic or model thresholds.
10. **No authoritative universal numerical thresholds were found.** Later thresholds must be explicit Product Design Decisions validated against rights-cleared benchmark artifacts.
