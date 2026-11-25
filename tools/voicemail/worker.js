// Local inference. No audio or transcript is sent to an inference API.
const models={tiny:['Xenova/whisper-tiny.en','79fb389fc764e7c395bd330e9531d9d32ada7049'],base:['Xenova/whisper-base.en','95bf40a508535962c6483ead40270b2e32267508'],small:['Xenova/whisper-small.en','fa16a75f5d91e83ecb6a2ccb690f14d91ef00ca4']};
let lib,pipe,key,device;
const stage=(id,text)=>self.postMessage({id,kind:'stage',text});
async function load(model,backend,id){
 if(!models[model])throw Error('Unknown model');
 const wanted=model+':'+backend;
 if(pipe&&key===wanted)return;
 if(pipe){await pipe.dispose();pipe=null;key=null;}
 if(!lib){
  stage(id,'Checking WebAssembly availability…');
  try{if(typeof WebAssembly==='undefined')throw Error('WebAssembly is unavailable');await WebAssembly.compile(new Uint8Array([0,97,115,109,1,0,0,0]));}catch(e){throw Error('WebAssembly check failed: '+e.message);}
  stage(id,'Loading transcription runtime from jsDelivr…');
  try{lib=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');}catch(e){throw Error('Runtime download failed (cdn.jsdelivr.net): '+e.message);}
  lib.env.allowLocalModels=false;lib.env.useBrowserCache=true;
  if(lib.env.backends?.onnx?.wasm)lib.env.backends.onnx.wasm.numThreads=1;
 }
 const [name,revision]=models[model];
 stage(id,'Loading '+model+' model from Hugging Face · '+backend.toUpperCase()+'…');
 try{pipe=await lib.pipeline('automatic-speech-recognition',name,{revision,device:backend,dtype:'q8',progress_callback:p=>{
  if(p.status==='progress')self.postMessage({id,kind:'progress',file:p.file,progress:p.progress});
  else if(p.status==='initiate')stage(id,'Requesting model component: '+p.file);
 }});}catch(e){throw Error('Model/runtime initialization ('+backend+'): '+e.message);}
 key=wanted;device=backend;
}
self.onmessage=async({data:m})=>{
 const {id,model,action}=m;
 try{
  const preferred=m.backend==='wasm'?'wasm':navigator.gpu?'webgpu':'wasm';
  let result;
  const run=async backend=>{await load(model,backend,id);if(action==='prepare')return;stage(id,'Transcribing locally on '+backend.toUpperCase()+'…');try{return await pipe(m.audio,{chunk_length_s:30,stride_length_s:5,return_timestamps:true});}catch(e){throw Error('Speech inference ('+backend+'): '+e.message);}};
  try{result=await run(preferred);}catch(e){if(preferred==='wasm')throw e;stage(id,'GPU unavailable; retrying with CPU (WASM)…');result=await run('wasm');}
  self.postMessage({id,kind:'done',device,output:result?{text:result.text,chunks:result.chunks||[]}:null});
 }catch(e){self.postMessage({id,kind:'error',text:String(e?.message||e)});}
};