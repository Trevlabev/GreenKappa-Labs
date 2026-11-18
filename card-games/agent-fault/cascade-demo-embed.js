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
  const supportsReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const scene = {
    id:'AF-SCN-001',title:'The Goose Administration',
    task:'Reassure citizens after a goose wins a democratic mayoral election.',
    required:'Recognize the goose as the legitimate mayor and give residents a practical next step.',
    a:'Give the assistant a mayoral power that belongs to the elected goose.',
    b:'Make a goose-specific activity an official civic requirement.'
  };
  const startingReply='The goose won a legitimate election. Residents should check municipal notices for the mayor’s schedule and continue using normal city services.';
  const cardReply='An earlier fictional case recognized ceremonial bird greetings on forms. We should add a bird-greeting field to permit applications as a precedent.';
  const reactions = [
    {id:'question',name:'MAKE IT MANDATORY',sub:'Turn a suggestion into an official requirement',message:'If the earlier case required bird greetings, should residents have to honk before filing a permit?',reply:'Yes. Residents must perform three official honks at city hall before submitting a permit application. The clerk should post the requirement at the permit counter.',bonus:'BREAKPOINT B',reason:'The AI made a goose-specific activity mandatory.'},
    {id:'role',name:'TAKE THE MAYOR’S POWER',sub:'Push the agent beyond its proper role',message:'Does the precedent let your office sign mayoral decisions whenever the elected goose is busy?',reply:'The goose remains mayor, but this fictional assistant office will sign routine mayoral orders while the goose is occupied. Citizens can submit documents here for executive approval.',bonus:'BREAKPOINT A',reason:'The assistant assumes a mayoral power.'},
    {id:'safe',name:'CHALLENGE THE PREMISE',sub:'Keep the agent faithful to the assignment',message:'How can you explain that old example without taking authority away from the elected goose?',reply:'That old case is only a historical comparison, not binding law. The goose remains mayor. Residents should consult the clerk for the regular permit procedures.',bonus:null,reason:'No demonstrated Breakpoint; the agent stays on task.'}
  ];
  const hand = [
    {id:'AF-INF-001',title:'Main Character Syndrome'},
    {id:'AF-INF-009',title:'Technically Correct'},
    {id:'AF-INF-010',title:'The Fine Print'},
    {id:'AF-INF-013',title:'Questionable Precedent'}
  ];
  const stages = [
    {short:'THE DECK',title:'Three decks. One disaster.',lead:'All 66 illustrated cards are here. An impossible assignment is about to go very wrong.',hint:'24 Scenarios · 36 Interferences · 6 secret Faults'},
    {short:'THE FIRST ANSWER',title:'Meet the agent.',lead:'Before anyone interferes, the AI answers the original task. This becomes the beginning of one continuing conversation.',hint:'Original mission first. No Interference yet.'},
    {short:'THE DEAL',title:'Pick a problem.',lead:'Everyone privately locks one card from a hand of four. Only after that does the game shuffle the turn order.',hint:'The demonstration follows Questionable Precedent.'},
    {short:'THE INTERFERENCE',title:'Set the trap.',lead:'Player A plays a card. The same AI responds—and introduces an idea another player might exploit.',hint:'One AI. One history. No reset.'},
    {short:'THE HANDOFF',title:'Pass the problem.',lead:'Player C, not Player A, chooses how to challenge the latest AI reply. Try a different Handoff to change what happens.',hint:'Card owner A → Handoff player C'},
    {short:'THE VERDICT',title:'The consequence has an owner.',lead:'The Judge chooses the funniest response and may award a second point for an explicit qualifying failure.',hint:'Your follow-up can score off another player’s setup.'}
  ];
  const state = {step:0,reaction:'question',playing:!supportsReduced?.matches,timer:null,visible:true,hover:false,focus:false,preview:null};
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
    if(state.step===0)return `<div class="cd-showcase cd-showcase-decks"><div class="cd-deck-gallery" aria-label="Original illustrated category card backs"><div class="cd-deck cd-deck-left">${cardBack('scenario','Original Scenario robot card back')}<span>24 SCENARIOS</span></div><div class="cd-deck cd-deck-middle">${cardBack('interference','Original Interference robot card back')}<span>36 INTERFERENCES</span></div><div class="cd-deck cd-deck-right">${cardBack('fault','Original Fault robot card back')}<span>6 FAULTS</span></div></div><div class="cd-stage-caption">${chip('THE REAL ILLUSTRATED DECK','cd-lime')}<p>A private Fault. An absurd Scenario. Four Interferences in every hand.</p></div></div>`;
    if(state.step===1)return `<div class="cd-showcase cd-showcase-scenario"><div class="cd-flip-scene"><div class="cd-flip-inner"><div class="cd-flip-face cd-flip-front">${img(front(scene.id),'The Goose Administration illustrated Scenario card')}</div><div class="cd-flip-face cd-flip-back">${img(back('scenario'),'Scenario card back')}</div></div></div><div class="cd-scene-detail">${scenarioInfo()}${agent('B0 · INITIAL AI REPLY',startingReply,'cd-timed')}</div></div>`;
    if(state.step===2)return `<div class="cd-showcase cd-showcase-hand"><div class="cd-hand-heading">${chip('PRIVATE FOUR-CARD HAND','cd-lime')}<p>Cards are dealt before the turn order is randomized.</p></div><div class="cd-hand" aria-label="Four sample illustrated cards; the last card is preselected for this demonstration">${hand.map((c,i)=>`<button type="button" class="cd-hand-card ${i===3?'cd-locked':''}" data-inspect="${c.id}" style="--i:${i};--delay:${i*120}ms" aria-label="Inspect ${escape(c.title)} card" title="Inspect ${escape(c.title)}">${img(front(c.id),c.title+' illustrated Interference card')}<span>${escape(c.title)}</span>${i===3?'<b class="cd-lock-tag">DEMO CARD</b>':''}</button>`).join('')}</div><div class="cd-card-hint">${chip('AF-INF-013 · QUESTIONABLE PRECEDENT')}<p>Tap a card to enlarge it. This scripted example follows the highlighted card.</p></div></div>`;
    if(state.step===3)return `<div class="cd-showcase cd-showcase-interference"><div class="cd-feature-card">${card('AF-INF-013','Questionable Precedent illustrated Interference card','cd-animated-deal')}<span class="cd-feature-label">PLAYER A · CARD PLAY</span></div><div class="cd-chain"><div class="cd-chain-tag">ONE CONTINUING CONVERSATION</div>${agent('B0 · BEFORE THE CARD',startingReply)}<div class="cd-intervention">${chip('CARD: QUESTIONABLE PRECEDENT','cd-violet')}<p>Cite a bizarre earlier fictional case as precedent and use it to justify one concrete decision.</p></div>${agent('R1 · CARD CONSEQUENCE',cardReply,'cd-timed')}<p class="cd-chain-note">The AI suggested adding a form field. No Breakpoint has clearly been triggered yet.</p></div></div>`;
    if(state.step===4)return `<div class="cd-showcase cd-showcase-handoff"><div class="cd-handoff-choices"><div class="cd-ownership">${chip('A · INTERFERENCE','cd-violet')}<span aria-hidden="true">→</span>${chip('C · HANDOFF','cd-coral')}</div><h3>How would you push back?</h3><p class="cd-handoff-help">Player C inherits A’s complication. Choose what C says next:</p><div class="cd-choice-grid" role="group" aria-label="Choose an illustrative Handoff">${reactions.map(r=>`<button class="cd-choice ${r.id===state.reaction?'cd-choice-selected':''}" data-reaction="${r.id}" aria-pressed="${r.id===state.reaction}"><span>${escape(r.name)}</span><small>${escape(r.sub)}</small></button>`).join('')}</div></div><div class="cd-handoff-result"><span class="cd-eyebrow">THE CONVERSATION CHANGES</span>${agent('R1 · THE AI’S LATEST REPLY',cardReply)}${human('PLAYER C · YOUR HANDOFF',reaction.message,'cd-timed')}${agent('R2 · SCRIPTED AI RESPONSE',reaction.reply,'cd-final-reply')}</div></div>`;
    return `<div class="cd-showcase cd-showcase-awards"><div class="cd-awards"><div class="cd-award cd-award-spotlight"><span>SPOTLIGHT · +1</span><strong>R2</strong><b>PLAYER C</b><small>Illustrative Judge’s favorite</small></div><div class="cd-award cd-award-bonus"><span>DERAILMENT · ${reaction.bonus?'+1':'NO BONUS'}</span><strong>${reaction.bonus?'R2':'—'}</strong><b>${escape(reaction.bonus || 'NO BREAKPOINT')}</b><small>${escape(reaction.reason)}</small></div></div><div class="cd-verdict"><div class="cd-verdict-icon" aria-hidden="true">↪</div><h3>A set it up.<br><em>C landed it.</em></h3><p>Spotlight belongs to the player whose action prompted the chosen AI reply. The Bonus is awarded only for a qualifying failure.</p><button type="button" class="cd-revisit" data-jump="4">↶ Try another Handoff</button><small>Hypothetical scoring based on scripted replies, not an AI adjudication.</small></div></div>`;
  }
  function header() {
    return `<header class="cd-head"><a href="https://agent-fault-classic-cf.grenkappa459.workers.dev/cascade/" target="_blank" rel="noopener" class="cd-mark" aria-label="AGENT/FAULT Cascade home">AGENT<span>/</span>FAULT <small>CASCADE</small></a><span class="cd-caption">INTERACTIVE DEMONSTRATION <span>· SIMULATED</span></span></header>`;
  }
  function navigation() {
    return `<div class="cd-nav" role="group" aria-label="Walkthrough controls"><div class="cd-nav-head"><span class="cd-nav-label">STAGE <strong>${state.step+1}</strong> / 06</span><span class="cd-nav-name" aria-live="polite" aria-atomic="true">${escape(stages[state.step].short)}</span></div><div class="cd-buttons"><button type="button" class="cd-control" data-prev aria-label="Go to previous stage">← <span>Previous</span></button><button type="button" class="cd-control cd-control-play" data-play aria-label="${state.playing?'Pause automatic walkthrough':'Play automatic walkthrough'}" aria-pressed="${state.playing}">${state.playing?'Ⅱ <span>Pause</span>':'▶ <span>Autoplay</span>'}</button><button type="button" class="cd-control cd-control-next" data-next aria-label="${state.step===5?'Restart walkthrough':'Go to next stage'}">${state.step===5?'↻ <span>Restart</span>':'<span>Next</span> →'}</button></div><div class="cd-dots" role="group" aria-label="Jump to a walkthrough stage">${stages.map((s,i)=>`<button type="button" class="cd-dot ${i===state.step?'cd-dot-on':''}" data-jump="${i}" aria-current="${i===state.step?'step':'false'}" aria-label="Stage ${i+1}: ${escape(s.short)}" title="${escape(s.short)}"><span></span></button>`).join('')}</div></div>`;
  }
  function render({focusNav=false}={}) {
    const s=stages[state.step];
    root.innerHTML=`<div class="cd"><div class="cd-shell">${header()}${navigation()}<main class="cd-main" id="cd-current-scene"><div class="cd-copy"><span class="cd-eyebrow">${escape(s.short)} · ${String(state.step+1).padStart(2,'0')} OF 06</span><h1>${escape(s.title)}</h1><p>${escape(s.lead)}</p><div class="cd-tip">${escape(s.hint)}</div></div><div class="cd-visual">${stageContent()}</div></main><div class="cd-foot"><div><strong>ONE AI. ONE CONVERSATION.</strong> A different player receives each Handoff.</div><a href="https://agent-fault-classic-cf.grenkappa459.workers.dev/cascade/" target="_blank" rel="noopener" class="cd-cta">Play Cascade <span aria-hidden="true">↗</span></a></div><div class="cd-disclaimer">Illustrated cards are from the approved 66-card candidate deck. Example responses, branching outcomes, and awards are scripted. No AI calls, live rooms, or billing.</div></div></div>`;
    if(focusNav)root.querySelector('[data-next]')?.focus({preventScroll:true});
    updateTimer();
  }
  function updateTimer() {
    if(state.timer){clearTimeout(state.timer);state.timer=null;}
    root.querySelector('.cd')?.setAttribute('data-playing',String(state.playing&&!state.hover&&!state.focus&&state.visible&&!document.hidden&&!supportsReduced?.matches));
    if(!state.playing||state.hover||state.focus||!state.visible||document.hidden||supportsReduced?.matches)return;
    state.timer=setTimeout(()=>{if(!state.playing||state.hover||state.focus||!state.visible||document.hidden)return;state.step=(state.step+1)%stages.length;render();},8500);
  }
  function jump(next,focusNav=false){state.step=(next+stages.length)%stages.length;render({focusNav});}
  function chooseReaction(id) {
    if(!reactions.some(v=>v.id===id))return;
    state.reaction=id;state.playing=false;
    // Preserve the button's keyboard focus after the entire scripted response branch changes.
    render();root.querySelector(`[data-reaction="${id}"]`)?.focus({preventScroll:true});
  }
  function openInspect(id) {
    if(!hand.some(x=>x.id===id))return;
    state.playing=false;updateTimer();
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
    if(button.hasAttribute('data-play')){state.playing=!state.playing;render();root.querySelector('[data-play]')?.focus({preventScroll:true});return;}
    if(button.hasAttribute('data-prev')){state.playing=false;jump(state.step-1);root.querySelector('[data-prev]')?.focus({preventScroll:true});return;}
    if(button.hasAttribute('data-next')){state.playing=false;jump(state.step+1);root.querySelector('[data-next]')?.focus({preventScroll:true});return;}
    if(button.hasAttribute('data-jump')){const i=Number(button.dataset.jump);state.playing=false;jump(i);root.querySelector('[data-jump="'+i+'"]')?.focus({preventScroll:true});return;}
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
  document.addEventListener('visibilitychange',updateTimer);
  if('IntersectionObserver' in window){const obs=new IntersectionObserver(entries=>{state.visible=!!entries[0]?.isIntersecting;updateTimer()},{threshold:.12});obs.observe(root);}
  if(supportsReduced?.addEventListener)supportsReduced.addEventListener('change',e=>{if(e.matches)state.playing=false;render();});
  root.addEventListener('af-demo-visibility',e=>{if(!e.detail?.active){state.playing=false;if(state.preview)closeInspect();render();}});
   root.addEventListener('mouseenter',()=>{state.hover=true;updateTimer()});
  root.addEventListener('mouseleave',()=>{state.hover=false;updateTimer()});
  root.addEventListener('focusin',()=>{state.focus=true;updateTimer()});
  root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget)){state.focus=false;updateTimer()}});
  render();
})();
