/**
 * Deterministic, offline, zero-inference measures for the quality of
 * AGENT/FAULT fictional responses and NPC play decisions.
 *
 * These are mechanical signals, NOT semantic proof of comedy or a substitute
 * for a human Judge. No networking, model calls, or private information.
 */
const STOP = new Set([
 'a','an','the','and','or','of','for','with','to','in','on','at','as','from','is','are','be',
 'was','were','will','would','can','could','should','that','this','their','they','them',
 'you','your','our','we','it','its','into','by','after','before','then','who','which',
 'how','not','only','but','now','has','have','had','one','some','every','any','all',
 'a','assist','assistant','ai','fictional','scenario','task','response','require',
 'give','make','provide','help','user','users','player','players','official','people'
]);
const CONSEQUENCE = /\b(?:must|shall|require[sd]?|mandatory|appoint(?:s|ed)?|issue[sd]?|ban(?:ned|s)?|declare[sd]?|approve[sd]?|replace[sd]?|enforce[sd]?|authorize[sd]?|permit[sd]?|mandate[sd]?|prohibit[sd]?|create[sd]?|launch(?:es|ed)?|open(?:s|ed)?|schedule[sd]?|assign[sd]?|instruct[sd]?|register[sd]?|sign[sd]?|vote[sd]?|file[sd]?|submit|certif(?:y|ied)|announc(?:e|es|ed))\b/i;
const EMPTY_META = /\b(?:as an ai|i(?:'m| am) (?:just |only )?an ai|in this (?:card )?game|according to the (?:game|prompt)|i cannot comply with this fictional|as a language model)\b/i;
const SPECIFIC = /\b(?:\d+|mayor|council|office|citizens?|resident|city hall|committee|form|receipt|policy|ordinance|stamp|permit|meeting|pond|ceremony|deadline|department|wedding|clerk|report|inspection|budget|application|election|certificate)\b/i;

export function words(value) {
 return String(value??'').toLowerCase().match(/[a-z0-9]+/g)||[];
}
export function topics(value) {
 return new Set(words(value).filter(w=>w.length>=4&&!STOP.has(w)));
}
export function topicOverlap(reply,context) {
 const a=topics(context), b=topics(reply);
 if(!a.size) return 0;
 let n=0;
 for(const w of a) if(b.has(w)||[...b].some(q=>q.startsWith(w)&&q.length-w.length<=3||w.startsWith(q)&&w.length-q.length<=3))n++;
 return n/a.size;
}
export function evaluateReply({text,scene,interference='',persona='',previous=''}) {
 const reply=String(text||'').trim();
 const tokens=words(reply);
 const scenarioText=scene
  ? [scene.title,scene.public_assignment,scene.required_behavior].filter(Boolean).join(' ')
  : '';
 const sceneTerms=topics(scenarioText);
 let anchorHits=0;
 for(const w of sceneTerms) if(topics(reply).has(w)) anchorHits++;
 const sceneSignal=scenarioText
  ? Math.min(1,anchorHits/Math.min(3,Math.max(1,sceneTerms.size)))
  : 0;
 const interventionSignal=interference?Math.min(1,topicOverlap(reply,interference)*4):0;
 const previousSignal=previous?Math.min(1,topicOverlap(reply,previous)*4):0;
 const concrete=CONSEQUENCE.test(reply);
 const detail=SPECIFIC.test(reply)||/\b(?:\d+|first|second|three|every)\b/i.test(reply);
 const hasSentence= /[.!?]["'”’)]?\s*$/.test(reply);
 const meta=EMPTY_META.test(reply);
 const wordCount=tokens.length;
 const repetition=wordCount>0?new Set(tokens).size/wordCount:0;
 // Calibrated as a game-utility heuristic, not a "funny percentage".
 let score=(
  40*sceneSignal+
  14*interventionSignal+
  10*previousSignal+
  (concrete?18:0)+(detail?10:0)+(hasSentence?8:0)
 );
 if(wordCount<8) score-=15;
 if(wordCount>65) score-=15;
 if(meta) score-=25;
 if(repetition<0.49) score-=10;
 return {
  score:Math.round(Math.max(0,Math.min(100,score))),
  wordCount,
  sceneSignal:Math.round(sceneSignal*100)/100,
  interventionSignal:Math.round(interventionSignal*100)/100,
  previousSignal:Math.round(previousSignal*100)/100,
  concrete,detail,hasSentence,meta,
  flags:[
   ...(!sceneSignal&&scenarioText?['missing-scenario-anchor']:[]),
   ...(!concrete?['no-action-or-consequence']:[]),
   ...(!detail?['no-specific-detail']:[]),
   ...(meta?['game-or-model-meta']:[]),
   ...(wordCount<8?['very-short']:[]),
   ...(wordCount>65?['overly-long']:[])
  ]
 };
}
export function chooseNpcCard(hand,cardIndex,preset,scene) {
 if(!hand?.length) return null;
 const tags=(preset?.tags||[]).map(String);
 const sceneText=scene?[scene.public_assignment,scene.title,scene.required_behavior].filter(Boolean).join(' '):'';
 const scored=hand.map((id,i)=>{
  const instruction=String(cardIndex[id]?.instruction||'');
  const tagHits=tags.filter(t=>instruction.toLowerCase().includes(t.toLowerCase())).length;
  const relevant=sceneText?topicOverlap(instruction,sceneText):0;
  const action=CONSEQUENCE.test(instruction)?1:0;
  // Stable per-card/per-archetype tie-breaks avoid alphabetical uniformity.
  const salt=words((preset?.name||'')+' '+id).join('');
  const hash=[...salt].reduce((x,c)=>((x*31+c.charCodeAt(0))%997),0);
  return {id,i,score:tagHits*8+relevant*12+action*2+hash/997};
 });
 scored.sort((a,b)=>b.score-a.score||a.i-b.i);
 return scored[0].id;
}
export function rankNpcReplies(candidates,preset,scene,previous=''){
 const tags=(preset?.tags||[]).map(x=>String(x).toLowerCase());
 return candidates.map((entry,i)=>{
  const quality=evaluateReply({text:entry.text,scene,previous});
  const personality=tags.reduce((n,t)=>n+(String(entry.text||'').toLowerCase().includes(t)?8:0),0);
  // Relevance and actionable specificity outrank pure verbosity.
  return {...entry,heuristic:quality.score+personality,quality,index:i};
 }).sort((a,b)=>b.heuristic-a.heuristic||a.index-b.index);
}
export function handoffFromReply(lastText,preset) {
 const text=String(lastText||'').trim();
 const segments=text.match(/[^.!?]+[.!?]?/g)||[text];
 const focus=(segments.find(s=>words(s).length>=5)||segments[0]||'').trim().slice(0,82);
 const templates={
  'CHAOS.EXE':'Turn that detail into a public emergency. Announce one spectacular consequence and demand immediate action.',
  'COMPLIANCE BOT':'Introduce a mandatory filing requirement for that detail. Explain the official form and its absurd deadline.',
  'DRAMA UNIT':'Take that decision personally. Announce a theatrical resignation and an outrageously emotional new policy.',
  '404 FRIEND NOT FOUND':'Misread that detail as an invitation to a completely unrelated celebration and act with misplaced confidence.',
  'MAYHEM INTERN':'Declare that detail a groundbreaking pilot project and approve an ambitious, disastrous rollout.',
  'LITERAL MACHINE':'Take that phrase literally. Establish an unnecessarily precise procedure no sensible person would want.',
  'ERROR PRONE':'Praise that detail as brilliant. Expand its worst consequence into a proudly advertised public service.'
 };
 const base=templates[preset?.name]||
  'Act on that specific detail with an unexpected consequence. Be precise and strangely confident.';
 return {hook:focus,message:base};
}
