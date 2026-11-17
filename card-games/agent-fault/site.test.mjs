
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script as vmScript} from 'node:vm';
const root=new URL('./',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const html=read('index.html'),css=read('demo-embed.css'),classic=read('demo-embed.js'),cascade=read('cascade-demo-embed.js'),tabs=read('demo-tabs.js'),showcase=read('cascade-demo-embed.css');
test('physical and digital options accurately distinguish access and release status',()=>{
 assert(html.includes('id="physical-play"'));
 for(const s of ['printed prototype','shared AI chat','print certification pending','Play Classic online','Play Cascade online','different player'])assert(html.toLowerCase().includes(s.toLowerCase()),s);
 assert(html.includes('https://agent-fault-live-online.netlify.app/'));
 assert(html.includes('https://agent-fault-cascade-playtest.netlify.app/'));
});
test('accessible tab semantics and two separately labeled playable showcases',()=>{
 for(const s of ['id="af-tab-classic"','id="af-tab-cascade"','id="af-panel-classic"','id="af-panel-cascade"','role="tablist"','role="tabpanel"','aria-selected="false"','aria-controls="af-panel-cascade"'])assert(html.includes(s),s);
 assert(tabs.includes("'ArrowRight'")&&tabs.includes("'ArrowLeft'")&&tabs.includes("'Home'")&&tabs.includes("'End'"));
 assert(css.includes('.af-demo-panel[hidden]'));
 assert(!html.includes('<iframe'),'No unsafe cross-origin iframe should be used');
});
test('both demos run locally without server-side AI requests',()=>{
 assert(classic.includes("document.getElementById('agent-fault-demo')"));
 assert(cascade.includes("document.getElementById('agent-fault-cascade-demo')"));
 assert(cascade.includes('https://agent-fault-cascade-playtest.netlify.app/static/assets/'));
 assert(cascade.includes('function navigation()'));
 assert(cascade.includes('data-reaction'));
 assert(cascade.includes('af-demo-visibility'));
 for(const source of [classic,cascade])assert(!/fetch\s*\(|XMLHttpRequest|OPENAI_API_KEY|\/api\/rooms/.test(source));
 assert(showcase.includes('.cd-nav{position:sticky'));
 assert(showcase.includes('prefers-reduced-motion'));
});

test('tabbed demos appear immediately between The Idea and The Player Experience',()=>{
 const markers=['01 / The idea','id="animated-demo"','02 / The player experience','id="play-options"','04 / Artwork','05 / Development questions'];
 const positions=markers.map(m=>html.indexOf(m));
 assert(positions.every(v=>v>=0));
 assert(positions.every((v,i)=>i===0||v>positions[i-1]));
 assert(html.includes('id="player-experience"'));
 assert.equal((html.match(/id="animated-demo"/g)||[]).length,1);
});

test('illustrated 66-card review uses real card fronts, keeps archival candidate text',()=>{const review=read('review-v09/index.html');const start=review.indexOf('<script>const CARDS=')+'<script>const CARDS='.length;const end=review.indexOf(';\nconst ART=',start);assert(start>15&&end>start);const cards=JSON.parse(review.slice(start,end));assert.equal(cards.length,66);for(const [type,n] of [['Scenario',24],['Interference',36],['Fault',6]])assert.equal(cards.filter(c=>c.type===type).length,n);assert(review.includes('data-card-img='));assert(review.includes('face(c.id)'));assert(review.includes('card-viewer'));assert(review.includes('Read card text and revisions'));assert(read('review-v09/gallery.css').includes('.card-art img'));});


test('66-card gallery inline application script parses and source HTML remains balanced',()=>{
  const text=read('review-v09/index.html');
  const scripts=[...text.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  const gallery=scripts.find(m=>m[1].includes('const CARDS='));
  assert(gallery,'Original 66-card data/application script is present');
  
  assert.doesNotThrow(()=>new vmScript(gallery[1],{filename:'review-v09-inline.js'}));
  const landing=html;
  assert.equal((landing.match(/<section(?:\s|>)/g)||[]).length,(landing.match(/<\/section>/g)||[]).length,'Site sections should balance');
});
