import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,applyAction,visible,CARDS} from '../lib/game.mjs';

function room(){
 const r=createRoom('ABC234','host-secret');
 r.play_mode='physical';
 r.players=Array.from({length:4},(_,i)=>({id:'p'+i,name:'Tester '+i,token_hash:'hash'+i,seat:i,active:true,hand:[],score:0}));
 return r;
}
test('Cascade physical mode: no virtual dealing; private physical setup and unchanged baseline',()=>{
 const r=room();applyAction(r,'host',null,'start');
 assert.equal(r.phase,'setup');assert.equal(r.scenario_id,null);assert.equal(r.fault_id,null);
 assert(r.players.every(p=>p.hand.length===0));
 assert.throws(()=>applyAction(r,'player',r.players[0],'lock_profile',{profile:'Careful librarian'}));
 applyAction(r,'host',null,'set_scenario',{card_id:'AF-SCN-002'});
 applyAction(r,'player',r.players[0],'set_fault',{card_id:'AF-FLT-002'});
 assert.equal(visible(r,'host',null).fault,null);
 assert.equal(visible(r,'player',r.players[1]).fault,null);
 assert.equal(visible(r,'player',r.players[0]).fault?.id,'AF-FLT-002');
 assert.equal(visible(r,'player',r.players[1]).me.hand.length,0);
 applyAction(r,'player',r.players[0],'lock_profile',{profile:'Careful librarian'});
 assert.equal(r.phase,'baseline');
 applyAction(r,'host',null,'manual_reply',{text:'The assistant suggests a careful and official plan while explaining each step clearly to the people involved in this fictional situation.'});
 assert.equal(r.phase,'lock_cards');
});
test('Cascade printed cards still create a valid randomized turn chain and score without virtual hands',()=>{
 const r=room();applyAction(r,'host',null,'start');
 applyAction(r,'host',null,'set_scenario',{card_id:'AF-SCN-002'});
 applyAction(r,'player',r.players[0],'set_fault',{card_id:'AF-FLT-002'});
 applyAction(r,'player',r.players[0],'lock_profile',{profile:'Careful librarian'});
 applyAction(r,'host',null,'manual_reply',{text:'The assistant suggests a careful and official plan while explaining each step clearly to the people involved in this fictional situation.'});
 assert.throws(()=>applyAction(r,'player',r.players[1],'lock_card',{card_id:'AF-SCN-001'}));
 applyAction(r,'player',r.players[1],'lock_card',{card_id:'AF-INF-001'});
 assert.throws(()=>applyAction(r,'player',r.players[2],'lock_card',{card_id:'AF-INF-001'}));
 applyAction(r,'player',r.players[2],'lock_card',{card_id:'AF-INF-002'});
 applyAction(r,'player',r.players[3],'lock_card',{card_id:'AF-INF-003'});
 assert.equal(r.phase,'cascade');assert.equal(r.order.length,3);
 r.replies=[{id:'R1',actor_id:r.order[0],trigger:'card',text:'A test response'}];
 r.proposal={spotlight:'R1',bonus:null};r.phase='challenge';r.challenge_until=Date.now()-1;
 applyAction(r,'host',null,'finalize');
 assert.equal(r.phase,'results');assert.equal(r.players.reduce((a,p)=>a+p.score,0),1);
 assert(r.players.every(p=>p.hand.length===0));
 applyAction(r,'host',null,'next');
 assert.equal(r.phase,'setup');assert.equal(r.scenario_id,null);assert.equal(r.fault_id,null);
});
test('Cascade digital creation remains the default',()=>{
 const r=createRoom('ABC234','host-secret');
 assert.equal(r.play_mode,'digital');assert.equal(CARDS['AF-INF-001'].category,'Interference');
});
