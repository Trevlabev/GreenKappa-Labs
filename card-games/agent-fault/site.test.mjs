
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
