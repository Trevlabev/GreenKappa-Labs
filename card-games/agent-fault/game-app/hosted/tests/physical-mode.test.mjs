import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,applyAction,visible,CARDS} from '../lib/game.mjs';

function room(){
 const r=createRoom('ABC234','host-secret');
 r.play_mode='physical';
 r.players=Array.from({length:4},(_,i)=>({id:'p'+i,name:'Tester '+i,token_hash:'hash'+i,seat:i,active:true,hand:[],score:0}));
 return r;
}
test('Classic physical mode: no virtual hands, real Scenario and private Fault required',()=>{
 const r=room();applyAction(r,'host',null,'start');
 assert.equal(r.phase,'setup');assert.equal(r.scenario_id,null);assert.equal(r.fault_id,null);
 assert(r.players.every(p=>p.hand.length===0));
 const judge=r.players[0];
 assert.throws(()=>applyAction(r,'player',judge,'lock_profile',{profile:'A nervous office assistant'}));
 assert.throws(()=>applyAction(r,'player',judge,'set_scenario',{card_id:'AF-SCN-001'}));
 assert.throws(()=>applyAction(r,'host',null,'set_scenario',{card_id:'AF-INF-001'}));
 applyAction(r,'host',null,'set_scenario',{card_id:'AF-SCN-001'});
 assert.throws(()=>applyAction(r,'host',null,'set_fault',{card_id:'AF-FLT-001'}));
 applyAction(r,'player',judge,'set_fault',{card_id:'AF-FLT-001'});
 assert.equal(visible(r,'host',null).fault,null,'Host must not see unrevealed Fault');
 assert.equal(visible(r,'player',r.players[1]).fault,null,'Non-Judge Fault hidden');
 assert.equal(visible(r,'player',judge).fault?.id,'AF-FLT-001');
 assert.equal(visible(r,'host',null).play_mode,'physical');
 assert.deepEqual(visible(r,'player',judge).me.hand,[]);
 applyAction(r,'player',judge,'lock_profile',{profile:'A nervous office assistant'});
 assert.equal(r.phase,'submit');
});
test('Classic physical mode: accept printed IDs, reject duplicate/invalid IDs, score without virtual deck',()=>{
 const r=room();applyAction(r,'host',null,'start');
 applyAction(r,'host',null,'set_scenario',{card_id:'AF-SCN-001'});
 applyAction(r,'player',r.players[0],'set_fault',{card_id:'AF-FLT-001'});
 applyAction(r,'player',r.players[0],'lock_profile',{profile:'A misinformed deputy'});
 assert.throws(()=>applyAction(r,'player',r.players[1],'submit',{card_id:'AF-FLT-001'}));
 applyAction(r,'player',r.players[1],'submit',{card_id:'AF-INF-001'});
 assert.throws(()=>applyAction(r,'player',r.players[2],'submit',{card_id:'AF-INF-001'}));
 applyAction(r,'player',r.players[2],'submit',{card_id:'AF-INF-002'});
 applyAction(r,'player',r.players[3],'submit',{card_id:'AF-INF-003'});
 assert.equal(r.phase,'generate');
 assert.equal(r.candidates.length,3);
 const label=r.candidates[0].label;
 r.answers=Object.fromEntries(r.candidates.map(x=>[x.label,'Some fictional response text.']));
 r.spotlight=label;r.proposal={bonus:null,tier:null,claims:{}};
 r.approvals=Object.fromEntries(r.players.map(p=>[p.id,true]));
 r.phase='review';r.review_deadline=Date.now()-1;
 applyAction(r,'host',null,'finalize');
 assert.equal(r.phase,'results');assert.equal(r.players.reduce((a,p)=>a+p.score,0),1);
 assert(r.players.every(p=>p.hand.length===0));
 applyAction(r,'host',null,'next');
 assert.equal(r.phase,'setup');assert.equal(r.scenario_id,null);assert.equal(r.fault_id,null);
});
test('Classic digital creation remains the default',()=>{
 const r=createRoom('ABC234','host-secret');
 assert.equal(r.play_mode,'digital');
 assert.equal(CARDS['AF-INF-001'].category,'Interference');
});
