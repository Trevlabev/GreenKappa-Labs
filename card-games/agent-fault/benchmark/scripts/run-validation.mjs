/**
 * AGENT/FAULT one-shot paired API benchmark: independent stochastic samples,
 * blinded machine review, locked production rules, paired sensitivity checks.
 * The output is experimental evidence, NOT a human gameplay study.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardsByVariant, fixtures, promptFor, extractText, parseCandidates, validateFixtures } from '../shared/benchmark.mjs';

const HOME=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const OUT_DIR=path.join(HOME,'benchmark-output');
const OUTPUT=path.join(OUT_DIR,'validation-results.json');
const MD=path.join(OUT_DIR,'validation-report.md');
const KEY=process.env.OPENAI_API_KEY;
const MODEL=process.env.BENCHMARK_MODEL||'gpt-4.1-mini';
const REPEATS=Number(process.env.BENCHMARK_REPEATS||'3');
const GEN_TOKENS=460;
const GRADE_TOKENS=2200;
const MAX_POSSIBLE_CALLS=16*2*3*2;

const RUBRIC_FIELDS=['breakpointA_base','breakpointB_base','fault_base','breakpointA_candidate','breakpointB_candidate','fault_candidate'];
const baseLookup=cardsByVariant.baseline;
const challengerLookup=cardsByVariant.challenger;
const datum={schema:2,project:'AGENT/FAULT',benchmark:'v0.5-P vs v0.5-T2; locked baseline scenario / scoring',
 metadata:{runner:'GitHub Actions, single-use push event',startedAt:new Date().toISOString(), model:MODEL,repeats:REPEATS,expectedGenerationCalls:16*2*REPEATS,expectedJudgeCalls:16*2*REPEATS,expectedCandidates:16*2*REPEATS*4,baselineScenarioLocked:true,primaryRubric:'baseline',judgeBlindToVersion:true,temperature:0.8,scoreLimits:'Machine classification requires verbatim evidence and is NOT a human table vote or a reliable comedy score.',sourceCommit:process.env.GITHUB_SHA||null,status:'running'},results:[], errors:[],summary:null};

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function fixed30(s){return String(s||'').trim().split(/\s+/).slice(0,30).join(' ');}
function normal(s){return String(s||'').toLowerCase().normalize('NFKC').replace(/[“”‘’]/g,"'").replace(/\s+/g,' ').trim();}
function available(){return datum.results.reduce((s,x)=>s+(x.generation?.status==='completed'?1:0)+(x.grading?.status==='completed'?1:0),0);}
function persist(){ fs.mkdirSync(OUT_DIR,{recursive:true});fs.writeFileSync(OUTPUT,JSON.stringify(datum,null,2)); }
export function createLockedPrompt(fixtureId,variant){
  const f=fixtures.find(x=>x.fixtureId===fixtureId);if(!f||!['baseline','challenger'].includes(variant))throw Error('unknown fixture/variant');
  const sc=baseLookup[f.scenarioId];
  const input=[`PUBLIC ASSIGNMENT: ${sc.public_assignment}`,`REQUIRED BEHAVIOR: ${sc.required_behavior}`,`PRIVATE AGENT PERSONALITY: ${f.profile}`,
    'LETTERED INTERFERENCE INSTRUCTIONS:',
    ...f.interferenceIds.map((id,i)=>`${f.labels[i]}: ${cardsByVariant[variant][id].instruction}`),
    'Generate exactly one separate fictional assistant response for each of A, B, C and D. No baseline. Never include or discuss scoring conditions.'
  ].join('\n');
  return {fixture:f,scenario:sc,system:promptFor(fixtureId,'baseline').system,input};
}
export function gradingPrompt(f,parsed){
  const b=baseLookup[f.scenarioId],c=challengerLookup[f.scenarioId],fb=baseLookup[f.faultId],fc=challengerLookup[f.faultId];
  const examples=f.labels.map(label=>({label,text:fixed30(parsed[label]?.raw||'')}));
  return JSON.stringify({scenario:{public_assignment:b.public_assignment,required_behavior:b.required_behavior,profile:f.profile},
    scoringRules:{baseline:{breakpointA:b.breakpoint_a,breakpointB:b.breakpoint_b,fault:fb.condition},challenger:{breakpointA:c.breakpoint_a,breakpointB:c.breakpoint_b,fault:fc.condition}},
    candidates:examples});
}
const JUDGE_INSTRUCTIONS=`You are a strict, literal evidence annotator for a fiction-based tabletop game. This is NOT a security audit. Score FOUR unlabeled-version fictional replies using exact rule definitions supplied in user JSON. The criteria for baseline and challenger must both be scored against the SAME fictional replies (do not infer which version produced them). Award YES only when words explicitly satisfy the full printed condition; possibilities, implications, negations, stereotypes, jokes about the idea and inferred intentions count NO. If genuinely ambiguous, choose UNCERTAIN. Each YES must include an EXACT non-empty contiguous quote from the actual candidate text. Each NO or UNCERTAIN needs no quote. Candidate validity means the reply is present and not simply a safety refusal; its actual text is capped to the first 30 words. A "Fault" is simply a game condition, not an assertion of real AI misbehavior. For each candidate give a subjective comedy proxy 1-5, but label it only as an AI proxy, not audience laughter or a true win. Do not compare candidates. Provide an explanatory short note. Return ONLY JSON matching the requested schema. Never change any response being graded.`;

const labelSchema={type:'object',additionalProperties:false,required:['label','valid',...RUBRIC_FIELDS,'comedy_proxy','evidence','note'],properties:{
 label:{type:'string',enum:['A','B','C','D']},valid:{type:'boolean'},
 ...Object.fromEntries(RUBRIC_FIELDS.map(k=>[k,{type:'string',enum:['yes','no','uncertain']}])),
 comedy_proxy:{type:'integer'},
 evidence:{type:'object',additionalProperties:false,required:RUBRIC_FIELDS,properties:Object.fromEntries(RUBRIC_FIELDS.map(k=>[k,{type:'string'}]))},
 note:{type:'string'}
}};
const FORMAT={type:'json_schema',name:'af_game_rubric_v1',strict:true,schema:{type:'object',additionalProperties:false,required:['ratings'],properties:{ratings:{type:'array',items:labelSchema}}}};

export function acceptGrade(graded,parsed){
 const entries=graded?.ratings;if(!Array.isArray(entries)||entries.length!==4)throw Error('Grader did not return exactly four entries');
 const map={};
 for(const ent of entries){
  const label=ent.label;if(!'ABCD'.includes(label)||map[label])throw Error('Duplicate or invalid grade label');
  const content=fixed30(parsed[label]?.raw);
  const row={label,valid:!!ent.valid,comedy_proxy:Math.max(1,Math.min(5,Number(ent.comedy_proxy)||1)),note:ent.note||'',fields:{},evidence:{}};
  for(const field of RUBRIC_FIELDS){
   let v=ent[field];if(!['yes','no','uncertain'].includes(v))throw Error('Grader invalid '+field);
   const quote=String(ent.evidence?.[field]||'').trim();
   // A YES without an exact verbatim supporting quote cannot be promoted to a confirmed outcome.
   if(v==='yes'&&(!quote||!normal(content).includes(normal(quote)))){v='uncertain';row.note+=' [Machine YES downgraded: missing verbatim evidence for '+field+']';}
   row.fields[field]=v;row.evidence[field]=quote;
  }
  map[label]=row;
 }
 if(Object.keys(map).length!==4)throw Error('Missing grade label');
 return map;
}
async function callOpenAI({instructions,input,max_output_tokens=GEN_TOKENS,temperature=0.8,format}){
 if(!KEY)throw Error('OPENAI_API_KEY repository secret missing');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),55000);
 try{
  const body={model:MODEL,instructions,input,max_output_tokens,store:false,temperature};
  if(format)body.text={format};
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${KEY}`},body:JSON.stringify(body),signal:controller.signal});
  const json=await response.json().catch(()=>({}));
  if(!response.ok){throw Error('OpenAI HTTP '+response.status+': '+String(json?.error?.code||json?.error?.type||'unknown').slice(0,100));}
  if(json.status!=='completed')throw Error('OpenAI generation incomplete: '+String(json.status));
  return json;
 } finally{clearTimeout(timer);}
}
function metrics(){
 const variants=['baseline','challenger'];const rows=datum.results.filter(r=>r.generation?.status==='completed'&&r.grading?.status==='completed');
 const stats={};
 for(const v of variants){const samples=rows.filter(r=>r.variant===v);const all=samples.flatMap(r=>r.grading.entries||[]);const hit=(f)=>all.filter(x=>x.fields[f]==='yes').length;
  const bpBase=all.filter(x=>x.fields.breakpointA_base==='yes'||x.fields.breakpointB_base==='yes').length;
  const bpChanged=all.filter(x=>x.fields.breakpointA_candidate==='yes'||x.fields.breakpointB_candidate==='yes').length;
  const ambig=all.filter(x=>RUBRIC_FIELDS.some(k=>x.fields[k]==='uncertain')).length;
  stats[v]={calls:samples.length,candidates:all.length,baselineBreakpoint:bpBase,baselineFault:hit('fault_base'),changedBreakpoint:bpChanged,changedFault:hit('fault_candidate'),ambiguousAny:ambig,meanComedyProxy:all.length?Math.round(100*all.reduce((s,x)=>s+(x.comedy_proxy||0),0)/all.length)/100:null};
 }
 const cards={};
 for(const r of rows){for(const [i,id] of r.interferenceIds.entries()){
  const letter='ABCD'[i];const row=r.grading.entries.find(x=>x.label===letter);if(!row)continue;
  cards[id]??={id,title:baseLookup[id].title,changed:baseLookup[id].instruction!==challengerLookup[id].instruction,baseline:{n:0,bp:0,fault:0,uncertain:0,comedyTotal:0},challenger:{n:0,bp:0,fault:0,uncertain:0,comedyTotal:0}};
  const d=cards[id][r.variant];d.n++;d.bp+=(row.fields.breakpointA_base==='yes'||row.fields.breakpointB_base==='yes')?1:0;d.fault+=(row.fields.fault_base==='yes')?1:0;d.uncertain+=RUBRIC_FIELDS.some(k=>row.fields[k]==='uncertain')?1:0;d.comedyTotal+=(row.comedy_proxy||0);
 }}
 return {counts:stats,cards:Object.values(cards).sort((a,b)=>a.id.localeCompare(b.id)),successfulGradingCalls:rows.length,plannedGradingCalls:16*2*REPEATS};
}
function report(){
 datum.summary=metrics();
 const m=datum.summary;
 let t=`# AGENT/FAULT — One-shot 16-fixture paired API validation\n\n**Status:** ${datum.metadata.status}; **Model:** ${MODEL}; **Replicates:** ${REPEATS}; **Runs:** ${m.successfulGradingCalls}/${m.plannedGradingCalls} graded generation calls.\n\n`+
 `**Evidence:** genuine API-generated fiction; model-as-rater classifications, *not* a blind independent human judge or actual 4–8 player game. Raw outputs and machine-rater evidence are preserved in the JSON artifact.\n\n`+
 `## Controlled design\n\n- 16 precommitted fixtures covering all 36 Interference cards.\n- Paired v0.5-P vs v0.5-T2 instruction text with **identical v0.5-P Scenario assignment, Required Behavior, and Agent Profile**.\n- Three samples of each fixture/variant; variant order alternates by fixture and sample to reduce sequencing bias.\n- Breakpoint and Fault judgments are reported under both original and challenger definitions **on the identical generated texts**, without re-generating for a new scoring rule.\n- Each candidate is rated by an API model that is not told the card version. Responses are capped to their first 30 words. Machine YES needs quoted verbatim supporting evidence; otherwise downgraded to UNCERTAIN.\n- The four altered Scenario *generation text* versions are outside this controlled Interference-effect experiment. No causal claims about them.\n- The model simultaneously sees all four candidate Interference instructions per generation request, just like the prototype; they are **not independent isolated agents**.\n\n`+
 `## Measured machine-score tallies\n\n| Metric | v0.5-P | v0.5-T2 |\n|---|---:|---:|\n`+
 `| API generations fully machine-graded | ${m.counts.baseline.calls} | ${m.counts.challenger.calls} |\n`+
 `| Individual output candidates | ${m.counts.baseline.candidates} | ${m.counts.challenger.candidates} |\n`+
 `| Qualify original public Breakpoint | ${m.counts.baseline.baselineBreakpoint} | ${m.counts.challenger.baselineBreakpoint} |\n`+
 `| Qualify original secret Fault | ${m.counts.baseline.baselineFault} | ${m.counts.challenger.baselineFault} |\n`+
 `| Qualify candidate Breakpoint definitions | ${m.counts.baseline.changedBreakpoint} | ${m.counts.challenger.changedBreakpoint} |\n`+
 `| Qualify candidate Fault definitions | ${m.counts.baseline.changedFault} | ${m.counts.challenger.changedFault} |\n`+
 `| At least one uncertain rater field | ${m.counts.baseline.ambiguousAny} | ${m.counts.challenger.ambiguousAny} |\n`+
 `| AI-only comedy proxy (1–5) | ${m.counts.baseline.meanComedyProxy??'—'} | ${m.counts.challenger.meanComedyProxy??'—'} |\n\n`+
 `**Interpretation rule:** the original scoring columns provide the common primary comparison; changed scoring columns measure sensitivity to revised game definitions, not improvements from Interference text. The proxy comedy rating is not player enjoyment.\n\n`+
 `## Interference card-by-card mechanical tally (original scoring rules)\n\n| ID / Card | Changed | v0.5-P objective/Fault per n | v0.5-T2 objective/Fault per n |\n|---|---|---|---|\n`+
 m.cards.map(c=>`| ${c.id} ${c.title.replace(/\|/g,'/')} | ${c.changed?'yes':'no'} | ${c.baseline.bp}/${c.baseline.fault} per ${c.baseline.n} | ${c.challenger.bp}/${c.challenger.fault} per ${c.challenger.n} |`).join('\n')+'\n\n'+
 `## Uncertainty and decisions\n\n- Do not promote v0.5-T2 based on this small sample alone: model-graded binary outcomes, shared-model rating dependence, and candidate co-batching are limitations.\n- Inspect complete raw model and judge notes for every apparent change or contradiction.\n- For disputed qualification, human YES/NO majority vote is still required at a real table.\n- For natural player action, response latency, favorite joke and replay enjoyment, human playtests remain necessary.\n`;
 fs.writeFileSync(MD,t);
}

async function main(){
 if(!KEY)throw Error('Missing OPENAI_API_KEY');
 if(MODEL!=='gpt-4.1-mini')throw Error('This one-shot is capped to gpt-4.1-mini');
 if(REPEATS!==3)throw Error('One-shot requires exactly three replications');
 if(!validateFixtures().ok)throw Error('Fixture validation failed');
 if(MAX_POSSIBLE_CALLS!==192)throw Error('Misconfigured paid-call cap');
 // For one-shot event only; runner refuses to operate under workflow_dispatch/schedule.
 if(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_EVENT_NAME!=='push')throw Error('Not a controlled push-triggered run');
 persist();
 for(const f of fixtures){
  for(let rep=1;rep<=REPEATS;rep++){
   const order=((Number(f.fixtureId.slice(1))+rep)%2===0)?['baseline','challenger']:['challenger','baseline'];
   for(const variant of order){
    const prepared=createLockedPrompt(f.fixtureId,variant),start=Date.now();
    const entry={key:`${f.fixtureId}:R${rep}:${variant}`,fixtureId:f.fixtureId,repetition:rep,variant,scenarioId:f.scenarioId,faultId:f.faultId,interferenceIds:f.interferenceIds,
      generation:null,grading:null};datum.results.push(entry);persist();
    console.log(`Generation ${datum.results.length}/${16*2*REPEATS}: ${entry.key} (one model call)`);
    try{
     const generated=await callOpenAI({instructions:prepared.system,input:prepared.input});
     const raw=extractText(generated),parsed=parseCandidates(raw);const missing=f.labels.filter(label=>!parsed[label]?.raw);
     entry.generation={status:missing.length?'partial':'completed',responseId:generated.id,model:MODEL,elapsedMs:Date.now()-start,
       usage:generated.usage||null,raw,parsed,missing,createdAt:new Date().toISOString()};persist();
     if(missing.length){datum.errors.push({key:entry.key,stage:'generation',kind:'missing_labels',missing});continue;}
     const gradeInput=gradingPrompt(f,parsed);
     console.log(`Rater ${entry.key} (one model call; both rubrics fixed)`);
     const t=Date.now();
     const rated=await callOpenAI({instructions:JUDGE_INSTRUCTIONS,input:gradeInput,max_output_tokens:GRADE_TOKENS,temperature:0,format:FORMAT});
     const rateRaw=extractText(rated),json=JSON.parse(rateRaw),accepted=acceptGrade(json,parsed);
     entry.grading={status:'completed',responseId:rated.id,elapsedMs:Date.now()-t,usage:rated.usage||null,entries:Object.values(accepted),raw:rateRaw};persist();
     await sleep(500);
    } catch(e){datum.errors.push({key:entry.key,at:new Date().toISOString(),error:String(e?.message||e)});entry.grading??={status:'error',message:String(e?.message||e)};persist();
      // Stop immediately on API/auth/rate error to bound costs. Partial files are still uploaded.
      if(/OpenAI HTTP|Missing OPENAI|abort/i.test(String(e)))throw e;
    }
   }
  }
 }
 datum.metadata.status='completed';
}
let failure=null;
try{await main();}catch(e){failure=e;datum.metadata.status='stopped_after_error';datum.errors.push({stage:'run',message:String(e?.message||e)});console.error('Controlled run stopped:',String(e?.message||e));}
finally{datum.metadata.finishedAt=new Date().toISOString();datum.metadata.apiCallLimit=MAX_POSSIBLE_CALLS;datum.metadata.successfulGenerationCalls=datum.results.filter(r=>r.generation?.status==='completed').length;datum.metadata.successfulJudgeCalls=datum.results.filter(r=>r.grading?.status==='completed').length;persist();report();console.log(`Saved ${datum.results.length} generation entries; ${datum.metadata.successfulJudgeCalls} fully graded; ${datum.errors.length} errors.`);}
if(failure)process.exitCode=1;
