/** AGENT/FAULT LIVE — hosted serverless API. API key only in Netlify environment.
 * PostgreSQL row-level locking serializes game mutations (unlike local SQLite or Blobs).
 */
import { getDatabase } from '@netlify/database';
import type { Config, Context } from '@netlify/functions';
import { createHash, randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import { ABC, CARDS, MODEL_PRICES, MAX_ROOM_CALLS, MAX_DAILY_CALLS, MAX_DAILY_ESTIMATED_USD,
  problem,demand,token,digest,auth,createRoom,visible,buildPrompt,applyAction,
  parseAnswers,estimateUsd } from '../../lib/game.mjs';

const db=getDatabase();
const noCache={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
const model=()=>Netlify.env.get('AGENT_FAULT_MODEL')?.trim()||'gpt-4.1-mini';
const apiKey=()=>Netlify.env.get('OPENAI_API_KEY')?.trim()||'';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:noCache});
const authHeader=(req:Request)=>req.headers.get('authorization');
const codePattern=/^[A-HJ-NP-Z2-9]{6}$/;
const labels='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode=()=>Array.from({length:6},()=>labels[randomBytes(1)[0]%labels.length]).join('');

async function transactional<T>(fn:(client:any)=>Promise<T>):Promise<T>{
 const client=await db.pool.connect();
 try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}
 catch(err){await client.query('ROLLBACK');throw err}finally{client.release()}
}
async function rate(client:any,context:Context,kind:string,threshold:number){
 // Hash client IP with a distinct action scope. Store only hashes; rotate after a 10-minute window.
 const ip=String(context.ip||'unknown');const bucket=createHash('sha256').update(`${kind}|${ip}`).digest('hex');
 const q=await client.query(`INSERT INTO af_request_limits (bucket,window_start,requests) VALUES ($1,NOW(),1)
 ON CONFLICT (bucket) DO UPDATE SET
 requests=CASE WHEN af_request_limits.window_start < NOW()-INTERVAL '10 minutes' THEN 1 ELSE af_request_limits.requests+1 END,
 window_start=CASE WHEN af_request_limits.window_start < NOW()-INTERVAL '10 minutes' THEN NOW() ELSE af_request_limits.window_start END
 RETURNING requests`,[bucket]);demand(q.rows[0].requests<=threshold,'Too many requests; retry later',429);
}
async function readRoom(client:any,code:string,forUpdate:boolean){
 demand(codePattern.test(code),'Invalid room code',404);
 const q=await client.query(`SELECT payload, updated_at FROM af_rooms WHERE code=$1${forUpdate?' FOR UPDATE':''}`,[code]);
 demand(q.rowCount,'Room not found',404);
 const row=q.rows[0];const updated=Date.parse(row.updated_at);demand(Date.now()-updated<24*3600000,'This room expired',410);
 return row.payload;
}
async function saveRoom(client:any,r:any){r.version=(r.version||0)+1;await client.query('UPDATE af_rooms SET payload=$2::jsonb, updated_at=NOW() WHERE code=$1',[r.code,JSON.stringify(r)])}
async function usage(client:any){const q=await client.query(`SELECT COUNT(*)::int requests, COUNT(*) FILTER (WHERE outcome='ok')::int successful,
 COALESCE(SUM(estimated_usd),0)::float8 estimated_usd,
 COALESCE(SUM(input_tokens),0)::int input_tokens, COALESCE(SUM(output_tokens),0)::int output_tokens
 FROM af_usage WHERE at >= date_trunc('day',NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`);
 return q.rows[0]||{requests:0,estimated_usd:0}}
async function present(r:any,role:string,p:any){const c=await db.pool.connect();try{const u=role==='host'?await usage(c):{requests:0,estimated_usd:0};return visible(r,role,p,u,model(),Boolean(apiKey()))}finally{c.release()}}
async function readJson(req:Request){const s=await req.text();demand(s.length<=12000,'Request body too long',413);if(!s.trim())return {};try{return JSON.parse(s)}catch{throw problem(400,'Invalid JSON')}}
async function reserveGenerate(code:string,bearer:string|null){return transactional(async c=>{
 const r=await readRoom(c,code,true);const who=auth(r,bearer);
 demand(who.role==='host'&&r.phase==='generate','Only host may generate now');
 demand(apiKey(),'Server-side OpenAI key not configured',503);
 const m=model();demand(m in MODEL_PRICES,'Model is not allowed in this low-cost edition',422);
 demand(r.generation_calls<MAX_ROOM_CALLS,'Room generation limit reached',429);
 demand(!r.ai_attempted,'AI already attempted this round; complete missing letters manually',429);
 // Cross-room advisory lock prevents concurrent rooms from exceeding the daily request quota.
 await c.query("SELECT pg_advisory_xact_lock(hashtext('af_live_daily_ai_budget'))");
 const budget=await usage(c);
 demand(budget.requests<MAX_DAILY_CALLS,'Daily request budget reached',429);
 demand(budget.estimated_usd<MAX_DAILY_ESTIMATED_USD,'Daily estimated spending threshold reached',429);
 r.ai_attempted=true;r.generation_calls++;await saveRoom(c,r);
 const usageRow=await c.query(`INSERT INTO af_usage(room,model,outcome) VALUES($1,$2,'attempted') RETURNING id`,[code,m]);
 return {prompt:buildPrompt(r),labels:r.candidates.map((x:any)=>x.label),usageId:usageRow.rows[0].id,model:m,room:code};
})}
async function finishGenerate(reserved:any,raw:string,providerUsage:any,providerSucceeded:boolean){
 return transactional(async c=>{
 const cost=estimateUsd(reserved.model,providerUsage)||0;
 await c.query(`UPDATE af_usage SET outcome=$2,input_tokens=$3,output_tokens=$4,cached_tokens=$5,estimated_usd=$6 WHERE id=$1`,
 [reserved.usageId,providerSucceeded?'ok':'error',Number(providerUsage.input_tokens||0),Number(providerUsage.output_tokens||0),Number(providerUsage.input_tokens_details?.cached_tokens||0),cost]);
 const meta={model:reserved.model,input_tokens:providerUsage.input_tokens||null,output_tokens:providerUsage.output_tokens||null,estimated_usd:cost};
 if(!providerSucceeded)return {complete:false,billing:meta};
 const r=await readRoom(c,reserved.room,true);demand(r.phase==='generate','Room has already advanced');
 const parsed=parseAnswers(raw,reserved.labels);
 if(!reserved.labels.every((l:string)=>l in parsed)||Object.values(parsed).filter((x:any)=>x&&x.toUpperCase()!=='SKIP').length<2){return {complete:false,raw:raw.slice(0,7000),missing:reserved.labels.filter((l:string)=>!(l in parsed)),billing:meta}}
 r.answers=parsed;r.phase='spotlight';await saveRoom(c,r);return {complete:true,billing:meta};
 });
}
function validOrigin(req:Request){if(req.method==='GET'||req.method==='HEAD')return;
 const origin=req.headers.get('origin');if(!origin)return;const expected=new URL(req.url).origin;
 demand(origin===expected,'Cross-site actions are not permitted',403);
}
function qrUrl(req:Request,code:string){return new URL(`/play/${code}`,req.url).toString();}

export default async function handler(req:Request,ctx:Context):Promise<Response>{
 try{
  validOrigin(req);
  const u=new URL(req.url),path=u.pathname,method=req.method;
  if(method==='GET'&&path==='/api/health')return json({status:'ok',edition:'hosted-v0.3.0',mode:'netlify-db',cards:{Scenario:24,Interference:36,Fault:6},ai_configured:Boolean(apiKey())});
  if(method==='POST'&&path==='/api/rooms'){
   const body=await readJson(req);demand(body&&typeof body==='object','Invalid request',400);
   const {code,privateToken}=await transactional(async c=>{
    await rate(c,ctx,'new-room',10);
    for(let i=0;i<8;i++){
     const code=randomCode(),privateToken=token(),r=createRoom(code,privateToken);
     const insert=await c.query('INSERT INTO af_rooms(code,payload) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING RETURNING code',[code,JSON.stringify(r)]);
     if(insert.rowCount)return {code,privateToken};
    }throw problem(503,'Could not allocate unique room code');
   });return json({code,token:privateToken,role:'host'});
  }
  const m=path.match(/^\/api\/rooms\/([A-Z0-9]{6})(?:\/(join|action|generate|check-ai|qr\.png))?$/i);
  if(!m)throw problem(404,'Endpoint not found');
  const code=m[1].toUpperCase(),action=m[2]||'';
  if(method==='POST'&&action==='join'){
   const body=await readJson(req);const name=String(body.name||'').trim().replace(/\s+/g,' ');
   demand(name.length>=2&&name.length<=24,'Nickname must be 2–24 characters',422);
   return json(await transactional(async c=>{
    await rate(c,ctx,'join-room',40);
    const r=await readRoom(c,code,true);
    demand(r.phase==='lobby','Joining is closed');demand(r.players.filter((p:any)=>p.active).length<8,'Room is full');
    demand(!r.players.some((p:any)=>p.active&&p.name.toLowerCase()===name.toLowerCase()),'Nickname already in use');
    const privateToken=token(),id=randomBytes(8).toString('hex');
    r.players.push({id,token_hash:digest(privateToken),name,seat:r.players.length,active:true,hand:[],score:0});await saveRoom(c,r);
    return {code,token:privateToken,role:'player',player_id:id};
   }));
  }
  if(method==='GET'&&action==='qr.png'){
    const c=await db.pool.connect();try{await readRoom(c,code,false)}finally{c.release()}
    const png=await QRCode.toBuffer(qrUrl(req,code),{errorCorrectionLevel:'M',width:320,margin:2});
    return new Response(new Uint8Array(png),{headers:{...noCache,'Content-Type':'image/png'}});
  }
  if(method==='GET'&&action===''){
   const c=await db.pool.connect();let r,who;try{r=await readRoom(c,code,false);who=auth(r,authHeader(req));}finally{c.release()}
   return json(await present(r,who.role,who.p));
  }
  if(method==='POST'&&action==='action'){
    const body=await readJson(req);demand(typeof body.name==='string'&&body.data&&typeof body.data==='object','Invalid action payload',422);
    const state=await transactional(async c=>{
     const r=await readRoom(c,code,true),who=auth(r,authHeader(req));
     applyAction(r,who.role,who.p,body.name,body.data);
     // applyAction already increments version; write without a second increment.
     await c.query('UPDATE af_rooms SET payload=$2::jsonb, updated_at=NOW() WHERE code=$1',[code,JSON.stringify(r)]);
     return {r,who};
    });return json(await present(state.r,state.who.role,state.who.p));
  }
  if(method==='POST'&&action==='check-ai'){
    const c=await db.pool.connect();try{const r=await readRoom(c,code,false);const who=auth(r,authHeader(req));demand(who.role==='host','Host only',403)}finally{c.release()}
    const key=apiKey();demand(key,'OpenAI key is not configured on server',503);const mod=model();demand(mod in MODEL_PRICES,'Unsupported model',422);
    try{const response=await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(mod)}`,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
     demand(response.ok,'API key/model connection failed; check server settings',502);
     return json({configured:true,reachable:true,model:mod,note:'Connection checked; no model generation request.'});
    }catch{throw problem(502,'API connection failed; verify the configured secret and model')}
  }
  if(method==='POST'&&action==='generate'){
    const reserved=await reserveGenerate(code,authHeader(req));let raw='',providerUsage={},okay=false;
    try{const response=await fetch('https://api.openai.com/v1/responses',{
     method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey()}`},
     body:JSON.stringify({model:reserved.model,instructions:'You produce short fictional card-game alternatives. Return only labeled answers. Do not explain your process.',input:reserved.prompt,max_output_tokens:500,store:false}),signal:AbortSignal.timeout(45000)});
     if(!response.ok)throw Error('Provider status '+response.status);
     const data:any=await response.json();providerUsage=data.usage||{};
     raw=(data.output||[]).flatMap((b:any)=>b.content||[]).filter((s:any)=>s.type==='output_text').map((s:any)=>s.text||'').join('');okay=true;
    }catch{await finishGenerate(reserved,'',{},false);throw problem(502,'AI generation failed. Use manual entry; provider details and keys are not displayed.')}
    return json(await finishGenerate(reserved,raw,providerUsage,okay));
  }
  throw problem(405,'Method not allowed');
 }catch(err:any){const status=err?.status>=400&&err.status<600?err.status:500;
  if(status===500)console.error('AGENT/FAULT internal failure',String(err?.message||'Unknown'));
  return json({detail:status===500?'Server error. Check the Netlify function logs.':err.message},status);
 }
}
export const config:Config={path:'/api/*',rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:60,windowLimit:900}};
