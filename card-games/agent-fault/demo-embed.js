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
  let current=0, chosen='AF-INF-013';
  const stageCount=steps.length;
  const swipeThreshold=52;
  let swipeStart=null;
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
  function render(focusSelector=null) {
    const s=steps[current];
    root.innerHTML=`<div class="afd-top"><span class="afd-stamp">AGENT / FAULT · DIGITAL PLAYTEST</span><span class="afd-meta"><span>SIMULATED</span> WALKTHROUGH · NO AI CALLS</span></div>
      <div class="afd-viewer" tabindex="0" role="group" aria-label="Classic demo scene. Swipe or use left and right arrow keys to change scenes.">
        <div class="afd-content"><div class="afd-copy"><span class="afd-counter">${escape(s.kicker)} / ${String(current+1).padStart(2,'0')} OF 06</span><h3 class="afd-title" aria-live="polite">${escape(s.title)}</h3><p class="afd-description">${escape(s.description)}</p><p class="afd-note">${escape(s.note)}</p></div><div class="afd-stage" id="afd-stage-${current}">${sample[s.type]()}</div></div>
        <button class="afd-edge-arrow afd-edge-prev" type="button" data-afd-action="prev" aria-label="Previous Classic scene"><span aria-hidden="true">‹</span></button>
        <button class="afd-edge-arrow afd-edge-next" type="button" data-afd-action="next" aria-label="Next Classic scene"><span aria-hidden="true">›</span></button>
      </div>
      <div class="afd-pagination" role="group" aria-label="Choose a Classic demo scene">${steps.map((step,i)=>`<button class="afd-dot" type="button" data-afd-step="${i}" aria-current="${i===current?'step':'false'}" aria-label="Scene ${i+1} of ${stageCount}: ${escape(step.title)}" title="${escape(step.title)}"></button>`).join('')}</div>
      <div class="afd-swipe-label">Swipe the scene or use the arrows <span aria-hidden="true">·</span> ${String(current+1).padStart(2,'0')} / 06</div>`;
    root.querySelectorAll('[data-afd-step]').forEach(button=>button.addEventListener('click',()=>{
      jump(Number(button.dataset.afdStep),'[data-afd-step="'+button.dataset.afdStep+'"]');
    }));
    root.querySelectorAll('[data-afd-action]').forEach(button=>button.addEventListener('click',()=>{
      const action=button.dataset.afdAction;
      jump(current+(action==='next'?1:-1),'[data-afd-action="'+action+'"]');
    }));
    root.querySelectorAll('[data-afd-card]').forEach(button=>button.addEventListener('click',()=>{
      chosen=button.dataset.afdCard;
      root.querySelectorAll('[data-afd-card]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
    }));
    bindSwipe(root.querySelector('.afd-viewer'));
    if(focusSelector)root.querySelector(focusSelector)?.focus({preventScroll:true});
  }
  function jump(index,focusSelector=null) {
    swipeStart=null;
    current=(index+stageCount)%stageCount;
    render(focusSelector);
  }
  function isSwipeSafe(target) {
    return target?.closest && !target.closest('button,a,input,textarea,select,[role="dialog"],.afd-hand');
  }
  function trySwipe(dx,dy) {
    if(Math.abs(dx)<swipeThreshold || Math.abs(dx)<Math.abs(dy)*1.35)return;
    jump(current+(dx<0?1:-1));
  }
  function bindSwipe(viewer) {
    // Touch gestures do not prevent the browser's normal vertical scrolling.
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
      if(event.pointerType==='touch'||event.button!==0||!isSwipeSafe(event.target)||event.target.closest('.afd-copy'))return;
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
      const index=event.key==='Home'?0:event.key==='End'?stageCount-1:current+(event.key==='ArrowRight'?1:-1);
      jump(index,'.afd-viewer');
    });
  }
  root.addEventListener('af-demo-visibility',event=>{if(!event.detail?.active)swipeStart=null;});
  render();
})();
