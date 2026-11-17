import {LIMITS,newProcedure,normalizeProcedure,analyzeProcedure,newWorkspace,normalizeWorkspace,publishProcedure,startRun,advanceRun,backRun,toRunRecord,runMarkdown,uniqueId} from "./core.mjs";
import {SAMPLE_PROCEDURES} from "./sample.mjs";

/* User-controlled, browser-only UI. Render all imported values as escaped text. */
const el=(id)=>document.getElementById(id);
const escapeHtml=(v)=>String(v??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone=(v)=>JSON.parse(JSON.stringify(v));
const STORAGE="gkl-handoff-atlas-workspace-v1",DRAFT_KEY="gkl-handoff-atlas-draft-v1",RUN_KEY="gkl-handoff-atlas-active-run-v1";
let workspace=newWorkspace(SAMPLE_PROCEDURES),selectedId=SAMPLE_PROCEDURES[0].id,view="library";
let draft=null,dirty=false,selectedStepId="",activeRun=null,toastTimeout=null,storageWarning=false;
const safeName=(name)=>String(name||"handoff").toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70)||"handoff";
const fmt=(s)=>{if(!s)return "Not recorded";const d=new Date(s);return Number.isNaN(d.getTime())?String(s).slice(0,35):d.toLocaleString([], {year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});};
const clock=()=>new Date().toISOString();
const selected=()=>workspace.procedures.find(p=>p.id===selectedId)||null;
const statusPill=(p)=>'<span class="ha-pill '+(p.status==="published"?"ha-pill-success":"ha-pill-draft")+'">'+(p.status==="published"?"Published v"+p.revision:"Draft")+'</span>';

function notify(message,kind="ok"){
 const toast=el("ha-toast");toast.textContent=message;toast.dataset.kind=kind==="error"?"error":"success";toast.classList.add("is-visible");
 clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>toast.classList.remove("is-visible"),4300);
}
function persist(){
 try{
  localStorage.setItem(STORAGE,JSON.stringify(workspace));
  if(draft)localStorage.setItem(DRAFT_KEY,JSON.stringify({procedure:draft,selectedStepId,dirty}));else localStorage.removeItem(DRAFT_KEY);
  if(activeRun)localStorage.setItem(RUN_KEY,JSON.stringify(activeRun));else localStorage.removeItem(RUN_KEY);
  el("ha-save-status").textContent="Saved to this browser · export JSON for backup";
 }catch(err){
  el("ha-save-status").textContent="Local storage unavailable · export your workspace";
  if(!storageWarning){storageWarning=true;notify("Local saving failed. Export a workspace JSON copy.","error");}
 }
}
function load(){
 try{
  const stored=localStorage.getItem(STORAGE);
  if(stored)workspace=normalizeWorkspace(JSON.parse(stored));
  const working=localStorage.getItem(DRAFT_KEY);
  if(working){
   const state=JSON.parse(working);
   if(state.procedure){draft=normalizeProcedure(state.procedure);dirty=!!state.dirty;selectedStepId=String(state.selectedStepId||draft.startId);selectedId=draft.id;}
  }
  const run=localStorage.getItem(RUN_KEY);
  if(run){const raw=JSON.parse(run);if(raw.snapshot&&raw.procedureId&&raw.startedAt){raw.snapshot=normalizeProcedure(raw.snapshot);activeRun=raw;}}
 }catch(error){notify("Stored workspace could not be loaded; using the fictional sample.","error");workspace=newWorkspace(SAMPLE_PROCEDURES);draft=null;activeRun=null;}
 if(!selected()&&workspace.procedures.length)selectedId=workspace.procedures[0].id;
}

function switchView(next){
 view=next;
 for(const button of document.querySelectorAll(".ha-tab")){
  const on=button.dataset.view===next;
  button.classList.toggle("is-active",on);
  if(on)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");
 }
 for(const name of ["library","editor","run","records"])el("ha-"+name).hidden=name!==next;
 if(next==="library")renderLibrary();
 else if(next==="editor")renderEditor();
 else if(next==="run")renderRun();
 else if(next==="records")renderRecords();
 document.querySelector(".ha-workspace").scrollIntoView({behavior:"auto",block:"start"});
}

function renderLibrary(){
 const query=el("ha-search").value.trim().toLowerCase();
 const category=el("ha-category").value;
 const categories=[...new Set(workspace.procedures.map(p=>p.category))].sort((a,b)=>a.localeCompare(b));
 const previous=category;
 el("ha-category").innerHTML='<option value="">All categories</option>'+categories.map(c=>'<option value="'+escapeHtml(c)+'">'+escapeHtml(c)+'</option>').join("");
 el("ha-category").value=categories.includes(previous)?previous:"";
 const filtered=workspace.procedures.filter(p=>(!category||p.category===category)&&(!query||(p.title+" "+p.summary+" "+p.owner+" "+p.category).toLowerCase().includes(query)));
 const list=el("ha-procedure-list");
 list.innerHTML=filtered.length?filtered.map(p=>
  '<button type="button" class="ha-procedure-row '+(p.id===selectedId?"is-selected":"")+'" data-select-procedure="'+escapeHtml(p.id)+'" aria-pressed="'+String(p.id===selectedId)+'">'+
   '<span class="ha-procedure-row-head"><strong>'+escapeHtml(p.title)+'</strong><span aria-hidden="true">↗</span></span>'+
   '<span class="ha-procedure-row-meta">'+statusPill(p)+'<span class="ha-pill">'+escapeHtml(p.category)+'</span></span>'+
   '<small>'+escapeHtml(p.summary||"No description yet.")+'</small></button>'
 ).join(""):'<div class="ha-empty">No matching procedures. Try a different search or create a new playbook.</div>';
 renderDetails();
}
function renderDetails(){
 const p=selected(),target=el("ha-procedure-details");
 if(!p){target.innerHTML='<div class="ha-empty">No procedure selected. Choose a playbook or create one.</div>';return;}
 const a=analyzeProcedure(p),canRun=p.status==="published"&&!a.errors.length;
 target.innerHTML=
  '<span class="ha-eyebrow">PROCEDURE / '+escapeHtml(p.category)+'</span><h3>'+escapeHtml(p.title)+'</h3>'+
  '<div>'+statusPill(p)+'</div><p>'+escapeHtml(p.summary||"Add a summary to explain the purpose and scope of this procedure.")+'</p>'+
  '<div class="ha-meta-grid">'+
   '<div><span>Owner</span><strong>'+escapeHtml(p.owner||"Not assigned")+'</strong></div>'+
   '<div><span>Steps</span><strong>'+p.steps.length+' total / '+a.terminalCount+' outcomes</strong></div>'+
   '<div><span>Revision</span><strong>'+(p.revision||"Unpublished")+'</strong></div>'+
   '<div><span>Published</span><strong>'+escapeHtml(fmt(p.publishedAt))+'</strong></div></div>'+
  '<div class="ha-diagnostic '+(a.errors.length?"ha-diagnostic-bad":a.warnings.length?"ha-diagnostic-warn":"ha-diagnostic-ok")+'">'+
   '<strong>'+(a.errors.length?a.errors.length+' validation issue(s)':a.warnings.length?a.warnings.length+' review warning(s)':"Validated procedure path")+'</strong>'+
   (a.errors.length?'<ul>'+a.errors.slice(0,4).map(m=>'<li>'+escapeHtml(m)+'</li>').join("")+'</ul>':a.warnings.length?'<ul>'+a.warnings.slice(0,3).map(m=>'<li>'+escapeHtml(m)+'</li>').join("")+'</ul>':'<p>All referenced steps exist and at least one completion is reachable.</p>')+
  '</div><div class="ha-details-actions">'+
   '<button type="button" class="ha-btn ha-btn-primary" data-procedure-action="run" '+(canRun?"":"disabled")+'>'+ (canRun?"Start guided run":"Publish a valid version first")+'</button>'+
   '<button type="button" class="ha-btn ha-btn-quiet" data-procedure-action="edit">Edit procedure</button>'+
   '<button type="button" class="ha-btn ha-btn-quiet" data-procedure-action="duplicate">Duplicate</button>'+
   '<button type="button" class="ha-btn ha-btn-quiet" data-procedure-action="export">Export JSON</button>'+
  '</div>';
}
function openEditor(p){
 if(draft&&dirty&&draft.id!==p.id&&!confirm("Replace the unsaved working copy? Your latest published version remains unchanged."))return;
 draft=clone(p);selectedId=p.id;selectedStepId=draft.startId||draft.steps[0]?.id||"";dirty=false;persist();switchView("editor");
}
function createProcedure(){
 if(workspace.procedures.length>=LIMITS.procedures){notify("Workspace procedure limit reached.","error");return;}
 if(draft&&dirty&&!confirm("Discard the current working copy and create a new procedure?"))return;
 const p=newProcedure();p.id=uniqueId(workspace.procedures.map(x=>x.id),"procedure");
 draft=p;selectedId=p.id;selectedStepId=p.startId;dirty=true;persist();switchView("editor");notify("New editable procedure created. Save or publish when ready.");
}
function flushDetails(){
 if(!draft)return;
 const form=el("ha-procedure-form");
 for(const name of ["title","summary","category","owner"])if(form.elements[name])draft[name]=form.elements[name].value;
 if(form.elements["startId"])draft.startId=form.elements["startId"].value;
}
function flushStep(){
 if(!draft||!selectedStepId)return;
 const step=draft.steps.find(s=>s.id===selectedStepId);if(!step)return;
 const form=el("ha-step-form");
 if(!form.querySelector('[name="stepTitle"]'))return;
 step.title=form.elements["stepTitle"].value;
 step.body=form.elements["stepBody"].value;
 step.caution=form.elements["stepCaution"].value;
 step.reference=form.elements["stepReference"].value;
 step.type=form.elements["stepType"].value;
 step.next=form.elements["stepNext"]?.value||"";
 step.outcome=form.elements["stepOutcome"]?.value||"documented";
 if(step.type==="decision"){
  step.options=[...form.querySelectorAll("[data-choice-row]")].map(row=>({
   label:row.querySelector("[data-choice-label]").value,to:row.querySelector("[data-choice-route]").value
  }));
 }
}
function flush(){flushDetails();flushStep();if(draft){dirty=true;persist();}}
function setDraftStatus(){el("ha-draft-status").textContent=(dirty?"Working copy · not published":draft.status==="published"?"Published v"+draft.revision:"Draft")+(draft.revision?" · base v"+draft.revision:"");}
function renderEditor(){
 if(!draft){
  const p=selected();if(p){draft=clone(p);selectedStepId=draft.startId;}else{draft=newProcedure();selectedStepId=draft.startId;dirty=true;}
 }
 const form=el("ha-procedure-form");
 for(const name of ["title","summary","category","owner"])form.elements[name].value=draft[name]||"";
 form.elements["startId"].innerHTML=draft.steps.map(s=>'<option value="'+escapeHtml(s.id)+'">'+escapeHtml(s.title||s.id)+' ('+escapeHtml(s.id)+')</option>').join("");
 form.elements["startId"].value=draft.startId;
 renderStepList();renderStepForm();renderValidation();renderRevisions();setDraftStatus();
}
function renderStepList(){
 el("ha-step-count").textContent=draft.steps.length+" steps";
 el("ha-step-list").innerHTML=draft.steps.map((s,i)=>
  '<button type="button" class="ha-step-row '+(selectedStepId===s.id?"is-selected":"")+'" data-select-step="'+escapeHtml(s.id)+'" aria-pressed="'+String(selectedStepId===s.id)+'">'+
  '<span class="ha-step-id">'+(i+1)+'</span><span class="ha-step-name"><strong>'+escapeHtml(s.title||s.id)+'</strong><small>'+escapeHtml(s.type)+' · '+escapeHtml(s.id)+(s.id===draft.startId?" · ENTRY":"")+'</small></span></button>'
 ).join("");
}
function routeOptions(value,includeBlank=true){
 return (includeBlank?'<option value="">— Choose destination —</option>':"")+draft.steps.map(s=>'<option value="'+escapeHtml(s.id)+'" '+(value===s.id?"selected":"")+'>'+escapeHtml(s.title||s.id)+' ('+escapeHtml(s.id)+')</option>').join("");
}
function renderStepForm(){
 const step=draft.steps.find(x=>x.id===selectedStepId)||draft.steps[0];
 if(!step){el("ha-step-form").innerHTML='<p class="ha-empty">Add a step to begin.</p>';return;}
 selectedStepId=step.id;
 const choiceInputs=step.type==="decision"?
  '<div class="ha-panel-heading"><h3>Decision routes</h3><button type="button" class="ha-text-button" id="ha-add-choice">+ Add choice</button></div>'+
   '<p class="ha-form-help">Each choice directs the operator to a defined next step. At least two choices are required.</p>'+
   step.options.map((o,i)=>'<div class="ha-branch-row" data-choice-row="'+i+'"><label class="ha-field"><span>Choice label</span><input data-choice-label maxlength="160" value="'+escapeHtml(o.label)+'" placeholder="e.g., Issue is resolved"></label><label class="ha-field"><span>Go to step</span><select data-choice-route>'+routeOptions(o.to)+'</select></label><button type="button" class="ha-choice-remove" data-remove-choice="'+i+'" aria-label="Remove choice '+(i+1)+'">Remove</button></div>').join(""):
  step.type==="instruction"?'<label class="ha-field"><span>Next step</span><select name="stepNext">'+routeOptions(step.next)+'</select></label>':
  '<label class="ha-field"><span>Terminal outcome</span><select name="stepOutcome">'+["resolved","escalated","blocked","documented"].map(o=>'<option value="'+o+'" '+(step.outcome===o?"selected":"")+'>'+o.charAt(0).toUpperCase()+o.slice(1)+'</option>').join("")+'</select></label>';
 el("ha-step-form").innerHTML=
  '<div class="ha-step-form-grid"><label class="ha-field"><span>Stable step identifier</span><input value="'+escapeHtml(step.id)+'" readonly aria-describedby="ha-step-id-explain"></label>'+
  '<p id="ha-step-id-explain" class="ha-form-help">IDs remain stable; rename a step using its title. Routes reference IDs.</p>'+
  '<label class="ha-field"><span>Step title</span><input name="stepTitle" maxlength="150" value="'+escapeHtml(step.title)+'"></label>'+
  '<label class="ha-field"><span>Step type</span><select name="stepType">'+["instruction","decision","terminal"].map(v=>'<option value="'+v+'" '+(v===step.type?"selected":"")+'>'+({instruction:"Instruction / Continue",decision:"Decision / Branch",terminal:"Terminal / Finish"}[v])+'</option>').join("")+'</select></label>'+
  '<label class="ha-field"><span>Operator instructions</span><textarea name="stepBody" rows="5" maxlength="6000">'+escapeHtml(step.body)+'</textarea></label>'+
  '<label class="ha-field"><span>Caution / exception note</span><textarea name="stepCaution" rows="2" maxlength="1200" placeholder="Optional caution or review boundary">'+escapeHtml(step.caution)+'</textarea></label>'+
  '<label class="ha-field"><span>Reference / source label</span><input name="stepReference" maxlength="1200" placeholder="Optional reference identifier" value="'+escapeHtml(step.reference)+'"></label>'+
  '<div id="ha-route-config">'+choiceInputs+'</div></div>';
 el("ha-delete-step").disabled=draft.steps.length<=1;
}
function renderValidation(){
 if(!draft)return;
 let a;try{a=analyzeProcedure(draft);}catch(e){el("ha-validation").innerHTML='<div class="ha-diagnostic ha-diagnostic-bad">'+escapeHtml(e.message)+'</div>';return;}
 const list=(items)=>'<ul>'+items.map(x=>'<li>'+escapeHtml(x)+'</li>').join("")+'</ul>';
 el("ha-validation").innerHTML=
  '<div class="ha-diagnostic '+(a.errors.length?"ha-diagnostic-bad":"ha-diagnostic-ok")+'"><strong>'+ (a.errors.length?a.errors.length+" blocking error(s)":"No blocking path errors")+'</strong>'+
  (a.errors.length?list(a.errors):'<p>All required routes are connected to valid steps.</p>')+'</div>'+
  (a.warnings.length?'<div class="ha-diagnostic ha-diagnostic-warn"><strong>Review warnings</strong>'+list(a.warnings)+'</div>':"")+
  '<p class="ha-form-help">'+a.stepCount+' total steps · '+a.reachable.length+' reachable · '+a.terminalCount+' terminal outcomes. Publishing is blocked until errors are resolved.</p>';
}
function renderRevisions(){
 const list=workspace.revisions[draft.id]||[];
 el("ha-history-count").textContent=list.length+" snapshots";
 el("ha-revisions").innerHTML=list.length?list.slice().reverse().map(r=>
  '<div class="ha-revision-row"><div><strong>Revision '+r.revision+'</strong><small>'+escapeHtml(fmt(r.at))+'</small></div>'+
  '<button class="ha-text-button" type="button" data-restore-revision="'+r.revision+'">Restore as draft</button></div>'
 ).join(""):'<p class="ha-form-help">No published revision snapshots yet. A snapshot is saved whenever you publish a validated procedure.</p>';
}
function saveDraft(){
 if(!draft)return;
 flush();
 const save=clone(draft);save.status="draft";save.updatedAt=clock();
 const index=workspace.procedures.findIndex(p=>p.id===save.id);
 if(index>=0)workspace.procedures[index]=save;
 else if(workspace.procedures.length<LIMITS.procedures)workspace.procedures.unshift(save);
 else {notify("Procedure capacity exceeded.","error");return;}
 draft=clone(save);selectedId=save.id;dirty=false;workspace.updatedAt=clock();persist();
 renderEditor();notify("Draft saved in this browser.");
}
function publishDraft(){
 if(!draft)return;
 flush();
 try{
  const prev=workspace.revisions[draft.id]||[];
  const result=publishProcedure(draft,prev);
  const index=workspace.procedures.findIndex(p=>p.id===draft.id);
  if(index>=0)workspace.procedures[index]=result.published;
  else if(workspace.procedures.length<LIMITS.procedures)workspace.procedures.unshift(result.published);
  else throw Error("Procedure capacity exceeded.");
  workspace.revisions[draft.id]=result.revisions;
  selectedId=draft.id;draft=clone(result.published);dirty=false;workspace.updatedAt=clock();
  persist();renderEditor();notify("Revision "+draft.revision+" published. Ready for guided runs.");
 }catch(err){renderValidation();notify(err.message,"error");}
}
function addStep(){
 if(!draft)return;flush();
 if(draft.steps.length>=LIMITS.steps){notify("This procedure has reached its 100-step limit.","error");return;}
 const id=uniqueId(draft.steps.map(x=>x.id),"step");
 draft.steps.push({id,title:"New step",body:"",type:"terminal",next:"",options:[],outcome:"documented",reference:"",caution:""});
 selectedStepId=id;dirty=true;persist();renderEditor();notify("Added a terminal step. Configure or change its type.");
}
function removeStep(){
 if(!draft)return;
 if(draft.steps.length<2){notify("A procedure must keep at least one step.","error");return;}
 if(!confirm("Delete this step? Any paths that point to it must be repaired before publishing."))return;
 const id=selectedStepId;draft.steps=draft.steps.filter(x=>x.id!==id);
 if(draft.startId===id)draft.startId=draft.steps[0].id;
 selectedStepId=draft.steps[0].id;dirty=true;persist();renderEditor();notify("Step removed. Review path validation.");
}
function runProcedure(p){
 try{
  if(activeRun&&!activeRun.endedAt&&!confirm("Replace the unfinished guided run? It will not be archived."))return;
  activeRun=startRun(p,"Demo operator");persist();switchView("run");
  notify("Guided run started using published revision "+p.revision+".");
 }catch(err){notify(err.message,"error");}
}
function renderRun(){
 const container=el("ha-run-container");
 el("ha-abandon-run").hidden=!activeRun||!!activeRun.endedAt;
 if(!activeRun){el("ha-run-subtitle").textContent="Select a published procedure from the library to begin.";container.innerHTML='<div class="ha-empty">No active run. Select a published procedure from your library.</div>';return;}
 el("ha-run-subtitle").textContent=activeRun.title+" · Revision "+activeRun.revision;
 if(activeRun.endedAt){
  container.innerHTML='<div class="ha-run-done"><span class="ha-eyebrow">RUN COMPLETE / HANDOFF CAPTURED</span><h3>'+escapeHtml(activeRun.outcome.charAt(0).toUpperCase()+activeRun.outcome.slice(1))+'</h3>'+
   '<p>'+activeRun.trail.length+' steps captured in a local handoff record. Review its route and export it for a human recipient.</p>'+
   '<button type="button" class="ha-btn ha-btn-primary" data-run-action="records">View handoff history</button></div>';
  return;
 }
 const step=activeRun.snapshot.steps.find(x=>x.id===activeRun.currentId);
 if(!step){container.innerHTML='<div class="ha-diagnostic ha-diagnostic-bad">Current run step is missing. End the run and start again.</div>';return;}
 const choices=step.type==="decision"?'<div class="ha-choice-list">'+step.options.map((o,i)=>'<button type="button" data-run-choice="'+i+'"><span>'+escapeHtml(o.label)+'</span><span aria-hidden="true">↗</span></button>').join("")+'</div>':"";
 const continueButton=step.type==="decision"?"":'<button type="button" class="ha-btn ha-btn-primary" data-run-action="advance">'+(step.type==="terminal"?"Finish & archive":"Continue to next step →")+'</button>';
 container.innerHTML=
  '<div class="ha-run-progress"><span>Published procedure v'+activeRun.revision+'</span><span>'+activeRun.trail.length+' completed steps · up to 100 actions</span></div>'+
  '<div class="ha-run-meta"><span class="ha-pill ha-pill-success">In progress</span><span class="ha-pill">'+escapeHtml(activeRun.snapshot.category)+'</span><span class="ha-pill">'+escapeHtml(activeRun.operator)+'</span></div>'+
  '<article class="ha-run-card"><span class="ha-step-type">'+escapeHtml(step.type.toUpperCase())+' / '+escapeHtml(step.id)+'</span>'+
   '<h3>'+escapeHtml(step.title)+'</h3><div class="ha-instruction">'+escapeHtml(step.body||"No instructions recorded.")+'</div>'+
   '<div class="ha-context">'+(step.caution?'<p><strong>CAUTION:</strong> '+escapeHtml(step.caution)+'</p>':"")+
   (step.reference?'<p><strong>REFERENCE:</strong> '+escapeHtml(step.reference)+'</p>':"")+'</div>'+
   '<label class="ha-field"><span>Operator note (optional; included in exported handoff)</span><textarea id="ha-run-note" maxlength="1500" rows="3" placeholder="Observations, assumptions, and follow-up for the next person…"></textarea></label>'+
   choices+'<div class="ha-run-footer"><button type="button" class="ha-btn ha-btn-quiet" data-run-action="back" '+(activeRun.trail.length?"":"disabled")+'">← Previous step</button>'+continueButton+'</div></article>'+
  '<div class="ha-panel"><div class="ha-panel-heading"><h3>Recorded route</h3><span>'+activeRun.trail.length+' decisions / actions</span></div>'+
   (activeRun.trail.length?'<ol class="ha-run-path">'+activeRun.trail.map(t=>'<li><strong>'+escapeHtml(t.title)+'</strong><span>'+escapeHtml(t.decision||"continued")+'</span></li>').join("")+'</ol>':'<p class="ha-form-help">Complete the first step to start the handoff trail.</p>')+'</div>';
}
function performStep(choice=null){
 try{
  const note=el("ha-run-note")?.value||"";
  const done=advanceRun(activeRun,choice,note);
  activeRun=done.run;
  if(done.finished){
   workspace.runs.unshift(toRunRecord(activeRun));
   workspace.runs=workspace.runs.slice(0,LIMITS.runs);
   workspace.updatedAt=clock();notify("Procedure completed and a local handoff record was created.");
  }
  persist();renderRun();
 }catch(err){notify(err.message,"error");}
}
function renderRecords(){
 const list=el("ha-records-list");
 list.innerHTML=workspace.runs.length?workspace.runs.map(r=>
  '<article class="ha-record"><div class="ha-record-head"><div><span class="ha-eyebrow">HANDOFF / '+escapeHtml(r.procedureId)+'</span>'+
  '<h3>'+escapeHtml(r.title)+'</h3><p>Revision '+r.revision+' · '+escapeHtml(fmt(r.startedAt))+' → '+escapeHtml(fmt(r.endedAt))+
  ' · '+r.trail.length+' steps · '+escapeHtml(r.operator||"Unspecified")+'</p><span class="ha-pill ha-pill-success">'+escapeHtml(r.outcome)+'</span></div>'+
  '<div class="ha-record-actions"><button type="button" class="ha-btn ha-btn-quiet" data-export-record="'+escapeHtml(r.id)+'" data-format="md">Markdown</button>'+
  '<button type="button" class="ha-btn ha-btn-quiet" data-export-record="'+escapeHtml(r.id)+'" data-format="json">JSON</button></div></div>'+
  '<details class="ha-record-steps"><summary>View route and operator notes</summary><ol>'+r.trail.map(t=>'<li><strong>'+escapeHtml(t.title)+'</strong>'+
    (t.decision?' — '+escapeHtml(t.decision):"")+(t.note?'<p>'+escapeHtml(t.note)+'</p>':"")+'</li>').join("")+'</ol></details></article>'
 ).join(""):'<div class="ha-empty">No completed handoff records yet. Start a guided run from the library to create one.</div>';
 el("ha-clear-records").disabled=!workspace.runs.length;
}
function download(filename,content,type="text/plain"){
 const blob=new Blob([content],{type:type+";charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportWorkspace(){
 if(draft&&dirty)notify("Your working copy is not published. Save draft before exporting the workspace.");
 download("handoff-atlas-workspace.json",JSON.stringify(workspace,null,2),"application/json");
}
async function importFile(file){
 if(!file)return;
 if(file.size>LIMITS.bytes){notify("File too large (maximum 1.2 MB).","error");return;}
 try{
  const json=JSON.parse(await file.text());
  if(Array.isArray(json.procedures)){
   const imported=normalizeWorkspace(json);
   if(!confirm("Replace this browser's procedures, revision history and handoff records with the imported workspace? Export first to keep a backup."))return;
   workspace=imported;draft=null;activeRun=null;selectedId=workspace.procedures[0]?.id||"";selectedStepId="";
   persist();switchView("library");notify("Workspace imported successfully.");
  }else{
   const proc=normalizeProcedure(json);
   const taken=workspace.procedures.map(p=>p.id);
   if(workspace.procedures.length>=LIMITS.procedures)throw Error("Workspace procedure limit reached.");
   if(taken.includes(proc.id))proc.id=uniqueId(taken,proc.id);
   proc.status="draft";proc.publishedAt="";proc.revision=0;
   workspace.procedures.unshift(proc);selectedId=proc.id;draft=clone(proc);selectedStepId=proc.startId;dirty=true;
   persist();switchView("editor");notify("Procedure imported as a working draft. Review before publishing.");
  }
 }catch(err){notify("Import rejected: "+err.message,"error");}
}
function wireEvents(){
 document.querySelectorAll("[data-view]").forEach(button=>button.addEventListener("click",()=>{
  if(view==="editor"&&draft)flush();
  switchView(button.dataset.view);
 }));
 el("ha-search").addEventListener("input",renderLibrary);
 el("ha-category").addEventListener("change",renderLibrary);
 el("ha-create").addEventListener("click",createProcedure);
 el("ha-procedure-list").addEventListener("click",(e)=>{
  const button=e.target.closest("[data-select-procedure]");if(!button)return;
  selectedId=button.dataset.selectProcedure;renderLibrary();
 });
 el("ha-procedure-details").addEventListener("click",(e)=>{
  const button=e.target.closest("[data-procedure-action]");if(!button)return;
  const p=selected();if(!p)return;
  const action=button.dataset.procedureAction;
  if(action==="run")runProcedure(p);
  if(action==="edit")openEditor(p);
  if(action==="export")download(safeName(p.title)+".json",JSON.stringify(p,null,2),"application/json");
  if(action==="duplicate"){
   if(workspace.procedures.length>=LIMITS.procedures){notify("Procedure limit reached.","error");return;}
   const duplicated=clone(p);duplicated.id=uniqueId(workspace.procedures.map(x=>x.id),p.id+"-copy");duplicated.title=p.title+" (copy)";
   duplicated.status="draft";duplicated.revision=0;duplicated.publishedAt="";duplicated.updatedAt=clock();
   workspace.procedures.unshift(duplicated);selectedId=duplicated.id;draft=clone(duplicated);selectedStepId=draft.startId;dirty=true;persist();switchView("editor");notify("Duplicated as a new draft.");
  }
 });
 el("ha-procedure-form").addEventListener("input",()=>{flushDetails();dirty=true;setDraftStatus();renderValidation();persist();});
 el("ha-procedure-form").addEventListener("change",()=>{flushDetails();dirty=true;renderStepList();renderValidation();persist();});
 el("ha-step-form").addEventListener("input",()=>{flushStep();dirty=true;setDraftStatus();renderValidation();persist();});
 el("ha-step-form").addEventListener("change",(e)=>{
  const changeType=e.target.name==="stepType";
  flushStep();dirty=true;persist();
  if(changeType){const step=draft.steps.find(x=>x.id===selectedStepId);if(step.type==="decision"&&step.options.length<2)step.options=[{label:"Yes",to:""},{label:"No",to:""}];renderStepForm();}
  renderValidation();renderStepList();setDraftStatus();
 });
 el("ha-step-form").addEventListener("click",(e)=>{
  const add=e.target.closest("#ha-add-choice"),remove=e.target.closest("[data-remove-choice]");
  if(!add&&!remove)return;
  flushStep();const step=draft.steps.find(s=>s.id===selectedStepId);if(!step||step.type!=="decision")return;
  if(add){if(step.options.length>=12){notify("Maximum 12 choices per decision.","error");return;}step.options.push({label:"",to:""});}
  else step.options.splice(Number(remove.dataset.removeChoice),1);
  dirty=true;persist();renderStepForm();renderValidation();
 });
 el("ha-step-list").addEventListener("click",(e)=>{
  const button=e.target.closest("[data-select-step]");if(!button)return;
  flush();selectedStepId=button.dataset.selectStep;persist();renderStepList();renderStepForm();renderValidation();
 });
 el("ha-add-step").addEventListener("click",addStep);
 el("ha-delete-step").addEventListener("click",removeStep);
 el("ha-save-draft").addEventListener("click",saveDraft);
 el("ha-publish").addEventListener("click",publishDraft);
 el("ha-revisions").addEventListener("click",(e)=>{
  const b=e.target.closest("[data-restore-revision]");if(!b||!draft)return;
  const record=(workspace.revisions[draft.id]||[]).find(x=>x.revision===Number(b.dataset.restoreRevision));
  if(!record)return;
  if(!confirm("Restore revision "+record.revision+" into the editable working copy? It will not overwrite published history."))return;
  const current=workspace.procedures.find(p=>p.id===draft.id);
  draft=clone(record.snapshot);draft.status="draft";draft.revision=current?.revision||draft.revision;
  selectedStepId=draft.startId;dirty=true;persist();renderEditor();notify("Snapshot restored as an unpublished working copy.");
 });
 el("ha-run-container").addEventListener("click",(e)=>{
  const choice=e.target.closest("[data-run-choice]"),action=e.target.closest("[data-run-action]");
  if(choice){performStep(Number(choice.dataset.runChoice));return;}
  if(!action)return;
  if(action.dataset.runAction==="advance")performStep();
  else if(action.dataset.runAction==="back"){try{activeRun=backRun(activeRun);persist();renderRun();}catch(err){notify(err.message,"error");}}
  else if(action.dataset.runAction==="records")switchView("records");
 });
 el("ha-abandon-run").addEventListener("click",()=>{
  if(!confirm("End this run without archiving a completed handoff record?"))return;
  activeRun=null;persist();renderRun();notify("Unfinished run discarded.");
 });
 el("ha-records-list").addEventListener("click",(e)=>{
  const btn=e.target.closest("[data-export-record]");if(!btn)return;
  const record=workspace.runs.find(r=>r.id===btn.dataset.exportRecord);if(!record)return;
  if(btn.dataset.format==="json")download(safeName(record.title)+"-handoff.json",JSON.stringify(record,null,2),"application/json");
  else download(safeName(record.title)+"-handoff.md",runMarkdown(record),"text/markdown");
 });
 el("ha-clear-records").addEventListener("click",()=>{
  if(!workspace.runs.length)return;
  if(!confirm("Permanently clear all completed handoff records from this browser? Export anything you need first."))return;
  workspace.runs=[];persist();renderRecords();notify("Completed records cleared.");
 });
 el("ha-export").addEventListener("click",exportWorkspace);
 el("ha-import").addEventListener("click",()=>el("ha-import-file").click());
 el("ha-import-file").addEventListener("change",async(e)=>{await importFile(e.target.files[0]);e.target.value="";});
 el("ha-reset").addEventListener("click",()=>{
  if(!confirm("Restore fictional sample procedures? This replaces your current browser workspace and records. Export first for a backup."))return;
  workspace=newWorkspace(SAMPLE_PROCEDURES);selectedId=workspace.procedures[0].id;draft=null;activeRun=null;selectedStepId="";
  el("ha-search").value="";el("ha-category").value="";persist();switchView("library");notify("Restored fictional example procedures.");
 });
}
load();wireEvents();switchView("library");persist();
