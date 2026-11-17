/* Flowglass graph engine. Pure ES module; browser and Node compatible. */
export const SCHEMA_VERSION = 1;
export const NODE_TYPES = Object.freeze(["trigger","automation","data","approval","notification","report","external","other"]);
export const TYPE_LABELS = Object.freeze({trigger:"Trigger",automation:"Automation",data:"Data store",approval:"Approval",notification:"Notification",report:"Report",external:"External",other:"Other"});
export const LIMITS = Object.freeze({nodes:250,edges:1500,bytes:2000000});
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const textValue = (value,max=500) => String(value == null ? "" : value).trim().slice(0,max);
const finite = (v,d=0) => Number.isFinite(Number(v)) ? Math.max(-10000,Math.min(10000,Number(v))) : d;
export function validateProject(value) {
  const errors=[];
  if (!value || typeof value!=="object" || Array.isArray(value)) return ["Project must be a JSON object."];
  if (value.schemaVersion!==SCHEMA_VERSION) errors.push("Unsupported schemaVersion (expected 1).");
  if (!Array.isArray(value.nodes)) errors.push("nodes must be an array.");
  if (!Array.isArray(value.edges)) errors.push("edges must be an array.");
  if (errors.length) return errors;
  if (value.nodes.length>LIMITS.nodes) errors.push("Maximum 250 nodes.");
  if (value.edges.length>LIMITS.edges) errors.push("Maximum 1500 connections.");
  const nodeIds=new Set(),edgeIds=new Set(),pairIds=new Set();
  for (const [i,n] of value.nodes.entries()) {
    if (!n || typeof n!=="object" || Array.isArray(n)) {errors.push("Node "+(i+1)+" is not an object.");continue;}
    if (typeof n.id!=="string" || !ID.test(n.id)) errors.push("Node "+(i+1)+" has an invalid id.");
    else if (nodeIds.has(n.id)) errors.push("Duplicate node id: "+n.id);
    else nodeIds.add(n.id);
    if (!textValue(n.label,120)) errors.push("Node "+(i+1)+" needs a label.");
    if (n.type!==undefined && !NODE_TYPES.includes(n.type)) errors.push("Node "+(i+1)+" has an unknown type.");
    if (n.x!==undefined && !Number.isFinite(Number(n.x))) errors.push("Node "+(i+1)+" has invalid x.");
    if (n.y!==undefined && !Number.isFinite(Number(n.y))) errors.push("Node "+(i+1)+" has invalid y.");
  }
  for (const [i,e] of value.edges.entries()) {
    if (!e || typeof e!=="object" || Array.isArray(e)) {errors.push("Connection "+(i+1)+" is not an object.");continue;}
    if (typeof e.id!=="string" || !ID.test(e.id)) errors.push("Connection "+(i+1)+" has an invalid id.");
    else if (edgeIds.has(e.id)) errors.push("Duplicate connection id: "+e.id);
    else edgeIds.add(e.id);
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) errors.push("Connection "+(i+1)+" references a missing node.");
    const pair=String(e.from)+"->"+String(e.to);
    if (pairIds.has(pair)) errors.push("Duplicate directional connection: "+pair);
    pairIds.add(pair);
  }
  return errors.slice(0,30);
}
export function normalizeProject(input) {
  const errors=validateProject(input);
  if (errors.length) throw new Error(errors.join(" "));
  return {
    schemaVersion:SCHEMA_VERSION,
    name:textValue(input.name||"Untitled workflow",120),
    description:textValue(input.description,1000),
    nodes:input.nodes.map(n=>({
      id:n.id,label:textValue(n.label,120),type:n.type||"other",
      owner:textValue(n.owner,120),system:textValue(n.system,120),
      description:textValue(n.description,1200),documentation:textValue(n.documentation,500),
      x:finite(n.x),y:finite(n.y)
    })),
    edges:input.edges.map(e=>({id:e.id,from:e.from,to:e.to,label:textValue(e.label,140)}))
  };
}
export function neighbors(project,id,direction="downstream") {
  if (direction!=="downstream" && direction!=="upstream") throw new Error("Invalid direction.");
  const output=[];
  for(const edge of project.edges){
    if (direction==="downstream" && edge.from===id) output.push(edge.to);
    if (direction==="upstream" && edge.to===id) output.push(edge.from);
  }
  return [...new Set(output)];
}
export function traverse(project,start,direction="downstream") {
  if (!project.nodes.some(n=>n.id===start)) throw new Error("Unknown component: "+start);
  const seen=new Set([start]),queue=[{id:start,depth:0,path:[start]}],out=[];
  for(let head=0;head<queue.length;head++){
    const cur=queue[head];
    for(const id of neighbors(project,cur.id,direction)){
      if(seen.has(id)) continue;
      seen.add(id);
      const item={id,depth:cur.depth+1,path:cur.path.concat(id)};
      out.push(item);queue.push(item);
    }
  }
  return out;
}
// Tarjan SCC; returns only actual cycles (including self loops), ordered by node inventory.
export function findCycles(project) {
  const byId=new Map(project.nodes.map((n,i)=>[n.id,i]));
  const indices=new Map(),low=new Map(),stack=[],onStack=new Set(),components=[];
  let time=0;
  function visit(id) {
    indices.set(id,time);low.set(id,time);time++;stack.push(id);onStack.add(id);
    for(const next of neighbors(project,id)){
      if(!indices.has(next)){visit(next);low.set(id,Math.min(low.get(id),low.get(next)));}
      else if(onStack.has(next)){low.set(id,Math.min(low.get(id),indices.get(next)));}
    }
    if(low.get(id)===indices.get(id)){
      const group=[];let node;
      do{node=stack.pop();onStack.delete(node);group.push(node);}while(node!==id);
      group.sort((a,b)=>byId.get(a)-byId.get(b));
      if(group.length>1||project.edges.some(e=>e.from===id&&e.to===id)) components.push(group);
    }
  }
  for(const n of project.nodes) if(!indices.has(n.id)) visit(n.id);
  return components.sort((a,b)=>byId.get(a[0])-byId.get(b[0]));
}
export function analyzeProject(project) {
  const connected=new Set();
  for(const e of project.edges){connected.add(e.from);connected.add(e.to);}
  const undocumented=project.nodes.filter(n=>!n.documentation).map(n=>n.id);
  const isolated=project.nodes.filter(n=>!connected.has(n.id)).map(n=>n.id);
  const cycles=findCycles(project);
  return {nodes:project.nodes.length,edges:project.edges.length,undocumented,isolated,cycles,issueCount:undocumented.length+isolated.length+cycles.length};
}
export function analyzeImpact(project,id) {
  const selected=project.nodes.find(n=>n.id===id);
  if (!selected) throw new Error("Select a component to analyze.");
  const downstream=traverse(project,id,"downstream");
  const upstream=traverse(project,id,"upstream");
  return {selected,downstream,upstream,directDownstream:neighbors(project,id),directUpstream:neighbors(project,id,"upstream"),
    affectedCount:downstream.length,maxDepth:Math.max(0,...downstream.map(x=>x.depth))};
}
function cleanMarkdown(s){return String(s||"").replace(/\r?\n/g," ").replace(/[\u0000-\u001f]/g," ");}
export function generateReport(project,id){
  const a=analyzeProject(project),impact=analyzeImpact(project,id);
  const lookup=new Map(project.nodes.map(n=>[n.id,n]));
  const line=(entry)=>"- "+cleanMarkdown(lookup.get(entry.id).label)+" ["+entry.id+"] · "+entry.depth+" hop"+(entry.depth===1?"":"s")+
    " · "+entry.path.map(p=>cleanMarkdown(lookup.get(p).label)).join(" → ");
  return [
    "# Flowglass — Change Impact Report",
    "**Project:** "+cleanMarkdown(project.name),
    "**Selected component:** "+cleanMarkdown(impact.selected.label)+" ("+impact.selected.id+")",
    "**Owner:** "+(cleanMarkdown(impact.selected.owner)||"Unassigned"),
    "**Generated:** "+new Date().toISOString(),
    "",
    "## Blast radius",
    "**"+impact.affectedCount+" downstream component(s)** potentially affected across "+impact.maxDepth+" dependency level(s).",
    "",...(impact.downstream.length?impact.downstream.map(line):["No downstream components."]),
    "","## Upstream dependencies",...(impact.upstream.length?impact.upstream.map(line):["No upstream dependencies."]),
    "","## Graph review findings",
    "- Undocumented components: "+a.undocumented.length+(a.undocumented.length?" ("+a.undocumented.join(", ")+")":""),
    "- Isolated components: "+a.isolated.length+(a.isolated.length?" ("+a.isolated.join(", ")+")":""),
    "- Cyclic groups (may be intentional review loops): "+a.cycles.length,
    ...a.cycles.map(c=>"- Cycle: "+c.join(" ↔ ")),
    "","## Review checklist",
    "- [ ] Verify data contracts and permissions for affected components.",
    "- [ ] Confirm downstream owners and notification rules.",
    "- [ ] Check reporting, audit, and SLA dependencies.",
    "- [ ] Test normal, error, and retry paths before deployment.",
    "","_This is structural analysis of the supplied graph, not a live tenant scan or proof of production impact._",""
  ].join("\n");
}
