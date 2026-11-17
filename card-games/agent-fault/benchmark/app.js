const $ = id => document.getElementById(id);
const esc = value => String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const initial = {schema:1, project:'AGENT/FAULT', benchmark:'v0.5-P vs v0.5-T2', results:{}, grades:{}, errors:[]};
const SAVE_KEY='agent-fault-benchmark-github-pages-v2';
let state;
try {state=JSON.parse(localStorage.getItem(SAVE_KEY))||structuredClone(initial); if(state.schema!==1)throw Error('schema');}catch{state=structuredClone(initial);}
const save=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{alert('Local storage is full. Export results as JSON now to avoid data loss.');}};
let fixtures=[],active='F01',busy=false,stopping=false;
const versions=['baseline','challenger'];
const jobKey=(id,v)=>`${id}:${v}`;
const jobs=()=>fixtures.flatMap(f=>versions.map(v=>({fixtureId:f.fixtureId,variant:v})));
const completed =()=>jobs().filter(j=>state.results[jobKey(j.fixtureId,j.variant)]?.status==='completed');
const showError = msg=>{ $('progress-text').textContent=msg; console.error(msg); };
const moneyLabel=n=>n==null?'unknown':String(n);
function download(filename,body,mime='application/json'){
 const blob=new Blob([body],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),300);
}
const csvCell=x=>'"'+String(x??'').replaceAll('"','""')+'"';
const after=()=>{save();render();};
const gradeKey=(job,label)=>`${job}:${label}`;
const gradeFor=(job,label)=>state.grades[gradeKey(job,label)]||{};
const reviewedCount=()=>Object.values(state.grades).filter(g=>g.reviewed).length;
function selectedFixture(){return fixtures.find(f=>f.fixtureId===active) || fixtures[0];}
function render(){
 const done=completed();
 $('metric-runs').innerHTML=`${done.length}<span>/32</span>`;
 const count=done.reduce((a,j)=>a+Object.keys(state.results[jobKey(j.fixtureId,j.variant)]?.parsed||{}).filter(c=>['A','B','C','D'].includes(c)).length,0);
 $('metric-responses').innerHTML=`${count}<span>/128</span>`;
 const latency=done.map(j=>state.results[jobKey(j.fixtureId,j.variant)].elapsedMs).filter(n=>Number.isFinite(n));
 $('metric-latency').textContent=latency.length?(latency.reduce((a,b)=>a+b,0)/latency.length/1000).toFixed(1)+'s':'—';
 $('metric-reviewed').textContent=reviewedCount();
 $('progress-fill').style.width=`${done.length/32*100}%`;
 if(!busy)$('progress-text').textContent=`${done.length}/32 API calls recorded; ${32-done.length} remaining`;
 // GitHub Actions performs paid generation off-site; no browser-run controls.
 $('fixture-list').innerHTML=fixtures.map(f=>{
  const a=state.results[jobKey(f.fixtureId,'baseline')]?.status==='completed';
  const b=state.results[jobKey(f.fixtureId,'challenger')]?.status==='completed';
  return `<button type="button" class="fixture-btn ${f.fixtureId===active?'active':''}" data-fixture="${f.fixtureId}"><strong>${esc(f.scenarioTitle)}</strong><small>${f.fixtureId} · Repetition ${f.repetition}</small><span>${a&&b?'● Paired':a||b?'◐ Partial':'○ Unrun'}</span></button>`;
 }).join('');
 const f=selectedFixture();if(!f)return;
 $('active-fixture-title').textContent=f.scenarioTitle;
 $('fixture-meta').innerHTML=`<p><strong>${esc(f.fixtureId)}</strong> · Scenario ${esc(f.scenarioId)} · Repetition ${f.repetition} · Fault (hidden from generator): ${esc(f.fault.challenger.family)} family</p><p><strong>Assignment:</strong> ${esc(f.scenario.public_assignment)}</p><p><strong>Required behavior:</strong> ${esc(f.scenario.required_behavior)}</p><p><strong>Breakpoint A:</strong> ${esc(f.scenario.breakpoint_a)}</p><p><strong>Breakpoint B:</strong> ${esc(f.scenario.breakpoint_b)}</p><p><strong>Agent personality:</strong> ${esc(f.profile)}</p><p><strong>Fault:</strong> ${esc(f.fault.baseline.title)} (original) / ${esc(f.fault.challenger.title)} (challenger). Judge against each version's printed condition.</p>`;
 const cards=f.candidates.map(c=>{
  const keyA=jobKey(f.fixtureId,'baseline'),keyB=jobKey(f.fixtureId,'challenger');
  const sides=versions.map(v=>{
   const job=v==='baseline'?keyA:keyB;
   const r=state.results[job], parsed=r?.parsed?.[c.label];
   const grade=gradeFor(job,c.label);
   const raw=parsed?.raw||'';
   return `<div class="version ${v}"><h4>${v==='baseline'?'ORIGINAL v0.5-P':'CHALLENGER v0.5-T2'}</h4><div class="fixture-note">${esc(c[v].instruction)}</div><p class="output ${raw?'':'empty'}">${raw?esc(parsed.first30):'Not generated yet'}</p>${raw?`<details><summary class="fixture-note">Raw output (${parsed.wordCount} words)</summary><pre class="raw">${esc(raw)}</pre></details>`:''}${r?`<div class="call-meta">${esc(r.model)} · ${((r.elapsedMs||0)/1000).toFixed(1)}s · ${esc(r.responseId||'no response id')} ${r.incomplete?'<span class="error">· incomplete</span>':''}</div>`:''}${raw?`<div class="grades" data-gradejob="${esc(job)}" data-label="${c.label}">
  <label><input type="checkbox" data-field="reviewed" ${grade.reviewed?'checked':''}> Reviewed</label>
  <label><input type="checkbox" data-field="valid" ${grade.valid!==false?'checked':''}> Valid</label>
  <label><input type="checkbox" data-field="breakpointA" ${grade.breakpointA?'checked':''}> Breakpoint A</label>
  <label><input type="checkbox" data-field="breakpointB" ${grade.breakpointB?'checked':''}> Breakpoint B</label>
  <label><input type="checkbox" data-field="fault" ${grade.fault?'checked':''}> Secret Fault met</label>
  <label>Comedy <select data-field="comedy"><option value="">Unrated</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(grade.comedy)===n?'selected':''}>${n}/5</option>`).join('')}</select></label></div><input class="review-notes" type="text" data-field="notes" data-gradejob="${esc(job)}" data-label="${c.label}" value="${esc(grade.notes||'')}" placeholder="Reviewer notes / exact qualifying words">`:''}</div>`;
  }).join('');
  return `<article class="candidate"><div class="candidate-heading"><strong>Candidate ${c.label}</strong><span>${esc(c.id)} · ${esc(c.baseline.title)}</span></div><div class="pair">${sides}</div></article>`;
 });
 $('response-view').innerHTML=cards.join('')+`<p class="fixture-note">The first 30 words determine qualifying output. Reviewer judgments are manual; no model-generated “scores” are accepted as ground truth.</p>`;
 const runs=Object.values(state.results),bad=runs.filter(r=>r.incomplete||r.missing?.length);
 const tokens=runs.reduce((a,r)=>a+(r.usage?.total_tokens||0),0);
 renderAnalysis();
 $('audit-summary').innerHTML=`${runs.length} saved requests · ${reviewedCount()} reviewed candidates · ${tokens} reported model tokens · ${bad.length} incomplete/missing-letter responses. <strong>Pricing is not estimated</strong>; consult your OpenAI usage dashboard. Complete paired fixtures: ${fixtures.filter(f=>versions.every(v=>state.results[jobKey(f.fixtureId,v)]?.status==='completed')).length}/16.`;
}
function renderAnalysis(){
 const summary=new Map();
 for(const f of fixtures)for(const c of f.candidates){
   if(!summary.has(c.id))summary.set(c.id,{title:c.baseline.title,changed:c.baseline.instruction!==c.challenger.instruction,baseline:[],challenger:[]});
   const record=summary.get(c.id);
   for(const v of versions){
     const job=jobKey(f.fixtureId,v),res=state.results[job];
     if(!res?.parsed?.[c.label])continue;
     const g=gradeFor(job,c.label);
     if(g.reviewed)record[v].push(g);
   }
 }
 const renderStat=grades=>{
  if(!grades.length)return '<span class="muted">Not reviewed</span>';
  const bp=grades.filter(g=>g.breakpointA||g.breakpointB).length;
  const ft=grades.filter(g=>g.fault).length;
  const rated=grades.map(g=>Number(g.comedy)).filter(x=>x>=1&&x<=5);
  const comedy=rated.length?(rated.reduce((a,b)=>a+b,0)/rated.length).toFixed(1)+'/5':'—';
  return `${bp} BP · ${ft} Fault · ${comedy}<br><small>n=${grades.length} reviewed</small>`;
 };
 $('card-analysis').innerHTML='<table class="analysis-table"><thead><tr><th>Card</th><th>Text changed?</th><th>Original</th><th>Challenger</th></tr></thead><tbody>'+[...summary].sort((a,b)=>a[0].localeCompare(b[0])).map(([id,r])=>`<tr><td><strong>${esc(r.title)}</strong><br><small>${esc(id)}</small></td><td class="${r.changed?'changed':'muted'}">${r.changed?'Yes':'No'}</td><td>${renderStat(r.baseline)}</td><td>${renderStat(r.challenger)}</td></tr>`).join('')+'</tbody></table>';
}
function updateGrade(job,label,field,value){
 const key=gradeKey(job,label),old=state.grades[key]||{};
 state.grades[key]={...old,[field]:value};after();
}
function checkReady(){ $('server-chip').textContent='GitHub Actions mode';$('server-chip').className='status-chip ok'; }
function exportJSON(){
 const doc={...state,metadata:{exportedAt:new Date().toISOString(),schemaVersion:1,fixtureSeed:'AGENT-FAULT-2026-11-16-COVERAGE-v1',models:[...new Set(Object.values(state.results).map(r=>r.model))],note:'Results contain model raw outputs and human reviewer annotations, not any API keys.'},fixtures};
 download(`agent-fault-benchmark-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(doc,null,2));
}
function exportCSV(){
 const header=['fixtureId','variant','scenarioId','repetition','candidate','cardId','cardTitle','instruction','faultId','model','responseId','createdAt','latencyMs','promptTokens','completionTokens','totalTokens','output30','rawOutput','wordCount','reviewed','valid','breakpointA','breakpointB','fault','comedy','notes'];
 const rows=[header];
 for(const f of fixtures)for(const v of versions){
  const job=jobKey(f.fixtureId,v),res=state.results[job];if(!res)continue;
  for(const c of f.candidates){
   const p=res.parsed?.[c.label],g=gradeFor(job,c.label);
   rows.push([f.fixtureId,v,f.scenarioId,f.repetition,c.label,c.id,c[v].title,c[v].instruction,f.faultId,res.model,res.responseId,res.createdAt,res.elapsedMs,res.usage?.input_tokens,res.usage?.output_tokens,res.usage?.total_tokens,p?.first30,p?.raw,p?.wordCount,g.reviewed,g.valid!==false,g.breakpointA,g.breakpointB,g.fault,g.comedy,g.notes]);
  }
 }
 download(`agent-fault-benchmark-${new Date().toISOString().slice(0,10)}.csv`,rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),'text/csv');
}
function importJSON(evt){
 const file=evt.target.files?.[0];if(!file)return;
 file.text().then(t=>{
  let data;try{data=JSON.parse(t);}catch{alert('Invalid JSON');return;}
  if(data?.schema!==1||!data.results||!data.grades||typeof data.results!=='object'){alert('This is not a supported AGENT/FAULT benchmark export.');return;}
  if(!confirm('Replace local result data with this import? Export existing data first if needed.'))return;
  state={schema:1,project:'AGENT/FAULT',benchmark:'v0.5-P vs v0.5-T2',results:data.results,grades:data.grades,errors:data.errors||[]};after();
 }).catch(e=>alert(String(e)));
 evt.target.value='';
}
async function boot(){
 const response=await fetch('./data/fixtures.json');fixtures=await response.json();
 $('fixture-list').addEventListener('click',e=>{const el=e.target.closest('[data-fixture]');if(el){active=el.dataset.fixture;render();}});
 $('response-view').addEventListener('change',e=>{
  const el=e.target, field=el.dataset.field, holder=el.closest('[data-gradejob]');
  if(!field||!holder)return;
  updateGrade(holder.dataset.gradejob,holder.dataset.label,field,el.type==='checkbox'?el.checked:el.value);
 });
 $('response-view').addEventListener('focusout',e=>{const el=e.target;if(el.dataset.field==='notes')updateGrade(el.dataset.gradejob,el.dataset.label,'notes',el.value);});
 $('copy-prompt').addEventListener('click',()=>{
  const f=selectedFixture();const text=[`SCENARIO: ${f.scenario.public_assignment}`,`REQUIRED: ${f.scenario.required_behavior}`,`AGENT PROFILE: ${f.profile}`,...f.candidates.map(c=>`${c.label}: ${c.baseline.instruction}`)].join('\n');
  navigator.clipboard?.writeText(text).then(()=>showError('Original v0.5-P input copied.')).catch(()=>showError('Clipboard unavailable.'));
 });
 $('export-json').addEventListener('click',exportJSON);
 $('export-csv').addEventListener('click',exportCSV);
 $('import-json').addEventListener('change',importJSON);
 $('clear-results').addEventListener('click',()=>{if(confirm('Delete all locally saved results and grades? Export a backup first.')){state=structuredClone(initial);after();}});
 render();checkReady();
}
boot().catch(err=>showError(`Failed to initialize benchmark: ${err}`));
