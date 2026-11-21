import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, token, digest, auth, applyAction, visible, NPC_PRESETS } from '../lib/game.mjs';

function room(humans=1,mode='digital'){
 const host=token(),r=createRoom('NPC432',host),people=[];
 r.play_mode=mode;
 for(let i=0;i<humans;i++){
  const secret=token();
  const p={id:'human-'+i,name:'Human '+(i+1),active:true,seat:i,npc:false,
   token_hash:digest(secret),hand:[],score:0};
  r.players.push(p);people.push({p,secret});
 }
 return {r,host,people};
}
const replies='A: The assistant requires official goose permits and an absurd public meeting.\n'
 +'B: It appoints a rotating committee of theatrical ducks to manage the city hall.\n'
 +'C: Everyone must submit a form confirming their status as a respectable citizen.';
function advance(r,people){
 if(r.phase==='setup')applyAction(r,'player',people.find(x=>x.p.id===r.judge_id).p,'lock_profile',{profile:'A very anxious government clerk'});
 if(r.phase==='submit'){
  for(const h of people)if(h.p.id!==r.judge_id&&!(h.p.id in r.submissions))
   applyAction(r,'player',h.p,'submit',{card_id:h.p.hand[0]});
 }
 assert.equal(r.phase,'generate');
 applyAction(r,'host',null,'manual_answers',{text:replies});
 if(r.phase==='spotlight')applyAction(r,'player',people.find(x=>x.p.id===r.judge_id).p,'spotlight',{label:'A'});
 if(r.phase==='adjudicate')applyAction(r,'player',people.find(x=>x.p.id===r.judge_id).p,'propose_bonus',{bonus:null,claims:{}});
 assert.equal(r.phase,'review');
 for(const h of people)applyAction(r,'player',h.p,'approve',{yes:true});
 applyAction(r,'host',null,'finalize');
 assert.equal(r.phase,'results');
}
test('NPC seats are host-managed, bounded, digital-only, and never authenticate as players',()=>{
 const {r,people,host}=room(1);
 assert.throws(()=>applyAction(r,'player',people[0].p,'set_npcs',{count:3}),/Only the host/);
 assert.throws(()=>applyAction(r,'host',null,'set_npcs',{count:8}),/between 0 and 7/);
 assert.throws(()=>applyAction(r,'host',null,'set_npcs',{count:1.5}),/between 0 and 7/);
 applyAction(r,'host',null,'set_npcs',{count:3});
 assert.equal(r.players.length,4);
 assert.equal(r.players.filter(p=>p.npc).length,3);
 assert.deepEqual(r.players.filter(p=>p.npc).map(p=>p.name),NPC_PRESETS.slice(0,3).map(p=>p.name));
 assert.equal(new Set(r.players.map(p=>p.id)).size,4);
 assert.equal(auth(r,'Bearer '+host).role,'host');
 assert.throws(()=>auth(r,'Bearer '+token()),/Invalid session/);
 const publicHost=visible(r,'host',null);
 assert.equal(publicHost.human_count,1);assert.equal(publicHost.npc_count,3);
 assert.deepEqual(publicHost.players.map(p=>p.is_npc),[false,true,true,true]);
 assert(!publicHost.players.some(p=>Object.hasOwn(p,'token_hash')));
 applyAction(r,'host',null,'set_npcs',{count:0});
 assert.equal(r.players.length,1);
 assert.throws(()=>applyAction(r,'host',null,'start'),/4–8/);
 const printed=room(1,'physical');
 assert.throws(()=>applyAction(printed.r,'host',null,'set_npcs',{count:3}),/require digital cards/);
 const crowded=room(8);
 assert.throws(()=>applyAction(crowded.r,'host',null,'set_npcs',{count:1}),/at most 8 total seats/);
});
test('one human plus three NPCs completes every Classic round with no AI costs',()=>{
 const {r,people}=room(1);
 applyAction(r,'host',null,'set_npcs',{count:3});
 applyAction(r,'host',null,'start');
 assert.equal(r.phase,'setup');
 assert.equal(r.judge_id,people[0].p.id,'A real person must Judge first');
 assert.equal(r.round_limit,8);
 assert.equal(visible(r,'player',people[0].p).me.hand.length,4);
 const hidden=visible(r,'player',people[0].p);
 assert(hidden.fault);
 let humanJudgeRounds=0,npcJudgeRounds=0;
 for(let round=1;round<=8;round++){
  const humanIsJudge=r.judge_id===people[0].p.id;
  if(humanIsJudge)humanJudgeRounds++;else npcJudgeRounds++;
  // NPC auto setup / card submissions happen inside actions at the right phases.
  if(humanIsJudge){
   const pre=visible(r,'host',null);
   assert.equal(pre.fault,null);
  }else {
   const state=visible(r,'player',people[0].p);
   assert.equal(state.fault,null,'NPC Judge secret Fault cannot leak');
   assert.equal(state.me.hand.length,4);
  }
  advance(r,people);
  assert.equal(r.players.reduce((sum,p)=>sum+p.score,0),round);
  assert.equal(r.generation_calls,0,'NPC actions do not invoke paid AI');
  assert.equal(r.players.filter(p=>p.active).length,4);
  if(round<8){
   applyAction(r,'host',null,'next');
   assert.equal(r.round,round+1);
   assert(['setup','submit'].includes(r.phase),'NPC Judge should prepare automatically');
  }
 }
 assert(humanJudgeRounds>=1&&npcJudgeRounds>=1);
 applyAction(r,'host',null,'next');
 assert.equal(r.phase,'finished');
});
test('NPC voting requires explicit quoted evidence for a contested bonus',()=>{
 const {r,people}=room(1);
 applyAction(r,'host',null,'set_npcs',{count:3});
 applyAction(r,'host',null,'start');
 applyAction(r,'player',people[0].p,'lock_profile',{profile:'An uncertain assistant'});
 assert.equal(r.phase,'generate');
 applyAction(r,'host',null,'manual_answers',{text:replies});
 applyAction(r,'player',people[0].p,'spotlight',{label:'A'});
 applyAction(r,'player',people[0].p,'propose_bonus',{
   bonus:'A',claims:{A:{breakpoint:true,evidence:'requires official goose permits'}}
 });
 const botVotes=r.players.filter(p=>p.npc).map(p=>r.approvals[p.id]);
 assert.deepEqual(botVotes,[true,true,true]);
 applyAction(r,'player',people[0].p,'approve',{yes:true});
 applyAction(r,'host',null,'finalize');
 assert.equal(r.players.reduce((sum,p)=>sum+p.score,0),2);
 const invalid=room(1);
 applyAction(invalid.r,'host',null,'set_npcs',{count:3});
 applyAction(invalid.r,'host',null,'start');
 applyAction(invalid.r,'player',invalid.people[0].p,'lock_profile',{profile:'A desk assistant'});
 applyAction(invalid.r,'host',null,'manual_answers',{text:replies});
 applyAction(invalid.r,'player',invalid.people[0].p,'spotlight',{label:'A'});
 applyAction(invalid.r,'player',invalid.people[0].p,'propose_bonus',{
  bonus:'A',claims:{A:{breakpoint:true,evidence:'a quote that is nowhere in this response'}}
 });
 assert(invalid.r.players.filter(p=>p.npc).every(p=>invalid.r.approvals[p.id]===false));
 applyAction(invalid.r,'player',invalid.people[0].p,'approve',{yes:true});
 assert.throws(()=>applyAction(invalid.r,'host',null,'finalize'),/strict majority/);
});
