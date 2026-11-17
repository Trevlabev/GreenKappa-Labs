import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {chromium} from "playwright";
import {makeSyntheticPDF} from "../sample.mjs";

const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const errors=[];
const contexts=[
 {name:"desktop",viewport:{width:1440,height:900}},
 {name:"mobile",viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1}
];
try{
 for(const item of contexts){
  const page=await browser.newPage({viewport:item.viewport,acceptDownloads:true,isMobile:!!item.isMobile});
  page.on("pageerror",e=>errors.push(item.name+": "+String(e)));
  await page.goto("http://127.0.0.1:8000/filingproof/",{waitUntil:"domcontentloaded"});
  await page.locator("#demo-button").click();
  try{
   await page.locator(".fp-report-card").waitFor({timeout:30000});
  }catch(e){
   const progress=await page.locator("#progress").innerText();
   throw new Error(item.name+" sample inspection failed: "+progress+" / "+String(e));
  }
  assert.equal(await page.locator("#stat-files").innerText(),"1");
  assert.equal(await page.locator("#stat-blocked").innerText(),"0","Sample PDF must parse in "+item.name);
  assert.match(await page.locator(".fp-report-card").innerText(),/synthetic-filingproof-demo\.pdf/);
  assert.equal(await page.locator("#export-json").isEnabled(),true);
  const [json]=await Promise.all([page.waitForEvent("download"),page.locator("#export-json").click()]);
  const exported=JSON.parse(await fs.readFile(await json.path(),"utf8"));
  assert.equal(exported.application,"FilingProof");
  assert.equal(exported.results.length,1);
  assert.equal(exported.results[0].pages,1);
  assert.equal(exported.results[0].inspectedPages,1);
  assert.equal(exported.results[0].checks.find(x=>x.id==="parse").status,"pass");
  assert.equal(JSON.stringify(exported).includes("A synthetic document for testing"),false,"No document content should leak into report");
  await page.locator("#profile").selectOption("oregon");
  assert.match(await page.locator(".fp-report-card-head").innerText(),/District of Oregon/);
  await page.locator("#max-size").fill("0.0001");
  assert.equal(await page.locator("#stat-flagged").innerText(),"1","Tiny custom size threshold should flag file");
  await page.locator("#about-button").click();
  await page.locator("#about-dialog").waitFor({state:"visible"});
  await page.locator("#close-dialog").click();
  assert.equal(await page.locator("#about-dialog").isVisible(),false);
  if(item.name==="mobile"){
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(overflow<=2,"Mobile horizontal overflow is "+overflow+"px");
  }
  await page.close();
 }
 assert.deepEqual(errors,[],"No browser exceptions allowed");
 console.log("FilingProof browser smoke passed for synthetic PDF on desktop and mobile.");
}finally{await browser.close();}
