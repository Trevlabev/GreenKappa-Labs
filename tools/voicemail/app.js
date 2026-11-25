import { analyze, outputs, labels, types, responseDraft } from './engine.mjs?v=2.1';
const $=id=>document.getElementById(id);
const e=Object.fromEntries(['model','backend','prepare','system','mic','file','stop','cancel','clock','level','signal','progress','status','preview','transcribe','higher','reset','transcript','title','summary','segments','analyze','warnings','fields','missing','regen','copyAll','response'].map(k=>[k,$(k)]));
let state='idle',generation=0,recording=null,blob=null,previewURL=null,worker=null,workerURL=null,workerReady=null,jobId=0,job=null,modelUsed=null,fields={},resultWarnings=[],segments=[],analysisTimer=null;
const busy=()=>!['idle','ready'].includes(state);
function status(text,tone=''){e.status.textContent=text;e.status.dataset.tone=tone;}
function setState(s){
 state=s;const b=busy();
 for(const k of ['system','mic','file','model','backend','prepare','reset'])e[k].disabled=b;
 e.file.closest('label').classList.toggle('disabled',b);
 e.stop.disabled=s!=='recording';e.cancel.disabled=!b;
 e.transcribe.disabled=b||!blob;e.higher.disabled=b||!blob||modelUsed==='small';
 e.analyze.disabled=b;e.regen.disabled=b;e.copyAll.disabled=b;
 e.transcript.readOnly=b;e.summary.readOnly=b;e.title.readOnly=b;e.response.readOnly=b;
 for(const x of document.querySelectorAll('#fields input,#fields select,#missing input,#missing select'))x.disabled=b;
}
function sec(n){n=Math.max(0,Math.floor(n||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function clearAudio(){e.preview.pause();e.preview.removeAttribute('src');e.preview.load();e.preview.hidden=true;if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;blob=null;modelUsed=null;}
function clearReview(){clearTimeout(analysisTimer);fields={};resultWarnings=[];segments=[];e.transcript.value='';e.title.value='';e.summary.value='';e.response.value='';e.segments.replaceChildren();renderFields();renderWarnings();}
function clearSession(){if(busy())return;generation++;terminateWorker();clearAudio();clearReview();e.file.value='';e.clock.textContent='00:00';e.progress.value=0;e.level.value=0;e.signal.textContent='Idle';setState('idle');status('New voicemail. Ready for audio or a pasted transcript.');}
function setAudio(b){clearAudio();blob=b;previewURL=URL.createObjectURL(b);e.preview.src=previewURL;e.preview.hidden=false;}
function terminateWorker(){if(worker)worker.terminate();worker=null;workerReady=null;if(workerURL)URL.revokeObjectURL(workerURL);workerURL=null;const j=job;job=null;if(j)j.reject(Error('Canceled'));}
async function ensureWorker(){
 if(worker)return worker;if(workerReady)return workerReady;
 const g=generation;
 workerReady=(async()=>{if(g!==generation)throw Error('Canceled');if(typeof Worker==='undefined')throw Error('Web Workers are unavailable.');status('Starting transcription worker…');const w=new Worker(new URL('./worker.js?v=2.1',document.baseURI),{type:'module'});worker=w;
 w.onmessage=({data:m})=>{if(!job||m.id!==job.id||w!==worker)return;
 if(m.kind==='stage'){status(m.text);e.progress.removeAttribute('value');}
 else if(m.kind==='progress'){e.progress.value=Number.isFinite(m.progress)?Math.round(m.progress):0;status('Downloading model component: '+m.file+' · '+Math.round(m.progress||0)+'%');}
 else if(m.kind==='done'||m.kind==='error'){const j=job;job=null;m.kind==='done'?j.resolve(m):j.reject(Error(m.text));}};
 w.onerror=ev=>{if(w!==worker)return;const j=job;job=null;terminateWorker();j?.reject(Error('Worker startup: '+(ev.message||'Browser could not load the worker script.')));};w.onmessageerror=()=>{if(w!==worker)return;const j=job;job=null;terminateWorker();j?.reject(Error('Worker message could not be decoded.'));};return w;})();
 try{return await workerReady;}finally{if(g===generation)workerReady=null;}
}
async function askWorker(action,model,audio){const w=await ensureWorker();return new Promise((resolve,reject)=>{const id=++jobId;job={id,resolve,reject};try{w.postMessage({id,action,model,backend:e.backend.value,audio});}catch(err){job=null;reject(err);}});}
function cleanupCapture(r){if(!r)return;clearInterval(r.timer);cancelAnimationFrame(r.frame);try{r.ctx?.close().catch(()=>{});}catch{}r.stream?.getTracks().forEach(t=>t.stop());e.level.value=0;e.signal.textContent='Idle';}
function beginMeter(r){
 try{const C=window.AudioContext||window.webkitAudioContext;r.ctx=new C();r.ctx.resume().catch(()=>{});const analyser=r.ctx.createAnalyser();analyser.fftSize=1024;r.ctx.createMediaStreamSource(r.audio).connect(analyser);const a=new Float32Array(analyser.fftSize);
 const tick=()=>{if(recording!==r||state!=='recording')return;analyser.getFloatTimeDomainData(a);let s=0;for(const x of a)s+=x*x;const rms=Math.sqrt(s/a.length);r.peak=Math.max(r.peak,rms);e.level.value=Math.min(1,rms*6);e.signal.textContent=rms>.012?'Signal detected':rms>.002?'Low signal':'Quiet';r.frame=requestAnimationFrame(tick);};tick();
 }catch{e.signal.textContent='Meter unavailable';}
}
async function start(kind){
 if(busy())return;const g=++generation;setState('requesting');status(kind==='system'?'Choose the voicemail source in the share picker. Enable tab or system audio.':'Allow microphone access.');
 let stream;
 try{
 if(!navigator.mediaDevices||!window.MediaRecorder)throw Error('Capture is unavailable in this browser. Use a local audio file instead.');
 stream=kind==='system'?await navigator.mediaDevices.getDisplayMedia({video:true,audio:true,systemAudio:'include'}):await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
 if(g!==generation){stream.getTracks().forEach(t=>t.stop());return;}
 if(!stream.getAudioTracks().length)throw Error('No audio track was shared. Enable audio sharing or choose a local audio file.');
 const audio=new MediaStream(stream.getAudioTracks());
 const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'].find(x=>MediaRecorder.isTypeSupported(x));
 const recorder=mime?new MediaRecorder(audio,{mimeType:mime}):new MediaRecorder(audio);
 clearAudio();clearReview();e.file.value='';e.progress.value=0;
 const r={stream,audio,recorder,chunks:[],g,start:performance.now(),peak:0,discard:false};recording=r;
 recorder.ondataavailable=x=>{if(!r.discard&&x.data?.size)r.chunks.push(x.data);};
 recorder.onerror=x=>{if(recording!==r)return;r.discard=true;cleanupCapture(r);recording=null;setState('idle');status('Recording failed: '+(x.error?.message||'Unknown recording error'),'error');};
 recorder.onstop=()=>{cleanupCapture(r);if(recording!==r||g!==generation||r.discard)return;recording=null;const b=new Blob(r.chunks,{type:recorder.mimeType||r.chunks[0]?.type||'audio/webm'});r.chunks=[];if(!b.size){setState('idle');status('No audio was captured.','error');return;}setAudio(b);setState('ready');transcribe();};
 for(const track of stream.getTracks())track.addEventListener('ended',()=>{if(recording===r&&state==='recording')stop();},{once:true});
 recorder.start(250);setState('recording');status('Recording. Play the voicemail, then select Stop & transcribe.');
 e.clock.textContent='00:00';r.timer=setInterval(()=>{e.clock.textContent=sec((performance.now()-r.start)/1000);},250);beginMeter(r);
 }catch(err){stream?.getTracks().forEach(t=>t.stop());if(g!==generation)return;cleanupCapture(recording);recording=null;setState(blob?'ready':'idle');status('Capture failed: '+(err.name?err.name+' — ':'')+(err.message||err)+(err.name==='NotAllowedError'?' Audio sharing was denied or unavailable. Use a permitted local audio file or paste text.':''),'error');}
}
function stop(){const r=recording;if(state!=='recording'||!r)return;setState('finalizing');status('Finalizing audio…');clearInterval(r.timer);cancelAnimationFrame(r.frame);try{if(r.recorder.state!=='inactive')r.recorder.stop();else r.recorder.onstop();}catch(err){r.discard=true;cleanupCapture(r);recording=null;setState('idle');status('Could not finalize audio: '+err.message,'error');}}
function cancel(){
 if(!busy())return;generation++;const r=recording;recording=null;if(r){r.discard=true;r.chunks=[];try{if(r.recorder.state!=='inactive')r.recorder.stop();}catch{}cleanupCapture(r);}terminateWorker();e.progress.value=0;setState(blob?'ready':'idle');status(blob?'Canceled. The selected audio is available to retry.':'Canceled. No recording retained.');}
async function decode(b){
 const C=window.AudioContext||window.webkitAudioContext,O=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!C||!O)throw Error('Audio decoding is unavailable.');
 const ctx=new C();try{const buf=await ctx.decodeAudioData(await b.arrayBuffer());if(buf.duration>900)throw Error('Audio exceeds the 15-minute limit. Select a shorter voicemail.');const off=new O(1,Math.max(1,Math.ceil(buf.duration*16000)),16000);const src=off.createBufferSource();src.buffer=buf;src.connect(off.destination);src.start();const out=await off.startRendering();const data=new Float32Array(out.getChannelData(0));let peak=0,sum=0;for(const v of data){peak=Math.max(peak,Math.abs(v));sum+=v*v;}const rms=Math.sqrt(sum/data.length);if(peak<0.002||rms<0.0005)throw Error('Audio appears silent. Check the shared audio source or microphone.');const gain=Math.min(4,0.95/peak);if(gain>1.05)for(let i=0;i<data.length;i++)data[i]*=gain;return {data,seconds:buf.duration,rms,peak};}finally{await ctx.close().catch(()=>{});}
}
async function prepare(){if(busy())return;const g=++generation;setState('processing');try{const res=await askWorker('prepare',e.model.value);if(g!==generation)return;e.progress.value=100;status('Model ready on '+res.device.toUpperCase()+'.','good');}catch(err){if(g===generation){terminateWorker();e.progress.value=0;status('Model preparation failed: '+err.message+' — you can still paste a transcript.','error');}}finally{if(g===generation)setState(blob?'ready':'idle');}}
async function transcribe(model=e.model.value){
 if(busy()||!blob)return;const g=++generation;setState('processing');e.progress.removeAttribute('value');status('Decoding audio locally…');
 try{const d=await decode(blob);if(g!==generation)return;e.clock.textContent=sec(d.seconds);const res=await askWorker('transcribe',model,d.data);if(g!==generation)return;const text=String(res.output?.text||'').trim();modelUsed=model;e.model.value=model;segments=res.output?.chunks||[];e.transcript.value=text;renderSegments();analyzeNow();e.progress.value=100;status(text?'Draft ready · '+res.device.toUpperCase()+' · verify names, identifiers, and issue against audio.':'No speech was detected. Try a different recording or model.',text?'good':'error');
 }catch(err){if(g===generation){terminateWorker();e.progress.value=0;status('Transcription failed: '+err.message+' — retry or paste a transcript.','error');}}
 finally{if(g===generation)setState(blob?'ready':'idle');}
}
function renderSegments(){e.segments.replaceChildren();for(const s of segments){const start=s.timestamp?.[0];const row=document.createElement('div');row.className='segment';const b=document.createElement('button');b.className='small';b.textContent=Number.isFinite(start)?sec(start):'—';b.disabled=!Number.isFinite(start)||!blob;b.onclick=()=>{e.preview.currentTime=start;e.preview.play().catch(()=>{});};const p=document.createElement('span');p.textContent=s.text||'';row.append(b,p);e.segments.append(row);}}
function renderWarnings(){e.warnings.replaceChildren();e.warnings.hidden=!resultWarnings.length;if(!resultWarnings.length)return;const h=document.createElement('strong');h.textContent='Review before copying';e.warnings.append(h);for(const x of resultWarnings){const p=document.createElement('p');p.textContent=x;e.warnings.append(p);}}
function renderFields(){e.fields.replaceChildren();e.missing.replaceChildren();for(const [key,label] of Object.entries(labels)){
 const cell=document.createElement('div');cell.className='control'+(key==='issue'?' wide':'');const l=document.createElement('label');l.textContent=label;l.htmlFor='field-'+key;
 let input;if(key==='ticketType'||key==='callback'||key==='filerRole'){input=document.createElement('select');const opts=key==='ticketType'?types:key==='callback'?['Callback requested','Do not call','Email requested']:['Self Represented Litigant','Attorney','PHV Attorney','Other'];for(const x of ['',...opts]){const o=document.createElement('option');o.value=x;o.textContent=x||'Not specified';input.append(o);}}else{input=document.createElement('input');input.autocomplete='off';input.spellcheck=false;}
 input.id='field-'+key;input.value=fields[key]||'';input.disabled=busy();input.addEventListener('input',()=>{if(input.value.trim())fields[key]=input.value.trim();else delete fields[key];status('Field updated. Regenerate outputs when ready.');});
 const line=document.createElement('div');line.className='line';line.append(l);const b=document.createElement('button');b.className='small';b.textContent='Copy';b.onclick=()=>copy(input.value,b);line.append(b);const original=fields[key]||'';if(original&&segments.length&&key!=='ticketType'&&key!=='callback'&&key!=='filerRole'){const needle=original.toLowerCase().replace(/[^a-z0-9]/g,'');const match=needle.length>=4?segments.find(s=>Number.isFinite(s.timestamp?.[0])&&String(s.text||'').toLowerCase().replace(/[^a-z0-9]/g,'').includes(needle)):null;if(match){const seek=document.createElement('button');seek.className='small';seek.textContent=sec(match.timestamp[0]);seek.title='Play matching transcript segment';seek.onclick=()=>{e.preview.currentTime=match.timestamp[0];e.preview.play().catch(()=>{});};line.append(seek);}}cell.append(line,input);(fields[key]||key==='ticketType'?e.fields:e.missing).append(cell);
 }}
function regenerate(){if(!e.transcript.value.trim()&&!Object.keys(fields).length){e.title.value='';e.summary.value='';e.response.value='';return;}const out=outputs(fields);e.title.value=out.title;e.summary.value=out.summary;e.response.value=responseDraft(fields);}
function analyzeNow(){clearTimeout(analysisTimer);const a=analyze(e.transcript.value);fields=a.fields;resultWarnings=a.warnings;renderFields();renderWarnings();regenerate();}
async function copy(text,b){if(!text)return;try{await navigator.clipboard.writeText(text);const old=b.textContent;b.textContent='Copied';setTimeout(()=>{b.textContent=old;},850);}catch{status('Clipboard access blocked. Select and copy the text manually.','error');}}
e.system.onclick=()=>start('system');e.mic.onclick=()=>start('mic');e.stop.onclick=stop;e.cancel.onclick=cancel;e.reset.onclick=clearSession;e.prepare.onclick=prepare;e.transcribe.onclick=()=>transcribe();e.higher.onclick=()=>transcribe(modelUsed==='tiny'?'base':'small');e.analyze.onclick=()=>{analyzeNow();status('Transcript analyzed. Review the extracted fields and draft.');};e.regen.onclick=()=>{regenerate();status('Draft regenerated from your edited fields.');};
e.file.onchange=()=>{if(busy())return;const f=e.file.files?.[0];if(!f)return;if(f.size>150*1024*1024){status('File exceeds the 150 MB limit.','error');e.file.value='';return;}generation++;clearReview();setAudio(f);e.clock.textContent='00:00';setState('ready');transcribe();};
for(const b of document.querySelectorAll('[data-copy]'))b.onclick=()=>copy($(b.dataset.copy).value,b);
e.copyAll.onclick=()=>copy(['Title: '+e.title.value,'Summary: '+e.summary.value,...Object.entries(labels).filter(([k])=>fields[k]).map(([k,l])=>l+': '+fields[k])].join('\n'),e.copyAll);
e.transcript.addEventListener('input',()=>{clearTimeout(analysisTimer);status('Transcript edited. Select Analyze transcript to refresh the draft.');});
window.addEventListener('keydown',ev=>{if(ev.key!=='F9'||ev.repeat)return;ev.preventDefault();if(state==='recording')stop();else if(!busy())start('system');});
window.addEventListener('pagehide',()=>{generation++;if(recording){recording.discard=true;cleanupCapture(recording);}terminateWorker();clearAudio();clearReview();e.file.value='';recording=null;setState('idle');});
renderFields();setState('idle');status('Ready. Select Prepare model to check transcription availability, or paste a transcript.');
