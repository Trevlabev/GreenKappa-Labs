import {PROFILE_OPTIONS,safeProfile,evaluateDocument,summarizeBatch,buildExport,humanBytes} from "./core.mjs";
import {makeSyntheticPDF} from "./sample.mjs";

/* Local-first document processing: only the parser's static JavaScript is network-loaded. */
const PDFJS_VERSION="6.5.438";
const PDFJS_SOURCES=[
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@"+PDFJS_VERSION+"/build/",
  "https://unpkg.com/pdfjs-dist@"+PDFJS_VERSION+"/build/"
];
const MAX_FILES=12;
const MAX_FILE_BYTES=100*1000*1000;
const MAX_TEXT_PAGES=150;
const $=id=>document.getElementById(id);
const els={
  input:$("pdf-files"),drop:$("drop-zone"),selection:$("selected-list"),
  demo:$("demo-button"),profile:$("profile"),profileInfo:$("profile-info"),
  maxSize:$("max-size"),textRule:$("text-rule"),run:$("run-button"),
  progress:$("progress"),results:$("reports"),empty:$("report-empty"),
  json:$("export-json"),print:$("print-report"),
  statFiles:$("stat-files"),statFlagged:$("stat-flagged"),
  statBlocked:$("stat-blocked"),statPages:$("stat-pages"),
  about:$("about-button"),dialog:$("about-dialog"),close:$("close-dialog")
};
let files=[];
let rawReports=[];
let evaluated=[];
let isBusy=false;
let pdfjsPromise=null;
const now=()=>new Date().toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"});
function say(message,isError=false){
  els.progress.textContent=message;
  els.progress.style.color=isError?"#f3b0a8":"#a2d8cd";
}
function profile(){
  const options={id:els.profile.value};
  if(els.maxSize.value.trim()) options.maxMB=els.maxSize.value.trim();
  if(els.textRule.value==="required")options.requireSearchable=true;
  if(els.textRule.value==="review")options.requireSearchable=false;
  return safeProfile(options);
}
function profileChanged(){
  const p=PROFILE_OPTIONS[els.profile.value];
  els.profileInfo.replaceChildren();
  const title=document.createElement("b");
  title.textContent=p.name;
  const desc=document.createElement("p");
  desc.textContent=p.id==="oregon"?
    "Selected published technical criteria: searchable PDFs, flattened forms, embedded attachments and scripts. File size remains unconfigured. This is a subset—not a complete or continuously updated court rulebook.":
    "Court-neutral diagnostics only. The destination court's file size and local submission requirements are not assumed.";
  const a=document.createElement("a");
  a.href=p.sourceUrl;a.target="_blank";a.rel="noopener noreferrer";
  a.textContent="View cited guidance (reviewed "+p.reviewed+") ↗";
  els.profileInfo.append(title,desc,a);
  refresh();
}
function chooseFiles(selected){
  if(isBusy){say("Inspection running; finish before selecting more files.",true);return;}
  const supplied=Array.from(selected||[]).slice(0,MAX_FILES);
  const extras=(selected?.length||0)-supplied.length;
  files=supplied;
  els.selection.replaceChildren();
  supplied.forEach(f=>{
    const row=document.createElement("div"),name=document.createElement("span"),meta=document.createElement("small");
    name.textContent=f.name;meta.textContent=humanBytes(f.size);
    row.append(name,meta);els.selection.append(row);
  });
  els.run.disabled=files.length===0;
  say(files.length?"Selected "+files.length+" file(s). "+(extras>0?extras+" additional file(s) were not queued.":"Ready for local inspection."):"");
}
async function getPDFJS(){
  if(pdfjsPromise)return pdfjsPromise;
  pdfjsPromise=(async()=>{
    let error;
    for(const base of PDFJS_SOURCES){
      try{
        const lib=await import(base+"pdf.min.mjs");
        lib.GlobalWorkerOptions.workerSrc=base+"pdf.worker.min.mjs";
        return lib;
      }catch(e){error=e;}
    }
    throw new Error("Unable to load the PDF analysis library. Check connectivity or content-blocking settings. "+String(error?.message||""));
  })();
  try{return await pdfjsPromise;}catch(e){pdfjsPromise=null;throw e;}
}
function decodeHeader(bytes){
  const prefix=new TextDecoder("latin1").decode(bytes.slice(0,Math.min(bytes.length,1024)));
  const match=prefix.match(/%PDF-(\d+\.\d+)/);
  return {headerOk:!!match,pdfVersion:match?match[1]:null};
}
function countActions(value){
  if(!value||typeof value!=="object")return 0;
  let count=0;
  for(const actions of Object.values(value)){
    if(Array.isArray(actions))count+=actions.length;
    else if(typeof actions==="string"||actions&&typeof actions==="object")count++;
  }
  return count;
}
function errorMessage(err){
 const name=String(err?.name||"");
 if(name==="PasswordException")return "Password protection prevents inspection. Remove protection only when authorized.";
 if(name==="InvalidPDFException"||name==="FormatError")return "Invalid or unsupported PDF structure: the parser could not open the document.";
 if(name==="MissingPDFException")return "The selected PDF is missing or could not be read.";
 return "Parsing failed: "+String(err?.message||err||"Unknown error").slice(0,220);
}
async function inspectFile(file,lib){
  const raw={
   filename:file.name,sizeBytes:file.size,headerOk:false,pdfVersion:null,parsed:false,
   pages:0,inspectedPages:0,pagesWithoutText:0,formFields:null,embeddedFiles:null,
   scripts:null,privacyCandidates:null,privacyPages:[],hash:null
  };
  if(file.size>MAX_FILE_BYTES){
    raw.error="This alpha limits analysis to files at most 100 MB (decimal), to reduce browser memory pressure.";
    return raw;
  }
  if(!file.size){raw.error="The file is empty.";return raw;}
  let doc=null,task=null;
  try{
    const bytes=new Uint8Array(await file.arrayBuffer());
    Object.assign(raw,decodeHeader(bytes));
    if(!raw.headerOk){raw.error="No PDF signature detected. Select a valid PDF document.";return raw;}
    if(globalThis.crypto?.subtle){
      try{
        const digest=await crypto.subtle.digest("SHA-256",bytes);
        raw.hash=Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,"0")).join("");
      }catch{raw.hash=null;}
    }
    task=lib.getDocument({data:bytes.slice(),isEvalSupported:false,stopAtErrors:false});
    doc=await task.promise;
    raw.parsed=true;raw.pages=doc.numPages;
    if(typeof doc.getFieldObjects==="function"){
      try{
        const obj=await doc.getFieldObjects();
        raw.formFields=obj&&typeof obj==="object"?Object.values(obj).reduce((n,v)=>n+(Array.isArray(v)?v.length:1),0):0;
      }catch{raw.formFields=null;}
    }
    if(typeof doc.getAttachments==="function"){
      try{
        const attaches=await doc.getAttachments();
        raw.embeddedFiles=attaches&&typeof attaches==="object"?Object.keys(attaches).length:0;
      }catch{raw.embeddedFiles=null;}
    }
    if(typeof doc.getJSActions==="function"){
      try{raw.scripts=countActions(await doc.getJSActions());}catch{raw.scripts=null;}
    }
    const total=Math.min(raw.pages,MAX_TEXT_PAGES);
    let hits=0;
    for(let pageNum=1;pageNum<=total;pageNum++){
      const page=await doc.getPage(pageNum);
      const text=await page.getTextContent();
      const content=(text.items||[]).map(x=>typeof x.str==="string"?x.str:"").join(" ");
      raw.inspectedPages++;
      if(!content.replace(/\s/g,""))raw.pagesWithoutText++;
      const ssns=content.match(/\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g)||[];
      if(ssns.length){hits+=ssns.length;raw.privacyPages.push(pageNum);}
      page.cleanup();
    }
    if(raw.inspectedPages===raw.pages)raw.privacyCandidates=hits;
    else raw.privacyCandidates=null;
    return raw;
  }catch(e){
    raw.error=errorMessage(e);
    // A partial parse is not a complete inspection.
    if(raw.parsed===true){
      raw.error="Page inspection stopped: "+String(e?.message||"Unknown extraction error").slice(0,170);
      raw.pages=raw.pages||0;
    }
    return raw;
  }finally{
    if(doc){try{await doc.destroy();}catch{}}
    else if(task){try{await task.destroy();}catch{}}
  }
}
function el(tag,className,text){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=text;
 return node;
}
function renderOne(result){
 const card=el("article","fp-report-card");
 const head=el("div","fp-report-card-head");
 const left=el("div");left.append(el("span","fp-overline",result.profile.name),el("h3","",result.filename));
 left.append(el("p","",humanBytes(result.sizeBytes)+" · "+result.pages+" pages · "+result.inspectedPages+" pages inspected · "+(result.pdfVersion?"PDF "+result.pdfVersion+" · ":"")+now()));
 const outcome=el("span","fp-result-outcome"+(result.counts.warning||result.counts.blocked?" alert":""),result.outcome);
 head.append(left,outcome);card.append(head);
 const checks=el("div","fp-report-checks");
 const labels={pass:"Pass",warning:"Warning",review:"Review",blocked:"Blocked","not-run":"Not run"};
 for(const c of result.checks){
   const row=el("div","fp-check");
   const badge=el("span","fp-check-badge "+c.status,labels[c.status]||c.status);
   const label=el("div");
   label.append(el("h4","",c.label));
   if(c.source==="profile")label.append(el("small","fp-check-source","Court reference/profile criterion"));
   const message=el("p","",c.message);
   row.append(badge,label,message);checks.append(row);
 }
 card.append(checks);
 const tail=el("div","fp-report-footer","SHA-256: "+(result.hash||"Unavailable")+" · Reference reviewed "+result.profile.reviewed+" · Requires separate human filing review.");
 card.append(tail);
 return card;
}
function refresh(){
 try{
  const selectedProfile=profile();
  evaluated=rawReports.map(r=>evaluateDocument(r,selectedProfile));
  els.results.replaceChildren(...evaluated.map(renderOne));
  els.empty.hidden=evaluated.length>0;
  els.json.disabled=evaluated.length===0||isBusy;
  els.print.disabled=evaluated.length===0||isBusy;
  if(evaluated.length){
    const metrics=summarizeBatch(evaluated);
    els.statFiles.textContent=String(metrics.files);
    els.statFlagged.textContent=String(metrics.flagged);
    els.statBlocked.textContent=String(metrics.blocked);
    els.statPages.textContent=String(metrics.pages);
  }else{
    for(const target of [els.statFiles,els.statFlagged,els.statBlocked,els.statPages])target.textContent="—";
  }
 }catch(e){
  say(String(e.message||e),true);
  els.run.disabled=true;
 }
}
async function runScan(){
 if(isBusy||!files.length)return;
 let selectedProfile;
 try{selectedProfile=profile();}catch(e){say(e.message,true);return;}
 isBusy=true;
 els.run.disabled=true;els.demo.disabled=true;els.input.disabled=true;
 els.json.disabled=true;els.print.disabled=true;
 rawReports=[];refresh();
 let lib;
 try{
   say("Loading the pinned PDF analysis engine…");
   lib=await getPDFJS();
 }catch(e){
   say(e.message,true);
   isBusy=false;els.demo.disabled=false;els.input.disabled=false;els.run.disabled=files.length===0;
   return;
 }
 for(let i=0;i<files.length;i++){
   say("Inspecting "+(i+1)+" of "+files.length+": "+files[i].name);
   // Keep each file independent: failure of one document must not abort the batch.
   let raw;
   try{raw=await inspectFile(files[i],lib);}
   catch(e){raw={filename:files[i].name,sizeBytes:files[i].size,parsed:false,headerOk:false,error:errorMessage(e)};}
   rawReports.push(raw);
   refresh();
   await new Promise(resolve=>setTimeout(resolve,0));
 }
 isBusy=false;els.demo.disabled=false;els.input.disabled=false;els.run.disabled=files.length===0;
 refresh();
 const total=summarizeBatch(evaluated);
 say("Inspected "+total.files+" file(s). "+total.flagged+" flagged, "+total.blocked+" blocked. Every filing still needs human review.");
 $("results").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});
}
function download(name,contents,type){
 const blob=new Blob([contents],{type});
 const link=document.createElement("a"),url=URL.createObjectURL(blob);
 link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function exportJSON(){
 if(!evaluated.length)return;
 const payload=buildExport(evaluated,profile());
 download("filingproof-report-"+new Date().toISOString().slice(0,10)+".json",JSON.stringify(payload,null,2)+"\n","application/json");
}
els.input.addEventListener("change",e=>chooseFiles(e.target.files));
els.drop.addEventListener("keydown",e=>{
 if(e.key==="Enter"||e.key===" "){e.preventDefault();els.input.click();}
});
for(const name of ["dragenter","dragover"]){
 els.drop.addEventListener(name,e=>{e.preventDefault();els.drop.classList.add("drag-over");});
}
for(const name of ["dragleave","drop"]){
 els.drop.addEventListener(name,e=>{e.preventDefault();els.drop.classList.remove("drag-over");});
}
els.drop.addEventListener("drop",e=>chooseFiles(e.dataTransfer?.files));
els.demo.addEventListener("click",async()=>{
 chooseFiles([makeSyntheticPDF()]);
 if(files.length)await runScan();
});
els.run.addEventListener("click",runScan);
els.profile.addEventListener("change",profileChanged);
els.maxSize.addEventListener("input",()=>{els.run.disabled=isBusy||!files.length;refresh();});
els.textRule.addEventListener("change",refresh);
els.json.addEventListener("click",exportJSON);
els.print.addEventListener("click",()=>{if(evaluated.length)window.print();});
els.about.addEventListener("click",()=>els.dialog.showModal());
els.close.addEventListener("click",()=>els.dialog.close());
els.dialog.addEventListener("click",e=>{
 if(e.target===els.dialog)els.dialog.close();
});
profileChanged();
