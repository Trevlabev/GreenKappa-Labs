import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

// Focused, opt-in responsive acceptance test for the eight marketing pages
// using the shared division breadcrumb/secondary navigation. No app state is
// touched. Browser screenshots are retained as GitHub Actions artifacts.
const origin='http://127.0.0.1:8765';
const routes=[
  ['/worlds/','worlds-overview'],
  ['/worlds/sourcebooks/','worlds-sourcebooks'],
  ['/worlds/adventures/','worlds-adventures'],
  ['/card-games/','games-overview'],
  ['/card-games/not-to-scale/','games-no-such-room'],
  ['/card-games/small-gods-large-debts/','games-small-gods'],
  ['/card-games/playtest/','games-playtesting'],
  ['/tools/','tools-overview']
];
const widths=[320,390,768,1280];
const output=path.resolve('artifacts/marketing-responsive');
fs.mkdirSync(output,{recursive:true});
// GitHub ubuntu-24.04 includes Google Chrome; avoid a large browser download.
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
const reports=[],errors=[];
try{
  for(const width of widths){
    const context=await browser.newContext({
      viewport:{width,height:width<=390?844:900},
      deviceScaleFactor:1,
      isMobile:width<=390,
      hasTouch:width<=390,
      reducedMotion:'reduce'
    });
    const page=await context.newPage();
    page.setDefaultTimeout(8000);
    for(const [route,slug] of routes){
      const currentErrors=[];
      const onError=err=>currentErrors.push(err.message);
      page.on('pageerror',onError);
      const response=await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:15000});
      await page.evaluate(()=>document.fonts?.ready||Promise.resolve());
      const info=await page.evaluate(()=>{
        const bar=document.querySelector('.gkl-context-nav');
        const trail=bar?.querySelector('.gkl-context-trail');
        const links=bar?.querySelector('.gkl-context-links');
        const header=document.querySelector('.site-header');
        const hero=bar?.nextElementSibling;
        const activeTrail=trail?.querySelectorAll('[aria-current="page"]').length||0;
        const activeSection=links?.querySelectorAll('[aria-current="page"]').length||0;
        const barRect=bar?.getBoundingClientRect();
        const linksRect=links?.getBoundingClientRect();
        const heroRect=hero?.getBoundingClientRect();
        const h1=document.querySelector('h1');
        const h1Rect=h1?.getBoundingClientRect();
        const interactive=links?.querySelector('a');
        const interactiveRect=interactive?.getBoundingClientRect();
        const hit=interactiveRect?document.elementFromPoint(interactiveRect.left+interactiveRect.width/2,interactiveRect.top+interactiveRect.height/2):null;
        const firstLinkAccessible=!!interactive&&(hit===interactive||interactive.contains(hit));
        if(links)links.scrollLeft=links.scrollWidth;
        const last=links?.lastElementChild?.getBoundingClientRect();
        return {
          title:document.title,
          viewport:innerWidth,
          scrollWidth:document.documentElement.scrollWidth,
          bodyScrollWidth:document.body.scrollWidth,
          h1Count:document.querySelectorAll('h1').length,
          activeTrail,activeSection,
          breadcrumb:!!trail,
          secondaryNav:!!links,
          barTop:barRect?.top??null,
          barBottom:barRect?.bottom??null,
          heroTop:heroRect?.top??null,
          headerBottom:header?.getBoundingClientRect().bottom??null,
          heroPresent:!!hero,
          h1Right:h1Rect?.right??null,
          linksClientWidth:links?.clientWidth??null,
          linksScrollWidth:links?.scrollWidth??null,
          firstLinkAccessible,
          lastLinkReachable:!!last&&!!linksRect&&last.left>=linksRect.left-4&&last.right<=linksRect.right+4,
          navColor:bar?getComputedStyle(bar).backgroundColor:null,
          horizontalOverflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth
        };
      });
      reports.push({route,width,...info,errors:currentErrors});
      const key=route+' @ '+width+'px';
      if(!response||response.status()>=400)errors.push(key+': HTTP '+response?.status());
      if(info.h1Count!==1)errors.push(key+': H1 count '+info.h1Count);
      if(!info.breadcrumb||!info.secondaryNav)errors.push(key+': contextual navigation missing');
      if(info.activeTrail!==1||info.activeSection!==1)errors.push(key+': active navigation state invalid');
      if(info.horizontalOverflow>8)errors.push(key+': page overflow by '+info.horizontalOverflow+'px');
      if(info.barBottom!==null&&info.heroTop!==null&&info.heroTop<info.barBottom-2)errors.push(key+': hero overlaps breadcrumb bar');
      if(info.h1Right!==null&&info.h1Right>width+8)errors.push(key+': hero title clipped beyond viewport');
      if(!info.lastLinkReachable)errors.push(key+': last secondary navigation item unreachable');
      if(!info.firstLinkAccessible)errors.push(key+': first section link tap target covered');
      if(currentErrors.length)errors.push(key+': runtime errors '+currentErrors.slice(0,2).join(' / '));
      if(width===390||width===1280){
        await page.screenshot({path:path.join(output,slug+'-'+width+'.png'),fullPage:false,animations:'disabled'});
      }
      page.off('pageerror',onError);
      console.log('CHECK',width,route,'overflow',info.horizontalOverflow,'links',info.linksClientWidth+'/'+info.linksScrollWidth);
    }
    await context.close();
  }
}finally{
  fs.writeFileSync(path.join(output,'measurements.json'),JSON.stringify({measurements:reports,findings:errors},null,2));
  await browser.close();
}
if(errors.length){
  for(const error of errors)console.error('FAIL',error);
  process.exitCode=1;
}else{
  console.log('PASS: 8 marketing pages at 320, 390, 768 and 1280px; no document overflow, clipped titles, lost navigation targets or overlapping hero bands.');
}
