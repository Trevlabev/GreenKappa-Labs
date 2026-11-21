/**
 * AGENT/FAULT phase announcer. Browser-local, opt-in, no API calls.
 * Only the explicitly public phase metadata is provided by the game clients.
 * Never narrate private cards, prompts, handoffs, or player names.
 */
const PHASE_LINES = Object.freeze({
  classic: Object.freeze({
    lobby: 'Welcome to Agent Fault. Several hidden agendas, one remarkably optimistic artificial intelligence. This should go well.',
    setup: 'Judge preparation. Assemble your assignment. Our artificial intelligence has already begun overestimating its abilities.',
    submit: 'Agents, select your interference. Keep it secret. Plausible deniability is a feature.',
    generate: 'Interference received. The A I is now attempting to recover from decisions it did not make.',
    spotlight: 'The answers are in. Judge, select your favorite disaster.',
    adjudicate: 'The secrets are out. Time to determine whether the A I truly went off the rails.',
    review: 'The table has the final say. Democracy was a bold design choice.',
    results: 'Round complete. Points have been awarded. Accountability remains optional.',
    finished: 'Session complete. The system reports that everything went according to plan. This report is disputed.'
  }),
  cascade: Object.freeze({
    lobby: 'Welcome to Agent Fault: Cascade. One conversation. Several agents. Absolutely no collective accountability.',
    setup: 'Judge programming. Prepare the scenario. The A I remains blissfully uninformed.',
    baseline: 'Awaiting the first answer. It is important to establish what normal looks like, while we still can.',
    lock_cards: 'Agents, lock your Interference cards. Consequences will be distributed shortly.',
    cascade: 'Interference deployed. The conversation continues, despite all available evidence.',
    handoff: 'A new agent inherits the problem. Please do not mistake this for a promotion.',
    judging: 'The human verdict. Judge, identify the most impressive malfunction.',
    challenge: 'A challenge has been filed. Apparently someone still believes in due process.',
    vote: 'The table votes. The algorithm is not eligible.',
    results: 'Round complete. The consequences have been tallied, and irresponsibility rewarded.',
    finished: 'Cascade concluded. The A I has requested reassignment.'
  })
});
const EVENTS = {
  phase: 'agent-fault:phase',
  start: 'agent-fault:narration-start',
  end: 'agent-fault:narration-end'
};
const SETTINGS = 'agent-fault:narrator:';
const synth = typeof window.speechSynthesis === 'undefined' ? null : window.speechSynthesis;
const browserSpeech = !!synth && typeof window.SpeechSynthesisUtterance === 'function';
const pack = window.AGENT_FAULT_VOICE_PACK || {};
const hasRecordings = typeof window.Audio === 'function' && Object.keys(pack).length > 0;
const supported = browserSpeech || hasRecordings;
let enabled = false;
let latest = null;
let lastKey = null;
let active = null;
let voiceVolume = 0.85;
let preferredVoice = '';
try {
  voiceVolume = Math.max(0, Math.min(1, Number(localStorage.getItem(SETTINGS + 'volume') ?? '0.85') || 0));
  preferredVoice = localStorage.getItem(SETTINGS + 'voice') || '';
} catch { /* Storage is not required. */ }
const save = (key, value) => { try { localStorage.setItem(SETTINGS + key, String(value)); } catch {} };
const elm = (tag, cls, txt) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (txt) node.textContent = txt;
  return node;
};

const style = document.createElement('style');
style.textContent = [
  '.af-narrator{position:fixed;z-index:8999;left:max(10px,env(safe-area-inset-left));bottom:max(10px,env(safe-area-inset-bottom));width:min(365px,calc(100vw - 20px));padding:9px 11px;border:1px solid #e5f91b;border-radius:10px;background:#141736f5;color:#fff6e9;box-shadow:0 8px 26px #0009;font:600 12px/1.35 system-ui,sans-serif}',
  '.af-narrator[hidden]{display:none}',
  '.af-narrator .af-narrator-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}',
  '.af-narrator .af-narrator-name{font-weight:800;letter-spacing:.10em;color:#e5f91b}',
  '.af-narrator .af-narrator-controls{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
  '.af-narrator button{font:800 11px/1.2 system-ui,sans-serif;border:1px solid #e5f91b;border-radius:6px;background:#252c57;color:#fff6e9;min-height:34px;padding:7px;cursor:pointer}',
  '.af-narrator button[aria-pressed=true]{background:#e5f91b;color:#141736}',
  '.af-narrator button:disabled{opacity:.45;cursor:not-allowed}',
  '.af-narrator button:focus-visible,.af-narrator select:focus-visible,.af-narrator summary:focus-visible,.af-narrator input:focus-visible{outline:3px solid #fff;outline-offset:2px}',
  '.af-narrator .af-narrator-status{margin:5px 0 0;color:#d2d4eb;font-size:11px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
  '.af-narrator details{margin-top:5px;border-top:1px solid #4e547a;padding-top:5px}',
  '.af-narrator summary{cursor:pointer;list-style:auto;color:#e5f91b;font-size:11px}',
  '.af-narrator .af-narrator-options{display:grid;grid-template-columns:minmax(0,1fr) 90px;gap:9px;margin-top:6px}',
  '.af-narrator select{min-width:0;width:100%;background:#1e244b;color:#fff6e9;border:1px solid #7e86b8;border-radius:4px}',
  '.af-narrator input[type=range]{width:100%;accent-color:#e5f91b}',
  '@media(max-width:650px){.af-narrator{bottom:max(72px,calc(env(safe-area-inset-bottom) + 72px));width:min(355px,calc(100vw - 20px))}}'
].join('');
document.head.append(style);

const widget = elm('aside', 'af-narrator');
widget.hidden = true;
widget.setAttribute('aria-label', 'Optional game-room announcer');
const head = elm('div', 'af-narrator-head');
const name = elm('span', 'af-narrator-name', 'FAULT // ANNOUNCER');
const controls = elm('div', 'af-narrator-controls');
const toggle = elm('button', '', 'VOICE OFF');
toggle.type = 'button';
toggle.setAttribute('aria-pressed', 'false');
toggle.setAttribute('aria-label', 'Enable local game-room narration');
const replay = elm('button', '', 'REPEAT');
replay.type = 'button';
replay.disabled = true;
replay.setAttribute('aria-label', 'Repeat the current phase announcement');
controls.append(toggle, replay);
head.append(name, controls);
const status = elm('p', 'af-narrator-status', supported ? 'Off · local audio only' : 'Speech unavailable in this browser');
status.setAttribute('role', 'status');
status.setAttribute('aria-live', 'polite');
const options = document.createElement('details');
const summary = elm('summary', '', 'VOICE SETTINGS');
const body = elm('div', 'af-narrator-options');
const voiceSelect = document.createElement('select');
voiceSelect.setAttribute('aria-label', 'Announcer voice');
const voiceLevel = document.createElement('input');
voiceLevel.type = 'range';
voiceLevel.min = '0';
voiceLevel.max = '100';
voiceLevel.value = String(Math.round(voiceVolume * 100));
voiceLevel.setAttribute('aria-label', 'Announcer volume');
body.append(voiceSelect, voiceLevel);
options.append(summary, body);
widget.append(head, status, options);
document.body.append(widget);

const announceMusic = (playing) => window.dispatchEvent(new CustomEvent(playing ? EVENTS.start : EVENTS.end));
function stop() {
  const previous = active;
  active = null;
  if (previous && typeof previous.pause === 'function') previous.pause();
  if (synth) synth.cancel();
  if (previous) announceMusic(false);
}
function voices() {
  if (!synth) return [];
  return synth.getVoices().filter(x => /^en(?:-|$)/i.test(x.lang));
}
function populateVoices() {
  const list = voices();
  const before = preferredVoice;
  voiceSelect.replaceChildren();
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = hasRecordings ? 'Recorded announcer (preferred)' : 'Automatic English';
  voiceSelect.append(defaultOption);
  for (const v of list) {
    const option = document.createElement('option');
    option.value = v.voiceURI;
    option.textContent = v.name + ' (' + v.lang + ')';
    voiceSelect.append(option);
  }
  voiceSelect.value = list.some(v => v.voiceURI === before) ? before : '';
}
if (browserSpeech) {
  populateVoices();
  if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', populateVoices);
  else synth.onvoiceschanged = populateVoices;
}
function lineFor(s) {
  const line = PHASE_LINES[s?.edition]?.[s?.phase];
  if (!line) return '';
  const round = Number(s.round);
  const preface = s.phase !== 'lobby' && s.phase !== 'finished' && Number.isInteger(round) && round > 0 && round <= 99 && s.phase === 'setup'
    ? 'Round ' + round + '. '
    : '';
  return preface + line;
}
function speak() {
  if (!supported || !enabled || !latest || document.hidden) return;
  const line = lineFor(latest);
  if (!line) return;
  stop();
  const cueKey = latest.edition + '-' + latest.phase;
  const path = pack[cueKey];
  if (!preferredVoice && hasRecordings && typeof path === 'string' && path === '/shared-media/narration/' + cueKey + '.mp3') {
    playRecording(path, PHASE_LINES[latest.edition][latest.phase], line);
    return;
  }
  speakFallback(line);
}
function playRecording(path, caption, fallbackLine) {
  const recording = new window.Audio(path);
  recording.preload = 'none';
  recording.volume = voiceVolume;
  active = recording;
  status.textContent = 'Loading recorded voice';
  const finish = () => {
    if (active !== recording) return;
    active = null;
    announceMusic(false);
    status.textContent = 'Ready · ' + caption;
  };
  const fallback = () => {
    if (active !== recording) return;
    stop();
    if (enabled && !document.hidden) speakFallback(fallbackLine);
  };
  recording.addEventListener('playing', () => {
    if (active !== recording) return;
    announceMusic(true);
    status.textContent = 'Speaking · ' + caption;
  });
  recording.addEventListener('ended', finish);
  recording.addEventListener('error', fallback);
  try { Promise.resolve(recording.play()).catch(fallback); }
  catch { fallback(); }
}
function speakFallback(line) {
  if (!browserSpeech) {
    status.textContent = 'Recording unavailable · browser voice not supported';
    return;
  }
  const utterance = new window.SpeechSynthesisUtterance(line);
  const found = voices();
  utterance.voice = found.find(v => v.voiceURI === preferredVoice) || found.find(v => /^en-US$/i.test(v.lang)) || found[0] || null;
  utterance.lang = utterance.voice?.lang || 'en-US';
  utterance.rate = 0.95;
  utterance.pitch = 0.94;
  utterance.volume = voiceVolume;
  active = utterance;
  status.textContent = 'Ready · ' + line;
  utterance.onstart = () => {
    if (active !== utterance) return;
    announceMusic(true);
    status.textContent = 'Speaking · ' + line;
  };
  const finish = () => {
    if (active !== utterance) return;
    active = null;
    announceMusic(false);
    status.textContent = 'Ready · ' + line;
  };
  utterance.onend = finish;
  utterance.onerror = (e) => {
    if (active !== utterance) return;
    finish();
    if (e.error && !['interrupted', 'canceled'].includes(e.error)) status.textContent = 'Voice unavailable · use REPEAT or select another voice';
  };
  try { synth.speak(utterance); }
  catch { finish(); status.textContent = 'Could not start the voice'; }
}
function toggleVoice() {
  if (!supported) return;
  enabled = !enabled;
  toggle.setAttribute('aria-pressed', String(enabled));
  toggle.textContent = enabled ? 'VOICE ON' : 'VOICE OFF';
  toggle.setAttribute('aria-label', enabled ? 'Disable local game-room narration' : 'Enable local game-room narration');
  replay.disabled = !enabled || !latest;
  if (enabled) speak();
  else { stop(); status.textContent = 'Off · local audio only'; }
}
toggle.addEventListener('click', toggleVoice);
replay.addEventListener('click', speak);
voiceSelect.addEventListener('change', () => {
  preferredVoice = voiceSelect.value;
  save('voice', preferredVoice);
  if (enabled) speak();
});
voiceLevel.addEventListener('input', () => {
  voiceVolume = Number(voiceLevel.value) / 100;
  save('volume', voiceVolume);
  if (active) active.volume = voiceVolume;
});
toggle.disabled = !supported;
window.addEventListener(EVENTS.phase, (event) => {
  const d = event.detail;
  if (!d || !PHASE_LINES[d.edition]?.[d.phase] || !/^[A-Z0-9]{6}$/i.test(d.room || '')) return;
  const round = Number.isInteger(d.round) && d.round >= 0 && d.round <= 99 ? d.round : 0;
  const index = d.edition === 'cascade' && (d.phase === 'cascade' || d.phase === 'handoff')
    ? (Number.isInteger(d.currentIndex) && d.currentIndex >= 0 ? d.currentIndex : 0)
    : 0;
  const key = [d.edition, d.room, round, d.phase, index].join(':');
  latest = {edition:d.edition,room:d.room,round,phase:d.phase,currentIndex:index};
  widget.hidden = false;
  name.textContent = d.role === 'host' ? 'FAULT // HOST ANNOUNCER' : 'FAULT // PERSONAL ANNOUNCER';
  replay.disabled = !enabled;
  if (key === lastKey) return;
  lastKey = key;
  if (enabled) speak();
  else if (supported) status.textContent = 'Off · ' + latest.phase.replaceAll('_', ' ').toUpperCase();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
});
window.addEventListener('pagehide', stop);
