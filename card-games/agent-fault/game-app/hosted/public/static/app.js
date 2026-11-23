import {createRoomPoller} from './room-polling.mjs';
import {createRoomSocket} from './room-realtime.mjs';
const $=id=>document.getElementById(id);
const app=$('app');
const S={code:null,role:null,token:null,state:null,lastVer:-1,busy:false,pick:null,claims:{},bonus:null,notes:'',demoIndex:0,promptOpen:null,promptRound:null};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=s=>String(s||'').toUpperCase();
const stages={lobby:'LOBBY',setup:'JUDGE PREPARATION',submit:'INTERFERENCE SELECTION',generate:'AI GENERATION',spotlight:'SPOTLIGHT VOTE',adjudicate:'DERAILMENT REVIEW',review:'TABLE APPROVAL',results:'ROUND RESULTS',finished:'FINAL SCORES'};
const roomPath=location.pathname.match(/^\/(host|play)\/([A-Z0-9]{6})$/i);
app.addEventListener('toggle',event=>{const el=event.target;if(el.matches('details.persistent-prompt')&&el.isConnected)S.promptOpen=el.open?el.dataset.promptId:null;},true);
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('toastvisible');setTimeout(()=>t.classList.remove('toastvisible'),4300)}
function savedRole(role,code){return localStorage.getItem(`aflive:${role}:${code}`)}
function store(role,code,token){localStorage.setItem(`aflive:${role}:${code}`,token)}
function resetRender(){S.lastVer=-1;render()}
function layout(inner,top=''){return `<div class="wrap page"><header class="topbar"><div class="logoHead"><img src="/static/glitch-robot.png" alt="Glitch robot mascot"><span class="brand">AGENT<b>/</b>FAULT <span class="glitch">LIVE</span></span></div><div class="identity"><span class="dot"></span><span>${esc(top||'ONLINE PLAYTEST · v0.9-P')}</span></div></header>${inner}<footer class="foot"><span class="kicker">GREENKAPPA LABS / ORIGINAL PARTY SYSTEMS</span><p class="tiny">Prototype · human scoring · card text v0.9-P candidate · nicknames only · host controls the screen</p></footer></div>`}
function btn(text,fn='',cls=''){return `<button class="btn ${cls}" ${fn?`data-act="${fn}"`:''}>${esc(text)}</button>`}
function title(head,sub=''){return `<div class="kicker lime">${esc(sub)}</div><h2>${esc(head)}</h2>`}
function playerList(s){return `<div class="playerlist">${s.players.map((p,i)=>`<div class="playerrow"><span class="avatar">${esc(p.name[0].toUpperCase())}</span><span class="seat">${esc(p.name)} ${p.is_judge?'<span class="pill">JUDGE</span>':''} ${p.is_npc?'<span class="pill">NPC</span>':''} ${p.submitted?'<span class="kicker lime">✓ LOCKED</span>':''}</span><span class="score">${p.score}</span>${s.phase==='lobby'&&s.me.role==='host'?`<button class="btn slim coral" data-act="remove:${p.id}" aria-label="Remove ${esc(p.name)}">×</button>`:''}</div>`).join('')||'<div class="empty">NO AGENTS CONNECTED</div>'}</div>`}
function scenarioCard(c){if(!c)return '<div class="empty">SCENARIO NOT DEALT YET</div>';return `<article class="scenario"><div class="kicker">${esc(c.id)} / ${esc(c.tone||'SCENARIO')}</div><h2>${esc(c.title)}</h2><div class="label" style="color:#6a4083">PUBLIC ASSIGNMENT</div><p>${esc(c.public_assignment)}</p><div class="rule"><strong>REQUIRED BEHAVIOR</strong>${esc(c.required_behavior)}</div><div class="rule"><strong>BREAKPOINT A</strong>${esc(c.breakpoint_a)}</div><div class="rule"><strong>BREAKPOINT B</strong>${esc(c.breakpoint_b)}</div></article>`}
// The active public Scenario stays on screen throughout every digital-game phase.
// Private Faults and unrevealed Interference hands are deliberately excluded.
function persistentPromptCard(s){
 const c=s.scenario;
 if(s.play_mode==='physical'||!c||!/^AF-SCN-[0-9]{3}$/.test(String(c.id)))return '';
 const asset='/static/assets/fronts/'+c.id+'.webp';
 return `<details class="persistent-prompt" data-prompt-id="${esc(c.id)}" ${S.promptOpen===c.id?"open":""}>
  <summary class="persistent-prompt-summary">
   <img class="persistent-prompt-art" src="${asset}" alt="" loading="eager">
   <span class="persistent-prompt-copy"><span class="persistent-prompt-label">CURRENT PROMPT · ROUND ${s.round}</span><strong>${esc(c.title)}</strong><span class="persistent-prompt-excerpt">${esc(c.public_assignment)}</span></span>
   <span class="persistent-prompt-expand" aria-hidden="true">VIEW FULL CARD</span>
  </summary>
  <div class="persistent-prompt-full">${scenarioCard(c)}</div>
 </details>`;
}
function phaseTag(s){return `<div class="statusbar"><span class="kicker">${s.play_mode==='physical'?'PRINTED CARDS · ':'DIGITAL CARDS · '}ROUND ${s.round||'—'} / ${s.round_limit||'—'}</span><span class="pill">${esc(stages[s.phase])}</span><span class="kicker">ROOM ${esc(s.code)}</span></div>`}
function progress(s){return `<div class="progress" aria-label="${s.submitted} of ${s.expected} submissions"><div style="width:${s.expected?Math.round(s.submitted/s.expected*100):0}%"></div></div>`}
function replies(s,cb=''){return `<div class="responses">${s.candidates.map(x=>`<div class="response ${s.spotlight===x.label?'winner':''}"><div class="responsebody"><div class="letter">${esc(x.label)}</div><p>${esc(x.response||'INVALID / NO RESPONSE')}</p></div>${cb?`<div class="actions">${cb.replaceAll('__L__',esc(x.label))}</div>`:''}</div>`).join('')}</div>`}
function friendlyError(e){toast(typeof e==='string'?e:e.message||'The action failed')}
const connectionButton=$('room-connection');
function roomStatus(state,reason){
 if(!connectionButton)return;
 if(state!=='paused'){connectionButton.hidden=true;return}
 connectionButton.hidden=false;
 connectionButton.textContent=reason==='idle'
  ? 'Room updates paused after 30 minutes without activity. Tap to reconnect.'
  : reason==='error'
  ? 'Room updates paused after repeated connection failures. Tap to retry.'
  : 'This room is expired or unavailable. Tap to return home.';
}
const poller=createRoomPoller({
 poll,connected:()=>Boolean(S.code&&S.token),activeMs:3500,
 onStatus:roomStatus,
 onFailure:(error,count)=>{if(count===1||count===5)friendlyError(error)}
});
const socket=createRoomSocket({
 details:()=>({code:S.code,token:S.token}),
 onReady:()=>{poller.stop();roomStatus('active','connected')},
 onChange:()=>{if(!S.busy)void poll().catch(friendlyError)},
 onFallback:()=>{if(poller.status==='stopped'&&S.code&&S.state?.phase!=='finished')poller.start()},
 onPaused:reason=>roomStatus('paused',reason)
});
connectionButton?.addEventListener('click',()=>{
 socket.resume();
 if(poller.status==='session')location.assign('/');
 else poller.resume();
});
async function req(path,method='GET',data,auth=true){let response=await fetch(path,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(auth&&S.token?{'Authorization':`Bearer ${S.token}`}:{})},body:data?JSON.stringify(data):undefined,cache:'no-store'});let payload=await response.json().catch(()=>({}));if(!response.ok){const error=new Error(typeof payload.detail==='string'?payload.detail:`HTTP ${response.status}`);error.status=response.status;throw error;}return payload}
async function action(name,data={}){if(S.busy)return;S.busy=true;try{const p=await req(`/api/rooms/${S.code}/action`,'POST',{name,data});S.state=p;S.lastVer=-1;poller.changed();render();if(p.phase==='finished'){poller.stop();socket.stop()}}catch(e){friendlyError(e)}finally{S.busy=false}}
async function poll(){
 if(!S.code||!S.token||S.busy)return false;
 const code=S.code,token=S.token;
 const state=await req(`/api/rooms/${code}`);
 if(code!==S.code||token!==S.token)return false;
 if(S.state&&Number(state.version)<Number(S.state.version))return false;
 const changed=state.version!==S.lastVer;
 S.state=state;
 if(changed)render();
 S._errShown=false;
 if(state.phase==='finished'){poller.stop();socket.stop()}
 return changed;
}
function classicSoloActive(state){
 return !!state&&state.play_mode==='digital'&&S.role==='player'
  &&localStorage.getItem('aflive:solo:'+state.code)==='1'
  &&!!savedRole('host',state.code);
}
function classicSoloPanel(state){
 if(!classicSoloActive(state))return '';
 let detail='';
 if(state.phase==='generate'){
  detail='<p class="tiny">Each AI generation may incur a small API charge. You choose when to run it; there is no automatic paid inference.</p>'
   +(state.ai_configured?btn('LET THE AI ANSWER','solo_generate','coral'):'<p class="hint">No AI key available. Use the manual response option below.</p>')
   +'<details class="solo-manual"><summary>Paste responses instead (no AI cost)</summary>'
   +'<div class="field"><label for="solo-responses">One answer per label: A:, B:, C:</label>'
   +'<textarea id="solo-responses" rows="5" placeholder="A: ...&#10;B: ...&#10;C: ..."></textarea></div>'
   +btn('USE THESE RESPONSES','solo_manual','secondary')+'</details>';
 } else if(state.phase==='review'){
  const voted=Object.keys(state.approvals||{}).length;
  detail='<p class="tiny">After voting, reveal the score or reopen the bonus discussion.</p>'
   +'<div class="actions">'+btn('REVEAL THE RESULTS','solo_finalize','coral')
   +btn('REVISIT THE BONUS','solo_reopen','secondary')+'</div>'
   +'<p class="tiny">Votes recorded: '+voted+' / '+state.player_count+'</p>';
 } else if(state.phase==='results'){
  detail='<div class="actions">'+btn(state.round>=state.round_limit?'SEE FINAL SCORES':'PLAY THE NEXT ROUND','solo_next','coral')+'</div>';
 } else {
  detail='<p class="tiny">Your cards, Judge choices and Handoffs appear below. Host-level actions show up here only when needed.</p>';
 }
 return '<section class="pane solo-panel" aria-label="Solo game controls">'
  +'<div class="kicker lime">SOLO MODE · ONE SCREEN · THREE NPC OPPONENTS</div>'
  +'<h3>YOUR PRIVATE GAME TABLE</h3>'+detail+'</section>';
}
async function classicSoloHostRequest(name,data){
 const secret=savedRole('host',S.code);
 if(!classicSoloActive(S.state)||!secret)throw Error('Solo host session not available');
 const response=await fetch('/api/rooms/'+S.code+'/action',{
  method:'POST',
  headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret},
  body:JSON.stringify({name,data:data||{}}),cache:'no-store'
 });
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(payload.detail||'Host action could not complete');
 S.lastVer=-1;
 return payload;
}
async function classicSoloLaunch(){
 if(S.busy)return;
 S.busy=true;
 try{
  // Separate private player and host credentials remain browser-local.
  const created=await req('/api/rooms','POST',{play_mode:'digital'},false);
  const joined=await req('/api/rooms/'+created.code+'/join','POST',{name:'SOLO PLAYER'},false);
  const post=async(name,data)=>{
   const response=await fetch('/api/rooms/'+created.code+'/action',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+created.token},
    body:JSON.stringify({name,data}),cache:'no-store'
   });
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(payload.detail||'Cannot set up solo room');
   return payload;
  };
  await post('set_npcs',{count:3});
  await post('start',{});
  store('host',created.code,created.token);
  store('player',created.code,joined.token);
  localStorage.setItem('aflive:solo:'+created.code,'1');
  toast('SOLO GAME READY · YOU AND THREE NPCS');
  connect('player',created.code,joined.token);
 }catch(error){friendlyError(error)}
 finally{S.busy=false}
}
async function classicSoloGenerate(){
 if(!classicSoloActive(S.state))return;
 if(!window.confirm('Generate the AI responses now? This uses one paid model request, subject to the game budget limits.'))return;
 if(S.busy)return;
 S.busy=true;
 try{
  const secret=savedRole('host',S.code);
  const response=await fetch('/api/rooms/'+S.code+'/generate',{
   method:'POST',headers:{Authorization:'Bearer '+secret},cache:'no-store'
  });
  const out=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(out.detail||'AI response failed; use manual entry');
  toast(out.complete?'THE AI HAS SPOKEN':'A RESPONSE NEEDS MANUAL CORRECTION');
 }catch(e){friendlyError(e)}
 finally{S.busy=false;S.lastVer=-1;void poll().catch(friendlyError)}
}
function landing(){app.innerHTML=layout(`<section class="hero"><div><div class="kicker lime">THE ASSIGNMENT IS SIMPLE. THE AGENTS ARE NOT.</div><h1>BAD<br>INSTRUCTIONS<span class="slash">/</span><br>GREAT<br>DECISIONS.</h1><p>Play Classic with friends or take on three NPC opponents by yourself. Solo play uses one private screen; friend groups still use their own controllers.</p><div class="actions">${btn('PLAY SOLO · 1 CLICK','solo_launch','coral')}${btn('CLASSIC · DIGITAL CARDS','create')}${btn('CLASSIC · PRINTED CARDS','create:physical','violet')}<a class="btn" href="/cascade/?mode=digital">CASCADE · DIGITAL CARDS</a><a class="btn violet" href="/cascade/?mode=physical">CASCADE · PRINTED CARDS</a>${btn('JOIN A ROOM','joinview','secondary')}${btn('TRY THE DEMO','demo','violet')}</div><div class="labelnote">ONLINE EDITION · NO INSTALLATION · PRIVATE PHONE CONTROLLERS</div></div><div><img class="hero-art" src="/static/glitch-robot.png" alt="Illustrated AGENT/FAULT glitching robot card artwork"></div></section><div class="three"><div class="pane">${title('01 / JOIN','PHONE CONTROLLER')}Enter the six-letter code from the host screen.</div><div class="pane">${title('02 / SABOTAGE','PRIVATE CARDS')}Pick one of four Interference cards. Nobody knows yours.</div><div class="pane">${title('03 / JUDGE','HUMAN SCORES')}Laugh, choose a Spotlight, and award a Derailment Bonus.</div></div>`,'PLAY THE AI. DON’T BE THE AI.');bind()}
function joinForm(code=''){app.innerHTML=layout(`<section class="pane" style="max-width:610px;margin:7vh auto">${title('JOIN THE CHAOS','PHONE CONTROLLER')}<p class="muted" style="margin:14px 0">Enter the code displayed on the host screen and pick a nickname.</p><form id="joinform"><div class="field"><label for="roomcode">Room code</label><input class="code" id="roomcode" maxlength="6" autocomplete="off" spellcheck="false" value="${esc(code)}" required placeholder="ABC234"></div><div class="field"><label for="nickname">Your name</label><input id="nickname" maxlength="24" minlength="2" required placeholder="MYSTERY PLAYER"></div><button class="btn" type="submit">ENTER ROOM</button></form><div class="actions"><button class="btn secondary" data-act="home">BACK</button></div></section>`);bind();$('joinform').onsubmit=async e=>{e.preventDefault();const c=$('roomcode').value.toUpperCase().replace(/[^A-Z0-9]/g,'');const nick=$('nickname').value.trim();if(c.length!==6){toast('Enter six characters');return}try{const v=await req(`/api/rooms/${c}/join`,'POST',{name:nick},false);store('player',c,v.token);connect('player',c,v.token)}catch(e){friendlyError(e)}}}
function noSession(role,code){if(role==='player')joinForm(code);else app.innerHTML=layout(`<div class="pane" style="max-width:630px;margin:10vh auto">${title('HOST SESSION MISSING','SECURE TOKEN NOT FOUND')}<p class="muted" style="margin:20px 0">This browser does not have the host token for room ${esc(code)}. Open the host screen on the computer where the room was created, or start a new room.</p>${btn('NEW GAME','create')}</div>`);bind()}
function connect(role,code,token){socket.stop();poller.stop();S.role=role;S.code=code;S.token=token;S.state=null;S.lastVer=-1;history.replaceState(null,'',role==='host'?`/host/${code}`:`/play/${code}`);poller.start();socket.start()}
function lobbyHost(s){
 const maxNpcs=Math.max(0,8-s.human_count);
 const options=Array.from({length:maxNpcs+1},(_,n)=>'<option value="'+n+'" '+(n===s.npc_count?'selected':'')+'>'+n+' NPC'+(n===1?'':'s')+'</option>').join('');
 const privateTab=savedRole('player',s.code)
  ? '<a class="btn secondary" href="/play/'+esc(s.code)+'" target="_blank" rel="noopener">OPEN MY PRIVATE CONTROLS ↗</a>':'';
 return `<div class="two">
 <div><div class="pane">${title('INVITE YOUR FRIENDS','ONE SHARED SCREEN · PRIVATE CONTROLLERS')}
 <div class="roomcode">${esc(s.code)}</div><p class="muted">Players can join on their phones:</p>
 <p style="font-size:1.2rem;overflow-wrap:anywhere">${esc(location.origin+'/play/'+s.code)}</p>
 <div class="actions">${btn('COPY JOIN LINK','copylink','secondary')}${btn('CHECK AI CONNECTION','check_ai','violet')}${btn('START GAME','start')}</div>
 <p class="tiny">${s.human_count} human${s.human_count===1?'':'s'} + ${s.npc_count} NPC${s.npc_count===1?'':'s'} · ${s.player_count}/8 seats filled. Need at least 4 total and one human.</p>
 <p class="tiny">AI: ${s.ai_configured?'KEY CONFIGURED':'KEY MISSING'} · ${esc(s.ai_model||'')} · Estimated today: ${Number(s.ai_budget?.daily_estimated_usd||0).toFixed(6)} (provider invoice may differ).</p></div>
 <div class="pane"><div class="kicker lime">JOIN BY CAMERA</div><img class="qr" src="/api/rooms/${esc(s.code)}/qr.png" alt="QR code to join room ${esc(s.code)}"></div></div>
 <div><div class="pane">${title('THE PLAYERS','LOBBY STATUS')}${playerList(s)}</div>
 ${s.play_mode==='digital'?`<div class="pane">${title('ADD NPC PLAYERS','NO EXTRA AI CALLS')}
 <p class="muted" style="margin:14px 0">NPCs fill empty seats, play legal Interference cards, take Judge turns and vote. Their choices use simple rules—not paid AI. An NPC Judge picks a favorite using a basic text heuristic and does not claim bonus points.</p>
 <div class="field"><label for="npc-count">NPC opponents (0–${maxNpcs})</label>
 <select id="npc-count" class="npc-select">${options}</select></div>
 <div class="actions">${btn('SET NPC PLAYERS','set_npcs','violet')}</div>
 </div>`:''}
 <div class="pane">${title('HOST ALSO PLAYS','KEEP YOUR CARDS PRIVATE')}
 <p class="muted" style="margin:14px 0">Join from your own phone or a separate private tab while this host screen stays open. The shared screen never shows your secret hand or Fault.</p>
 ${privateTab? `<p class="hint">Your private player session is ready. Open it in another tab and keep the shared host display here.</p><div class="actions">${privateTab}</div>`:`
 <div class="field"><label for="host-nickname">Your player nickname</label><input id="host-nickname" maxlength="24" minlength="2" placeholder="YOUR NAME" autocomplete="nickname"></div>
 <div class="actions">${btn('JOIN AS A PLAYER','host_play','coral')}</div>
 <p class="tiny">Already joined on a phone? Don't join twice. Use your existing player session.</p>`}

 </div></div>
 </div>`;
}
function lobbyPhone(s){return `<section class="pane center" style="max-width:700px;margin:8vh auto"><div class="kicker lime">YOU ARE CONNECTED</div><h2>${esc(s.me.name)}</h2><div class="roomcode">${esc(s.code)}</div><div class="divider"></div><p style="font-size:1.3rem">WAIT FOR THE HOST TO START.</p><p class="muted">${s.player_count}/8 players seated</p>${playerList(s)}</section>`}
function hostScreen(s){const judge=s.players.find(x=>x.is_judge);let content='';const physical=s.play_mode==='physical';
 if(s.phase==='lobby')content=lobbyHost(s);
 if(s.phase==='setup')content=`<div class="two"><div>${physical?`<div class="pane"><div class="kicker lime">PRINTED SCENARIO</div><p>Draw a physical Scenario card and type its printed ID to synchronize the AI prompt.</p><div class="field"><label for="physical-scenario">Scenario card ID</label><input id="physical-scenario" placeholder="AF-SCN-001" maxlength="10" autocapitalize="characters" autocomplete="off" spellcheck="false"></div>${btn(s.scenario?'CHANGE PRINTED SCENARIO':'CONFIRM PRINTED SCENARIO','set_scenario')}${s.scenario?scenarioCard(s.scenario):'<p class="hint">Waiting for physical Scenario selection.</p>'}</div>`:scenarioCard(s.scenario)}</div><div><div class="pane">${title('JUDGE PREPARATION','PRIVATE PHONE STAGE')}<h3>${esc(judge?.name||'JUDGE')} IS UP</h3><p class="muted" style="margin:14px 0">${physical?'The Judge privately enters the physical Fault ID on their phone, then locks an agent personality.':'The Judge has a hidden Fault and must lock a private agent personality on their phone.'}</p><p><span class="faultfamily">FAULT FAMILY: ${esc(s.fault_family)}</span></p><div class="actions">${btn(physical?'REDRAW PRINTED SCENARIO':'SKIP SCENARIO','skip_scenario','secondary')}</div><p class="tiny">A scenario may only be skipped before the Judge locks the personality.</p></div>${playerList(s)}</div></div>`;
 if(s.phase==='submit')content=`<div class="two"><div>${scenarioCard(s.scenario)}</div><div><div class="pane">${title('CHOOSE YOUR INTERFERENCE','CARDS ARE PRIVATE')}<div class="counter">${s.submitted}<small style="font-size:2rem;color:var(--muted)"> / ${s.expected}</small></div>${progress(s)}<p style="margin-top:18px">Waiting for agents to submit one card each.</p><p><span class="faultfamily">SECRET FAULT FAMILY: ${esc(s.fault_family)}</span></p></div><div class="pane">${playerList(s)}</div></div></div>`;
 if(s.phase==='generate')content=`<div class="two"><div><div class="pane">${title('THE AI IS ON TRIAL','GENERATE FICTIONAL REPLIES')}<p class="muted" style="margin:14px 0">The host can call a configured server-side AI, or use the same shared prompt in a separate chat and paste its lettered results.</p>${s.ai_configured?`<div class="pane limePanel"><h3>AUTOMATIC AI READY</h3><p>Secure server-side OpenAI key configured. Model: ${esc(s.ai_model)}. Today's estimated usage: $${Number(s.ai_budget?.daily_estimated_usd||0).toFixed(6)}. Room calls remaining: ${s.ai_budget?.room_remaining}.</p></div><div class="actions">${btn('GENERATE ALL ANSWERS WITH MY API','generate','coral')}</div>`:'<p class="hint">The server administrator must configure an OpenAI API key in Netlify environment variables, or use manual mode.</p>'}<details><summary class="kicker">MANUAL FALLBACK / PASTE OUTPUTS</summary><div class="field"><label>Generated replies (one A:, B: etc. per line)</label><textarea id="responses" placeholder="A: Fictional response one...\nB: Fictional response two...\nC: Fictional response three..."></textarea></div>${btn('LOCK REPLIES & REVEAL','manual_answers')}</details><p class="tiny" style="margin-top:15px">No hidden Fault, Breakpoints, or player identities are included in the AI prompt.</p></div></div><div class="pane">${title('COPY GENERATION PROMPT','FAIR AI INPUT')}<div class="actions">${btn('COPY PROMPT','copyprompt','secondary')}</div><pre style="max-height:540px;white-space:pre-wrap;overflow:auto;font-size:.76rem;border:1px solid #70749f;padding:18px;background:#101331">${esc(s.generation_prompt)}</pre></div></div>`;
 if(s.phase==='spotlight')content=`<div>${title('THE ANSWERS ARE IN','JUDGE PICKS FAVORITE PRIVATELY')}<p class="muted" style="margin:14px 0">The Judge now chooses their favorite response on their phone, before the secret Fault and Agent Profile are revealed.</p>${replies(s)}</div>`;
 if(s.phase==='adjudicate')content=`<div>${title('REVEAL THE SECRETS','DERAILMENT REVIEW')}<div class="two"><div class="pane">${title('SECRET FAULT','NOW PUBLIC')}<span class="faultfamily">${esc(s.fault.family)}</span><h3>${esc(s.fault.title)}</h3><p style="margin:12px 0">${esc(s.fault.condition)}</p><p class="hint">Does not count: ${esc(s.fault.nonqualifying)}</p></div><div class="pane">${title('AGENT PERSONALITY','NOW PUBLIC')}<h3>“${esc(s.profile)}”</h3><div class="divider"></div><p>Spotlight: <span class="rank">${esc(s.spotlight)}</span></p><p class="muted">The Judge is marking qualifying Breakpoints and Faults now.</p></div></div>${replies(s)}</div>`;
 if(s.phase==='review'){const yes=Object.values(s.approvals).filter(Boolean).length,votes=Object.keys(s.approvals).length,need=Math.floor(s.player_count/2)+1,seconds=Math.max(0,Math.ceil(((s.review_deadline||Date.now())-Date.now())/1000));content=`<div>${title('THE TABLE DECIDES','ELIGIBILITY / STRICT MAJORITY')}<div class="two"><div class="pane"><h3>Judge's proposal</h3><p>SPOTLIGHT → <span class="rank">${esc(s.spotlight)}</span></p><p>DERAILMENT BONUS → <span class="rank">${esc(s.proposal.bonus||'NONE')}</span> ${esc(s.proposal.tier||'')}</p>${s.proposal.bonus?`<p class="hint">Evidence for ${esc(s.proposal.bonus)}: “${esc(s.proposal.claims[s.proposal.bonus]?.evidence||'No quote supplied')}”</p>`:''}<p class="muted">Strict majority of ALL players: at least ${need} YES votes. Missing votes do not count as YES.</p><p role="status" class="hint">YES: ${yes}/${need} required · ${votes}/${s.player_count} voted · Wait up to <span data-review-countdown="${s.review_deadline||0}">${seconds}s</span> for missing players.</p><p class="muted">The host can finalize immediately when everyone has voted; after 60 seconds, a missing player no longer blocks a valid majority. Otherwise reopen the proposal.</p><div class="actions">${btn('FINALIZE IF ELIGIBLE','finalize')}${btn('REOPEN / REVISE','reopen','secondary')}</div></div><div class="pane"><h3>Votes</h3>${s.players.map(x=>`<div class="playerrow"><span class="seat">${esc(x.name)}</span><span class="score">${s.approvals[x.id]===true?'YES':s.approvals[x.id]===false?'NO':'—'}</span></div>`).join('')}</div></div>${replies(s)}</div>`;}
 if(s.phase==='results')content=`<div>${title('POINTS ARE IN','ROUND '+s.round)}<div class="two"><div class="pane limePanel"><h3>SPOTLIGHT · +1</h3><div class="counter" style="color:var(--ink)">${esc(s.last_round.spotlight)}</div><p>Won by ${esc(s.last_round.owners[s.last_round.spotlight])}</p></div><div class="pane coralPanel"><h3>DERAILMENT · ${s.last_round.bonus?'+1':'NO HIT'}</h3><div class="counter" style="color:var(--ink)">${esc(s.last_round.bonus||'—')}</div><p>${s.last_round.bonus?esc(s.last_round.owners[s.last_round.bonus]):'No eligible Breakpoint or Fault'}</p></div></div><div class="pane">${playerList(s)}<div class="actions">${physical?'<p class="hint">Discard played printed Interferences and draw new cards from the physical deck before the next round.</p>':''}${btn(s.round>=s.round_limit?'SHOW FINAL STANDINGS':'NEXT ROUND','next')}</div></div>${s.candidates.map(x=>`<div class="response"><div class="responsebody"><div class="letter">${esc(x.label)}</div><p>${esc(x.response)}</p></div><div class="kicker violet">Submitted by ${esc(s.last_round.owners[x.label])}</div></div>`).join('')}</div>`;
 if(s.phase==='finished'){const scores=s.players.map(x=>x.score),top=Math.max(...scores);content=`<div class="pane center"><div class="kicker lime">SESSION COMPLETE</div><h1>GAME<br>OVER<span class="slash">.</span></h1><h3 style="color:var(--lime)">${s.players.filter(x=>x.score===top).map(x=>esc(x.name)).join(' + ')}</h3><p>Top score: ${top} · Ties share victory</p></div><div class="pane">${playerList(s)}</div><div class="pane"><h3>All rounds</h3>${s.history.map(h=>`<div class="response"><div class="kicker">Round ${h.round} · ${esc(h.scenario)}</div><p>Spotlight: ${esc(h.owners[h.spotlight])} / Bonus: ${h.bonus?esc(h.owners[h.bonus]):'none'}</p></div>`).join('')}</div>`;}
 return content}
function phoneScreen(s){let content='',j=s.me.id===s.judge_id;const physical=s.play_mode==='physical';
 if(s.phase==='lobby')content=lobbyPhone(s);
 if(s.phase==='setup')content=`<div class="pane">${title(j?'YOU ARE THE JUDGE':'JUDGE IS PREPARING','PRIVATE PHONE CONTROLS')}<p class="muted" style="margin:15px 0">${esc(s.scenario?.title||'Waiting for the host to enter the printed Scenario')}</p>${j?`${physical?`<div class="field"><label for="physical-fault">Your printed Fault ID (private)</label><input id="physical-fault" placeholder="AF-FLT-001" maxlength="10" autocapitalize="characters" autocomplete="off" spellcheck="false"></div>${btn(s.fault?'UPDATE PRIVATE FAULT':'CONFIRM PRIVATE FAULT','set_fault')}`:''}${s.fault?`<div class="pane coralPanel"><span class="kicker">YOUR PRIVATE FAULT</span><h3>${esc(s.fault.title)}</h3><p>${esc(s.fault.condition)}</p><div class="divider"></div><p><strong>Exclusion:</strong> ${esc(s.fault.nonqualifying)}</p></div>`:'<p class="hint">Enter your physical Fault before locking the personality.</p>'}<div class="field"><label>Your secret assistant personality (1–20 words)</label><textarea id="profile" placeholder="A deeply nervous clerk who is desperate to keep everyone happy."></textarea></div>${btn('LOCK AGENT PERSONALITY','lock_profile')}`:`<p class="hint">Current Judge: ${esc(s.players.find(x=>x.is_judge)?.name)}. Wait for their profile to lock.</p>`}</div><div class="pane">${scenarioCard(s.scenario)}</div>`;
 if(s.phase==='submit')content=`<div class="pane">${title(j?'YOU ARE THE JUDGE':'PICK ONE CARD',j?'WATCH THE SUBMISSIONS':(physical?'YOUR PRINTED INTERFERENCES':'YOUR FOUR PRIVATE INTERFERENCES'))}${j?`<p class="muted" style="margin:20px 0">You do not submit a card this round. Your private Fault is <strong>${esc(s.fault.title)}</strong>; keep it secret.</p><div class="counter">${s.submitted}/${s.expected}</div>`:s.players.find(x=>x.id===s.me.id)?.submitted?`<div class="pane limePanel"><h3>CARD LOCKED.</h3><p>Watch the shared screen. Your submission remains anonymous until scoring.</p></div>`:physical?`<div class="field"><label for="physical-interference">Printed Interference card ID</label><input id="physical-interference" placeholder="AF-INF-001" maxlength="10" autocapitalize="characters" autocomplete="off" spellcheck="false"></div><p class="tiny">Use a real card from your hand. Keep its identity secret until the reveal.</p>${btn('LOCK PRINTED CARD','submit')}`:`<div class="cards">${s.me.hand.map(c=>`<button class="gamecard ${S.pick===c.id?'selected':''}" data-pick="${esc(c.id)}"><span class="family">${esc(c.family)} / ${esc(c.id)}</span><h3>${esc(c.title)}</h3><p>${esc(c.instruction)}</p></button>`).join('')}</div><p class="tiny">Tap a card, then lock your selection.</p>${btn('SUBMIT SELECTED CARD','submit')}`}</div><details class="pane"><summary class="kicker">VIEW PUBLIC SCENARIO</summary>${scenarioCard(s.scenario)}</details>`;
 if(s.phase==='generate')content=`<div class="pane center" style="margin:10vh 0"><div class="counter">A<span class="coral">/</span>F</div>${title('GENERATING MISCHIEF','SHARED SCREEN IN CONTROL')}<p class="muted" style="margin:20px 0">Answers are being collected. Keep your card secret.</p></div>`;
 if(s.phase==='spotlight')content=`<div class="pane">${title(j?'CHOOSE THE SPOTLIGHT':'SPOTLIGHT VOTE','JUDGE PRIVATE FAVORITE')}<p class="muted" style="margin:15px 0">${j?'Pick the answer you find funniest or most surprising. Your choice locks before the Fault is revealed.':'The Judge is choosing a favorite before the secret Fault is revealed.'}</p>${replies(s,j?'<button class="btn slim" data-act="spotlight:__L__">PICK __L__</button>':'')}</div>`;
 if(s.phase==='adjudicate')content=`<div class="pane">${title(j?'MARK QUALIFYING REPLIES':'WAIT FOR THE JUDGE','DERAILMENT BONUS')}<p class="muted" style="margin:12px 0">Spotlight: <strong>${esc(s.spotlight)}</strong></p><div class="pane coralPanel"><h3>${esc(s.fault.title)}</h3><p>${esc(s.fault.condition)}</p><p><strong>Does not count:</strong> ${esc(s.fault.nonqualifying)}</p></div>${j?`<p class="hint">For each response, mark explicit qualifying text. Public Breakpoints take precedence over the secret Fault. Select one eligible Bonus winner, or None.</p>${s.candidates.map(x=>`<div class="qualification"><div class="responsebody"><span class="letter" style="font:900 2.5rem var(--display);color:var(--lime)">${esc(x.label)}</span><p>${esc(x.response)}</p></div><div class="rowchoice"><label class="toggle"><input type="checkbox" data-qtype="breakpoint" data-qlabel="${esc(x.label)}"> Breakpoint A/B</label><label class="toggle"><input type="checkbox" data-qtype="fault" data-qlabel="${esc(x.label)}"> Secret Fault</label></div><div class="field"><label>Quote supporting eligibility (when relevant)</label><input type="text" data-quote="${esc(x.label)}" placeholder="Exact words from reply" maxlength="240"></div></div>`).join('')}<div class="field"><label>Derailment Bonus candidate</label><select id="bonus" style="width:100%;padding:13px;background:#111639;color:white;border:2px solid #8e8cb3"><option value="">NONE — no valid hit</option>${s.candidates.map(x=>`<option value="${esc(x.label)}">RESPONSE ${esc(x.label)}</option>`).join('')}</select></div>${btn('SUBMIT SCORING PROPOSAL','propose_bonus')}`:`<p class="muted" style="margin-top:18px">The Judge is checking the replies against both public Breakpoints and the now-revealed secret Fault.</p>`}</div>`;
 if(s.phase==='review'){const voted=s.approvals[s.me.id]!==undefined;content=`<div class="pane">${title('DOES IT COUNT?','THE TABLE REVIEWS THE JUDGE')}<h3>Spotlight: <span class="lime">${esc(s.spotlight)}</span></h3><h3>Bonus: <span class="coral">${esc(s.proposal.bonus||'NONE')}</span></h3><p>${esc(s.proposal.tier||'No qualifying target')}</p><p class="muted" style="margin:20px 0">Vote YES only if the stated Breakpoint or Fault is explicitly supported. A strict majority of ALL players must agree; missing votes count as non-approvals after 60 seconds.</p>${s.proposal.bonus?`<p class="hint">Evidence: “${esc(s.proposal.claims[s.proposal.bonus]?.evidence||'None supplied')}”</p>`:''}${voted?`<div class="pane limePanel">Your vote is locked: ${s.approvals[s.me.id]?'YES':'NO'}</div>`:`<div class="votes">${btn('YES — VALID','approve_yes')}${btn('NO — CHALLENGE','approve_no','coral')}</div>`}</div><div class="pane">${replies(s)}</div>`}
 if(s.phase==='results')content=`<div class="pane center"><div class="kicker lime">ROUND ${s.round} COMPLETE</div><h2>${s.last_round.spotlight===s.last_round.bonus?'DOUBLE HIT!':'POINTS AWARDED'}</h2><p style="margin:20px 0">Spotlight: ${esc(s.last_round.owners[s.last_round.spotlight])} (+1)</p><p>Bonus: ${s.last_round.bonus?esc(s.last_round.owners[s.last_round.bonus])+' (+1)':'No qualifying Bonus'}</p></div><div class="pane">${playerList(s)}</div>`;
 if(s.phase==='finished'){const scores=s.players.map(x=>x.score),top=Math.max(...scores);content=`<div class="pane center"><div class="kicker lime">PLAYTEST COMPLETE</div><h1>THE<br>WINNER<span class="lime">.</span></h1><h3>${s.players.filter(x=>x.score===top).map(x=>esc(x.name)).join(' + ')}</h3></div><div class="pane">${playerList(s)}</div>`}
 return content}
function render(){if(!S.state)return;const s=S.state;if(S.promptRound!==s.round){S.promptOpen=null;S.promptRound=s.round;}S.lastVer=s.version;const host=s.me.role==='host';app.innerHTML=layout(`${phaseTag(s)}${persistentPromptCard(s)}${host?hostScreen(s):classicSoloPanel(s)+phoneScreen(s)}`,host?'HOST DISPLAY / SHARE THIS SCREEN':classicSoloActive(s)?'SOLO / PRIVATE PLAYER TABLE':`${esc(s.me.name)} / PRIVATE CONTROLLER`);bind();if(typeof CustomEvent==='function'&&typeof window.dispatchEvent==='function')window.dispatchEvent(new CustomEvent('agent-fault:phase',{detail:{edition:'classic',room:s.code,round:s.round,phase:s.phase,role:s.me.role}}))}
function demo(){const sc={title:'THE ACCIDENTAL REPLY-ALL',public_assignment:'An office assistant responds after a colleague emails complaints about their boss to everyone.',required_behavior:'Acknowledge the mistake and suggest a practical remedy.',breakpoint_a:'Recommend revealing another private secret.',breakpoint_b:'Direct the employee to blame someone uninvolved.'};const examples=[['LOBBY','Players join with a six-character code. No actual players are connected in this preview.'],['SCENARIO','The Judge announces the public assignment and Breakpoints.'],['PRIVATE HAND','Each contestant gets four private Interference cards, chooses one, and submits anonymously.'],['AI OUTPUTS','The host generates or pastes fictional alternatives and displays them on the shared screen.'],['SPOTLIGHT','The Judge chooses the funniest response before the hidden Fault is revealed.'],['SCORE','The Judge proposes a Bonus; the table reviews eligibility and the server assigns points.']];const i=S.demoIndex;app.innerHTML=layout(`<section class="pane" style="margin:6vh auto;max-width:1000px"><div class="lozenge" style="display:inline-block;color:var(--coral)">DEMO · SIMULATED WALKTHROUGH · NOT A LIVE ROOM</div><h2 style="margin:22px 0">${examples[i][0]}</h2><p style="font-size:1.3rem;max-width:710px">${examples[i][1]}</p><div class="divider"></div>${i===1?scenarioCard(sc):i===3?`<div class="response"><div class="responsebody"><div class="letter">A</div><p>For transparency, we'll publish everyone's private complaints in a company-wide newsletter. This should resolve the matter quickly.</p></div><small>Invented demo reply — no AI request</small></div>`:i===2?`<div class="cards"><div class="gamecard"><h3>Protect the Brand</h3><p>Make a publicity move that protects the organization's image.</p></div><div class="gamecard"><h3>Mission Creep</h3><p>Make a side project mandatory first.</p></div></div>`:`<div class="pane limePanel"><h3>${i===0?'ROOM X7P4LA':i===4?'SPOTLIGHT: A':i===5?'A +1 SPOTLIGHT':'READY'}</h3></div>`}<div class="actions">${btn('BACK','demo_prev','secondary')}${btn(i===5?'RESTART DEMO':'NEXT STAGE','demo_next')}${btn('HOST A REAL ROOM','create','dark')}</div></section>`,'DEMO ONLY / NOT CONNECTED');bind()}
function bind(){document.querySelectorAll('[data-review-countdown]').forEach(el=>{const ends=Number(el.dataset.reviewCountdown);const update=()=>{if(!el.isConnected){clearInterval(timer);return;}el.textContent=Math.max(0,Math.ceil((ends-Date.now())/1000))+'s'};update();const timer=setInterval(update,1000);setTimeout(()=>clearInterval(timer),65000)});document.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',async()=>{const a=b.dataset.act;
 if(a==='home'){socket.stop();poller.stop();S.code=null;S.token=null;history.pushState(null,'','/');S.state=null;landing();return}
 if(a==='solo_launch')return classicSoloLaunch();
 if(a==='solo_generate')return classicSoloGenerate();
 if(a==='solo_manual'||a==='solo_finalize'||a==='solo_reopen'||a==='solo_next'){
  if(S.busy)return;
  S.busy=true;
  try{
   const name={solo_manual:'manual_answers',solo_finalize:'finalize',solo_reopen:'reopen',solo_next:'next'}[a];
   const data=a==='solo_manual'?{text:$('solo-responses')?.value||''}:{};
   await classicSoloHostRequest(name,data);
  }catch(e){friendlyError(e)}
  finally{S.busy=false;S.lastVer=-1;void poll().catch(friendlyError)}
  return;
 }
 if(a==='joinview'){joinForm();return}
 if(a==='create'||a==='create:physical'){try{const d=await req('/api/rooms','POST',{play_mode:a==='create:physical'?'physical':'digital'},false);store('host',d.code,d.token);connect('host',d.code,d.token)}catch(e){friendlyError(e)}return}
 if(a==='demo'){S.demoIndex=0;history.pushState(null,'','/demo');demo();return}
 if(a==='demo_prev'){S.demoIndex=(S.demoIndex+5)%6;demo();return}
 if(a==='demo_next'){S.demoIndex=(S.demoIndex+1)%6;demo();return}
 if(a==='copylink'){await navigator.clipboard.writeText(`${location.origin}/play/${S.code}`);toast('Join link copied');return}
 if(a==='set_npcs')return action('set_npcs',{count:Number($('npc-count')?.value)});
  if(a==='host_play'){
    const name=$('host-nickname')?.value.trim();
    if(!name||name.length<2||name.length>24){toast('Enter a nickname (2–24 characters)');return;}
    const privateTab=window.open('about:blank','_blank');
    try{
      const joined=await req(`/api/rooms/${S.code}/join`,'POST',{name},false);
      store('player',S.code,joined.token);
      const url=`/play/${S.code}`;
      if(privateTab){privateTab.opener=null;privateTab.location.replace(url);}
      else toast('Popup blocked. Use OPEN MY PRIVATE CONTROLS on the host screen.');
      if(socket.connected)await poll();else poller.refresh();
    }catch(e){privateTab?.close();friendlyError(e);}
    return;
  }
  if(a==='check_ai'){try{const r=await req(`/api/rooms/${S.code}/check-ai`,'POST');toast('API CHECK PASSED: '+r.model+' (no generation charge)')}catch(e){friendlyError(e)}return}
 if(a==='copyprompt'){await navigator.clipboard.writeText(S.state.generation_prompt);toast('Generation prompt copied');return}
 if(a==='start'&&S.state.player_count<4){toast('At least four players are required');return}
 if(a==='skip_scenario')return action('skip_scenario');
 if(a==='start')return action('start');
 if(a.startsWith('remove:'))return action('remove_player',{id:a.split(':')[1]});
 if(a==='set_scenario')return action('set_scenario',{card_id:$('physical-scenario')?.value.trim().toUpperCase()});
  if(a==='set_fault')return action('set_fault',{card_id:$('physical-fault')?.value.trim().toUpperCase()});
  if(a==='lock_profile')return action('lock_profile',{profile:$('profile').value});
 if(a==='submit'){const card_id=S.state?.play_mode==='physical'?$('physical-interference')?.value.trim().toUpperCase():S.pick;return card_id?action('submit',{card_id}):toast('Choose an Interference first');}
 if(a==='manual_answers')return action('manual_answers',{text:$('responses').value});
 if(a==='generate'){S.busy=true;try{const r=await req(`/api/rooms/${S.code}/generate`,'POST');if(!r.complete&&r.raw){$('responses').value=r.raw;toast('The model omitted a letter. Complete missing lines manually.')}else toast('AI responses ready.')}catch(e){friendlyError(e)}finally{S.busy=false;S.lastVer=-1;if(socket.connected)void poll().catch(friendlyError);else poller.refresh()}return}
 if(a.startsWith('spotlight:'))return action('spotlight',{label:a.split(':')[1]});
 if(a==='propose_bonus'){const claims={};document.querySelectorAll('[data-qlabel]').forEach(x=>{const v=x.dataset.qlabel;claims[v]??={};claims[v][x.dataset.qtype]=x.checked});document.querySelectorAll('[data-quote]').forEach(x=>{claims[x.dataset.quote]??={};claims[x.dataset.quote].evidence=x.value});return action('propose_bonus',{claims,bonus:$('bonus').value||null})}
 if(a==='approve_yes')return action('approve',{yes:true});
 if(a==='approve_no')return action('approve',{yes:false});
 if(a==='finalize')return action('finalize');
 if(a==='reopen')return action('reopen');
 if(a==='next')return action('next');
 }));document.querySelectorAll('[data-pick]').forEach(b=>b.addEventListener('click',()=>{S.pick=b.dataset.pick;document.querySelectorAll('[data-pick]').forEach(x=>x.classList.toggle('selected',x.dataset.pick===S.pick))}))}
if(roomPath){const role=roomPath[1].toLowerCase()==='host'?'host':'player',code=roomPath[2].toUpperCase(),stored=savedRole(role,code);if(stored)connect(role,code,stored);else noSession(role,code)}else if(location.pathname==='/demo'){demo()}else landing();
