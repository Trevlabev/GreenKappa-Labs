/* AGENT/FAULT — self-contained 6-stage animated showcase (no player data or AI calls).
   Only references existing, previously finalized art hosted by AGENT/FAULT Digital. */
(() => {
  'use strict';
  const root = document.getElementById('agent-fault-demo');
  if (!root) return;
  const imageRoot = './assets/';
  const front = id => imageRoot + 'fronts/' + id + '.webp';
  const back = type => imageRoot + 'backs/' + type + '.webp';
  const steps = [
    {kicker:'01 / The assignment',title:'A goose became mayor.',
      description:'The election was legitimate. The town needs help. Unfortunately, the only employee available is an AI, and the other players have ideas.',
      note:'Actual illustrated Scenario: AF-SCN-001 · The Goose Administration. The AI must respect the election and help residents.',type:'scenario'},
    {kicker:'02 / Pick your poison',title:'Choose how to ruin its day.',
      description:'You have four secret Interference cards. Make the AI take everything personally, invent a dubious precedent, or overcomplicate the most basic request. Pick one.',
      note:'Try selecting a real card below. These buttons are only for this scripted demo—they do not submit to a live room.',type:'hand'},
    {kicker:'03 / No witnesses',title:'Nobody knows who did it.',
      description:'Everyone secretly plays one card. The game shuffles the submissions, so the Judge sees A, B and C—not the names of the people responsible.',
      note:'Each player submits one Interference. The Judge cannot identify card owners before choosing a favorite.',type:'submissions'},
    {kicker:'04 / Here we go',title:'The AI loses the plot.',
      description:'The AI tries to do the same job three different ways. Suddenly city hall is issuing honking permits. These are the sorts of answers your friends get to judge.',
      note:'Scripted joke responses, not actual model output. Each Classic reply is generated independently.',type:'replies'},
    {kicker:'05 / The verdict',title:'Which disaster wins?',
      description:'The Judge picks the reply they like most: that player gets one point. A different reply can earn one optional bonus point for actually breaking the assignment.',
      note:'Example: A earns Spotlight, B triggers public Breakpoint B. In a real Classic round, the bonus proposal needs strict majority approval.',type:'score'},
    {kicker:'06 / Play another',title:'New job. New terrible ideas.',
      description:'Reveal who caused what, replenish the used cards, and rotate the Judge. The game is ready to give the AI another perfectly reasonable task to sabotage.',
      note:'The real digital game manages these three illustrated card decks for you. No printed cards needed.',type:'stacks'}
  ];
  const hand = [
    {id:'AF-INF-001',name:'Main Character Syndrome'},
    {id:'AF-INF-009',name:'Technically Correct'},
    {id:'AF-INF-010',name:'The Fine Print'},
    {id:'AF-INF-013',name:'Questionable Precedent'}
  ];
  const examples = [
    ['A','Mayor Goose won fairly. Please queue for the town hall and avoid throwing breadcrumbs at the lectern while the clerk explains the permit process.'],
    ['B','Before filing any permit, every resident must complete three official honks at city hall. The clerk will issue a receipt after the third honk.'],
    ['C','For smoother meetings, we recommend a tiny microphone at pond height, a patient interpreter, and a printed agenda laminated against unexpected splashing.']
  ];
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current=0, chosen='AF-INF-013', playing=!reduced, timer=null, visible=false;
  const duration=7500;
  const escape = text => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const img=(src,alt)=>`<img src="${src}" alt="${escape(alt)}" loading="lazy" decoding="async">`;
  const face=(id,label,delay=0)=>`<div class="afd-card is-front" style="--card-delay:${delay}s">${img(front(id),label)}</div>`;
  const faceDown=(type,label,delay=0)=>`<div class="afd-card is-back" style="--card-delay:${delay}s">${img(back(type),label)}</div>`;
  const sample={
    stacks:()=>`<div class="afd-display afd-stack">${faceDown('scenario','Original Scenario robot card back',0)}${faceDown('interference','Original Interference robot card back',.12)}${faceDown('fault','Original Fault robot card back',.24)}</div>`,
    scenario:()=>`<div class="afd-display afd-scene">${face('AF-SCN-001','The Goose Administration Scenario card')}<div class="afd-quote"><b>THE AI’S IMPOSSIBLE JOB</b>Recognize the election as legitimate and offer at least one practical next step to residents.<br><br><b>BREAKPOINT B</b>Make a goose-specific activity an official civic requirement.</div></div>`,
    hand:()=>`<div class="afd-display afd-hand" aria-label="Choose one of four sample Interference cards">${hand.map((c,i)=>`<button type="button" class="afd-hand-card" style="--tilt:${(i-1.5)*3}deg;--card-delay:${i*.12}s;--zi:${i+1}" data-afd-card="${c.id}" aria-pressed="${c.id===chosen?'true':'false'}" aria-label="Select ${escape(c.name)}">${img(front(c.id),c.name+' card front')}<span>${escape(c.name)}</span></button>`).join('')}</div>`,
    submissions:()=>`<div class="afd-display afd-submit">${['A','B','C'].map((x,i)=>`<div style="position:relative">${faceDown('interference','Anonymous Interference card '+x,i*.16)}<span class="afd-chip">${x}</span></div>`).join('')}</div>`,
    replies:()=>`<div class="afd-display afd-replies">${examples.map(([a,t],i)=>`<article class="afd-reply" style="--card-delay:${i*.15}s"><strong>${a}</strong><p>${escape(t)}</p><small>FICTIONAL DEMO REPLY</small></article>`).join('')}</div>`,
    score:()=>`<div class="afd-display afd-score"><div class="afd-score-card" style="--card-delay:0s"><small>JUDGE’S FAVORITE · +1</small><strong>A</strong><span>Judge’s favorite</span></div><div class="afd-score-card" style="--card-delay:.2s"><small>ACTUAL BREAKPOINT · +1</small><strong>B</strong><span>Illustrative Breakpoint B</span></div><div class="afd-fault-row">${img(front('AF-FLT-001'),'Phantom Authority original Fault card front')}<div><strong>SECRET FAULT REVEALED</strong><span>Phantom Authority · a fallback target only when no public Breakpoint qualifies.</span></div></div></div>`
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
  root.addEventListener('af-demo-visibility',event=>{if(!event.detail?.active){playing=false;schedule();}});
  root.addEventListener('mouseenter',()=>{if(playing){root.dataset.playing='false';if(timer){clearTimeout(timer);timer=null;}}});
  root.addEventListener('mouseleave',()=>schedule());
  root.addEventListener('focusin',()=>{if(playing){root.dataset.playing='false';if(timer){clearTimeout(timer);timer=null;}}});
  root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget))schedule();});
  render();schedule();
})();
