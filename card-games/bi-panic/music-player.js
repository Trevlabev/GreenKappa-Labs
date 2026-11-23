/* BI PANIC! / optional audio, shared by the product page and playable demo. */
(() => {
 "use strict";
 const host=document.querySelector("[data-bp-audio-player]");
 if(!host)return;
 const audio=host.querySelector("audio"), button=host.querySelector("[data-bp-audio-toggle]"),
 volume=host.querySelector("[data-bp-audio-volume]"),seek=host.querySelector("[data-bp-audio-seek]"),
 time=host.querySelector("[data-bp-audio-elapsed]"),length=host.querySelector("[data-bp-audio-duration]"),
 status=host.querySelector("[data-bp-audio-status]");
 if(!audio||!button)return;
 let pending=false;
 const fmt=n=>{const v=Number.isFinite(n)?Math.max(0,Math.floor(n)):0;return Math.floor(v/60)+":"+String(v%60).padStart(2,"0")};
 const refresh=()=>{
   const playing=!audio.paused&&!audio.ended;
   host.classList.toggle("is-playing",playing);
   button.setAttribute("aria-pressed",String(playing));
   button.textContent=playing?"Pause music":(host.classList.contains("bp-game-audio")?"Play music":"Play soundtrack");
   if(time)time.textContent=fmt(audio.currentTime);
   if(Number.isFinite(audio.duration)){
     if(length)length.textContent=fmt(audio.duration);
     if(seek){seek.max=String(audio.duration);if(document.activeElement!==seek)seek.value=String(audio.currentTime)}
   }
 };
 audio.volume=Math.min(1,Math.max(0,Number(volume?.value??35)/100));
 volume?.addEventListener("input",()=>audio.volume=Math.min(1,Math.max(0,Number(volume.value)/100)));
 seek?.addEventListener("input",()=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,Number(seek.value));refresh()});
 button.addEventListener("click",async()=>{
   if(pending)return;
   if(!audio.paused){audio.pause();if(status)status.textContent="Paused.";refresh();return}
   pending=true;
   try{await audio.play();if(status)status.textContent="Playing Afterimage."}
   catch(e){if(status)status.textContent="Music could not start. Check browser audio permissions."}
   finally{pending=false;refresh()}
 });
 for(const t of ["play","pause","timeupdate","durationchange","ended"])audio.addEventListener(t,refresh);
 audio.addEventListener("error",()=>{button.disabled=true;if(status)status.textContent="Soundtrack unavailable.";refresh()});
 window.addEventListener("pagehide",()=>audio.pause(),{once:true});
 refresh();
})();
