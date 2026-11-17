/* Handoff Atlas 0.1 — deterministic, local-first procedure engine. No external dependencies. */
export const SCHEMA_VERSION=1;
export const LIMITS=Object.freeze({procedures:80,steps:100,runs:300,revisions:30,bytes:1200000});
export const STEP_TYPES=Object.freeze(["instruction","decision","terminal"]);
export const OUTCOMES=Object.freeze(["resolved","escalated","blocked","documented"]);
const ID=/^[a-z][a-z0-9_-]{0,63}$/i;
const clean=(value,max=500)=>String(value==null?"":value).trim().slice(0,max);
const copy=(value)=>JSON.parse(JSON.stringify(value));
export function idFrom(text,prefix="step"){
 const part=clean(text,72).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,45);
 return (part && /^[a-z]/.test(part)?part:prefix+"-"+(part||"item"));
}
export function uniqueId(taken,prefix="step"){
 let id=idFrom(prefix),index=2;while(taken.includes(id))id=idFrom(prefix)+"-"+index++;
 return id;
}
export function newProcedure(){
 return {schemaVersion:1,id:"procedure-"+Date.now().toString(36),title:"Untitled procedure",summary:"",category:"General",owner:"",status:"draft",revision:0,publishedAt:"",updatedAt:new Date().toISOString(),startId:"start",steps:[{id:"start",title:"First step",body:"Describe what the operator should do.",type:"instruction",next:"complete",options:[],outcome:"documented",reference:"",caution:""},{id:"complete",title:"Procedure complete",body:"Confirm and document the outcome.",type:"terminal",next:"",options:[],outcome:"resolved",reference:"",caution:""}]};
}
export function normalizeProcedure(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("Procedure must be an object.");
 if(raw.schemaVersion!==SCHEMA_VERSION)throw Error("Unsupported procedure schema version.");
 if(!Array.isArray(raw.steps)||raw.steps.length>LIMITS.steps)throw Error("Invalid number of procedure steps.");
 const steps=raw.steps.map((s)=>{
  if(!s||typeof s!=="object")throw Error("A step is not an object.");
  return {id:clean(s.id,64),title:clean(s.title,150),body:clean(s.body,6000),
   type:STEP_TYPES.includes(s.type)?s.type:"instruction",next:clean(s.next,64),
   options:Array.isArray(s.options)?s.options.slice(0,12).map((o)=>({label:clean(o?.label,160),to:clean(o?.to,64)})):[],
   outcome:OUTCOMES.includes(s.outcome)?s.outcome:"documented",
   reference:clean(s.reference,1200),caution:clean(s.caution,1200)};
 });
 return {schemaVersion:1,id:clean(raw.id,64),title:clean(raw.title,150),summary:clean(raw.summary,1800),
  category:clean(raw.category,70)||"General",owner:clean(raw.owner,100),
  status:raw.status==="published"?"published":"draft",revision:Number.isSafeInteger(raw.revision)?Math.max(0,raw.revision):0,
  publishedAt:clean(raw.publishedAt,80),updatedAt:clean(raw.updatedAt,80),startId:clean(raw.startId,64),steps};
}
export function analyzeProcedure(input){
 const p=normalizeProcedure(input),errors=[],warnings=[];
 if(!ID.test(p.id))errors.push("Procedure ID must be 1–64 letters, numbers, dashes or underscores and start with a letter.");
 if(!p.title)errors.push("Procedure title is required.");
 if(!p.steps.length)errors.push("Add at least one step.");
 const byId=new Map();
 for(const s of p.steps){
  if(!ID.test(s.id))errors.push("Invalid step ID: "+(s.id||"(empty)"));
  if(byId.has(s.id))errors.push("Duplicate step ID: "+s.id);
  byId.set(s.id,s);
  if(!s.title)errors.push("Step "+s.id+" needs a title.");
  if(s.type==="instruction"&&!s.next)errors.push("Instruction "+s.id+" needs a next step.");
  if(s.type==="decision"&&s.options.length<2)errors.push("Decision "+s.id+" needs at least two labeled choices.");
  if(s.type==="terminal"&&s.next)warnings.push("Terminal "+s.id+" has an unused next-step value.");
  if(s.type==="terminal"&&s.options.length)warnings.push("Terminal "+s.id+" has unused choices.");
  const paths=s.type==="instruction"?[s.next]:s.type==="decision"?s.options.map(o=>o.to):[];
  if(s.type==="decision")for(const o of s.options)if(!o.label)errors.push("Decision "+s.id+" has an unnamed choice.");
  for(const path of paths)if(path&&!byId.has(path)&&!p.steps.some(q=>q.id===path))errors.push("Step "+s.id+" points to missing target "+path+".");
  if(s.type==="decision")for(const path of paths)if(!path)errors.push("Decision "+s.id+" has an unassigned route.");
 }
 if(!byId.has(p.startId))errors.push("Start step does not exist.");
 if(!p.steps.some(s=>s.type==="terminal"))errors.push("At least one terminal step is required.");
 const visited=new Set(),stack=new Set(),cycles=new Set();
 const walk=(id)=>{
  if(stack.has(id)){cycles.add(id);return;}
  if(visited.has(id)||!byId.has(id))return;
  visited.add(id);stack.add(id);
  const s=byId.get(id);
  const targets=s.type==="instruction"?[s.next]:s.type==="decision"?s.options.map(o=>o.to):[];
  for(const to of targets)walk(to);
  stack.delete(id);
 };
 walk(p.startId);
 const unreachable=p.steps.filter(s=>!visited.has(s.id)).map(s=>s.id);
 if(unreachable.length)warnings.push("Unreachable steps: "+unreachable.join(", ")+".");
 if(cycles.size)warnings.push("A cycle exists; runs have a 100-action safety cap.");
 if(!p.steps.some(s=>s.type==="terminal"&&visited.has(s.id)))errors.push("No terminal step is reachable from the start.");
 return {errors:[...new Set(errors)],warnings,reachable:[...visited],unreachable,stepCount:p.steps.length,terminalCount:p.steps.filter(s=>s.type==="terminal").length};
}
export function newWorkspace(procedures=[]){
 const normalized=procedures.map(normalizeProcedure),revisions={};
 for(const p of normalized)revisions[p.id]=p.status==="published"&&p.revision>0?[{revision:p.revision,at:p.publishedAt||p.updatedAt,snapshot:copy(p)}]:[];
 return {schemaVersion:1,procedures:normalized,runs:[],revisions,updatedAt:new Date().toISOString()};
}
export function normalizeWorkspace(raw){
 if(!raw||typeof raw!=="object"||raw.schemaVersion!==1||!Array.isArray(raw.procedures))throw Error("Unsupported Handoff Atlas workspace file.");
 if(raw.procedures.length>LIMITS.procedures)throw Error("Too many procedures for this workspace.");
 const procedures=raw.procedures.map(normalizeProcedure);
 const ids=procedures.map(p=>p.id);if(new Set(ids).size!==ids.length)throw Error("Duplicate procedure IDs in workspace.");
 const revisions={};
 if(raw.revisions && typeof raw.revisions==="object"){
  for(const p of procedures){
   const arr=raw.revisions[p.id];revisions[p.id]=Array.isArray(arr)?arr.slice(-LIMITS.revisions).map(x=>({
    revision:Number.isSafeInteger(x.revision)?x.revision:0,
    at:clean(x.at,80),
    snapshot:normalizeProcedure(x.snapshot)
   })):[];
  }
 }
 const runs=Array.isArray(raw.runs)?raw.runs.slice(-LIMITS.runs).map((run)=>{
  if(!run||typeof run!=="object")throw Error("Invalid run entry.");
  return {id:clean(run.id,80),procedureId:clean(run.procedureId,64),title:clean(run.title,150),revision:Number(run.revision)||0,
   startedAt:clean(run.startedAt,80),endedAt:clean(run.endedAt,80),operator:clean(run.operator,120),outcome:OUTCOMES.includes(run.outcome)?run.outcome:"documented",
   trail:Array.isArray(run.trail)?run.trail.slice(0,101).map(t=>({stepId:clean(t.stepId,64),title:clean(t.title,150),at:clean(t.at,80),note:clean(t.note,1500),decision:clean(t.decision,160)})):[]};
 }):[];
 return {schemaVersion:1,procedures,runs,revisions,updatedAt:clean(raw.updatedAt,80)};
}
export function publishProcedure(raw,previousRevisions=[],at=new Date().toISOString()){
 const p=normalizeProcedure(raw),analysis=analyzeProcedure(p);
 if(analysis.errors.length)throw Error("Cannot publish: "+analysis.errors.join(" "));
 const revision=p.revision+1;
 const published={...p,status:"published",revision,publishedAt:at,updatedAt:at};
 const revisions=[...previousRevisions,{revision,at,snapshot:copy(published)}].slice(-LIMITS.revisions);
 return {published,revisions};
}
export function startRun(raw,operator="",at=new Date().toISOString()){
 const p=normalizeProcedure(raw),check=analyzeProcedure(p);
 if(p.status!=="published"||check.errors.length)throw Error("Only valid published procedures can be run.");
 return {id:"run-"+at.replace(/[^0-9]/g,"").slice(0,14)+"-"+Math.random().toString(36).slice(2,7),
  procedureId:p.id,title:p.title,revision:p.revision,operator:clean(operator,120),startedAt:at,endedAt:"",
  currentId:p.startId,outcome:"",trail:[],snapshot:p};
}
export function advanceRun(raw,choiceIndex=null,note="",at=new Date().toISOString()){
 if(!raw||!raw.snapshot||!raw.currentId)throw Error("No active step.");
 const run=copy(raw),step=run.snapshot.steps.find(s=>s.id===run.currentId);
 if(!step)throw Error("Current step no longer exists.");
 if(run.trail.length>=100)throw Error("Run reached its 100-action safety limit.");
 let next="",decision="";
 if(step.type==="decision"){
  const i=Number(choiceIndex);
  if(!Number.isInteger(i)||i<0||i>=step.options.length)throw Error("Choose a valid branch.");
  const option=step.options[i];if(!option.to)throw Error("This branch has no destination.");
  next=option.to;decision=option.label;
 }else if(step.type==="instruction")next=step.next;
 run.trail.push({stepId:step.id,title:step.title,at,note:clean(note,1500),decision});
 if(step.type==="terminal"){
  run.outcome=step.outcome;run.endedAt=at;run.currentId="";
  return {run,finished:true};
 }
 if(!run.snapshot.steps.some(s=>s.id===next))throw Error("The next step is invalid.");
 run.currentId=next;
 return {run,finished:false};
}
export function backRun(raw){
 const run=copy(raw);if(!run.trail.length||run.endedAt)throw Error("Cannot go back.");
 const last=run.trail.pop();run.currentId=last.stepId;return run;
}
export function toRunRecord(run){
 if(!run.endedAt)throw Error("Only completed runs can be archived.");
 const {id,procedureId,title,revision,operator,startedAt,endedAt,trail,outcome}=run;
 return {id,procedureId,title,revision,operator,startedAt,endedAt,trail:copy(trail),outcome};
}
const md=(x)=>clean(x,10000).replace(/\r/g,"").replace(/\n/g," ");
export function runMarkdown(record){
 const r=record;
 const lines=["# Handoff record — "+md(r.title),"","- Run ID: "+md(r.id),"- Procedure revision: "+Number(r.revision||0),"- Operator: "+md(r.operator||"Unspecified"),"- Started: "+md(r.startedAt),"- Completed: "+md(r.endedAt||"In progress"),"- Outcome: "+md(r.outcome||"Pending"),"","## Recorded path",""];
 for(let i=0;i<(r.trail||[]).length;i++){
  const t=r.trail[i];
  lines.push((i+1)+". **"+md(t.title)+"** ("+md(t.stepId)+")");
  if(t.decision)lines.push("   - Route: "+md(t.decision));
  if(t.note)lines.push("   - Operator note: "+md(t.note));
  lines.push("   - Recorded: "+md(t.at));
 }
 lines.push("","Generated by Handoff Atlas v0.1. Local review record; not an authenticated audit log.");
 return lines.join("\n");
}
