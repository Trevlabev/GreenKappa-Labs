/** Prepare CASCADE's public assets from an unchanged, pinned full-digital deck archive.
 * The archive is split into ten GitHub-friendly binary blobs. Keeps original source assets
 * separate from the Cascade gameplay and demo logic; never rewrites approved card images.
 */
import {existsSync,mkdirSync,readFileSync,writeFileSync,mkdtempSync,cpSync,readdirSync,rmSync} from 'node:fs';
import {join,resolve,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ARCHIVE_SHA='567d64e078e920a3b7cc57d25f0bc8873cb2b69e4e05307f40ecd5f75419a8e0';
const paths=Array.from({length:10},(_,i)=>join(ROOT,'assets',`digital-full-${String(i).padStart(2,'0')}.part`));
for(const p of paths)if(!existsSync(p))throw Error(`Approved asset archive part absent: ${basename(p)}`);
const archive=Buffer.concat(paths.map(p=>readFileSync(p)));
const sha=createHash('sha256').update(archive).digest('hex');
if(sha!==ARCHIVE_SHA)throw Error(`Source ZIP integrity mismatch (${sha})`);
const temp=mkdtempSync(join(tmpdir(),'afc-art-'));
try{
 const zip=join(temp,'approved.zip');writeFileSync(zip,archive);
 execFileSync('unzip',['-q','-o',zip,'AGENT_FAULT_DIGITAL/static/assets/*','AGENT_FAULT_DIGITAL/data/*','-d',temp]);
 const source=join(temp,'AGENT_FAULT_DIGITAL'),assets=join(source,'static','assets');
 const target=join(ROOT,'public','static','assets');mkdirSync(target,{recursive:true});
 cpSync(assets,target,{recursive:true,force:true});
 const manifest=JSON.parse(readFileSync(join(target,'manifest.json'),'utf8'));
 const backs=readdirSync(join(target,'backs')).filter(x=>x.endsWith('.webp'));
 const fronts=readdirSync(join(target,'fronts')).filter(x=>x.endsWith('.webp'));
 if(fronts.length!==66||backs.length!==3||Object.keys(manifest.cards||{}).length!==66)throw Error('Artwork manifest or count inconsistent');
 for(const category of ['SCENARIO','INTERFERENCE','FAULT']){
  const original=JSON.parse(readFileSync(join(source,'data',`AGENT_FAULT_WEB_${category}.json`),'utf8'));
  const local=JSON.parse(readFileSync(join(ROOT,'data',`AGENT_FAULT_WEB_${category}.json`),'utf8'));
  if(JSON.stringify(original)!==JSON.stringify(local))throw Error(`Original ${category} candidate card data mismatch`);
  for(const card of local){const entry=manifest.cards[card.id];if(!entry||!existsSync(join(target,'fronts',card.id+'.webp')))throw Error(`Artwork missing for ${card.id}`);}
 }
 console.log('CASCADE: original 66 illustrated fronts, three corrected robot backs, and exact card manifest restored. SHA-256 verified.');
}finally{rmSync(temp,{recursive:true,force:true})}
