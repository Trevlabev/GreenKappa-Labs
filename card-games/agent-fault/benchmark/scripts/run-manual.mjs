import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_MODEL, MODELS, fixtures, promptFor, extractText, parseCandidates, validateFixtures } from '../shared/benchmark.mjs';

const selection = process.env.FIXTURE_SELECTION || 'F01';
const model = process.env.BENCHMARK_MODEL || DEFAULT_MODEL;
const apiKey = process.env.OPENAI_API_KEY;
const allowed = new Set([...fixtures.map(f=>f.fixtureId),'all']);
if(!allowed.has(selection)) throw Error('Invalid fixture selection');
if(!MODELS.includes(model)) throw Error('Unsupported model');
if(!apiKey) throw Error('OPENAI_API_KEY Actions secret is missing. Set it before any paid tests.');
const validated = validateFixtures();
if(!validated.ok) throw Error('Fixture errors: '+validated.errors.join('; '));
const chosen = selection === 'all' ? fixtures : fixtures.filter(f=>f.fixtureId===selection);
const jobs = chosen.flatMap(f=>['baseline','challenger'].map(variant=>({fixtureId:f.fixtureId,variant})));
// Each invocation is explicitly opt-in in GitHub Actions; no unattended schedule.
const result = {
 schema: 1, project:'AGENT/FAULT', benchmark:'v0.5-P vs v0.5-T2',
 results:{},grades:{},errors:[],
 metadata:{
  runner:'GitHub Actions', startedAt:new Date().toISOString(),
  fixtureSelection:selection,model,plannedCalls:jobs.length,
  fixtureSeed:'AGENT-FAULT-2026-11-16-COVERAGE-v1',
  status:'running', caveat:'API-generated candidate responses; not independent human gameplay or human adjudication.'
 }
};
const outputDir = path.resolve('benchmark-output');
fs.mkdirSync(outputDir,{recursive:true});
const outputPath=path.join(outputDir,'agent-fault-results.json');
function save(){ fs.writeFileSync(outputPath,JSON.stringify(result,null,2)); }
save();
for(const [index,j] of jobs.entries()) {
 const prepared=promptFor(j.fixtureId,j.variant),now=Date.now();
 console.log(`Executing ${index+1}/${jobs.length}: ${j.fixtureId} ${j.variant} / ${model}`);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),50000);
 try {
  const response=await fetch('https://api.openai.com/v1/responses',{
   method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${apiKey}`},
   body:JSON.stringify({model,instructions:prepared.system,input:prepared.input,max_output_tokens:460,store:false}),
   signal:controller.signal
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok) {
   const code=data?.error?.code||data?.error?.type||'provider_error';
   throw Error(`OpenAI HTTP ${response.status} (${String(code).slice(0,100)})`);
  }
  const raw=extractText(data),parsed=parseCandidates(raw);
  const key=`${j.fixtureId}:${j.variant}`;
  result.results[key]={
   fixtureId:j.fixtureId,variant:j.variant,model,
   responseId:data.id||null,createdAt:new Date().toISOString(),elapsedMs:Date.now()-now,
   status:data.status||'unknown',usage:data.usage||null,
   scenarioId:prepared.fixture.scenarioId,interferenceIds:prepared.fixture.interferenceIds,
   candidateLabels:prepared.fixture.labels,faultId:prepared.fixture.faultId,
   raw,parsed,missing:prepared.fixture.labels.filter(l=>!parsed[l]?.raw),
   incomplete:data.status!=='completed'
  };
  save();
  if(index < jobs.length-1)await new Promise(r=>setTimeout(r,1200));
 } catch(e) {
  result.errors.push({at:new Date().toISOString(),...j,message:String(e?.message||e)});
  result.metadata.status='stopped_after_error';save();
  console.error(`Trial stopped: ${j.fixtureId} ${j.variant}: ${String(e?.message||e)}`);
  process.exitCode=1;
  break;
 } finally { clearTimeout(timeout); }
}
if(result.metadata.status==='running')result.metadata.status='completed';
result.metadata.finishedAt=new Date().toISOString();
result.metadata.completedCalls=Object.keys(result.results).length;
save();
console.log(`Saved ${Object.keys(result.results).length} request(s) to benchmark-output/agent-fault-results.json`);
