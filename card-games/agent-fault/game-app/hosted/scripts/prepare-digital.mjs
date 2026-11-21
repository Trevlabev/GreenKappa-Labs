/** AGENT/FAULT online build: restore only approved v0.9-P digital art and UI.
 * The build ZIP is pinned by SHA-256 and split into repo-friendly binary segments.
 * It intentionally contains no API key, database, or player data.
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync, cpSync, readdirSync, rmSync} from 'node:fs';
import {join, resolve, dirname, basename} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHA = '567d64e078e920a3b7cc57d25f0bc8873cb2b69e4e05307f40ecd5f75419a8e0';
const partNames = Array.from({length:10}, (_,i)=>join(ROOT, 'assets', `digital-full-${String(i).padStart(2,'0')}.part`));
for(const p of partNames) if(!existsSync(p))throw Error(`Missing pinned approved-art segment: ${basename(p)}`);
const archive=Buffer.concat(partNames.map(p=>readFileSync(p)));
const digest=createHash('sha256').update(archive).digest('hex');
if(digest!==SHA)throw Error(`Digital source checksum mismatch; expected ${SHA}, got ${digest}`);
const tmp=mkdtempSync(join(tmpdir(),'af-digital-build-'));
try {
 const zipPath=join(tmp,'source.zip');writeFileSync(zipPath,archive);
 execFileSync('unzip',['-q','-o',zipPath,'AGENT_FAULT_DIGITAL/static/*','AGENT_FAULT_DIGITAL/data/*','-d',tmp],{stdio:'pipe'});
 const original=join(tmp,'AGENT_FAULT_DIGITAL');
 const src=join(original,'static'); const dest=join(ROOT,'public','static');
 mkdirSync(dest,{recursive:true});
 for(const n of ['digital.js','digital.css'])cpSync(join(src,n),join(dest,n));
 // Preserve the multiplayer entry page; the archive's index is only for the standalone prototype.
 const gameIndex=join(ROOT,'public','index.html');
 const hasMultiplayerEntry=existsSync(gameIndex)&&readFileSync(gameIndex,'utf8').includes('src="/static/app.js"');
 if(!hasMultiplayerEntry)cpSync(join(src,'index.html'),gameIndex);
 cpSync(join(src,'assets'),join(dest,'assets'),{recursive:true,force:true});
 const art=join(dest,'assets','fronts');const backs=join(dest,'assets','backs');
 if(readdirSync(art).filter(x=>x.endsWith('.webp')).length!==66)throw Error('Incorrect front artwork count');
 if(readdirSync(backs).filter(x=>x.endsWith('.webp')).length!==3)throw Error('Incorrect back artwork count');
 const manifest=JSON.parse(readFileSync(join(dest,'assets','manifest.json'),'utf8'));
 if(Object.keys(manifest.cards??{}).length!==66)throw Error('Incorrect art manifest count');
 for(const type of ['SCENARIO','INTERFERENCE','FAULT']){
   const a=JSON.parse(readFileSync(join(original,'data',`AGENT_FAULT_WEB_${type}.json`),'utf8'));
   const b=JSON.parse(readFileSync(join(ROOT,'data',`AGENT_FAULT_WEB_${type}.json`),'utf8'));
   if(JSON.stringify(a)!==JSON.stringify(b))throw Error(`Digital/hosted ${type} card texts differ`);
 }
 execFileSync(process.execPath,['--check',join(dest,'digital.js')],{stdio:'pipe'});
 console.log('Restored original card art (66 fronts, 3 correct backs), v0.9-P card texts, animated digital UI; SHA-256 verified.');
} finally {rmSync(tmp,{recursive:true,force:true});}
