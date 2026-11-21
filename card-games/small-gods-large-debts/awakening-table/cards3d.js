/* SGLD animated cards v0.5-P — ORIGINAL GLB objects, shared renderer, DOM-based game UI.
   No 3D board, camera controls or modifications to source GLBs. */
import * as THREE from 'https://esm.sh/three@0.170.0';
import {GLTFLoader} from 'https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
const N=['The Gap That Hungers','The First Unpaid Cause','The Future That Refused','The Wound Before Light','The Last Witness','The Geometry That Cannot Close','The Choir Without Voices','The Unfinished Constant'];
const DEITY=n=>'assets/deities/SGLD_'+n.toUpperCase()+'_TACTILE_TAROT_CARD_3D_v1.2-P.glb';
const TITAN=n=>'assets/titans/SGLD_OG'+String(n+1).padStart(2,'0')+'_'+N[n].replaceAll(' ','_')+'_3D_Card_v0.1-P_UNAPPROVED.glb';
const MIRACLE=n=>'assets/miracles/SGLD_'+n+'_MIRACLE_POKER_CARD_3D_v0.2-P.glb';
const HAVE=new Set(['M01','M02','M03','M04','M05','M07','M08','M09','M10']);
const $=id=>document.getElementById(id);
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
const loader=new GLTFLoader(), modelCache=new Map(), entries=new Map(), events=[];
let gl,scene,camera,initialized=false,frame=0,activeEvent=null,eventSerial=0,lastFrame=0,session=0,last=null;
const CSS="#setup{position:relative;min-height:380px;overflow:hidden;padding-right:min(42%,270px)}#setup .sg-setup-card{position:absolute;right:1rem;top:1rem;bottom:1rem;width:min(34%,240px);z-index:0}#setup h1,#setup p,#setup label,#setup select,#setup button{position:relative;z-index:1}.sg-card-slot{position:relative;display:block;min-width:0;isolation:isolate;background:transparent;overflow:visible}.sg-card-canvas{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none}.sg-card-placeholder{position:absolute;inset:5%;display:grid;place-content:center;text-align:center;color:#dbbb9a;background:linear-gradient(135deg,#241733,#0f0b1d);border:1px solid #9b745a;border-radius:6px;padding:8px;letter-spacing:.08em;font-size:.68rem;pointer-events:none}.sg-card-slot.ready .sg-card-placeholder{display:none}.sg-card-slot.failed .sg-card-placeholder{border-style:dashed}.sg-card-slot .sg-proxy{position:absolute;bottom:5%;left:50%;transform:translateX(-50%);font-size:.6rem;background:#110c20ed;color:#e9cbab;border:1px solid #a38568;padding:.08rem .28rem;white-space:nowrap;border-radius:3px;pointer-events:none}.board{background:radial-gradient(ellipse at 50% 15%,#362137,#110d1c 65%);padding:1.05rem}.opponents .god{display:flex;align-items:center;gap:.65rem;min-height:120px;flex-wrap:wrap}.sg-opponent-card{width:77px;height:128px;flex:0 0 77px}.sg-opponent-details{flex:1;min-width:105px}.sg-opponent-details .values{font-size:.75rem}.sg-rival-hand{display:flex;flex:1 0 100%;justify-content:center;gap:0;min-height:44px}.sg-hidden-card{width:36px;height:49px;margin-left:-4px}.sg-rival-hand .sg-card-slot:first-child{margin-left:0}.titans{gap:.65rem;margin:.85rem 0 1.4rem}.titan,.titan.shut{background:transparent;border:none;box-shadow:none;min-height:0;width:clamp(105px,29%,210px);padding:.3rem;justify-content:flex-start;gap:.35rem}.titan::before,.titan::after{display:none}.titan .sigil{display:none}.titan .sg-card-slot{height:clamp(150px,19vw,255px);width:100%}.titan strong{font-size:.88rem;min-height:2.1em;color:#e8d3b9}.titan button{font-size:.73rem;position:relative;padding:.45rem .25rem;min-height:36px}.titan.shut strong{font-size:.73rem}.sg-self-card{width:87px;height:147px;flex:0 0 87px}.sg-self-identity{display:flex;gap:.8rem;align-items:center}.desk{background:#1c1428;border:1px solid #825b72;border-radius:9px;padding:.75rem}.hand{display:flex;align-items:flex-start;justify-content:center;gap:.75rem;min-height:250px}.miracle{display:flex;flex-direction:column;position:relative;min-height:0;justify-content:flex-start;width:clamp(140px,30%,220px);border:1px solid #735975;border-radius:10px;background:#171223;padding:.45rem .45rem .65rem;text-align:left;transition:transform .2s,border-color .2s;gap:.3rem}.miracle .sg-card-slot{width:100%;height:clamp(145px,21vw,260px)}.miracle .cost{font-size:.76rem;color:#f8c99b;letter-spacing:.09em;font-weight:700}.miracle strong{font:1.02rem Georgia,serif;color:#f4dfc6}.miracle small{font-size:.7rem;color:#ccbfce;line-height:1.35}.miracle.selected{transform:translateY(-5px);border-color:#f5c78f;box-shadow:0 0 15px #b771af60;outline:1px solid #f5c78f}.miracle:disabled{opacity:1;cursor:default}.miracle.selected .sg-card-slot{filter:drop-shadow(0 0 8px #df9db64a)}#sgCardEvents{display:grid;grid-template-columns:90px 1fr;min-height:127px;gap:.85rem;align-items:center;margin:.7rem 0;border:1px solid #735673;border-radius:10px;background:linear-gradient(115deg,#28182d,#161120);padding:.65rem}#sgCardEvents .sg-event-slot{height:108px;width:85px}#sgEventTitle{font:1.08rem Georgia,serif;color:#f3d7b6;display:block;margin:.25rem 0}#sgEventDetail{font-size:.77rem;color:#cec0d4;line-height:1.4;margin:.35rem 0}#sgCardStatus{font-size:.75rem;color:#cdb8c9;margin:.5rem 0}#sgCardEvents .sg-proxy{font-size:.48rem}@media(max-width:800px){.titan .sg-card-slot{height:clamp(140px,27vw,215px)}.miracle .sg-card-slot{height:clamp(155px,32vw,235px)}}@media(max-width:550px){#setup{padding-right:1.2rem}#setup .sg-setup-card{position:relative;top:auto;right:auto;bottom:auto;width:140px;height:235px;margin:.4rem auto}.sg-opponent-card{width:58px;height:96px;flex-basis:58px}.opponents .god{min-width:130px}.sg-self-card{width:68px;height:116px;flex-basis:68px}.miracle{width:calc(50% - .4rem);min-width:0}.miracle .sg-card-slot{height:clamp(145px,47vw,240px)}.titan .sg-card-slot{height:clamp(130px,43vw,190px)}.titan strong{font-size:.71rem}.titan button{font-size:.65rem}.sg-opponent-details{min-width:75px}}@media(prefers-reduced-motion:reduce){.miracle{transition:none}}";

function load(url){if(!modelCache.has(url)){const p=loader.loadAsync(url).catch(e=>{modelCache.delete(url);throw e});modelCache.set(url,p)}return modelCache.get(url)}
const descriptors={
 deity:name=>({url:DEITY(name),face:'front',alt:name+' deity card'}),
 titan:(id,awake)=>({url:TITAN(awake?id:0),face:awake?'front':'back',alt:awake?N[id]:'Sealed Titan card',neverReveal:!awake}),
 miracle:(card,hidden=false)=>({url:MIRACLE(hidden||!HAVE.has(card.id)?'M01':card.id),face:hidden?'back':HAVE.has(card.id)?'front':'proxy',alt:hidden?'Concealed Miracle':card.name,neverReveal:hidden,proxy:!hidden&&!HAVE.has(card.id),label:card.id}),
 generic:(category,title)=>({url:MIRACLE('M01'),face:'proxy',alt:category+' — '+title,proxy:true,label:category})
};
function makeObject(gltf,d){
 const obj=gltf.scene.clone(true),front=[],back=[],ownedMaterials=[];
 obj.traverse(o=>{if(!o.isMesh)return;const n=(o.name+' '+(o.geometry?.name||'')).toUpperCase();if(n.includes('_FRONT'))front.push(o);else if(n.includes('_BACK'))back.push(o)});
 // The verified source meshes use +Z for front and -Z for back.
 if((d.neverReveal||d.face==='proxy')&&front.length){
  for(const mesh of front){
   if(d.neverReveal)mesh.visible=false;
   else{mesh.material=new THREE.MeshStandardMaterial({color:0x21182e,roughness:.67,metalness:.13,emissive:0x130c25,emissiveIntensity:.55});ownedMaterials.push(mesh.material)}
  }
 }
 // Fail closed: never render an unrecognized hidden/proxy object.
 if((d.neverReveal||d.face==='proxy')&&!front.length)throw Error('Expected named front mesh is missing');
 const b=new THREE.Box3().setFromObject(obj),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3()),pivot=new THREE.Group(),base=new THREE.Group();
 base.add(obj);obj.position.sub(center);base.scale.setScalar(2.6/Math.max(size.y,.00001));pivot.add(base);
 return {pivot,aspect:size.x/Math.max(size.y,.00001),ownedMaterials};
}
function disposeEntry(e){for(const m of e?.ownedMaterials||[])m.dispose();e?.slot?.remove()}
function descKey(d){return d.url+'|'+d.face+'|'+(d.label||'')}
function ensure(key,host,d,opts={}){
 if(!host)return null;const dk=descKey(d);let e=entries.get(key),old=e;
 if(e&&e.dk!==dk){disposeEntry(e);entries.delete(key);e=null}
 if(!e){
  const slot=document.createElement('span');slot.className='sg-card-slot '+(opts.className||'');slot.setAttribute('role','img');slot.setAttribute('aria-label',d.alt+(d.proxy?' — temporary unillustrated card':''));
  const canvas=document.createElement('canvas');canvas.className='sg-card-canvas';canvas.setAttribute('aria-hidden','true');slot.append(canvas);
  const placeholder=document.createElement('span');placeholder.className='sg-card-placeholder';placeholder.textContent=d.alt;slot.append(placeholder);
  if(d.proxy){const tag=document.createElement('span');tag.className='sg-proxy';tag.textContent=(d.label||'CARD')+' · PROXY';slot.append(tag)}
  e={key,dk,d,slot,canvas,ctx:canvas.getContext('2d'),object:null,dirty:true,start:0,duration:opts.duration||650,mode:opts.mode||'deal',selected:!!opts.selected,hover:false,hoverX:0,hoverY:0,session};
  entries.set(key,e);
  // 3D hover uses pointer on the existing DOM element; no model input or camera needed.
  slot.addEventListener('pointermove',ev=>{if(REDUCED||ev.pointerType==='touch')return;const b=slot.getBoundingClientRect();e.hover=true;e.hoverX=(ev.clientX-b.left)/b.width-.5;e.hoverY=(ev.clientY-b.top)/b.height-.5;e.dirty=true});
  slot.addEventListener('pointerleave',()=>{e.hover=false;e.dirty=true});
  const ticket=e;
  load(d.url).then(gltf=>{
   if(entries.get(key)!==ticket)return;
   const built=makeObject(gltf,d);ticket.object=built.pivot;ticket.aspect=built.aspect;ticket.ownedMaterials=built.ownedMaterials;
   ticket.start=performance.now();ticket.dirty=true;
  }).catch(err=>{if(entries.get(key)!==ticket)return;ticket.slot.classList.add('failed');placeholder.textContent=d.alt+' · 3D unavailable';console.warn('SGLD card:',d.url,err);status('A card model could not load. Text controls are still playable.')});
 }else{
  if(e.selected!==!!opts.selected){e.selected=!!opts.selected;e.dirty=true}
  e.slot.className='sg-card-slot '+(opts.className||'')+(e.slot.classList.contains('ready')?' ready':'')+(e.slot.classList.contains('failed')?' failed':'');
 }
 if(e.slot.parentElement!==host){if(opts.prepend)host.prepend(e.slot);else host.append(e.slot);e.dirty=true}
 return e
}
function status(text){const x=$('sgCardStatus');if(x)x.textContent=text}
const ease=t=>1-Math.pow(1-t,3);
function drawCard(e,now){
 if(!gl||!e.object||!e.slot.isConnected)return;
 const w=e.slot.clientWidth,h=e.slot.clientHeight;if(w<5||h<5)return;
 const b=e.slot.getBoundingClientRect();if(b.bottom<0||b.top>innerHeight)return;
 const pixel=Math.min(devicePixelRatio||1,1.6,320/Math.max(w,h)),pw=Math.max(20,Math.round(w*pixel)),ph=Math.max(20,Math.round(h*pixel));
 const t=REDUCED?1:Math.min(1,(now-e.start)/e.duration);
 if(!e.dirty&&t>=1&&!e.hover&&e.canvas.width===pw&&e.canvas.height===ph)return;
 const target=e.d.face==='back'?Math.PI:0;
 let ry=target,rx=0,rz=0,y=0,scale=1;
 if(t<1){
  if(e.mode==='flip'){ry=target+(1-ease(t))*Math.PI;y=Math.sin(t*Math.PI)*.16}
  else if(e.mode==='play'){ry=target+(e.d.neverReveal?0:Math.PI*.48)*(1-ease(t));rz=(1-ease(t))*.13;scale=.65+.35*ease(t);y=(1-ease(t))*(-.45)}
  else{ry=target+(e.d.neverReveal?0:Math.PI)*(1-ease(t));rz=(1-ease(t))*.1;y=(1-ease(t))*(-.25);scale=.82+.18*ease(t)}
 }
 // Hover tilt stays on the same side. No opponent face is disclosed.
 if(e.hover){ry+=e.hoverX*.22;rx=e.hoverY*.14}
 if(e.selected){y+=.05;ry+=.06}
 e.object.rotation.set(rx,ry,rz);e.object.position.set(0,y,0);e.object.scale.setScalar(scale);
 const a=pw/ph,halfY=Math.max(1.54,1.5*(e.aspect||.72)/a),halfX=halfY*a;
 camera.left=-halfX;camera.right=halfX;camera.top=halfY;camera.bottom=-halfY;camera.updateProjectionMatrix();
 if(e.canvas.width!==pw)e.canvas.width=pw;if(e.canvas.height!==ph)e.canvas.height=ph;
 // One reusable WebGL context renders each live GLB, then copies that frame into its card slot.
 gl.setSize(pw,ph,false);scene.add(e.object);gl.render(scene,camera);e.ctx.clearRect(0,0,pw,ph);e.ctx.drawImage(gl.domElement,0,0,pw,ph);scene.remove(e.object);
 e.slot.classList.add('ready');e.dirty=false;
}
function loop(now){
 frame=requestAnimationFrame(loop);
 if(!gl||document.hidden||now-lastFrame<33)return;
 lastFrame=now;
 for(const e of entries.values())try{drawCard(e,now)}catch(err){console.error('Card render failure',err);e.dirty=false}
 if(activeEvent){const entry=entries.get(activeEvent.key);if(!activeEvent.until&&(entry?.object||entry?.slot.classList.contains('failed')||now>=activeEvent.maxWait))activeEvent.until=now+(REDUCED?550:1250);if(activeEvent.until&&now>=activeEvent.until&&events.length)advanceEvent(now)}else if(events.length)advanceEvent(now);
}
function advanceEvent(now){
 const card=events.shift();if(!card)return;activeEvent={until:null,maxWait:now+6000,key:'event-'+(eventSerial+1)};
 const host=$('sgEventVisual');$('sgEventTitle').textContent=card.title;$('sgEventDetail').textContent=card.detail;
 ensure('event-'+(++eventSerial),host,card.desc,{className:'sg-event-slot',mode:'play',duration:650});
 for(const [key,e] of [...entries])if(key.startsWith('event-')&&key!=='event-'+eventSerial){disposeEntry(e);entries.delete(key)}
}
function queue(card){
 events.push(card);if(events.length>12)events.shift();
 if(initialized&&(!activeEvent||(activeEvent.until&&performance.now()>=activeEvent.until)))advanceEvent(performance.now());
}
export function played(actor,card,hidden,cost,glory){
 queue({title:hidden?actor+' performs a hidden Miracle':actor+' performs '+card.name,detail:cost+' Devotion · +'+glory+' Glory'+(hidden?' · Identity concealed':''),desc:descriptors.miracle(card,hidden)});
}
export function boon(actor,name,good){
 queue({title:name,detail:actor+' draws a '+(good?'Good':'Bad')+' Boon · temporary visual',desc:descriptors.generic(good?'GOOD BOON':'BAD BOON',name)});
}
export function covenant(borrower,lender){
 queue({title:'Covenant created',detail:lender+' sponsors '+borrower+': 2 Devotion now, 3 due next personal turn.',desc:descriptors.generic('COVENANT','Debt receipt')});
}
export function reset(){session++;for(const [key,e] of [...entries])if(key!=='setup'){disposeEntry(e);entries.delete(key)}events.length=0;activeEvent=null;last=null;if($('sgEventTitle')){$('sgEventTitle').textContent='Played cards';$('sgEventDetail').textContent='Miracles and drawn cards appear here as they resolve.'}}
export function setup(){
 if(initialized)return;
 gl=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'low-power'});gl.setPixelRatio(1);gl.setClearColor(0x000000,0);gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.NoToneMapping;
 scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1,1,1.54,-1.54,.01,100);camera.position.set(0,0,6);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xffecd9,0xb4b4df,2.2));const key=new THREE.DirectionalLight(0xffffff,2.0);key.position.set(-2,4,7);scene.add(key);const fill=new THREE.DirectionalLight(0xe7ccff,1.4);fill.position.set(2,1,-5);scene.add(fill);
 document.head.append(Object.assign(document.createElement('style'),{textContent:CSS}));
 const root=$('setup'),select=$('deity'),host=document.createElement('div');host.className='sg-setup-card';root.prepend(host);
 function choose(){if(select.value)ensure('setup',host,descriptors.deity(select.value),{className:'sg-setup-model',mode:'flip'})}
 const setupStyles=document.createElement('style');setupStyles.textContent='.sg-setup-model{width:100%;height:100%}';document.head.append(setupStyles);
 select.addEventListener('change',choose);choose();
 const event=document.createElement('section');event.id='sgCardEvents';event.innerHTML='<div id="sgEventVisual"></div><div><div class="eyebrow">CARD RESOLUTION</div><strong id="sgEventTitle">Played cards</strong><p id="sgEventDetail">Miracles and drawn cards appear here as they resolve.</p></div>';
 $('hand').parentElement.insertBefore(event,$('controls'));
 const stat=document.createElement('p');stat.id='sgCardStatus';stat.textContent='Live 3D card models · originals where available · labeled unillustrated proxies otherwise.';$('hand').parentElement.insertBefore(stat,event);
 initialized=true;frame=requestAnimationFrame(loop);
}
export function sync(s){
 if(!initialized)setup();if(!s)return;
 const p=s.players[0],keep=new Set(['setup']);const previous=last;last={titans:s.titans.map(t=>({awake:t.awake,id:t.id})),hand:p.hand.map(c=>c.id)};
 const identity=$('self-name').parentElement;identity.classList.add('sg-self-identity');keep.add('self');
 ensure('self',identity,descriptors.deity(p.name),{className:'sg-self-card',prepend:true});
 const boxes=document.querySelectorAll('#opponents .god');
 boxes.forEach((box,i)=>{
  const rival=s.players[i+1];if(!rival)return;const id='rival-'+i;keep.add(id);
  const details=document.createElement('div');details.className='sg-opponent-details';while(box.firstChild)details.append(box.firstChild);box.append(details);
  ensure(id,box,descriptors.deity(rival.name),{className:'sg-opponent-card',prepend:true});
  const row=document.createElement('div');row.className='sg-rival-hand';row.setAttribute('aria-label',rival.hand.length+' concealed Miracles');box.append(row);
  for(let n=0;n<rival.hand.length;n++){const k=id+'-hand-'+n;keep.add(k);ensure(k,row,descriptors.miracle({id:'M01',name:'Concealed Miracle'},true),{className:'sg-hidden-card'})}
 });
 document.querySelectorAll('#titans .titan').forEach((box,i)=>{
  const t=s.titans[i];if(!t)return;const k='titan-'+i;keep.add(k);
  const flip=!!previous&&!previous.titans[i]?.awake&&t.awake;
  ensure(k,box,descriptors.titan(t.id,t.awake),{prepend:true,mode:flip?'flip':'deal',duration:flip?850:600});
 });
 document.querySelectorAll('#hand .miracle').forEach((box,i)=>{
  const card=p.hand[i];if(!card)return;const k='miracle-'+card.id;keep.add(k);
  ensure(k,box,descriptors.miracle(card),{prepend:true,mode:'deal',selected:s.selected===i});
 });
 for(const [k,e] of [...entries])if(!keep.has(k)&&!k.startsWith('event-')){disposeEntry(e);entries.delete(k)}
}
