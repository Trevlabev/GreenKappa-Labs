import {normalizeProject} from "./core.mjs";
export const DEMO = normalizeProject({
 schemaVersion:1,
 name:"Public Service Request · Synthetic Workflow",
 description:"Fictional intake and approval process for exploring dependency impact. Contains a documentation gap and an intentional review loop.",
 nodes:[
  {id:"request-form",label:"Service request form",type:"trigger",system:"Public portal",owner:"Intake team",documentation:"OPS-INTAKE-01",description:"Collects a citizen service request and a unique submission identifier.",x:90,y:260},
  {id:"validation",label:"Validate submission",type:"automation",system:"Power Automate",owner:"Automation team",documentation:"FLOW-VALIDATE-v3",description:"Checks required fields and standardizes the service category.",x:345,y:260},
  {id:"case-list",label:"Service case list",type:"data",system:"SharePoint",owner:"Records team",documentation:"LIST-CASE-SCHEMA",description:"Stores status, due date, owner and submission metadata.",x:605,y:260},
  {id:"approval",label:"Supervisor review",type:"approval",system:"Power Automate",owner:"Operations",documentation:"PROC-APPROVAL-02",description:"Human approval before case routing; may return a case for correction.",x:880,y:250},
  {id:"notification",label:"Status notification",type:"notification",system:"Exchange",owner:"Operations",documentation:"MAIL-TEMPLATE-05",description:"Sends the requester an update when the case changes state.",x:1145,y:130},
  {id:"sla",label:"SLA monitoring",type:"automation",system:"Scheduled flow",owner:"Support desk",documentation:"FLOW-SLA-v1",description:"Compares case age to target and flags overdue work.",x:875,y:490},
  {id:"dashboard",label:"Operations dashboard",type:"report",system:"Power BI",owner:"Reporting",documentation:"PBI-OPERATIONS",description:"Reports submission trends, backlog and SLA compliance.",x:1140,y:490},
  {id:"audit-log",label:"Audit history",type:"data",system:"Dataverse",owner:"Compliance",documentation:"",description:"Tracks decision events and changes; documentation intentionally missing for demo.",x:1140,y:315},
  {id:"archive",label:"Retention archive",type:"external",system:"Records archive",owner:"Information management",documentation:"RETENTION-7Y",description:"Receives closed cases for long-term records handling.",x:1390,y:390}
 ],
 edges:[
  {id:"e1",from:"request-form",to:"validation",label:"submitted data"},
  {id:"e2",from:"validation",to:"case-list",label:"validated record"},
  {id:"e3",from:"case-list",to:"approval",label:"case for review"},
  {id:"e4",from:"approval",to:"validation",label:"request correction"},
  {id:"e5",from:"approval",to:"notification",label:"approved status"},
  {id:"e6",from:"approval",to:"audit-log",label:"decision trail"},
  {id:"e7",from:"case-list",to:"sla",label:"case age"},
  {id:"e8",from:"sla",to:"dashboard",label:"SLA metrics"},
  {id:"e9",from:"case-list",to:"dashboard",label:"case data"},
  {id:"e10",from:"case-list",to:"archive",label:"case closure"}
 ]
});
