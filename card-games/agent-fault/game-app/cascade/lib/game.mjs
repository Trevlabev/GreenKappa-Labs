/** AGENT/FAULT — CASCADE v0.2-P, independent server-authoritative rules engine.
 * Different-player Handoffs; an accumulated conversation; card IDs and exact texts inherited.
 * Pure engine; DB transactions and API credentials are the responsibility of the adapter.
 */
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {SCENES,INF,FAULTS} from './cards.mjs';
import {chooseNpcCard,rankNpcReplies,handoffFromReply} from '../../hosted/lib/comedy-quality.mjs';
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

// Digital Cascade NPCs are server-controlled seats, not provider-generated agents.
// Card selection, Handoffs, judging, and challenges incur zero extra model calls.
export const NPC_PRESETS=[
 {name:'CHAOS.EXE',profile:'A reckless emergency coordinator who loves escalating small problems',
  tags:['chaos','emergency','disaster'],handoff:'Treat the last suggestion as an urgent public emergency and escalate the consequences immediately.'},
 {name:'COMPLIANCE BOT',profile:'A literal bureaucrat who insists everything must be official',
  tags:['official','rule','policy'],handoff:'Require a stamped official form for that idea and introduce a mandatory approval procedure.'},
 {name:'DRAMA UNIT',profile:'A theatrical assistant with a flair for personal betrayal',
  tags:['personal','dramatic','feel'],handoff:'Treat this entire decision as a devastating personal betrayal and announce the emotional consequences.'},
 {name:'404 FRIEND NOT FOUND',profile:'A cheerful assistant with astonishingly poor social instincts',
  tags:['mistake','wrong','friend'],handoff:'Misunderstand what was just proposed and enthusiastically recommend a hilariously inappropriate alternative.'},
 {name:'MAYHEM INTERN',profile:'An impulsive intern who sees every mistake as an opportunity',
  tags:['invent','mandatory','unexpected'],handoff:'Turn the oddest detail into an exciting pilot program that nobody asked to approve.'},
 {name:'LITERAL MACHINE',profile:'A relentlessly literal assistant who misses obvious context',
  tags:['literal','exact','insist'],handoff:'Interpret that last statement as literally as possible and explain the resulting strange requirement.'},
 {name:'ERROR PRONE',profile:'An optimistic assistant convinced all terrible ideas are brilliant',
  tags:['worst','celebrate','bad'],handoff:'Praise this as the greatest idea anyone has had and expand its worst consequence.'}
];
function preset(p){return NPC_PRESETS.find(x=>x.name===p.name)||NPC_PRESETS[0];}
function npcCard(r,p){
 return chooseNpcCard(p.hand,CARDS,preset(p),CARDS[r.scenario_id]);
}
function npcHandoff(r,p){
 const latest=latestAgent(r);
 demand(latest,'NPC Handoff cannot proceed without an AI reply');
 return handoffFromReply(latest.text,preset(p));
}
function npcSpotlight(r,p){
 return rankNpcReplies(r.replies,preset(p),CARDS[r.scenario_id],
   r.timeline.filter(x=>x.kind==='agent').at(-2)?.text||'')[0]?.id;
}
function npcEvidenceIsQuoted(r){
 const b=r.proposal?.bonus;
 if(!b)return true;
 const reply=r.replies.find(x=>x.id===b.reply_id)?.text||'';
 const evidence=String(b.evidence||'').trim();
 return evidence.length>=12&&reply.toLowerCase().includes(evidence.toLowerCase());
}
// Runs only as an internal engine action. Do not expose an NPC auth credential.
export function advanceNpcs(r,now=Date.now()){
 if(r.play_mode!=='digital')return;
 for(let attempts=0;attempts<40;attempts++){
  const players=active(r),judge=players.find(p=>p.id===r.judge_id);
  if(r.phase==='setup'&&judge?.npc){
   applyAction(r,'player',judge,'lock_profile',{profile:preset(judge).profile},now,true);continue;
  }
  const bot=r.phase==='lock_cards'?players.find(p=>p.npc&&p.id!==r.judge_id&&!(p.id in r.locked)):null;
  if(bot){applyAction(r,'player',bot,'lock_card',{card_id:npcCard(r,bot)},now,true);continue;}
  const recipient=r.phase==='handoff'?players.find(p=>p.npc&&p.id===handoffOwner(r)):null;
  if(recipient){
   applyAction(r,'player',recipient,'handoff',npcHandoff(r,recipient),now,true);continue;
  }
  if(r.phase==='judging'&&judge?.npc){
   const spotlight=npcSpotlight(r,judge);
   if(!spotlight)return;
   // A deterministic Judge can recognize response variety, not semantic rule failures.
   applyAction(r,'player',judge,'propose_awards',{spotlight,bonus:null},now,true);continue;
  }
  const challenger=r.phase==='challenge'&&r.proposal?.bonus&&!npcEvidenceIsQuoted(r)
    ?players.find(p=>p.npc&&p.id!==r.judge_id&&!r.challengers.includes(p.id)):null;
  if(challenger){applyAction(r,'player',challenger,'challenge',{},now,true);continue;}
  const voter=r.phase==='vote'?players.find(p=>p.npc&&!(p.id in r.votes)):null;
  if(voter){applyAction(r,'player',voter,'vote',{yes:npcEvidenceIsQuoted(r)},now,true);continue;}
  return;
 }
 throw problem(500,'Cascade NPC turn-safety limit exceeded');
}

export function createRoom(code,hostToken){return {edition:'cascade-v0.2-P',code,host_hash:digest(hostToken),phase:'lobby',players:[],round:0,round_limit:null,judge_id:null,scenario_id:null,fault_id:null,profile:null,decks:{},discard:{},locked:{},order:[],cursor:0,step:'',timeline:[],replies:[],handoff:null,handoff_wait_started:null,proposal:null,challenge_until:null,vote_until:null,challengers:[],votes:{},generation_calls:0,generation_pending:false,pending_at:0,ai_attempted_step:false,history:[],last_round:null,version:0,play_mode:'digital'};}
export function auth(r,header){const t=String(header||'').replace(/^Bearer\s+/i,'');demand(t.length>=20&&t.length<=200,'Session token required',401);const h=digest(t);if(safeEq(h,r.host_hash))return {role:'host',p:null};const p=r.players.find(x=>safeEq(x.token_hash,h));demand(p,'Invalid session token',401);demand(p.active,'Player removed from room',403);return {role:'player',p};}
function active(r){return r.players.filter(p=>p.active)}
function draw(r,category){let remaining=r.decks[category];demand(Array.isArray(remaining),'Deck not initialized');if(remaining.length===0){demand(r.discard[category]?.length,'Empty '+category+' deck');remaining=r.decks[category]=shuffle(r.discard[category]);r.discard[category]=[];}return remaining.pop();}
export function newRound(r){r.round++;r.phase='setup';r.scenario_id=r.play_mode==='physical'?null:draw(r,'Scenario');r.fault_id=r.play_mode==='physical'?null:draw(r,'Fault');r.profile=null;r.locked={};r.order=[];r.cursor=0;r.step='';r.timeline=[];r.replies=[];r.handoff=null;r.handoff_wait_started=null;r.proposal=null;r.challengers=[];r.votes={};r.challenge_until=null;r.vote_until=null;r.generation_pending=false;r.pending_at=0;r.ai_attempted_step=false;}
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
  if(m.kind==='skip')return `${i+1}. SYSTEM: A participant's Handoff was skipped after the timeout. No new message or AI reply was added.`;
  return `${i+1}. HUMAN HANDOFF${m.hook?` (responding to "${m.hook}")`:''}: ${m.text}`;
 }).join('\n');}
/** The established prompt remains the default pending blinded A/B human review. */
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
/** Experimental comedy prompt: not used in live generation without a separate approved experiment. */
export function buildExperimentalPrompt(r){demand(r.phase==='baseline'||r.phase==='cascade','Nothing is awaiting generation');
 const scene=CARDS[r.scenario_id];const conversation=transcript(r);
 const common=[
 'You are a fictional AI character participating in an original comedy party game. Respond as the same continuously evolving agent throughout one conversation.',
 'Honor the initial assignment and the distinctive speaking personality, but take later human instructions seriously as part of the ongoing fictional exchange.',
 'Earlier statements and commitments persist. You may revise or disagree with them explicitly; never silently reset the conversation.',
 'Be specific, surprising, in character, and consequential. Make a concrete recommendation or decision rather than only discussing how to respond.',
 'The humor should come from a sincere, increasingly implausible attempt to solve the original assignment. Acknowledge the last concrete detail and make one new consequence follow logically. Avoid generic randomness, repeated punchlines, and self-referential jokes.',
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
 else if(at==='card'){r.phase='handoff';r.handoff_wait_started=Date.now();}
 else if(r.cursor+1<r.order.length){r.cursor++;r.step='card';r.phase='cascade';r.handoff=null;r.handoff_wait_started=null;}
 else {r.phase='judging';r.handoff=null;r.handoff_wait_started=null;}
 r.ai_attempted_step=false;r.pending_at=0;r.generation_pending=false;r.version++;advanceNpcs(r);return entry;
}
function finishRound(r,includeBonus){const players=active(r),pr=r.proposal;
 const findReply=id=>r.replies.find(x=>x.id===id);
 demand(pr&&findReply(pr.spotlight),'Scoring proposal missing');
 const spotlightActor=findReply(pr.spotlight).actor_id;
 const spotlightPlayer=r.players.find(x=>x.id===spotlightActor);demand(spotlightPlayer,'Spotlight owner missing');spotlightPlayer.score++;
 const bonusReply=includeBonus&&pr.bonus?findReply(pr.bonus.reply_id):null;
 if(bonusReply){const owner=r.players.find(x=>x.id===bonusReply.actor_id);demand(owner,'Bonus owner missing');owner.score++;}
 if(r.play_mode!=='physical'){for(const id of Object.values(r.locked)){
  const owner=r.players.find(x=>x.hand.includes(id));demand(owner,'Card ownership mismatch');owner.hand.splice(owner.hand.indexOf(id),1);r.discard.Interference.push(id);
 }
 for(const p of players){if(p.id!==r.judge_id)p.hand.push(draw(r,'Interference'));}}
 const snap={round:r.round,scenario:CARDS[r.scenario_id].title,spotlight:pr.spotlight,bonus:bonusReply?pr.bonus:null,bonus_disputed:r.challengers.length>0,bonus_approved:!!bonusReply,
 awards:{spotlight:{id:pr.spotlight,player:spotlightPlayer.name},bonus:bonusReply?{id:bonusReply.id,player:r.players.find(p=>p.id===bonusReply.actor_id)?.name}:null},
 turns:r.order.map((id,i)=>({card_owner:r.players.find(p=>p.id===id)?.name,card_id:r.locked[id],handoff_owner:r.timeline.some(m=>m.kind==='skip'&&m.skipped_for===handoffOwner(r,i))?'SKIPPED':r.players.find(p=>p.id===handoffOwner(r,i))?.name})),
 replies:r.replies.map(e=>({id:e.id,text:e.text,trigger:e.trigger,owner:r.players.find(p=>p.id===e.actor_id)?.name})),
 scores:Object.fromEntries(players.map(p=>[p.name,p.score]))};
 r.last_round=snap;r.history.push(snap);r.phase='results';r.version++;
}
export function visible(r,role,p,usage={requests:0,estimated_usd:0},model='gpt-4.1-mini',aiConfigured=false){const players=active(r),judge=!!p&&p.id===r.judge_id;
 const revealed=['judging','challenge','vote','results','finished'].includes(r.phase);
 const revealOwners=['results','finished'].includes(r.phase);
 const toView=m=>m.kind==='skip'?{kind:'skip',text:m.text,actor_name:revealOwners?r.players.find(p=>p.id===m.skipped_for)?.name||null:null}:m.kind==='agent'?{id:m.id,kind:'agent',trigger:m.trigger,text:m.text,actor_name:revealOwners?r.players.find(p=>p.id===m.actor_id)?.name||null:null}:
 m.kind==='card'?{kind:'card',card:CARDS[m.card_id],actor_name:revealOwners?r.players.find(p=>p.id===m.actor_id)?.name:null}:
 {kind:'handoff',hook:m.hook||'',text:m.text,actor_name:revealOwners?r.players.find(p=>p.id===m.actor_id)?.name:null};
 const s={edition:'cascade-v0.2-P',code:r.code,version:r.version,play_mode:r.play_mode||'digital',phase:r.phase,round:r.round,round_limit:r.round_limit,scenario:CARDS[r.scenario_id]||null,
 players:players.map(x=>({id:x.id,name:x.name,score:x.score,is_npc:!!x.npc,submitted:x.id in r.locked,is_judge:x.id===r.judge_id})),player_count:players.length,npc_count:players.filter(x=>x.npc).length,human_count:players.filter(x=>!x.npc).length,judge_id:r.judge_id,
 fault_family:r.fault_id?CARDS[r.fault_id].family:null,fault:r.fault_id&&(judge||revealed)?CARDS[r.fault_id]:null,profile:judge||revealed?r.profile:null,
 locked_count:Object.keys(r.locked).length,expected_count:Math.max(0,players.length-1),current_index:r.cursor+1,steps_total:r.order.length,
 step:r.step,stage_key:currentStageKey(r),handoff_skip_at:r.phase==='handoff'&&r.handoff_wait_started?r.handoff_wait_started+90000:null,generation_pending:r.generation_pending,history:revealed&&r.phase==='finished'?r.history:[],last_round:['results','finished'].includes(r.phase)?r.last_round:null,
 timeline:r.timeline.map(toView),replies:r.replies.map(toView),challenge_until:r.phase==='challenge'?r.challenge_until:null,vote_until:r.phase==='vote'?r.vote_until:null,
 challenge_count:r.challengers.length,challenged_by_me:!!p&&r.challengers.includes(p.id),
 votes_count:Object.keys(r.votes).length,proposal:['challenge','vote','results','finished'].includes(r.phase)?r.proposal:null,
 generation_calls:r.generation_calls,ai_configured:aiConfigured,ai_model:role==='host'?model:null,
 ai_budget:role==='host'?{room_remaining:MAX_ROOM_CALLS-r.generation_calls,daily_remaining:MAX_DAILY_CALLS-usage.requests,daily_estimated_usd:usage.estimated_usd,daily_cap_estimated_usd:MAX_DAILY_ESTIMATED_USD}:null,
 card_counts:Object.fromEntries(['Scenario','Interference','Fault'].map(k=>[k,r.decks[k]?.length??({Scenario:24,Interference:36,Fault:6}[k])])),
 me:p?{role:'player',id:p.id,name:p.name,is_judge:judge,hand:r.play_mode==='physical'?[]:p.hand.map(id=>CARDS[id]),has_locked:p.id in r.locked,can_handoff:r.phase==='handoff'&&p.id===handoffOwner(r),has_voted:p.id in r.votes}:{role:'host'}
 };
 if(r.phase==='cascade')s.current_card=r.step==='card'?CARDS[r.locked[cardOwner(r)]]:null;
 if(r.phase==='handoff')s.handoff_to_me=!!p&&p.id===handoffOwner(r);
 if((r.phase==='baseline'||r.phase==='cascade')&&role==='host')s.generation_prompt=buildPrompt(r);
 if(r.phase==='results'||r.phase==='finished')s.turn_order=r.order.map((id,i)=>({card_owner:r.players.find(p=>p.id===id)?.name,handoff_owner:r.timeline.some(m=>m.kind==='skip'&&m.skipped_for===handoffOwner(r,i))?'SKIPPED':r.players.find(p=>p.id===handoffOwner(r,i))?.name,card:CARDS[r.locked[id]]}));
 return s;
}
export function applyAction(r,role,p,name,data={},now=Date.now(),internal=false){
 const d=data||{},players=active(r),host=role==='host',judge=!!p&&p.id===r.judge_id,phase=r.phase;
 switch(name){
 case 'set_npcs':{
  demand(host&&phase==='lobby','Only the host may configure NPCs in the lobby');
  demand(r.play_mode==='digital','NPCs currently require digital cards',422);
  const count=Number(d.count);
  demand(Number.isInteger(count)&&count>=0&&count<=7,'Choose between 0 and 7 NPCs',422);
  const humans=players.filter(q=>!q.npc);
  demand(humans.length+count<=8,'Room has at most 8 total seats',422);
  demand(!NPC_PRESETS.slice(0,count).some(bot=>humans.some(h=>h.name.toLowerCase()===bot.name.toLowerCase())),
   'An existing player has an NPC nickname',409);
  r.players=r.players.filter(q=>!q.npc);
  for(let i=0;i<count;i++){
   const name=NPC_PRESETS[i].name;
   r.players.push({id:'npc-'+token().slice(0,16),token_hash:digest(token()),npc:true,
     name,seat:r.players.length,active:true,hand:[],score:0});
  }
  break;
 }
 case 'remove_player':{demand(host&&phase==='lobby','Host can remove players only before game');const q=r.players.find(x=>x.id===d.id);demand(q,'Player not found');q.active=false;break;}
 case 'start':{demand(host&&phase==='lobby','Host may start only from lobby');demand(players.length>=4&&players.length<=8,'Cascade requires 4–8 players');demand(players.some(p=>!p.npc),'At least one human player required');r.decks={Scenario:r.play_mode==='physical'?[]:shuffle(SCENES.map(x=>x.id)),Interference:r.play_mode==='physical'?[]:shuffle(INF.map(x=>x.id)),Fault:r.play_mode==='physical'?[]:shuffle(FAULTS.map(x=>x.id))};r.discard={Scenario:[],Interference:[],Fault:[]};for(const q of players){q.hand=r.play_mode==='physical'?[]:Array.from({length:4},()=>draw(r,'Interference'));q.score=0;}r.judge_id=players.find(p=>!p.npc).id;r.round_limit=players.length;newRound(r);break;}
 case 'set_scenario':{demand(r.play_mode==='physical'&&host&&phase==='setup'&&!r.profile,'Physical Scenario can be entered only by host');const id=String(d.card_id||'').toUpperCase();demand(CARDS[id]?.category==='Scenario','Enter a valid printed Scenario ID',422);r.scenario_id=id;break;}
 case 'set_fault':{demand(r.play_mode==='physical'&&judge&&phase==='setup'&&!r.profile,'Only the Judge can enter their physical Fault privately');const id=String(d.card_id||'').toUpperCase();demand(CARDS[id]?.category==='Fault','Enter a valid printed Fault ID',422);r.fault_id=id;break;}
 case 'skip_scenario':{demand(host&&phase==='setup'&&!r.profile,'Can skip only before profile lock');if(r.play_mode==='physical')r.scenario_id=null;else{r.discard.Scenario.push(r.scenario_id);r.scenario_id=draw(r,'Scenario');}break;}
 case 'lock_profile':{demand(judge&&phase==='setup','Current Judge only');demand(r.scenario_id&&r.fault_id,'Enter printed Scenario and private Fault first');let profile=String(d.profile||'').trim().replace(/\s+/g,' ');demand(countWords(profile)>=1&&countWords(profile)<=20&&profile.length<=220,'Profile must be 1–20 words');r.profile=profile;r.phase='baseline';break;}
 case 'lock_card':{demand(role==='player'&&!judge&&phase==='lock_cards','Only non-Judge players may lock cards');demand(!(p.id in r.locked),'Already locked');const id=String(d.card_id||'').toUpperCase();demand(r.play_mode==='physical'?CARDS[id]?.category==='Interference':p.hand.includes(id),r.play_mode==='physical'?'Enter a valid physical Interference ID':'Card not in private hand',422);demand(r.play_mode!=='physical'||!Object.values(r.locked).includes(id),'This physical Interference has already been locked',409);r.locked[p.id]=id;
 if(Object.keys(r.locked).length===players.length-1){r.order=shuffle(players.filter(q=>q.id!==r.judge_id).map(q=>q.id));r.cursor=0;r.step='card';r.phase='cascade';r.ai_attempted_step=false;}
 break;}
 case 'handoff':{demand(role==='player'&&phase==='handoff'&&p.id===handoffOwner(r),'Only designated recipient may submit the Handoff');let message=String(d.message||'').trim().replace(/\s+/g,' ');demand(countWords(message)>=2&&countWords(message)<=25&&message.length<=240,'Handoff must be 2–25 words');let hook=String(d.hook||'').trim();demand(hook.length<=100,'Hook too long',422);const last=latestAgent(r);demand(last,'Previous AI response missing');if(hook)demand(last.text.toLowerCase().includes(hook.toLowerCase()),'Hook must quote the preceding AI response',422);r.handoff_wait_started=null;r.handoff={text:message,hook,actor_id:p.id};r.timeline.push({kind:'handoff',text:message,hook,actor_id:p.id});r.step='handoff';r.phase='cascade';r.ai_attempted_step=false;break;}
 case 'skip_handoff':{demand(host&&phase==='handoff','Only host may skip a waiting Handoff');demand(Number.isFinite(r.handoff_wait_started)&&now>=r.handoff_wait_started+90000,'Handoff skip becomes available after 90 seconds');const skippedFor=handoffOwner(r);r.timeline.push({kind:'skip',text:'Handoff skipped by host after 90-second timeout; no AI reply was generated.',skipped_for:skippedFor});r.handoff_wait_started=null;r.handoff=null;r.ai_attempted_step=false;if(r.cursor+1<r.order.length){r.cursor++;r.step='card';r.phase='cascade';}else r.phase='judging';break;}
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
 case 'next':{demand(host&&phase==='results','Host can advance from results');if(r.round>=r.round_limit)r.phase='finished';else{const i=players.findIndex(x=>x.id===r.judge_id);r.judge_id=players[(i+1)%players.length].id;if(r.play_mode!=='physical'){r.discard.Scenario.push(r.scenario_id);r.discard.Fault.push(r.fault_id);}newRound(r);}break;}
 case 'close':{demand(host,'Host only');r.phase='finished';break;}
 default:throw problem(400,'Unknown Cascade action');
 }
 if(!internal&&r.play_mode==='digital')advanceNpcs(r,now);
 r.version++;return r;
}
export function estimateUsd(model,usage={}){const p=MODEL_PRICES[model];if(!p)return null;const input=Math.max(0,Number(usage.input_tokens||0)),output=Math.max(0,Number(usage.output_tokens||0)),cached=Math.min(input,Math.max(0,Number(usage.input_tokens_details?.cached_tokens||0)));return Math.round(((input-cached)*p[0]+output*p[1]+cached*p[2])/1e6*1e9)/1e9;}
