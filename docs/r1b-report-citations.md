# Report Studio citation files

Report Studio exports three UTF-8 files in one ZIP. The selection, evidence order, template, language and generation time come from the open brief. Searching or filtering the evidence list controls which rows are visible. The selected rows determine inclusion. The archive contains three files.

| File | Research use |
|---|---|
| `citations.bib` | Import the bibliography into a BibTeX-aware tool. |
| `citations.csl.json` | Import structured citation items into a CSL-aware tool. |
| `report_manifest.json` | Trace each citation to selected evidence, inspect recorded values and filters, and read the recorded warnings and their attribution limits. |

The ZIP is built in the browser. It includes the selected material and user-authored text described by the manifest. The existing Notebook JSON and ZIP actions serve the separate purpose of project backup.

## Bibliographic field mapping

| Recorded fact | Bibliographic use |
|---|---|
| Source ID and Notebook identity | Namespaced citation key. The manifest retains the recorded IDs and connects separately identified sources even when URLs coincide. |
| Source's recorded dataset/title string | Source title in its recorded language. The name of this Notebook field supplies no document-type evidence. |
| Source institution | Preserve the institutional name with its recorded role unspecified. Authorship, publishing and issuing responsibility require separate evidence. |
| Source URL | Validated HTTPS reference. Serializers handle URL syntax separately from bibliographic prose. |
| Retrieval date | A calendar-valid supported date can supply access information. The manifest preserves the source string and identifies dates that cannot be structured reliably. |
| Update date | Recorded source revision metadata. It cannot establish a publication date. |
| Source code, layer, original and normalized units | Preserve the recorded strings with the source in the manifest. |
| Atlas research URL, evidence ID, collection time | Separate Atlas view citation linked to the evidence. Collection time describes Notebook activity. |
| Report time | The active report's generation time and the archive creation time. |

The v1 source schema provides no dedicated field for an original publication date, document type, DOI, edition, or author/publisher role. Original references use BibTeX `@misc` and CSL `document`. Atlas view references use BibTeX `@misc` and CSL `webpage`. Citation keys encode the Notebook ID, reference category and recorded ID. They identify records within a Notebook and carry no cryptographic guarantee. A source's historical reference period, election date, retrieval, update and report generation date all remain distinct from a publication date.

## Validated import behavior

The native CSL file passes the official CSL 1.0.2 input schema, pinned in the test fixtures. Classic BibTeX 0.99e parsed all four interchange fixture entries. Pandoc 3.10 imported both formats and preserved citation IDs, access dates, full multilingual titles, paired braces, literal backslashes and URL query strings. Its BibTeX reader may omit a single unpaired brace in imported text and may leave the type blank when converting `@misc` to CSL. The native CSL file preserves the recorded characters and supplies its own validated item type. Zotero interoperability awaits a direct import test.

## Reading the manifest

The `atlas-research-report-manifest-v1` manifest records the project and Notebook identities, the report template and timestamp, ordered evidence IDs, source-to-evidence relationships, bibliographic gaps, and limitations. Evidence retains its original canonical identifiers, periods, layers, user notes, warnings, and available filters. An explicit null value survives as JSON null. A missing value field remains absent. Distinct citations for the Atlas view and the original source allow a researcher to follow either path.

The Markdown and HTML reports include a Notebook-wide warnings section. The corresponding manifest field, `limitations.notebook_warning_aggregate.warnings`, copies the entire recorded `methodology_warnings` list in order, including duplicates. Its `attribution` is `scope_uncertain` because Notebook v1 records no evidence IDs for these entries. A Notebook-wide warning can concern excluded evidence or repeat a selected item's wording.

For a limitation attached to a selected item, follow `limitations.evidence[].evidence_id` to that item's `warnings` and any localized `warning_labels`. The reports use the available label for the chosen language and include the original wording when it differs. Excluded evidence records and sources used only by them stay outside the bundle.

A saved observation reports what that Notebook item recorded. A live configuration records how to reopen a research view. A method reference carries its saved registry or blocked status. These classifications do not certify a complete dataset, the inputs to a model or a historical website deployment. For example, the German 1990 ballot carries its own valid-vote denominator, and the Hungarian 1998 territorial-list composite carries both polling dates. Report export cannot add single-round turnout to that composite or release a blocked VAR/IRF result.

## Bibliographic evidence handoff for Claude Code

For each proposed enrichment, identify the exact existing source and revision using its recorded ID, title, code, URL, layer and available dates. Locate the authoritative catalogue entry, dataset release record, title page or legally published notice. Return the field and value, its meaning, a stable source locator or page, the field's evidence and retrieval date, and any conflict or reuse restriction. A revision date on a live webpage alone is insufficient to establish an issue date.

| Field requiring admission | Evidence to collect |
|---|---|
| Original publication/issue date and its precision | A dated original issue or explicit publisher metadata tied to the cited work/revision. |
| Bibliographic type | The authority's description of this item as a dataset, report, statute, notice, article or other work. |
| Author, issuing body, publisher | An explicit credit for each distinct role. |
| Edition, data release or vintage | A named edition or version and the precise resource to which it applies. |
| DOI, gazette issue, official notice identifier | An authoritative identifier resolving to the same publication, with issue or notice scope documented. |

Unverified fields stay open. If bibliographic evidence is admitted later, submit a separate proposal for a versioned field schema, validation, optional migration of legacy projects, backups and cross-project restore. This contribution reads the current Notebook and project schemas.

## R1-C handoff

A future snapshot binding should identify the manifest schema version, selected evidence ID and source ID, the original canonical identifiers and configuration, and the exact artifact to which they apply. A binding would additionally need a format/schema, byte length, cryptographic digest with the hashed bytes defined, a verifiable retrieval or version locator, and the applicable redistribution rights. Figures would need a traceable relationship to the admitted input artifact and rendering specification. Binding and verifying an artifact would be a separate operation. The three R1-B files describe recorded evidence and links.
