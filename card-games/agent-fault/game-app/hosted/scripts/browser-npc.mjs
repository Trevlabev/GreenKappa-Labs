/**
 * Browser acceptance of Classic NPCs and private-tab Host Also Plays.
 * Run against an isolated local Wrangler Worker. No model requests.
 * CI installs Playwright as a transient development-only dependency.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base=(process.argv[2]||'http://127.0.0.1:8787').replace(/\/$/,'');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
const errors=[];
const expectNoErrors=(page,where)=>{
  page.on('pageerror',error=>errors.push(where+': '+error.message));
};
async function waitFor(page,selector,timeout=12000){
  return page.locator(selector).waitFor({state:'visible',timeout});
}
async function clickAct(page,act){
  await page.locator('[data-act="'+act+'"]').click({timeout:10000});
}
async function api(page,code,token) {
  return page.evaluate(async ({code,token})=>{
    const res=await fetch('/api/rooms/'+code,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
    if(!res.ok)throw Error('Room API HTTP '+res.status);
    return res.json();
  },{code,token});
}
try {
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const host=await context.newPage();
  expectNoErrors(host,'shared host');
  await host.goto(base+'/',{waitUntil:'domcontentloaded'});
  await clickAct(host,'create');
  await host.waitForURL(/\/host\/[A-HJ-NP-Z2-9]{6}$/,{timeout:12000});
  const code=new URL(host.url()).pathname.split('/').pop();
  assert.match(code,/^[A-HJ-NP-Z2-9]{6}$/);
  await waitFor(host,'#host-nickname');
  assert.match(await host.locator('#app').innerText(),/HOST ALSO PLAYS/);
  assert.match(await host.locator('#app').innerText(),/0\/8 seats filled/);

  // Must create an actual private player popup and retain the host display.
  await host.locator('#host-nickname').fill('Solo Host');
  const popupPromise=host.waitForEvent('popup',{timeout:10000});
  await clickAct(host,'host_play');
  const player=await popupPromise;
  expectNoErrors(player,'private player');
  await player.setViewportSize({width:390,height:844});
  await player.waitForURL(new RegExp('/play/'+code+'$'),{timeout:12000});
  await waitFor(player,'.playerlist');
  await waitFor(host,'#npc-count');
  assert.match(await player.locator('#app').innerText(),/SOLO HOST/i);
  assert.equal(new URL(host.url()).pathname,'/host/'+code,'Shared host display must stay on host route');
  assert.equal(await host.locator('[data-act="host_play"]').count(),0,
    'Host Already Plays control must not create a duplicate player seat');
  assert.equal(await host.locator('a[href="/play/'+code+'"]').count(),1);

  // Adjust NPC seats using the actual select and action button.
  await host.locator('#npc-count').selectOption('3');
  await clickAct(host,'set_npcs');
  await host.locator('.playerlist .playerrow').filter({hasText:'CHAOS.EXE'}).waitFor({timeout:12000});
  const labels=await host.locator('.playerrow .pill').allTextContents();
  assert.equal(labels.filter(x=>x.trim()==='NPC').length,3);
  await waitFor(host,'#npc-count');
  assert.match(await host.locator('#app').innerText(),/1 human \+ 3 NPCs/i);

  // Verify that exactly one private human session can see their four-card hand.
  await clickAct(host,'start');
  await waitFor(player,'#profile');
  await player.locator('#profile').fill('A municipal clerk with irrational confidence');
  await clickAct(player,'lock_profile');
  await host.locator('#responses').waitFor({state:'attached',timeout:15000});
  const hostVisible=await host.locator('#app').innerText();
  assert.doesNotMatch(hostVisible,/YOUR FOUR PRIVATE INTERFERENCES/i);
  const hostToken=await host.evaluate(c=>localStorage.getItem('aflive:host:'+c),code);
  const playerToken=await player.evaluate(c=>localStorage.getItem('aflive:player:'+c),code);
  assert(hostToken&&playerToken&&hostToken!==playerToken,'Host and player sessions must have different secrets');
  let h=await api(host,code,hostToken);
  let p=await api(player,code,playerToken);
  assert.equal(h.phase,'generate');
  assert.equal(h.player_count,4);
  assert.equal(h.npc_count,3);
  assert.equal(h.generation_calls,0);
  assert.equal(h.me.role,'host');
  assert.equal(h.me.hand?.length??0,0);
  assert.equal(p.me.role,'player');
  assert.equal(p.me.hand.length,4);
  assert.equal(p.me.is_judge,true);
  assert.equal(p.fault!==null,true,'Human Judge privately sees the secret Fault');
  assert.equal(h.fault,null,'Shared host must not see the secret Fault before reveal');

  // No paid AI call: fill the explicit manual fallback with three mock answers.
  const manual=host.locator('details').filter({has:host.locator('#responses')});
  await manual.locator('summary').click();
  await host.locator('#responses').fill(
    'A: City hall should use an absurd goose-themed public consultation desk.\n'+
    'B: A fictional bureaucrat demands ceremonial honks on every permit.\n'+
    'C: An assistant drafts an overly dramatic mayoral pond statement.');
  await clickAct(host,'manual_answers');
  await waitFor(player,'button[data-act="spotlight:A"]');
  await clickAct(player,'spotlight:A');
  await waitFor(player,'button[data-act="propose_bonus"]');
  await clickAct(player,'propose_bonus');
  await waitFor(player,'button[data-act="approve_yes"]');
  h=await api(host,code,hostToken);
  assert.equal(h.phase,'review');
  assert.equal(Object.keys(h.approvals).length,3,'All three NPCs should vote automatically');
  await clickAct(player,'approve_yes');
  await waitFor(host,'button[data-act="finalize"]');
  await clickAct(host,'finalize');
  h=await api(host,code,hostToken);
  assert.equal(h.phase,'results');
  assert.equal(h.players.reduce((sum,item)=>sum+item.score,0),1);
  assert.equal(h.generation_calls,0);
  await clickAct(host,'next');
  h=await api(host,code,hostToken);
  p=await api(player,code,playerToken);
  assert.equal(h.round,2);
  assert.equal(h.phase,'submit','NPC Judge should automatically lock their profile');
  assert.equal(h.players.find(item=>item.is_judge)?.is_npc,true);
  assert.equal(h.fault,null,'NPC Judge Fault must remain private');
  assert.equal(p.fault,null,'Non-Judge human cannot read secret Fault');
  await waitFor(player,'button[data-act="submit"]');
  assert.equal(await host.locator('#app .gamecard').count(),0,'Shared screen must not show private card choices');
  await player.locator('.gamecard').first().click();
  await clickAct(player,'submit');
  h=await api(host,code,hostToken);
  assert.equal(h.phase,'generate');
  assert.equal(h.generation_calls,0);
  assert.deepEqual(errors,[],'No page exceptions expected');
  console.log('PASS: Classic NPC browser UX — 1 human, 3 NPCs, private-tab host, no secret leak, full round, NPC Judge rotation, zero AI calls');
} finally {
  await browser.close();
}
