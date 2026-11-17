import {SCHEMA_VERSION,NODE_TYPES,TYPE_LABELS,LIMITS,normalizeProject,analyzeProject,analyzeImpact,generateReport} from "./core.mjs";
import {DEMO} from "./examples.mjs";

const $=(id)=>document.getElementById(id);
const esc=(value)=>String(value??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const deepCopy=(p)=>normalizeProject(JSON.parse(JSON.stringify(p)));
const STORAGE_KEY="gkl-flowglass-project-v1";
const NODE_WIDTH=204, NODE_HEIGHT=88;
let project=deepCopy(DEMO), selectedId="case-list", camera={x:0,y:0,z:1}, activeDrag=null, toastTimer=null;
let searchText="",filterType="";
const mapViewport=$("graph-viewport"), world=$("graph-world");

function notify(message,kind="success"){
 const el=$("toast");el.textContent=message;el.dataset.kind=kind;el.classList.add("is-visible");
 window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>el.classList.remove("is-visible"),4500);
}
function save(){
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(project));}
 catch(e){notify("Local saving is unavailable. Export JSON to keep a copy.","error");}
}
function initialLoad(){
 try{
  const stored=localStorage.getItem(STORAGE_KEY);
  if(stored){const value=JSON.parse(stored);project=normalizeProject(value);selectedId=project.nodes.some(n=>n.id==="case-list")?"case-list":project.nodes[0]?.id||null;}
 }catch(e){project=deepCopy(DEMO);selectedId="case-list";notify("A saved workspace could not be read; loaded the sample instead.","error");}
}
function nodeById(id){return project.nodes.find(n=>n.id===id);}
function newId(prefix,items){
 let i=1;const used=new Set(items.map(n=>n.id));while(used.has(prefix+"-"+i))i++;return prefix+"-"+i;
}
function selectedAnalysis(){return selectedId&&nodeById(selectedId)?analyzeImpact(project,selectedId):null;}
function renderStats(){
 const data=analyzeProject(project),impact=selectedAnalysis();
 $("metric-nodes").textContent=String(data.nodes);
 $("metric-edges").textContent=String(data.edges);
 $("metric-impact").textContent=impact?String(impact.affectedCount):"—";
 $("metric-impact-desc").textContent=impact?(impact.affectedCount===1?"1 potentially affected component":impact.affectedCount+" potentially affected components"):"Select a component";
 $("metric-issues").textContent=String(data.issueCount);
 $("metric-issues-desc").textContent=data.issueCount?"Findings to review":"No structural findings";
}
function matches(node){
 return (!filterType||node.type===filterType)&&(!searchText||[node.label,node.system,node.owner,node.id].join(" ").toLowerCase().includes(searchText));
}
function renderList(){
 const list=$("node-list");list.replaceChildren();
 const matchesList=project.nodes.filter(matches);
 $("inventory-count").textContent=matchesList.length+" / "+project.nodes.length;
 for(const node of matchesList){
  const li=document.createElement("li"),btn=document.createElement("button");
  btn.type="button";btn.dataset.select=node.id;btn.setAttribute("aria-current",String(node.id===selectedId));
  btn.innerHTML='<i class="fg-item-dot type-'+esc(node.type)+'"></i><span><strong>'+esc(node.label)+'</strong><small>'+esc(node.system||TYPE_LABELS[node.type])+'</small></span>';
  btn.addEventListener("click",()=>selectNode(node.id,true));li.appendChild(btn);list.appendChild(li);
 }
 if(!matchesList.length){const li=document.createElement("li");li.textContent="No matching components.";li.style.cssText="font-size:12px;color:#96b2ae;padding:10px";list.appendChild(li);}
}
const svgNS="http://www.w3.org/2000/svg";
function svgEl(name,attrs={}){
 const element=document.createElementNS(svgNS,name);
 for(const [key,value] of Object.entries(attrs)) element.setAttribute(key,String(value));
 return element;
}
function wirePath(from,to){
 const x1=from.x+NODE_WIDTH,y1=from.y+NODE_HEIGHT/2,x2=to.x,y2=to.y+NODE_HEIGHT/2;
 if(from.id===to.id)return "M "+(x1-18)+" "+y1+" C "+(x1+125)+" "+(y1-140)+", "+(x2-110)+" "+(y2-140)+", "+(x2+25)+" "+(y2-15);
 if(x2<x1+18){
  const height=Math.max(105,Math.abs(y2-y1)/3+70),offset=Math.max(95,Math.abs(x2-x1)/4+60);
  return "M "+x1+" "+y1+" C "+(x1+offset)+" "+(y1-height)+", "+(x2-offset)+" "+(y2-height)+", "+x2+" "+y2;
 }
 const bend=Math.max(42,Math.min(155,(x2-x1)*.45));
 return "M "+x1+" "+y1+" C "+(x1+bend)+" "+y1+", "+(x2-bend)+" "+y2+", "+x2+" "+y2;
}
function drawWires(svg){
 const impact=selectedAnalysis(),down=new Set(impact?.downstream.map(n=>n.id)||[]),up=new Set(impact?.upstream.map(n=>n.id)||[]);
 svg.replaceChildren();
 const defs=svgEl("defs"),marker=svgEl("marker",{id:"fg-arrow",viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"5",markerHeight:"5",orient:"auto-start-reverse"});
 marker.appendChild(svgEl("path",{d:"M 0 1 L 9 5 L 0 9 z",fill:"#6f9498"}));defs.appendChild(marker);svg.appendChild(defs);
 for(const e of project.edges){
  const from=nodeById(e.from),to=nodeById(e.to);if(!from||!to)continue;
  const classes=["fg-wire"];
  if(impact){
   if((e.from===selectedId||down.has(e.from))&&down.has(e.to))classes.push("is-downstream");
   else if((e.to===selectedId||up.has(e.to))&&up.has(e.from))classes.push("is-upstream");
   else classes.push("is-muted");
  }
  const path=svgEl("path",{d:wirePath(from,to),class:classes.join(" "),"marker-end":"url(#fg-arrow)"});
  const title=svgEl("title");title.textContent=from.label+" → "+to.label+(e.label?" · "+e.label:"");path.appendChild(title);svg.appendChild(path);
 }
}
function attachNodePointer(button,node,svg){
 let drag=null;
 button.addEventListener("pointerdown",(e)=>{
  if(e.button!==0) return;
  e.stopPropagation();drag={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:node.x,y:node.y,moved:false};
  try{button.setPointerCapture(e.pointerId);}catch(_){}
 });
 button.addEventListener("pointermove",(e)=>{
  if(!drag||drag.pointerId!==e.pointerId)return;
  const dx=(e.clientX-drag.startX)/camera.z,dy=(e.clientY-drag.startY)/camera.z;
  if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;
  if(!drag.moved)return;
  node.x=Math.round(Math.max(-10000,Math.min(10000,drag.x+dx)));
  node.y=Math.round(Math.max(-10000,Math.min(10000,drag.y+dy)));
  button.style.left=node.x+"px";button.style.top=node.y+"px";
  drawWires(svg);
 });
 const finish=(e)=>{if(!drag||drag.pointerId!==e.pointerId)return;const moved=drag.moved;drag=null;if(moved)save();};
 button.addEventListener("pointerup",finish);button.addEventListener("pointercancel",finish);
 button.addEventListener("click",()=>selectNode(node.id,false));
 button.addEventListener("keydown",(e)=>{
  const offsets={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(!offsets[e.key])return;
  e.preventDefault();
  const delta=e.shiftKey?35:10;const [dx,dy]=offsets[e.key];
  node.x=Math.max(-10000,Math.min(10000,node.x+dx*delta));
  node.y=Math.max(-10000,Math.min(10000,node.y+dy*delta));
  button.style.left=node.x+"px";button.style.top=node.y+"px";drawWires(svg);save();
 });
}
function renderGraph(){
 const impact=selectedAnalysis(),down=new Set(impact?.downstream.map(n=>n.id)||[]),up=new Set(impact?.upstream.map(n=>n.id)||[]);
 const svg=svgEl("svg",{class:"fg-wires",viewBox:"0 0 1800 980","aria-hidden":"true"});
 drawWires(svg);world.replaceChildren(svg);
 for(const node of project.nodes){
  const button=document.createElement("button");button.type="button";button.dataset.nodeId=node.id;
  const classes=["fg-node","type-"+node.type];
  if(node.id===selectedId)classes.push("is-selected");
  else if(impact&&down.has(node.id))classes.push("is-downstream");
  else if(impact&&up.has(node.id))classes.push("is-upstream");
  else if(impact)classes.push("is-muted");
  if(!node.documentation)classes.push("is-undocumented");
  button.className=classes.join(" ");button.style.left=node.x+"px";button.style.top=node.y+"px";
  button.setAttribute("aria-label",node.label+", "+TYPE_LABELS[node.type]+(node.documentation?"":", missing documentation"));
  button.setAttribute("aria-pressed",String(node.id===selectedId));
  button.innerHTML='<span class="fg-node-kind">'+esc(TYPE_LABELS[node.type]).toUpperCase()+'</span><strong class="fg-node-name">'+esc(node.label)+'</strong><span class="fg-node-system">'+esc(node.system||"No platform assigned")+'</span>';
  attachNodePointer(button,node,svg);world.appendChild(button);
 }
 $("graph-empty").hidden=project.nodes.length>0;
 applyCamera();
}
function applyCamera(){
 world.style.transform="translate("+camera.x+"px,"+camera.y+"px) scale("+camera.z+")";
 $("zoom-label").textContent=Math.round(camera.z*100)+"%";
}
function fitGraph(){
 const area=mapViewport.getBoundingClientRect();
 if(area.width<10||area.height<10)return;
 if(!project.nodes.length){camera={x:Math.round(area.width/2-400),y:Math.round(area.height/2-250),z:1};applyCamera();return;}
 const xs=project.nodes.map(n=>n.x),ys=project.nodes.map(n=>n.y);
 const minX=Math.min(...xs),maxX=Math.max(...xs)+NODE_WIDTH,minY=Math.min(...ys),maxY=Math.max(...ys)+NODE_HEIGHT;
 const width=Math.max(260,maxX-minX),height=Math.max(170,maxY-minY),padding=70;
 const z=Math.max(.28,Math.min(1.2,Math.min((area.width-padding)/width,(area.height-padding)/height)));
 camera={x:area.width/2-(minX+width/2)*z,y:area.height/2-(minY+height/2)*z,z};applyCamera();
}
function zoomAt(next,px,py){
 const z=Math.max(.25,Math.min(1.8,next)),mapX=(px-camera.x)/camera.z,mapY=(py-camera.y)/camera.z;
 camera={x:px-mapX*z,y:py-mapY*z,z};applyCamera();
}
function focusNode(node){
 const rect=mapViewport.getBoundingClientRect();
 camera.x=rect.width/2-(node.x+NODE_WIDTH/2)*camera.z;
 camera.y=rect.height/2-(node.y+NODE_HEIGHT/2)*camera.z;
 applyCamera();
}
function selectNode(id,focus){
 if(!nodeById(id))return;
 selectedId=id;renderAll();
 if(focus)focusNode(nodeById(id));
}
function renderInspector(){
 const node=nodeById(selectedId);
 $("inspector-placeholder").hidden=!!node;$("inspector-active").hidden=!node;
 $("inspector-state").textContent=node?"ACTIVE":"STANDBY";
 $("export-report").disabled=!node;
 if(!node)return;
 $("selected-node-id").textContent=node.id;
 $("selected-type-badge").textContent=TYPE_LABELS[node.type];
 for(const [field,value] of [["node-label",node.label],["node-type",node.type],["node-owner",node.owner],["node-system",node.system],["node-description",node.description],["node-documentation",node.documentation]])$(field).value=value;
 const data=analyzeImpact(project,node.id);
 $("impact-count").textContent=data.affectedCount+" affected";
 $("impact-summary").textContent=data.affectedCount===0?"No downstream components are currently mapped.":data.affectedCount+" downstream component(s) may be affected across "+data.maxDepth+" dependency level(s).";
 $("downstream-count").textContent=data.downstream.length;
 $("upstream-count").textContent=data.upstream.length;
 const populate=(id,list)=>{
  $(id).replaceChildren();
  if(!list.length){const li=document.createElement("li");li.textContent="None mapped";$(id).appendChild(li);return;}
  for(const item of list){
   const target=nodeById(item.id),li=document.createElement("li"),btn=document.createElement("button");
   btn.type="button";btn.textContent=target.label;btn.addEventListener("click",()=>selectNode(target.id,true));
   const hint=document.createElement("small");hint.textContent=item.depth+" hop"+(item.depth===1?"":"s");
   li.append(btn,hint);$(id).appendChild(li);
  }
 };
 populate("downstream-list",data.downstream);populate("upstream-list",data.upstream);
 const connections=$("connection-list");connections.replaceChildren();
 const linked=project.edges.filter(e=>e.from===node.id||e.to===node.id);
 for(const edge of linked){
  const li=document.createElement("li"),span=document.createElement("span"),del=document.createElement("button");
  const other=nodeById(edge.from===node.id?edge.to:edge.from);
  span.textContent=(edge.from===node.id?"→ ":"← ")+other.label+(edge.label?" · "+edge.label:"");
  del.type="button";del.textContent="Remove";del.setAttribute("aria-label","Remove connection with "+other.label);
  del.addEventListener("click",()=>{project.edges=project.edges.filter(e=>e.id!==edge.id);save();renderAll();notify("Connection removed.");});
  li.append(span,del);connections.appendChild(li);
 }
 if(!linked.length){const li=document.createElement("li");li.textContent="No connections yet.";connections.appendChild(li);}
 const target=$("connection-target");target.replaceChildren();
 const candidates=project.nodes.filter(n=>n.id!==node.id&&!project.edges.some(e=>e.from===node.id&&e.to===n.id));
 for(const n of candidates){const option=document.createElement("option");option.value=n.id;option.textContent=n.label;target.appendChild(option);}
 const btn=$("connection-form").querySelector('button[type="submit"]');btn.disabled=candidates.length===0;
 if(!candidates.length){const option=document.createElement("option");option.textContent="No available targets";option.value="";target.appendChild(option);}
}
function renderReviews(){
 const info=analyzeProject(project);
 const groups=[
  {title:"UNDOCUMENTED",count:info.undocumented.length,desc:"Components without a documentation reference.",items:info.undocumented.map(id=>nodeById(id)?.label||id)},
  {title:"ISOLATED",count:info.isolated.length,desc:"Components with no mapped incoming or outgoing links.",items:info.isolated.map(id=>nodeById(id)?.label||id)},
  {title:"REVIEW LOOPS",count:info.cycles.length,desc:"Directed cycles may represent intentional retries or approvals. Review rather than assume a failure.",items:info.cycles.map(ids=>ids.map(id=>nodeById(id)?.label||id).join(" ↔ "))}
 ];
 $("review-items").innerHTML=groups.map(g=>
  '<article class="fg-review-card '+(g.count===0?"fg-ok":"")+'"><span>'+g.title+'</span><strong>'+g.count+'</strong><p>'+esc(g.desc)+'</p><ul>'+ (g.items.length?g.items.map(x=>'<li>'+esc(x)+'</li>').join(""):'<li>Nothing flagged</li>')+'</ul></article>'
 ).join("");
}
function renderAll(){
 $("project-name").value=project.name;$("project-description").value=project.description;
 renderStats();renderList();renderGraph();renderInspector();renderReviews();
}
function addNode(){
 if(project.nodes.length>=LIMITS.nodes){notify("The 250-component limit has been reached.","error");return;}
 const id=newId("node",project.nodes),rect=mapViewport.getBoundingClientRect();
 const cx=(rect.width/2-camera.x)/camera.z,cy=(rect.height/2-camera.y)/camera.z;
 const node={id,label:"New component",type:"other",owner:"",system:"",description:"",documentation:"",x:Math.round(cx-NODE_WIDTH/2),y:Math.round(cy-NODE_HEIGHT/2)};
 project.nodes.push(node);selectedId=id;save();renderAll();focusNode(node);$("node-label").focus();$("node-label").select();notify("Component created. Add details in the Inspector.");
}
function download(filename,data,mime){
 const blob=new Blob([data],{type:mime+";charset=utf-8"}),url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function filename(ext){return (project.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,55)||"flowglass-project")+"."+ext;}
function newProject(){
 if(!window.confirm("Replace the current workspace with a blank graph? Export JSON first if you want to keep a copy."))return;
 project=normalizeProject({schemaVersion:SCHEMA_VERSION,name:"Untitled workflow",description:"",nodes:[],edges:[]});selectedId=null;save();renderAll();fitGraph();notify("Blank workspace ready.");
}
function resetDemo(){
 if(!window.confirm("Replace the current workspace with the synthetic example? Export JSON first to preserve your edits."))return;
 project=deepCopy(DEMO);selectedId="case-list";save();renderAll();fitGraph();notify("Synthetic workflow restored.");
}
async function importJSON(file){
 if(!file)return;
 if(file.size>LIMITS.bytes){notify("This file exceeds the 2 MB import limit.","error");return;}
 try{
  const imported=normalizeProject(JSON.parse(await file.text()));
  if(!window.confirm("Load "+imported.name+"? This replaces the current workspace."))return;
  project=imported;selectedId=project.nodes[0]?.id||null;save();renderAll();fitGraph();
  notify("Imported "+project.nodes.length+" components and "+project.edges.length+" connections.");
 }catch(e){notify("Import rejected: "+e.message,"error");}
}
function bindEvents(){
 $("node-search").addEventListener("input",(e)=>{searchText=e.target.value.toLowerCase().trim();renderList();});
 $("node-filter").addEventListener("change",(e)=>{filterType=e.target.value;renderList();});
 $("add-node").addEventListener("click",addNode);$("empty-add").addEventListener("click",addNode);
 $("new-project").addEventListener("click",newProject);$("load-demo").addEventListener("click",resetDemo);
 $("import-json").addEventListener("click",()=>$("file-input").click());
 $("file-input").addEventListener("change",async e=>{const f=e.target.files?.[0];await importJSON(f);e.target.value="";});
 $("export-json").addEventListener("click",()=>{download(filename("json"),JSON.stringify(project,null,2)+"\n","application/json");notify("Project JSON exported.");});
 $("export-report").addEventListener("click",()=>{if(!selectedId)return;download(filename("impact.md"),generateReport(project,selectedId),"text/markdown");notify("Impact report exported.");});
 $("project-name").addEventListener("change",e=>{project.name=e.target.value.trim().slice(0,120)||"Untitled workflow";save();e.target.value=project.name;});
 $("project-description").addEventListener("change",e=>{project.description=e.target.value.trim().slice(0,1000);save();});
 $("node-form").addEventListener("submit",(e)=>{
  e.preventDefault();const node=nodeById(selectedId);if(!node)return;
  node.label=$("node-label").value.trim().slice(0,120)||"Untitled component";
  node.type=NODE_TYPES.includes($("node-type").value)?$("node-type").value:"other";
  node.owner=$("node-owner").value.trim().slice(0,120);
  node.system=$("node-system").value.trim().slice(0,120);
  node.description=$("node-description").value.trim().slice(0,1200);
  node.documentation=$("node-documentation").value.trim().slice(0,500);
  save();renderAll();notify("Component details saved.");
 });
 $("delete-node").addEventListener("click",()=>{
  const node=nodeById(selectedId);if(!node)return;
  if(!window.confirm("Delete "+node.label+" and all its connections?"))return;
  project.nodes=project.nodes.filter(n=>n.id!==node.id);
  project.edges=project.edges.filter(e=>e.from!==node.id&&e.to!==node.id);
  selectedId=project.nodes[0]?.id||null;save();renderAll();notify("Component deleted.");
 });
 $("connection-form").addEventListener("submit",(e)=>{
  e.preventDefault();const from=nodeById(selectedId),to=nodeById($("connection-target").value);
  if(!from||!to){notify("Choose a valid downstream target.","error");return;}
  if(project.edges.length>=LIMITS.edges){notify("The 1500-connection limit has been reached.","error");return;}
  if(project.edges.some(edge=>edge.from===from.id&&edge.to===to.id)){notify("That directional connection already exists.","error");return;}
  project.edges.push({id:newId("edge",project.edges),from:from.id,to:to.id,label:$("connection-label").value.trim().slice(0,140)});
  $("connection-label").value="";save();renderAll();notify("Connection added.");
 });
 $("zoom-in").addEventListener("click",()=>zoomAt(camera.z*1.2,mapViewport.clientWidth/2,mapViewport.clientHeight/2));
 $("zoom-out").addEventListener("click",()=>zoomAt(camera.z/1.2,mapViewport.clientWidth/2,mapViewport.clientHeight/2));
 $("fit-map").addEventListener("click",fitGraph);
 mapViewport.addEventListener("wheel",(e)=>{
  e.preventDefault();const rect=mapViewport.getBoundingClientRect();
  zoomAt(camera.z*(e.deltaY<0?1.09:1/1.09),e.clientX-rect.left,e.clientY-rect.top);
 },{passive:false});
 mapViewport.addEventListener("pointerdown",(e)=>{
  if(e.button!==0||e.target.closest(".fg-node")||e.target.closest(".fg-graph-empty"))return;
  activeDrag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:camera.x,startY:camera.y};
  mapViewport.classList.add("is-panning");try{mapViewport.setPointerCapture(e.pointerId);}catch(_){}
 });
 mapViewport.addEventListener("pointermove",(e)=>{
  if(!activeDrag||activeDrag.id!==e.pointerId)return;
  camera.x=activeDrag.startX+e.clientX-activeDrag.x;camera.y=activeDrag.startY+e.clientY-activeDrag.y;applyCamera();
 });
 const panEnd=(e)=>{if(activeDrag&&activeDrag.id===e.pointerId){activeDrag=null;mapViewport.classList.remove("is-panning");}};
 mapViewport.addEventListener("pointerup",panEnd);mapViewport.addEventListener("pointercancel",panEnd);
 const dialog=$("help-dialog");
 const showHelp=()=>{if(typeof dialog.showModal==="function")dialog.showModal();else notify("Use the inventory, Inspector and map controls to explore your graph.");};
 $("help-button").addEventListener("click",showHelp);$("review-help").addEventListener("click",showHelp);
 $("close-help").addEventListener("click",()=>dialog.close());$("help-done").addEventListener("click",()=>dialog.close());
}
initialLoad();bindEvents();renderAll();requestAnimationFrame(fitGraph);
