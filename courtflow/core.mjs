/** CourtFlow v0.1. All timelines and workflows here are fictional, not legal deadlines. */
export const VERSION=1;
export const PRIORITIES=["Routine","Elevated","Urgent"];
export const TEAMS=["Intake","Review","Operations","Supervisor"];
export const DEFAULT_PROFILES=[
 {id:"petition",name:"Petition intake",description:"Synthetic document intake and routing",tasks:[
  {id:"register",label:"Register submission",offset:0,dependsOn:[],final:false},
  {id:"screen",label:"Check attachments",offset:1,dependsOn:["register"],final:false},
  {id:"verify",label:"Validate intake metadata",offset:2,dependsOn:["register"],final:false},
  {id:"route",label:"Assign review queue",offset:3,dependsOn:["screen","verify"],final:false},
  {id:"close",label:"Complete intake handoff",offset:5,dependsOn:["route"],final:true}]},
 {id:"compliance",name:"Compliance review",description:"Synthetic follow-up and exception tracking",tasks:[
  {id:"register",label:"Register review item",offset:0,dependsOn:[],final:false},
  {id:"evidence",label:"Review submitted material",offset:2,dependsOn:["register"],final:false},
  {id:"exceptions",label:"Document findings",offset:3,dependsOn:["evidence"],final:false},
  {id:"supervisor",label:"Supervisor review",offset:4,dependsOn:["exceptions"],final:false},
  {id:"close",label:"Complete review handoff",offset:6,dependsOn:["supervisor"],final:true}]},
 {id:"records",name:"Administrative request",description:"Synthetic administrative routing",tasks:[
  {id:"register",label:"Log request",offset:0,dependsOn:[],final:false},
  {id:"categorize",label:"Categorize request",offset:1,dependsOn:["register"],final:false},
  {id:"review",label:"Review response checklist",offset:3,dependsOn:["categorize"],final:false},
  {id:"close",label:"Archive handoff summary",offset:5,dependsOn:["review"],final:true}]}
];
const clone=v=>JSON.parse(JSON.stringify(v));
const required=(v,name,max=200)=>{
 if(typeof v!=="string"||!v.trim()||v.length>max)throw Error(name+" must be 1–"+max+" characters.");
 return v.trim();
};
const isDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+"T00:00:00Z"))&&new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;
const iso=t=>{const d=t instanceof Date?t:new Date(t);if(Number.isNaN(d.getTime()))throw Error("Invalid timestamp.");return d.toISOString();};
export const dateKey=(t=new Date())=>iso(t).slice(0,10);
export function addDays(day,offset){
 if(!isDate(day)||!Number.isInteger(offset)||Math.abs(offset)>3660)throw Error("Invalid day offset.");
 const d=new Date(day+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);
}
function pathTo(from,to,map,seen=new Set()){
 if(from===to)return true;if(seen.has(from))return false;seen.add(from);
 return map[from].dependsOn.some(id=>pathTo(id,to,map,seen));
}
export function validateProfile(p){
 if(!p||typeof p!=="object"||Array.isArray(p))throw Error("Profile required.");
 const id=required(p.id,"Profile ID",40);if(!/^[a-z][a-z0-9_-]*$/.test(id))throw Error("Invalid profile ID.");
 required(p.name,"Profile name",90);
 if(typeof p.description!=="string"||p.description.length>300)throw Error("Invalid profile description.");
 if(!Array.isArray(p.tasks)||p.tasks.length<2||p.tasks.length>12)throw Error("Profiles need 2–12 tasks.");
 const ids=new Set(),map={};
 for(const t of p.tasks){
  if(!t||typeof t!=="object")throw Error("Invalid task.");
  required(t.id,"Task ID",40);required(t.label,"Task label",100);
  if(!/^[a-z][a-z0-9_-]*$/.test(t.id)||ids.has(t.id))throw Error("Task IDs must be unique lowercase identifiers.");
  if(!Number.isInteger(t.offset)||t.offset<0||t.offset>365)throw Error("Offsets must be 0–365 calendar days.");
  if(!Array.isArray(t.dependsOn)||new Set(t.dependsOn).size!==t.dependsOn.length||typeof t.final!=="boolean")throw Error("Invalid dependency or final flag.");
  ids.add(t.id);map[t.id]=t;
 }
 for(const t of p.tasks)for(const dep of t.dependsOn)if(!ids.has(dep)||dep===t.id)throw Error("Invalid dependency in "+t.id);
 const visiting=new Set(),visited=new Set();
 const visit=id=>{if(visiting.has(id))throw Error("Dependency cycle.");if(visited.has(id))return;visiting.add(id);for(const dep of map[id].dependsOn)visit(dep);visiting.delete(id);visited.add(id);};
 for(const id of ids)visit(id);
 const finals=p.tasks.filter(t=>t.final);if(finals.length!==1)throw Error("Exactly one final handoff required.");
 for(const t of p.tasks)if(!pathTo(finals[0].id,t.id,map))throw Error("All tasks must lead to the final handoff.");
 return clone(p);
}
export function blankWorkspace(){return {version:VERSION,nextCase:1,nextEvent:1,nextException:1,profiles:clone(DEFAULT_PROFILES),cases:[],events:[]};}
export function importWorkspace(w){
 if(!w||typeof w!=="object"||Array.isArray(w)||w.version!==VERSION)throw Error("Unsupported workspace format/version.");
 for(const n of ["nextCase","nextEvent","nextException"])if(!Number.isSafeInteger(w[n])||w[n]<1)throw Error("Invalid workspace counter.");
 if(!Array.isArray(w.profiles)||w.profiles.length<1||w.profiles.length>12||!Array.isArray(w.cases)||w.cases.length>500||!Array.isArray(w.events)||w.events.length>15000)throw Error("Workspace collection limit.");
 const profileIds=new Set();for(const p of w.profiles){validateProfile(p);if(profileIds.has(p.id))throw Error("Duplicate workflow profile.");profileIds.add(p.id);}
 const caseIds=new Set();
 for(const c of w.cases){
  if(!c||typeof c!=="object")throw Error("Invalid case.");
  required(c.id,"Case ID",50);required(c.title,"Case title",140);required(c.reference,"Reference",50);
  if(caseIds.has(c.id))throw Error("Duplicate case ID.");caseIds.add(c.id);
  if(!profileIds.has(c.profileId)||!PRIORITIES.includes(c.priority)||!TEAMS.includes(c.team)||!isDate(c.receivedDate))throw Error("Invalid case routing.");
  if(typeof c.summary!=="string"||c.summary.length>1200||!Array.isArray(c.tasks)||c.tasks.length<2||c.tasks.length>12||!Array.isArray(c.exceptions)||c.exceptions.length>100)throw Error("Invalid case collection.");
  const tIds=new Set();
  for(const t of c.tasks){
   required(t.id,"Task ID",40);required(t.label,"Task label",100);
   if(tIds.has(t.id)||!Number.isInteger(t.offset)||t.offset<0||t.offset>365||!Array.isArray(t.dependsOn)||typeof t.final!=="boolean")throw Error("Invalid task snapshot.");
   tIds.add(t.id);
   if(t.doneAt!==null){if(typeof t.doneAt!=="string")throw Error("Invalid task timestamp.");iso(t.doneAt);}
  }
  for(const t of c.tasks)for(const dep of t.dependsOn)if(!tIds.has(dep))throw Error("Missing case task dependency.");
  // Imported task snapshots are independent copies of the current profile.
  // Validate their graph, final handoff and completion invariants before trusting any imported state.
  validateProfile({id:c.profileId,name:"Case task snapshot",description:"",tasks:c.tasks});
  iso(c.createdAt);
  const completed=new Set(c.tasks.filter(t=>t.doneAt!==null).map(t=>t.id));
  for(const t of c.tasks)if(t.doneAt!==null&&t.dependsOn.some(dep=>!completed.has(dep)))throw Error("Completed task has an incomplete prerequisite.");
  if(Boolean(c.closedAt)!==(completed.size===c.tasks.length))throw Error("Case closure does not match task completion.");
  if(c.closedAt!==null){if(typeof c.closedAt!=="string")throw Error("Invalid closure.");iso(c.closedAt);}
  const exceptionIds=new Set();
  for(const ex of c.exceptions){
   required(ex.id,"Exception ID",50);required(ex.note,"Exception note",400);iso(ex.createdAt);
   if(exceptionIds.has(ex.id))throw Error("Duplicate case exception ID.");exceptionIds.add(ex.id);
   if(ex.resolvedAt!==null)iso(ex.resolvedAt);
  }
  if(c.closedAt!==null&&c.exceptions.some(ex=>ex.resolvedAt===null))throw Error("Closed case cannot retain open exceptions.");
 }
 for(const e of w.events){if(!e||!caseIds.has(e.caseId))throw Error("Audit entry without case.");required(e.id,"Event ID",50);required(e.detail,"Audit detail",500);required(e.actor,"Actor",50);iso(e.at);}
 return clone(w);
}
function addEvent(s,id,detail,at,actor="Demo operator"){
 s.events.push({id:"EV-"+String(s.nextEvent++).padStart(5,"0"),caseId:id,detail:required(detail,"Audit detail",500),actor:required(actor,"Actor",50),at:iso(at)});
 if(s.events.length>15000)s.events.shift();
}
function getCase(s,id){const c=s.cases.find(x=>x.id===id);if(!c)throw Error("Case not found.");return c;}
export function createCase(w,input,at=new Date()){
 const s=importWorkspace(w);if(s.cases.length>=500)throw Error("Maximum 500 cases.");
 const title=required(input.title,"Case title",140),p=s.profiles.find(x=>x.id===input.profileId);
 if(!p||!isDate(input.receivedDate)||!PRIORITIES.includes(input.priority)||!TEAMS.includes(input.team))throw Error("Invalid workflow, date, priority or team.");
 const summary=typeof input.summary==="string"?input.summary.trim():"";if(summary.length>1200)throw Error("Summary too long.");
 const id="CF-"+String(s.nextCase++).padStart(4,"0");
 s.cases.unshift({id,reference:id,title,profileId:p.id,receivedDate:input.receivedDate,priority:input.priority,team:input.team,summary,createdAt:iso(at),closedAt:null,tasks:p.tasks.map(t=>({...clone(t),doneAt:null})),exceptions:[]});
 addEvent(s,id,"Intake created · "+p.name+" · "+input.team,at);return s;
}
export function taskAvailability(c,t){
 if(t.doneAt)return {status:"done",reason:"Completed"};
 if(c.closedAt)return {status:"blocked",reason:"Case closed"};
 const missing=t.dependsOn.filter(dep=>!c.tasks.find(x=>x.id===dep)?.doneAt);
 if(missing.length)return {status:"blocked",reason:"Awaiting: "+missing.map(id=>c.tasks.find(x=>x.id===id)?.label||id).join(", ")};
 if(t.final&&c.exceptions.some(e=>!e.resolvedAt))return {status:"blocked",reason:"Resolve open exceptions before final handoff"};
 return {status:"ready",reason:"Ready to complete"};
}
export function completeTask(w,id,taskId,at=new Date()){
 const s=importWorkspace(w),c=getCase(s,id),t=c.tasks.find(x=>x.id===taskId);
 if(!t)throw Error("Task not found.");
 const available=taskAvailability(c,t);if(available.status!=="ready")throw Error(available.reason);
 t.doneAt=iso(at);addEvent(s,id,"Task completed · "+t.label,at);
 if(c.tasks.every(x=>x.doneAt)){c.closedAt=iso(at);addEvent(s,id,"Case workflow completed",at);}
 return s;
}
export function addException(w,id,note,at=new Date()){
 const s=importWorkspace(w),c=getCase(s,id);if(c.closedAt)throw Error("Case already closed.");
 if(c.exceptions.length>=100)throw Error("Exception limit.");
 const value=required(note,"Exception note",400),eid="EX-"+String(s.nextException++).padStart(4,"0");
 c.exceptions.push({id:eid,note:value,createdAt:iso(at),resolvedAt:null});addEvent(s,id,"Exception opened · "+value,at);return s;
}
export function resolveException(w,id,eid,at=new Date()){
 const s=importWorkspace(w),c=getCase(s,id),e=c.exceptions.find(x=>x.id===eid);
 if(!e||e.resolvedAt)throw Error("Open exception not found.");
 e.resolvedAt=iso(at);addEvent(s,id,"Exception resolved · "+e.note,at);return s;
}
export function reassign(w,id,team,at=new Date()){
 if(!TEAMS.includes(team))throw Error("Invalid team.");const s=importWorkspace(w),c=getCase(s,id);
 if(c.closedAt)throw Error("Case closed.");if(c.team!==team){c.team=team;addEvent(s,id,"Reassigned to "+team,at);}return s;
}
export function reprioritize(w,id,priority,at=new Date()){
 if(!PRIORITIES.includes(priority))throw Error("Invalid priority.");const s=importWorkspace(w),c=getCase(s,id);
 if(c.closedAt)throw Error("Case closed.");if(c.priority!==priority){c.priority=priority;addEvent(s,id,"Priority changed to "+priority,at);}return s;
}
export function updateProfile(w,p){
 const s=importWorkspace(w),valid=validateProfile(p),i=s.profiles.findIndex(x=>x.id===p.id);
 if(i<0)throw Error("Existing profile ID required.");s.profiles[i]=valid;return s;
}
export function describeCase(c,asOf=dateKey()){
 if(!isDate(asOf))throw Error("Invalid as-of date.");
 const completed=c.tasks.filter(t=>t.doneAt).length,open=c.tasks.filter(t=>!t.doneAt);
 const earliest=open.map(t=>addDays(c.receivedDate,t.offset)).sort()[0]||null;
 const target=addDays(c.receivedDate,Math.max(...c.tasks.map(t=>t.offset)));
 const exceptions=c.exceptions.filter(e=>!e.resolvedAt).length;
 let status="Active";
 if(c.closedAt)status="Completed";else if(exceptions)status="Exception";else if(earliest<asOf)status="Overdue";else if(earliest<=addDays(asOf,1))status="Due soon";
 return {status,completed,remaining:open.length,ready:open.filter(t=>taskAvailability(c,t).status==="ready").length,exceptions,earliest,target,percent:Math.round(100*completed/c.tasks.length)};
}
export function dashboard(s,asOf=dateKey()){
 const all=s.cases.map(c=>describeCase(c,asOf));
 return {total:all.length,open:all.filter(x=>x.status!=="Completed").length,completed:all.filter(x=>x.status==="Completed").length,exceptions:all.filter(x=>x.status==="Exception").length,overdue:all.filter(x=>x.status==="Overdue").length,dueSoon:all.filter(x=>x.status==="Due soon").length};
}
export function caseReport(s,id,asOf=dateKey()){
 const c=getCase(s,id),d=describeCase(c,asOf),p=s.profiles.find(x=>x.id===c.profileId),safe=v=>String(v).replace(/[\r\n|]/g," ");
 const lines=["# CourtFlow · Synthetic case report","","> Demonstration only. Calendar-day targets are fictional, not statutory or legal deadlines.","",
 "Reference: "+c.reference,"Title: "+safe(c.title),"Workflow: "+safe(p?.name||c.profileId),"Team: "+c.team,"Priority: "+c.priority,
 "Received: "+c.receivedDate,"Simulated target: "+d.target,"Status: "+d.status,"Progress: "+d.completed+"/"+c.tasks.length,"",
 "## Tasks","","| Task | Dependencies | Simulated target | Status |","|---|---|---|---|"];
 for(const t of c.tasks)lines.push("| "+safe(t.label)+" | "+safe(t.dependsOn.join(", ")||"—")+" | "+addDays(c.receivedDate,t.offset)+" | "+(t.doneAt?"Completed":"Pending")+" |");
 lines.push("","## Exceptions");
 if(!c.exceptions.length)lines.push("None.");
 for(const e of c.exceptions)lines.push("- "+safe(e.note)+" — "+(e.resolvedAt?"Resolved":"Open"));
 lines.push("","## Audit history");
 for(const e of s.events.filter(e=>e.caseId===id).slice().reverse())lines.push("- "+e.at+" · "+safe(e.detail)+" · "+safe(e.actor));
 return lines.join("\n");
}
const csvCell=v=>{let s=String(v??"");if(/^\s*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
export function auditCSV(s){
 const rows=[["Event ID","UTC time","Case reference","Actor","Action"].map(csvCell).join(",")];
 for(const e of s.events)rows.push([e.id,e.at,e.caseId,e.actor,e.detail].map(csvCell).join(","));
 return "\ufeff"+rows.join("\r\n");
}
