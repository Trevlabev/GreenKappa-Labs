import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENES,INF,FAULTS} from '../lib/cards.mjs';
import {CARDS,MODEL_PRICES,token,digest,auth,createRoom,applyAction,visible,buildPrompt,receiveAgentReply,parseReply,estimateUsd,handoffOwner,cardOwner,latestAgent} from '../lib/game.mjs';

const sample='The agency now recommends a concrete fictional decision and gives residents an immediate next step, while maintaining the previous unusual premise.';
function setup(n=4){const key=token(),r=createRoom('ABC234',key),actors=[];for(let i=0;i<n;i++){let secret=token(),p={id:'id-'+i,name:'Player '+i,token_hash:digest(secret),active:true,hand:[],score:0,seat:i};r.players.push(p);actors.push({p,secret});}return {r,key,actors};}
function take(r,p,name,data={},now=Date.now()){return applyAction(r,p?'player':'host',p,name,data,now)}
function baseline(r){take(r,r.players[0],'lock_profile',{profile:'A gleefully confused municipal administrator'});assert.equal(r.phase,'baseline');const prompt=buildPrompt(r);assert(prompt.includes(CARDS[r.scenario_id].public_assignment));assert(!prompt.includes(CARDS[r.fault_id].condition));receiveAgentReply(r,sample);assert.equal(r.phase,'lock_cards');}
function cards(r,actors){for(const {p} of actors.slice(1))take(r,p,'lock_card',{card_id:p.hand[0]});assert.equal(r.phase,'cascade');assert.equal(r.step,'card');}
function finishCascade(r,actors){let ownerIds=[],handoffIds=[];while(r.phase==='cascade'||r.phase==='handoff'){
 if(r.phase==='cascade'&&r.step==='card'){
  ownerIds.push(cardOwner(r));const before=r.replies.length;assert(buildPrompt(r).includes('NEW INTERFERENCE:'));receiveAgentReply(r,sample);assert.equal(r.replies.length,before+1);assert.equal(r.phase,'handoff');
 } else if(r.phase==='handoff'){
  let id=handoffOwner(r);handoffIds.push(id);assert.notEqual(id,cardOwner(r));
  let p=actors.find(a=>a.p.id===id).p;const prev=latestAgent(r).text;
  take(r,p,'handoff',{message:'Could you explain how that conclusion becomes official?',hook:'agency'});
  assert.equal(r.phase,'cascade');assert.equal(r.step,'handoff');assert(buildPrompt(r).includes('Could you explain'));
  assert(buildPrompt(r).includes(prev));receiveAgentReply(r,sample);
 }}
 assert.equal(r.phase,'judging');assert.equal(r.replies.length,2*(actors.length-1));assert.equal(new Set(ownerIds).size,actors.length-1);assert.equal(new Set(handoffIds).size,actors.length-1);assert.deepEqual([...new Set(ownerIds)].sort(),[...new Set(handoffIds)].sort());
 return {ownerIds,handoffIds};}
function award(r,actors,mode='none',now=1_000_000){const judge=actors[0].p;
 take(r,judge,'propose_awards',{spotlight:'R1',bonus:mode==='none'?null:{reply_id:'R2',tier:'Breakpoint A',evidence:'The agency now recommends an official act'}},now);
 assert.equal(r.phase,'challenge');
 if(mode==='challenge-approve'||mode==='challenge-reject'){
  take(r,actors[1].p,'challenge',{},now+200);assert.equal(r.phase,'vote');
  actors.forEach(({p},i)=>take(r,p,'vote',{yes:mode==='challenge-approve'?i<3:i===0},now+300+i));
  take(r,null,'finalize',{},now+400);
 }else take(r,null,'finalize',{},now+12001);
 assert.equal(r.phase,'results');}

test('original artwork-compatible deck exactly 24 + 36 + 6 unique IDs',()=>{
 assert.equal(SCENES.length,24);assert.equal(INF.length,36);assert.equal(FAULTS.length,6);
 assert.equal(Object.keys(CARDS).length,66);assert.equal(new Set(Object.keys(CARDS)).size,66);
});

test('one continuous conversation, circular different-player Handoffs and private card ownership',()=>{
 const {r,key,actors}=setup();assert.equal(auth(r,'Bearer '+key).role,'host');assert.equal(auth(r,'Bearer '+actors[2].secret).p,actors[2].p);
 assert.throws(()=>auth(r,'Bearer malformed'),/Session token required/);
 take(r,null,'start');assert.equal(r.round_limit,4);assert.equal(r.round,1);assert.equal(actors[0].p.hand.length,4);
 let host=visible(r,'host',null);assert.equal(host.fault,null);assert.equal(host.scenario.id,r.scenario_id);
 let spectator=visible(r,'player',actors[2].p);assert.equal(spectator.fault,null);assert.equal(spectator.profile,null);
 assert.throws(()=>take(r,actors[2].p,'lock_profile',{profile:'someone'}),/Current Judge/);
 baseline(r);cards(r,actors);
 assert.equal(visible(r,'host',null).timeline.length,1);
 assert.equal(visible(r,'player',actors[3].p).me.hand.length,4);
 assert.equal(visible(r,'player',actors[3].p).fault,null);
 assert.throws(()=>take(r,actors[2].p,'lock_card',{card_id:actors[2].p.hand[1]}),/Only non-Judge/);
 let {ownerIds,handoffIds}=finishCascade(r,actors);
 for(let i=0;i<ownerIds.length;i++)assert.notEqual(ownerIds[i],handoffIds[i]);
 assert.equal(r.timeline.filter(x=>x.kind==='agent').length,7);
 assert.equal(r.timeline.filter(x=>x.kind==='card').length,3);
 assert.equal(r.timeline.filter(x=>x.kind==='handoff').length,3);
 assert(!buildableBaselineOutside(r));
 assert.equal(visible(r,'player',actors[2].p).fault.id,r.fault_id);
 assert(!visible(r,'host',null).timeline.some(x=>x.actor_name)); // identities remain hidden during Judge's selection
 award(r,actors,'none');assert.equal(r.players.reduce((a,x)=>a+x.score,0),1);
 let snap=visible(r,'host',null).last_round;assert.equal(snap.replies.length,6);assert.equal(snap.turns.length,3);
 for(const {p} of actors)assert.equal(p.hand.length,4);
 take(r,null,'next');assert.equal(r.round,2);assert.equal(r.judge_id,actors[1].p.id);
});
function buildableBaselineOutside(r){try{buildPrompt(r);return true}catch{return false;}}

test('independent attribution: next player gets previous card as Handoff and wins its own reply',()=>{
 const {r,actors}=setup();take(r,null,'start');baseline(r);cards(r,actors);finishCascade(r,actors);
 const x=r.replies[0],y=r.replies[1];assert.equal(x.trigger,'card');assert.equal(y.trigger,'handoff');assert.notEqual(x.actor_id,y.actor_id);
 take(r,actors[0].p,'propose_awards',{spotlight:y.id,bonus:{reply_id:x.id,tier:'Fault',evidence:'The assistant invents an established approval'}},5000);
 take(r,actors[1].p,'challenge',{},5200);
 for(let i=0;i<4;i++)take(r,actors[i].p,'vote',{yes:i<3},5500+i);
 take(r,null,'finalize',{},6000);
 const first=r.players.find(p=>p.id===y.actor_id),other=r.players.find(p=>p.id===x.actor_id);
 assert.equal(first.score,1);assert.equal(other.score,1);assert.equal(r.last_round.bonus_approved,true);
});

test('challenged rejected Bonus is dropped, Spotlight remains, majority strict',()=>{
 const {r,actors}=setup();take(r,null,'start');baseline(r);cards(r,actors);finishCascade(r,actors);
 take(r,actors[0].p,'propose_awards',{spotlight:'R1',bonus:{reply_id:'R2',tier:'Breakpoint B',evidence:'The required behavior was abandoned'}},10000);
 assert.throws(()=>take(r,null,'finalize',{},11000),/Wait until/);
 take(r,actors[3].p,'challenge',{},10100);
 for(let i=0;i<4;i++)take(r,actors[i].p,'vote',{yes:i<2},10200+i);
 take(r,null,'finalize',{},10500);
 assert.equal(r.players.reduce((a,p)=>a+p.score,0),1);assert.equal(r.last_round.bonus_approved,false);
});

test('no player can follow up on their own card, no duplicate locks, hook must quote preceding reply',()=>{
 const {r,actors}=setup(5);take(r,null,'start');baseline(r);cards(r,actors);
 let owner=r.players.find(p=>p.id===cardOwner(r));let eligible=r.players.find(p=>p.id===handoffOwner(r));
 receiveAgentReply(r,sample);
 assert.throws(()=>take(r,owner,'handoff',{message:'Can we do the next thing now?'}),/designated/);
 assert.throws(()=>take(r,eligible,'handoff',{message:'Please respond directly to this',hook:'not in response'}),/Hook must quote/);
 take(r,eligible,'handoff',{message:'Please respond directly to this',hook:'concrete fictional decision'});
 assert.equal(r.handoff.actor_id,eligible.id);
});

test('no raw truncation of malformed model responses; complete sentences pass',()=>{
 assert.throws(()=>parseReply('x '.repeat(100)+'x.'),/8–65/);
 assert.throws(()=>parseReply('The response will simply end in the middle of'),/complete sentence/);
 assert.equal(parseReply('The agent will comply immediately and will issue all appropriate fictional instructions.'),'The agent will comply immediately and will issue all appropriate fictional instructions.');
});

test('8-player distribution, unique hands, all 7 different Handoffs and 15 agent messages per round',()=>{
 const {r,actors}=setup(8);take(r,null,'start');const cards=actors.flatMap(a=>a.p.hand);assert.equal(cards.length,32);assert.equal(new Set(cards).size,32);
 assert.equal(r.decks.Interference.length,4);baseline(r);cardsLock();
 function cardsLock(){for(const {p} of actors.slice(1))take(r,p,'lock_card',{card_id:p.hand[0]});}
 const result=finishCascade(r,actors);assert.equal(result.handoffIds.length,7);
 assert.equal(r.timeline.filter(x=>x.kind==='agent').length,15);
 award(r,actors,'none');for(const {p} of actors)assert.equal(p.hand.length,4);
});

test('timer-controlled challenge, no-bonus default, reconnection and one-judge rotation',()=>{
 const {r,actors}=setup(4);take(r,null,'start');baseline(r);cards(r,actors);finishCascade(r,actors);
 take(r,actors[0].p,'propose_awards',{spotlight:'R1',bonus:null},20000);
 assert.throws(()=>take(r,actors[1].p,'challenge',{},20100),/No Derailment Bonus/);
 assert.throws(()=>take(r,null,'finalize',{},22000),/Wait until/);
 take(r,null,'finalize',{},32000);assert.equal(r.last_round.bonus,null);
 assert.equal(visible(r,'player',actors[1].p).last_round.awards.spotlight.id,'R1');
});

test('generation cost model identical to official rates, but estimates not invoices',()=>{
 assert.equal(estimateUsd('gpt-4.1-mini',{input_tokens:599,output_tokens:277}),.0006828);
 assert.equal(estimateUsd('gpt-4.1-mini',{input_tokens:800,output_tokens:200,input_tokens_details:{cached_tokens:80}}),.000616);
 assert.equal(estimateUsd('unknown',{input_tokens:1000,output_tokens:100}),null);
});


test('host can recover from an unresponsive Handoff only after 90 seconds, without fabricating points',()=>{
 const {r,actors}=setup();
 take(r,null,'start');baseline(r);cards(r,actors);
 receiveAgentReply(r,sample);assert.equal(r.phase,'handoff');
 const skipTarget=handoffOwner(r),deadline=r.handoff_wait_started+90000;
 const hostState=visible(r,'host',null);
 assert.equal(hostState.handoff_skip_at,deadline);
 assert.throws(()=>take(r,actors[1].p,'skip_handoff',{},deadline+1),/Only host/);
 assert.throws(()=>take(r,null,'skip_handoff',{},deadline-1),/90 seconds/);
 const repliesBefore=r.replies.length;
 take(r,null,'skip_handoff',{},deadline);
 assert.equal(r.phase,'cascade');assert.equal(r.timeline.filter(x=>x.kind==='skip').length,1);
 assert.equal(r.replies.length,repliesBefore);
 const skip=visible(r,'player',actors[2].p).timeline.find(x=>x.kind==='skip');
 assert.equal(skip.kind,'skip');assert.equal(skip.actor_name,null);
 while(r.phase==='cascade'||r.phase==='handoff'){
  if(r.phase==='handoff'){const p=actors.find(a=>a.p.id===handoffOwner(r)).p;take(r,p,'handoff',{message:'How should the agency handle that concern?'})}
  else receiveAgentReply(r,sample);
 }
 assert.equal(r.phase,'judging');
 assert.equal(r.replies.length,2*(actors.length-1)-1);
 const eligible=new Set(r.replies.map(x=>x.actor_id));
 assert(!eligible.has(skipTarget)||r.replies.some(x=>x.actor_id===skipTarget),'Skipping creates no phantom reply attribution');
 take(r,actors[0].p,'propose_awards',{spotlight:'R1',bonus:null},100000);
 take(r,null,'finalize',{},113000);
 assert.equal(r.phase,'results');
 assert.equal(r.last_round.replies.length,5);
 assert(r.last_round.turns.some(x=>x.handoff_owner==='SKIPPED'));
});
