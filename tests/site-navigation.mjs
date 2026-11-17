import assert from "node:assert/strict";
import {chromium} from "playwright";

const origin="http://127.0.0.1:8765";
const pages=[
  "/", "/tablearc/", "/tablearc-red/", "/card-games/",
  "/card-games/not-to-scale/", "/card-games/small-gods-large-debts/",
  "/card-games/agent-fault/", "/card-games/playtest/",
  "/worlds/", "/worlds/sourcebooks/", "/worlds/adventures/",
  "/tools/", "/playground/", "/playground/not-to-scale/",
  "/work/", "/journal/", "/privacy.html", "/404.html"
];
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const findings=[];
try{
  for (const width of [390,1280]){
    const context=await browser.newContext({viewport:{width,height:860},reducedMotion:"reduce"});
    const page=await context.newPage();
    page.setDefaultTimeout(6000);
    for (const route of pages){
      const runtime=[];
      page.on("pageerror",error=>runtime.push(error.message));
      // A full DOMContentLoaded wait can be blocked by optional third-party modules.
      // Check the parsed local page, then independently exercise its own navigation.
      console.log("CHECK",width,route);
      const response=await page.goto(origin+route,{waitUntil:"commit",timeout:10000});
      await page.waitForFunction(() => document.readyState !== "loading",null,{timeout:10000});
      if(!response || response.status()>=400) findings.push(route+" @ "+width+": HTTP "+response?.status());
      const h1=page.locator("h1");
      if(await h1.count()!==1) findings.push(route+" @ "+width+": missing/duplicate main heading");
      if(!await page.locator("main").count()) findings.push(route+" @ "+width+": missing main landmark");
      const dimensions=await page.evaluate(()=>({
        screen:innerWidth,
        page:document.documentElement.scrollWidth,
        body:document.body.scrollWidth
      }));
      if(dimensions.page>dimensions.screen+12 || dimensions.body>dimensions.screen+12)
        findings.push(route+" @ "+width+": horizontal overflow "+JSON.stringify(dimensions)+" offenders "+JSON.stringify(
          await page.evaluate(() => [...document.body.querySelectorAll("*")]
            .map(el=>({el,box:el.getBoundingClientRect()}))
            .filter(x=>(x.box.right>innerWidth+10 && x.box.width>5) || (x.el.scrollWidth>x.el.clientWidth+14 && getComputedStyle(x.el).overflowX==="visible"))
            .slice(0,10).map(x=>({tag:x.el.tagName,cls:String(x.el.className).slice(0,65),right:Math.round(x.box.right),left:Math.round(x.box.left),width:Math.round(x.box.width),scroll:x.el.scrollWidth,client:x.el.clientWidth}))
          )
        ));
      if(width===390){
        const menu=page.locator(".menu-button");
        if(await menu.count()){
          await menu.click();
          if(await menu.getAttribute("aria-expanded")!=="true") findings.push(route+": mobile menu fails to open");
          await page.keyboard.press("Escape");
          if(await menu.getAttribute("aria-expanded")!=="false") findings.push(route+": Escape fails to close mobile menu");
        }
      }
      if(runtime.length) findings.push(route+" @ "+width+": uncaught script errors "+runtime.slice(0,3).join(" | "));
      page.removeAllListeners("pageerror");
    }
    await context.close();
  }
  if(findings.length){
    console.error("BROWSER NAVIGATION/RESPONSIVENESS FAILURES: "+findings.length);
    for(const line of findings) console.error(" - "+line);
    process.exitCode=1;
  }else console.log("PASS: "+pages.length+" public portfolio/recovery pages at 390px and 1280px; menus, main landmarks, headings and viewport fit.");
}finally{
  await browser.close();
}