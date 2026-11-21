import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),domain='https://greenkappalabs.art',issues=[];
const routes=['index.html','tablearc/index.html','tablearc-red/index.html','card-games/index.html','card-games/not-to-scale/index.html','card-games/small-gods-large-debts/index.html','card-games/agent-fault/index.html','card-games/bi-panic/index.html','card-games/playtest/index.html','playground/index.html','playground/not-to-scale/index.html','worlds/index.html','worlds/sourcebooks/index.html','worlds/adventures/index.html','tools/index.html','flowglass/index.html','filingproof/index.html','courtflow/index.html','tools/handoff-atlas/index.html','journal/index.html','work/index.html','privacy.html'];
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{if(['.git','node_modules'].includes(e.name))return [];let full=path.join(dir,e.name);return e.isDirectory()?walk(full):[path.relative(root,full).split(path.sep).join('/')];})}
// Independently served app roots, not documents hosted at the main GitHub Pages origin.
const appMounts=[
  ['card-games/agent-fault/game-app/local/static/','card-games/agent-fault/game-app/local/'],
  ['card-games/agent-fault/game-app/api-edition/static/','card-games/agent-fault/game-app/api-edition/'],
  ['card-games/agent-fault/game-app/hosted/public/','card-games/agent-fault/game-app/hosted/public/'],
  ['card-games/agent-fault/game-app/cascade/public/','card-games/agent-fault/game-app/cascade/public/']
];
const appShells=new Map([
  ['card-games/agent-fault/game-app/local/static/index.html','card-games/agent-fault/game-app/local/static/app.js'],
  ['card-games/agent-fault/game-app/api-edition/static/index.html','card-games/agent-fault/game-app/api-edition/static/app.js'],
  ['card-games/agent-fault/game-app/hosted/public/index.html','card-games/agent-fault/game-app/hosted/public/static/app.js'],
  ['card-games/agent-fault/game-app/cascade/public/index.html','card-games/agent-fault/game-app/cascade/public/static/cascade.js'],
  ['card-games/agent-fault/game-app/cascade/public/demo.html','card-games/agent-fault/game-app/cascade/public/static/cascade-demo.js'],
  ['card-games/agent-fault/game-app/cascade/public/CASCADE_OFFLINE_PREVIEW.html','card-games/agent-fault/game-app/cascade/public/static/cascade-demo-offline.js'],
  ['card-games/agent-fault/live-preview/index.html','card-games/agent-fault/live-preview/index.html']
]);
// Ignore HTML-shaped strings inside embedded code, while still validating actual script/link tags.
function markupOnly(s){return s.replace(/(<script\b[^>]*>)[\s\S]*?(<\/script\s*>)/gi,'$1$2').replace(/(<style\b[^>]*>)[\s\S]*?(<\/style\s*>)/gi,'$1$2')}
const all=walk(root),fileSet=new Set(all),html=new Map(all.filter(p=>p.endsWith('.html')).map(p=>[p,markupOnly(fs.readFileSync(p,'utf8'))]));
const ids=new Map([...html].map(([p,s])=>[p,new Set([...s.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]))]));
const redirects=new Set(['sourcebooks','adventures','oldest-house','supergiant','cosmic-wheel','metaphor','warframe','records-house','dead-air','ballots','silent-auction']);
const fail=(p,m)=>issues.push(p+': '+m);
function local(from,url){if(!url||url.startsWith('#')||/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url))return null;let u=url.split(/[?#]/)[0];if(!u)u='/';try{u=decodeURIComponent(u)}catch{fail(from,'bad URL escaping: '+url);return null}if(u.includes('\\')){fail(from,'invalid URL: '+url);return null}const mount=appMounts.find(([prefix])=>from.startsWith(prefix))?.[1]||'';let x=u.startsWith('/')?path.posix.normalize(path.posix.join(mount,u.slice(1))):path.posix.normalize(path.posix.join(path.posix.dirname(from),u));if(x.startsWith('../')){fail(from,'path escapes repository: '+url);return null}if(x==='.'||x==='./')x='';x=x.replace(/^\.\//,'');let file=!x?'index.html':(u.endsWith('/')?x.replace(/\/$/,'')+'/index.html':fileSet.has(x)?x:fileSet.has(x+'/index.html')?x+'/index.html':x);return {file,hash:url.includes('#')?url.split('#').slice(1).join('#'):''};}
let checked=0;
for(const [p,s] of html){const values=[...s.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);if(values.length!==new Set(values).size)fail(p,'duplicate ids');if(appShells.has(p)){const source=appShells.get(p);if(!/<div\b[^>]*\bid=["']app["'][^>]*>/i.test(s))fail(p,'app shell missing #app mount');if(!fileSet.has(source)||!/<h1\b/i.test(fs.readFileSync(source,'utf8')))fail(p,'SPA source missing client-rendered h1')}else if((s.match(/<h1\b/gi)||[]).length!==1)fail(p,'expected exactly one h1');if(!/<html\b[^>]*\blang=/i.test(s))fail(p,'missing document language');for(const m of s.matchAll(/<img\b[^>]*>/gi))if(!/\balt=["'][^"']*["']/.test(m[0]))fail(p,'image without alt');for(const tag of s.matchAll(/<(?:a|link|script|img|source|video|audio|iframe)\b[^>]*>/gi)){for(const a of tag[0].matchAll(/\b(href|src|srcset|poster)=["']([^"']*)["']/gi)){const urls=a[1].toLowerCase()==='srcset'?a[2].split(',').map(v=>v.trim().split(/\s+/)[0]):[a[2]];for(const u of urls){if(u.startsWith('#')){if(u.length>1&&!ids.get(p).has(u.slice(1)))fail(p,'missing local anchor '+u);continue}const dest=local(p,u);if(!dest)continue;checked++;if(!fileSet.has(dest.file)){fail(p,'missing '+u+' -> '+dest.file);continue}if(dest.hash&&dest.file.endsWith('.html')){let hash=dest.hash;try{hash=decodeURIComponent(hash)}catch{}if(!ids.get(dest.file)?.has(hash)&&!(dest.file==='worlds/index.html'&&redirects.has(hash)))fail(p,'missing cross-page anchor '+u)}}}}}
for(const p of all.filter(x=>x.endsWith('.css'))){const s=fs.readFileSync(p,'utf8');for(const m of s.matchAll(/url\(\s*["']?([^\)"']+)["']?\s*\)/gi)){const dest=local(p,m[1].trim());if(dest&&!fileSet.has(dest.file))fail(p,'missing CSS asset '+m[1])}}
const sitemap=fs.readFileSync('sitemap.xml','utf8'),urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
for(const p of routes){const s=html.get(p);if(!s){fail(p,'public page absent');continue}if(!/<meta\b[^>]*name=["']description["']/i.test(s))fail(p,'missing description');if(!/<main\b/i.test(s))fail(p,'missing main');if(!/<a\b[^>]*class=["'][^"']*skip/i.test(s))fail(p,'missing skip link');const actual=s.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];const expected=domain+'/'+(p==='index.html'?'':p==='privacy.html'?p:p.replace(/index\.html$/,''));if(actual!==expected)fail(p,'canonical '+actual+' expected '+expected);if(!urls.includes(expected))fail('sitemap.xml','missing '+expected)}
for(const url of urls){if(!url.startsWith(domain+'/'))fail('sitemap.xml','other domain '+url);else {const dest=local('index.html',url.slice(domain.length));if(dest&&!fileSet.has(dest.file))fail('sitemap.xml','nonexistent page '+url)}}
// AGENT/FAULT artwork release gate: exact card-specific images, never generic placeholders.
{
 const base='card-games/agent-fault/assets', manifestFile=base+'/manifest.json';
 if(!fileSet.has(manifestFile)) fail(manifestFile,'approved 66-card manifest missing');
 else {
  let manifest;
  try {manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'))}
  catch(e){fail(manifestFile,'invalid JSON: '+e.message)}
  if(manifest){
   const cards=manifest.cards||{}, ids=Object.keys(cards);
   if(ids.length!==66)fail(manifestFile,'expected 66 unique card IDs, found '+ids.length);
   for(const [kind,count] of [['Scenario',24],['Interference',36],['Fault',6]]){
    const actual=Object.values(cards).filter(c=>c.category===kind).length;
    if(actual!==count)fail(manifestFile,kind+' inventory mismatch '+actual+' / '+count);
   }
   const originals=new Set(ids.map(id=>id+'.webp'));
   const actualFronts=all.filter(p=>p.startsWith(base+'/fronts/')&&p.endsWith('.webp'));
   if(actualFronts.length!==66)fail(base+'/fronts','expected 66 actual front image files');
   for(const id of ids){
    const file=base+'/fronts/'+id+'.webp';
    if(!fileSet.has(file)){fail(file,'card-specific front image missing');continue}
    const bytes=fs.readFileSync(file);
    if(bytes.length<100||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')fail(file,'invalid WebP file');
   }
   for(const name of ['scenario','interference','fault']){
    const file=base+'/backs/'+name+'.webp';
    if(!fileSet.has(file)){fail(file,'approved category back missing');continue}
    const bytes=fs.readFileSync(file);
    if(bytes.length<100||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')fail(file,'invalid WebP back');
   }
  }
 }
}
if(issues.length){console.error('SITE INTEGRITY FAILURES: '+issues.length);for(const x of issues)console.error(' - '+x);process.exitCode=1}else console.log('PASS: '+html.size+' HTML documents, '+checked+' local resources, '+all.filter(x=>x.endsWith('.css')).length+' CSS files, '+routes.length+' canonical routes and sitemap coverage.');
