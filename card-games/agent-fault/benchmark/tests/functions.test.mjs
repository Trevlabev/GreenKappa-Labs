import test from 'node:test';
import assert from 'node:assert/strict';
import run from '../netlify/functions/run.mjs';
import status from '../netlify/functions/status.mjs';

const prior=globalThis.Netlify;
const priorFetch=globalThis.fetch;
function env(){globalThis.Netlify={env:{get:key=>({BENCHMARK_ACCESS_TOKEN:'unit-test-token',OPENAI_API_KEY:'fake-api-key',OPENAI_MODEL:'gpt-4.1-mini'})[key]}};}
const req=(data,token='unit-test-token')=>new Request('https://benchmark.example/api/run',{method:'POST',headers:{'content-type':'application/json','x-benchmark-token':token},body:JSON.stringify(data)});
test('status endpoint reports configuration without returning any secrets',async()=>{
 env();const response=await status(new Request('https://benchmark.example/api/status'));const data=await response.json();
 assert.equal(data.ready,true);assert(!JSON.stringify(data).includes('fake-api-key'));
});
test('protected endpoint rejects missing/wrong access tokens',async()=>{
 env();for(const token of ['wrong','']){const response=await run(req({fixtureId:'F01',variant:'baseline'},token));assert.equal(response.status,401);}
});
test('protected endpoint rejects unknown fixture without model call',async()=>{
 env();const response=await run(req({fixtureId:'F99',variant:'baseline'}));assert.equal(response.status,400);
});
test('model endpoint returns raw and parsed output, never API key',async()=>{
 env();globalThis.fetch=async(uri,options)=>{
  assert.equal(uri,'https://api.openai.com/v1/responses');
  const p=JSON.parse(options.body);
  assert.equal(p.model,'gpt-4.1-mini'); assert.equal(p.store,false);assert(!p.input.includes('BREAKPOINT A:'));
  return Response.json({id:'resp_test',status:'completed',usage:{input_tokens:200,output_tokens:50,total_tokens:250},output:[{content:[{type:'output_text',text:'A: Hello mayor.\nB: Excellent wedding.\nC: Fine print is law.\nD: Good day.'}]}]});
 };
 const response=await run(req({fixtureId:'F01',variant:'challenger'}));const data=await response.json();
 assert.equal(response.status,200);assert.equal(data.parsed.A.raw,'Hello mayor.');assert.equal(data.usage.total_tokens,250);
 assert(!JSON.stringify(data).includes('fake-api-key'));
 globalThis.fetch=priorFetch;
});
test('reset global mocks',()=>{globalThis.Netlify=prior;globalThis.fetch=priorFetch;});
