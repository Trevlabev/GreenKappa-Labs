import test from "node:test";
import assert from "node:assert/strict";
import {blankWorkspace,createCase,completeTask,addException,resolveException,taskAvailability,reassign,reprioritize,updateProfile,validateProfile,importWorkspace,describeCase,dashboard,caseReport,auditCSV} from "../core.mjs";
import {demoWorkspace} from "../sample.mjs";
import {autoArrange,insertStep,removeStep,connectSteps,routeApplies} from "../designer.mjs";
const now="2026-11-16T12:00:00.000Z";
const one=()=>createCase(blankWorkspace(),{title:"Synthetic",profileId:"petition",receivedDate:"2026-11-14",priority:"Routine",team:"Intake",summary:"Test"},now);
test("intake creates snapshot and audit",()=>{const s=one();assert.equal(s.cases[0].tasks.length,5);assert.equal(s.events.length,1);});
test("dependencies block out-of-order completion",()=>{const s=one();assert.equal(taskAvailability(s.cases[0],s.cases[0].tasks[3]).status,"blocked");assert.throws(()=>completeTask(s,"CF-0001","route",now),/Awaiting/);});
test("all ordered tasks close a case",()=>{let s=one();for(const id of ["register","screen","verify","route","close"])s=completeTask(s,"CF-0001",id,now);assert.equal(describeCase(s.cases[0],"2026-11-16").status,"Completed");});
test("open exceptions block final handoff",()=>{let s=addException(one(),"CF-0001","Missing","2026-11-16T12:00:00Z");for(const id of ["register","screen","verify","route"])s=completeTask(s,"CF-0001",id,now);assert.throws(()=>completeTask(s,"CF-0001","close",now),/Resolve/);s=resolveException(s,"CF-0001",s.cases[0].exceptions[0].id,now);s=completeTask(s,"CF-0001","close",now);assert.ok(s.cases[0].closedAt);});
test("assignment and priority create audit events",()=>{let s=one();s=reassign(s,"CF-0001","Review",now);s=reprioritize(s,"CF-0001","Urgent",now);assert.equal(s.events.length,3);});
test("reject cyclic profile, allow valid one",()=>{const p={id:"x",name:"X",description:"",tasks:[{id:"a",label:"A",offset:0,dependsOn:["b"],final:false},{id:"b",label:"B",offset:1,dependsOn:["a"],final:true}]};assert.throws(()=>validateProfile(p),/cycle/i);p.tasks[0].dependsOn=[];assert.doesNotThrow(()=>validateProfile(p));});
test("editing a profile preserves existing case task snapshot",()=>{let s=one(),p=structuredClone(s.profiles[0]);p.tasks[0].label="New";s=updateProfile(s,p);assert.equal(s.cases[0].tasks[0].label,"Register submission");});
test("overdue state is simulated from calendar offsets",()=>{const s=one();assert.equal(describeCase(s.cases[0],"2026-11-16").status,"Overdue");assert.equal(dashboard(s,"2026-11-16").overdue,1);});
test("import rejects unsupported version and missing dependencies",()=>{const s=one();assert.deepEqual(importWorkspace(s),s);assert.throws(()=>importWorkspace({...s,version:5}),/version/);const x=structuredClone(s);x.cases[0].tasks[0].dependsOn=["absent"];assert.throws(()=>importWorkspace(x),/dependency/);});
test("demo exhibits completed, blocked and overdue cases",()=>{const s=demoWorkspace(new Date(now));const statuses=s.cases.map(c=>describeCase(c,"2026-11-16").status);assert.equal(s.cases.length,5);for(const p of ["Completed","Exception","Overdue"])assert.ok(statuses.includes(p));});
test("exports retain warning and escape spreadsheet formulas",()=>{const s=addException(one(),"CF-0001","=HYPERLINK(1)",now);assert.match(caseReport(s,"CF-0001","2026-11-16"),/not statutory/);const injected=structuredClone(s);injected.events[1].detail="=HYPERLINK(1)";assert.match(auditCSV(injected),/'=HYPERLINK/);});

test("workspace import rejects cyclic or incomplete task snapshots",()=>{
 const s=one();
 const cycle=structuredClone(s);
 cycle.cases[0].tasks.find(t=>t.id==="register").dependsOn=["close"];
 assert.throws(()=>importWorkspace(cycle),/cycle/i);
 const orphan=structuredClone(s);
 orphan.cases[0].tasks.find(t=>t.id==="close").dependsOn=[];
 assert.throws(()=>importWorkspace(orphan),/lead to the final handoff/);
});
test("workspace import enforces closure and task prerequisite invariants",()=>{
 const s=one();
 const skipped=structuredClone(s);
 skipped.cases[0].tasks.find(t=>t.id==="route").doneAt=now;
 assert.throws(()=>importWorkspace(skipped),/incomplete prerequisite/);
 const premature=structuredClone(s);
 premature.cases[0].closedAt=now;
 assert.throws(()=>importWorkspace(premature),/closure does not match/);
 const completed=structuredClone(s);
 completed.cases[0].tasks.forEach(t=>t.doneAt=now);
 assert.throws(()=>importWorkspace(completed),/closure does not match/);
});
test("workspace import rejects duplicate exception identifiers",()=>{
 const s=addException(one(),"CF-0001","Fictional issue",now);
 const bad=structuredClone(s);
 bad.cases[0].exceptions.push(structuredClone(bad.cases[0].exceptions[0]));
 assert.throws(()=>importWorkspace(bad),/Duplicate case exception ID/);
});

test("intake-time routing creates only applicable tasks and retains a stable snapshot",()=>{
 let s=blankWorkspace(),p=structuredClone(s.profiles[0]),final=p.tasks.find(t=>t.final);
 p.tasks.splice(-1,0,
  {id:"routine_review",label:"Routine review",offset:3,dependsOn:["register"],final:false,when:{priority:"Routine"}},
  {id:"urgent_review",label:"Urgent review",offset:2,dependsOn:["register"],final:false,when:{priority:"Urgent"}});
 final.dependsOn.push("routine_review","urgent_review");s=updateProfile(s,p);
 const intake=priority=>({title:"Simulated "+priority,profileId:"petition",receivedDate:"2026-11-16",priority,team:"Intake"});
 s=createCase(s,intake("Urgent"),now);
 let c=s.cases[0],names=c.tasks.map(t=>t.id);
 assert.ok(names.includes("urgent_review")&&!names.includes("routine_review"));
 assert.ok(!c.tasks.find(t=>t.final).dependsOn.includes("routine_review"));
 assert.ok(s.events.some(e=>e.detail.includes("Routing evaluated at intake")));
 s=reprioritize(s,c.id,"Routine",now);
 assert.deepEqual(s.cases[0].tasks.map(t=>t.id),names);
 s=createCase(s,intake("Routine"),now);
 c=s.cases[0];assert.ok(c.tasks.some(t=>t.id==="routine_review"));assert.ok(!c.tasks.some(t=>t.id==="urgent_review"));
 assert.deepEqual(importWorkspace(s),s);
});
test("conditional routing rejects invalid predicates and dangling active prerequisites",()=>{
 let p=structuredClone(blankWorkspace().profiles[0]);p.tasks[0].when={priority:"Deadline required"};
 assert.throws(()=>validateProfile(p),/Invalid conditional priority/);
 p=structuredClone(blankWorkspace().profiles[0]);p.tasks.find(t=>t.final).when={priority:"Urgent"};
 assert.throws(()=>validateProfile(p),/Final handoff cannot/);
 p=structuredClone(blankWorkspace().profiles[0]);p.tasks.find(t=>t.id==="register").when={priority:"Urgent"};
 assert.throws(()=>validateProfile(p),/unmet prerequisite/);
});
test("profile layout is portable, bounded, and subject to validation",()=>{
 let s=blankWorkspace(),p=structuredClone(s.profiles[0]);
 p.layout={register:{x:72,y:110},close:{x:850,y:140}};
 s=updateProfile(s,p);assert.deepEqual(importWorkspace(s).profiles[0].layout,p.layout);
 p.layout.close.x=90000;assert.throws(()=>validateProfile(p),/Invalid node position/);
});

test("visual designer arranges a DAG, inserts a step, and preserves final reachability",()=>{
 const p=structuredClone(blankWorkspace().profiles[0]);
 const layout=autoArrange(p);
 assert.ok(layout.close.x>layout.register.x);
 const result=insertStep(p,"register"),t=result.profile.tasks.find(x=>x.id===result.selected);
 assert.ok(t.dependsOn.includes("register"));
 assert.ok(result.profile.tasks.find(x=>x.final).dependsOn.includes(t.id));
 assert.doesNotThrow(()=>validateProfile(result.profile));
});
test("visual designer reconnects dependencies on step removal and rejects cycles",()=>{
 const p=structuredClone(blankWorkspace().profiles[0]);
 const linked=connectSteps(p,"verify","close");
 assert.ok(linked.tasks.find(t=>t.final).dependsOn.includes("verify"));
 assert.throws(()=>connectSteps(linked,"close","register"),/cycle/);
 const removed=removeStep(linked,"screen");
 assert.ok(!removed.tasks.some(t=>t.id==="screen"));
 assert.doesNotThrow(()=>validateProfile(removed));
});
test("designer priority preview is deterministic without mutating a profile",()=>{
 const t={id:"check",when:{priority:"Urgent"}};
 assert.equal(routeApplies(t,"Routine"),false);
 assert.equal(routeApplies(t,"Urgent"),true);
 assert.equal(routeApplies({id:"always"},"Routine"),true);
});
