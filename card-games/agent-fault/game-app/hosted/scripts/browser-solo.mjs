/**
 * One-screen Solo acceptance, running against local Wrangler + installed Chrome.
 * All AI outputs are manually mocked, so this test makes ZERO provider calls.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=(process.argv[2]||'http://127.0.0.1:8787').replace(/\/$/,'');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
const errors=[];
const a=async(page,name)=>page.locator('[data-act="'+name+'"]').click({timeout:12000});
const b=async(page,name)=>page.locator('[data-action="'+name+'"]').click({timeout:12000});
function watch(page,id){page.on('pageerror',e=>errors.push(id+': '+e.message));}
async function api(page,edition,code,token){
 return page.evaluate(async({edition,code,token})=>{
  const prefix=edition==='cascade'?'/cascade':'';
  const response=await fetch(prefix+'/api/rooms/'+code,{
   headers:{Authorization:'Bearer '+token},cache:'no-store'
  });
  if(!response.ok)throw Error('Room read failed '+response.status);
  return response.json();
 },{edition,code,token});
}
const classicAnswers=[
 'A: The goose mayor issues an official permit for public honking and asks residents to file a stamped certificate.',
 'B: Every citizen must attend a mandatory pond meeting before requesting a building permit from city hall.',
 'C: The municipal assistant declares all council speeches must be approved by an elected duck committee.'
].join('\n');
const cascadeReply='The municipal assistant approves an unusual civic procedure, requires an official stamped form, and asks residents to attend a strangely formal emergency meeting at city hall next Tuesday.';

try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 // Classic: one click -> one private screen, no host tab.
 const classic=await context.newPage();watch(classic,'Classic');
 await classic.goto(base+'/',{waitUntil:'domcontentloaded'});
 assert.equal(context.pages().length,1);
 await a(classic,'solo_launch');
 await classic.waitForURL(/\/play\/[A-HJ-NP-Z2-9]{6}$/, {timeout:18000});
 const classicCode=new URL(classic.url()).pathname.split('/').pop();
 await classic.locator('#profile').waitFor({state:'visible',timeout:18000});
 assert.equal(context.pages().length,1,'Classic solo must not open another tab');
 const ch=await classic.evaluate(code=>localStorage.getItem('aflive:host:'+code),classicCode);
 const cp=await classic.evaluate(code=>localStorage.getItem('aflive:player:'+code),classicCode);
 assert(ch&&cp&&ch!==cp);
 let cs=await api(classic,'classic',classicCode,cp);
 let hostState=await api(classic,'classic',classicCode,ch);
 assert.equal(cs.player_count,4);assert.equal(cs.npc_count,3);assert.equal(cs.human_count,1);
 assert.equal(cs.judge_id,cs.me.id);
 const classicPrompt=classic.locator('details.persistent-prompt');
 await classicPrompt.waitFor({state:'visible',timeout:10000});
 assert.equal(await classicPrompt.getAttribute('data-prompt-id'),cs.scenario.id);
 assert.equal(await classicPrompt.evaluate(el=>getComputedStyle(el).position),'sticky');
 await classicPrompt.locator('summary').click();
 assert.match(await classicPrompt.innerText(),/BREAKPOINT A/i);
 await classicPrompt.locator('summary').click();
 assert(cs.fault,'Only private player session sees Judge Fault');
 assert.equal(hostState.fault,null,'Shared host session cannot see private Fault');
 assert.equal(cs.generation_calls,0);
 assert.match(await classic.locator('.solo-panel').innerText(),/ONE SCREEN/i);

 await classic.locator('#profile').fill('An extremely nervous government official');
 await a(classic,'lock_profile');
 await classic.locator('#solo-responses').waitFor({state:'attached',timeout:15000});
 assert.equal(await classicPrompt.getAttribute('data-prompt-id'),cs.scenario.id,'Scenario must remain pinned during generation');
 await classic.locator('details.solo-manual summary').click();
 await classic.locator('#solo-responses').fill(classicAnswers);
 await a(classic,'solo_manual');
 await classic.locator('[data-act="spotlight:A"]').waitFor({state:'visible',timeout:15000});
 await a(classic,'spotlight:A');
 await classic.locator('[data-act="propose_bonus"]').waitFor({state:'visible',timeout:15000});
 await a(classic,'propose_bonus');
 await classic.locator('[data-act="approve_yes"]').waitFor({state:'visible',timeout:15000});
 await a(classic,'approve_yes');
 await classic.locator('[data-act="solo_finalize"]').waitFor({state:'visible',timeout:15000});
 await a(classic,'solo_finalize');
 cs=await api(classic,'classic',classicCode,cp);
 assert.equal(cs.phase,'results');
 assert.equal(cs.players.reduce((n,p)=>n+p.score,0),1);
 assert.equal(cs.generation_calls,0);
 await a(classic,'solo_next');
 cs=await api(classic,'classic',classicCode,cp);
 assert.equal(cs.round,2);
 await classic.locator('details.persistent-prompt[data-prompt-id="'+cs.scenario.id+'"]').waitFor({state:'visible',timeout:12000});
 assert.equal(await classicPrompt.getAttribute('data-prompt-id'),cs.scenario.id,'Pin must update when the Scenario changes');
 assert.equal(cs.phase,'submit','NPC Judge should prepare automatically');
 assert.equal(cs.fault,null,'Non-Judge cannot see private Fault');
 assert.equal(cs.me.hand.length,4);
 console.log('PASS: Classic one-screen solo — one-click room, 3 NPCs, privacy, mocked judging, results and NPC Judge');

 // Cascade: same flow in its dedicated browser app, no second host tab.
 const cascade=await context.newPage();watch(cascade,'Cascade');
 await cascade.goto(base+'/cascade/',{waitUntil:'domcontentloaded'});
 await b(cascade,'solo-launch');
 await cascade.waitForURL(/\/cascade\/play\/[A-HJ-NP-Z2-9]{6}$/, {timeout:18000});
 const cascadeCode=new URL(cascade.url()).pathname.split('/').pop();
 await cascade.locator('#profile').waitFor({state:'visible',timeout:18000});
 assert.equal(context.pages().length,2,'Each game should occupy only its own tab');
 const dh=await cascade.evaluate(code=>localStorage.getItem('cascade:host:'+code),cascadeCode);
 const dp=await cascade.evaluate(code=>localStorage.getItem('cascade:player:'+code),cascadeCode);
 assert(dh&&dp&&dh!==dp);
 let ds=await api(cascade,'cascade',cascadeCode,dp);
 hostState=await api(cascade,'cascade',cascadeCode,dh);
 assert.equal(ds.phase,'setup');assert.equal(ds.player_count,4);
 assert.equal(ds.npc_count,3);assert(ds.fault);
 const cascadeRail=cascade.locator('.persistent-prompt-bar');
 await cascadeRail.waitFor({state:'visible',timeout:10000});
 assert.equal(await cascadeRail.evaluate(el=>getComputedStyle(el).position),'sticky');
 assert.equal(await cascadeRail.locator('.persistent-prompt-card').count(),1,'Only Scenario is public before Interferences');
 assert.equal(await cascadeRail.locator('[data-prompt-id]').first().getAttribute('data-prompt-id'),ds.scenario.id);
 await cascadeRail.locator('summary').first().click();
 assert.match(await cascadeRail.innerText(),/BREAKPOINT A/i);
 await cascadeRail.locator('summary').first().click();
 assert.equal(hostState.fault,null);
 assert.equal(ds.generation_calls,0);
 assert.match(await cascade.locator('.solo-panel').innerText(),/ONE SCREEN/);
 await cascade.locator('#profile').fill('A cheerful and totally unqualified clerk.');
 await b(cascade,'lock-profile');
 for(let step=0;step<8;step++){
  ds=await api(cascade,'cascade',cascadeCode,dp);
  if(ds.phase==='judging')break;
  assert(['baseline','cascade'].includes(ds.phase),'No human Handoff required with 3 NPCs in round 1');
  const active=ds.current_card||[...ds.timeline].reverse().find(item=>item.kind==='card')?.card;
  await cascade.waitForFunction(({scenarioId,activeId})=>{
   const cards=[...document.querySelectorAll('.persistent-prompt-bar .persistent-prompt-card')];
   return cards.length===(activeId?2:1)&&cards[0]?.dataset.promptId===scenarioId
     &&(!activeId||cards[1]?.dataset.promptId===activeId);
  },{scenarioId:ds.scenario.id,activeId:active?.id||null},{timeout:12000});
  assert.equal(await cascadeRail.locator('[data-prompt-id]').first().getAttribute('data-prompt-id'),ds.scenario.id,'Scenario must stay pinned through every generation step');
  assert.equal(await cascadeRail.locator('.persistent-prompt-card').count(),active?2:1,'Only publicly played Interferences may appear');
  if(active)assert.equal(await cascadeRail.locator('.persistent-prompt-card').last().getAttribute('data-prompt-id'),active.id,'Pin must track current or most recent Interference');
  await cascade.locator('details.solo-manual summary').click();
  await cascade.locator('#solo-manual').fill(cascadeReply);
  await b(cascade,'solo-reply');
  await cascade.locator('details.solo-manual').waitFor({state:'attached',timeout:15000}).catch(()=>{});
 }
 ds=await api(cascade,'cascade',cascadeCode,dp);
 assert.equal(ds.phase,'judging');
 await cascade.waitForFunction(()=>document.querySelectorAll('.persistent-prompt-bar .persistent-prompt-card').length===2,null,{timeout:12000});
 assert.equal(await cascadeRail.locator('.persistent-prompt-card').count(),2,'Last played card stays pinned during judging');
 assert.equal(ds.replies.length,6);
 assert.equal(ds.timeline.filter(x=>x.kind==='handoff').length,3);
 await cascade.locator('input[name="spotlight"]').first().check();
 await b(cascade,'propose-awards');
 ds=await api(cascade,'cascade',cascadeCode,dp);
 assert.equal(ds.phase,'challenge');
 // No Bonus was proposed; no challenge window is necessary.
 await b(cascade,'solo-finalize');
 ds=await api(cascade,'cascade',cascadeCode,dp);
 assert.equal(ds.phase,'results');
 assert.equal(ds.generation_calls,0);
 await b(cascade,'solo-next');
 ds=await api(cascade,'cascade',cascadeCode,dp);
 assert.equal(ds.round,2);
 await cascade.locator('.persistent-prompt-card[data-prompt-id="'+ds.scenario.id+'"]').first().waitFor({state:'visible',timeout:12000});
 assert.equal(await cascadeRail.locator('[data-prompt-id]').first().getAttribute('data-prompt-id'),ds.scenario.id,'Scenario pin must reset each new round');
 assert.equal(await cascadeRail.locator('.persistent-prompt-card').count(),1,'Previous round Interference must not leak into the next round');
 assert.equal(ds.phase,'baseline','NPC Judge profile should lock itself');
 assert.equal(ds.fault,null,'NPC Judge Fault must remain hidden from human');
 console.log('PASS: Cascade one-screen solo — one-click setup, NPC Handoffs, Judge, privacy, full round, zero AI calls');
 assert.deepEqual(errors,[]);
 console.log('PASS: Zero browser exceptions and no unrequested model generation');
}finally{await browser.close();}
