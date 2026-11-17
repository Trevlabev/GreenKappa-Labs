import test from "node:test";
import assert from "node:assert/strict";
import {SAMPLE_PROCEDURES} from "../sample.mjs";
import {SCHEMA_VERSION,LIMITS,newProcedure,normalizeProcedure,analyzeProcedure,newWorkspace,normalizeWorkspace,publishProcedure,startRun,advanceRun,backRun,toRunRecord,runMarkdown,uniqueId} from "../core.mjs";
const clone=(o)=>JSON.parse(JSON.stringify(o));
test("schema and sample set",()=>{
 assert.equal(SCHEMA_VERSION,1);
 assert.equal(SAMPLE_PROCEDURES.length,3);
 for(const p of SAMPLE_PROCEDURES)assert.deepEqual(analyzeProcedure(p).errors,[]);
});
test("new draft contains a reachable terminal",()=>{
 const p=newProcedure();assert.equal(p.status,"draft");assert.deepEqual(analyzeProcedure(p).errors,[]);
});
test("duplicate step IDs fail validation",()=>{
 const p=clone(SAMPLE_PROCEDURES[0]);p.steps[1].id=p.steps[0].id;
 assert.ok(analyzeProcedure(p).errors.some(x=>x.includes("Duplicate")));
});
test("missing step destination fails validation",()=>{
 const p=clone(SAMPLE_PROCEDURES[0]);p.steps[0].next="does-not-exist";
 assert.ok(analyzeProcedure(p).errors.some(x=>x.includes("missing target")));
});
test("invalid start and terminal fails validation",()=>{
 const p=clone(SAMPLE_PROCEDURES[0]);p.startId="bad";p.steps=p.steps.filter(x=>x.type!=="terminal");
 const errors=analyzeProcedure(p).errors.join(" ");
 assert.match(errors,/Start step/);assert.match(errors,/terminal/i);
});
test("unused branch and unreachable steps are reported",()=>{
 const p=clone(SAMPLE_PROCEDURES[0]);
 p.steps.push({id:"unused",title:"Unused",body:"",type:"terminal",next:"",options:[],outcome:"blocked"});
 assert.ok(analyzeProcedure(p).warnings.some(x=>x.includes("Unreachable")));
});
test("missing choice is rejected",()=>{
 const p=clone(SAMPLE_PROCEDURES[0]);p.steps.find(x=>x.id==="identify").options[0].to="";
 assert.ok(analyzeProcedure(p).errors.some(x=>x.includes("unassigned")));
});
test("normalization rejects unsupported schema and step overflow",()=>{
 assert.throws(()=>normalizeProcedure({...SAMPLE_PROCEDURES[0],schemaVersion:5}),/schema/);
 const p=clone(SAMPLE_PROCEDURES[0]);p.steps=new Array(LIMITS.steps+1).fill(p.steps[0]);
 assert.throws(()=>normalizeProcedure(p),/steps/);
});
test("publish increments revision with saved snapshot",()=>{
 const p=newProcedure();const published=publishProcedure(p,[], "2026-11-16T00:00:00Z");
 assert.equal(published.published.revision,1);assert.equal(published.revisions.length,1);
 const second=publishProcedure(published.published,published.revisions,"2026-11-17T00:00:00Z");
 assert.equal(second.published.revision,2);assert.equal(second.revisions.length,2);
});
test("cannot run invalid or unpublished procedure",()=>{
 const p=newProcedure();assert.throws(()=>startRun(p),/published/);
 p.status="published";p.steps[0].next="wrong";assert.throws(()=>startRun(p),/valid/);
});
test("step traversal, decision choice and completion",()=>{
 let r=startRun(SAMPLE_PROCEDURES[0],"Sample operator","2026-11-16T00:00:00Z");
 r=advanceRun(r,null,"Intake received","2026-11-16T00:01:00Z").run;
 assert.equal(r.currentId,"identify");
 assert.throws(()=>advanceRun(r,999),/branch/);
 r=advanceRun(r,1,"Approved in demo","2026-11-16T00:02:00Z").run;
 assert.equal(r.currentId,"approval");
 r=advanceRun(r,0,"Matched request","2026-11-16T00:03:00Z").run;
 assert.equal(r.currentId,"resolve");
 const final=advanceRun(r,null,"Confirmed in training","2026-11-16T00:04:00Z");
 assert.equal(final.finished,true);assert.equal(final.run.outcome,"resolved");
 const archived=toRunRecord(final.run);assert.equal(archived.trail.length,4);
 const report=runMarkdown(archived);
 assert.match(report,/Handoff record/);assert.match(report,/Approved in demo/);
});
test("backtracking restores last step",()=>{
 let r=startRun(SAMPLE_PROCEDURES[1]);
 r=advanceRun(r,null,"First").run;
 assert.equal(r.currentId,"complete");
 r=backRun(r);
 assert.equal(r.currentId,"review");assert.equal(r.trail.length,0);
});
test("terminal outcomes and sealed records",()=>{
 let r=startRun(SAMPLE_PROCEDURES[1]);
 r=advanceRun(r).run;r=advanceRun(r,1).run;
 const done=advanceRun(r).run;
 assert.equal(done.outcome,"blocked");
 assert.throws(()=>backRun(done),/Cannot/);
});
test("workspace roundtrip preserves procedures and record history",()=>{
 const w=newWorkspace(SAMPLE_PROCEDURES);
 const restored=normalizeWorkspace(JSON.parse(JSON.stringify(w)));
 assert.equal(restored.procedures.length,3);assert.equal(restored.runs.length,0);
});
test("workspace import rejects duplicate IDs and oversized inventory",()=>{
 const w=newWorkspace(SAMPLE_PROCEDURES);
 w.procedures.push(clone(w.procedures[0]));
 assert.throws(()=>normalizeWorkspace(w),/Duplicate/);
});
test("utility generates available stable IDs",()=>{
 assert.equal(uniqueId(["step"],"step"),"step-2");
 assert.equal(uniqueId([],"Step 1"),"step-1");
});
test("report indicates it is not an authenticated audit log",()=>{
 const record={id:"1",title:"Sample",revision:1,startedAt:"today",endedAt:"tomorrow",operator:"Op",outcome:"resolved",trail:[]};
 assert.match(runMarkdown(record),/not an authenticated audit log/i);
});
