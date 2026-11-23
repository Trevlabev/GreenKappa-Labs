'use strict';
// Candidate v1.1-P rules; M13 7D/2G control; TW-01 test authorization only.
// Exercises the actual inline playable alpha with a mocked DOM (NOT rendered-browser or human QA).
// Authorities: Drive Docs 1jx5UcAs6SMJZQaA2ASohI3J9FzuSdV17LfSs9ZMxrOA,
// 1Ql6lCErVsvZg1JxHSy8l9H2DR4YOaEyFhtot069eYQE, 1_5JAhiyiCEf42-0_ZBQuvyx9afbQYkZpnXrk7jWhhR8.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{test}=require('node:test');
const html=fs.readFileSync(path.join(__dirname,'..','play.html'),'utf8');
const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'Inline engine missing');
const core=source.split("setup();import('./cards3d.js")[0];
assert.ok(core.includes('function titanEffect('),'Titan engine missing');
function el(){return{children:[],classList:{add(){},remove(){},contains(){return false}},setAttribute(){},addEventListener(k,f){this['on'+k]=f},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},focus(){},textContent:'',value:'',disabled:false};}
function fixture(){
 const elements={},document={getElementById:id=>elements[id]??(elements[id]=el()),createElement:el};
 const rng=Object.create(Math);rng.random=()=>.31;
 const win={setTimeout(){},SGLDCards:{sync(){},pending(){return false}}};
 const api=new Function('document','window','Math',core+
 '\nreturn {set:x=>{s=x;modalOpen=false},get:()=>s,dialog:()=>modalOpen,change,playCard,boon,titanEffect,invoke,finish,settle,validSponsor,moveBasic,power,miracles,boonsGood,boonsBad,titanNames};'
 )(document,win,rng);
 const players=['Veshka','Ravel','Gilt'].map((name,id)=>({id,name,profile:id?'Pragmatist':'Human',dev:id===0?8:6,glory:0,hand:[],used:0,turnPower:false}));
 const s={players,titans:api.titanNames.slice(0,3).map((name,id)=>({id,name,awake:true})),
 deck:api.miracles.slice(4),discard:[],loans:[],good:[],bad:[],turn:0,first:0,round:1,maxRounds:5,
 completed:0,events:[],over:false,busy:false,invoked:false,awakened:false,usedMove:false,
 performed:false,selected:-1,discount:0,surcharge:0,gb03:false,bb06:false,phase:'titan',asked:new Set()};
 players.forEach(p=>p.hand=[api.miracles[0],api.miracles[1]]);api.set(s);
 function resolve(pick=()=>0){let steps=0;
  while(api.dialog()&&steps++<80){const options=elements['dialog-choices']?.children||[];
   assert.ok(options.length,'empty dialog');const title=elements['dialog-title']?.textContent||'';
   const index=pick({title,labels:options.map(x=>x.textContent)})??0;
   assert.ok(options[index],'missing option '+index+' for '+title);
   assert.equal(typeof options[index].onclick,'function','inert dialog choice');options[index].onclick();}
  assert.equal(api.dialog(),false,'dialog unresolved after 80 steps');}
 return {api,s,rng,p:players[0],q:players[1],r:players[2],elements,resolve};
}
test('Devotion capped 0–10, Glory may be negative',()=>{
 const{api,p}=fixture();p.dev=9;api.change(p,4);assert.equal(p.dev,10);
 api.change(p,-99,-2);assert.equal(p.dev,0);assert.equal(p.glory,-2);
});
test('16 operative Boon names are unchanged',()=>{
 const{api}=fixture();
 assert.deepEqual(api.boonsGood.map(x=>x[0]),['The First Offering','A Thousand Kneel','Unburdened Miracle','Mercy of Strangers','Lantern Against Debt','The Open Gate','Golden Signature','The Favor Everyone Saw']);
 assert.deepEqual(api.boonsBad.map(x=>x[0]),['Tithe of the Forgotten','A Public Unmaking','The Wrong Recipient','Unwelcome Interest','Offerings to Ash','The Door Closes','Envy of Heaven','A Crown of Dust']);
});
test('GB02: filter ineligible 1D payer, permit 4D payer, no Covenant created',()=>{
 const{api,s,p,q,r,resolve}=fixture();p.dev=8;q.dev=1;r.dev=4;
 s.good=[['A Thousand Kneel',0,1]];let done=0;api.boon(p,true,()=>done++);resolve();
 assert.equal(done,1);assert.equal(p.dev,10);assert.equal(p.glory,1);
 assert.equal(q.dev,1);assert.equal(q.glory,0);assert.equal(r.dev,2);assert.equal(r.glory,1);
 assert.deepEqual(s.loans,[]);
});
test('GB02: invoker at 9D cannot accept full 2D voluntary transfer; base +1G remains',()=>{
 const{api,s,p,q,r,resolve}=fixture();p.dev=9;q.dev=5;r.dev=5;
 s.good=[['A Thousand Kneel',0,1]];api.boon(p,true,()=>{});resolve();
 assert.equal(p.glory,1);assert.equal(p.dev,9);assert.equal(q.dev,5);assert.equal(r.dev,5);
 assert.equal(q.glory,0);assert.equal(r.glory,0);
});
test('GB02: exact-2D payer may voluntarily accept full payment',()=>{
 const{api,s,p,q,r,resolve}=fixture();q.dev=8;p.dev=2;r.dev=0;
 s.good=[['A Thousand Kneel',0,1]];api.boon(q,true,()=>{});resolve(()=>0);
 assert.equal(q.dev,10);assert.equal(q.glory,1);assert.equal(p.dev,0);assert.equal(p.glory,1);
 assert.deepEqual(s.loans,[]);
});
test('GB02: decline does not penalize payer, invoker retains base 1G',()=>{
 const{api,s,p,q,r}=fixture();p.dev=8;q.dev=3;r.dev=1;
 s.good=[['A Thousand Kneel',0,1]];api.boon(p,true,()=>{});
 assert.equal(q.dev,3);assert.equal(q.glory,0);assert.equal(p.dev,8);assert.equal(p.glory,1);
});
test('OG05 Remembered by None skips entire effect when invoker sole least-Glory god',()=>{
 const{api,p,q,r}=fixture();p.dev=5;p.glory=-2;q.glory=0;r.glory=1;
 let n=0;api.titanEffect({id:4,name:'The Last Witness'},p,2,()=>n++);
 assert.equal(p.dev,5);assert.equal(q.dev,6);assert.equal(r.dev,6);assert.equal(n,1);
});
test('OG05 Remembered by None when invoker tied least, grants both participants +1D',()=>{
 const{api,p,q,r}=fixture();p.dev=5;p.glory=0;q.glory=0;r.glory=1;
 let n=0;api.titanEffect({id:4,name:'The Last Witness'},p,3,()=>n++);
 assert.equal(p.dev,6);assert.equal(q.dev,7);assert.equal(r.dev,6);assert.equal(n,1);
});
test('OG05 Remembered by None: choose between two eligible rival gods',()=>{
 const{api,p,q,r,resolve}=fixture();p.dev=5;p.glory=5;q.glory=1;r.glory=1;
 api.titanEffect({id:4,name:'The Last Witness'},p,5,()=>{});resolve(()=>1);
 assert.equal(p.dev,6);assert.equal(q.dev,6);assert.equal(r.dev,7);
});
test('OG05 Remembered by None: capped invoker gain is lost, recipient gain remains',()=>{
 const{api,p,q,r}=fixture();p.dev=10;p.glory=1;q.dev=9;q.glory=0;r.glory=2;
 api.titanEffect({id:4,name:'The Last Witness'},p,4,()=>{});
 assert.equal(p.dev,10);assert.equal(q.dev,10);
});
test('A03 OG06 Around the Fold uses snapshot contributors; skipped players cannot pass new receipt',()=>{
 const{api,p,q,r}=fixture();p.dev=1;q.dev=0;r.dev=10;
 api.titanEffect({id:5,name:'The Geometry That Cannot Close'},p,3,()=>{});
 assert.deepEqual([p.dev,q.dev,r.dev],[1,1,9]);
});
test('Due Covenant: partial payment, shortfall Glory loss, single discharge',()=>{
 const{api,s,p,q}=fixture();p.dev=1;q.dev=5;s.loans=[{borrower:0,lender:1,due:1}];
 let n=0;api.settle(p,false,()=>n++);
 assert.equal(n,1);assert.deepEqual([p.dev,q.dev,p.glory],[0,6,-2]);assert.equal(s.loans.length,0);
 api.settle(p,false,()=>n++);assert.equal(n,2);assert.equal(q.dev,6);
});
test('Covenant: recipient cap discards overflow but full payment still discharged',()=>{
 const{api,s,p,q}=fixture();p.dev=3;q.dev=10;s.loans=[{borrower:0,lender:1,due:1}];
 api.settle(p,false,()=>{});assert.deepEqual([p.dev,q.dev,p.glory],[0,10,0]);assert.equal(s.loans.length,0);
});
test('A04 frozen Final Reckoning prevents borrowing from simultaneous receipts',()=>{
 const{api,s,p,q}=fixture();p.dev=1;q.dev=0;
 s.loans=[{borrower:0,lender:1,due:6},{borrower:1,lender:0,due:6}];
 api.finish();assert.equal(s.over,true);assert.equal(s.loans.length,0);
 assert.deepEqual([p.dev,q.dev],[0,1]);assert.deepEqual([p.glory,q.glory],[-2,-3]);
});
test('M13 remains approved-for-test 7-Devotion/2-Glory control',()=>{
 const{api}=fixture();const m=api.miracles.find(x=>x.id==='M13');
 assert.deepEqual([m.cost,m.glory],[7,2]);
});
for(const id of Array.from({length:18},(_,i)=>'M'+String(i+1).padStart(2,'0')))
 test('Miracle '+id+': self-funded Move resolves base Glory and keeps bounded state',()=>{
 const{api,s,p,resolve}=fixture();const c=api.miracles.find(x=>x.id===id);p.dev=10;p.hand=[c,api.miracles[0]];
 assert.equal(api.playCard(0,null),true);resolve(()=>0);
 assert.equal(p.glory,c.glory,'base Glory');assert.equal(s.usedMove,true,'one Move consumed');
 assert.equal(s.loans.length,0,'self-funding creates no Covenant');
 assert.ok(p.dev>=0&&p.dev<=10,'bounded Devotion');
});
for(const good of [true,false]){
 const names=good?['The First Offering','A Thousand Kneel','Unburdened Miracle','Mercy of Strangers','Lantern Against Debt','The Open Gate','Golden Signature','The Favor Everyone Saw']:['Tithe of the Forgotten','A Public Unmaking','The Wrong Recipient','Unwelcome Interest','Offerings to Ash','The Door Closes','Envy of Heaven','A Crown of Dust'];
 for(const name of names)test((good?'Good':'Bad')+' Boon '+name+': resolves with invariant state',()=>{
  const{api,s,p,resolve}=fixture();p.dev=5;
  if(good)s.good=[[name,0,0]];else s.bad=[[name,0,0]];
  let calls=0;api.boon(p,good,()=>calls++);resolve(()=>0);
  assert.equal(calls,1,'callback exactly once');
  assert.ok(s.players.every(q=>q.dev>=0&&q.dev<=10),'Devotion bounded');
 });
}
for(let titan=0;titan<8;titan++)
 for(let face=2;face<=7;face++)test('Titan OG'+String(titan+1).padStart(2,'0')+' D8 '+face+': completes and respects invariants',()=>{
  const{api,s,p,q,r,resolve}=fixture();p.dev=5;q.dev=4;r.dev=6;p.glory=1;q.glory=2;r.glory=0;
  let calls=0;api.titanEffect({id:titan,name:api.titanNames[titan]},p,face,()=>calls++);resolve(()=>0);
  assert.equal(calls,1,'callback exactly once');
  assert.ok(s.players.every(z=>z.dev>=0&&z.dev<=10),'bounded Devotion');
  assert.ok(s.players.every(z=>Number.isInteger(z.glory)),'integral Glory');
 });

for(let titan=0;titan<8;titan++)
 for(const natural of [1,8])test('Titan OG'+String(titan+1).padStart(2,'0')+' natural D8 '+natural+' draws correct Boon outside OG08 exact-ten condition',()=>{
  const{api,s,p,rng,resolve}=fixture();
  p.dev=7;p.glory=2;
  s.titans[0]={id:titan,name:api.titanNames[titan],awake:true};
  s.bad=[['A Public Unmaking',0,-1]];s.good=[['Lantern Against Debt',2,0]];
  rng.random=()=>natural===1?0:.999;
  let calls=0;api.invoke(s.titans[0],()=>calls++);resolve(()=>0);
  assert.equal(calls,1,'ordinary boon route completed once');
  assert.equal(s.roll,natural);assert.equal(s.over,false,'not an instant win');
  assert.equal(p.glory,natural===1?1:2);
  assert.equal(p.dev,natural===1?7:9);
 });
test('OG08 natural 1 at exactly 10 Devotion loses all Devotion and two Glory, no Bad Boon',()=>{
 const{api,s,p,rng}=fixture();
 s.titans[0]={id:7,name:api.titanNames[7],awake:true};p.dev=10;p.glory=4;
 s.bad=[['A Public Unmaking',0,-1]];rng.random=()=>0;
 let calls=0;api.invoke(s.titans[0],()=>calls++);
 assert.equal(calls,1);assert.equal(p.dev,0);assert.equal(p.glory,2);
 assert.equal(s.bad.length,1,'no Bad Boon consumed');assert.equal(s.over,false);
});
test('OG08 natural 8 at exactly 10 Devotion is immediate win, no Good Boon or final loan settlement',()=>{
 const{api,s,p,q,rng}=fixture();s.titans[0]={id:7,name:api.titanNames[7],awake:true};
 p.dev=10;p.glory=2;q.dev=5;s.loans=[{borrower:0,lender:1,due:6}];
 s.good=[['Lantern Against Debt',2,0]];rng.random=()=>.999;
 api.invoke(s.titans[0],()=>{throw Error('instant win must not continue ordinary resolution')});
 assert.equal(s.over,true);assert.equal(s.phase,'complete');assert.equal(s.good.length,1,'Good Boon not used');
 assert.equal(s.loans.length,1,'no Final Reckoning on instant win');assert.equal(p.glory,2);assert.equal(p.dev,10);
});
