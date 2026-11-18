import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base='http://127.0.0.1:8765/card-games/agent-fault/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[];
const attach=page=>page.on('pageerror',err=>errors.push(err.message));
const verifyStage=async(page,selector,expected)=>{
  const text=await page.locator(selector).textContent();
  assert.equal(text.trim(),expected);
};
async function syntheticTouchSwipe(page,selector,dx,dy=0) {
  await page.locator(selector).evaluate((el,{dx,dy})=>{
    const t1=new Touch({identifier:101,target:el,clientX:220,clientY:360});
    el.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[t1],targetTouches:[t1],changedTouches:[t1]}));
    const t2=new Touch({identifier:101,target:el,clientX:220+dx,clientY:360+dy});
    el.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],targetTouches:[],changedTouches:[t2]}));
  },{dx,dy});
}
try {
  const classic=await browser.newPage({viewport:{width:1440,height:900}});
  attach(classic);
  await classic.goto(base+'classic-demo.html',{waitUntil:'domcontentloaded'});
  await classic.locator('.afd-viewer').waitFor();
  assert.equal(await classic.locator('.afd-dot').count(),6,'Classic: six progress dots');
  assert.equal(await classic.locator('[data-afd-action="toggle"]').count(),0,'Classic: autoplay controls removed');
  await verifyStage(classic,'.afd-title','A goose became mayor.');
  await classic.locator('.afd-edge-next').click();
  await verifyStage(classic,'.afd-title','Choose how to ruin its day.');
  await classic.locator('.afd-edge-prev').click();
  await verifyStage(classic,'.afd-title','A goose became mayor.');
  await classic.locator('.afd-dot').nth(4).click();
  await verifyStage(classic,'.afd-title','Which disaster wins?');
  assert.equal(await classic.locator('.afd-dot[aria-current="step"]').count(),1);
  await classic.locator('.afd-viewer').focus();
  await classic.keyboard.press('Home');
  await verifyStage(classic,'.afd-title','A goose became mayor.');
  await classic.keyboard.press('ArrowRight');
  await verifyStage(classic,'.afd-title','Choose how to ruin its day.');
  const card=classic.locator('[data-afd-card="AF-INF-001"]');
  await card.click();
  assert.equal(await card.getAttribute('aria-pressed'),'true','Classic: card interaction retained');
  await verifyStage(classic,'.afd-title','Choose how to ruin its day.');
  await classic.locator('.afd-dot').first().click();
  await syntheticTouchSwipe(classic,'.afd-viewer',-130);
  await verifyStage(classic,'.afd-title','Choose how to ruin its day.');
  await syntheticTouchSwipe(classic,'.afd-viewer',-120,150);
  await verifyStage(classic,'.afd-title','Choose how to ruin its day.'); // vertical movement must not advance
  console.log('PASS: Classic chevrons, dots, keyboard, swipe, no autoplay, card selection');

  const cascade=await browser.newPage({viewport:{width:1440,height:900}});
  attach(cascade);
  await cascade.goto(base+'cascade-demo.html',{waitUntil:'domcontentloaded'});
  await cascade.locator('.cd-viewer').waitFor();
  assert.equal(await cascade.locator('.cd-scene-dot[aria-current="step"]').getAttribute('data-jump'),'0','Cascade: first dot starts on the intro scene');
  assert.equal(await cascade.locator('.cd-showcase-decks').count(),1,'Cascade: opening artwork introduces the deck');
  assert.equal(await cascade.locator('.cd-scene-dot').count(),6,'Cascade: six scene dots');
  assert.equal(await cascade.locator('[data-play]').count(),0,'Cascade: autoplay controls removed');
  await verifyStage(cascade,'.cd-copy h1','The AI is about to lose its mind.');
  await cascade.locator('.cd-edge-next').click();
  await verifyStage(cascade,'.cd-copy h1','A goose is running city hall.');
  await cascade.locator('.cd-scene-dot').nth(4).click();
  await verifyStage(cascade,'.cd-copy h1','Oh, you thought that was bad?');
  const reaction=cascade.locator('[data-reaction="role"]');
  await reaction.click();
  assert.equal(await reaction.getAttribute('aria-pressed'),'true','Cascade: Handoff branch updates selection');
  assert.match(await cascade.locator('.cd-handoff-result').innerText(),/mayoral orders|mayor/i,'Cascade: updated Handoff appears in demo');
  await cascade.locator('.cd-edge-next').click();
  await verifyStage(cascade,'.cd-copy h1','Who gets credit for this?');
  await cascade.locator('.cd-edge-prev').click();
  await verifyStage(cascade,'.cd-copy h1','Oh, you thought that was bad?');
  await cascade.locator('.cd-scene-dot').nth(2).click();
  await cascade.locator('[data-inspect="AF-INF-013"]').click();
  await cascade.locator('#cd-inspect [role="dialog"]').waitFor();
  await cascade.locator('#cd-inspect [data-close]').click();
  assert.equal(await cascade.locator('#cd-inspect').count(),0,'Cascade: card preview closes');
  await cascade.locator('.cd-viewer').focus();
  await cascade.keyboard.press('Home');
  await verifyStage(cascade,'.cd-copy h1','The AI is about to lose its mind.');
  await syntheticTouchSwipe(cascade,'.cd-viewer',-140);
  await verifyStage(cascade,'.cd-copy h1','A goose is running city hall.');
  console.log('PASS: Cascade chevrons, dots, keyboard, swipe, Handoff branches, card preview');

  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  attach(mobile);
  await mobile.goto(base+'classic-demo.html',{waitUntil:'domcontentloaded'});
  await mobile.locator('.afd-edge-next').click({timeout:8000});
  await verifyStage(mobile,'.afd-title','Choose how to ruin its day.');
  await syntheticTouchSwipe(mobile,'.afd-viewer',-120);
  await verifyStage(mobile,'.afd-title','Nobody knows who did it.');
  await mobile.goto(base+'cascade-demo.html',{waitUntil:'domcontentloaded'});
  await mobile.locator('.cd-edge-next').click({timeout:8000});
  await verifyStage(mobile,'.cd-copy h1','A goose is running city hall.');
  await syntheticTouchSwipe(mobile,'.cd-viewer',-120);
  await verifyStage(mobile,'.cd-copy h1','Choose the first mistake.');
  console.log('PASS: 390px mobile arrow click and swipe gestures in both demos');

  const integrated=await browser.newPage({viewport:{width:1200,height:880}});
  attach(integrated);
  await integrated.goto(base,{waitUntil:'domcontentloaded'});
  // Computed colors, not just source tokens: test actual CSS cascade on the public subpage.
  const colors=await integrated.evaluate(()=>{
    const bg=selector=>getComputedStyle(document.querySelector(selector)).backgroundColor;
    const bd=selector=>getComputedStyle(document.querySelector(selector)).borderTopColor;
    const body=getComputedStyle(document.body);
    return {
      navy:body.backgroundColor,
      lime:body.getPropertyValue('--gd-accent').trim(),
      violet:body.getPropertyValue('--af-violet').trim(),
      coral:body.getPropertyValue('--af-coral').trim(),
      paper:bg('.gd-paper'),
      demo:bg('#animated-demo'),
      carousel:bg('.af-steps-carousel'),
      stepCard:bg('.af-step-card'),
      playGallery:bg('.af-mode-carousel'),
      classicAccent:bd('.af-mode-carousel'),
      model:bg('#box-cards'),
      art:bg('.gd-art-section'),
      activeTab:bg('#af-tab-classic')
    };
  });
  assert.deepEqual(colors,{
    navy:'rgb(20, 23, 54)',lime:'#E5F91B',violet:'#C982EC',coral:'#FF7568',
    paper:'rgb(241, 239, 247)',demo:'rgb(32, 36, 75)',
    carousel:'rgb(228, 226, 239)',stepCard:'rgb(250, 249, 253)',
    playGallery:'rgb(250, 249, 253)',classicAccent:'rgb(229, 249, 27)',
    model:'rgb(32, 36, 75)',art:'rgb(20, 23, 54)',
    activeTab:'rgb(229, 249, 27)'
  },'Unified site palette should apply in the rendered page');
  await integrated.locator('.af-mode-arrow[data-dir="1"]').click();
  assert.equal(await integrated.locator('.af-mode-carousel').getAttribute('data-active'),'1');
  await integrated.waitForFunction(()=>{
    const e=document.querySelector('.af-mode-carousel');
    return e?.dataset.active==='1'&&getComputedStyle(e).borderTopColor==='rgb(201, 130, 236)';
  },null,{timeout:5000}); // Wait for CSS border-color transition and smooth scroll to settle.
  await integrated.locator('.af-mode-arrow[data-dir="1"]').click();
  assert.equal(await integrated.locator('.af-mode-carousel').getAttribute('data-active'),'2');
  await integrated.waitForFunction(()=>{
    const e=document.querySelector('.af-mode-carousel');
    return e?.dataset.active==='2'&&getComputedStyle(e).borderTopColor==='rgb(255, 117, 104)';
  },null,{timeout:5000});
  console.log('PASS: unified palette across hero, demos, how-to, play formats, product and artwork');
  await integrated.locator('#af-panel-classic .afd-edge-next').click();
  await verifyStage(integrated,'#af-panel-classic .afd-title','Choose how to ruin its day.');
  await integrated.locator('#af-tab-cascade').click();
  await integrated.locator('#af-panel-cascade .cd-edge-next').click();
  await verifyStage(integrated,'#af-panel-cascade .cd-copy h1','A goose is running city hall.');
  assert.equal(await integrated.locator('.af-mode-slide').count(),3,'Original three-mode gallery preserved');
  console.log('PASS: Both embedded demos and original three-mode gallery survive integration');
  assert.deepEqual(errors,[],'No browser runtime errors');
  console.log('PASS: all AGENT/FAULT browser navigation checks');
} finally {
  await browser.close();
}
