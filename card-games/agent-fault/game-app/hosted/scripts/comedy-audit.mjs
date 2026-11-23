/**
 * Offline, deterministic audit of all 24 x 36 real card combinations.
 * Does not generate, fetch, or score model responses. Humor is subjective.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {SCENES,INF,FAULTS} from '../lib/cards.mjs';
import {buildPrompt as classicPrompt} from '../lib/game.mjs';
import {buildPrompt as cascadePrompt} from '../../cascade/lib/game.mjs';
import {evaluateReply,rankNpcReplies} from '../lib/comedy-quality.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const fixture=JSON.parse(readFileSync(resolve(root,'fixtures/comedy-examples.json'),'utf8'));
const byId=Object.fromEntries([...SCENES,...INF,...FAULTS].map(x=>[x.id,x]));
const hash=x=>createHash('sha256').update(x).digest('hex');
const report={schema:'agent-fault-quality-audit-v1',source:'real card manifest',
 model_calls:0,generated_at:null,
 deck:{scenarios:SCENES.length,interferences:INF.length,faults:FAULTS.length},
 coverage:{classic:0,cascade:0,uniqueClassic:0,uniqueCascade:0,errors:[]},
 fixtures:{total:fixture.examples.length,positiveWins:0,results:[]},
 caveat:'These are mechanical checks, not a measure of how funny people find the output.'
};
const classic=new Set(),cascade=new Set();
for(const scene of SCENES)for(const card of INF){
 const prompts=[
  ['classic',classicPrompt({
    scenario_id:scene.id,profile:'A politely enthusiastic public servant',
    candidates:[{label:'A',card_id:card.id}]
  }),classic],
  ['cascade',cascadePrompt({
    scenario_id:scene.id,profile:'A politely enthusiastic public servant',
    phase:'cascade',step:'card',order:['P1','P2'],cursor:0,
    locked:{P1:card.id},
    timeline:[{kind:'agent',id:'B0',text:'I acknowledge the assignment and suggest an initial practical step.'}]
  }),cascade]
 ];
 for(const [edition,prompt,set] of prompts){
  report.coverage[edition]++;
  set.add(hash(prompt));
  for(const required of [scene.public_assignment,scene.required_behavior,card.instruction])
   if(!prompt.includes(required))
    report.coverage.errors.push(edition+': '+scene.id+' '+card.id+' omits required card content');
  if(prompt.length>14000)
   report.coverage.errors.push(edition+': '+scene.id+' '+card.id+' is unusually long');
 }
}
report.coverage.uniqueClassic=classic.size;
report.coverage.uniqueCascade=cascade.size;
for(const ex of fixture.examples){
 const scene=byId[ex.scenario],card=byId[ex.interference];
 if(!scene||!card)throw Error('Unknown cards in review fixture: '+ex.scenario+'/'+ex.interference);
 const good=evaluateReply({text:ex.good,scene,interference:card.instruction});
 const bad=evaluateReply({text:ex.bad,scene,interference:card.instruction});
 const winner=rankNpcReplies([{id:'GOOD',text:ex.good},{id:'BAD',text:ex.bad}],
  {name:'COMPLIANCE BOT',tags:['official','policy','rule']},scene)[0]?.id;
 if(good.score>bad.score&&winner==='GOOD')report.fixtures.positiveWins++;
 report.fixtures.results.push({scenario:scene.id,interference:card.id,good:good.score,
  bad:bad.score,winner,goodFlags:good.flags,badFlags:bad.flags});
}
report.pass=report.deck.scenarios===24&&report.deck.interferences===36&&report.deck.faults===6
 &&classic.size===SCENES.length*INF.length&&cascade.size===SCENES.length*INF.length
 &&report.coverage.errors.length===0&&report.fixtures.positiveWins===fixture.examples.length;
const outArg=process.argv.find(a=>a.startsWith('--out='));
if(outArg){
 const filename=resolve(outArg.slice('--out='.length));
 mkdirSync(dirname(filename),{recursive:true});
 writeFileSync(filename,JSON.stringify({...report,generated_at:new Date().toISOString()},null,2)+'\n');
}
console.log(JSON.stringify({status:report.pass?'PASS':'FAIL',deck:report.deck,
 prompts:report.coverage.classic,uniqueClassic:classic.size,uniqueCascade:cascade.size,
 fixtures:report.fixtures.positiveWins+'/'+report.fixtures.total,
 errors:report.coverage.errors.slice(0,6),modelCalls:0},null,2));
if(!report.pass)process.exitCode=1;
