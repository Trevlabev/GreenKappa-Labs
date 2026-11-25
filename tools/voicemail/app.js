import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm';

const $ = s => document.querySelector(s);
const els = {
  system: $('#systemBtn'), mic: $('#micBtn'), stop: $('#stopBtn'), file: $('#fileInput'), transcribe: $('#transcribeBtn'),
  model: $('#modelSelect'), status: $('#status'), progress: $('#progressBar'), audio: $('#audioPreview'), transcript: $('#transcript'),
  summary: $('#summary'), analyze: $('#analyzeBtn'), detected: $('#detected'), fieldCount: $('#fieldCount'), copyTranscript: $('#copyTranscript'), copySummary: $('#copySummary')
};

let recorder = null, sourceStream = null, chunks = [], audioBlob = null, audioUrl = null;
const transcribers = new Map();

function setStatus(html, tone='') { els.status.innerHTML = html; els.status.dataset.tone = tone; }
function setProgress(n){ els.progress.style.width = `${Math.max(0, Math.min(100, n || 0))}%`; }
function escapeHtml(v=''){ return String(v).replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c])); }
function cleanPhone(v=''){ let d=String(v).replace(/\D/g,''); if(d.length===11 && d[0]==='1') d=d.slice(1); return d; }
function formatPhone(v=''){ const d=cleanPhone(v); return d.length===10 ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : v; }

function mimeType(){ return ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t)) || ''; }

async function startRecording(kind){
  try{
    if(!navigator.mediaDevices || !window.MediaRecorder) throw new Error('Recording APIs are not available in this browser.');
    if(kind === 'system'){
      setStatus('<strong>Choose a source with audio.</strong> In Chrome/Edge, enable “Share tab audio” or system audio when offered.', 'warn');
      sourceStream = await navigator.mediaDevices.getDisplayMedia({video:true,audio:{systemAudio:'include',suppressLocalAudioPlayback:false}});
      if(!sourceStream.getAudioTracks().length){ sourceStream.getTracks().forEach(t=>t.stop()); throw new Error('No audio track was shared. Try again and enable Share tab audio/system audio.'); }
    } else {
      sourceStream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:true,autoGainControl:true},video:false});
    }
    const audioOnly = new MediaStream(sourceStream.getAudioTracks());
    chunks = [];
    recorder = new MediaRecorder(audioOnly, mimeType() ? {mimeType:mimeType()} : undefined);
    recorder.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      const type = recorder.mimeType || chunks[0]?.type || 'audio/webm';
      setAudioBlob(new Blob(chunks,{type}));
      sourceStream?.getTracks().forEach(t=>t.stop()); sourceStream=null;
      setStatus('<strong>Recording captured.</strong> Click Transcribe.', 'good');
    };
    recorder.start(250);
    els.stop.disabled=false; els.system.disabled=true; els.mic.disabled=true; els.transcribe.disabled=true;
    setStatus('<span class="recordingDot"></span><strong>Recording…</strong> Play the voicemail, then press Stop.', 'bad');
  } catch(err){ sourceStream?.getTracks().forEach(t=>t.stop()); sourceStream=null; setStatus(`<strong>Capture failed.</strong> ${escapeHtml(err.message)}`, 'bad'); resetCaptureButtons(); }
}

function resetCaptureButtons(){ els.system.disabled=false; els.mic.disabled=false; els.stop.disabled=true; els.transcribe.disabled=!audioBlob; }
function stopRecording(){ if(recorder && recorder.state!=='inactive') recorder.stop(); resetCaptureButtons(); }
function setAudioBlob(blob){ audioBlob=blob; if(audioUrl) URL.revokeObjectURL(audioUrl); audioUrl=URL.createObjectURL(blob); els.audio.src=audioUrl; els.audio.style.display='block'; els.transcribe.disabled=false; resetCaptureButtons(); }

async function blobToMono16k(blob){
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if(!Ctx) throw new Error('Web Audio is unavailable in this browser.');
  const ctx = new Ctx();
  try{
    const buf = await blob.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buf.slice(0));
    const frames = Math.max(1, Math.ceil(decoded.duration * 16000));
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const offline = new Offline(1, frames, 16000);
    const src = offline.createBufferSource(); src.buffer = decoded; src.connect(offline.destination); src.start(0);
    const rendered = await offline.startRendering();
    return new Float32Array(rendered.getChannelData(0));
  } finally { await ctx.close().catch(()=>{}); }
}

async function getTranscriber(model){
  if(transcribers.has(model)) return transcribers.get(model);
  setStatus('<strong>Loading Whisper model…</strong> First use can take a while; the browser should cache model files afterward.');
  setProgress(3);
  const progress_callback = p => {
    if(p?.progress != null) setProgress(Math.round(p.progress));
    if(p?.status === 'progress' && p.file) setStatus(`<strong>Loading model…</strong> ${escapeHtml(p.file)} · ${Math.round(p.progress||0)}%`);
  };
  let pipe;
  if(navigator.gpu){
    try{ pipe = await pipeline('automatic-speech-recognition', model, {device:'webgpu',dtype:'q8',progress_callback}); }
    catch(e){ pipe = await pipeline('automatic-speech-recognition', model, {progress_callback}); }
  } else pipe = await pipeline('automatic-speech-recognition', model, {progress_callback});
  transcribers.set(model, pipe); setProgress(100); return pipe;
}

async function transcribe(){
  if(!audioBlob) return;
  els.transcribe.disabled=true; els.system.disabled=true; els.mic.disabled=true; setProgress(1);
  try{
    setStatus('<strong>Preparing audio…</strong> Converting to 16 kHz mono locally.');
    const audio = await blobToMono16k(audioBlob);
    const pipe = await getTranscriber(els.model.value);
    setStatus('<strong>Transcribing locally…</strong> Short voicemails may still take several seconds.'); setProgress(55);
    const out = await pipe(audio,{chunk_length_s:30,stride_length_s:5,return_timestamps:false});
    const text = String(out?.text || '').trim();
    els.transcript.value=text; analyzeTranscript(); setProgress(100);
    setStatus(`<strong>Done.</strong> ${text ? 'Transcript and summary are ready.' : 'No speech was detected.'}`, text?'good':'warn');
  }catch(err){ console.error(err); setStatus(`<strong>Transcription failed.</strong> ${escapeHtml(err.message || err)}`, 'bad'); }
  finally{ resetCaptureButtons(); }
}

const counties=['Alachua','Baker','Bay','Bradford','Brevard','Broward','Calhoun','Charlotte','Citrus','Clay','Collier','Columbia','DeSoto','Dixie','Duval','Escambia','Flagler','Franklin','Gadsden','Gilchrist','Glades','Gulf','Hamilton','Hardee','Hendry','Hernando','Highlands','Hillsborough','Holmes','Indian River','Jackson','Jefferson','Lafayette','Lake','Lee','Leon','Levy','Liberty','Madison','Manatee','Marion','Martin','Miami-Dade','Monroe','Nassau','Okaloosa','Okeechobee','Orange','Osceola','Palm Beach','Pasco','Pinellas','Polk','Putnam','Santa Rosa','Sarasota','Seminole','St. Johns','St. Lucie','Sumter','Suwannee','Taylor','Union','Volusia','Wakulla','Walton','Washington'];
function titleCase(s){ return s.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase()).replace(/\b(Mc)([a-z])/g,(_,a,b)=>a+b.toUpperCase()); }
function extractFields(text){
  const t=text.replace(/\s+/g,' ').trim(), low=t.toLowerCase(), f={};
  const email=t.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i); if(email) f.email=email[0];
  const phone=t.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/); if(phone) f.phone=formatPhone(phone[0]);
  const name=t.match(/\b(?:my name is|this is|name is)\s+([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){1,3})/i); if(name) f.personName=titleCase(name[1].replace(/\b(?:and|calling|phone|number|from)\b.*$/i,'').trim());
  if(/\b(?:pro\s*se|pro\s*say|self[- ]represented|representing myself|without an attorney)\b/i.test(t)) f.filerRole='Self Represented Litigant';
  else if(/\battorney|lawyer|counsel\b/i.test(t)) f.filerRole='Attorney';
  const c=counties.find(c=>new RegExp(`\\b${c.replace('-','[- ]')}\\s+county\\b`,'i').test(t)); if(c) f.county=c;
  else if(/\bdade county\b/i.test(t)) f.county='Miami-Dade';
  const bothSupport=/\bchild support\b/i.test(t), bothCust=/\bchild (?:custody|time[- ]sharing)\b/i.test(t);
  if(bothSupport&&bothCust) f.caseType='Child Support / Child Custody'; else if(bothSupport) f.caseType='Child Support'; else if(bothCust) f.caseType='Child Custody'; else if(/\bfamily\b/i.test(t)) f.caseType='Family'; else if(/\bcriminal\b/i.test(t)) f.caseType='Criminal'; else if(/\btraffic\b|citation\b/i.test(t)) f.caseType='Traffic';
  const caseMatch=t.match(/\b(?:case(?: number| no\.?| #)?|ucn)\s*(?:is|:|#)?\s*([A-Z0-9-]{6,})\b/i); if(caseMatch && /\d/.test(caseMatch[1])) f.ucn=caseMatch[1];
  const bar=t.match(/\b(?:florida\s+bar|bar)(?:\s+(?:number|no\.?|#))?\s*(?:is|:|#)?\s*(\d{5,8})\b/i); if(bar) f.barNumber=bar[1];
  const filing=t.match(/\b(?:filing|submission)(?:\s+(?:id|number|no\.?|#))?\s*(?:is|:|#)?\s*([A-Z0-9-]{5,})\b/i); if(filing && /\d/.test(filing[1])) f.filingId=filing[1];
  const rac=t.match(/\b(?:registration|rac)(?:\s+(?:id|number|no\.?|#))?\s*(?:is|:|#)?\s*([A-Z0-9-]{4,})\b/i); if(rac && /\d/.test(rac[1])) f.racId=rac[1];
  if(/\b(?:existing case|my case|open case|pending case)\b/i.test(t) || (/\b(?:response|answer|motion|evidence|objection|counterclaim)\b/i.test(t) && /\b(?:petition|complaint|case|file|filing)\b/i.test(t)) || /\b(?:file|submit|upload)\b[^.!?]{0,60}\b(?:existing|case|answer|response|document)\b/i.test(t)) f.ticketType='Help with Filing to Existing Case';
  else if(/\b(?:new case|initiate a case|start a case|new complaint|new petition)\b/i.test(t)) f.ticketType='File New Case';
  else if(/\b(?:password|locked out|reset my password|forgot password)\b/i.test(t)) f.ticketType='Password / Login Help';
  else if(/\b(?:register|registration|create an account|new account)\b/i.test(t)) f.ticketType='Registration Help';
  return f;
}
function casePhrase(v=''){ return v==='Child Support / Child Custody'?'Child Support and Custody Case':v?`${v} Case`:'case'; }
function buildSummary(f,text){
  const role=f.filerRole==='Self Represented Litigant'?'Pro Se Litigant':f.filerRole||'Caller';
  let s='';
  if(f.ticketType==='Help with Filing to Existing Case') s=`${role} called inquiring for help filing to an existing ${casePhrase(f.caseType)}`;
  else if(f.ticketType==='File New Case') s=`${role} called inquiring about filing a new ${casePhrase(f.caseType)}`;
  else if(f.ticketType==='Password / Login Help') s=`${role} called requesting password or login assistance`;
  else if(f.ticketType==='Registration Help') s=`${role} called requesting registration assistance`;
  else s=`${role} called requesting Portal Support assistance`;
  if(f.county) s += ` in ${f.county} County`;
  if(f.ucn) s += `, case number ${f.ucn}`;
  s += '.';
  if(f.phone) s += ` Customer requested call back at phone number: ${f.phone}.`;
  else if(f.email) s += ` Customer provided email: ${f.email}.`;
  return s;
}
function renderFields(f){
  const labels={personName:'Caller Name',phone:'Phone',email:'Email',filerRole:'Filer Role',county:'County / Court',caseType:'Case Type',ucn:'Case # / UCN',barNumber:'FL Bar #',filingId:'Filing / Submission #',racId:'Registration / RAC #',ticketType:'Ticket Type'};
  const entries=Object.entries(labels).filter(([k])=>f[k]); els.fieldCount.textContent=`${entries.length} detected`;
  els.detected.innerHTML=entries.length?entries.map(([k,l])=>`<div class="kv"><b>${escapeHtml(l)}</b><span>${escapeHtml(f[k])}</span></div>`).join(''):'<div class="kv"><b>Status</b><span>No fields detected yet.</span></div>';
}
function analyzeTranscript(){ const text=els.transcript.value.trim(); const f=extractFields(text); renderFields(f); els.summary.value=text?buildSummary(f,text):''; }
async function copyText(v,btn){ try{ await navigator.clipboard.writeText(v); const old=btn.textContent; btn.textContent='Copied'; setTimeout(()=>btn.textContent=old,900); }catch{ setStatus('<strong>Copy blocked.</strong> Select the text and copy manually.','warn'); } }

els.system.addEventListener('click',()=>startRecording('system'));
els.mic.addEventListener('click',()=>startRecording('mic'));
els.stop.addEventListener('click',stopRecording);
els.file.addEventListener('change',()=>{ const f=els.file.files?.[0]; if(f){ setAudioBlob(f); setStatus(`<strong>Loaded:</strong> ${escapeHtml(f.name)} · ${(f.size/1048576).toFixed(1)} MB`,'good'); }});
els.transcribe.addEventListener('click',transcribe);
els.analyze.addEventListener('click',analyzeTranscript);
els.transcript.addEventListener('input',()=>{ window.clearTimeout(window.__vmAnalyze); window.__vmAnalyze=setTimeout(analyzeTranscript,450); });
els.copyTranscript.addEventListener('click',()=>copyText(els.transcript.value,els.copyTranscript));
els.copySummary.addEventListener('click',()=>copyText(els.summary.value,els.copySummary));
window.addEventListener('beforeunload',()=>{ sourceStream?.getTracks().forEach(t=>t.stop()); if(audioUrl) URL.revokeObjectURL(audioUrl); });
