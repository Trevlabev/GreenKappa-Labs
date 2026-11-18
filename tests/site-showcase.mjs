import assert from "node:assert/strict";
import {chromium} from "playwright";

const origin="http://127.0.0.1:8765";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const faults=[];
const attached=p=>p.on("pageerror",err=>faults.push(err.message));
// Lazy images below the fold must be brought into view before decoding.
// Bound the decode independently of the overall workflow watchdog.
async function decodeVisibleImage(locator){
  await locator.scrollIntoViewIfNeeded({timeout:6000});
  await locator.evaluate(img=>Promise.race([
    img.decode(),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error("Image decode timed out: "+(img.currentSrc||img.src))),10000))
  ]));
}
try{
  const desktop=await browser.newPage({viewport:{width:1440,height:900}});
  attached(desktop);
  await desktop.goto(origin+"/",{waitUntil:"networkidle"});
  await desktop.locator("[data-showcase-pause]").click(); // Keep product-visibility assertions independent of auto-rotation timing.
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
  await decodeVisibleImage(desktopImage);
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
  await decodeVisibleImage(filingWide);
  assert.match(await filingWide.evaluate(img=>img.currentSrc),/filingproof-gallery\.webp/);
  assert.equal(await filingWide.evaluate(img=>img.naturalWidth),1400,"FilingProof wide image loads");
  await filing.locator(".gkl-filingproof-art-note").waitFor({state:"visible",timeout:5000});
  assert.match(await filing.locator(".gkl-filingproof-art-note").innerText(),/Illustrative concept art/);
  const courtIndex=await desktop.locator("[data-showcase-slide]").evaluateAll(els=>els.findIndex(e=>e.classList.contains("gkl-theme-courtflow")));
  assert.ok(courtIndex>=0,"CourtFlow has a gallery slide");
  await desktop.locator('[data-showcase-tab="'+courtIndex+'"]').click();
  const court=desktop.locator(".gkl-theme-courtflow");
  assert.match(await court.getAttribute("class"),/is-active/);
  assert.equal(await court.locator("a.gkl-slide-cover-link").getAttribute("href"),"courtflow/");
  const courtImage=court.locator(".gkl-art-picture img");
  await decodeVisibleImage(courtImage);
  assert.equal(await courtImage.evaluate(img=>img.naturalWidth),1672,"User-supplied CourtFlow artwork loaded at original resolution");
  assert.match(await courtImage.getAttribute("src"),/courtflow-gallery[.]avif/);
  assert.match(await courtImage.getAttribute("alt"),/illustration, not an application screenshot/);
  await court.locator(".gkl-courtflow-art-note").waitFor({state:"visible",timeout:5000});
  assert.equal(await desktop.locator(".gkl-tools-products--live > article").count(),4,"Homepage showcases four runnable tools");
  assert.equal(await desktop.locator(".gkl-tools-products--concepts > article").count(),2,"Homepage shows two design concepts");
  assert.ok(await desktop.locator('.gkl-tools-products--live a[href="filingproof/"]').count()>0,"Homepage FilingProof launch link exists");
  assert.ok(await desktop.locator('.gkl-tools-products--live a[href="tools/handoff-atlas/"]').count()>0,"Homepage Handoff Atlas launch link exists");
  assert.equal(await desktop.getByText("Printflight",{exact:true}).count(),0,"Retired Printflight is not shown on homepage");
  assert.equal(await desktop.locator(".gkl-tools-showcase-grid > .gkl-tools-promo-card").count(),3,"Flowglass, FilingProof and CourtFlow share an image-first three-card row");
  for (const name of ["flowglass-tools-feature.webp","filingproof-tools.webp","courtflow-tools-promo.webp"]) {
    const asset=desktop.locator('.gkl-tools-showcase-grid img[src$="'+name+'"]');
    assert.equal(await asset.count(),1,"Homepage displays approved promotional image "+name);
    await decodeVisibleImage(asset);
    assert.ok(await asset.evaluate(img=>img.naturalWidth>0),"Homepage image loads "+name);
  }

  await desktop.goto(origin+"/tools/",{waitUntil:"networkidle"});
  assert.equal(await desktop.locator(".gkt-release-card").count(),4,"Tools page has four working alpha cards");
  assert.equal(await desktop.locator(".gkt-concept-card").count(),2,"Tools page has two distinct design-stage concepts");
  assert.equal(await desktop.locator(".gkt-hero-directory > a").count(),4,"Hero quick-launch directory contains all four alphas");
  assert.equal(await desktop.locator("#proofline").count(),1,"Proofline concept has stable anchor");
  assert.equal(await desktop.locator("#lorelock").count(),1,"Lorelock concept has stable anchor");
  assert.equal(await desktop.getByText("Printflight",{exact:true}).count(),0,"Retired Printflight is not shown on Tools page");
  const launch=desktop.locator('.gkt-release-feature a[href="/flowglass/"]');
  assert.ok(await launch.count()>0,"Tools page links to working Flowglass app");
  const hero=desktop.locator(".gkt-release-feature picture img");
  await decodeVisibleImage(hero);
  assert.equal(await hero.evaluate(img=>img.naturalWidth),1672,"Flowglass feature art loads");
  assert.match(await hero.getAttribute("alt"),/not a screenshot/,"Promotional imagery accurately disclosed");
  assert.ok(await desktop.locator('#filingproof a[href="/filingproof/"]').count()>=1,"FilingProof launch link works");
  assert.ok(await desktop.locator('#courtflow a[href="/courtflow/"]').count()>=1,"CourtFlow launch link works");
  const courtPromo=desktop.locator('#courtflow .gkt-product-image img');
  assert.equal(await courtPromo.count(),1,"Tools catalog shows the existing CourtFlow promotional image");
  await decodeVisibleImage(courtPromo);
  assert.equal(await courtPromo.evaluate(img=>img.naturalWidth),1440,"Optimized CourtFlow image loads");
  assert.match(await courtPromo.getAttribute("alt"),/not an actual running software screenshot/,"CourtFlow image disclaimer is accurate");
  const filingPromo=desktop.locator('#filingproof .gkt-product-image img');
  await decodeVisibleImage(filingPromo);
  assert.ok(await filingPromo.evaluate(img=>img.naturalWidth)>0,"FilingProof promotional image loads");
  assert.ok(await desktop.locator('#handoff-atlas a[href="/tools/handoff-atlas/"]').count()>=1,"Handoff Atlas launch link works");
  await desktop.locator(".gkt-concept-card summary").first().click();
  assert.ok(await desktop.locator(".gkt-concept-card details").first().evaluate(el=>el.open),"Concept details expand");
  assert.equal(await desktop.locator(".gkt-hero-directory > a").count(),4,"Quick directory remains usable");

  await desktop.goto(origin+"/flowglass/",{waitUntil:"networkidle"});
  await desktop.locator(".fg-node").first().waitFor();
  assert.equal(await desktop.locator(".fg-node").count(),9,"Flowglass application still works");

  for (const width of [390,320]){
    const mobile=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    attached(mobile);
    await mobile.goto(origin+"/",{waitUntil:"networkidle"});
    await mobile.locator("[data-showcase-pause]").click();
    assert.equal(await mobile.locator("[data-showcase-tab]").count(),slideCount);
    await mobile.locator('[data-showcase-tab="'+flowglassIndex+'"]').click();
    const img=mobile.locator(".gkl-theme-flowglass picture img");
    await decodeVisibleImage(img);
    const selected=await img.evaluate(img=>img.currentSrc);
    assert.match(selected,/flowglass-gallery-mobile\.webp/,"Square image should be selected on mobile");
    assert.equal(await img.evaluate(img=>img.naturalWidth),1254);
    await mobile.locator('[data-showcase-tab="'+filingIndex+'"]').click();
    const filingMobile=mobile.locator(".gkl-theme-filingproof picture img");
    await decodeVisibleImage(filingMobile);
    assert.match(await filingMobile.evaluate(img=>img.currentSrc),/filingproof-gallery-mobile\.webp/);
    assert.equal(await filingMobile.evaluate(img=>img.naturalWidth),900,"FilingProof square mobile image loads");
    assert.notEqual(await mobile.locator(".gkl-theme-filingproof .gkl-art-mobile-caption").evaluate(el=>getComputedStyle(el).display),"none");

    await mobile.locator('[data-showcase-tab="'+courtIndex+'"]').click();
    const mobileCourt=mobile.locator(".gkl-theme-courtflow");
    assert.equal(await mobile.locator(".gkl-theme-courtflow.is-active").count(),1,"CourtFlow gallery selectable on mobile");
    const mobileImg=mobileCourt.locator(".gkl-art-picture img");
    await decodeVisibleImage(mobileImg);
    assert.equal(await mobileImg.evaluate(img=>img.naturalWidth),1672,"CourtFlow artwork loads on mobile");
    const mobileCaption=mobileCourt.locator(".gkl-art-mobile-caption");
    await mobileCaption.waitFor({state:"visible",timeout:5000});
    assert.ok(await mobileCaption.isVisible(),"Mobile CourtFlow caption visible");
    const geometry=await mobileImg.evaluate(img=>({width:img.clientWidth,parent:img.parentElement.clientWidth}));
    assert.ok(geometry.width<=geometry.parent+2,"CourtFlow artwork fits the mobile gallery");
    const styles=await mobile.locator(".gkl-theme-flowglass .gkl-art-mobile-caption").evaluate(el=>({display:getComputedStyle(el).display,background:getComputedStyle(el).backgroundImage}));
    assert.notEqual(styles.display,"none","Mobile caption visible");
    assert.ok(styles.background.includes("linear-gradient"),"Mobile caption extends gallery art");
    const ctl=await mobile.locator(".gkl-showcase-controls").evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth}));
    assert.ok(ctl.scroll<=ctl.width+4,"Gallery controls fit width "+width+"px: "+JSON.stringify(ctl));
    await mobile.goto(origin+"/tools/",{waitUntil:"networkidle"});
    const toolOverflow=await mobile.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
    assert.ok(toolOverflow.scroll<=toolOverflow.width+4,"Tools page should not overflow at "+width+": "+JSON.stringify(toolOverflow));
    const source=await mobile.locator(".gkt-release-feature picture img").evaluate(img=>img.currentSrc);
    assert.match(source,/flowglass-gallery-mobile\.webp/,"Mobile product picture uses square rendering");
    await mobile.close();
  }
  assert.deepEqual(faults,[],"Uncaught browser errors");
  console.log("PASS: "+slideCount+"-slide gallery, four working Tools and two concepts, image disclosures, working links, mobile layouts and live Flowglass");
}finally{
  await browser.close();
}
