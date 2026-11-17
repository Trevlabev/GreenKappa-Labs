import {PRIORITIES,TEAMS,blankWorkspace,importWorkspace,createCase,completeTask,taskAvailability,addException,resolveException,reassign,reprioritize,updateProfile,validateProfile,describeCase,dashboard,addDays,caseReport,auditCSV} from "./core.mjs?v=3";
import {demoWorkspace} from "./sample.mjs";
import {mountWorkflowDesigner} from "./designer.mjs?v=3";

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const key="gkl.courtflow.workspace.v1";
const escape=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const localToday=()=>{
 const d=new Date();return String(d.getFullYear()).padStart(4,"0")+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
};
const prettyDay=day=>{
 if(!day)return "—";
 return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(day+"T12:00:00Z"));
};
const prettyTime=value=>new Intl.DateTimeFormat("en-US",{dateStyle:"medium",timeStyle:"short",timeZone:"UTC"}).format(new Date(value))+" UTC";
let workspace=null,selectedId=null,selectedProfile=null,activeTab="queue",toastTimer=null,storageOk=true,studio=null;
try{
 const saved=localStorage.getItem(key);
 workspace=saved?importWorkspace(JSON.parse(saved)):demoWorkspace();
}catch(err){
 workspace=demoWorkspace();
 storageOk=false;
 console.warn("CourtFlow restored synthetic data after invalid or unavailable storage.",err);
}
selectedId=workspace.cases[0]?.id||null;
selectedProfile=workspace.profiles[0]?.id||null;
$("#year").textContent=String(new Date().getFullYear());
function message(text,isError=false){
 const el=$("#notice");el.textContent=text;el.classList.toggle("is-error",isError);el.hidden=false;
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true;},4400);
}
function save(){
 try{
  localStorage.setItem(key,JSON.stringify(workspace));
  storageOk=true;$("#save-status").textContent="Saved to this device · no server sync";
 }catch(err){
  storageOk=false;$("#save-status").textContent="Storage unavailable · export your work";
 }
}
function mutate(callback,success){
 try{
  const updated=callback();workspace=importWorkspace(updated);
  if(!workspace.cases.some(c=>c.id===selectedId))selectedId=workspace.cases[0]?.id||null;
  save();render();if(success)message(success);
 }catch(err){message(err.message||"Action could not be completed.",true);}
}
function download(name,mime,contents){
 const blob=new Blob([contents],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const statusClass=status=>({
 "Completed":"is-completed","Exception":"is-exception","Overdue":"is-overdue","Due soon":"is-due-soon","Active":"is-active"
})[status]||"is-active";
const taskClass=status=>status==="ready"?"is-ready":status==="done"?"is-done":"is-blocked";
const statusSort={Exception:0,Overdue:1,"Due soon":2,Active:3,Completed:4};
const options=(values,selected)=>values.map(v=>'<option value="'+escape(v)+'"'+(v===selected?' selected':'')+'>'+escape(v)+'</option>').join("");
const statuses=["all","Active","Due soon","Overdue","Exception","Completed"];
function selectedCase(){return workspace.cases.find(c=>c.id===selectedId)||null;}
function metrics(){
 const m=dashboard(workspace,localToday());
 $("#metric-open").textContent=m.open;
 $("#metric-overdue").textContent=m.overdue;
 $("#metric-exceptions").textContent=m.exceptions;
 $("#metric-completed").textContent=m.completed;
}
function updateFilters(){
 const p=$("#filter-profile"),old=p.value||"all";
 p.innerHTML='<option value="all">All workflows</option>'+workspace.profiles.map(x=>'<option value="'+escape(x.id)+'">'+escape(x.name)+'</option>').join("");
 p.value=workspace.profiles.some(x=>x.id===old)?old:"all";
 const team=$("#filter-team"),oldTeam=team.value||"all";
 team.innerHTML='<option value="all">All teams</option>'+TEAMS.map(x=>'<option value="'+escape(x)+'">'+escape(x)+'</option>').join("");
 team.value=TEAMS.includes(oldTeam)?oldTeam:"all";
}
function renderQueue(){
 const text=$("#filter-search").value.trim().toLowerCase(),status=$("#filter-status").value,profile=$("#filter-profile").value,team=$("#filter-team").value;
 const cases=workspace.cases.filter(c=>{
  const d=describeCase(c,localToday());
  return (status==="all"||d.status===status)&&(profile==="all"||c.profileId===profile)&&(team==="all"||c.team===team)&&(!text||[c.id,c.title,c.summary,c.team,c.priority].some(s=>s.toLowerCase().includes(text)));
 }).sort((a,b)=>{
  const da=describeCase(a,localToday()),db=describeCase(b,localToday());
  return statusSort[da.status]-statusSort[db.status]||PRIORITIES.indexOf(b.priority)-PRIORITIES.indexOf(a.priority)||a.receivedDate.localeCompare(b.receivedDate);
 });
 $("#queue-count").textContent=String(cases.length);
 $("#queue-list").innerHTML=cases.length?cases.map(c=>{
  const d=describeCase(c,localToday()),p=workspace.profiles.find(x=>x.id===c.profileId);
  return '<button type="button" data-case="'+escape(c.id)+'" class="cf-case-row'+(c.id===selectedId?' is-selected':'')+'" aria-pressed="'+(c.id===selectedId?'true':'false')+'">'+
   '<span class="cf-case-row-top"><span class="cf-ref">'+escape(c.reference)+'</span><span class="cf-pill '+statusClass(d.status)+'">'+escape(d.status)+'</span></span>'+
   '<strong>'+escape(c.title)+'</strong><span class="cf-case-row-meta"><span>'+escape(p?.name||c.profileId)+'</span><span>· '+escape(c.team)+'</span><span>· '+escape(c.priority)+'</span><span>· '+d.completed+'/'+c.tasks.length+' tasks</span></span></button>';
 }).join(""):'<p class="cf-empty">No cases match these filters. Adjust the search or create a synthetic intake.</p>';
}
function renderDetail(){
 const panel=$("#case-detail"),c=selectedCase();
 if(!c){panel.innerHTML='<p class="cf-empty">No selected case. Select a queue item or create a new synthetic intake.</p>';return;}
 const d=describeCase(c,localToday()),p=workspace.profiles.find(x=>x.id===c.profileId);
 const selectTeam='<select data-assign aria-label="Assigned team"'+(c.closedAt?' disabled':'')+'>'+options(TEAMS,c.team)+'</select>';
 const selectPriority='<select data-priority aria-label="Case priority"'+(c.closedAt?' disabled':'')+'>'+options(PRIORITIES,c.priority)+'</select>';
 const tasks=c.tasks.map((t,i)=>{
  const a=taskAvailability(c,t),due=addDays(c.receivedDate,t.offset);
  const status=a.status==="done"?"Completed":a.status==="ready"?"Ready":"Blocked";
  return '<div class="cf-task"><div><strong>'+String(i+1).padStart(2,"0")+' / '+escape(t.label)+'</strong>'+
   '<small>Simulated target: '+prettyDay(due)+' · Depends on: '+escape(t.dependsOn.join(", ")||"none")+'</small>'+
   (a.status==="blocked"?'<p>'+escape(a.reason)+'</p>':'')+'</div><div class="cf-task-action">'+
   '<span class="cf-pill '+taskClass(a.status)+'">'+status+'</span>'+
   (a.status==="ready"?'<button type="button" class="cf-btn cf-btn-primary" data-complete="'+escape(t.id)+'">Mark complete</button>':'')+'</div></div>';
 }).join("");
 const exceptions=c.exceptions.length?c.exceptions.map(e=>
  '<div class="cf-exception'+(e.resolvedAt?' is-resolved':'')+'"><div><p>'+escape(e.note)+'</p>'+
  '<small>'+prettyTime(e.createdAt)+' · '+(e.resolvedAt?'Resolved '+prettyTime(e.resolvedAt):'Open exception')+'</small></div>'+
  (e.resolvedAt?'':'<button type="button" class="cf-btn cf-btn-secondary" data-resolve="'+escape(e.id)+'">Resolve</button>')+'</div>').join(""):
  '<p class="cf-help">No exceptions recorded for this case.</p>';
 panel.innerHTML='<div class="cf-detail-kicker"><span class="cf-ref">'+escape(c.reference)+'</span><span class="cf-pill '+statusClass(d.status)+'">'+escape(d.status)+'</span></div>'+
 '<h3 id="case-detail-title" class="cf-detail-title">'+escape(c.title)+'</h3><div class="cf-detail-profile">'+escape(p?.name||c.profileId)+'</div>'+
 '<p class="cf-detail-summary">'+escape(c.summary||"No additional case summary.")+'</p>'+
 '<div class="cf-detail-controls"><label>Assigned team '+selectTeam+'</label><label>Priority '+selectPriority+'</label></div>'+
 '<div class="cf-progress-legend"><span>Workflow progress <strong>'+d.completed+' / '+c.tasks.length+'</strong></span><span>Simulated overall target: '+prettyDay(d.target)+'</span></div>'+
 '<div class="cf-progress-track" role="progressbar" aria-label="Task completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+d.percent+'"><div style="width:'+d.percent+'%"></div></div>'+
 '<div class="cf-subhead"><h4>Dependent tasks</h4><span>'+d.ready+' ready · '+d.remaining+' remaining</span></div><div class="cf-tasks">'+tasks+'</div>'+
 '<div class="cf-subhead"><h4>Exceptions</h4><span>'+d.exceptions+' unresolved</span></div><div class="cf-exception-list">'+exceptions+'</div>'+
 (c.closedAt?'':'<form id="exception-form" class="cf-exception-form"><input type="text" name="note" maxlength="400" required aria-label="New exception note" placeholder="Document an illustrative exception…"><button class="cf-btn cf-btn-secondary" type="submit">Add exception</button></form>')+
 '<div class="cf-detail-footer"><small>Received '+prettyDay(c.receivedDate)+' · All target dates fictional</small><button type="button" id="export-case" class="cf-btn cf-btn-secondary">Export case report ↗</button></div>';
}
function renderAudit(){
 $("#audit-count").textContent=String(workspace.events.length);
 $("#audit-rows").innerHTML=workspace.events.slice().reverse().slice(0,1000).map(e=>
  '<tr><td>'+prettyTime(e.at)+'</td><td>'+escape(e.caseId)+'</td><td>'+escape(e.detail)+'</td><td>'+escape(e.actor)+'</td></tr>').join("");
}
function render(){
 metrics();updateFilters();renderQueue();renderDetail();studio?.sync();renderAudit();
}
function openTab(name){
 activeTab=name;
 for(const button of $$("[data-tab]")){
  const active=button.dataset.tab===name;button.classList.toggle("is-active",active);button.setAttribute("aria-selected",String(active));
  $("#pane-"+button.dataset.tab).hidden=!active;
 }
 if(name==="studio")studio?.draw();
}
$$("[data-tab]").forEach(button=>{
 button.addEventListener("click",()=>openTab(button.dataset.tab));
 button.addEventListener("keydown",e=>{
  const names=["queue","studio","audit"],i=names.indexOf(button.dataset.tab);
  const next=e.key==="ArrowRight"?names[(i+1)%3]:e.key==="ArrowLeft"?names[(i+2)%3]:e.key==="Home"?"queue":e.key==="End"?"audit":null;
  if(next){e.preventDefault();openTab(next);$("#tab-"+next).focus();}
 });
});
$("#queue-list").addEventListener("click",e=>{
 const button=e.target.closest("[data-case]");if(!button)return;
 selectedId=button.dataset.case;renderQueue();renderDetail();
});
$("#case-detail").addEventListener("click",e=>{
 const completed=e.target.closest("[data-complete]"),resolved=e.target.closest("[data-resolve]");
 if(completed)mutate(()=>completeTask(workspace,selectedId,completed.dataset.complete),"Task marked complete.");
 if(resolved)mutate(()=>resolveException(workspace,selectedId,resolved.dataset.resolve),"Exception resolved.");
 if(e.target.closest("#export-case")){
  const c=selectedCase();if(!c)return;
  download("courtflow-"+c.id+"-report.md","text/markdown;charset=utf-8",caseReport(workspace,c.id,localToday()));
  message("Case report exported. Review before sharing.");
 }
});
$("#case-detail").addEventListener("change",e=>{
 if(e.target.matches("[data-assign]"))mutate(()=>reassign(workspace,selectedId,e.target.value),"Team assignment updated.");
 if(e.target.matches("[data-priority]"))mutate(()=>reprioritize(workspace,selectedId,e.target.value),"Priority updated.");
});
$("#case-detail").addEventListener("submit",e=>{
 if(!e.target.matches("#exception-form"))return;
 e.preventDefault();
 const note=e.target.elements.note.value;
 mutate(()=>addException(workspace,selectedId,note),"Exception logged.");
});
for(const id of ["filter-search","filter-status","filter-profile","filter-team"]){
 $("#"+id).addEventListener(id==="filter-search"?"input":"change",renderQueue);
}
studio=mountWorkflowDesigner({
 getProfiles:()=>workspace.profiles,
 onSave:edited=>{
  // Validate, commit and persist only when the complete workflow graph is executable.
  const updated=updateProfile(workspace,edited);
  workspace=importWorkspace(updated);
  save();render();
 },
 onNotice:message
});
$("#new-intake").addEventListener("click",()=>{
 const select=$("#intake-profile");select.innerHTML=workspace.profiles.map(p=>'<option value="'+escape(p.id)+'">'+escape(p.name)+'</option>').join("");
 $("#intake-team").innerHTML=options(TEAMS,"Intake");$("#intake-priority").innerHTML=options(PRIORITIES,"Routine");
 $("#intake-date").value=localToday();$("#intake-dialog").showModal();
});
const closeIntake=()=>$("#intake-dialog").close();
$("#close-intake").addEventListener("click",closeIntake);$("#cancel-intake").addEventListener("click",closeIntake);
$("#intake-form").addEventListener("submit",e=>{
 e.preventDefault();
 if(!e.target.reportValidity())return;
 const f=new FormData(e.target),input={
  title:String(f.get("title")||""),profileId:String(f.get("profileId")||""),
  receivedDate:String(f.get("receivedDate")||""),team:String(f.get("team")||""),
  priority:String(f.get("priority")||""),summary:String(f.get("summary")||"")
 };
 try{
  const next=createCase(workspace,input);selectedId=next.cases[0].id;
  workspace=next;save();render();closeIntake();openTab("queue");e.target.reset();message("Synthetic intake created.");
 }catch(err){message(err.message,true);}
});
$("#load-demo").addEventListener("click",()=>{
 if(!confirm("Replace this browser's CourtFlow workspace with fresh synthetic sample cases? Export anything you wish to keep first."))return;
 workspace=demoWorkspace();selectedId=workspace.cases[0]?.id;selectedProfile=workspace.profiles[0].id;
 save();studio.reset();$("#filter-search").value="";$("#filter-status").value="all";$("#filter-profile").value="all";$("#filter-team").value="all";
 render();openTab("queue");message("Synthetic sample workspace restored.");
});
$("#export-json").addEventListener("click",()=>{
 download("courtflow-workspace-v1.json","application/json;charset=utf-8",JSON.stringify(workspace,null,2));
 message("Workspace exported. JSON includes all case fields and audit entries.");
});
$("#import-json").addEventListener("click",()=>$("#import-file").click());
$("#import-file").addEventListener("change",async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  if(file.size>3_000_000)throw Error("Imported workspaces must be under 3 MB.");
  const parsed=importWorkspace(JSON.parse(await file.text()));
  if(!confirm("Replace the current workspace with this JSON file?"))return;
  workspace=parsed;selectedId=workspace.cases[0]?.id||null;selectedProfile=workspace.profiles[0].id;
  save();studio.reset();render();openTab("queue");message("Workspace imported and validated.");
 }catch(err){message("Import failed: "+(err.message||"Invalid JSON"),true);}
 finally{e.target.value="";}
});
$("#export-audit").addEventListener("click",()=>{
 download("courtflow-audit-events.csv","text/csv;charset=utf-8",auditCSV(workspace));
 message("Audit CSV exported. Formula-style cell content is neutralized.");
});
render();save();openTab("queue");
if(!storageOk)message("Browser storage unavailable. Use Export workspace before leaving.",true);
