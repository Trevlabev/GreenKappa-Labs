
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script as vmScript} from 'node:vm';
const root=new URL('./',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const html=read('index.html'),css=read('demo-embed.css'),classic=read('demo-embed.js'),cascade=read('cascade-demo-embed.js'),tabs=read('demo-tabs.js'),showcase=read('cascade-demo-embed.css');
test('physical and digital options accurately distinguish access and release status',()=>{
 assert(html.includes('id="physical-play"'));
 for(const s of ['printed 66-card prototype','shared AI chat','print certification remain pending','Play Classic online','Play Cascade online','different player'])assert(html.toLowerCase().includes(s.toLowerCase()),s);
 assert(html.includes('https://agent-fault-classic-cf.grenkappa459.workers.dev/'));
 assert(html.includes('https://agent-fault-classic-cf.grenkappa459.workers.dev/cascade/'));
});
test('the compact swipeable mode gallery preserves all three destinations',()=>{
 const slides=[...html.matchAll(/<article class="af-mode-slide /g)];
 const dots=[...html.matchAll(/class="af-mode-dot"/g)];
 assert.equal(slides.length,3,'Three carousel slides');
 assert.equal(dots.length,3,'Three pagination buttons');
 for(const marker of ['class="af-mode-carousel"','class="af-mode-track"','data-dir="-1"','data-dir="1"','tabindex="0"'])assert(html.includes(marker),marker);
 assert(tabs.includes('track.scrollTo('),'Carousel navigation is wired');
 assert(html.includes('https://agent-fault-classic-cf.grenkappa459.workers.dev/'),'Classic launches on Cloudflare');
 assert(html.includes('https://agent-fault-classic-cf.grenkappa459.workers.dev/cascade/'),'Cascade launches on Cloudflare');
 assert(!html.includes('.netlify.app')&&!cascade.includes('.netlify.app'),'No obsolete Netlify game links');
});
test('accessible tab semantics and two separately labeled playable showcases',()=>{
 for(const s of ['id="af-tab-classic"','id="af-tab-cascade"','id="af-panel-classic"','id="af-panel-cascade"','role="tablist"','role="tabpanel"','aria-selected="false"','aria-controls="af-panel-cascade"'])assert(html.includes(s),s);
 assert(tabs.includes("'ArrowRight'")&&tabs.includes("'ArrowLeft'")&&tabs.includes("'Home'")&&tabs.includes("'End'"));
 assert(css.includes('.af-demo-panel[hidden]'));
 const frames=[...html.matchAll(/<iframe\b[^>]*\bsrc="([^"]+)"/g)]; assert.equal(frames.length,1); assert.equal(frames[0][1],'./product-3d/viewer.html?embed=1','Only the same-origin local 3D viewer may be embedded');
});
test('both demos run locally without server-side AI requests',()=>{
 assert(classic.includes("document.getElementById('agent-fault-demo')"));
 assert(cascade.includes("document.getElementById('agent-fault-cascade-demo')"));
 assert(classic.includes("const imageRoot = './assets/'"));
 assert(cascade.includes("const assets = './assets/'"));
 assert(!classic.includes('agent-fault-cards.svg'));
 assert(cascade.includes('function navigation()'));
 assert(cascade.includes('data-reaction'));
 assert(cascade.includes('af-demo-visibility'));
 for(const source of [classic,cascade])assert(!/fetch\s*\(|XMLHttpRequest|OPENAI_API_KEY|\/api\/rooms/.test(source));
 assert(showcase.includes('.cd-edge-arrow'));
 assert(showcase.includes('.cd-pagination'));
 assert(showcase.includes('prefers-reduced-motion'));
});

test('tabbed demos appear immediately between The Idea and The Player Experience',()=>{
 const markers=['01 / The idea','id="animated-demo"','02 / The player experience','id="play-options"','id="art-title"','05 / Development questions'];
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

test('physical-product section retains original assets, status qualifiers and mobile viewer',()=>{
 assert.equal((html.match(/id="box-cards"/g)||[]).length,1);
 for(const marker of ['product-3d.css','./product-3d/viewer.html?embed=1','./product-3d/box-and-deck.png','./product-3d/three-decks.png','./product-3d/open-box.png','Prototype visualization','print certification remain pending'])assert(html.includes(marker),marker);
 assert(html.indexOf('id="play-options"')<html.indexOf('id="box-cards"'));
 assert(html.indexOf('id="box-cards"')<html.indexOf('class="gd-art-section"'));
 const stylesheet=read('product-3d.css');assert(stylesheet.includes('scroll-snap-type:x mandatory'));assert(stylesheet.includes('prefers-reduced-motion'));
 const viewer=read('product-3d/viewer.html');for(const control of ['data-model="closed"','data-model="families"','data-model="open"','id="zoomIn"','id="zoomOut"'])assert(viewer.includes(control),control);
});


test('static walkthroughs and card review resolve card art from this repository, not Netlify',()=>{
 const review=read('review-v09/index.html');
 assert(review.includes("const ART='../assets/'"));
 for(const page of [classic,cascade,review])assert(!page.includes('.netlify.app/static/assets/'));
 for(const suffix of ['scenario.webp','interference.webp','fault.webp'])assert(review.includes('../assets/backs/'+suffix));
 assert(html.includes('./cascade-demo.html'));
 assert(html.includes('./classic-demo.html'));
});


test('friendly onboarding keeps the demos between the pitch and six-step walkthrough',()=>{
 const p=html.indexOf('01 / The idea');
 const d=html.indexOf('id="animated-demo"');
 const h=html.indexOf('id="player-experience"');
 const play=html.indexOf('id="play-options"');
 assert(p>=0&&d>p&&h>d&&play>h,'Approved page flow: Idea → demos → steps → ways to play');
 assert(html.includes('Drive the AI Insane.'));
 assert(html.includes('How to Play AGENT/FAULT'));
 assert(html.includes('You just need to be good at making bad decisions.'));
 const cards=[...html.matchAll(/<article class="af-step-card"/g)];
 assert.equal(cards.length,6,'Six distinct walkthrough cards');
 for(let n=1;n<=6;n++)assert(html.includes('Step '+n+' of 6:'),'Missing accessible label for step '+n);
 assert(html.includes('aria-roledescription="carousel"'));
 assert(html.includes('data-steps-dir="-1"')&&html.includes('data-steps-dir="1"'));
 assert(html.includes('how-to-play.css')&&html.includes('how-to-play.js'));
});
test('the new swipe gallery uses 3 desktop, 2 tablet, 1 mobile and keyboard navigation',()=>{
 const howCss=read('how-to-play.css'),howJs=read('how-to-play.js');
 assert(howCss.includes('grid-auto-columns:calc((100% - 32px)/3)'));
 assert(howCss.includes('grid-auto-columns:calc((100% - 16px)/2)'));
 assert(howCss.includes('grid-auto-columns:100%'));
 assert(howCss.includes('@media(max-width:1000px)'));
 assert(howCss.includes('@media(max-width:680px)'));
 for(const key of ["'ArrowLeft'","'ArrowRight'","'Home'","'End'"])assert(howJs.includes(key));
 for(const key of ["scroll-snap-type:x mandatory","prefers-reduced-motion","aria-pressed"])assert(howCss.includes(key)||howJs.includes(key));
 assert.doesNotThrow(()=>new vmScript(howJs,{filename:'how-to-play.js'}));
});
test('Classic is the first play choice and mode descriptions stay mechanically accurate',()=>{
 const first=html.indexOf('class="af-mode-slide af-mode-classic"');
 const second=html.indexOf('class="af-mode-slide af-mode-cascade"');
 const third=html.indexOf('class="af-mode-slide af-mode-physical"');
 assert(first>=0&&second>first&&third>second,'Classic, Cascade, then physical');
 assert(html.includes('data-slide="0" aria-label="Show Classic mode" aria-pressed="true"'));
 assert(html.includes('different player'));
 assert(html.includes('strict majority'));
 assert(html.includes('At most one'));
 assert(html.includes('browser playtest editions'));
});
test('demo introductions are story-first and original scripted interactions survive',()=>{
 assert(classic.includes("title:'A goose became mayor.'"));
 assert(classic.includes("type:'scenario'"));
 assert(classic.indexOf("type:'scenario'") < classic.indexOf("type:'stacks'"));
 assert(cascade.includes("title:'A goose is running city hall.'"));
 assert(cascade.includes("title:'The AI is about to lose its mind.'"));
 assert(cascade.indexOf("title:'The AI is about to lose its mind.'") < cascade.indexOf("title:'A goose is running city hall.'"),'Cascade intro must be before the public scenario');
 assert(cascade.includes('if(state.step===0)return `<div class="cd-showcase cd-showcase-decks"'),'First slide should show AI sabotage setup');
 assert(cascade.includes('if(state.step===1)return `<div class="cd-showcase cd-showcase-scenario"'),'Second slide should reveal the goose scenario');
 assert(!cascade.includes('Three decks. Infinite bad ideas.')&&!classic.includes('Three decks. One disaster.'));

 assert(cascade.includes("if(state.step===0)return"));
 assert(cascade.includes('cd-showcase-scenario'));
 for(const key of ['data-reaction','data-inspect','data-jump','af-demo-visibility'])assert(cascade.includes(key));
 for(const key of ['data-afd-card','data-afd-step','af-demo-visibility'])assert(classic.includes(key));
});


test('both demos use side arrows, six compact dots, keyboard and swipe navigation instead of autoplay',()=>{
  for(const [source,prefix,style] of [[classic,'afd',css],[cascade,'cd',showcase]]){
    const arrow=prefix==='afd'?'afd-edge-arrow':'cd-edge-arrow';
    const dots=prefix==='afd'?'afd-pagination':'cd-pagination';
    assert(source.includes(arrow),prefix+' missing side chevrons');
    assert(source.includes(dots),prefix+' missing scene dots');
    assert(style.includes('.'+arrow),prefix+' missing side-arrow styling');
    assert(style.includes('.'+dots),prefix+' missing dot styling');
    for(const event of ['touchstart','touchend','pointerdown','pointerup','keydown'])
      assert(source.includes("'"+event+"'"),prefix+' missing '+event);
    for(const key of ['ArrowLeft','ArrowRight','Home','End'])assert(source.includes(key));
    assert(!source.includes('setTimeout('),prefix+' still has timed scene advancement');
  }
  assert(!classic.includes('data-afd-action="toggle"'),'Classic play/pause transport removed');
  assert(!cascade.includes('data-play'),'Cascade play/pause transport removed');
  assert(!cascade.includes('class="cd-nav"'),'Cascade old navigation bar removed');
  assert(classic.includes('data-afd-card'),'Classic card choices retained');
  assert(cascade.includes('data-reaction')&&cascade.includes('data-inspect'),'Cascade branching and previews retained');
  assert(classic.includes('isSwipeSafe')&&cascade.includes('isSwipeSafe'),'gesture filtering preserved');
  assert.doesNotThrow(()=>new vmScript(classic,{filename:'demo-embed.js'}));
  assert.doesNotThrow(()=>new vmScript(cascade,{filename:'cascade-demo-embed.js'}));
});
