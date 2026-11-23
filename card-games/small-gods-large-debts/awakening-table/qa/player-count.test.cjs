'use strict';
// v1.1-P candidate 3–6 player alpha, single human vs automated rivals.
// Internal mocked-DOM engine QA; NOT human-playtest, multiplayer server or retail-canon approval.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{test}=require('node:test');
const html=fs.readFileSync(path.join(__dirname,'..','play.html'),'utf8');
const moduleSource=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(moduleSource,'Playable alpha module not found');
const core=moduleSource.split("setup();import('./cards3d.js")[0];
assert.ok(core.includes('function start()'),'Player setup engine missing');
function el(){return{children:[],classList:{add(){},remove(){},contains(){return false}},setAttribute(){},addEventListener(k,f){this['on'+k]=f},append(...a){this.children.push(...a)},replaceChildren(...a){this.children=a},focus(){},textContent:'',value:'',disabled:false}}
function fixture(count,seed=1){
 const els={},timers=[],doc={getElementById:id=>els[id]??(els[id]=el()),createElement:el};
 let state=seed|0;const rng=Object.create(Math);
 rng.random=()=>((state=(Math.imul(1664525,state)+1013904223)|0)>>>0)/4294967296;
 const win={setTimeout(fn){timers.push(fn)},SGLDCards:{sync(){},pending(){return false}}};
 const api=new Function('document','window','Math',core+
 '\nreturn{start,get:()=>s,dialog:()=>modalOpen,moveBasic,endTurn,playCard,boon,titanEffect,validSponsor,miracles};'
 )(doc,win,rng);
 els['party-size']=el();els['party-size'].value=String(count);
 els['deity']=el();els['deity'].value='Veshka';
 api.start();return{api,s:api.get(),timers,els};
}
function choose(f,pick=()=>0){
 const options=f.els['dialog-choices']?.children||[];
 assert.ok(options.length,'empty dialogue');
 const title=f.els['dialog-title']?.textContent||'';
 const index=pick({title,labels:options.map(x=>x.textContent)})??0;
 assert.ok(options[index],'no choice '+index+' for '+title);
 assert.equal(typeof options[index].onclick,'function');
 options[index].onclick();
}
function completeMatch(count,seed,policy){
 const f=fixture(count,seed);let steps=0,moves=0,timerEvents=0;
 let visited=new Set();
 while(!f.api.get().over&&steps++<2000){
  const s=f.api.get();
  assert.equal(s.turn,(s.first+s.completed)%count,'fixed clockwise order');
  assert.ok(s.players.every(p=>p.dev>=0&&p.dev<=10&&Number.isInteger(p.glory)),'resource state invalid');
  visited.add(s.turn);
  if(f.api.dialog()){choose(f);continue}
  if(s.turn===0&&!s.busy){
   if(!s.usedMove){
    const affordable=s.players[0].hand.findIndex(c=>Math.max(1,c.cost-(s.discount||0)+(s.surcharge||0))<=s.players[0].dev);
    if(policy==='miracle'&&affordable>=0)assert.equal(f.api.playCard(affordable),true);
    else f.api.moveBasic('gather');
    moves++;
   }else f.api.endTurn();
   continue;
  }
  if(f.timers.length){f.timers.shift()();timerEvents++;continue}
  assert.fail('deadlock, completed '+s.completed+' / '+(count*s.maxRounds)+', seat '+s.turn);
 }
 const s=f.api.get();
 assert.ok(steps<2000,'simulation step limit exceeded');
 assert.equal(s.over,true,'unfinished game');
 assert.equal(s.completed,count*s.maxRounds,'unequal turn count');
 assert.equal(s.phase,'complete','Final Reckoning not reached');
 assert.equal(s.loans.length,0,'uncleared live Covenants');
 assert.equal(visited.size,count,'not every player got a turn');
 assert.ok(s.players.every(p=>p.hand.length<=2),'hand cleanup failure');
 assert.equal(moves,s.maxRounds,'human must get one Move per round');
 assert.ok(timerEvents>0,'bots did not advance');
}
test('accessible table-size selector includes 3–6, default 3, one human player',()=>{
 assert.match(html,/<label for="party-size">TABLE SIZE<\/label>/);
 assert.match(html,/<select id="party-size" aria-describedby="party-help">/);
 assert.match(html,/<option value="3" selected>/);
 for(const count of [3,4,5,6])assert.match(html,new RegExp('<option value="'+count+'"'));
 assert.match(html,/one human player/i);
});
for(const count of [3,4,5,6]){
 test(count+' players: unique deity identities, fixed seats, round budget and private deck',()=>{
  const f=fixture(count,15),s=f.s;
  assert.equal(s.players.length,count);assert.equal(new Set(s.players.map(p=>p.name)).size,count);
  assert.deepEqual(s.players.map(p=>p.id),Array.from({length:count},(_,i)=>i));
  assert.equal(s.players[0].name,'Veshka');assert.equal(s.players[0].profile,'Human');
  assert.ok(s.players.slice(1).every(p=>p.profile!=='Human'));
  assert.ok(s.first>=0&&s.first<count);assert.equal(s.turn,s.first);
  assert.equal(s.maxRounds,count<=4?5:4);
  assert.equal(s.titans.length,3);assert.equal(new Set(s.titans.map(t=>t.id)).size,3);
  assert.ok(s.titans.every(t=>!t.awake));
  assert.ok(s.players.every(p=>p.hand.length>=2&&p.hand.length<=3));
  assert.equal(s.players.reduce((n,p)=>n+p.hand.length,0)+s.deck.length,18);
 });
 for(const strategy of ['gather','miracle'])for(let seed=1;seed<=8;seed++)
  test(count+' players / seed '+seed+' / '+strategy+': full game through Final Reckoning',()=>{
   completeMatch(count,seed,strategy);
  });
}
test('6-player BB07 Envy of Heaven benefits exactly two distinct opponents',()=>{
 const f=fixture(6,5),s=f.s,p=s.players[0];s.turn=0;s.bad=[['Envy of Heaven',0,0]];
 const start=s.players.map(q=>q.dev);let done=0;f.api.boon(p,false,()=>done++);
 choose(f,()=>3);choose(f,()=>1);
 assert.equal(done,1);
 const delta=s.players.map((q,i)=>q.dev-start[i]);
 assert.equal(delta[0],0);assert.equal(delta.filter(n=>n===1).length,2);
 assert.equal(delta.filter(n=>n===0).length,4);
});
test('3-player BB07 retains existing two-opponent effect',()=>{
 const f=fixture(3,5),s=f.s;s.turn=0;s.bad=[['Envy of Heaven',0,0]];
 let done=0;const original=s.players.map(q=>q.dev);
 f.api.boon(s.players[0],false,()=>done++);choose(f);
 assert.equal(done,1);
 assert.deepEqual(s.players.map((q,i)=>q.dev-original[i]),[0,1,1]);
});
test('6-player OG07 False Harmony assigns +2 and −2 to separate opponents',()=>{
 const f=fixture(6,7),s=f.s;s.turn=0;s.players.forEach(q=>q.dev=5);
 let done=0;f.api.titanEffect({id:6,name:'The Choir Without Voices'},s.players[0],5,()=>done++);
 choose(f,()=>3);choose(f,()=>1);
 assert.equal(done,1);
 const d=s.players.map(q=>q.dev-5);
 assert.equal(d[0],0);assert.equal(d.filter(n=>n===2).length,1);
 assert.equal(d.filter(n=>n===-2).length,1);
 assert.equal(d.filter(n=>n===0).length,4);
});
test('6-player OG06 Around the Fold snapshots all six contributors before transfers',()=>{
 const f=fixture(6,7),s=f.s;s.turn=0;
 [1,0,2,10,4,0].forEach((v,i)=>s.players[i].dev=v);
 let done=0;f.api.titanEffect({id:5,name:'The Geometry That Cannot Close'},s.players[0],2,()=>done++);
 assert.equal(done,1);assert.deepEqual(s.players.map(q=>q.dev),[0,1,1,10,4,1]);
});
test('6-player OG07 Silent Chorus passes all private Miracles clockwise without public disclosure',()=>{
 const f=fixture(6,7),s=f.s;s.turn=0;
 const cards=f.api.miracles.slice(0,6);s.players.forEach((p,i)=>p.hand=[cards[i]]);
 let done=0;f.api.titanEffect({id:6,name:'The Choir Without Voices'},s.players[0],7,()=>done++);
 assert.equal(done,1);
 s.players.forEach((p,i)=>assert.equal(p.hand[0],cards[(i+5)%6]));
 assert.ok(s.events.every(e=>cards.every(c=>!e.includes(c.name))),'Miracle identity revealed publicly');
});
test('6-player sponsorship allows a fifth opponent to finance a legal M03',()=>{
 const f=fixture(6,7),s=f.s;s.turn=0;s.usedMove=false;
 const p=s.players[0],q=s.players[5];p.dev=2;q.dev=6;p.hand=[f.api.miracles.find(c=>c.id==='M03')];
 assert.equal(f.api.validSponsor(p,q,p.hand[0]),true);
 assert.equal(f.api.playCard(0,q),true);
 choose(f,()=>0); // M03 +2 Devotion choice
 assert.equal(s.loans.length,1);assert.equal(s.loans[0].lender,5);
 assert.equal(s.loans[0].borrower,0);assert.equal(p.glory,1);assert.equal(q.dev,5);
 assert.equal(p.dev,2);assert.equal(s.usedMove,true);
});
