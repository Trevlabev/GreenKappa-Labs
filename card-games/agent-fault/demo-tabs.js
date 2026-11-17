
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
