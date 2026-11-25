// Audio stays in the worker; no transcription API.
const models={tiny:['Xenova/whisper-tiny.en','79fb389fc764e7c395bd330e9531d9d32ada7049'],base:['Xenova/whisper-base.en','95bf40a508535962c6483ead40270b2e32267508'],small:['Xenova/whisper-small.en','14ab78eccbd2ad4b57e84d8023c72006917ab78c']};
let lib,pipe,key,device;
async function load(model,backend,id){
 if(!models[model])throw Error('Unknown model');
 const wanted=model+':'+backend;
 if(pipe&&key===wanted)return;
 if(pipe){await pipe.dispose();pipe=null;key=null;}
 lib??=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
 lib.env.allowLocalModels=false;lib.env.useBrowserCache=true;
 // Single-threaded WASM works without cross-origin isolation on ordinary static hosting.
 lib.env.backends.onnx.wasm.numThreads=1;
 const [name,revision]=models[model];
 self.postMessage({id,kind:'stage',text:'Loading '+model+' model on '+backend.toUpperCase()+'…'});
 pipe=await lib.pipeline('automatic-speech-recognition',name,{revision,device:backend,dtype:'q8',progress_callback:p=>{
   if(p.status==='progress')self.postMessage({id,kind:'progress',file:p.file,progress:p.progress});
 }});
 key=wanted;device=backend;
}
self.onmessage=async({data:m})=>{
 const {id,model,action}=m;
 try{
  const preferred=m.backend==='wasm'?'wasm':navigator.gpu?'webgpu':'wasm';
  let result;
  const run=async backend=>{await load(model,backend,id);if(action==='prepare')return;self.postMessage({id,kind:'stage',text:'Transcribing locally on '+backend.toUpperCase()+'…'});return await pipe(m.audio,{chunk_length_s:30,stride_length_s:5,return_timestamps:true});};
  try{result=await run(preferred);}catch(e){if(preferred==='wasm')throw e;self.postMessage({id,kind:'stage',text:'GPU unavailable; retrying with CPU (WASM)…'});result=await run('wasm');}
  self.postMessage({id,kind:'done',device,output:result?{text:result.text,chunks:result.chunks||[]}:null});
 }catch(e){self.postMessage({id,kind:'error',text:String(e?.message||e)});}
};
