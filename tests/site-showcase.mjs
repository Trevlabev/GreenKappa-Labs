import assert from "node:assert/strict";
import {chromium} from "playwright";

const origin="http://127.0.0.1:8765";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const faults=[];
const attached=p=>p.on("pageerror",err=>faults.push(err.message));
try{
  const desktop=await browser.newPage({viewport:{width:1440,height:900}});
  attached(desktop);
  await desktop.goto(origin+"/",{waitUntil:"networkidle"});
  const slideCount=await desktop.locator("[data-showcase-slide]").count();
  assert.ok(slideCount>=8,"Homepage includes Flowglass and at least seven other projects");
  assert.equal(await desktop.locator("[data-showcase-tab]").count(),slideCount,"Every slide has a gallery tab");
  const labels=await desktop.locator("[data-showcase-slide]").evaluateAll(els=>els.map(e=>e.getAttribute("aria-label")));
  assert.deepEqual(labels.map((v,i)=>v.startsWith((i+1)+" of "+slideCount+": ")),Array(slideCount).fill(true),"Slide accessibility labels");
  const flowglassIndex=await desktop.locator("[data-showcase-slide]").evaluateAll(els=>els.findIndex(e=>e.classList.contains("gkl-theme-flowglass")));
  assert.ok(flowglassIndex>=0,"Flowglass has a gallery slide");
  await desktop.locator('[data-showcase-tab="'+flowglassIndex+'"]').click();
  const slide=desktop.locator('.gkl-showcase-slide.gkl-theme-flowglass');
  assert.match(await slide.getAttribute("class"),/is-active/,"Flowglass gallery slide can be selected");
  assert.equal(await slide.locator("a.gkl-slide-cover-link").getAttribute("href"),"flowglass/");
  const desktopImage=slide.locator("picture img");
  await desktopImage.evaluate(img=>img.decode());
  assert.ok((await desktopImage.evaluate(img=>img.currentSrc)).includes("flowglass-gallery-wide.webp"),"Wide artwork selected");
  assert.equal(await desktopImage.evaluate(img=>img.naturalWidth),1672,"Wide asset loads");
  assert.match(await slide.locator(".gkl-flowglass-art-note").textContent(),/Illustrative concept art/,"Disclaimer text exists");
  await slide.locator(".gkl-flowglass-art-note").waitFor({state:"visible",timeout:5000});
  assert.ok(await slide.locator(".gkl-flowglass-art-note").isVisible(),"Desktop disclaimer is visible");
  const filingIndex=await desktop.locator("[data-showcase-slide]").evaluateAll(els=>els.findIndex(e=>e.classList.contains("gkl-theme-filingproof")));
  assert.ok(filingIndex>=0,"FilingProof should have a gallery slide");
  await desktop.locator('[data-showcase-tab="'+filingIndex+'"]').click();
  const filing=desktop.locator(".gkl-theme-filingproof");
  assert.match(await filing.getAttribute("class"),/is-active/,"FilingProof gallery slide selectable");
  assert.equal(await filing.locator("a.gkl-slide-cover-link").getAttribute("href"),"filingproof/");
  const filingWide=filing.locator("picture img");
  await filingWide.evaluate(img=>img.decode());
  assert.match(await filingWide.evaluate(img=>img.currentSrc),/filingproof-gallery\.webp/);
  assert.equal(await filingWide.evaluate(img=>img.naturalWidth),1400,"FilingProof wide image loads");
  await filing.locator(".gkl-filingproof-art-note").waitFor({state:"visible",timeout:5000});
  assert.match(await filing.locator(".gkl-filingproof-art-note").innerText(),/Illustrative concept art/);
  const filingHomepage=desktop.locator(".gkl-tools-product-filing img");
  await filingHomepage.evaluate(img=>img.decode());
  assert.match(await filingHomepage.evaluate(img=>img.currentSrc),/filingproof-feature\.webp/);

  await desktop.goto(origin+"/tools/",{waitUntil:"networkidle"});
  assert.ok(await desktop.locator(".gkt-release-card").count()>=3,"Tools page presents all three working application cards");
  assert.ok(await desktop.locator(".gkt-product-list > article.gkt-product").count()>=6,"Existing Tools products remain listed");
  const launch=desktop.locator('.gkt-release-flowglass a[href="/flowglass/"]');
  assert.ok(await launch.count()>0,"Tools page links to live application");
  const hero=desktop.locator(".gkt-hero-product img");
  await hero.evaluate(img=>img.decode());
  assert.equal(await hero.evaluate(img=>img.naturalWidth),1672,"Tools feature image loads");
  const toolsPageCaption=await desktop.locator(".gkt-hero-product figcaption").innerText();
  assert.match(toolsPageCaption,/Not an actual UI screenshot/);
  const filingTools=desktop.locator("#filingproof .gkt-filing-promo img");
  await filingTools.evaluate(img=>img.decode());
  assert.equal(await filingTools.evaluate(img=>img.naturalWidth),1200,"FilingProof Tools artwork loads");
  assert.match(await desktop.locator("#filingproof .gkt-filing-promo figcaption").innerText(),/Conceptual promotional artwork/);
  assert.ok(await desktop.locator('#filingproof a[href="/filingproof/"]').count()>=1,"FilingProof launch link works");

  await desktop.goto(origin+"/flowglass/",{waitUntil:"networkidle"});
  await desktop.locator(".fg-node").first().waitFor();
  assert.equal(await desktop.locator(".fg-node").count(),9,"Flowglass application still works");

  for (const width of [390,320]){
    const mobile=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    attached(mobile);
    await mobile.goto(origin+"/",{waitUntil:"networkidle"});
    assert.equal(await mobile.locator("[data-showcase-tab]").count(),slideCount);
    await mobile.locator('[data-showcase-tab="'+flowglassIndex+'"]').click();
    const img=mobile.locator(".gkl-theme-flowglass picture img");
    await img.evaluate(img=>img.decode());
    const selected=await img.evaluate(img=>img.currentSrc);
    assert.match(selected,/flowglass-gallery-mobile\.webp/,"Square image should be selected on mobile");
    assert.equal(await img.evaluate(img=>img.naturalWidth),1254);
    await mobile.locator('[data-showcase-tab="'+filingIndex+'"]').click();
    const filingMobile=mobile.locator(".gkl-theme-filingproof picture img");
    await filingMobile.evaluate(img=>img.decode());
    assert.match(await filingMobile.evaluate(img=>img.currentSrc),/filingproof-gallery-mobile\.webp/);
    assert.equal(await filingMobile.evaluate(img=>img.naturalWidth),900,"FilingProof square mobile image loads");
    assert.notEqual(await mobile.locator(".gkl-theme-filingproof .gkl-art-mobile-caption").evaluate(el=>getComputedStyle(el).display),"none");

    const styles=await mobile.locator(".gkl-theme-flowglass .gkl-art-mobile-caption").evaluate(el=>({display:getComputedStyle(el).display,background:getComputedStyle(el).backgroundImage}));
    assert.notEqual(styles.display,"none","Mobile caption visible");
    assert.ok(styles.background.includes("linear-gradient"),"Mobile caption extends gallery art");
    const ctl=await mobile.locator(".gkl-showcase-controls").evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth}));
    assert.ok(ctl.scroll<=ctl.width+4,"Gallery controls fit width "+width+"px: "+JSON.stringify(ctl));
    await mobile.goto(origin+"/tools/",{waitUntil:"networkidle"});
    const toolOverflow=await mobile.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
    assert.ok(toolOverflow.scroll<=toolOverflow.width+4,"Tools page should not overflow at "+width+": "+JSON.stringify(toolOverflow));
    const source=await mobile.locator(".gkt-release-flowglass picture img").evaluate(img=>img.currentSrc);
    assert.match(source,/flowglass-gallery-mobile\.webp/,"Mobile product picture uses square rendering");
    await mobile.close();
  }
  assert.deepEqual(faults,[],"Uncaught browser errors");
  console.log("PASS: dynamic "+slideCount+"-slide gallery, Flowglass and FilingProof desktop/mobile artwork, Tools portfolio, accessibility labels, responsive controls and live app");
}finally{
  await browser.close();
}
