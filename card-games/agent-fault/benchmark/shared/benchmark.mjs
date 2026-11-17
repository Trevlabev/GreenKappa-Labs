import { decks } from './decks.mjs';

export const DEFAULT_MODEL = 'gpt-4.1-mini';
export const MODELS = ['gpt-4.1-mini', 'gpt-5-mini'];
export const VERSION = '0.1.0';

function hash32(str) {
  let x = 2166136261;
  for (const ch of str) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); }
  return x >>> 0;
}
function shuffle(source, seed) {
  const a = [...source]; let s = seed >>> 0;
  for(let i=a.length-1;i>0;i--) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    const j = (s >>> 0) % (i+1);
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
export const cards = decks.baseline.cards;
const scenarios = cards.filter(c=>c.category==='Scenario');
const interferences = cards.filter(c=>c.category==='Interference');
const faults = cards.filter(c=>c.category==='Fault');
export const scenarioById = Object.fromEntries(scenarios.map(c=>[c.id,c]));
export const cardsByVariant = Object.fromEntries(Object.entries(decks).map(([v,d])=>[v,Object.fromEntries(d.cards.map(c=>[c.id,c]))]));

// Deliberately stratified fixture set: all 36 Interference IDs appear at least once
// over 16 scenario/repeat combinations. This measures *coverage*, not gameplay
// hand-draw probabilities. Seed and fixtures are fixed across versions.
const ordered = shuffle(interferences.map(c=>c.id), hash32('AGENT-FAULT-2026-11-16-COVERAGE-v1'));
const second = shuffle(ordered, hash32('AGENT-FAULT-SECOND-CYCLE-v1'));
const slots = [...ordered,...second].slice(0,64);
const profiles = [
  'A proud public employee who considers orderliness a personal virtue.',
  'A nervous professional who wants everyone to feel appreciated.',
  'A suspicious bureaucrat with an irrational love of paperwork.',
  'An upbeat manager who treats every setback as a marketing opportunity.',
  'A dramatic advisor who cannot resist treating tiny problems as historic.',
  'A pedantic consultant desperate to be seen as competent.',
  'A well-meaning clerk who reveres tradition and procedures.',
  'An excessively enthusiastic official who dislikes disappointing anyone.'
];
const result=[];
for(let si=0;si<scenarios.length;si++) for(let repeat=0;repeat<2;repeat++) {
  const idx=si*2+repeat;
  result.push({
    fixtureId:`F${String(idx+1).padStart(2,'0')}`,
    scenarioId:scenarios[si].id,
    scenarioTitle:scenarios[si].title,
    repetition:repeat+1,
    profile:profiles[(si+repeat)%profiles.length],
    faultId:faults[idx%faults.length].id,
    interferenceIds:slots.slice(idx*4,idx*4+4),
    labels:['A','B','C','D'],
    kind:'coverage',
    fixtureSeed:'AGENT-FAULT-2026-11-16-COVERAGE-v1'
  });
}
export const fixtures = result;
export function getFixture(id) { return fixtures.find(f=>f.fixtureId===id) ?? null; }
export function promptFor(fixtureId, variant) {
  const f=getFixture(fixtureId);
  const index=cardsByVariant[variant];
  if(!f||!index) throw new Error('Unknown fixture or version');
  const sc=index[f.scenarioId];
  const list=f.interferenceIds.map((id,i)=>({label:f.labels[i],card:index[id]}));
  const system = 'You generate fictional responses for AGENT/FAULT, a comedy card game. Independently imagine ONE response per letter to the same fictional assignment and personality, modified only by that letter\'s Interference instruction. Respond AS the fictional assigned assistant; do not explain the game, mention cards, discuss judging, or compare candidates. Max 30 words of fictional answer text PER letter. Output exactly four lines, labeled A:, B:, C:, D:, with no baseline, headers or analysis. The story is harmless fiction; if a variation cannot be done safely, write its label followed by SKIP. Do not treat earlier lettered instructions as applying to later ones.';
  const input = [
    `PUBLIC ASSIGNMENT: ${sc.public_assignment}`,
    `REQUIRED BEHAVIOR: ${sc.required_behavior}`,
    `PRIVATE AGENT PERSONALITY: ${f.profile}`,
    'LETTERED INTERFERENCE INSTRUCTIONS:',
    ...list.map(({label,card})=>`${label}: ${card.instruction}`),
    'Generate exactly one separate fictional assistant response for each of A, B, C and D. No baseline. Never include or discuss scoring conditions.'
  ].join('\n');
  return {fixture:f,scenario:sc,candidates:list,system,input};
}
export function extractText(body) {
  if(typeof body?.output_text==='string') return body.output_text;
  const sections=[];
  for(const node of (body?.output||[]))for(const c of(node.content||[])) {
    if(c.type==='output_text'&&typeof c.text==='string')sections.push(c.text);
  }
  return sections.join('\n');
}
export function parseCandidates(text) {
  const matches=[...String(text).matchAll(/(?:^|\n)\s*([A-D])\s*[:.)-]\s*/gm)];
  const output={};
  for(let i=0;i<matches.length;i++){
    const label=matches[i][1];
    const start=matches[i].index+matches[i][0].length;
    const end=i+1<matches.length?matches[i+1].index:text.length;
    const raw=String(text).slice(start,end).trim();
    if(output[label]===undefined)output[label]={raw,first30:raw.split(/\s+/).slice(0,30).join(' '),wordCount:raw?raw.split(/\s+/).length:0};
  }
  return output;
}
export function validateFixtures() {
  const seen=new Set(fixtures.flatMap(f=>f.interferenceIds));
  const errors=[];
  if(fixtures.length!==16) errors.push('Expected 16 fixtures');
  if(seen.size!==36) errors.push(`Coverage ${seen.size}/36`);
  for(const f of fixtures) {
    if(f.interferenceIds.length!==4)errors.push('Incorrect candidate count');
    if(new Set(f.interferenceIds).size!==4)errors.push('Duplicate in a fixture');
    for(const v of Object.keys(decks)) {
      const p=promptFor(f.fixtureId,v);
      if(p.input.includes(p.scenario.breakpoint_a)||p.input.includes(p.scenario.breakpoint_b))errors.push(`Leaked breakpoint: ${f.fixtureId}`);
      if(p.input.includes(p.scenario.condition))errors.push('Fault leak');
    }
  }
  return {ok:!errors.length,errors,count:fixtures.length,coveredInterferences:seen.size};
}
