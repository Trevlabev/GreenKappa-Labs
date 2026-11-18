/**
 * AGENT/FAULT score-balance model: a reproducible neutral random-winner
 * counterfactual. The real Judge and NPCs do NOT choose uniformly.
 * Zero API calls. Do NOT interpret these percentages as observed win rates.
 */
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

const SAMPLE=80000,SEED=20261118;
function random(seed){
 let x=seed>>>0;
 return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};
}
function simulate(edition,players,bonusRate){
 const rounds=edition==='Classic'&&players===4?8:players;
 const rng=random(SEED+players*977+rounds*31+Math.round(bonusRate*10000));
 let tied=0,zeroPointSeats=0,scores=0,uniqueLeaders=0;
 for(let trial=0;trial<SAMPLE;trial++){
  const points=Array(players).fill(0);
  for(let round=0;round<rounds;round++){
   const judge=round%players;
   const pick=()=>{let seat=Math.floor(rng()*(players-1));return seat>=judge?seat+1:seat;};
   points[pick()]++;
   // Hypothetical independent, equally distributed Bonus chance.
   if(rng()<bonusRate)points[pick()]++;
  }
  const top=Math.max(...points);
  const leaders=points.filter(p=>p===top).length;
  if(leaders>1)tied++;
  else uniqueLeaders++;
  zeroPointSeats+=points.filter(p=>p===0).length;
  scores+=points.reduce((a,b)=>a+b,0);
 }
 return {
  edition,players,rounds,expected_spotlight_points:rounds,
  hypothetical_bonus_rate_per_round:bonusRate,
  avg_points_per_player:Math.round(scores/(SAMPLE*players)*100)/100,
  tie_for_first_pct:Math.round(tied/SAMPLE*1000)/10,
  scoreless_seats_pct:Math.round(zeroPointSeats/(SAMPLE*players)*1000)/10,
  generation_calls_per_full_game:edition==='Classic'?rounds:rounds*(1+2*(players-1)),
  simulated_games:SAMPLE
 };
}
const rows=[];
for(const edition of ['Classic','Cascade'])for(let players=4;players<=8;players++)
 for(const bonusRate of [0,0.1,0.25])rows.push(simulate(edition,players,bonusRate));
const report={
 schema:'agent-fault-score-balance-v1',
 seed:SEED,
 assumptions:[
  'Every human/NPC contestant response has equal independent probability to win Spotlight.',
  'When a hypothetical Bonus occurs, its recipient is uniformly chosen from eligible non-Judges.',
  'A Bonus rate of 0, 0.1, or 0.25 per round is a modeled scenario, not a measured frequency.'
 ],
 limitations:[
  'No claims about comedy, card synergy, skill, NPC quality, or actual player win rates.',
  'No inference calls are made; response delays and model price cannot be inferred.',
  'Tie likelihood changes with actual judging strategies and Bonus outcomes.',
  'Round counts, scoring caps and Judge rotation reflect current game engines.'
 ],
 rows
};
const out=process.argv.find(a=>a.startsWith('--out='));
if(out){
 const file=resolve(out.slice('--out='.length));
 mkdirSync(dirname(file),{recursive:true});
 writeFileSync(file,JSON.stringify(report,null,2)+'\n');
}
const summary=rows.filter(r=>r.hypothetical_bonus_rate_per_round===0);
console.log(JSON.stringify({
 status:'PASS',samplePerConfiguration:SAMPLE,
 note:'HYPOTHETICAL, not observed player data',
 noBonus:summary.map(x=>({edition:x.edition,players:x.players,rounds:x.rounds,tiePct:x.tie_for_first_pct,scorelessPct:x.scoreless_seats_pct,aiResponses:x.generation_calls_per_full_game})),
 modelCalls:0
},null,2));
if(summary.length!==10)process.exitCode=1;
