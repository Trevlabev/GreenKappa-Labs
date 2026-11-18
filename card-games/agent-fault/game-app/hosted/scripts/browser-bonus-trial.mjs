/**
 * Optional Clear Bonus UX acceptance in actual mobile Chrome, with one private
 * solo player, NPC Judges, a real human-referee action and no model requests.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.argv[2]||'http://127.0.0.1:8787').replace(/\/$/,'');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
const exceptions=[];
const clickClassic=(p,k)=>p.locator('[data-act="'+k+'"]').click({timeout:18000});
const clickCascade=(p,k)=>p.locator('[data-action="'+k+'"]').click({timeout:18000});
const replies=[
 'A: The council mandates citizens to submit a mandatory goose permit before requesting help at city hall.',
 'B: Residents are now required to present a stamped approval form before receiving ordinary assistance from the municipal assistant.',
 'C: The goose mayor approves a strangely elaborate public meeting at city hall before anyone can leave.'
].join('\n');
const cascadeReply='The municipal clerk now requires residents to submit an elaborate stamped permit before requesting city hall assistance, delaying the original assignment and creating a formal approval process.';
async function state(page,prefix,code,token){
 return page.evaluate(async({prefix,code,token})=>{
  const r=await fetch(prefix+'/api/rooms/'+code,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(!r.ok)throw Error('Room state HTTP '+r.status);
  return r.json();
 },{prefix,code,token});
}
async function act(page,prefix,code,token,name,data={}){
 return page.evaluate(async({prefix,code,token,name,data})=>{
  const r=await fetch(prefix+'/api/rooms/'+code+'/action',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({name,data})
  });
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(name+' HTTP '+r.status+' '+JSON.stringify(body));
  return body;
 },{prefix,code,token,name,data});
}
async function wait(page,selector){
 return page.locator(selector).waitFor({state:'visible',timeout:18000});
}
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const classic=await context.newPage();
 classic.on('pageerror',e=>exceptions.push('classic: '+e.message));
 await classic.goto(base+'/',{waitUntil:'domcontentloaded'});
 await clickClassic(classic,'solo_trial');
 await classic.waitForURL(/\/play\/[A-HJ-NP-Z2-9]{6}$/, {timeout:18000});
 const code=new URL(classic.url()).pathname.split('/').pop();
 await wait(classic,'#profile');
 const host=await classic.evaluate(c=>localStorage.getItem('aflive:host:'+c),code);
 const human=await classic.evaluate(c=>localStorage.getItem('aflive:player:'+c),code);
 let s=await state(classic,'',code,human);
 assert.equal(s.bonus_rules,'clear-v1');
 assert.equal(s.player_count,4);
 assert.equal(s.npc_count,3);
 assert.equal(context.pages().length,1,'Solo controls should remain in one browser tab');
 await classic.locator('#profile').fill('An anxious official who believes in ridiculous permits.');
 await clickClassic(classic,'lock_profile');
 await act(classic,'',code,host,'manual_answers',{text:replies});
 await act(classic,'',code,human,'spotlight',{label:'A'});
 await act(classic,'',code,human,'propose_bonus',{bonus:null,claims:{}});
 await act(classic,'',code,human,'approve',{yes:true});
 await act(classic,'',code,host,'finalize');
 await act(classic,'',code,host,'next');
 s=await state(classic,'',code,human);
 assert.equal(s.phase,'submit');
 await act(classic,'',code,human,'submit',{card_id:s.me.hand[0].id});
 await act(classic,'',code,host,'manual_answers',{text:replies});
 await wait(classic,'#referee-bonus');
 s=await state(classic,'',code,human);
 assert.equal(s.phase,'referee');
 assert.equal(s.referee_id,s.me.id);
 assert(s.fault,'Fault becomes public only after NPC Spotlight');
 await classic.locator('#referee-bonus').selectOption('B');
 await classic.locator('#referee-quote').fill('required to present a stamped approval form');
 for(const id of ['#trial-new','#trial-redirects','#trial-explicit'])await classic.locator(id).check();
 await clickClassic(classic,'referee_bonus');
 s=await state(classic,'',code,human);
 assert.equal(s.phase,'review');
 assert.equal(s.review_human_only,true);
 assert.equal(s.review_quorum,1);
 assert.deepEqual(Object.keys(s.approvals),[s.me.id],'NPCs abstain from semantic Bonus review');
 await wait(classic,'[data-act="solo_finalize"]');
 await clickClassic(classic,'solo_finalize');
 s=await state(classic,'',code,human);
 assert.equal(s.phase,'results');
 assert.equal(s.players.reduce((n,p)=>n+p.score,0),3);
 assert.equal(s.generation_calls,0);
 console.log('PASS: Classic experimental Bonus browser — one-screen opt-in, human referee, checklist, NPC abstention, score and privacy');
 const cascade=await context.newPage();
 cascade.on('pageerror',e=>exceptions.push('cascade: '+e.message));
 await cascade.goto(base+'/cascade/',{waitUntil:'domcontentloaded'});
 await clickCascade(cascade,'solo-trial');
 await cascade.waitForURL(/\/cascade\/play\/[A-HJ-NP-Z2-9]{6}$/, {timeout:18000});
 const code2=new URL(cascade.url()).pathname.split('/').pop();
 await wait(cascade,'#profile');
 const host2=await cascade.evaluate(c=>localStorage.getItem('cascade:host:'+c),code2);
 const human2=await cascade.evaluate(c=>localStorage.getItem('cascade:player:'+c),code2);
 let t=await state(cascade,'/cascade',code2,human2);
 assert.equal(t.bonus_rules,'clear-v1');
 assert.equal(t.player_count,4);
 await cascade.locator('#profile').fill('A comically formal imaginary clerk.');
 await clickCascade(cascade,'lock-profile');
 const continueCascade=async()=>{
  let n=0;
  while(n++<24){
   t=await state(cascade,'/cascade',code2,human2);
   if(['judging','referee'].includes(t.phase))return;
   if(t.phase==='baseline'||t.phase==='cascade')
    await act(cascade,'/cascade',code2,host2,'manual_reply',{text:cascadeReply});
   else if(t.phase==='lock_cards')
    await act(cascade,'/cascade',code2,human2,'lock_card',{card_id:t.me.hand[0].id});
   else if(t.phase==='handoff')
    await act(cascade,'/cascade',code2,human2,'handoff',{message:'Please require an additional official form before helping any resident.'});
   else assert.fail('Unexpected Cascade phase '+t.phase);
  }
  assert.fail('Cascade did not reach judging');
 };
 await continueCascade();
 assert.equal(t.phase,'judging');
 await act(cascade,'/cascade',code2,human2,'propose_awards',{spotlight:t.replies[0].id,bonus:null},100);
 await act(cascade,'/cascade',code2,host2,'finalize',{},100);
 await act(cascade,'/cascade',code2,host2,'next');
 await continueCascade();
 assert.equal(t.phase,'referee','NPC Judge should wait for a human certification');
 await wait(cascade,'#referee-reply');
 assert.equal(t.referee_id,t.me.id);
 await cascade.locator('#referee-reply').selectOption('R1');
 await cascade.locator('#referee-evidence').fill('requires residents to submit an elaborate stamped permit');
 for(const id of ['#clear-new','#clear-redirects','#clear-explicit'])await cascade.locator(id).check();
 await clickCascade(cascade,'referee-award');
 t=await state(cascade,'/cascade',code2,human2);
 assert.equal(t.phase,'challenge');
 assert.equal(t.review_human_only,true);
 assert.equal(t.challenge_until<=Date.now(),true,'No independent human challenger exists in solo game');
 await wait(cascade,'[data-action="solo-finalize"]');
 await clickCascade(cascade,'solo-finalize');
 t=await state(cascade,'/cascade',code2,human2);
 assert.equal(t.phase,'results');
 assert.equal(t.players.reduce((n,p)=>n+p.score,0),3);
 assert.equal(t.generation_calls,0);
 assert.deepEqual(exceptions,[]);
 console.log('PASS: Cascade experimental Bonus browser — one-screen opt-in, NPC Judge, human checklist, zero synthetic votes and AI calls');
}finally{
 await browser.close();
}
