import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import {fileURLToPath} from 'node:url';import {resolve,dirname} from 'node:path';
import {createRoom,token,digest,applyAction,visible,receiveAgentReply,handoffOwner,cardOwner} from '../lib/game.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const text='The agency now recommends a concrete fictional decision, providing residents with a practical next step while acknowledging its previous commitments.';
function loadUI(){
 const stub=()=>({innerHTML:'',dataset:{},style:{},addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},replaceChildren(){},focus(){},setSelectionRange(){}});
 const app=stub(),toast=stub(),modal=stub();let body=stub();
 const ctx={document:{getElementById:id=>({'app':app,'toast':toast,'modal-root':modal})[id]||stub(),querySelector:()=>null,querySelectorAll:()=>[],body,addEventListener(){}},window:{addEventListener(){}},history:{replaceState(){},pushState(){}},localStorage:{getItem(){return null}},location:{pathname:'/',origin:'https://cascade.example'},navigator:{clipboard:{writeText:async()=>{}}},setInterval(){return 1},clearInterval(){},setTimeout(){return 1},clearTimeout(){},createRoomPoller:()=>({start(){},stop(){},resume(){},refresh(){},changed(){},status:'active'}),console};
 vm.createContext(ctx);
 let src=fs.readFileSync(ROOT+'/public/static/cascade.js','utf8');src=src.replace(/^import \{createRoomPoller\} from '\.\/room-polling\.mjs';\s*/m,'');src=src.replace(/bootstrap\(\);\s*$/,'globalThis.__UI={S,render,landing,lockCards,handoff,judging,challenge,voting,results,finished,collection,modal,closeModal};');
 assert(src.includes('globalThis.__UI='));vm.runInContext(src,ctx,{filename:'cascade.js'});return {ui:ctx.__UI,app,ctx};
}
function setup(n=4){const h=token(),r=createRoom('ABC234',h),people=[];for(let i=0;i<n;i++){const p={id:'p'+i,name:'Tester '+i,token_hash:digest(token()),active:true,hand:[],score:0};r.players.push(p);people.push(p)}return{r,people}}
function renderPhase(ui,app,r,player){ui.S.state=visible(r,player?'player':'host',player);ui.render();assert(app.innerHTML.includes('CASCADE'));assert(!app.innerHTML.includes('undefined'));return app.innerHTML;}
function action(r,p,name,data={},now=Date.now()){return applyAction(r,p?'player':'host',p,name,data,now)}
test('desktop/mobile-facing templates render every stage with actual illustrated cards and correct permissions',()=>{
 const {ui,app}=loadUI();const {r,people}=setup();let html=ui.landing();assert(html.includes('PASS'));assert(html.includes('CASCADE'));
 html=renderPhase(ui,app,r);assert(html.includes('START CASCADE'));
 action(r,null,'start');html=renderPhase(ui,app,r,people[0]);assert(html.includes('SECRET FAULT'));
 html=renderPhase(ui,app,r,people[1]);assert(!html.includes('PRIVATE / FAULT FAMILY'));
 action(r,people[0],'lock_profile',{profile:'A municipal assistant with a melodramatic soul'});
 html=renderPhase(ui,app,r);assert(html.includes('ADVANCE THE AGENT'));
 receiveAgentReply(r,text);
 html=renderPhase(ui,app,r,people[2]);assert(html.includes('YOUR FOUR-CARD HAND'));assert((html.match(/data-select/g)||[]).length===4);
 for(const p of people.slice(1))action(r,p,'lock_card',{card_id:p.hand[0]});
 html=renderPhase(ui,app,r);assert(html.includes('NEXT IN THE CASCADE'));assert(html.includes('data-card="AF-INF-'));
 receiveAgentReply(r,text);
 const h=people.find(p=>p.id===handoffOwner(r));html=renderPhase(ui,app,r,h);assert(html.includes('SEND HANDOFF TO THE AGENT'));const other=people.find(p=>p.id===cardOwner(r));html=renderPhase(ui,app,r,other);assert(!html.includes('SEND HANDOFF TO THE AGENT'));
 while(r.phase==='handoff'||r.phase==='cascade'){
  if(r.phase==='handoff'){const p=people.find(q=>q.id===handoffOwner(r));action(r,p,'handoff',{message:'Can you explain how that becomes an official rule?',hook:'concrete fictional decision'});}else receiveAgentReply(r,text);
 }
 assert.equal(r.phase,'judging');html=renderPhase(ui,app,r,people[0]);assert(html.includes('LOCK SPOTLIGHT &amp; BONUS'));assert(!html.includes('Tester 1 ·'));
 action(r,people[0],'propose_awards',{spotlight:'R1',bonus:{reply_id:'R2',tier:'Breakpoint B',evidence:'the official rule is clearly required'}},1000);
 html=renderPhase(ui,app,r,people[1]);assert(html.includes('CHALLENGE DERAILMENT'));
 action(r,people[1],'challenge',{},1200);html=renderPhase(ui,app,r,people[2]);assert(html.includes('YES · BONUS VALID'));
 for(let i=0;i<4;i++)action(r,people[i],'vote',{yes:true},1300+i);
 action(r,null,'finalize',{},2000);html=renderPhase(ui,app,r);assert(html.includes('EVERY ACTION HAS AN OWNER'));assert(html.includes('Tester 1'));
 action(r,null,'next');html=renderPhase(ui,app,r,people[1]);assert(html.includes('PROGRAM THE AGENT'));
});
test('all 66 source entries render in public visual archive without duplicate card IDs',()=>{
 const {ui}=loadUI();const d=Object.fromEntries(['SCENARIO','INTERFERENCE','FAULT'].map(k=>[k,JSON.parse(fs.readFileSync(ROOT+'/data/AGENT_FAULT_WEB_'+k+'.json','utf8'))]));ui.S.deck=[...d.SCENARIO,...d.INTERFERENCE,...d.FAULT];ui.S.index=Object.fromEntries(ui.S.deck.map(c=>[c.id,c]));let html=ui.collection();assert.equal((html.match(/data-card="AF-/g)||[]).length,66);assert(html.includes('AF-FLT-006.webp'));ui.S.filter='Scenario';html=ui.collection();assert.equal((html.match(/data-card="AF-/g)||[]).length,24);});

// Regression: demo navigation must be above slides with variable heights.
test('Cascade demo top navigation precedes changing slide content in hosted and offline editions',()=>{
 for(const file of ['cascade-demo.js','cascade-demo-offline.js']){
  const src=fs.readFileSync(ROOT+'/public/static/'+file,'utf8');
  const controls=src.indexOf('function navigation()');
  const render=src.indexOf('function render(');
  assert(controls>=0&&render>controls,file+' navigation definition must precede rendering');
  assert(src.includes('${header()}${navigation()}<main'),file+' navigation must be above the variable-height scene');
  for(const button of ['data-prev','data-next','data-play'])assert(src.includes(button),file+' missing '+button);
  assert(!src.includes('class="demo-footer"'),file+' retains bottom navigation');
 }
 const css=fs.readFileSync(ROOT+'/public/static/cascade-showcase.css','utf8');
 assert(css.includes('.cd-nav{position:sticky'));
 assert(css.includes('@media(max-width:590px)'));
 assert(css.includes('prefers-reduced-motion'));
});

test('Cascade host automation requires explicit per-round consent and never retries a step automatically',()=>{
 const src=fs.readFileSync(ROOT+'/public/static/cascade.js','utf8');
 for(const pattern of ['AUTO-GENERATE THIS ROUND','window.confirm(message)','autoSteps:new Set()','S.autoSteps.has(key)','S.autoAIround','scheduleAutoAI()','S.autoAI=false;notify',"!['baseline','cascade'].includes(s.phase)"]){assert(src.includes(pattern),pattern);}
 assert(src.includes('Off by default'));assert(src.includes('billable model calls this round'));
 assert(src.includes('STOP AUTO AI'));assert(src.includes('clearTimeout(S.autoAITimer)'));
});
