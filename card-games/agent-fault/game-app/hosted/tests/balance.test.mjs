/**
 * Invariant tests across ALL supported table sizes, no model calls.
 * Zero-bonus scoring, deterministic host/players, every Judge rotation.
 * Distinguish fair access to turns from human amusement and strategic balance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as classic from '../lib/game.mjs';
import * as cascade from '../../cascade/lib/game.mjs';

const stub='The fictional assistant requires residents to submit an elaborate stamped civic form before the emergency meeting can officially begin.';
const labeled=n=>Array.from({length:n},(_,i)=>String.fromCharCode(65+i)+': '+stub).join('\n');
function roster(game,n){
 const r=game.createRoom('BAL234',game.token());
 for(let i=0;i<n;i++)r.players.push({
  id:'human-'+i,name:'Player '+i,active:true,npc:false,seat:i,
  token_hash:game.digest(game.token()),hand:[],score:0
 });
 return r;
}
function availableHands(r){
 const hands=r.players.flatMap(p=>p.hand);
 assert(r.players.every(p=>p.hand.length===4),'Each seat keeps four private cards');
 assert.equal(new Set(hands).size,hands.length,'No duplicate cards in active hands');
}
function tally(r){
 return r.players.reduce((sum,p)=>sum+p.score,0);
}
for(let n=4;n<=8;n++){
 test('Classic '+n+' human seats: scoring, card conservation, Judge rotation',()=>{
  const r=roster(classic,n);
  classic.applyAction(r,'host',null,'start');
  const totalRounds=n===4?8:n,judges=[];
  assert.equal(r.round_limit,totalRounds);
  availableHands(r);
  for(let round=1;round<=totalRounds;round++){
   assert.equal(r.round,round);
   const judge=r.players.find(p=>p.id===r.judge_id);
   assert(judge);
   judges.push(judge.id);
   const stranger=r.players.find(p=>p.id!==judge.id);
   assert.equal(classic.visible(r,'host',null).fault,null);
   assert.equal(classic.visible(r,'player',stranger).fault,null);
   assert(classic.visible(r,'player',judge).fault);
   classic.applyAction(r,'player',judge,'lock_profile',{profile:'A well-meaning municipal assistant'});
   for(const p of r.players){
    if(p.id===judge.id)continue;
    classic.applyAction(r,'player',p,'submit',{card_id:p.hand[0]});
   }
   assert.equal(r.candidates.length,n-1);
   assert.equal(new Set(r.candidates.map(c=>c.player_id)).size,n-1);
   classic.applyAction(r,'host',null,'manual_answers',{text:labeled(n-1)});
   assert.equal(r.phase,'spotlight');
   classic.applyAction(r,'player',judge,'spotlight',{label:'A'});
   classic.applyAction(r,'player',judge,'propose_bonus',{bonus:null,claims:{}});
   for(const p of r.players) classic.applyAction(r,'player',p,'approve',{yes:true});
   classic.applyAction(r,'host',null,'finalize');
   assert.equal(r.phase,'results');
   assert.equal(tally(r),round,'No unexplained points when Bonus is absent');
   availableHands(r);
   assert.equal(r.generation_calls,0,'No model calls in balance test');
   classic.applyAction(r,'host',null,'next');
  }
  assert.equal(r.phase,'finished');
  for(const p of r.players) assert.equal(judges.filter(id=>id===p.id).length,totalRounds/n);
 });
 test('Cascade '+n+' human seats: equal two-reply exposure and zero-bonus fast path',()=>{
  const r=roster(cascade,n);
  cascade.applyAction(r,'host',null,'start');
  assert.equal(r.round_limit,n);
  const judged=[],exposure=new Map(r.players.map(p=>[p.id,0]));
  for(let round=1;round<=n;round++){
   assert.equal(r.round,round);
   const judge=r.players.find(p=>p.id===r.judge_id);
   judged.push(judge.id);
   assert(cascade.visible(r,'player',judge).fault);
   assert.equal(cascade.visible(r,'host',null).fault,null);
   const other=r.players.find(p=>p.id!==judge.id);
   assert.equal(cascade.visible(r,'player',other).fault,null);
   cascade.applyAction(r,'player',judge,'lock_profile',{profile:'An overconfident municipal assistant'});
   cascade.receiveAgentReply(r,stub);
   assert.equal(r.phase,'lock_cards');
   for(const p of r.players){
    if(p.id===judge.id)continue;
    cascade.applyAction(r,'player',p,'lock_card',{card_id:p.hand[0]});
   }
   assert.equal(r.order.length,n-1);
   let calls=0;
   while(r.phase==='cascade'||r.phase==='handoff'){
    if(++calls>2*(n-1)*3)assert.fail('Cascade could not advance');
    if(r.phase==='handoff'){
     const handoffId=cascade.handoffOwner(r);
     assert.notEqual(handoffId,cascade.cardOwner(r));
     const p=r.players.find(p=>p.id===handoffId);
     cascade.applyAction(r,'player',p,'handoff',{message:'Please explain why that extra regulation is mandatory.'});
    }else cascade.receiveAgentReply(r,stub);
   }
   assert.equal(r.phase,'judging');
   assert.equal(r.replies.length,2*(n-1),'Every non-Judge gets a card and Handoff response');
   const credits=new Map();
   for(const reply of r.replies)credits.set(reply.actor_id,(credits.get(reply.actor_id)||0)+1);
   assert.equal(credits.size,n-1);
   for(const p of r.players){
    if(p.id===judge.id)assert.equal(credits.get(p.id),undefined);
    else {assert.equal(credits.get(p.id),2);exposure.set(p.id,exposure.get(p.id)+2);}
   }
   const timestamp=5_000_000+round*100_000;
   cascade.applyAction(r,'player',judge,'propose_awards',{spotlight:r.replies[0].id,bonus:null},timestamp);
   assert.equal(r.challenge_until,timestamp,'No Bonus means there is nothing to challenge');
   cascade.applyAction(r,'host',null,'finalize',{},timestamp+1);
   assert.equal(r.phase,'results');
   assert.equal(tally(r),round);
   assert.equal(r.timeline.filter(x=>x.kind==='handoff').length,n-1);
   assert.equal(r.generation_calls,0);
   availableHands(r);
   cascade.applyAction(r,'host',null,'next');
  }
  assert.equal(r.phase,'finished');
  for(const p of r.players){
   assert.equal(judged.filter(id=>id===p.id).length,1,'Judge rotation is exactly even');
   assert.equal(exposure.get(p.id),2*(n-1),'Each player has equal Spotlight opportunities');
  }
 });
}
test('Cascade 12-second challenge remains unchanged when a Bonus actually exists',()=>{
 const r=roster(cascade,4);
 cascade.applyAction(r,'host',null,'start');
 const judge=r.players[0];
 cascade.applyAction(r,'player',judge,'lock_profile',{profile:'A cheerful clerk'});
 cascade.receiveAgentReply(r,stub);
 for(const p of r.players.slice(1))cascade.applyAction(r,'player',p,'lock_card',{card_id:p.hand[0]});
 while(r.phase==='cascade'||r.phase==='handoff'){
  if(r.phase==='handoff')cascade.applyAction(r,'player',r.players.find(x=>x.id===cascade.handoffOwner(r)),'handoff',{message:'Please insist this public service has another required form.'});
  else cascade.receiveAgentReply(r,stub);
 }
 const start=10000;
 cascade.applyAction(r,'player',judge,'propose_awards',{spotlight:r.replies[0].id,bonus:{reply_id:r.replies[1].id,tier:'Breakpoint A',evidence:'requires residents to submit'}},start);
 assert.equal(r.challenge_until,start+12000);
 assert.throws(()=>cascade.applyAction(r,'host',null,'finalize',{},start+11999),/challenge window/);
 cascade.applyAction(r,'host',null,'finalize',{},start+12000);
 assert.equal(tally(r),2,'No change to Spotlight + optional Bonus');
});
