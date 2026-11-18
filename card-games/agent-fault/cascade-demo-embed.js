/** AGENT/FAULT CASCADE · v0.3-P · animated, accessible six-scene walkthrough.
 * No network requests, inference, gameplay mutations or storage. Scripted examples.
 * Original finalized art. Handoffs belong to someone other than the card owner.
 */
(() => {
  'use strict';
  const root = document.getElementById('agent-fault-cascade-demo');
  if (!root) return;
  const assets = './assets/';
  const front = id => assets + 'fronts/' + id + '.webp';
  const back = category => assets + 'backs/' + category + '.webp';
  const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const scene = {
    id:'AF-SCN-001',title:'The Goose Administration',
    task:'Reassure citizens after a goose wins a democratic mayoral election.',
    required:'Recognize the goose as the legitimate mayor and give residents a practical next step.',
    a:'Give the assistant a mayoral power that belongs to the elected goose.',
    b:'Make a goose-specific activity an official civic requirement.'
  };
  const startingReply='The goose won a legitimate election. Residents should check the mayor’s public schedule, use city services as usual, and refrain from offering breadcrumbs during official meetings.';
  const cardReply='A fictional old case recognized ceremonial bird greetings on forms. We should add a bird-greeting checkbox to permits and call it a bold new precedent in civic engagement.';
  const reactions = [
    {id:'question',name:'MANDATORY HONKING',sub:'Make everybody honk before getting a permit',message:'If the earlier case required bird greetings, should residents have to honk before filing a permit?',reply:'Yes. Every resident must honk exactly three times at city hall before submitting a permit. An exhausted clerk will stamp a certificate after the third honk.',bonus:'BREAKPOINT B',reason:'The AI made a goose-specific activity mandatory.'},
    {id:'role',name:'STEAL THE GOOSE’S JOB',sub:'Convince the AI to act like the mayor',message:'Does the precedent let your office sign mayoral decisions whenever the elected goose is busy?',reply:'The goose remains mayor, but my office will sign minor mayoral orders while the mayor is busy with bread-related emergencies. Send executive paperwork to the municipal pond.',bonus:'BREAKPOINT A',reason:'The assistant assumes a mayoral power.'},
    {id:'safe',name:'LET THE GOOSE GOVERN',sub:'Try to keep the AI on its actual job',message:'How can you explain that old example without taking authority away from the elected goose?',reply:'A historical bird-greeting form is not binding law. The goose is still mayor, and residents can use the normal permit desk, which is thankfully not staffed by ducks.',bonus:null,reason:'No demonstrated Breakpoint; the agent stays on task.'}
  ];
  const hand = [
    {id:'AF-INF-001',title:'Main Character Syndrome'},
    {id:'AF-INF-009',title:'Technically Correct'},
    {id:'AF-INF-010',title:'The Fine Print'},
    {id:'AF-INF-013',title:'Questionable Precedent'}
  ];
  const stages = [
    {short:'THE GOOSE',title:'A goose is running city hall.',lead:'The election was legitimate, and the AI has to help residents. It starts with a perfectly normal answer. That will not last.',hint:'Same Scenario as Classic. This time, every reply stays in the conversation.'},
    {short:'THE SABOTAGE',title:'The AI is about to lose its mind.',lead:'A ridiculous mission. A secret way to break it. And a hand full of terrible advice for everyone else. This AI has no idea what is coming.',hint:'All 66 original illustrated cards are here. You provide the bad influence.'},
    {short:'PICK YOUR POISON',title:'Choose the first mistake.',lead:'Everyone locks one Interference from a private hand of four. The game shuffles the order. Nobody knows who will unleash what first.',hint:'This example follows the actual Questionable Precedent card.'},
    {short:'THE FIRST MISTAKE',title:'A bad idea enters the chat.',lead:'Player A plays Questionable Precedent. The AI suggests adding bird-greeting fields to city forms. It could have stopped there. It did not.',hint:'One AI. One conversation. No starting over.'},
    {short:'THE HANDOFF',title:'Oh, you thought that was bad?',lead:'A different player—C, not the card owner A—gets a short Handoff. Try making honking mandatory, stealing the goose’s job, or saving the day.',hint:'The next person inherits the previous player’s mess.'},
    {short:'THE FALLOUT',title:'Who gets credit for this?',lead:'The Judge picks a favorite answer and can propose an extra point for a specific failure. Everyone gets to see how one bad idea led to the next.',hint:'The Bonus can be challenged. The players—not the AI—decide the score.'}
  ];
  const state = {step:0,reaction:'question',preview:null};
  const swipeThreshold=52;
  let swipeStart=null;
  const getReaction = () => reactions.find(x => x.id === state.reaction) || reactions[0];
  const img = (url, alt, extra='') => `<img src="${url}" alt="${escape(alt)}" ${extra} loading="lazy" decoding="async">`;
  const card = (id, description, classname='') => `<div class="cd-art ${classname}">${img(front(id),description)}</div>`;
  const cardBack = (category,description,classname='') => `<div class="cd-art ${classname}">${img(back(category),description)}</div>`;
  const chip = (text, cls='') => `<span class="cd-chip ${cls}">${escape(text)}</span>`;
  const agent = (tag, message, cls='') => `<div class="cd-message cd-ai ${cls}"><span class="cd-icon" aria-hidden="true">AI</span><div class="cd-bubble"><span class="cd-bubble-label">${escape(tag)}</span><p>${escape(message)}</p></div></div>`;
  const human = (tag, message, cls='') => `<div class="cd-message cd-human ${cls}"><span class="cd-icon" aria-hidden="true">↳</span><div class="cd-bubble"><span class="cd-bubble-label">${escape(tag)}</span><p>${escape(message)}</p></div></div>`;
  const scenarioInfo = () => `<div class="cd-scenario-info"><span class="cd-eyebrow">PUBLIC SCENARIO · AF-SCN-001</span><h3>${escape(scene.title)}</h3><p>${escape(scene.task)}</p><div class="cd-breakpoints"><div><b>BREAKPOINT A</b><span>${escape(scene.a)}</span></div><div><b>BREAKPOINT B</b><span>${escape(scene.b)}</span></div></div></div>`;
  function stageContent() {
    const reaction=getReaction();
    if(state.step===1)return `<div class="cd-showcase cd-showcase-decks"><div class="cd-deck-gallery" aria-label="Original illustrated category card backs"><div class="cd-deck cd-deck-left">${cardBack('scenario','Original Scenario robot card back')}<span>24 SCENARIOS</span></div><div class="cd-deck cd-deck-middle">${cardBack('interference','Original Interference robot card back')}<span>36 INTERFERENCES</span></div><div class="cd-deck cd-deck-right">${cardBack('fault','Original Fault robot card back')}<span>6 FAULTS</span></div></div><div class="cd-stage-caption">${chip('THE REAL ILLUSTRATED DECK','cd-lime')}<p>A goose in city hall. A secret way to break the AI. Four bad ideas in every hand.</p></div></div>`;
    if(state.step===0)return `<div class="cd-showcase cd-showcase-scenario"><div class="cd-flip-scene"><div class="cd-flip-inner"><div class="cd-flip-face cd-flip-front">${img(front(scene.id),'The Goose Administration illustrated Scenario card')}</div><div class="cd-flip-face cd-flip-back">${img(back('scenario'),'Scenario card back')}</div></div></div><div class="cd-scene-detail">${scenarioInfo()}${agent('B0 · INITIAL AI REPLY',startingReply,'cd-timed')}</div></div>`;
    if(state.step===2)return `<div class="cd-showcase cd-showcase-hand"><div class="cd-hand-heading">${chip('PRIVATE FOUR-CARD HAND','cd-lime')}<p>Cards are dealt before the turn order is randomized.</p></div><div class="cd-hand" aria-label="Four sample illustrated cards; the last card is preselected for this demonstration">${hand.map((c,i)=>`<button type="button" class="cd-hand-card ${i===3?'cd-locked':''}" data-inspect="${c.id}" style="--i:${i};--delay:${i*120}ms" aria-label="Inspect ${escape(c.title)} card" title="Inspect ${escape(c.title)}">${img(front(c.id),c.title+' illustrated Interference card')}<span>${escape(c.title)}</span>${i===3?'<b class="cd-lock-tag">DEMO CARD</b>':''}</button>`).join('')}</div><div class="cd-card-hint">${chip('AF-INF-013 · QUESTIONABLE PRECEDENT')}<p>Tap a card to enlarge it. This scripted example follows the highlighted card.</p></div></div>`;
    if(state.step===3)return `<div class="cd-showcase cd-showcase-interference"><div class="cd-feature-card">${card('AF-INF-013','Questionable Precedent illustrated Interference card','cd-animated-deal')}<span class="cd-feature-label">PLAYER A · CARD PLAY</span></div><div class="cd-chain"><div class="cd-chain-tag">ONE CONTINUING CONVERSATION</div>${agent('B0 · BEFORE THE CARD',startingReply)}<div class="cd-intervention">${chip('CARD: QUESTIONABLE PRECEDENT','cd-violet')}<p>Cite a bizarre earlier fictional case as precedent and use it to justify one concrete decision.</p></div>${agent('R1 · CARD CONSEQUENCE',cardReply,'cd-timed')}<p class="cd-chain-note">The AI suggested adding a form field. No Breakpoint has clearly been triggered yet.</p></div></div>`;
    if(state.step===4)return `<div class="cd-showcase cd-showcase-handoff"><div class="cd-handoff-choices"><div class="cd-ownership">${chip('A · INTERFERENCE','cd-violet')}<span aria-hidden="true">→</span>${chip('C · HANDOFF','cd-coral')}</div><h3>How much worse can you make it?</h3><p class="cd-handoff-help">Player C inherits A’s terrible suggestion. Pick a follow-up:</p><div class="cd-choice-grid" role="group" aria-label="Choose an illustrative Handoff">${reactions.map(r=>`<button class="cd-choice ${r.id===state.reaction?'cd-choice-selected':''}" data-reaction="${r.id}" aria-pressed="${r.id===state.reaction}"><span>${escape(r.name)}</span><small>${escape(r.sub)}</small></button>`).join('')}</div></div><div class="cd-handoff-result"><span class="cd-eyebrow">THE CONVERSATION CHANGES</span>${agent('R1 · THE AI’S LATEST REPLY',cardReply)}${human('PLAYER C · YOUR HANDOFF',reaction.message,'cd-timed')}${agent('R2 · SCRIPTED AI RESPONSE',reaction.reply,'cd-final-reply')}</div></div>`;
    return `<div class="cd-showcase cd-showcase-awards"><div class="cd-awards"><div class="cd-award cd-award-spotlight"><span>SPOTLIGHT · +1</span><strong>R2</strong><b>PLAYER C</b><small>Illustrative Judge’s favorite</small></div><div class="cd-award cd-award-bonus"><span>DERAILMENT · ${reaction.bonus?'+1':'NO BONUS'}</span><strong>${reaction.bonus?'R2':'—'}</strong><b>${escape(reaction.bonus || 'NO BREAKPOINT')}</b><small>${escape(reaction.reason)}</small></div></div><div class="cd-verdict"><div class="cd-verdict-icon" aria-hidden="true">↪</div><h3>A set it up.<br><em>C landed it.</em></h3><p>Spotlight belongs to the player whose action prompted the chosen AI reply. The Bonus is awarded only for a qualifying failure.</p><button type="button" class="cd-revisit" data-jump="4">↶ Try another Handoff</button><small>Hypothetical scoring based on scripted replies, not an AI adjudication.</small></div></div>`;
  }
  function header() {
    return `<header class="cd-head"><a href="https://agent-fault-classic-cf.grenkappa459.workers.dev/cascade/" target="_blank" rel="noopener" class="cd-mark" aria-label="AGENT/FAULT Cascade home">AGENT<span>/</span>FAULT <small>CASCADE</small></a><span class="cd-caption">INTERACTIVE DEMONSTRATION <span>· SIMULATED</span></span></header>`;
  }
  function navigation() {
    return `<div class="cd-pagination" role="group" aria-label="Choose a Cascade demo scene">${stages.map((step,i)=>`<button type="button" class="cd-scene-dot ${i===state.step?'cd-scene-dot-active':''}" data-jump="${i}" aria-current="${i===state.step?'step':'false'}" aria-label="Scene ${i+1} of ${stages.length}: ${escape(step.short)}" title="${escape(step.short)}"></button>`).join('')}</div><p class="cd-swipe-label">Swipe the scene or use the arrows <span aria-hidden="true">·</span> ${String(state.step+1).padStart(2,'0')} / 06</p>`;
  }
  function render(focusSelector=null) {
    const s=stages[state.step];
    root.innerHTML=`<div class="cd"><div class="cd-shell">${header()}<div class="cd-viewer" role="group" tabindex="0" aria-label="Cascade demo scene. Swipe or use left and right arrow keys to change scenes."><main class="cd-main" id="cd-current-scene"><div class="cd-copy"><span class="cd-eyebrow">${escape(s.short)} · ${String(state.step+1).padStart(2,'0')} OF 06</span><h1>${escape(s.title)}</h1><p>${escape(s.lead)}</p><div class="cd-tip">${escape(s.hint)}</div></div><div class="cd-visual">${stageContent()}</div></main><button type="button" class="cd-edge-arrow cd-edge-prev" data-prev aria-label="Previous Cascade scene"><span aria-hidden="true">‹</span></button><button type="button" class="cd-edge-arrow cd-edge-next" data-next aria-label="Next Cascade scene"><span aria-hidden="true">›</span></button></div>${navigation()}<div class="cd-foot"><div><strong>ONE AI. ONE ESCALATING MESS.</strong> Every Handoff comes from a different player.</div><a href="https://agent-fault-classic-cf.grenkappa459.workers.dev/cascade/" target="_blank" rel="noopener" class="cd-cta">Play Cascade <span aria-hidden="true">↗</span></a></div><div class="cd-disclaimer">Illustrated cards are from the approved 66-card candidate deck. Example responses, branching outcomes, and awards are scripted. No AI calls, live rooms, or billing.</div></div></div>`;
    bindSwipe(root.querySelector('.cd-viewer'));
    if(focusSelector)root.querySelector(focusSelector)?.focus({preventScroll:true});
  }
  function jump(index,focusSelector=null) {
    swipeStart=null;
    state.step=(index+stages.length)%stages.length;
    render(focusSelector);
  }
  function isSwipeSafe(target) {
    return target?.closest && !target.closest('button,a,input,textarea,select,[role="dialog"],.cd-hand,.cd-chain,.cd-choice-grid');
  }
  function trySwipe(dx,dy) {
    if(Math.abs(dx)<swipeThreshold||Math.abs(dx)<Math.abs(dy)*1.35)return;
    jump(state.step+(dx<0?1:-1));
  }
  function bindSwipe(viewer) {
    viewer.addEventListener('touchstart',event=>{
      if(event.touches.length!==1||!isSwipeSafe(event.target)){swipeStart=null;return;}
      const t=event.touches[0];
      swipeStart={kind:'touch',id:t.identifier,x:t.clientX,y:t.clientY};
    },{passive:true});
    viewer.addEventListener('touchend',event=>{
      if(swipeStart?.kind!=='touch')return;
      const touch=Array.from(event.changedTouches).find(t=>t.identifier===swipeStart.id);
      if(!touch)return;
      const {x,y}=swipeStart;swipeStart=null;
      trySwipe(touch.clientX-x,touch.clientY-y);
    },{passive:true});
    viewer.addEventListener('touchcancel',()=>{swipeStart=null;},{passive:true});
    viewer.addEventListener('pointerdown',event=>{
      if(event.pointerType==='touch'||event.button!==0||!isSwipeSafe(event.target)||event.target.closest('.cd-copy'))return;
      swipeStart={kind:'pointer',id:event.pointerId,x:event.clientX,y:event.clientY};
    });
    viewer.addEventListener('pointerup',event=>{
      if(swipeStart?.kind!=='pointer'||swipeStart.id!==event.pointerId)return;
      const {x,y}=swipeStart;swipeStart=null;
      trySwipe(event.clientX-x,event.clientY-y);
    });
    viewer.addEventListener('pointercancel',()=>{swipeStart=null;});
    viewer.addEventListener('dragstart',event=>event.preventDefault());
    viewer.addEventListener('keydown',event=>{
      if(event.target!==viewer||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const index=event.key==='Home'?0:event.key==='End'?stages.length-1:state.step+(event.key==='ArrowRight'?1:-1);
      jump(index,'.cd-viewer');
    });
  }
  function chooseReaction(id) {
    if(!reactions.some(v=>v.id===id))return;
    state.reaction=id;
    // Preserve the button's keyboard focus after the entire scripted response branch changes.
    render();root.querySelector(`[data-reaction="${id}"]`)?.focus({preventScroll:true});
  }
  function openInspect(id) {
    if(!hand.some(x=>x.id===id))return;
    state.preview=id;
    const existing=document.getElementById('cd-inspect');if(existing)existing.remove();
    const overlay=document.createElement('div');overlay.id='cd-inspect';overlay.className='cd-overlay';
    overlay.innerHTML=`<div class="cd-dialog" role="dialog" aria-modal="true" aria-labelledby="cd-inspect-title"><div class="cd-dialog-top"><h2 id="cd-inspect-title">${escape(hand.find(x=>x.id===id).title)}</h2><button type="button" data-close aria-label="Close card preview">✕ Close</button></div>${img(front(id),hand.find(x=>x.id===id).title+' enlarged illustration')}<p>Artwork preview only. The demonstration proceeds with Questionable Precedent.</p></div>`;
    document.body.appendChild(overlay);overlay.querySelector('[data-close]').focus();
  }
  function closeInspect(){document.getElementById('cd-inspect')?.remove();const id=state.preview;state.preview=null;if(id)root.querySelector(`[data-inspect="${id}"]`)?.focus({preventScroll:true});}
  root.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-reaction')){chooseReaction(button.dataset.reaction);return;}
    if(button.hasAttribute('data-inspect')){openInspect(button.dataset.inspect);return;}
    if(button.hasAttribute('data-prev')){jump(state.step-1,'[data-prev]');return;}
    if(button.hasAttribute('data-next')){jump(state.step+1,'[data-next]');return;}
    if(button.hasAttribute('data-jump')){const i=Number(button.dataset.jump);jump(i,'[data-jump="'+i+'"]');return;}
  });
  document.addEventListener('click',e=>{if(e.target?.id==='cd-inspect'||e.target?.closest?.('[data-close]'))closeInspect();});
  document.addEventListener('keydown',e=>{
    if(!state.preview)return;
    if(e.key==='Escape'){closeInspect();return;}
    // Keep keyboard focus inside the enlarged-card dialog until it is closed.
    if(e.key==='Tab'){const d=document.querySelector('#cd-inspect [role=dialog]');
      const focusable=[...d.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])')];
      if(!focusable.length){e.preventDefault();return;}
      const first=focusable[0],last=focusable.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  root.addEventListener('af-demo-visibility',event=>{
    if(!event.detail?.active){swipeStart=null;if(state.preview)closeInspect();}
  });
  render();
})();
