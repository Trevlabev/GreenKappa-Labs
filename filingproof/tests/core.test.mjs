import test from "node:test";
import assert from "node:assert/strict";
import {safeProfile,evaluateDocument,summarizeBatch,buildExport,humanBytes} from "../core.mjs";

const valid={filename:"synthetic.pdf",sizeBytes:5000,headerOk:true,parsed:true,pages:2,
  inspectedPages:2,pagesWithoutText:0,formFields:0,embeddedFiles:0,scripts:0,
  privacyCandidates:0,privacyPages:[]};
test("general PDF diagnostics never implies filing accepted",()=>{
 const result=evaluateDocument(valid,{id:"baseline"});
 assert.equal(result.outcome,"Manual review required");
 assert.equal(result.checks.find(x=>x.id==="size").status,"not-run");
 assert.equal(result.checks.find(x=>x.id==="privacy").status,"review");
});
test("Oregon profile flags pages without text",()=>{
 const result=evaluateDocument({...valid,pagesWithoutText:1},{id:"oregon"});
 assert.equal(result.checks.find(x=>x.id==="searchability").status,"warning");
 assert.equal(result.outcome,"Issues require attention");
 assert.ok(result.profile.sourceUrl.startsWith("https://ord.uscourts.gov/"));
});
test("custom numeric file-size threshold is decimal MB",()=>{
 const r=evaluateDocument({...valid,sizeBytes:10_500_000},{id:"baseline",maxMB:10});
 assert.equal(r.checks.find(x=>x.id==="size").status,"warning");
});
test("parse failure blocks unexamined internals",()=>{
 const r=evaluateDocument({...valid,parsed:false,error:"Password required."},{id:"oregon"});
 assert.equal(r.outcome,"Unable to complete inspection");
 assert.equal(r.checks.find(x=>x.id==="contents").status,"not-run");
});
test("partial scanning cannot be reported as full pass",()=>{
 const r=evaluateDocument({...valid,pages:240,inspectedPages:80,pagesWithoutText:0},{id:"oregon"});
 assert.equal(r.checks.find(x=>x.id==="searchability").status,"review");
});
test("interactive fields and embedded files flag on strict profile",()=>{
 const r=evaluateDocument({...valid,formFields:3,embeddedFiles:1},{id:"oregon"});
 assert.equal(r.checks.find(x=>x.id==="forms").status,"warning");
 assert.equal(r.checks.find(x=>x.id==="attachments").status,"warning");
});
test("suspicious SSN pattern flags regardless of profile",()=>{
 const r=evaluateDocument({...valid,privacyCandidates:2,privacyPages:[1]});
 assert.equal(r.checks.find(x=>x.id==="pii").status,"warning");
});
test("unknown scripts are not misreported as clean",()=>{
 const r=evaluateDocument({...valid,scripts:null});
 assert.equal(r.checks.find(x=>x.id==="scripts").status,"not-run");
});
test("profile validates limits",()=>{
 assert.throws(()=>safeProfile({id:"baseline",maxMB:-10}),/Maximum size/);
 assert.equal(safeProfile({id:"baseline",maxMB:""}).maxMB,null);
});
test("batch and export preserve file-level results, not contents",()=>{
 const r=evaluateDocument(valid,{id:"baseline"});
 assert.deepEqual(summarizeBatch([r]),{files:1,blocked:0,flagged:0,reviews:r.counts.review,pages:2});
 const e=buildExport([r],{id:"baseline"});
 assert.equal(e.results[0].filename,"synthetic.pdf");
 assert.equal(JSON.stringify(e).includes("fullDocumentText"),false);
});
test("file sizes are clearly labeled as binary units",()=>{
 assert.equal(humanBytes(1_048_576),"1.00 MiB");
});
