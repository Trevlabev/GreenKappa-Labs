
/* Accessible two-mode tabs. Both demos render locally on the GreenKappa page. */
(() => {
 'use strict';
 const list=document.querySelector('.af-demo-tabs');
 if(!list)return;
 const tabs=Array.from(list.querySelectorAll('[role="tab"]'));
 const panelFor=tab=>document.getElementById(tab.getAttribute('aria-controls'));
 const classic=document.getElementById('agent-fault-demo');
 const cascade=document.getElementById('agent-fault-cascade-demo');
 function activate(tab,focus=false){
   for(const item of tabs){
     const selected=item===tab;
     item.setAttribute('aria-selected',String(selected));
     item.tabIndex=selected?0:-1;
     const panel=panelFor(item);
     if(panel)panel.hidden=!selected;
   }
   const mode=tab.id==='af-tab-cascade'?'cascade':'classic';
   classic?.dispatchEvent(new CustomEvent('af-demo-visibility',{detail:{active:mode==='classic'}}));
   cascade?.dispatchEvent(new CustomEvent('af-demo-visibility',{detail:{active:mode==='cascade'}}));
   if(focus)tab.focus();
 }
 list.addEventListener('click',event=>{
   const tab=event.target.closest('[role="tab"]');
   if(tab&&list.contains(tab))activate(tab);
 });
 list.addEventListener('keydown',event=>{
   if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
   const current=event.target.closest('[role="tab"]');
   if(!current||!list.contains(current))return;
   event.preventDefault();
   const i=tabs.indexOf(current);
   const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
   activate(tabs[next],true);
 });
 activate(tabs.find(t=>t.getAttribute('aria-selected')==='true')||tabs[0]);
})();

/* Accessible swipe gallery for the three AGENT/FAULT play formats. */
(() => {
  'use strict';
  const gallery = document.querySelector('.af-mode-carousel');
  if (!gallery) return;
  const track = gallery.querySelector('.af-mode-track');
  const slides = Array.from(track.querySelectorAll('.af-mode-slide'));
  const dots = Array.from(gallery.querySelectorAll('.af-mode-dot'));
  const counter = gallery.querySelector('.af-mode-counter');
  const prefersLessMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let scheduled = false;

  function updateActive(index) {
    active = index;
    gallery.dataset.active = String(index);
    counter.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    slides.forEach((slide, i) => { slide.inert = i !== index; });
    dots.forEach((dot, i) => { dot.setAttribute('aria-pressed', String(i === index)); });
  }
  function goTo(index, instant = false) {
    const next = (index + slides.length) % slides.length;
    updateActive(next);
    track.scrollTo({ left: slides[next].offsetLeft, behavior: instant || prefersLessMotion.matches ? 'instant' : 'smooth' });
  }
  function closestSlide() {
    let closest = 0;
    let distance = Infinity;
    slides.forEach((slide, index) => {
      const delta = Math.abs(slide.offsetLeft - track.scrollLeft);
      if (delta < distance) { distance = delta; closest = index; }
    });
    return closest;
  }
  gallery.querySelectorAll('.af-mode-arrow').forEach(button => {
    button.addEventListener('click', () => goTo(active + Number(button.dataset.dir)));
  });
  dots.forEach((dot, index) => dot.addEventListener('click', () => goTo(index)));
  track.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateActive(closestSlide());
    });
  }, { passive: true });
  track.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || event.target.closest('a')) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : active + (event.key === 'ArrowRight' ? 1 : -1);
    goTo(next);
  });
  window.addEventListener('resize', () => goTo(active, true), { passive: true });
  goTo(0, true);
})();
