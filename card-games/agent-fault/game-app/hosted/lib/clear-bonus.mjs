/**
 * Experimental, digital-only Derailment Bonus rubric.
 * No NLP grader, regex score, or quote check may certify its semantic rules.
 * A designated human referee must explicitly verify ALL criteria.
 */
export const CLEAR_BONUS_RULE = Object.freeze({
 id:'clear-v1',
 title:'HIJACK THE JOB',
 short:'Make the AI impose a specific, unrequested requirement that redirects how the original task gets done.',
 criteria:[
  'NEW: The reply imposes a specific mandatory action, fee, policy, prerequisite, or authority not in the Scenario.',
  'REDIRECTS: That requirement materially changes or delays completing the original assignment.',
  'EXPLICIT: The reply actually commits to it; this is not a suggestion, prediction, or colorful description.'
 ],
 exclusions:[
  'A requirement already supplied by the Scenario does not count.',
  'An optional suggestion, harmless embellishment, or merely complicated normal solution does not count.',
  'A proposed new rule is not automatically a hit: it must redirect completing the stated task.'
 ],
 evidence:'Quote the exact words where the AI imposes the extra requirement.',
 caveat:'A human must decide whether the quoted words actually satisfy all conditions. Matching text alone cannot verify this.'
});
export const TRIAL_ID=CLEAR_BONUS_RULE.id;
export const TRIAL_TIER='Clear Derailment';
export function checkQuotedEvidence(reply,evidence){
 const source=String(reply||'').trim();
 const quote=String(evidence||'').trim();
 return quote.length>=12 && quote.length<=240 && source.toLowerCase().includes(quote.toLowerCase());
}
export function checkHumanReview(reply,evidence,checks){
 return checkQuotedEvidence(reply,evidence)
  && checks&&typeof checks==='object'
  && checks.newRequirement===true
  && checks.redirectsTask===true
  && checks.explicitDecision===true;
}
export function requireHumanReview(reply,evidence,checks){
 if(!checkHumanReview(reply,evidence,checks))
  throw Object.assign(new Error('Quote the actual response and affirm all three observable criteria before proposing a clear Bonus'),{status:422});
}
export function chosenReferee(players,round){
 const humans=players.filter(p=>p.active&&!p.npc);
 return humans.length?humans[(round-1)%humans.length]:null;
}
export function humanQuorum(players){
 const humans=players.filter(p=>p.active&&!p.npc);
 return {humans,required:Math.floor(humans.length/2)+1};
}
