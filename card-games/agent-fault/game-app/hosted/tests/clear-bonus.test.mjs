import test from 'node:test';
import assert from 'node:assert/strict';
import * as classic from '../lib/game.mjs';
import * as cascade from '../../cascade/lib/game.mjs';
import {CLEAR_BONUS_RULE,checkQuotedEvidence,requireHumanReview} from '../lib/clear-bonus.mjs';

const reply='The municipal clerk now requires a mandatory honking permit before residents may request city hall assistance, and this new prerequisite delays the original application.';
const quotes='requires a mandatory honking permit';
const confirmations={newRequirement:true,redirectsTask:true,explicitDecision:true};
const alpha=['A','B','C','D','E','F','G'];
const responseLines=n=>alpha.slice(0,n).map(x=>x+': '+reply).join('\n');
function create(game,humans=1,npcs=3,trial=true){
 const r=game.createRoom('ABC234',game.token()),people=[];
 for(let i=0;i<humans;i++){
  const p={id:'human-'+i,name:'Human '+i,active:true,npc:false,seat:i,
   token_hash:game.digest(game.token()),hand:[],score:0};
  r.players.push(p);people.push(p);
 }
 if(trial)game.applyAction(r,'host',null,'set_bonus_trial',{enabled:true});
 game.applyAction(r,'host',null,'set_npcs',{count:npcs});
 return {r,humans:people};
}
function finishClassicHumanJudge(r,humans){
 const j=r.players.find(p=>p.id===r.judge_id);
 assert.equal(j.npc,false);
 classic.applyAction(r,'player',j,'lock_profile',{profile:'A very excitable imaginary municipal clerk'});
 assert.equal(r.phase,'generate');
 classic.applyAction(r,'host',null,'manual_answers',{text:responseLines(r.players.length-1)});
 classic.applyAction(r,'player',j,'spotlight',{label:'A'});
 classic.applyAction(r,'player',j,'propose_bonus',{bonus:null,claims:{}});
 for(const p of humans)classic.applyAction(r,'player',p,'approve',{yes:true});
 classic.applyAction(r,'host',null,'finalize');
 assert.equal(r.phase,'results');
}
function progressCascade(r,human){
 // One baseline and one response after each card and Handoff.
 if(r.phase==='setup')cascade.applyAction(r,'player',human,'lock_profile',{profile:'A strangely helpful city clerk'});
 assert.equal(r.phase,'baseline');
 cascade.applyAction(r,'host',null,'manual_reply',{text:reply});
 if(r.phase==='lock_cards'){
  for(const p of r.players.filter(p=>!p.npc&&p.id!==r.judge_id)){
   cascade.applyAction(r,'player',p,'lock_card',{card_id:p.hand[0]});
  }
 }
 let n=0;
 while(['cascade','handoff'].includes(r.phase)){
  if(++n>30)assert.fail('Cascade NPC round stopped progressing');
  if(r.phase==='cascade')cascade.applyAction(r,'host',null,'manual_reply',{text:reply});
  else {
   const p=r.players.find(p=>p.id===cascade.handoffOwner(r));
   assert.equal(p.npc,false);
   cascade.applyAction(r,'player',p,'handoff',{message:'Please impose one more ridiculous requirement on this invented municipal procedure.'});
  }
 }
 assert(['judging','referee'].includes(r.phase));
}
test('clear rubric is explicit, requires a real contiguous quote and all human confirmations',()=>{
 assert.equal(CLEAR_BONUS_RULE.criteria.length,3);
 assert(CLEAR_BONUS_RULE.exclusions.length>=3);
 assert.equal(checkQuotedEvidence(reply,quotes),true);
 assert.equal(checkQuotedEvidence(reply,'a fake quote nowhere in the reply'),false);
 assert.equal(checkQuotedEvidence(reply,'now'),false);
 assert.throws(()=>requireHumanReview(reply,quotes,{newRequirement:true,redirectsTask:true}),/affirm all three/);
 assert.throws(()=>requireHumanReview(reply,'invented line that does not exist',confirmations),/Quote the actual response/);
 assert.doesNotThrow(()=>requireHumanReview(reply,quotes,confirmations));
});
test('canonical rules remain default and cannot silently enable experimental tier',()=>{
 for(const g of [classic,cascade]){
  const {r}=create(g,1,3,false);
  assert.equal(r.bonus_rules,'canonical');
  assert.throws(()=>g.applyAction(r,'player',r.players[0],'set_bonus_trial',{enabled:true}),/Only (the )?host/i);
  assert.throws(()=>g.applyAction(r,'host',null,'set_bonus_trial',{enabled:'true'}),/boolean/i);
  g.applyAction(r,'host',null,'start');
  assert.throws(()=>g.applyAction(r,'host',null,'set_bonus_trial',{enabled:true}),/lobby|before the game/);
  assert.equal(r.bonus_rules,'canonical');
 }
 const physical=classic.createRoom('AB1234',classic.token());
 physical.play_mode='physical';
 assert.throws(()=>classic.applyAction(physical,'host',null,'set_bonus_trial',{enabled:true}),/digital cards/);
});
test('Classic: NPC Judge delegates objective Bonus to the human, and NPC votes abstain',()=>{
 const {r,humans}=create(classic);
 assert.equal(r.bonus_rules,'clear-v1');
 classic.applyAction(r,'host',null,'start');
 finishClassicHumanJudge(r,humans);
 classic.applyAction(r,'host',null,'next');
 assert.equal(r.players.find(x=>x.id===r.judge_id).npc,true);
 assert.equal(r.phase,'submit');
 classic.applyAction(r,'player',humans[0],'submit',{card_id:humans[0].hand[0]});
 assert.equal(r.phase,'generate');
 classic.applyAction(r,'host',null,'manual_answers',{text:responseLines(3)});
 assert.equal(r.phase,'referee');
 assert.equal(r.referee_id,humans[0].id);
 assert(classic.visible(r,'player',humans[0]).fault,'Referee sees the revealed secret rule');
 assert.equal(classic.visible(r,'host',null).referee_id,humans[0].id);
 assert.equal(r.spotlight!==null,true,'NPC has already chosen the subjective Spotlight');
 assert.throws(()=>classic.applyAction(r,'player',humans[0],'referee_bonus',{label:'B',evidence:'a made up quote',confirm:confirmations}),/Quote the actual response/);
 assert.throws(()=>classic.applyAction(r,'player',humans[0],'referee_bonus',{label:'B',evidence:quotes,confirm:{newRequirement:true,redirectsTask:false,explicitDecision:true}}),/affirm all three/);
 assert.equal(r.phase,'referee');
 classic.applyAction(r,'player',humans[0],'referee_bonus',{label:'B',evidence:quotes,confirm:confirmations});
 assert.equal(r.phase,'review');
 assert.equal(r.proposal.tier,'Clear Derailment');
 assert.equal(r.proposal.referee_id,humans[0].id);
 assert.deepEqual(r.approvals,{[humans[0].id]:true},'Only actual human endorsement counted');
 const state=classic.visible(r,'host',null);
 assert.equal(state.review_human_only,true);
 assert.equal(state.review_quorum,1);
 assert.equal(state.review_voters,1);
 assert.throws(()=>classic.applyAction(r,'player',r.players.find(x=>x.npc),'approve',{yes:true}),/eligible human/);
 classic.applyAction(r,'host',null,'finalize');
 assert.equal(r.phase,'results');
 assert.equal(r.players.reduce((a,p)=>a+p.score,0),3,'Two Spotlights and exactly one certified optional Bonus');
 assert.equal(r.generation_calls,0);
});
test('Classic: NPC-Judge referee can decline a Bonus and still complete Spotlight',()=>{
 const {r,humans}=create(classic);
 classic.applyAction(r,'host',null,'start');finishClassicHumanJudge(r,humans);
 classic.applyAction(r,'host',null,'next');
 classic.applyAction(r,'player',humans[0],'submit',{card_id:humans[0].hand[0]});
 classic.applyAction(r,'host',null,'manual_answers',{text:responseLines(3)});
 assert.equal(r.phase,'referee');
 classic.applyAction(r,'player',humans[0],'referee_bonus',{label:null});
 classic.applyAction(r,'host',null,'finalize');
 assert.equal(r.phase,'results');
 assert.equal(r.players.reduce((a,p)=>a+p.score,0),2);
});
test('Cascade: NPC Judge waits for human referee; one-human round needs no fake vote or 12-second wait',()=>{
 const {r,humans}=create(cascade);
 cascade.applyAction(r,'host',null,'start');
 progressCascade(r,humans[0]);
 assert.equal(r.phase,'judging');
 cascade.applyAction(r,'player',humans[0],'propose_awards',{spotlight:r.replies[0].id,bonus:null},100);
 cascade.applyAction(r,'host',null,'finalize',{},100);
 cascade.applyAction(r,'host',null,'next');
 assert.equal(r.phase,'baseline');
 assert(r.players.find(x=>x.id===r.judge_id).npc);
 progressCascade(r,humans[0]);
 assert.equal(r.phase,'referee');
 assert.equal(r.referee_id,humans[0].id);
 assert.equal(r.proposal.spotlight!==null,true);
 assert.equal(cascade.visible(r,'player',humans[0]).fault!==null,true);
 assert.equal(cascade.visible(r,'host',null).fault.id,r.fault_id,'Fault is public after Spotlight, including during referee review');
 assert.throws(()=>cascade.applyAction(r,'player',humans[0],'referee_award',{reply_id:r.replies[0].id,evidence:'invented text',confirm:confirmations}),/Quote the actual response/);
 cascade.applyAction(r,'player',humans[0],'referee_award',{reply_id:r.replies[0].id,evidence:quotes,confirm:confirmations},200);
 assert.equal(r.phase,'challenge');
 assert.equal(r.challenge_until,200);
 assert.equal(r.proposal.referee_id,humans[0].id);
 cascade.applyAction(r,'host',null,'finalize',{},200);
 assert.equal(r.phase,'results');
 assert.equal(r.players.reduce((a,p)=>a+p.score,0),3);
 assert.equal(r.generation_calls,0);
});
test('Cascade: unrelated human may challenge experimental bonus; NPCs cannot fabricate semantic votes',()=>{
 const {r,humans}=create(cascade,2,2);
 cascade.applyAction(r,'host',null,'start');
 progressCascade(r,humans[0]);
 assert.equal(r.phase,'judging');
 cascade.applyAction(r,'player',humans[0],'propose_awards',{spotlight:r.replies[0].id,bonus:null},100);
 cascade.applyAction(r,'host',null,'finalize',{},100);
 cascade.applyAction(r,'host',null,'next');
 assert.equal(r.phase,'baseline');
 progressCascade(r,humans[0]);
 assert.equal(r.phase,'referee');
 const referee=humans.find(x=>x.id===r.referee_id);
 const other=humans.find(x=>x.id!==r.referee_id);
 assert(referee&&other);
 cascade.applyAction(r,'player',referee,'referee_award',{reply_id:r.replies[0].id,evidence:quotes,confirm:confirmations},200);
 assert.equal(r.challenge_until,12200);
 assert.throws(()=>cascade.applyAction(r,'player',referee,'challenge',{},300),/Challenge window expired/);
 cascade.applyAction(r,'player',other,'challenge',{},300);
 assert.equal(r.phase,'vote');
 assert.equal(Object.keys(r.votes).length,0,'NPCs abstain, not semantic YES/NO votes');
 assert.throws(()=>cascade.applyAction(r,'player',r.players.find(x=>x.npc),'vote',{yes:true},310),/Voting closed/);
 cascade.applyAction(r,'player',referee,'vote',{yes:true},320);
 cascade.applyAction(r,'player',other,'vote',{yes:false},330);
 cascade.applyAction(r,'host',null,'finalize',{},340);
 assert.equal(r.phase,'results');
 assert.equal(r.players.reduce((a,p)=>a+p.score,0),2,'Split human verdict rejects bonus but retains Spotlight');
});
