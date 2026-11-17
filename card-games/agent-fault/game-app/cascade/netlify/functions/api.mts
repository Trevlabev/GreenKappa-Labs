/** AGENT/FAULT CASCADE v0.2-P — independently hosted Netlify Functions + Postgres.
 * The established Classic deployment and database tables are not modified.
 * All OpenAI calls and credentials are server-side. No game-state secrets are in URLs.
 */
import {getDatabase} from '@netlify/database';
import type {Config,Context} from '@netlify/functions';
import {createHash,randomBytes} from 'node:crypto';
import QRCode from 'qrcode';
import {
 CARDS,MODEL_PRICES,MAX_ROOM_CALLS,MAX_DAILY_CALLS,MAX_DAILY_ESTIMATED_USD,
 problem,demand,token,digest,auth,createRoom,visible,buildPrompt,
 applyAction,parseReply,receiveAgentReply,estimateUsd,currentStageKey
} from '../../lib/game.mjs';

const db=getDatabase();
const noCache={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
const model=()=>Netlify.env.get('AGENT_FAULT_MODEL')?.trim()||'gpt-4.1-mini';
const apiKey=()=>Netlify.env.get('OPENAI_API_KEY')?.trim()||'';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:noCache});
const pattern=/^[A-HJ-NP-Z2-9]{6}$/;
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode(){return Array.from({length:6},()=>alphabet[randomBytes(1)[0]%alphabet.length]).join('')}
async function transaction<T>(fn:(client:any)=>Promise<T>):Promise<T>{
 const c=await db.pool.connect();try{await c.query('BEGIN');const v=await fn(c);await c.query('COMMIT');return v;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release()}
}
async function rate(c:any,ctx:Context,kind:string,limit:number){const bucket=createHash('sha256').update(`${kind}|${ctx.ip||'unknown'}`).digest('hex');
 const q=await c.query(`INSERT INTO afc_request_limits(bucket,window_start,requests) VALUES($1,NOW(),1)
 ON CONFLICT(bucket) DO UPDATE SET requests=CASE WHEN afc_request_limits.window_start<NOW()-INTERVAL '10 minutes' THEN 1 ELSE afc_request_limits.requests+1 END,
 window_start=CASE WHEN afc_request_limits.window_start<NOW()-INTERVAL '10 minutes' THEN NOW() ELSE afc_request_limits.window_start END RETURNING requests`,[bucket]);
 demand(q.rows[0].requests<=limit,'Rate limit exceeded; try again later',429);
}
async function getRoom(c:any,code:string,lock=false){demand(pattern.test(code),'Invalid room code',404);const q=await c.query(`SELECT payload,updated_at FROM afc_rooms WHERE code=$1${lock?' FOR UPDATE':''}`,[code]);demand(q.rowCount,'Room not found',404);demand(Date.now()-Date.parse(q.rows[0].updated_at)<24*3600000,'Room has expired',410);return q.rows[0].payload;}
async function saveRoom(c:any,r:any){r.version++;await c.query('UPDATE afc_rooms SET payload=$2::jsonb,updated_at=NOW() WHERE code=$1',[r.code,JSON.stringify(r)]);}
async function usage(c:any){const q=await c.query(`SELECT COUNT(*)::int AS requests,COUNT(*) FILTER (WHERE outcome='ok')::int AS successful,
 COALESCE(SUM(estimated_usd),0)::float8 AS estimated_usd,COALESCE(SUM(input_tokens),0)::int AS input_tokens,COALESCE(SUM(output_tokens),0)::int AS output_tokens FROM afc_usage
 WHERE at>=date_trunc('day',NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`);return q.rows[0]||{requests:0,estimated_usd:0};}
async function present(r:any,role:string,p:any){const c=await db.pool.connect();try{return visible(r,role,p,role==='host'?await usage(c):{requests:0,estimated_usd:0},model(),Boolean(apiKey()));}finally{c.release();}}
async function requestJson(req:Request){const text=await req.text();demand(text.length<=12000,'Request too long',413);if(!text.trim())return {};try{return JSON.parse(text)}catch{throw problem(400,'Invalid JSON body')}}
function verifyOrigin(req:Request){if(req.method==='GET'||req.method==='HEAD')return;const origin=req.headers.get('origin');if(origin)demand(origin===new URL(req.url).origin,'Cross-origin mutations are forbidden',403);}
async function reserve(code:string,bearer:string|null){return transaction(async c=>{
 const r=await getRoom(c,code,true);const who=auth(r,bearer);demand(who.role==='host','Only the host may generate model responses',403);
 demand(r.phase==='baseline'||r.phase==='cascade','No pending AI step');demand(!r.generation_pending,'An AI request is already in flight');demand(!r.ai_attempted_step,'One automatic attempt per step. Use manual fallback on failure.',429);
 const key=apiKey();demand(key,'Configure OPENAI_API_KEY on this site, or use manual mode',503);
 const m=model();demand(m in MODEL_PRICES,'Unsupported or potentially expensive model',422);
 demand(r.generation_calls<MAX_ROOM_CALLS,'Room AI request limit reached',429);
 // Global budget across all rooms, serialized via transaction-level advisory lock.
 await c.query("SELECT pg_advisory_xact_lock(hashtext('af_cascade_daily_usage_budget'))");
 const tally=await usage(c);demand(tally.requests<MAX_DAILY_CALLS,'Daily request count limit reached',429);
 demand(tally.estimated_usd<MAX_DAILY_ESTIMATED_USD,'Local daily spending estimate threshold reached',429);
 const prompt=buildPrompt(r),stepKey=currentStageKey(r);
 r.generation_pending=true;r.pending_at=Date.now();r.ai_attempted_step=true;r.generation_calls++;
 await saveRoom(c,r);
 const row=await c.query("INSERT INTO afc_usage(room,model,outcome) VALUES($1,$2,'attempted') RETURNING id",[code,m]);
 return {room:code,model:m,prompt,stepKey,usageId:row.rows[0].id};
})}
async function finish(a:any,text:string,used:any,success:boolean){return transaction(async c=>{
 const cost=estimateUsd(a.model,used)||0;
 await c.query(`UPDATE afc_usage SET outcome=$2,input_tokens=$3,output_tokens=$4,cached_tokens=$5,estimated_usd=$6 WHERE id=$1`,
 [a.usageId,success?'ok':'error',Number(used.input_tokens||0),Number(used.output_tokens||0),Number(used.input_tokens_details?.cached_tokens||0),cost]);
 const meta={model:a.model,input_tokens:used.input_tokens||null,output_tokens:used.output_tokens||null,estimated_usd:cost};
 const r=await getRoom(c,a.room,true);
 if(currentStageKey(r)!==a.stepKey||!r.generation_pending)return {complete:false,detail:'Round advanced; stale model reply discarded',billing:meta};
 r.generation_pending=false;
 if(!success){await saveRoom(c,r);return {complete:false,detail:'Provider request failed; enter a manual response',billing:meta}}
 try{const reply=parseReply(text);receiveAgentReply(r,reply);await c.query('UPDATE afc_rooms SET payload=$2::jsonb,updated_at=NOW() WHERE code=$1',[r.code,JSON.stringify(r)]);return {complete:true,reply_id:r.timeline.at(-1)?.id,billing:meta};}
 catch(e:any){await saveRoom(c,r);return {complete:false,detail:e?.message||'Response malformed',raw:text.slice(0,1200),billing:meta};}
})}
function randGreeting(){return 'CASCADE / the conversation continues'}
export default async function handler(req:Request,ctx:Context):Promise<Response>{
 try{
 verifyOrigin(req);
 const url=new URL(req.url),path=url.pathname,method=req.method;
 if(method==='GET'&&path==='/api/health')return json({status:'ok',edition:'cascade-v0.2-P',mode:'netlify-db',cards:{Scenario:24,Interference:36,Fault:6},ai_configured:Boolean(apiKey()),message:randGreeting()});
 if(method==='POST'&&path==='/api/rooms'){
 await requestJson(req);
 const result=await transaction(async c=>{await rate(c,ctx,'create-room',10);
 for(let i=0;i<8;i++){const code=randomCode(),key=token();const room=createRoom(code,key);
 const ins=await c.query('INSERT INTO afc_rooms(code,payload) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING RETURNING code',[code,JSON.stringify(room)]);
 if(ins.rowCount)return {code,token:key,role:'host'};}
 throw problem(503,'Could not allocate a room');});return json(result);
 }
 const m=path.match(/^\/api\/rooms\/([A-Z0-9]{6})(?:\/(join|action|generate|check-ai|qr\.png))?$/i);
 if(!m)throw problem(404,'Endpoint not found');const code=m[1].toUpperCase(),op=m[2]||'';
 if(method==='POST'&&op==='join'){
 const body=await requestJson(req),name=String(body.name||'').trim().replace(/\s+/g,' ');
 demand(name.length>=2&&name.length<=24,'Nickname must be 2–24 characters',422);
 return json(await transaction(async c=>{await rate(c,ctx,'join-room',40);const r=await getRoom(c,code,true);demand(r.phase==='lobby','Joining is closed');demand(r.players.filter((p:any)=>p.active).length<8,'Room is full');
 demand(!r.players.some((p:any)=>p.active&&p.name.toLowerCase()===name.toLowerCase()),'Nickname already in use');
 const key=token(),id=randomBytes(8).toString('hex');r.players.push({id,token_hash:digest(key),name,active:true,hand:[],score:0,seat:r.players.length});await saveRoom(c,r);
 return {code,token:key,role:'player',player_id:id};}));
 }
 if(method==='GET'&&op==='qr.png'){
 const c=await db.pool.connect();try{await getRoom(c,code)}finally{c.release()}
 const png=await QRCode.toBuffer(new URL(`/play/${code}`,req.url).toString(),{errorCorrectionLevel:'M',width:320,margin:2});
 return new Response(new Uint8Array(png),{headers:{...noCache,'Content-Type':'image/png'}});
 }
 if(method==='GET'&&op===''){
 const c=await db.pool.connect();let r,who;try{r=await getRoom(c,code);who=auth(r,req.headers.get('authorization'));}finally{c.release()}
 return json(await present(r,who.role,who.p));
 }
 if(method==='POST'&&op==='action'){
 const body=await requestJson(req);demand(typeof body.name==='string'&&body.data&&typeof body.data==='object','Invalid action payload',422);
 const state=await transaction(async c=>{const r=await getRoom(c,code,true),who=auth(r,req.headers.get('authorization'));applyAction(r,who.role,who.p,body.name,body.data);
 await c.query('UPDATE afc_rooms SET payload=$2::jsonb,updated_at=NOW() WHERE code=$1',[code,JSON.stringify(r)]);return {r,who};});
 return json(await present(state.r,state.who.role,state.who.p));
 }
 if(method==='POST'&&op==='check-ai'){
 const c=await db.pool.connect();try{const r=await getRoom(c,code);demand(auth(r,req.headers.get('authorization')).role==='host','Host only',403)}finally{c.release()}
 const key=apiKey();demand(key,'No server-side API key configured',503);const m=model();demand(m in MODEL_PRICES,'Unsupported model',422);
 try{const response=await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(m)}`,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
 demand(response.ok,'Model/API access check failed',502);return json({configured:true,reachable:true,model:m,note:'Model access checked; no inference request made.'});}
 catch{throw problem(502,'API key/model check failed; verify environment settings')}
 }
 if(method==='POST'&&op==='generate'){
 const a=await reserve(code,req.headers.get('authorization'));let content='',used={},success=false;
 try{const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey()}`},body:JSON.stringify({model:a.model,instructions:'Continue the original fictional agent conversation. Honor all earlier context. Write one vivid, concrete and grammatically complete response of about 35–50 words. No labels, no mechanics.',input:a.prompt,max_output_tokens:300,store:false}),signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw Error('Provider request rejected');const data:any=await response.json();used=data.usage||{};content=(data.output||[]).flatMap((b:any)=>b.content||[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text||'').join('');success=true;}
 catch{await finish(a,'',used,false);throw problem(502,'Generation failed. Use a manual reply; provider information is not exposed.')}
 return json(await finish(a,content,used,success));
 }
 throw problem(405,'Method not allowed');
 }catch(error:any){const status=error?.status>=400&&error.status<600?error.status:500;if(status===500)console.error('CASCADE internal error',String(error?.message||'Unknown'));
 return json({detail:status===500?'Server error. See function logs.':error.message},status);
 }
}
export const config:Config={path:'/api/*',rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:60,windowLimit:900}};
