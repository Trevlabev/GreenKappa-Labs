/**
 * FilingProof v0.1: deterministic, court-neutral PDF preflight rules.
 * No court acceptance claims; manually review procedural and legal requirements.
 */
export const VERSION = "0.1.0";
export const PROFILE_OPTIONS = Object.freeze({
  baseline: {
    id: "baseline", name: "General PDF diagnostics", type: "general",
    jurisdiction: "No jurisdiction selected",
    maxMB: null, requireSearchable: false, disallowForms: false,
    disallowAttachments: false, disallowScripts: false, sourceUrl: "https://www.pacer.uscourts.gov/file-case/how-file-case",
    sourceTitle: "PACER: How to File a Case", reviewed: "2026-11-16"
  },
  oregon: {
    id: "oregon", name: "U.S. District Court — District of Oregon (reference)",
    type: "court-reference", jurisdiction: "District of Oregon (federal)",
    maxMB: null, requireSearchable: true, disallowForms: true,
    disallowAttachments: true, disallowScripts: true,
    sourceUrl: "https://ord.uscourts.gov/index.php/filing-and-forms/cm-ecf/user-manual/187-section-05-electronic-filing-protocols/2079-creating-and-filing-documents",
    sourceTitle: "District of Oregon: Creating and Filing Documents", reviewed: "2026-11-16"
  }
});
export function safeProfile(input = {}) {
  const base = PROFILE_OPTIONS[input.id] || PROFILE_OPTIONS.baseline;
  const maxMB = input.maxMB == null || input.maxMB === "" ? base.maxMB : Number(input.maxMB);
  if (maxMB !== null && (!Number.isFinite(maxMB) || maxMB <= 0 || maxMB > 10000)) throw new Error("Maximum size must be between 0 and 10,000 MB.");
  const profile = {...base, maxMB};
  for (const field of ["requireSearchable", "disallowForms", "disallowAttachments", "disallowScripts"]) {
    if (typeof input[field] === "boolean") profile[field] = input[field];
  }
  return profile;
}
export function humanBytes(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "Unknown";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KiB";
  return (n / (1024 * 1024)).toFixed(2) + " MiB";
}
export function evaluateDocument(raw, profileInput = {}) {
  const p = safeProfile(profileInput);
  const d = raw || {};
  const checks = [];
  const add = (id, label, status, message, source = "diagnostic") => checks.push({id,label,status,message,source});
  const parsed = d.parsed === true;
  if (d.headerOk === true) add("signature", "PDF file header", "pass", "A PDF header was found.");
  else add("signature", "PDF file header", "warning", "A standard %PDF- header was not found in the inspected prefix.");
  if (!parsed) {
    add("parse", "Open and parse document", "blocked", d.error || "The document could not be inspected.");
    add("contents", "Document internals", "not-run", "Document checks could not run.");
    add("privacy", "Confidentiality and redaction", "review", "Human review is required. No automated redaction validation is performed.");
    return makeResult(d,p,checks);
  }
  add("parse", "Open and parse document", "pass", "PDF parser opened " + d.pages + " page(s).");
  if (p.maxMB === null) add("size", "File-size limit", "not-run", "No verified court-specific maximum is configured. Confirm the destination's current limit.");
  else {
    const limit = p.maxMB * 1000000;
    add("size", "File-size threshold", Number(d.sizeBytes) > limit ? "warning" : "pass", "File is " + humanBytes(d.sizeBytes) + "; configured threshold is " + p.maxMB + " MB (decimal).", "profile");
  }
  const scanned = Number(d.inspectedPages)||0;
  const total = Number(d.pages)||0;
  const empty = Number(d.pagesWithoutText)||0;
  if (scanned === 0) add("searchability","Extractable text","not-run","Text extraction did not complete.");
  else if (scanned < total) add("searchability","Extractable text","review","Only " + scanned + " of " + total + " pages were inspected; " + empty + " inspected page(s) lacked extractable text.");
  else if (empty > 0) add("searchability","Extractable text",p.requireSearchable ? "warning" : "review", empty + " of " + total + " pages had no extractable text. This does not prove the pages are scanned; inspect manually.",p.requireSearchable?"profile":"diagnostic");
  else add("searchability","Extractable text","pass","Extractable text was found on every inspected page; OCR quality and visual readability were not assessed.");
  if (Number.isInteger(d.formFields)) {
    const count=d.formFields;
    add("forms","Interactive form fields",count > 0 ? (p.disallowForms ? "warning":"review"):"pass", count ? count + " interactive field(s) detected. Verify that forms are flattened if required." : "No interactive form fields detected by this inspection.",p.disallowForms?"profile":"diagnostic");
  } else add("forms","Interactive form fields","not-run","Form inspection unavailable.");
  if (Number.isInteger(d.embeddedFiles)) {
    add("attachments","Embedded PDF attachments",d.embeddedFiles > 0 ? (p.disallowAttachments ? "warning":"review"):"pass",d.embeddedFiles + " embedded attachment(s) found.",p.disallowAttachments?"profile":"diagnostic");
  } else add("attachments","Embedded PDF attachments","not-run","Attachment inspection unavailable.");
  if (Number.isInteger(d.scripts)) {
    add("scripts","Document-level JavaScript actions",d.scripts > 0 ? (p.disallowScripts ? "warning":"review"):"review",d.scripts > 0 ? d.scripts + " document-level script action(s) detected." : "No document-level scripts detected by this API; other actions and embedded active content were not exhaustively checked.",p.disallowScripts?"profile":"diagnostic");
  } else add("scripts","Document-level JavaScript actions","not-run","This parser did not expose a comprehensive script check.");
  if (d.privacyCandidates === null || d.privacyCandidates === undefined) {
    add("pii","Potential personal identifiers","not-run","Pattern screening was not completed.");
  } else if (d.privacyCandidates > 0) {
    add("pii","Potential personal identifiers","warning",d.privacyCandidates + " potential SSN-like pattern(s) observed on " + (d.privacyPages||[]).length + " page(s). False positives are possible; no excerpts are displayed.");
  } else {
    add("pii","Potential personal identifiers","review","No SSN-format patterns observed in extracted text. Other identifiers, images and incorrect redactions can still be present.");
  }
  add("privacy","Confidentiality and redaction","review","A human must verify redactions, seals, confidential information, signatures, attachments and filing instructions. The scanner cannot certify privacy.");
  add("court","Court acceptance","review","Technical checks are not a court validation, approval, filing, or legal-sufficiency determination.");
  return makeResult(d,p,checks);
}
function makeResult(doc,profile,checks) {
  const counts={pass:0,warning:0,review:0,blocked:0,"not-run":0};
  checks.forEach(x=>{counts[x.status]=(counts[x.status]||0)+1});
  return {
    version:VERSION,filename:String(doc.filename||"Untitled PDF"),sizeBytes:Number(doc.sizeBytes)||0,
    hash:doc.hash || null,pdfVersion:doc.pdfVersion||null,pages:Number(doc.pages)||0,
    inspectedPages:Number(doc.inspectedPages)||0,profile:{...profile},checks,counts,
    outcome: counts.blocked ? "Unable to complete inspection" : counts.warning ? "Issues require attention" : "Manual review required",
    inspectedAt: new Date().toISOString()
  };
}
export function summarizeBatch(results) {
  return {
    files:results.length,blocked:results.filter(r=>r.counts.blocked).length,
    flagged:results.filter(r=>r.counts.warning).length,
    reviews:results.reduce((n,r)=>n+r.counts.review,0),
    pages:results.reduce((n,r)=>n+r.pages,0)
  };
}
export function buildExport(results, profile) {
  return {application:"FilingProof",version:VERSION,exportedAt:new Date().toISOString(),
    privacy:"Local analysis; report contains filenames, hashes, metadata and check results, not document contents.",
    limitations:"Not a filing acceptance check, legal advice, OCR, complete malware scan, or redaction verification.",
    profile:safeProfile(profile),results:results.map(r=>({...r}))};
}
