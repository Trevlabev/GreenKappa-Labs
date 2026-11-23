'use strict';
// Candidate v1.1-P M13-2G control + approved-for-internal-testing TW-01.
// Dynamic tests exercise the actual playable-alpha inline engine with a mocked DOM.
// No retail approval, human-playtest claim, or 3D/browser certification is implied.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const html=fs.readFileSync(path.join(__dirname,'..','play.html'),'utf8');
const match=html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(match,'Playable-alpha module script not found');
const core=match[1].split("setup();import('./cards3d.js")[0];
assert.ok(core.includes('function playCard('),'Playable engine not extracted');
function el(){return {children:[],classList:{add(){},remove(){}},setAttribute(){},addEventListener(k,f){this['on'+k]=f},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},textContent:'',value:'',disabled:false};}
function harness(){
  const elements={};const document={getElementById(id){return elements[id]??(elements[id]=el())},createElement:el};
  const rng=Object.create(Math);rng.random=()=>.4;
  const win={setTimeout(fn){},SGLDCards:{sync(){},pending(){return false}}};
  const api=new Function('document','window','Math',core+'\nreturn {set:q=>{s=q;modalOpen=false},get:()=>s,miracles,titanNames,playCard,canAwaken,dialog:()=>modalOpen};')(document,win,rng);
  const [p,q,r]=['Veshka','Gilt','Tally'].map((name,id)=>({id,name,profile:id?'Pragmatist':'Human',dev:id===0?8:6,glory:0,hand:[],used:0,turnPower:false}));
  const s={players:[p,q,r],titans:api.titanNames.slice(0,3).map((name,id)=>({id,name,awake:false})),deck:api.miracles.filter(c=>!['M03','M01'].includes(c.id)),discard:[],loans:[],good:[],bad:[],turn:0,first:0,round:1,maxRounds:5,completed:0,events:[],over:false,busy:false,usedMove:false,performed:false,invoked:false,awakened:false,discount:0,surcharge:0,gb03:false,bb06:false,selected:-1,phase:'titan',asked:new Set()};
  p.hand=[api.miracles.find(c=>c.id==='M03'),api.miracles[0]];api.set(s);
  function resolve(pickIndex=()=>0){for(let i=0;i<30&&api.dialog();i++){const choices=elements['dialog-choices']?.children||[];if(!choices.length)break;const title=elements['dialog-title']?.textContent||'';const index=pickIndex({title,labels:choices.map(c=>c.textContent)})||0;const button=choices[index];assert.ok(button,'No dialog button '+index+': '+title);assert.equal(typeof button.onclick,'function');button.onclick();}}
  return {api,s,p,q,r,elements,resolve};
}
const costs=[3,4,4,4,4,4,5,5,5,6,6,6,7,7,7,8,8,8];
const glories=[1,1,1,1,1,1,1,2,1,1,1,2,2,2,2,2,2,2];
test('v1.1-P M13-2G control: all 18 Miracle IDs, costs and base Glory',()=>{
  const {api}=harness();assert.equal(api.miracles.length,18);
  assert.deepEqual(api.miracles.map(x=>x.id),Array.from({length:18},(_,i)=>'M'+String(i+1).padStart(2,'0')));
  assert.deepEqual(api.miracles.map(x=>x.cost),costs);
  assert.deepEqual(api.miracles.map(x=>x.glory),glories);
});
test('TW-01 M03 unsponsored: pays 4, gets 1 Glory only; cannot gain 2D or awaken',()=>{
  const {api,s,p,q}=harness();assert.equal(api.playCard(0,null),true);
  assert.equal(p.dev,4);assert.equal(p.glory,1);assert.equal(q.dev,6);
  assert.equal(s.awakened,false);assert.equal(s.titans.filter(t=>t.awake).length,0);
  assert.equal(s.loans.length,0);assert.equal(s.usedMove,true);
});
test('TW-01 M03 sponsored normal choice: sponsor contributes 2, gets +1, borrower +2',()=>{
  const {api,s,p,q,resolve}=harness();assert.equal(api.playCard(0,q),true);resolve(()=>0);
  assert.equal(p.dev,8);assert.equal(p.glory,1);assert.equal(q.dev,5);
  assert.equal(s.loans.length,1);assert.equal(s.awakened,false);
});
test('TW-01 M03 sponsored awakening: no extra 4D and no immediate second D8 roll',()=>{
  const {api,s,p,q,resolve}=harness();assert.equal(api.playCard(0,q),true);
  resolve(({title})=>title==='Borrowed Spotlight'||title==='Immediate Titan invocation'?1:0);
  assert.equal(p.dev,6);assert.equal(p.glory,1);assert.equal(q.dev,5);
  assert.equal(s.titans.filter(t=>t.awake).length,1);assert.equal(s.awakened,true);
  assert.equal(s.loans.length,1);assert.equal(s.invoked,false);
});
test('M03 displayed rules explicitly identify sponsorship as condition',()=>{
  const {api}=harness();const text=api.miracles.find(c=>c.id==='M03').text;
  assert.match(text,/if sponsored/i);assert.match(text,/gain 2 devotion/i);
});
test('TW-01 M03 sponsored with no dormant Titan grants 2D instead',()=>{
  const {api,s,p,q,resolve}=harness();s.titans.forEach(t=>t.awake=true);
  assert.equal(api.playCard(0,q),true);resolve(()=>0);
  assert.equal(p.dev,8);assert.equal(q.dev,5);assert.equal(s.awakened,false);
});
test('TW-01 once-per-turn awakening limit prevents a second free awakening',()=>{
  const {api,s,p,q,resolve}=harness();s.awakened=true;
  assert.equal(api.playCard(0,q),true);resolve(()=>0);
  assert.equal(s.titans.filter(t=>t.awake).length,0);
  assert.equal(p.dev,8);assert.equal(q.dev,5);
});
for(const id of ['M06','M15'])test(id+' unsponsored still offers free Titan awakening',()=>{
  const {api,s,p,resolve}=harness();p.dev=10;p.hand[0]=api.miracles.find(c=>c.id===id);
  assert.equal(api.playCard(0,null),true);
  resolve(({title})=>(title==='A Beautiful Mistake'||title==='The Half-Finished World'||title==='Immediate Titan invocation')?1:0);
  assert.equal(s.titans.filter(t=>t.awake).length,1);assert.equal(s.loans.length,0);
});
