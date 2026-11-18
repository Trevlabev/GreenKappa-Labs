/**
 * Browser acceptance for Cascade NPCs and private Host Also Plays.
 * Local Wrangler and manual replies: no model requests.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=(process.argv[2]||'http://127.0.0.1:8787').replace(/\/$/,'');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
const errors=[];
function watch(page,name){page.on('pageerror',error=>errors.push(name+': '+error.message));}
async function button(page,action){await page.locator('[data-action="'+action+'"]').click({timeout:13000});}
async function state(page,code,token){
 return page.evaluate(async({code,token})=>{
  const r=await fetch('/cascade/api/rooms/'+code,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(!r.ok)throw Error('Read room state: HTTP '+r.status);
  return r.json();
 },{code,token});
}
async function roomAction(page,code,token,name,data={}){
 return page.evaluate(async({code,token,name,data})=>{
  const r=await fetch('/cascade/api/rooms/'+code+'/action',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({name,data})
  });
  const payload=await r.json();
  if(!r.ok)throw Error('Room action '+name+' failed: '+r.status+' '+JSON.stringify(payload));
  return payload;
 },{code,token,name,data});
}
const reply='The fictional assistant explains an unusual municipal proposal with a carefully organized plan, several bureaucratic steps, and one completely unnecessary but surprisingly specific requirement.';
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const host=await context.newPage();watch(host,'host');
 await host.goto(base+'/cascade/',{waitUntil:'domcontentloaded'});
 await button(host,'create');
 await host.waitForURL(/\/cascade\/host\/[A-HJ-NP-Z2-9]{6}$/,{timeout:15000});
 const code=new URL(host.url()).pathname.split('/').pop();
 await host.locator('#host-nickname').waitFor({state:'visible',timeout:15000});
 assert.match(await host.locator('#app').innerText(),/HOST ALSO PLAYS/i);

 // The shared host display must never reveal private cards or the Fault.
 await host.locator('#host-nickname').fill('Solo Cascade Host');
 const popupPromise=host.waitForEvent('popup',{timeout:12000});
 await button(host,'host-play');
 const player=await popupPromise;watch(player,'private player');
 await player.setViewportSize({width:390,height:844});
 await player.waitForURL(new RegExp('/cascade/play/'+code+'$'),{timeout:15000});
 await host.locator('a[href="/cascade/play/'+code+'"]').waitFor({state:'visible',timeout:15000});
 assert.equal(await host.locator('[data-action="host-play"]').count(),0);
 await host.locator('#npc-count').selectOption('3');
 await button(host,'set-npcs');
 await host.locator('.roster-item').filter({hasText:'CHAOS.EXE'}).waitFor({timeout:12000});
 assert.equal(await host.locator('.roster-item .badge.lime').count(),3);
 await button(host,'start');
 await player.locator('#profile').waitFor({state:'visible',timeout:15000});
 const hostToken=await host.evaluate(c=>localStorage.getItem('cascade:host:'+c),code);
 const playerToken=await player.evaluate(c=>localStorage.getItem('cascade:player:'+c),code);
 assert(hostToken&&playerToken&&hostToken!==playerToken);
 let h=await state(host,code,hostToken),p=await state(player,code,playerToken);
 assert.equal(h.phase,'setup');assert.equal(h.npc_count,3);assert.equal(h.human_count,1);
 assert.equal(h.fault,null,'Shared host cannot show secret Judge Fault');
 assert.equal(p.me.is_judge,true);assert(p.fault,'Private human Judge sees their Fault');
 assert.equal(h.me.role,'host');assert.equal(p.me.role,'player');

 // Use mobile-sized private controller for the Judge's profile.
 await player.locator('#profile').fill('A nervous municipal clerk convinced that every rumor is official.');
 await button(player,'lock-profile');
 h=await state(host,code,hostToken);
 assert.equal(h.phase,'baseline');
 await host.locator('details').filter({has:host.locator('#manual')}).locator('summary').click();
 await host.locator('#manual').fill(reply);
 await button(host,'manual');
 h=await state(host,code,hostToken);
 assert.equal(h.phase,'cascade','NPCs lock their three cards automatically');
 assert.equal(h.locked_count,3);
 assert.equal(h.generation_calls,0);
 for(let attempts=0;attempts<12&&h.phase!=='judging';attempts++){
  assert.equal(h.phase,'cascade','Each NPC Handoff should advance automatically');
  h=await roomAction(host,code,hostToken,'manual_reply',{text:reply});
 }
 assert.equal(h.phase,'judging');
 assert.equal(h.replies.length,6);
 const handoffs=h.timeline.filter(x=>x.kind==='handoff');
 assert.equal(handoffs.length,3);
 assert.equal(new Set(handoffs.map(x=>x.text)).size,3);
 assert.equal(h.generation_calls,0);
 assert.doesNotMatch(await host.locator('#app').innerText(),/YOUR FOUR-CARD PRIVATE HAND/i);
 assert.deepEqual(errors,[]);
 console.log('PASS: Cascade NPC browser UX — mobile private host-player, three distinct Handoffs, no secret leaks, no model calls');
}finally{await browser.close();}
