/* SGLD — Live tabletop v0.4-P. Original GLB geometry, runtime choreography.
   No alterations to model files, game state or candidate rule texts. */
import * as THREE from 'https://esm.sh/three@0.170.0';
import {GLTFLoader} from 'https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'https://esm.sh/three@0.170.0/examples/jsm/controls/OrbitControls.js';
const N=['The Gap That Hungers','The First Unpaid Cause','The Future That Refused','The Wound Before Light','The Last Witness','The Geometry That Cannot Close','The Choir Without Voices','The Unfinished Constant'];
const D=n=>'assets/deities/SGLD_'+n.toUpperCase()+'_TACTILE_TAROT_CARD_3D_v1.2-P.glb';
const T=n=>'assets/titans/SGLD_OG'+String(n+1).padStart(2,'0')+'_'+N[n].replaceAll(' ','_')+'_3D_Card_v0.1-P_UNAPPROVED.glb';
const M=n=>'assets/miracles/SGLD_'+n+'_MIRACLE_POKER_CARD_3D_v0.2-P.glb';
const S=n=>'assets/seals/SGLD_'+n.toUpperCase()+'_PREMIUM_DIE_STRUCK_3D_v0.3-P.glb';
const DECK='assets/deities/SGLD_EIGHT_DEITIES_ANIMATED_TRUE_3D_DECK_v1.2-P.glb';
const LEDGER='assets/ledger/SGLD_DIVINE_LEDGER_PREMIUM_PHYSICAL_BOARD_v0.3-P.glb';
const DIE='assets/die/SGLD_D8_DIE_OF_UNMAKING_v0.2-P_UNAPPROVED.glb';
const MODELS=new Set(['M01','M02','M03','M04','M05','M07','M08','M09','M10']);
const $=id=>document.getElementById(id);
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const front=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
const back=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,Math.PI));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const cache=new Map(), entities=new Map(), tasks=new Map(), labels=new Map();
const loader=new GLTFLoader(), clock=new THREE.Clock();
let root,stage,info,renderer,scene,camera,orbit,resizeObserver,last,runId=0,raf=0,init=false,rollSeq=0,latest=null,pendingRoll=null,deckFx=null,deckLoading=false,rollQueue=[];
const ease=t=>1-Math.pow(1-t,3);
const colors={Veshka:0xe954a7,Ravel:0xe76c55,Gilt:0xe4ba64,Riff:0xc964e6,Nulve:0x56c9f5,Tally:0xbade65,Keth:0x838aff,Noid:0xb3b3c9};
function fetchModel(url){if(!cache.has(url)){let p=loader.loadAsync(url).catch(e=>{cache.delete(url);throw e});cache.set(url,p)}return cache.get(url)}
function setStatus(x){if(info)info.textContent=x}
function tween(key,ms,fn,done){if(reduced||!ms){fn(1);done?.();return}tasks.set(key,{begin:performance.now(),ms,fn,done})}
function move(e,pos,q,ms=500,lift=0){const start=e.position.clone(),initial=e.quaternion.clone();tween(e.uuid,ms,t=>{e.position.lerpVectors(start,pos,ease(t));e.position.y+=Math.sin(Math.PI*t)*lift;e.quaternion.slerpQuaternions(initial,q,ease(t))})}
function textLabel(id,txt,pos,color='#eee1cb',size=.34){let item=labels.get(id);if(item?.text===txt){item.sprite.position.copy(pos);return}if(item){scene.remove(item.sprite);item.sprite.material.map.dispose();item.sprite.material.dispose()}const c=document.createElement('canvas');c.width=768;c.height=128;let ctx=c.getContext('2d');ctx.font='bold 46px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#0b0817e8';ctx.beginPath();ctx.roundRect(8,8,752,112,19);ctx.fill();ctx.strokeStyle='#bd946b';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=color;ctx.fillText(txt,384,64,720);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));sprite.position.copy(pos);sprite.scale.set(size*6,size,1);sprite.renderOrder=20;scene.add(sprite);labels.set(id,{sprite,text:txt})}
function removeLabel(id){let a=labels.get(id);if(a){scene.remove(a.sprite);a.sprite.material.map.dispose();a.sprite.material.dispose();labels.delete(id)}}
function clean(key,animated=false){let e=entities.get(key);if(!e)return;entities.delete(key);if(animated){const dest=V(0,.6,-.4);move(e.group,dest,front,380,.7);tween('remove-'+e.group.uuid,390,()=>{},()=>scene.remove(e.group))}else{tasks.delete(e.group.uuid);scene.remove(e.group)}removeLabel(key)}
async function ensure(key,url,width,pos,q,options={}){
 let e=entities.get(key);
 if(e&&e.url===url){e.group.userData.click=options.click;e.target={pos:pos.clone(),q:q.clone(),options};if(e.loaded&&(!e.positioned||e.group.position.distanceTo(pos)>.02||e.group.quaternion.angleTo(q)>.03)){move(e.group,pos,q,options.ms??440,options.lift??0);e.positioned=true}return e}
 if(e)clean(key);
 const group=new THREE.Group();group.position.copy(options.from||pos);group.quaternion.copy(options.initialQ||q);group.userData.click=options.click;scene.add(group);
 e={group,url,loaded:false,target:{pos:pos.clone(),q:q.clone(),options},positioned:false};entities.set(key,e);
 try{const gltf=await fetchModel(url);if(entities.get(key)!==e)return e;const model=gltf.scene.clone(true);
 const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(V(0,0,0)),size=bounds.getSize(V(0,0,0));
 const inner=new THREE.Group();inner.add(model);model.position.sub(center);const k=width/Math.max(size.x,0.0001);inner.scale.setScalar(k);group.add(inner);e.model=model;e.scale=k;e.loaded=true;
 const dest=e.target;move(group,dest.pos,dest.q,dest.options.ms??600,dest.options.lift??.3);e.positioned=true;return e
 }catch(err){if(entities.get(key)===e){setStatus('A 3D asset could not load. Text controls remain available.');console.error('SGLD model:',url,err);clean(key)}return null}
}
function layout(){
 const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
 renderer.setSize(w,h,false);const aspect=w/h,halfX=8.5,halfY=Math.max(5.3,halfX/aspect);camera.left=-halfY*aspect;camera.right=halfY*aspect;camera.top=halfY;camera.bottom=-halfY;camera.updateProjectionMatrix()
}
function resetCamera(){camera.position.set(0,12.8,11.8);orbit.target.set(0,0,0);camera.zoom=1;camera.updateProjectionMatrix();orbit.update()}
function tokenFlight(p,q,d,kind){if(!d||reduced)return;let x=seat(p),z=seat(q),material=new THREE.MeshStandardMaterial({color:kind==='glory'?0xffc66a:0x6ad9ff,emissive:kind==='glory'?0x8d5717:0x194b8d,metalness:.75,roughness:.2});let mesh=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.055,24),material);scene.add(mesh);let from=V(x.x,.42,x.z),to=V(z.x,.42,z.z);tween('flight-'+mesh.uuid,650,t=>{mesh.position.lerpVectors(from,to,ease(t));mesh.position.y+=Math.sin(Math.PI*t)*1.8;mesh.rotation.z=t*6;mesh.rotation.x=t*8},()=>{scene.remove(mesh);mesh.geometry.dispose();material.dispose()})}
function seat(id){return id===0?{x:-6.1,z:3.45}:id===1?{x:-5.4,z:-3.55}:id===2?{x:5.4,z:-3.55}:{x:-6.25,z:-.15}}
function showRoll(result){
 const seq=++rollSeq;const dieEntity=entities.get('die');
 if(!result||!dieEntity?.loaded){if(result)pendingRoll=result;return}pendingRoll=null;
 const die=dieEntity.group;tasks.delete(die.uuid);const face=dieEntity.model.getObjectByName('FACE_'+String(result).padStart(2,'0')+'_TEXTURED');
 if(!face){setStatus('D8 '+result+' (face geometry unavailable)');return;}
 // Verified from all eight actual named triangular face meshes in the source GLB.
 const faceNormals=[[1,1,1],[-1,1,1],[-1,1,-1],[1,1,-1],[1,-1,1],[-1,-1,1],[-1,-1,-1],[1,-1,-1]];
 const normal=V(...faceNormals[result-1]).normalize();
 const target=new THREE.Quaternion().setFromUnitVectors(normal,V(0,1,0));
 const spinStart=die.quaternion.clone(),origin=die.position.clone();
 tween('die-spin',1050,t=>{die.position.copy(origin);die.position.y+=Math.sin(Math.PI*t)*1.25;if(t<.72){die.quaternion.setFromEuler(new THREE.Euler(t*19,t*24,t*16))}else{const pivot=new THREE.Quaternion().setFromEuler(new THREE.Euler(.72*19,.72*24,.72*16));die.quaternion.slerpQuaternions(pivot,target,ease((t-.72)/.28))}},()=>{if(seq!==rollSeq)return;die.quaternion.copy(target);die.position.copy(origin);textLabel('roll-result','NATURAL '+result,V(6.1,.65,-.35),'#f7cb88',.39);setStatus('The Die of Unmaking lands on '+result+'.');if(rollQueue.length)showRoll(rollQueue.shift())});
 if(reduced){die.quaternion.copy(target);textLabel('roll-result','NATURAL '+result,V(6.1,.65,-.35),'#f7cb88',.39)}
}
function snapshot(s){return {round:s.round,turn:s.turn,roll:s.roll,events:[...s.events],players:s.players.map(p=>({name:p.name,dev:p.dev,glory:p.glory,hand:p.hand.map(c=>({id:c.id,name:c.name}))})),titans:s.titans.map(t=>({id:t.id,awake:t.awake,name:t.name})),loans:s.loans.map(l=>({...l})),selected:s.selected}}
function newSession(s){runId++;for(const key of [...entities.keys()])clean(key);for(const key of [...labels.keys()])removeLabel(key);tasks.clear();pendingRoll=null;rollQueue=[];rollSeq++;last=null;latest=null;setStatus('Loading original 3D game pieces…')}
function syncState(s){
 if(!init||!s)return;
 const next=snapshot(s);
 if(last&&(next.round<last.round||next.players.map(p=>p.name).join('|')!==last.players.map(p=>p.name).join('|')))newSession(next);
 latest=next;const prev=last;last=next;
 const currentKeys=new Set(['ledger','die']);
 ensure('ledger',LEDGER,3.15,V(-6.25,.035,-.15),front,{ms:650});
 if(!entities.has('die'))ensure('die',DIE,1.05,V(6.1,.52,.4),new THREE.Quaternion(),{ms:400,lift:0}).then(e=>{if(e&&pendingRoll)showRoll(pendingRoll);else if(e&&latest?.roll)showRoll(latest.roll)});
 next.players.forEach((p,i)=>{
   const a=seat(i),key='deity-'+i,seal='seal-'+i;currentKeys.add(key);currentKeys.add(seal);
   ensure(key,D(p.name),1.43,V(a.x,.11,a.z),front,{from:V(0,.4,-.1),lift:.6});
   ensure(seal,S(p.name),.78,V(a.x+1.18,.12,a.z+.45),front,{from:V(a.x,1.0,a.z),lift:.35});
   textLabel('player-'+i,p.name+'  •  '+p.dev+' DEV  /  '+p.glory+' GLORY',V(a.x,.52,a.z-1.25),'#f7e4c6',.46);
   if(prev){const old=prev.players[i];if(p.dev!==old.dev)tokenFlight(p.dev>old.dev?3:i,p.dev>old.dev?i:3,Math.abs(p.dev-old.dev),'devotion');if(p.glory>old.glory)tokenFlight(3,i,p.glory-old.glory,'glory')}
 });
 next.titans.forEach((t,i)=>{
   const key='titan-'+i,x=(i-1)*2.45;currentKeys.add(key);
   const existing=entities.get(key),changed=prev&&!prev.titans[i]?.awake&&t.awake;
   // Use a common back while concealed, never the actual unrevealed Titan.
   const url=t.awake?T(t.id):T(0);
   const q=t.awake?front:back;
   const start=changed?back:q;
   ensure(key,url,1.85,V(x,.12,-.9),q,{initialQ:start,from:V(x,changed?.55:.15,-.9),ms:changed?850:500,lift:changed?.85:.12,click:()=>{const b=document.querySelectorAll('#titans .titan')[i]?.querySelector('button');if(b&&!b.disabled)b.click()}});
   textLabel(key,t.awake?t.name:'SEALED TITAN '+(i+1),V(x,.36,-.9+1.52),'#f5d5ad',.36)
 });
 // Private human hand only; generic physical back for unillustrated card IDs.
 next.players[0].hand.forEach((c,i)=>{
   const key='hand-'+c.id,exact=MODELS.has(c.id),x=(i-(next.players[0].hand.length-1)/2)*1.72;currentKeys.add(key);
   const p=V(x,next.selected===i?.38:.11,3.7);
   ensure(key,M(exact?c.id:'M01'),1.32,p,exact?front:back,{from:V(6.1,.34,3.0),initialQ:back,ms:620,lift:.55,click:()=>document.querySelectorAll('#hand .miracle')[i]?.click()});
   textLabel(key,c.name,V(x,.4,4.9),exact?'#f6dec2':'#bfb5cb',.30)
 });
 // A common Miracle-back stack and two hidden rival hands.
 currentKeys.add('deck');ensure('deck',M('M01'),1.25,V(6.1,.11,3.1),back,{ms:350});
 for(let i=1;i<3;i++){const p=next.players[i],x=i===1?-2.8:2.8;for(let j=0;j<p.hand.length;j++){let key='rival-'+i+'-'+j;currentKeys.add(key);ensure(key,M('M01'),.85,V(x+(j-1)*.32,.1+j*.015,-3.65),back,{from:V(6.1,.45,3.1),ms:450,lift:.6})}}
 for(const key of [...entities.keys()])if(!currentKeys.has(key))clean(key,key.startsWith('hand-'));
 // Detect rolls via log entry, not just numeric change (repeat results are valid).
 const event=next.events.find(x=>x.includes('natural D8'));
 const old=prev?.events.find(x=>x.includes('natural D8'));
 // Explicit roll hook from the game engine is the animation trigger.
 if(prev&&next.loans.length!==prev.loans.length){const l=next.loans.find(x=>!prev.loans.some(y=>y.borrower===x.borrower&&y.lender===x.lender));if(l){tokenFlight(l.lender,l.borrower,2,'devotion');setStatus('Covenant created: 2 Devotion now, 3 due next personal turn.')}else{const settled=prev.loans.find(x=>!next.loans.some(y=>y.borrower===x.borrower&&y.lender===x.lender));if(settled){setStatus('Covenant settled or canceled; see the ledger for actual payment and default.')}}}
}
function initTable(){
 if(init)return;init=true;
 root=document.createElement('section');root.id='liveTable';
 root.innerHTML='<div class="live-head"><div><div class="eyebrow">LIVE TABLETOP • v0.4-P</div><strong>THE AWAKENING TABLE</strong></div><div style="display:flex;gap:.35rem;flex-wrap:wrap"><button id="deckReplay" class="ghost">Replay deck shuffle</button><button id="tableReset" class="ghost">Reset camera</button></div></div><div id="liveStage" aria-label="Live animated 3D tabletop"></div><div id="liveStatus" aria-live="polite">Preparing 3D models…</div><p class="live-tip">Drag to orbit · scroll or pinch to zoom · click your Miracle or a Titan to act. Text controls below remain accessible.</p>';
 const css='#liveTable{margin:1rem 0 1.5rem;padding:.7rem;border:1px solid #ac855d;border-radius:15px;background:#0c0915;box-shadow:0 15px 35px #0008}.live-head{display:flex;justify-content:space-between;align-items:center;padding:.35rem .5rem .75rem}.live-head strong{font:1.2rem Georgia,serif;color:#f2cea3}#liveStage{height:clamp(400px,62vw,680px);position:relative;border-radius:8px;overflow:hidden;background:radial-gradient(ellipse,#41283d,#080710 76%)}#liveStage canvas{display:block;width:100%;height:100%;touch-action:none}#liveStatus{font-size:.82rem;padding:.65rem .5rem;color:#e6caa4}.live-tip{margin:.15rem .5rem;font-size:.72rem;color:#b9a5c4}@media(max-width:550px){#liveStage{height:480px}.live-head button{font-size:.72rem}.live-head strong{font-size:1rem}}';
 document.head.append(Object.assign(document.createElement('style'),{textContent:css}));
 const game=$('game'),layoutNode=game.querySelector('.layout');game.insertBefore(root,layoutNode);stage=$('liveStage');info=$('liveStatus');
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;stage.append(renderer.domElement)}catch(e){setStatus('WebGL is not available in this browser. Use the illustrated controls below.');return}
 scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-8.5,8.5,5.3,-5.3,.01,100);orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.enablePan=false;orbit.minZoom=.6;orbit.maxZoom=2;orbit.minPolarAngle=.1;orbit.maxPolarAngle=Math.PI*.43;resetCamera();
 scene.add(new THREE.HemisphereLight(0xece1ff,0x57334d,2.6));const key=new THREE.DirectionalLight(0xffe0b6,3.3);key.position.set(-4,9,5);scene.add(key);const rim=new THREE.DirectionalLight(0xab9cff,2);rim.position.set(5,4,-7);scene.add(rim);
 const floor=new THREE.Mesh(new THREE.BoxGeometry(17.5,.22,11.9),new THREE.MeshStandardMaterial({color:0x201328,roughness:.85,metalness:.1}));floor.position.y=-.18;scene.add(floor);
 const ringMat=new THREE.MeshBasicMaterial({color:0xa17b5d,transparent:true,opacity:.28,side:THREE.DoubleSide});for(const r of [2.6,2.76,4.6]){const ring=new THREE.Mesh(new THREE.RingGeometry(r,r+.025,96),ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=-.058;scene.add(ring)}
 resizeObserver=new ResizeObserver(()=>layout());resizeObserver.observe(stage);$('tableReset').onclick=resetCamera;$('deckReplay').onclick=playDeck;
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
 renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>8)return;let r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);let hits=ray.intersectObjects([...entities.values()].map(x=>x.group),true);for(let h of hits){let n=h.object;while(n&&!n.userData.click)n=n.parent;if(n?.userData?.click){n.userData.click();break}}});
 function animate(time){raf=requestAnimationFrame(animate);if(!root.isConnected||stage.clientWidth===0)return;for(const [key,t] of [...tasks]){let p=Math.min(1,(time-t.begin)/t.ms);if(p<0)continue;t.fn(p);if(p>=1&&tasks.get(key)===t){tasks.delete(key);t.done?.()}}orbit.update();if(deckFx)deckFx.mixer.update(Math.min(.05,clock.getDelta()));else clock.getDelta();renderer.render(scene,camera)}
 layout();raf=requestAnimationFrame(animate);setStatus('Live 3D scene ready. Models load progressively.');
}
function clearDeck(){if(deckFx){scene.remove(deckFx.group);deckFx.mixer.stopAllAction();deckFx=null}if($('deckReplay'))$('deckReplay').textContent='Replay deck shuffle'}
async function playDeck(){if(deckFx){clearDeck();return}if(deckLoading)return;deckLoading=true;$('deckReplay').textContent='Loading animated deck…';try{const gltf=await fetchModel(DECK);if(!gltf.animations.length)throw Error('Animation clip missing');const g=new THREE.Group(),obj=gltf.scene.clone(true);g.add(obj);const bounds=new THREE.Box3().setFromObject(obj),size=bounds.getSize(V(0,0,0));obj.position.sub(bounds.getCenter(V(0,0,0)));g.scale.setScalar(5.5/Math.max(size.x,size.y,size.z,.01));g.position.set(0,2.3,0);scene.add(g);const mixer=new THREE.AnimationMixer(obj),action=mixer.clipAction(gltf.animations[0]);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;mixer.addEventListener('finished',clearDeck);deckFx={group:g,mixer};action.play();$('deckReplay').textContent='Stop deck shuffle';setStatus('Playing the original animated eight-deity deck clip.')}catch(e){setStatus('Animated deck could not load.');console.error(e);$('deckReplay').textContent='Replay deck shuffle'}finally{deckLoading=false}}
export function setup(){initTable()}
export function reset(){if(renderer){clearDeck();newSession()}}
export function roll(value){if(!renderer)return;if(tasks.has('die-spin'))rollQueue.push(value);else showRoll(value)}
export function sync(s){if(!init)initTable();if(renderer)syncState(s)}
