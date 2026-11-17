import test from "node:test";
import assert from "node:assert/strict";
import {normalizeProject,validateProject,traverse,analyzeImpact,findCycles,analyzeProject,generateReport} from "../core.mjs";
const example=()=>normalizeProject({
 schemaVersion:1,name:"Example",nodes:[
 {id:"a",label:"A",type:"trigger",documentation:"doc",x:1,y:2},
 {id:"b",label:"B",type:"automation",documentation:"",x:2,y:2},
 {id:"c",label:"C",type:"data"},
 {id:"d",label:"D",type:"report"},
 {id:"e",label:"E",type:"other"}
 ],edges:[
 {id:"ab",from:"a",to:"b"},{id:"bc",from:"b",to:"c"},{id:"cd",from:"c",to:"d"},
 {id:"db",from:"d",to:"b"}
 ]});
test("normalization preserves schema and supplies safe defaults",()=>{
 const p=example();
 assert.equal(p.schemaVersion,1);assert.equal(p.nodes[2].owner,"");assert.equal(p.nodes[2].x,0);
 assert.equal(p.nodes[1].type,"automation");
});
test("multi-hop impact is finite in a cycle and contains paths",()=>{
 const p=example(),impact=analyzeImpact(p,"a");
 assert.deepEqual(impact.downstream.map(n=>n.id),["b","c","d"]);
 assert.equal(impact.maxDepth,3);assert.equal(impact.affectedCount,3);
 assert.deepEqual(impact.downstream[2].path,["a","b","c","d"]);
 assert.deepEqual(traverse(p,"d","upstream").map(n=>n.id),["c","b","a"]);
});
test("Tarjan cycles and disconnected nodes are distinguished",()=>{
 const p=example(),a=analyzeProject(p);
 assert.deepEqual(findCycles(p),[["b","c","d"]]);
 assert.deepEqual(a.isolated,["e"]);
 assert.ok(a.undocumented.includes("b"));
 assert.equal(a.edges,4);
});
test("self-loop is a cycle",()=>{
 const p=example();p.edges.push({id:"ee",from:"e",to:"e",label:"retry"});
 assert.deepEqual(findCycles(p),[["b","c","d"],["e"]]);
});
test("invalid references, duplicate IDs, unsupported schema and duplicate pairs rejected",()=>{
 const p=example();p.edges.push({id:"bad",from:"missing",to:"b"});
 assert.match(validateProject(p).join(" "),"missing node");
 assert.throws(()=>normalizeProject(p));
 const q=example();q.nodes.push({...q.nodes[0]});
 assert.match(validateProject(q).join(" "),"Duplicate node");
 const z=example();z.schemaVersion=2;
 assert.match(validateProject(z).join(" "),"schemaVersion");
 const w=example();w.edges.push({id:"other",from:"a",to:"b"});
 assert.match(validateProject(w).join(" "),"Duplicate directional");
});
test("isolated nodes and empty graphs do not falsely produce cycles",()=>{
 const p=normalizeProject({schemaVersion:1,name:"Empty",nodes:[],edges:[]});
 assert.deepEqual(findCycles(p),[]);assert.equal(analyzeProject(p).nodes,0);
});
test("report includes reproducible paths and qualified caveats",()=>{
 const report=generateReport(example(),"a");
 assert.match(report,/3 downstream component/);
 assert.match(report,/A → B → C/);
 assert.match(report,/not a live tenant scan/);
});
