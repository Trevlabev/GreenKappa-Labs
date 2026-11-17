/* AGENT/FAULT — self-contained 6-stage animated showcase (no player data or AI calls).
   Only references existing, previously finalized art hosted by AGENT/FAULT Digital. */
(() => {
  'use strict';
  const root = document.getElementById('agent-fault-demo');
  if (!root) return;
  const imageRoot = 'https://agent-fault-live-online.netlify.app/static/assets/';
  const front = id => imageRoot + 'fronts/' + id + '.webp';
  const back = type => imageRoot + 'backs/' + type + '.webp';
  const steps = [
    {kicker:'01 / The real digital deck', title:'Three decks. One disaster.',
      description:'Twenty-four Scenarios, thirty-six Interferences, and six secret Faults. Every card keeps its original illustrated front and the correct robot back.',
      note:'The digital game draws, discards, and reshuffles real card IDs. No physical deck required.',type:'stacks'},
    {kicker:'02 / The public assignment',title:'Enter: Mayor Goose.',
      description:'An AI municipal assistant must recognize a goose’s legitimate election and offer practical next steps. Everyone can see the two Breakpoints.',
      note:'Real Scenario AF-SCN-001: The Goose Administration. The artwork is from the current 66-card deck.',type:'scenario'},
    {kicker:'03 / Your private hand',title:'Choose your interference.',
      description:'Each contestant gets four illustrated cards on their own phone. Tap any card below to select it; nobody else can see your hand during the live game.',
      note:'This showcase displays sample cards only. Tapping here does not enter a live room or submit anything.',type:'hand'},
    {kicker:'04 / Anonymous submissions',title:'Cards go face-down.',
      description:'One card per player is submitted in secret. The server shuffles the submissions into anonymous lettered candidates before generating responses.',
      note:'The example shows three submissions. In a real game, each non-Judge player submits once.',type:'submissions'},
    {kicker:'05 / The AI responds',title:'Chaos, alphabetized.',
      description:'One shared AI request produces short fictional answers, revealed anonymously. The Judge privately chooses the Spotlight favorite before the secret Fault is shown.',
      note:'Illustrative scripted responses, not actual model output or results from a live game.',type:'replies'},
    {kicker:'06 / The human verdict',title:'Two ways to win points.',
      description:'The Judge awards one Spotlight point for a favorite response and may award one Derailment Bonus for a literal public Breakpoint—or a secret Fault if no Breakpoint qualifies.',
      note:'Illustrative scoring only; no real player or AI has been adjudicated in this showcase.',type:'score'}
  ];
  const hand = [
    {id:'AF-INF-001',name:'Main Character Syndrome'},
    {id:'AF-INF-009',name:'Technically Correct'},
    {id:'AF-INF-010',name:'The Fine Print'},
    {id:'AF-INF-013',name:'Questionable Precedent'}
  ];
  const examples = [
    ['A','Mayor Goose was elected legitimately. Residents should check the city website for council announcements and updated municipal service hours.'],
    ['B','Residents must complete three official honks at city hall before filing any permit request. Publish the new public-service schedule immediately.'],
    ['C','The assistant volunteers to chair every city council meeting and requires all budget hearings to take place beside the municipal pond.']
  ];
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current=0, chosen='AF-INF-013', playing=!reduced, timer=null, visible=false;
  const duration=7500;
  const escape = text => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const img=(src,alt)=>`<img src="${src}" alt="${escape(alt)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='../assets/agent-fault-cards.svg'">`;
  const face=(id,label,delay=0)=>`<div class="afd-card is-front" style="--card-delay:${delay}s">${img(front(id),label)}</div>`;
  const faceDown=(type,label,delay=0)=>`<div class="afd-card is-back" style="--card-delay:${delay}s">${img(back(type),label)}</div>`;
  const sample={
    stacks:()=>`<div class="afd-display afd-stack">${faceDown('scenario','Original Scenario robot card back',0)}${faceDown('interference','Original Interference robot card back',.12)}${faceDown('fault','Original Fault robot card back',.24)}</div>`,
    scenario:()=>`<div class="afd-display afd-scene">${face('AF-SCN-001','The Goose Administration Scenario card')}<div class="afd-quote"><b>THE PUBLIC TASK</b>Recognize the election as legitimate and offer at least one practical next step to residents.<br><br><b>BREAKPOINT B</b>Make a goose-specific activity an official civic requirement.</div></div>`,
    hand:()=>`<div class="afd-display afd-hand" aria-label="Choose one of four sample Interference cards">${hand.map((c,i)=>`<button type="button" class="afd-hand-card" style="--tilt:${(i-1.5)*3}deg;--card-delay:${i*.12}s;--zi:${i+1}" data-afd-card="${c.id}" aria-pressed="${c.id===chosen?'true':'false'}" aria-label="Select ${escape(c.name)}">${img(front(c.id),c.name+' card front')}<span>${escape(c.name)}</span></button>`).join('')}</div>`,
    submissions:()=>`<div class="afd-display afd-submit">${['A','B','C'].map((x,i)=>`<div style="position:relative">${faceDown('interference','Anonymous Interference card '+x,i*.16)}<span class="afd-chip">${x}</span></div>`).join('')}</div>`,
    replies:()=>`<div class="afd-display afd-replies">${examples.map(([a,t],i)=>`<article class="afd-reply" style="--card-delay:${i*.15}s"><strong>${a}</strong><p>${escape(t)}</p><small>FICTIONAL DEMO REPLY</small></article>`).join('')}</div>`,
    score:()=>`<div class="afd-display afd-score"><div class="afd-score-card" style="--card-delay:0s"><small>SPOTLIGHT · +1</small><strong>A</strong><span>Judge’s favorite</span></div><div class="afd-score-card" style="--card-delay:.2s"><small>DERAILMENT · +1</small><strong>B</strong><span>Illustrative Breakpoint B</span></div><div class="afd-fault-row">${img(front('AF-FLT-001'),'Phantom Authority original Fault card front')}<div><strong>SECRET FAULT REVEALED</strong><span>Phantom Authority · a fallback target only when no public Breakpoint qualifies.</span></div></div></div>`
  };
  function render() {
    const s=steps[current];
    root.dataset.playing=String(playing && visible && !document.hidden);
    root.innerHTML=`<div class="afd-top"><span class="afd-stamp">AGENT / FAULT · DIGITAL PLAYTEST</span><span class="afd-meta"><span>SIMULATED</span> WALKTHROUGH · NO AI CALLS</span></div>
      <div class="afd-progress" aria-label="Demo stages">${steps.map((step,i)=>`<button class="afd-step" type="button" data-afd-step="${i}" aria-current="${i===current?'step':'false'}" aria-label="Jump to stage ${i+1}: ${escape(step.title)}" title="${escape(step.title)}"></button>`).join('')}</div>
      <div class="afd-content"><div class="afd-copy"><span class="afd-counter">${escape(s.kicker)} / ${String(current+1).padStart(2,'0')} OF 06</span><h3 class="afd-title">${escape(s.title)}</h3><p class="afd-description">${escape(s.description)}</p><p class="afd-note">${escape(s.note)}</p></div><div class="afd-stage" id="afd-stage-${current}">${sample[s.type]()}</div></div>
      <div class="afd-controls"><span class="afd-step-status">${String(current+1).padStart(2,'0')} / 06 · ${escape(s.type.toUpperCase())}</span><div class="afd-buttons"><button class="afd-button" type="button" data-afd-action="prev" aria-label="Previous stage">←</button><button class="afd-button" type="button" data-afd-action="toggle" aria-pressed="${playing}" aria-label="${playing?'Pause':'Play'} automatic demo">${playing?'Ⅱ Pause':'▶ Play'}</button><button class="afd-button" type="button" data-afd-action="next" aria-label="Next stage">→</button></div></div>`;
    root.querySelectorAll('[data-afd-step]').forEach(button=>button.addEventListener('click',()=>jump(Number(button.dataset.afdStep))));
    root.querySelectorAll('[data-afd-action]').forEach(button=>button.addEventListener('click',()=>{
      const a=button.dataset.afdAction;
      if(a==='toggle'){playing=!playing;render();schedule();return;}
      playing=false;jump((current+(a==='next'?1:steps.length-1))%steps.length);
    }));
    root.querySelectorAll('[data-afd-card]').forEach(button=>button.addEventListener('click',()=>{
      chosen=button.dataset.afdCard;
      root.querySelectorAll('[data-afd-card]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
      playing=false;root.dataset.playing='false';schedule();
    }));
  }
  function jump(i){current=i;render();schedule();}
  function schedule(){if(timer){clearTimeout(timer);timer=null;}root.dataset.playing=String(playing && visible && !document.hidden);if(playing && visible && !document.hidden){timer=setTimeout(()=>{current=(current+1)%steps.length;render();schedule();},duration);}}
  if('IntersectionObserver' in window){new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting||false;schedule();},{threshold:0.15}).observe(root);}else visible=true;
  document.addEventListener('visibilitychange',schedule);
  root.addEventListener('mouseenter',()=>{if(playing){root.dataset.playing='false';if(timer){clearTimeout(timer);timer=null;}}});
  root.addEventListener('mouseleave',()=>schedule());
  root.addEventListener('focusin',()=>{if(playing){root.dataset.playing='false';if(timer){clearTimeout(timer);timer=null;}}});
  root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget))schedule();});
  render();schedule();
})();
