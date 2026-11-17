/* CourtFlow visual workflow designer (alpha 0.2).
   All routes are fictional intake-time priority predicates, never court rules. */
import {PRIORITIES,validateProfile} from "./core.mjs";
const copy=value=>JSON.parse(JSON.stringify(value));
const safe=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const W=224,H=118,STEP_X=286,STEP_Y=152;

export function autoArrange(profile){
 const levels=new Map(),lookup=new Map(profile.tasks.map(t=>[t.id,t]));
 const level=id=>{
  if(levels.has(id))return levels.get(id);
  const step=lookup.get(id);
  const n=step.dependsOn.length?1+Math.max(...step.dependsOn.map(level)):0;
  levels.set(id,n);return n;
 };
 profile.tasks.forEach(t=>level(t.id));
 const bins=new Map(),layout={};
 for(const t of profile.tasks){
  const l=levels.get(t.id),row=bins.get(l)||0;
  bins.set(l,row+1);
  layout[t.id]={x:36+l*STEP_X,y:35+row*STEP_Y};
 }
 return layout;
}
export function insertStep(profile,sourceId){
 const p=copy(profile);
 if(p.tasks.length>=12)throw Error("A workflow can contain at most 12 steps.");
 const final=p.tasks.find(t=>t.final),source=p.tasks.find(t=>t.id===sourceId&&!t.final)||p.tasks.find(t=>!t.final);
 let index=1,id="step_"+String(index).padStart(2,"0");
 while(p.tasks.some(t=>t.id===id)){index++;id="step_"+String(index).padStart(2,"0");}
 const step={id,label:"New processing step",offset:Math.min(365,source.offset+1),dependsOn:[source.id],final:false};
 if(source.when)step.when=copy(source.when);
 p.tasks.splice(p.tasks.indexOf(final),0,step);
 final.dependsOn.push(id);
 p.layout={...autoArrange(p)};
 return {profile:p,selected:id};
}
export function removeStep(profile,id){
 const p=copy(profile),t=p.tasks.find(t=>t.id===id);
 if(!t)throw Error("Select an existing step.");
 if(t.final)throw Error("Choose a different final handoff before deleting this step.");
 if(p.tasks.length<=2)throw Error("A workflow must contain at least two steps.");
 p.tasks=p.tasks.filter(step=>step.id!==id);
 for(const step of p.tasks){
  if(!step.dependsOn.includes(id))continue;
  step.dependsOn=[...new Set(step.dependsOn.filter(dep=>dep!==id).concat(t.dependsOn))];
 }
 if(p.layout)delete p.layout[id];
 return p;
}
export function connectSteps(profile,fromId,toId){
 const p=copy(profile),from=p.tasks.find(t=>t.id===fromId),to=p.tasks.find(t=>t.id===toId);
 if(!from||!to||from===to)throw Error("Choose two different steps to connect.");
 if(to.dependsOn.includes(fromId))return p;
 const lookup=new Map(p.tasks.map(t=>[t.id,t]));
 const ancestor=(id,needle,seen=new Set())=>{
  if(id===needle)return true;
  if(seen.has(id))return false;seen.add(id);
  return lookup.get(id).dependsOn.some(dep=>ancestor(dep,needle,seen));
 };
 if(ancestor(fromId,toId))throw Error("That connection would create a dependency cycle.");
 to.dependsOn.push(fromId);return p;
}
export function routeApplies(task,priority){
 return !task.when||task.when.priority===priority;
}
export function mountWorkflowDesigner({getProfiles,onSave,onNotice}){
 const el=id=>document.getElementById(id);
 const select=el("profile-select"),nodes=el("designer-nodes"),surface=el("designer-surface"),edges=el("designer-edges"),inspector=el("designer-inspector");
 let id=null,draft=null,selected=null,preview="Routine",connecting=false,dirty=false,suppressPointerClick=false;
 const profile=()=>getProfiles().find(p=>p.id===id);
 const chosen=()=>draft?.tasks.find(t=>t.id===selected)||null;
 const inform=(msg,bad=false)=>onNotice?.(msg,bad);
 function status(text,bad=false){
  const label=el("designer-status");label.textContent=text;label.classList.toggle("is-error",bad);
 }
 function check(){
  try{validateProfile(draft);status((dirty?"Unsaved changes · ":"")+"Graph valid for Routine, Elevated and Urgent intake routes.");return true;}
  catch(err){status("Validation: "+err.message,true);return false;}
 }
 function ensureLayout(){
  const arranged=autoArrange(draft);
  draft.layout={...arranged,...(draft.layout||{})};
 }
 function markDirty(){dirty=true;check();}
 function loadProfile(next=id){
  const p=getProfiles().find(x=>x.id===next)||getProfiles()[0];
  if(!p){draft=null;return;}
  id=p.id;draft=copy(p);ensureLayout();selected=draft.tasks[0]?.id||null;connecting=false;dirty=false;
  select.value=id;el("designer-preview-priority").value=preview;
  el("designer-name").value=draft.name;el("designer-description").value=draft.description;
  draw();inspectorView();check();toolbar();
 }
 function toolbar(){
  el("designer-connect").textContent=connecting?"Cancel connection":"Connect selected → step";
  el("designer-connect").setAttribute("aria-pressed",String(connecting));
  el("designer-remove").disabled=!chosen()||chosen().final||draft.tasks.length<=2;
  el("designer-add").disabled=draft.tasks.length>=12;
 }
 function sync(){
  const profiles=getProfiles();
  const before=select.value;
  select.innerHTML=profiles.map(p=>'<option value="'+safe(p.id)+'">'+safe(p.name)+'</option>').join("");
  if(!draft||!profiles.some(p=>p.id===id))loadProfile(profiles[0]?.id);
  else select.value=id;
 }
 function reset(){loadProfile(getProfiles()[0]?.id);}
 function drawEdges(){
  const canvasWidth=parseInt(surface.style.width,10),canvasHeight=parseInt(surface.style.height,10);
  edges.setAttribute("viewBox","0 0 "+canvasWidth+" "+canvasHeight);
  edges.setAttribute("width",String(canvasWidth));edges.setAttribute("height",String(canvasHeight));
  const map=new Map(draft.tasks.map(t=>[t.id,t]));
  const paths=[];
  for(const t of draft.tasks){
   const b=draft.layout[t.id];
   for(const dep of t.dependsOn){
    const a=draft.layout[dep];if(!a||!b)continue;
    const x1=a.x+W,y1=a.y+H/2,x2=b.x,y2=b.y+H/2;
    const bend=Math.max(38,Math.abs(x2-x1)*.48),conditional=Boolean(t.when);
    paths.push('<path d="M '+x1+' '+y1+' C '+(x1+bend)+' '+y1+', '+(x2-bend)+' '+y2+', '+x2+' '+y2+'" class="cf-graph-edge'+(conditional?" is-conditional":"")+'" marker-end="url(#cf-edge-arrow)"/>');
   }
  }
  edges.innerHTML='<defs><marker id="cf-edge-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#84a6ae"/></marker></defs>'+paths.join("");
 }
 function draw(){
  if(!draft)return;
  ensureLayout();
  const width=Math.max(1120,...draft.tasks.map(t=>draft.layout[t.id].x+W+48));
  const height=Math.max(520,...draft.tasks.map(t=>draft.layout[t.id].y+H+45));
  surface.style.width=width+"px";surface.style.height=height+"px";
  nodes.innerHTML=draft.tasks.map(t=>{
   const active=routeApplies(t,preview),pos=draft.layout[t.id];
   const tag=t.final?"FINAL HANDOFF":t.when?"IF PRIORITY = "+t.when.priority.toUpperCase():"PROCESS STEP";
   return '<button type="button" class="cf-graph-node'+(t.id===selected?" is-selected":"")+(active?"":" is-skipped")+(t.final?" is-final":"")+'" data-node="'+safe(t.id)+'" aria-pressed="'+String(t.id===selected)+'" style="left:'+pos.x+'px;top:'+pos.y+'px" aria-label="'+safe(t.label)+', '+tag+', '+t.dependsOn.length+' prerequisites. Drag to reposition or use Alt plus arrow keys.">'+
    '<small>'+safe(tag)+'</small><strong>'+safe(t.label)+'</strong><span>'+t.offset+' illustrative calendar-day offset · '+t.dependsOn.length+' prerequisite'+(t.dependsOn.length===1?"":"s")+'</span></button>';
  }).join("");
  drawEdges();
  check();
 }
 function inspectorView(){
  const t=chosen();
  if(!t){inspector.innerHTML='<p class="cf-help">Select a process step on the canvas.</p>';return;}
  const route=t.when?.priority||"";
  const options='<option value="">Always run</option>'+PRIORITIES.map(p=>'<option value="'+safe(p)+'"'+(route===p?" selected":"")+'>'+safe(p)+' only</option>').join("");
  const deps=draft.tasks.filter(x=>x.id!==t.id).map(x=>'<label class="cf-inspector-dependency"><input type="checkbox" data-dependency="'+safe(x.id)+'"'+(t.dependsOn.includes(x.id)?" checked":"")+'><span>'+safe(x.label)+'</span></label>').join("");
  inspector.innerHTML='<p class="cf-overline">SELECTED STEP / '+safe(t.id)+'</p><h3>'+safe(t.label)+'</h3>'+
    '<label class="cf-field">Step label<input id="designer-task-label" maxlength="100" value="'+safe(t.label)+'"></label>'+
    '<label class="cf-field">Simulated target offset (days)<input id="designer-task-offset" type="number" min="0" max="365" step="1" value="'+t.offset+'"></label>'+
    '<label class="cf-field">Conditional routing<select id="designer-task-route"'+(t.final?" disabled":"")+'>'+options+'</select></label>'+
    '<p class="cf-help">Conditions use priority at the moment of intake. The resulting branch is frozen for that case.</p>'+
    '<div class="cf-inspector-prereq"><strong>Incoming connections / prerequisites</strong><div class="cf-inspector-dep-list">'+(deps||'<p class="cf-help">No available steps.</p>')+'</div></div>'+
    '<button class="cf-btn cf-btn-secondary cf-inspector-final" type="button" id="designer-make-final"'+(t.final?" disabled":"")+'>'+(t.final?"Current final handoff":"Make final handoff")+'</button>'+
    '<p class="cf-help">All active routes must lead to the final handoff. Use the canvas to connect nodes, or tick prerequisites here.</p>';
  toolbar();
 }
 function activateNode(next){
  if(connecting){
   const before=selected;
   try{
    draft=connectSteps(draft,before,next);connecting=false;markDirty();draw();inspectorView();inform("Connection added. Check route validation before saving.");
   }catch(err){inform(err.message,true);}
   toolbar();return;
  }
  selected=next;draw();inspectorView();
 }
 function moveSelected(deltaX,deltaY){
  const t=chosen();if(!t)return;
  const p=draft.layout[t.id];p.x=Math.max(0,Math.min(3000,p.x+deltaX));p.y=Math.max(0,Math.min(2200,p.y+deltaY));
  markDirty();draw();
 }
 select.addEventListener("change",()=>{
  const next=select.value;
  if(dirty&&!window.confirm("Discard unsaved changes to this workflow?")){select.value=id;return;}
  loadProfile(next);
 });
 el("designer-name").addEventListener("input",e=>{draft.name=e.target.value;markDirty();});
 el("designer-description").addEventListener("input",e=>{draft.description=e.target.value;markDirty();});
 el("designer-preview-priority").addEventListener("change",e=>{preview=e.target.value;draw();});
 el("designer-add").addEventListener("click",()=>{
  try{const r=insertStep(draft,selected);draft=r.profile;selected=r.selected;markDirty();draw();inspectorView();inform("Step added. Connect or reposition it as needed.");}
  catch(err){inform(err.message,true);}
 });
 el("designer-remove").addEventListener("click",()=>{
  try{draft=removeStep(draft,selected);selected=draft.tasks[0].id;markDirty();draw();inspectorView();inform("Step removed; dependent steps reconnected.");}
  catch(err){inform(err.message,true);}
 });
 el("designer-auto").addEventListener("click",()=>{draft.layout=autoArrange(draft);markDirty();draw();inform("Steps arranged by dependency level.");});
 el("designer-connect").addEventListener("click",()=>{
  if(!chosen()){inform("Select a source step first.",true);return;}
  connecting=!connecting;toolbar();status(connecting?"Select the destination step on the canvas; Escape cancels.":"Connection mode cancelled.");
 });
 el("designer-discard").addEventListener("click",()=>{loadProfile();inform("Unsaved changes discarded.");});
 el("designer-save").addEventListener("click",()=>{
  try{
   validateProfile(draft);
   onSave(copy(draft));
   dirty=false;loadProfile(id);
   inform("Workflow graph saved. New intakes use the revision; existing cases retain their snapshots.");
  }catch(err){status("Cannot save: "+err.message,true);inform("Workflow not saved: "+err.message,true);}
 });
 inspector.addEventListener("input",e=>{
  const t=chosen();if(!t)return;
  if(e.target.id==="designer-task-label"){t.label=e.target.value;markDirty();draw();}
  if(e.target.id==="designer-task-offset"){
   const n=e.target.valueAsNumber;
   t.offset=Number.isFinite(n)?n:-1;markDirty();draw();
  }
 });
 inspector.addEventListener("change",e=>{
  const t=chosen();if(!t)return;
  if(e.target.id==="designer-task-route"){
   if(e.target.value)t.when={priority:e.target.value};else delete t.when;
   markDirty();draw();inspectorView();
  }
  if(e.target.matches("[data-dependency]")){
   const from=e.target.dataset.dependency;
   if(e.target.checked){
    try{draft=connectSteps(draft,from,t.id);}
    catch(err){inform(err.message,true);e.target.checked=false;return;}
   }else t.dependsOn=t.dependsOn.filter(id=>id!==from);
   markDirty();draw();inspectorView();
  }
 });
 inspector.addEventListener("click",e=>{
  if(e.target.id!=="designer-make-final")return;
  const t=chosen();if(!t||t.final)return;
  draft.tasks.forEach(step=>{step.final=step.id===t.id;});
  delete t.when;markDirty();draw();inspectorView();
  inform("Final handoff changed. Connect every branch to it before saving.");
 });
 nodes.addEventListener("pointerdown",e=>{
  const node=e.target.closest("[data-node]");if(!node||e.button!==0)return;
  // Explicit pointer capture prevents leaving the node from cancelling a drag.
  e.preventDefault();
  node.focus({preventScroll:true});
  if(node.setPointerCapture)node.setPointerCapture(e.pointerId);
  const taskId=node.dataset.node,origin={...draft.layout[node.dataset.node]},startX=e.clientX,startY=e.clientY,scrollLeft=el("designer-viewport").scrollLeft,scrollTop=el("designer-viewport").scrollTop;
  let moved=false;
  function pointerMove(event){
   if(event.pointerId!==e.pointerId)return;
   const dx=event.clientX-startX+el("designer-viewport").scrollLeft-scrollLeft;
   const dy=event.clientY-startY+el("designer-viewport").scrollTop-scrollTop;
   if(Math.hypot(dx,dy)>5)moved=true;
   if(!moved)return;
   draft.layout[taskId]={x:Math.max(0,Math.min(3000,Math.round(origin.x+dx))),y:Math.max(0,Math.min(2200,Math.round(origin.y+dy)))};
   node.style.left=draft.layout[taskId].x+"px";node.style.top=draft.layout[taskId].y+"px";
   drawEdges();
  }
  function pointerUp(event){
   if(event.pointerId!==e.pointerId)return;
   window.removeEventListener("pointermove",pointerMove);window.removeEventListener("pointerup",pointerUp);window.removeEventListener("pointercancel",pointerCancel);
   if(moved){suppressPointerClick=true;setTimeout(()=>{suppressPointerClick=false;},250);markDirty();draw();return;}
   activateNode(taskId);
  }
  function pointerCancel(){window.removeEventListener("pointermove",pointerMove);window.removeEventListener("pointerup",pointerUp);window.removeEventListener("pointercancel",pointerCancel);draw();}
  window.addEventListener("pointermove",pointerMove);
  window.addEventListener("pointerup",pointerUp);
  window.addEventListener("pointercancel",pointerCancel);
 });
 nodes.addEventListener("click",e=>{
  const node=e.target.closest("[data-node]");if(!node)return;
  if(suppressPointerClick){suppressPointerClick=false;e.preventDefault();return;}
  if(e.detail===0)activateNode(node.dataset.node);
 });
 nodes.addEventListener("keydown",e=>{
  const node=e.target.closest("[data-node]");if(!node)return;
  if(e.key==="Escape"&&connecting){connecting=false;toolbar();return;}
  if(!e.altKey||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;
  e.preventDefault();selected=node.dataset.node;
  const n=e.shiftKey?60:20;
  moveSelected(e.key==="ArrowLeft"?-n:e.key==="ArrowRight"?n:0,e.key==="ArrowUp"?-n:e.key==="ArrowDown"?n:0);
  nodes.querySelector('[data-node="'+selected+'"]')?.focus();
 });
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&connecting){connecting=false;toolbar();status("Connection cancelled.");}});
 sync();
 return {sync,reset,draw};
}
