import { analyze, outputs } from './engine.mjs';
const cases=[
 ['new case','I need help filing a new case in Leon County.',f=>f.ticketType==='File New Case'&&f.county==='Leon'],
 ['role mention','My attorney told me I should call about a filing.',f=>!f.filerRole],
 ['not a name','This is Pro Se, and I need help filing an answer.',f=>!f.personName&&f.filerRole==='Self Represented Litigant'],
 ['name','My name is Jane Smith I am calling about a motion in my case.',f=>f.personName==='Jane Smith'],
 ['spoken phone','My case number is 2026DR001234. My phone number is eight one three five five five one two three four.',f=>f.phone==='(813) 555-1234'&&f.ucn==='2026DR001234'],
 ['no callback','Please do not call me at 813-555-0123. Email me at jane@example.com.',f=>f.callback==='Do not call'&&!outputs(f).summary.includes('requested call back')],
 ['rejection','My filing was rejected because the PDF was too large. How do I fix it?',f=>f.ticketType==='Filing Rejected'&&outputs(f).summary.includes('PDF was too large')],
 ['UCN not phone','The case number is 01202612345678901234.',f=>!f.phone&&f.ucn==='01202612345678901234'],
 ['response','I cannot find the option to file a response to a petition for child support and child custody.',f=>f.ticketType==='Help with Filing to Existing Case'&&f.caseType==='Child Support and Custody'],
 ['two phones','My phone is 850-555-0123 or 850-555-0199.',f=>!f.phone],
 ['callback not inferred','My phone is 850-555-0123.',f=>!f.callback&&!outputs(f).summary.includes('requested call back')],
 ['contracted attorney',"I'm an attorney.",f=>f.filerRole==='Attorney'],
 ['explicit attorney','I am an attorney. My Florida Bar number is 123456.',f=>f.filerRole==='Attorney'&&f.barNumber==='123456'],
 ['case question','What is the case number?',f=>!f.ucn],
 ['payment','My credit card was charged twice.',f=>f.ticketType==='Payment Help'],
 ['correction','My filing was returned for correction.',f=>f.ticketType==='Correction Queue'],
 ['service','I cannot add a recipient to the service list.',f=>f.ticketType==='Service List Help'],
 ['empty','',f=>Object.keys(f).length===0]
];
export function runTests(){return cases.map(([name,text,check])=>({name,pass:!!check(analyze(text).fields)}));}
