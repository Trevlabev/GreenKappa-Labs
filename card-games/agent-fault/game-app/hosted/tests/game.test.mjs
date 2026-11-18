import test from 'node:test';import assert from 'node:assert/strict';
import {SCENES,INF,FAULTS} from '../lib/cards.mjs';
import {ABC,CARDS,MODEL_PRICES,createRoom,auth,token,applyAction,visible,buildPrompt,parseAnswers,estimateUsd} from '../lib/game.mjs';
function setup(n=4){const h=token(),r=createRoom('AG7Q2R',h),people=[];
 for(let i=0;i<n;i++){let key=token(),p={id:'person-'+i,token_hash:(awaitHash(key)),name:'P'+i,score:0,active:true,hand:[],seat:i};r.players.push(p);people.push({p,key})}
 return {r,h,people}}
import {digest as awaitHash} from '../lib/game.mjs';
test('exact v0.9-P cards and unique IDs',()=>{assert.equal(SCENES.length,24);assert.equal(INF.length,36);assert.equal(FAULTS.length,6);assert.equal(new Set([...SCENES,...INF,...FAULTS].map(x=>x.id)).size,66)});
test('4-player round preserves secrecy, anonymity, scores, hands, Judge rotation',()=>{
 const {r,h,people}=setup();assert.equal(auth(r,'Bearer '+h).role,'host');assert.equal(auth(r,'Bearer '+people[0].key).p.id,people[0].p.id);
 assert.throws(()=>auth(r,'Bearer incorrect'),/Invalid session/);
 applyAction(r,'host',null,'start');assert.equal(r.phase,'setup');assert.equal(r.round_limit,8);
 const other=visible(r,'player',people[2].p);assert.equal(other.fault,null);assert.equal(other.profile,null);assert.equal(other.me.hand.length,4);
 applyAction(r,'player',people[0].p,'lock_profile',{profile:'A haunted municipal clerk'});
 for(const {p} of people.slice(1))applyAction(r,'player',p,'submit',{card_id:p.hand[0]});
 assert.equal(r.phase,'generate');const p=buildPrompt(r);assert.ok(p.includes('CANDIDATES:'));assert.ok(!p.includes('BREAKPOINT A:'));assert.ok(!p.includes('FAULT:'));assert.ok(!p.includes(FAULTS[0].condition));
 const pre=visible(r,'host',null);assert.equal(pre.candidates.length,0);assert.equal(pre.fault,null);assert.equal(pre.candidate_labels.length,3);
 applyAction(r,'host',null,'manual_answers',{text:'A: Sample inventive answer one\nB: Sample inventive answer two\nC: Sample inventive answer three'});assert.equal(r.phase,'spotlight');assert.equal(visible(r,'player',people[2].p).fault,null);
 applyAction(r,'player',people[0].p,'spotlight',{label:'A'});assert.ok(visible(r,'player',people[2].p).fault);
 applyAction(r,'player',people[0].p,'propose_bonus',{claims:{B:{breakpoint:true,evidence:'Sample'}} ,bonus:'B'});
 for(const {p} of people)applyAction(r,'player',p,'approve',{yes:true});applyAction(r,'host',null,'finalize');
 assert.equal(r.phase,'results');assert.equal(r.players.reduce((n,p)=>n+p.score,0),2);for(const {p} of people)assert.equal(p.hand.length,4);
 applyAction(r,'host',null,'next');assert.equal(r.round,2);assert.equal(r.judge_id,people[1].p.id);
});
test('8-player draw and contest owner protections',()=>{const {r,people}=setup(8);applyAction(r,'host',null,'start');assert.equal(r.decks.Interference.length,4);for(let i=0;i<8;i++){const me=visible(r,'player',people[i].p);assert.equal(me.me.hand.length,4);assert.equal(me.me.id,people[i].p.id);assert.equal(me.fault,i===0?CARDS[r.fault_id]:null)}assert.throws(()=>applyAction(r,'player',people[2].p,'lock_profile',{profile:'no'}),/Only current Judge/);});
test('majority voting is strict and cannot duplicate points',()=>{const {r,people}=setup();applyAction(r,'host',null,'start');applyAction(r,'player',people[0].p,'lock_profile',{profile:'Sincere but confused'});for(const {p} of people.slice(1))applyAction(r,'player',p,'submit',{card_id:p.hand[0]});applyAction(r,'host',null,'manual_answers',{text:'A: one\nB: two\nC: three'});applyAction(r,'player',people[0].p,'spotlight',{label:'A'});applyAction(r,'player',people[0].p,'propose_bonus',{claims:{},bonus:null});for(const [i,{p}] of people.entries())applyAction(r,'player',p,'approve',{yes:i<2});assert.throws(()=>applyAction(r,'host',null,'finalize'),/strict majority/);applyAction(r,'host',null,'reopen');assert.equal(r.phase,'adjudicate')});
test('pricing calculator matches documented token math',()=>{assert.equal(estimateUsd('gpt-4.1-mini',{input_tokens:599,output_tokens:277}),0.0006828);assert.equal(estimateUsd('unknown',{input_tokens:10,output_tokens:10}),null);assert.equal(estimateUsd('gpt-4.1-mini',{input_tokens:800,output_tokens:200,input_tokens_details:{cached_tokens:80}}),.000616)});
test('answer parsing strips excess words',()=>{let text='A: '+Array(40).fill('word').join(' ')+'\nB: okay';let result=parseAnswers(text,['A','B']);assert.equal(result.A.split(' ').length,30);assert.equal(result.B,'okay')});


test('Classic review grace period handles disconnected votes without weakening strict majority',()=>{
 const {r,people}=setup();
 applyAction(r,'host',null,'start');
 applyAction(r,'player',people[0].p,'lock_profile',{profile:'A municipal assistant'});
 for(const {p} of people.slice(1))applyAction(r,'player',p,'submit',{card_id:p.hand[0]});
 applyAction(r,'host',null,'manual_answers',{text:'A: First complete candidate.\nB: Second complete candidate.\nC: Third complete candidate.'});
 applyAction(r,'player',people[0].p,'spotlight',{label:'A'});
 const start=1_000_000;
 applyAction(r,'player',people[0].p,'propose_bonus',{claims:{},bonus:null},start);
 assert.equal(r.review_deadline,start+60000);
 const state=visible(r,'host',null);
 assert.equal(state.review_deadline,start+60000);
 for(const {p} of people.slice(0,3))applyAction(r,'player',p,'approve',{yes:true},start+1000);
 assert.throws(()=>applyAction(r,'host',null,'finalize',{},start+59999),/Waiting for votes/);
 applyAction(r,'host',null,'finalize',{},start+60000);
 assert.equal(r.phase,'results');
 assert.equal(r.players.reduce((a,p)=>a+p.score,0),1);
});
test('Classic does not award a contested proposal when disconnected votes leave no majority',()=>{
 const {r,people}=setup();
 applyAction(r,'host',null,'start');
 applyAction(r,'player',people[0].p,'lock_profile',{profile:'A careful administrator'});
 for(const {p} of people.slice(1))applyAction(r,'player',p,'submit',{card_id:p.hand[0]});
 applyAction(r,'host',null,'manual_answers',{text:'A: First complete candidate.\nB: Second complete candidate.\nC: Third complete candidate.'});
 applyAction(r,'player',people[0].p,'spotlight',{label:'A'});
 applyAction(r,'player',people[0].p,'propose_bonus',{claims:{},bonus:null},2000);
 applyAction(r,'player',people[0].p,'approve',{yes:true});
 applyAction(r,'player',people[1].p,'approve',{yes:true});
 assert.throws(()=>applyAction(r,'host',null,'finalize',{},62000),/strict majority/);
 applyAction(r,'host',null,'reopen');
 assert.equal(r.phase,'adjudicate');
 assert.equal(r.review_deadline,null);
});
