import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,applyAction,visible,NPC_PRESETS,handoffOwner,cardOwner,latestAgent} from '../lib/game.mjs';

const fictional='The assistant calmly presents a fictional plan with specific next steps while explaining why the government needs a surprisingly elaborate administrative process today.';
const more='The assistant announces that a new ceremonial committee will examine the unusual problem and issue its findings after a rather dramatic public meeting.';
const sample=i=>i%2?more:fictional;
function setup(humanCount=1,mode='digital'){
 const r=createRoom('ABCDE2','secret-host-token');
 r.play_mode=mode;
 const humans=Array.from({length:humanCount},(_,i)=>({
  id:'human-'+i,name:'Tester '+i,seat:i,active:true,score:0,hand:[],token_hash:'hash'+i
 }));
 r.players.push(...humans);
 return {r,humans};
}
const host=(r,name,data,now)=>applyAction(r,'host',null,name,data,now);
const human=(r,p,name,data,now)=>applyAction(r,'player',p,name,data,now);
test('Cascade NPC seats are separate, host-managed, capped, and unavailable in printed mode',()=>{
 const {r,humans}=setup();
 assert.throws(()=>human(r,humans[0],'set_npcs',{count:3}),/Only the host/);
 assert.throws(()=>host(r,'set_npcs',{count:8}),/0 and 7/);
 assert.throws(()=>host(r,'set_npcs',{count:1.5}),/0 and 7/);
 host(r,'set_npcs',{count:3});
 assert.equal(r.players.length,4);
 assert.deepEqual(r.players.filter(p=>p.npc).map(p=>p.name),NPC_PRESETS.slice(0,3).map(p=>p.name));
 assert.equal(visible(r,'host',null).npc_count,3);
 assert.equal(visible(r,'host',null).human_count,1);
 assert.equal(new Set(r.players.map(p=>p.id)).size,4);
 assert(!visible(r,'host',null).players.some(x=>Object.hasOwn(x,'token_hash')));
 assert(visible(r,'host',null).players.filter(x=>x.is_npc).length===3);
 host(r,'set_npcs',{count:0});assert.equal(r.players.length,1);
 assert.throws(()=>host(r,'start'),/4–8/);
 const physical=setup(1,'physical');
 assert.throws(()=>host(physical.r,'set_npcs',{count:3}),/digital cards/);
 const full=setup(8);
 assert.throws(()=>host(full.r,'set_npcs',{count:1}),/at most 8/);
 const collide=setup();
 collide.humans[0].name=NPC_PRESETS[0].name;
 assert.throws(()=>host(collide.r,'set_npcs',{count:1}),/NPC nickname/);
});
test('solo Cascade runs a full Judge rotation with independent NPC Handoffs and zero NPC model calls',()=>{
 const {r,humans}=setup();
 host(r,'set_npcs',{count:3});
 host(r,'start');
 assert.equal(r.round_limit,4);
 assert.equal(r.judge_id,humans[0].id,'Human should Judge first');
 let npcJudged=0,humanJudged=0,npcHandoffs=0;
 for(let round=1;round<=4;round++){
  const judge=r.players.find(p=>p.id===r.judge_id);
  if(judge.npc)npcJudged++;else humanJudged++;
  const h=humans[0];
  const observer=visible(r,'player',h);
  if(judge.npc)assert.equal(observer.fault,null,'Secret NPC Fault should stay private');
  else assert.equal(observer.fault?.category,'Fault','Human Judge sees private Fault');
  if(r.phase==='setup')human(r,h,'lock_profile',{profile:'A highly nervous fictional city clerk'});
  assert.equal(r.phase,'baseline');
  host(r,'manual_reply',{text:fictional});
  if(r.phase==='lock_cards'&&r.judge_id!==h.id){
   const card=visible(r,'player',h).me.hand[0];
   assert(card);
   human(r,h,'lock_card',{card_id:card.id});
  }
  assert.equal(r.phase,'cascade','NPCs lock cards automatically');
  let steps=0;
  while(r.phase==='cascade'||r.phase==='handoff'){
   if(++steps>20)assert.fail('Cascade progress stalled');
   if(r.phase==='handoff'){
    assert.equal(handoffOwner(r)!==cardOwner(r),true,'Different-player Handoff invariant');
    const owner=r.players.find(p=>p.id===handoffOwner(r));
    assert.equal(owner.npc,false,'NPC Handoffs should advance automatically');
    const quote=latestAgent(r).text.split(' ').slice(0,4).join(' ');
    human(r,h,'handoff',{message:'Please make that particular rule even more absurd and unnecessarily bureaucratic.',hook:quote});
   }else host(r,'manual_reply',{text:sample(steps)});
   if(r.timeline.some(x=>x.kind==='handoff'&&r.players.find(p=>p.id===x.actor_id)?.npc))npcHandoffs++;
  }
  assert(['judging','challenge'].includes(r.phase));
  if(r.phase==='judging'){
   assert.equal(r.judge_id,h.id);
   human(r,h,'propose_awards',{spotlight:r.replies[0].id,bonus:null});
  }else{
   assert.equal(judge.npc,true,'NPC judge should propose scoring automatically');
   assert(r.proposal?.spotlight);
   assert.equal(r.proposal.bonus,null,'NPCs do not invent objective hits');
  }
  assert.equal(r.phase,'challenge');
  host(r,'finalize',{},r.challenge_until+1);
  assert.equal(r.phase,'results');
  assert.equal(r.players.reduce((sum,p)=>sum+p.score,0),round);
  assert.equal(r.generation_calls,0);
  assert.equal(r.replies.length,6,'Three cards and three Handoffs create six responses');
  assert.equal(r.timeline.filter(x=>x.kind==='handoff').length,3);
  assert(r.last_round.turns.every(t=>t.card_owner!==t.handoff_owner));
  if(round<4){
   host(r,'next');
   assert.equal(r.round,round+1);
   assert(['setup','baseline'].includes(r.phase));
  }
 }
 assert(humanJudged>=1&&npcJudged>=1);
 assert(npcHandoffs>0);
 host(r,'next');
 assert.equal(r.phase,'finished');
});
test('NPCs challenge unquoted bonus evidence but do not challenge exact quoted evidence',()=>{
 for(const valid of [false,true]){
  const {r,humans}=setup();
  host(r,'set_npcs',{count:3});host(r,'start');
  human(r,humans[0],'lock_profile',{profile:'A cautious assistant'});
  host(r,'manual_reply',{text:fictional});
  let n=0;
  while(r.phase==='cascade'||r.phase==='handoff'){
   assert(n++<20,'Cascade must progress');
   host(r,'manual_reply',{text:sample(n)});
  }
  assert.equal(r.phase,'judging');
  const reply=r.replies[0].text;
  const evidence=valid?reply.slice(0,24):'invented quote that never appeared';
  human(r,humans[0],'propose_awards',{
   spotlight:r.replies[0].id,
   bonus:{reply_id:r.replies[1].id,tier:'Breakpoint A',evidence}
  });
  // For the valid case, point evidence at the proposed response instead.
  if(valid){
   // First reply and second reply are both from the two valid fixtures.
   // If that reply differs, the NPC challenge is correctly triggered.
   const qualifies=r.replies[1].text.toLowerCase().includes(evidence.toLowerCase());
   assert.equal(r.phase,qualifies?'challenge':'vote');
  }else {
   assert.equal(r.phase,'vote');
   assert(r.challengers.length>=1);
   assert(r.players.filter(x=>x.npc).every(x=>r.votes[x.id]===false));
   human(r,humans[0],'vote',{yes:true});
   host(r,'finalize',{},r.vote_until+1);
   assert.equal(r.players.reduce((sum,p)=>sum+p.score,0),1);
  }
 }
});
