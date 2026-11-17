/** AGENT/FAULT — CASCADE v0.2-P, independent server-authoritative rules engine.
 * Different-player Handoffs; an accumulated conversation; card IDs and exact texts inherited.
 * Pure engine; DB transactions and API credentials are the responsibility of the adapter.
 */
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {SCENES,INF,FAULTS} from './cards.mjs';
export const CARDS=Object.fromEntries([...SCENES,...INF,...FAULTS].map(c=>[c.id,c]));
export const MODEL_PRICES={'gpt-4.1-mini':[0.40,1.60,.10],'gpt-5-mini':[.25,2,.025],'gpt-4o-mini':[.15,.60,.075]};
export const MAX_ROOM_CALLS=144,MAX_DAILY_CALLS=300,MAX_DAILY_ESTIMATED_USD=1.0;
export const problem=(status,message)=>Object.assign(new Error(message),{status});
export const demand=(assertion,message,status=409)=>{if(!assertion)throw problem(status,message)};
export const token=()=>randomBytes(32).toString('base64url');
export const digest=v=>createHash('sha256').update(String(v)).digest('hex');
function safeEq(a,b){return typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
function randomInt(max){const limit=Math.floor(4294967296/max)*max;let n;do{n=randomBytes(4).readUInt32BE()}while(n>=limit);return n%max;}
export function shuffle(input){const v=[...input];for(let i=v.length-1;i>0;i--){let j=randomInt(i+1);[v[i],v[j]]=[v[j],v[i]];}return v;}
export const countWords=s=>String(s||'').trim()?String(s).trim().split(/\s+/u).length:0;
export function createRoom(code,hostToken){return {edition:'cascade-v0.2-P',code,host_hash:digest(hostToken),phase:'lobby',players:[],round:0,round_limit:null,judge_id:null,scenario_id:null,fault_id:null,profile:null,decks:{},discard:{},locked:{},order:[],cursor:0,step:'',timeline:[],replies:[],handoff:null,proposal:null,challenge_until:null,vote_until:null,challengers:[],votes:{},generation_calls:0,generation_pending:false,pending_at:0,ai_attempted_step:false,history:[],last_round:null,version:0};}
export function auth(r,header){const t=String(header||'').replace(/^Bearer\s+/i,'');demand(t.length>=20&&t.length<=200,'Session token required',401);const h=digest(t);if(safeEq(h,r.host_hash))return {role:'host',p:null};const p=r.players.find(x=>safeEq(x.token_hash,h));demand(p,'Invalid session token',401);demand(p.active,'Player removed from room',403);return {role:'player',p};}
function active(r){return r.players.filter(p=>p.active)}
function draw(r,category){let remaining=r.decks[category];demand(Array.isArray(remaining),'Deck not initialized');if(remaining.length===0){demand(r.discard[category]?.length,'Empty '+category+' deck');remaining=r.decks[category]=shuffle(r.discard[category]);r.discard[category]=[];}return remaining.pop();}
export function newRound(r){r.round++;r.phase='setup';r.scenario_id=draw(r,'Scenario');r.fault_id=draw(r,'Fault');r.profile=null;r.locked={};r.order=[];r.cursor=0;r.step='';r.timeline=[];r.replies=[];r.handoff=null;r.proposal=null;r.challengers=[];r.votes={};r.challenge_until=null;r.vote_until=null;r.generation_pending=false;r.pending_at=0;r.ai_attempted_step=false;}
export function handoffOwner(r,index=r.cursor){const n=r.order.length;demand(n>=2,'Turn order missing');return r.order[(index+n-1)%n];}
export function cardOwner(r){return r.order[r.cursor]||null;}
export function currentActor(r){return r.phase==='handoff'?handoffOwner(r):r.phase==='cascade'?(r.step==='card'?cardOwner(r):handoffOwner(r)):null;}
export function currentStageKey(r){return `${r.round}:${r.phase}:${r.cursor}:${r.step||''}`;}
export function latestAgent(r){return [...r.timeline].reverse().find(m=>m.kind==='agent')||null;}
export function parseReply(raw){let s=String(raw||'').trim().replace(/^```(?:text)?\s*|\s*```$/g,'').trim().replace(/^(?:AGENT|ASSISTANT|RESPONSE)\s*[:\-]\s*/i,'').trim();
 demand(s.length<=1000,'AI response is excessively long; correct manually',422);
 demand(countWords(s)>=8&&countWords(s)<=65,'AI response must be 8–65 complete words, not a truncated fragment',422);
 demand(/[.!?][\s"'”’)]*$/u.test(s),'AI response must end with a complete sentence',422);
 return s;
}
function transcript(r){return r.timeline.map((m,i)=>{
  if(m.kind==='agent')return `${i+1}. AGENT${m.id==='B0'?' INITIAL':''}: ${m.text}`;
  if(m.kind==='card')return `${i+1}. INTERFERENCE INSTRUCTION: ${CARDS[m.card_id].instruction}`;
  return `${i+1}. HUMAN HANDOFF${m.hook?` (responding to "${m.hook}")`:''}: ${m.text}`;
 }).join('\n');}
export function buildPrompt(r){demand(r.phase==='baseline'||r.phase==='cascade','Nothing is awaiting generation');
 const scene=CARDS[r.scenario_id];const conversation=transcript(r);
 const common=[
 'You are a fictional AI character participating in an original comedy party game. Respond as the same continuously evolving agent throughout one conversation.',
 'Honor the initial assignment and the distinctive speaking personality, but take later human instructions seriously as part of the ongoing fictional exchange.',
 'Earlier statements and commitments persist. You may revise or disagree with them explicitly; never silently reset the conversation.',
 'Be specific, surprising, in character, and consequential. Make a concrete recommendation or decision rather than only discussing how to respond.',
 'Respond in 35–50 words when practical, maximum 65. Use complete natural sentences. No headings, candidate letters, mechanics, card IDs, or scoring explanations.',
 'The scenario and interventions are fictional; never describe them as real external authority.',
 `ORIGINAL ASSIGNMENT: ${scene.public_assignment}`,
 `REQUIRED BEHAVIOR: ${scene.required_behavior}`,
 `AGENT PERSONALITY: ${r.profile}`,
 'CONVERSATION SO FAR:',conversation||'(No previous messages.)',
 'CONTINUE NOW:'
 ];
 if(r.phase==='baseline')common.push('Begin the conversation by directly completing the assignment in character. Do not introduce an Interference yet.');
 else if(r.step==='card'){const id=r.locked[cardOwner(r)];demand(id&&CARDS[id],'Card not locked');common.push(`NEW INTERFERENCE: ${CARDS[id].instruction}`,'Treat this as the next fictional instruction from a participant and respond to it in the established conversation.');}
 else {const msg=r.handoff;demand(msg,'Handoff not supplied');common.push(`NEW HUMAN HANDOFF${msg.hook?` [HOOK: ${msg.hook}]`:''}: ${msg.text}`,'Respond directly to the Handoff while preserving the established conversation. Do not treat it as a reset.');}
 return common.join('\n');
}
export function receiveAgentReply(r,raw){demand((r.phase==='baseline'||r.phase==='cascade')&&!r.generation_pending,'Not ready for the generated reply');
 const text=parseReply(raw),at=r.phase==='baseline'?'baseline':r.step;
 const actor_id=at==='baseline'?null:currentActor(r);
 const entry={id:at==='baseline'?'B0':'R'+(r.replies.length+1),kind:'agent',trigger:at,text,actor_id,card_id:at==='card'?r.locked[cardOwner(r)]:null};
 if(at==='card')r.timeline.push({kind:'card',card_id:entry.card_id,actor_id});
 r.timeline.push(entry);
 if(at!=='baseline')r.replies.push(entry);
 if(at==='baseline')r.phase='lock_cards';
 else if(at==='card')r.phase='handoff';
 else if(r.cursor+1<r.order.length){r.cursor++;r.step='card';r.phase='cascade';r.handoff=null;}
 else {r.phase='judging';r.handoff=null;}
 r.ai_attempted_step=false;r.pending_at=0;r.generation_pending=false;r.version++;return entry;
}
function finishRound(r,includeBonus){const players=active(r),pr=r.proposal;
 const findReply=id=>r.replies.find(x=>x.id===id);
 demand(pr&&findReply(pr.spotlight),'Scoring proposal missing');
 const spotlightActor=findReply(pr.spotlight).actor_id;
 const spotlightPlayer=r.players.find(x=>x.id===spotlightActor);demand(spotlightPlayer,'Spotlight owner missing');spotlightPlayer.score++;
 const bonusReply=includeBonus&&pr.bonus?findReply(pr.bonus.reply_id):null;
 if(bonusReply){const owner=r.players.find(x=>x.id===bonusReply.actor_id);demand(owner,'Bonus owner missing');owner.score++;}
 for(const id of Object.values(r.locked)){
  const owner=r.players.find(x=>x.hand.includes(id));demand(owner,'Card ownership mismatch');owner.hand.splice(owner.hand.indexOf(id),1);r.discard.Interference.push(id);
 }
 for(const p of players){if(p.id!==r.judge_id)p.hand.push(draw(r,'Interference'));}
 const snap={round:r.round,scenario:CARDS[r.scenario_id].title,spotlight:pr.spotlight,bonus:bonusReply?pr.bonus:null,bonus_disputed:r.challengers.length>0,bonus_approved:!!bonusReply,
 awards:{spotlight:{id:pr.spotlight,player:spotlightPlayer.name},bonus:bonusReply?{id:bonusReply.id,player:r.players.find(p=>p.id===bonusReply.actor_id)?.name}:null},
 turns:r.order.map((id,i)=>({card_owner:r.players.find(p=>p.id===id)?.name,card_id:r.locked[id],handoff_owner:r.players.find(p=>p.id===handoffOwner(r,i))?.name})),
 replies:r.replies.map(e=>({id:e.id,text:e.text,trigger:e.trigger,owner:r.players.find(p=>p.id===e.actor_id)?.name})),
 scores:Object.fromEntries(players.map(p=>[p.name,p.score]))};
 r.last_round=snap;r.history.push(snap);r.phase='results';r.version++;
}
export function visible(r,role,p,usage={requests:0,estimated_usd:0},model='gpt-4.1-mini',aiConfigured=false){const players=active(r),judge=!!p&&p.id===r.judge_id;
 const revealed=['judging','challenge','vote','results','finished'].includes(r.phase);
 const revealOwners=['results','finished'].includes(r.phase);
 const toView=m=>m.kind==='agent'?{id:m.id,kind:'agent',trigger:m.trigger,text:m.text,actor_name:revealOwners?r.players.find(p=>p.id===m.actor_id)?.name||null:null}:
 m.kind==='card'?{kind:'card',card:CARDS[m.card_id],actor_name:revealOwners?r.players.find(p=>p.id===m.actor_id)?.name:null}:
 {kind:'handoff',hook:m.hook||'',text:m.text,actor_name:revealOwners?r.players.find(p=>p.id===m.actor_id)?.name:null};
 const s={edition:'cascade-v0.2-P',code:r.code,version:r.version,phase:r.phase,round:r.round,round_limit:r.round_limit,scenario:CARDS[r.scenario_id]||null,
 players:players.map(x=>({id:x.id,name:x.name,score:x.score,submitted:x.id in r.locked,is_judge:x.id===r.judge_id})),player_count:players.length,judge_id:r.judge_id,
 fault_family:r.fault_id?CARDS[r.fault_id].family:null,fault:r.fault_id&&(judge||revealed)?CARDS[r.fault_id]:null,profile:judge||revealed?r.profile:null,
 locked_count:Object.keys(r.locked).length,expected_count:Math.max(0,players.length-1),current_index:r.cursor+1,steps_total:r.order.length,
 step:r.step,stage_key:currentStageKey(r),generation_pending:r.generation_pending,history:revealed&&r.phase==='finished'?r.history:[],last_round:['results','finished'].includes(r.phase)?r.last_round:null,
 timeline:r.timeline.map(toView),replies:r.replies.map(toView),challenge_until:r.phase==='challenge'?r.challenge_until:null,vote_until:r.phase==='vote'?r.vote_until:null,
 challenge_count:r.challengers.length,challenged_by_me:!!p&&r.challengers.includes(p.id),
 votes_count:Object.keys(r.votes).length,proposal:['challenge','vote','results','finished'].includes(r.phase)?r.proposal:null,
 generation_calls:r.generation_calls,ai_configured:aiConfigured,ai_model:role==='host'?model:null,
 ai_budget:role==='host'?{room_remaining:MAX_ROOM_CALLS-r.generation_calls,daily_remaining:MAX_DAILY_CALLS-usage.requests,daily_estimated_usd:usage.estimated_usd,daily_cap_estimated_usd:MAX_DAILY_ESTIMATED_USD}:null,
 card_counts:Object.fromEntries(['Scenario','Interference','Fault'].map(k=>[k,r.decks[k]?.length??({Scenario:24,Interference:36,Fault:6}[k])])),
 me:p?{role:'player',id:p.id,name:p.name,is_judge:judge,hand:p.hand.map(id=>CARDS[id]),has_locked:p.id in r.locked,can_handoff:r.phase==='handoff'&&p.id===handoffOwner(r),has_voted:p.id in r.votes}:{role:'host'}
 };
 if(r.phase==='cascade')s.current_card=r.step==='card'?CARDS[r.locked[cardOwner(r)]]:null;
 if(r.phase==='handoff')s.handoff_to_me=!!p&&p.id===handoffOwner(r);
 if((r.phase==='baseline'||r.phase==='cascade')&&role==='host')s.generation_prompt=buildPrompt(r);
 if(r.phase==='results'||r.phase==='finished')s.turn_order=r.order.map((id,i)=>({card_owner:r.players.find(p=>p.id===id)?.name,handoff_owner:r.players.find(p=>p.id===handoffOwner(r,i))?.name,card:CARDS[r.locked[id]]}));
 return s;
}
export function applyAction(r,role,p,name,data={},now=Date.now()){
 const d=data||{},players=active(r),host=role==='host',judge=!!p&&p.id===r.judge_id,phase=r.phase;
 switch(name){
 case 'remove_player':{demand(host&&phase==='lobby','Host can remove players only before game');const q=r.players.find(x=>x.id===d.id);demand(q,'Player not found');q.active=false;break;}
 case 'start':{demand(host&&phase==='lobby','Host may start only from lobby');demand(players.length>=4&&players.length<=8,'Cascade requires 4–8 players');r.decks={Scenario:shuffle(SCENES.map(x=>x.id)),Interference:shuffle(INF.map(x=>x.id)),Fault:shuffle(FAULTS.map(x=>x.id))};r.discard={Scenario:[],Interference:[],Fault:[]};for(const q of players){q.hand=Array.from({length:4},()=>draw(r,'Interference'));q.score=0;}r.judge_id=players[0].id;r.round_limit=players.length;newRound(r);break;}
 case 'skip_scenario':{demand(host&&phase==='setup'&&!r.profile,'Can skip only before profile lock');r.discard.Scenario.push(r.scenario_id);r.scenario_id=draw(r,'Scenario');break;}
 case 'lock_profile':{demand(judge&&phase==='setup','Current Judge only');let profile=String(d.profile||'').trim().replace(/\s+/g,' ');demand(countWords(profile)>=1&&countWords(profile)<=20&&profile.length<=220,'Profile must be 1–20 words');r.profile=profile;r.phase='baseline';break;}
 case 'lock_card':{demand(role==='player'&&!judge&&phase==='lock_cards','Only non-Judge players may lock cards');demand(!(p.id in r.locked),'Already locked');const id=String(d.card_id||'');demand(p.hand.includes(id),'Card not in private hand');r.locked[p.id]=id;
 if(Object.keys(r.locked).length===players.length-1){r.order=shuffle(players.filter(q=>q.id!==r.judge_id).map(q=>q.id));r.cursor=0;r.step='card';r.phase='cascade';r.ai_attempted_step=false;}
 break;}
 case 'handoff':{demand(role==='player'&&phase==='handoff'&&p.id===handoffOwner(r),'Only designated recipient may submit the Handoff');let message=String(d.message||'').trim().replace(/\s+/g,' ');demand(countWords(message)>=2&&countWords(message)<=25&&message.length<=240,'Handoff must be 2–25 words');let hook=String(d.hook||'').trim();demand(hook.length<=100,'Hook too long',422);const last=latestAgent(r);demand(last,'Previous AI response missing');if(hook)demand(last.text.toLowerCase().includes(hook.toLowerCase()),'Hook must quote the preceding AI response',422);r.handoff={text:message,hook,actor_id:p.id};r.timeline.push({kind:'handoff',text:message,hook,actor_id:p.id});r.step='handoff';r.phase='cascade';r.ai_attempted_step=false;break;}
 case 'manual_reply':{demand(host&&(phase==='baseline'||phase==='cascade')&&!r.generation_pending,'Host only, while awaiting AI response');receiveAgentReply(r,d.text);return r;}
 case 'recover_stalled':{demand(host&&(phase==='baseline'||phase==='cascade')&&r.generation_pending,'No pending request');demand(now-r.pending_at>=60000,'Wait at least 60 seconds before recovering');r.generation_pending=false;r.ai_attempted_step=true;break;}
 case 'propose_awards':{demand(judge&&phase==='judging','Current Judge only');const replies=new Set(r.replies.map(x=>x.id)),spotlight=String(d.spotlight||'');demand(replies.has(spotlight),'Select one player-generated response for Spotlight',422);let bonus=null;
 if(d.bonus&&d.bonus.reply_id){const id=String(d.bonus.reply_id),tier=String(d.bonus.tier||''),evidence=String(d.bonus.evidence||'').trim().slice(0,220);
 demand(replies.has(id),'Bonus response unknown',422);demand(['Breakpoint A','Breakpoint B','Fault'].includes(tier),'Select a valid qualification tier',422);demand(evidence.length>=3,'Provide supporting evidence for objective Bonus',422);bonus={reply_id:id,tier,evidence};}
 r.proposal={spotlight,bonus};r.challengers=[];r.votes={};r.challenge_until=now+12000;r.vote_until=null;r.phase='challenge';break;}
 case 'challenge':{demand(role==='player'&&!judge&&phase==='challenge'&&now<r.challenge_until,'Challenge window expired or unavailable');demand(r.proposal.bonus,'No Derailment Bonus to challenge');demand(!r.challengers.includes(p.id),'Already challenged');r.challengers.push(p.id);r.vote_until=now+45000;r.phase='vote';break;}
 case 'vote':{demand(role==='player'&&phase==='vote'&&now<r.vote_until,'Voting closed');demand(!(p.id in r.votes),'You already voted');demand(typeof d.yes==='boolean','Vote must be yes or no',422);r.votes[p.id]=d.yes;break;}
 case 'finalize':{demand(host&&(phase==='challenge'||phase==='vote'),'Host can finalize only an award proposal');
 if(phase==='challenge')demand(now>=r.challenge_until,'Wait until the challenge window ends');
 if(phase==='vote')demand(Object.keys(r.votes).length===players.length||now>=r.vote_until,'Waiting for votes; timeout has not elapsed');
 const approved=phase==='challenge'||Object.values(r.votes).filter(Boolean).length>Math.floor(players.length/2);
 finishRound(r,approved);return r;
 }
 case 'next':{demand(host&&phase==='results','Host can advance from results');if(r.round>=r.round_limit)r.phase='finished';else{const i=players.findIndex(x=>x.id===r.judge_id);r.judge_id=players[(i+1)%players.length].id;r.discard.Scenario.push(r.scenario_id);r.discard.Fault.push(r.fault_id);newRound(r);}break;}
 case 'close':{demand(host,'Host only');r.phase='finished';break;}
 default:throw problem(400,'Unknown Cascade action');
 }
 r.version++;return r;
}
export function estimateUsd(model,usage={}){const p=MODEL_PRICES[model];if(!p)return null;const input=Math.max(0,Number(usage.input_tokens||0)),output=Math.max(0,Number(usage.output_tokens||0)),cached=Math.min(input,Math.max(0,Number(usage.input_tokens_details?.cached_tokens||0)));return Math.round(((input-cached)*p[0]+output*p[1]+cached*p[2])/1e6*1e9)/1e9;}
