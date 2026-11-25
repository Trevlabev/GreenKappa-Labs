// Generic, deterministic intake analysis. No customer data persistence.
export const labels={personName:'Caller name',filerRole:'Filer role',phone:'Callback / contact phone',email:'Email',county:'County / court',caseType:'Case type',ucn:'Case # / UCN',barNumber:'Bar #',filingId:'Filing / submission #',racId:'Registration / RAC #',userId:'User ID',caseId:'Case ID',financialId:'Financial / EPTL ID',mailId:'Mail ID',ticketType:'Ticket type',issue:'Reported issue',callback:'Contact instruction'};
export const types=['General Portal Support','Help with Filing to Existing Case','File New Case','Password / Login Help','Account Lockout','Registration Help','Filing Rejected','Correction Queue','Payment Help','Document Upload Help','Service List Help','Technical Error','Filing Status'];
const counties='Alachua|Baker|Bay|Bradford|Brevard|Broward|Calhoun|Charlotte|Citrus|Clay|Collier|Columbia|DeSoto|Dixie|Duval|Escambia|Flagler|Franklin|Gadsden|Gilchrist|Glades|Gulf|Hamilton|Hardee|Hendry|Hernando|Highlands|Hillsborough|Holmes|Indian River|Jackson|Jefferson|Lafayette|Lake|Lee|Leon|Levy|Liberty|Madison|Manatee|Marion|Martin|Miami[- ]Dade|Monroe|Nassau|Okaloosa|Okeechobee|Orange|Osceola|Palm Beach|Pasco|Pinellas|Polk|Putnam|Santa Rosa|Sarasota|Seminole|St\.? Johns|St\.? Lucie|Sumter|Suwannee|Taylor|Union|Volusia|Wakulla|Walton|Washington|Dade';
const digits={zero:'0',oh:'0',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9'};
const uniq=a=>[...new Set(a.filter(Boolean))];
const cap=s=>s.replace(/\b[a-z]/gi,(m,i)=>i===0||/\s/.test(s[i-1])?m.toUpperCase():m);
const normPhone=s=>{let d=s.replace(/\D/g,'');if(d.length===11&&d[0]==='1')d=d.slice(1);return /^[2-9]\d{2}[2-9]\d{6}$/.test(d)?'('+d.slice(0,3)+') '+d.slice(3,6)+'-'+d.slice(6):'';};
const phonePattern=/(?<![\w])(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}(?![\w])/g;
function candidates(t,re){return [...t.matchAll(re)].map(m=>m[1]);}
export function analyze(raw){
 const t=String(raw||'').replace(/\s+/g,' ').trim(), f={}, warnings=[], evidence={};
 const pick=(key,values)=>{const a=uniq(values);if(a.length===1){f[key]=a[0];evidence[key]=a[0];}else if(a.length>1){warnings.push(labels[key]+': multiple candidates — '+a.join(' / '));}};
 if(!t)return {fields:f,warnings,evidence};
 const idPatterns={ucn:'(?:case\\s*(?:number|no\\.?|#)|ucn)',barNumber:'(?:florida\\s+bar|bar)\\s*(?:number|no\\.?|#|id)',filingId:'(?:filing|submission)\\s*(?:number|no\\.?|#|id)',racId:'(?:registration|rac)\\s*(?:number|no\\.?|#|id)',userId:'user\\s*id',caseId:'case\\s*id',financialId:'(?:financial|eptl)\\s*(?:id|number|#)',mailId:'mail\\s*id'};
 const excluded=[];
 for(const [key,p] of Object.entries(idPatterns)){
  const re=new RegExp('\\b'+p+'\\s*(?:is\\s*)?[:#]?\\s*([A-Z0-9][A-Z0-9-]{2,30})\\b','gi');
  const m=[...t.matchAll(re)].filter(x=>/\d/.test(x[1])&&(key!=='barNumber'||/^\d{3,8}$/.test(x[1])));
  pick(key,m.map(x=>x[1].toUpperCase()));for(const x of m)excluded.push([x.index,x.index+x[0].length]);
 }
 const ph=[...t.matchAll(phonePattern)].filter(x=>!excluded.some(([a,b])=>x.index<b&&x.index+x[0].length>a)).map(x=>normPhone(x[0]));
 const spoken=/\b(?:phone(?: number)?|call(?: me)?(?: back)?(?: at)?|number is)\s*(?:is\s*)?[:,-]?\s*((?:(?:zero|oh|one|two|three|four|five|six|seven|eight|nine|\d)[\s,.-]*){10,11})(?!\d)/gi;
 for(const m of t.matchAll(spoken)){const d=m[1].toLowerCase().match(/zero|oh|one|two|three|four|five|six|seven|eight|nine|\d/g)||[];ph.push(normPhone(d.map(x=>digits[x]??x).join('')));}
 pick('phone',ph);
 pick('email',candidates(t,/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi).map(x=>x.toLowerCase()));
 const spokenEmail=t.match(/\b(?:email(?: address)?(?: is)?|email me at)\s+([a-z0-9._%+-]+)\s+at\s+([a-z0-9-]+)\s+dot\s+(com|org|net|edu|gov)\b/i);
 if(spokenEmail&&!f.email){f.email=(spokenEmail[1]+'@'+spokenEmail[2]+'.'+spokenEmail[3]).toLowerCase();warnings.push('Email reconstructed from spoken words; verify spelling.');}
 const names=candidates(t,/\b(?:my name is|this is|name is)\s+([A-Za-z][A-Za-z'’-]+(?:[ \t]+[A-Za-z][A-Za-z'’-]+){1,3})/gi).map(n=>n.split(/\s+(?:and|calling|phone|number|from|I|I'm|I’m|with|here|about|trying|need|speaking)\b/i)[0].trim()).filter(n=>n.includes(' ')&&!/^(?:pro\s+(?:se|say)|self represented|an attorney|the attorney|my attorney|a lawyer)\b/i.test(n));
 pick('personName',names.map(cap));
 if(/\b(?:pro\s*(?:se|say)|self[- ]represented|representing myself|without an attorney)\b/i.test(t))f.filerRole='Self Represented Litigant';
 else if(/\b(?:I (?:am|'m|’m) (?:an? |the )?(?:attorney|lawyer|counsel)|I am counsel|my (?:Florida )?bar number|attorney here|speaking as (?:an? )?attorney)\b/i.test(t))f.filerRole='Attorney';
 const c=candidates(t,new RegExp('\\b('+counties+')\\s+county\\b','gi')).map(x=>/dade/i.test(x)?'Miami-Dade':cap(x.toLowerCase()));pick('county',c);
 const support=/\bchild support\b/i.test(t),custody=/\b(?:child custody|time[- ]sharing)\b/i.test(t);
 if(support&&custody)f.caseType='Child Support and Custody';else if(support)f.caseType='Child Support';else if(custody)f.caseType='Child Custody';else for(const [re,label] of [[/\bfamily\b/i,'Family'],[/\bcriminal\b/i,'Criminal'],[/\btraffic\b|\bcitation\b/i,'Traffic'],[/\bprobate\b/i,'Probate'],[/\beviction\b/i,'Eviction'],[/\bsmall claims\b/i,'Small Claims'],[/\bcivil\b/i,'Civil']])if(re.test(t)){f.caseType=label;break;}
 const rules=[
 ['Account Lockout',/\b(?:locked out|account (?:is )?locked|too many login attempts)\b/i],
 ['Password / Login Help',/\b(?:password|log[- ]?in|sign[- ]?in|cannot log in|can't log in)\b/i],
 ['Correction Queue',/\b(?:correction queue|returned for correction|pending correction|correct(?:ing)? a filing)\b/i],
 ['Filing Rejected',/\b(?:filing|submission|document)\b.{0,65}\b(?:rejected|denied|returned|not accepted)\b|\b(?:rejected|returned) (?:my |the )?filing\b/i],
 ['Payment Help',/\b(?:payment|credit card|debit card|filing fee|charged twice|refund|receipt)\b/i],
 ['Service List Help',/\b(?:service list|e[- ]?service|service email|service recipient)\b/i],
 ['Registration Help',/\b(?:register|registration|create an account|new account|activate my account)\b/i],
 ['File New Case',/\b(?:new case|initiate (?:a |the )?case|start (?:a |the )?case|new complaint|new petition)\b/i],
 ['Help with Filing to Existing Case',/\b(?:existing case|open case|pending case)\b|\b(?:response|answer|motion|evidence|objection|counterclaim|amended complaint)\b.{0,85}\b(?:petition|complaint|case|fil(?:e|ing))\b|\b(?:fil(?:e|ing)|submit|upload)\b.{0,85}\b(?:answer|response|motion|existing case)\b/i],
 ['Document Upload Help',/\b(?:upload|pdf|document type|file size|file too large|attachment)\b/i],
 ['Filing Status',/\b(?:status of (?:my |the )?filing|where is my filing|pending filing|filing status)\b/i],
 ['Technical Error',/\b(?:error|blank screen|not loading|website (?:is )?down|crash|timeout|timed out)\b/i]];
 const hits=rules.filter(([,re])=>re.test(t));f.ticketType=hits[0]?.[0]||types[0];
 if(hits.length>1)warnings.push('Possible related categories: '+hits.slice(1).map(x=>x[0]).join('; ')+'. Review the selected type.');
 const neg=/\b(?:do not|don't|dont|never|please not to)\s+call\b/i.test(t);
 const yes=/\b(?:call me back|please call me|return my call|give me a call|callback|call back)\b/i.test(t);
 if(neg){f.callback='Do not call';if(yes)warnings.push('Conflicting callback language — verify contact instruction.');}
 else if(yes)f.callback='Callback requested';
 else if(/\b(?:email me|contact me by email|send me an email)\b/i.test(t))f.callback='Email requested';
 const sentences=t.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)||[t];
 const issueRe=/\b(?:error|reject(?:ed|ion)?|returned|too large|file size|cannot|can't|can’t|unable|won't|doesn't|does not|not working|not loading|locked out|charged|missing|not see|not find|trying to|need help|having trouble|how (?:do|can)|where (?:do|can)|not accepted|correction queue|pending|failed|failure)\b/i;
 const details=sentences.map(s=>s.trim()).filter(s=>issueRe.test(s)&&!/\b(?:password is|verification code|social security number)\b/i.test(s));
 if(details.length){const specific=details.filter(s=>/\b(?:error|reject(?:ed|ion)?|returned|too large|file size|cannot|can't|can’t|unable|won't|doesn't|does not|not working|not loading|locked out|charged|missing|not see|not find|not accepted|failed)\b/i.test(s));f.issue=(specific.length?specific:details).slice(0,2).join(' ').slice(0,650);evidence.issue=f.issue;}
 if(!f.personName)warnings.push('Caller name not confidently detected.');
 if(!f.phone&&!f.email)warnings.push('No unambiguous contact information detected.');
 if(!f.issue)warnings.push('No specific problem sentence detected — add the issue manually.');
 return {fields:f,warnings,evidence};
}
export function outputs(f){
 const who=f.personName|| (f.filerRole==='Self Represented Litigant'?'Pro Se Litigant':f.filerRole||'Caller');
 const role=f.personName&&f.filerRole?' ('+(f.filerRole==='Self Represented Litigant'?'Pro Se Litigant':f.filerRole)+')':'';
 const type=f.ticketType||types[0], cp=f.caseType?f.caseType+' Case':'case';
 const desc={'Help with Filing to Existing Case':'requesting assistance filing to an existing '+cp,'File New Case':'requesting assistance filing a new '+cp,'Password / Login Help':'requesting login or password assistance','Account Lockout':'reporting an account lockout','Registration Help':'requesting registration assistance','Filing Rejected':'reporting a rejected filing','Correction Queue':'requesting correction queue assistance','Payment Help':'requesting payment assistance','Document Upload Help':'requesting document upload assistance','Service List Help':'requesting service list assistance','Technical Error':'reporting a technical issue','Filing Status':'requesting a filing status update'};
 let s=who+role+' called '+(desc[type]||'requesting Portal Support assistance')+(f.county?' in '+f.county+' County':'')+(f.ucn?', case number '+f.ucn:'')+'.';
 if(f.issue)s+=' Customer reported: “'+f.issue.replace(/[“”]/g,'"')+'”';
 for(const [k,l] of [['barNumber','Bar #'],['filingId','Filing #'],['racId','Registration #'],['userId','User ID'],['caseId','Case ID'],['financialId','Financial ID'],['mailId','Mail ID']])if(f[k])s+=' '+l+': '+f[k]+'.';
 if(f.callback==='Do not call')s+=' Customer requested not to be called.';
 else if(f.callback==='Callback requested')s+=' Customer requested call back'+(f.phone?' at phone number: '+f.phone:'')+'.';
 else if(f.phone)s+=' Phone provided: '+f.phone+'.';
 if(f.email)s+=' Email provided: '+f.email+'.';
 if(f.callback==='Email requested')s+=' Customer requested email contact.';
 const title=type+(f.caseType?' – '+f.caseType:'')+(f.county?' – '+f.county:'');
 return {title,summary:s};
}