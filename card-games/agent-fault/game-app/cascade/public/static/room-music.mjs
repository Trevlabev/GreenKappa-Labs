/**
 * AGENT/FAULT game-room soundtrack — a local, opt-in player.
 * Shared by Classic and Cascade; does not touch multiplayer game state.
 */
const TRACK_URL = '/shared-media/agent-fault-main-theme.mp3';
const VOLUME_KEY = 'agent-fault:room-music-volume:v1';

const audio = document.createElement('audio');
audio.src = TRACK_URL;
audio.loop = true;
audio.preload = 'none';
audio.setAttribute('aria-hidden', 'true');
audio.volume = (() => {
  try {
    const saved = localStorage.getItem(VOLUME_KEY);
    if (saved !== null) {
      const number = Number(saved);
      if (Number.isFinite(number) && number >= 0 && number <= 1) return number;
    }
  } catch { /* Private browsing can disable storage. */ }
  return 0.32; // Approximately -10 dB relative to source, leaving headroom for speech.
})();
let preferredVolume = audio.volume;
let narrationActive = false;
const effectiveVolume = () => { audio.volume = preferredVolume * (narrationActive ? 0.25 : 1); };
window.addEventListener('agent-fault:narration-start', () => {
  narrationActive = true;
  effectiveVolume();
});
window.addEventListener('agent-fault:narration-end', () => {
  narrationActive = false;
  effectiveVolume();
});

const style = document.createElement('style');
style.textContent = [
  '.af-room-music{position:fixed;right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));z-index:9000;display:flex;align-items:center;gap:9px;max-width:calc(100vw - 20px);padding:8px 10px;border:1px solid #ca8aec;border-radius:10px;background:#141736f2;color:#fff6e9;box-shadow:0 8px 26px #0009;font:700 12px/1.25 system-ui,sans-serif}',
  '.af-room-music button{font:800 12px/1.25 system-ui,sans-serif;letter-spacing:.04em;min-height:36px;white-space:nowrap;padding:7px 10px;border:1px solid #d3a0f0;border-radius:6px;background:#262b5d;color:#fff6e9;cursor:pointer}',
  '.af-room-music button:hover{background:#343c80}',
  '.af-room-music button:focus-visible,.af-room-music input:focus-visible{outline:3px solid #e5f91b;outline-offset:2px}',
  '.af-room-music label{display:flex;align-items:center;gap:6px;white-space:nowrap;letter-spacing:.07em}',
  '.af-room-music input[type=range]{width:76px;height:22px;accent-color:#e5f91b;cursor:pointer}',
  '.af-room-music-status:not(:empty){position:absolute;right:0;bottom:calc(100% + 6px);width:max-content;max-width:90vw;padding:6px 9px;border-radius:6px;background:#31244e;color:#fff6e9;white-space:normal}',
  '@media(max-width:400px){.af-room-music{gap:5px;padding:5px 7px}.af-room-music button{padding:6px 7px}.af-room-music input[type=range]{width:60px}}',
].join('');
document.head.appendChild(style);

const widget = document.createElement('aside');
widget.className = 'af-room-music';
widget.setAttribute('aria-label', 'Game room soundtrack');
const toggle = document.createElement('button');
toggle.type = 'button';
toggle.setAttribute('aria-pressed', 'false');
const volumeLabel = document.createElement('label');
volumeLabel.textContent = 'VOL';
const volume = document.createElement('input');
volume.type = 'range';
volume.min = '0';
volume.max = '100';
volume.step = '1';
volume.value = String(Math.round(audio.volume * 100));
volume.setAttribute('aria-label', 'Soundtrack volume');
volumeLabel.appendChild(volume);
const status = document.createElement('span');
status.className = 'af-room-music-status';
status.setAttribute('role', 'status');
status.setAttribute('aria-live', 'polite');
widget.append(toggle, volumeLabel, status);
document.body.append(audio, widget);

function update() {
  const playing = !audio.paused;
  toggle.textContent = playing ? '❚❚ MUSIC ON' : '♫ MUSIC OFF';
  toggle.setAttribute('aria-pressed', String(playing));
  toggle.setAttribute('aria-label', playing ? 'Pause game soundtrack' : 'Play game soundtrack');
}
toggle.addEventListener('click', async () => {
  status.textContent = '';
  if (!audio.paused) {
    audio.pause();
    return;
  }
  try {
    await audio.play(); // Always initiated by a visitor gesture; no autoplay.
  } catch {
    status.textContent = 'Soundtrack could not be loaded.';
    update();
  }
});
volume.addEventListener('input', () => {
  preferredVolume = Number(volume.value) / 100;
  effectiveVolume();
  try { localStorage.setItem(VOLUME_KEY, String(preferredVolume)); } catch { /* Optional. */ }
});
audio.addEventListener('play', update);
audio.addEventListener('pause', update);
audio.addEventListener('error', () => {
  status.textContent = 'Soundtrack unavailable.';
  update();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.pause();
});
window.addEventListener('pagehide', () => audio.pause());
update();
