# FilingProof v0.1 — Legal PDF Technical Preflight

Public beta: https://greenkappalabs.art/filingproof/

Select up to 12 authorized PDF files (100 decimal MB per file limit), or run the built-in synthetic example. Review technical issues and limitations. Export JSON or print/save PDF from the browser.

## Architecture

- Static HTML/CSS/JavaScript on GitHub Pages; zero upload backend.
- Browser-side PDF parsing with pinned Mozilla PDF.js v6.5.438, dynamically loaded via jsDelivr or unpkg CDN. The PDF.js worker uses the same distribution and version.
- The parser loads JavaScript from a third-party CDN, but the document bytes remain inside the tab. Filenames, document text and bytes are not sent to GreenKappa servers.
- Pure, independently tested preflight rules in core.mjs, separate from document inspection in app.mjs.
- SHA-256 hashes, file sizes, page coverage, document-level JavaScript indications, AcroForm fields, embedded PDF files, and searchable-text availability are evaluated where supported.
- Extractable text scanning is limited to the first 150 pages of a document. Partial scans are marked as review.
- Limited SSN-format pattern screening is not a complete privacy or redaction check.
- Each exported report includes filenames, hashes and findings, but no extracted document text. Exported filenames and findings may still be sensitive.

## Profiles & source provenance

General PDF diagnostics assumes no court-specific size limit. Source: https://www.pacer.uscourts.gov/file-case/how-file-case

The District of Oregon reference profile includes a **subset** of published technical criteria (searchable text, flattening fillable forms, attachments, active-content warnings); it does not assume a court size limit. Source: https://ord.uscourts.gov/index.php/filing-and-forms/cm-ecf/user-manual/187-section-05-electronic-filing-protocols/2079-creating-and-filing-documents

Both sources reviewed November 16, 2026; no automated policy updates.

## Exclusions

No OCR, legal advice, actual e-filing, judicial acceptance check, malware scan, exhaustive active-content inspection, electronic signature validation, or redaction certification. Handle sealed, privileged and protected documents only with authorization.

## Tests

node --check filingproof/core.mjs
node --check filingproof/app.mjs
node --test filingproof/tests/core.test.mjs

The bundled GitHub Actions workflow runs syntax checks and deterministic unit tests. Real-browser smoke testing remains a separate acceptance gate.
