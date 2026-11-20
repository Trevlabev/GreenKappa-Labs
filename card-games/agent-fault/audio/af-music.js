/* Optional AGENT/FAULT theme player. Never autoplay; keep session privacy intact. */
(()=>{
  'use strict';
  const widget=document.getElementById('af-music-player');
  if(!widget)return;
  const audio=widget.querySelector('audio');
  const toggle=widget.querySelector('[data-af-music-toggle]');
  const volume=widget.querySelector('[data-af-music-volume]');
  const status=widget.querySelector('[data-af-music-status]');
  if(!audio||!toggle||!volume||!status)return;
  audio.volume=Number(volume.value)/100;
  audio.loop=true;
  function sync(){
    const isPlaying=!audio.paused;
    toggle.textContent=isPlaying?'Pause theme':'Play theme';
    toggle.setAttribute('aria-pressed',String(isPlaying));
    status.textContent=isPlaying?'Playing · AGENT/FAULT Main Theme':'Audio off';
  }
  toggle.addEventListener('click',async()=>{
    if(!audio.paused){audio.pause();return;}
    status.textContent='Loading music…';
    try{await audio.play();sync();}
    catch{status.textContent='Could not play audio. Check browser permissions.';toggle.setAttribute('aria-pressed','false');}
  });
  volume.addEventListener('input',()=>{audio.volume=Number(volume.value)/100;});
  audio.addEventListener('play',sync);
  audio.addEventListener('pause',sync);
  audio.addEventListener('error',()=>{status.textContent='Audio unavailable';toggle.disabled=true;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!audio.paused)audio.pause();});
  sync();
})();
