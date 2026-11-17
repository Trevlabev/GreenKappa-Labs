import {blankWorkspace,createCase,completeTask,addException,addDays,dateKey} from "./core.mjs";
export function demoWorkspace(at=new Date()){
 const now=at instanceof Date?at:new Date(at),today=dateKey(now);let s=blankWorkspace();
 const intake=(title,profileId,ago,priority,team,summary)=>{
  s=createCase(s,{title,profileId,receivedDate:addDays(today,-ago),priority,team,summary},now);return s.cases[0].id;
 };
 const progress=(id,count)=>{
  for(let i=0;i<count;i++){
   const c=s.cases.find(x=>x.id===id),t=c.tasks.find(x=>!x.doneAt&&x.dependsOn.every(dep=>c.tasks.find(y=>y.id===dep)?.doneAt));
   if(!t)break;s=completeTask(s,id,t.id,now);
  }
 };
 progress(intake("Sample A · Petition intake","petition",1,"Routine","Intake","Synthetic packet; no personal information."),1);
 const b=intake("Sample B · Missing material","compliance",10,"Elevated","Review","Demonstration exception.");
 progress(b,2);s=addException(s,b,"Illustrative attachment checklist discrepancy",now);
 progress(intake("Sample C · Administrative request","records",3,"Routine","Operations","Synthetic records request."),2);
 progress(intake("Sample D · Completed intake","petition",16,"Routine","Intake","Closed sample for audit history."),5);
 progress(intake("Sample E · Escalation","compliance",7,"Urgent","Supervisor","Synthetic overdue work."),1);
 return s;
}
