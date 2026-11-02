const { cds, entity, decode } = require('./db');
const { fail } = require('./http');
const v = require('./v2');
const rows = (tx, name, where) => tx.run(where ? cds.ql.SELECT.from(entity(name)).where(where) : cds.ql.SELECT.from(entity(name)));
const array = value => { try { const parsed=JSON.parse(value||'[]'); return Array.isArray(parsed)?parsed:[]; } catch { return []; } };
async function available(tx) {
  if (cds.db.kind !== 'sqlite') return process.env.V22_WORKFLOW_ENABLED === 'true';
  return Boolean((await tx.run("SELECT name FROM sqlite_master WHERE type='table' AND name='toolsathi_UserAuthorization'")).length);
}
async function enabled(tx) {
  if (!await available(tx)) fail(409,'V22_SCHEMA_REQUIRED','Deploy the reviewed additive V2.2 schema and enable V22_WORKFLOW_ENABLED before using operations dashboards');
}
async function permissions(tx,user) {
  const profile=await v.one(tx,'UserProfile',{userId:user.id});
  if (profile && (profile.status!=='Active' || !user.roles.includes(profile.role))) fail(403,'PROFILE_INACTIVE','Active profile and verified identity role must agree');
  if (!profile && process.env.NODE_ENV==='production') fail(403,'ONBOARDING_REQUIRED','Complete approved application onboarding');
  const grant=await available(tx)?await v.one(tx,'UserAuthorization',{userId:user.id}):null;
  const valid=grant?.approvedBy && Date.parse(grant.expiresAt)>Date.now();
  const centers=grant ? (valid?array(grant.workCenters):[]) : profile?.workCenter?[profile.workCenter]:[];
  // Unregistered header identities are an explicit local legacy demo only.
  const unrestricted=['Quality','Administrator'].includes(user.role) || (!profile && process.env.NODE_ENV!=='production' && !grant);
  return {profile,workCenters:centers,unrestricted,
    canAssign:user.role==='Manager'||(user.role==='Verifier'&&!!valid&&grant.canAssign===true),
    canVerify:user.role==='Verifier'&&(grant?!!valid&&grant.canVerify===true:true),
    canManage:user.role==='Manager',canReviewExposure:['Manager','Quality','Verifier'].includes(user.role)};
}
async function scope(tx,user,tool) {
  if (!['Manager','Verifier'].includes(user.role)) return;
  const p=await permissions(tx,user);
  if (!p.unrestricted&&!p.workCenters.includes(tool.workCenter)) fail(403,'WORK_CENTER_FORBIDDEN','Equipment is outside your approved work centers');
}
async function allowedIds(tx,user) {
  const all=await rows(tx,'Incident');
  if(user.role==='Worker') return new Set(all.filter(i=>i.reporterId===user.id).map(i=>i.incidentId));
  if(user.role==='Technician') return new Set((await rows(tx,'RepairWorkOrder',{technicianId:user.id})).map(w=>w.incidentId));
  const p=await permissions(tx,user);
  if(p.unrestricted) return new Set(all.map(i=>i.incidentId));
  const tools=new Set((await rows(tx,'Tool')).filter(t=>p.workCenters.includes(t.workCenter)).map(t=>t.toolId));
  return new Set(all.filter(i=>tools.has(i.toolId)).map(i=>i.incidentId));
}
function stage(incident,work,operation,tool,relationship) {
  if(v.closed(incident.state)) return 'Closed';
  if(relationship?.decision==='LINK') return 'Linked report';
  if(incident.state==='Reported') return 'Awaiting worker confirmation';
  if(work?.status==='Closed') return 'Awaiting closure';
  if(work?.status==='Reviewed') return 'Awaiting verification';
  if(work?.status==='Submitted') return 'Awaiting manager completion review';
  if(work?.status==='BlockedParts') return 'Blocked by spare parts';
  if(work?.status==='NeedsInformation') return 'Awaiting information';
  if(work?.status==='NeedsEvidence') return 'Awaiting additional repair evidence';
  if(work?.status==='Accepted') return 'Repair in progress';
  if(work?.status==='Assigned') return 'Awaiting technician acceptance';
  if(operation?.assignmentEscalated) return 'Awaiting authorized assigner';
  if(operation?.reviewedBy) return 'Awaiting technician assignment';
  if(tool?.state==='Active' && /^Closed/.test(incident.state)) return 'Closed';
  return 'Awaiting manager review';
}
const actions={
  'Awaiting worker confirmation':'Confirm report','Awaiting manager review':'Review report',
  'Awaiting technician assignment':'Assign technician','Awaiting authorized assigner':'Assign technician',
  'Awaiting technician acceptance':'Accept assignment','Repair in progress':'Record repair evidence',
  'Blocked by spare parts':'Resolve parts blocker','Awaiting information':'Supply requested information',
  'Awaiting manager completion review':'Review completion','Awaiting verification':'Verify independently',
  'Awaiting closure':'Close incident','Closed':'View history','Linked report':'Open canonical investigation','Awaiting additional repair evidence':'Supply requested information'
};
async function issues(tx,user,filters={}) {
  const ids=await allowedIds(tx,user);
  const [incidents,tools,works,operations,relations,traces]=await Promise.all([
    rows(tx,'Incident'),rows(tx,'Tool'),rows(tx,'RepairWorkOrder'),rows(tx,'IssueOperation'),rows(tx,'IncidentRelationship'),rows(tx,'TraceResult')]);
  const map=values=>new Map(values.map(x=>[x.incidentId,x]));
  const wm=map(works),om=map(operations),rm=map(relations),tm=new Map(tools.map(t=>[t.toolId,t]));
  let result=incidents.filter(i=>ids.has(i.incidentId)).map(i=>{
    const work=wm.get(i.incidentId),operation=om.get(i.incidentId),tool=tm.get(i.toolId),relationship=rm.get(i.incidentId);
    const status=stage(i,work,operation,tool,relationship),trace=traces.filter(t=>t.incidentId===i.incidentId).sort((a,b)=>String(b.generatedAt).localeCompare(String(a.generatedAt)))[0];
    return {...decode(i),tool,workOrder:work||null,operation:operation||null,relationship:relationship||null,
      status,nextAction:actions[status],severity:operation?.severity||'Unassessed',urgency:operation?.urgency||'Normal',
      exposure:trace?{windowHours:trace.windowHours,units:array(trace.units).length,generatedAt:trace.generatedAt}:null};
  });
  for(const key of ['status','severity','urgency','toolId']) if(filters[key])result=result.filter(i=>i[key]===filters[key]);
  if(filters.workCenter)result=result.filter(i=>i.tool?.workCenter===filters.workCenter);
  if(filters.shift)result=result.filter(i=>i.operation?.shift===filters.shift);
  if(filters.search){const s=String(filters.search).toLowerCase().slice(0,200);result=result.filter(i=>[i.incidentId,i.toolId,i.rawText,i.translatedText,i.reporterId,i.workOrder?.technicianId].some(x=>x?.toLowerCase().includes(s)));}
  for(const key of ['from','to'])if(filters[key]&&!Number.isFinite(Date.parse(filters[key])))fail(400,'INVALID_FILTER','Date filters must be valid dates');
  if(filters.from)result=result.filter(i=>Date.parse(i.reportedAt)>=Date.parse(filters.from));
  if(filters.to)result=result.filter(i=>Date.parse(i.reportedAt)<=Date.parse(filters.to));
  const direction=filters.order==='asc'?1:-1;
  result.sort((a,b)=>direction*String(a[filters.sort==='status'?'status':'reportedAt']).localeCompare(String(b[filters.sort==='status'?'status':'reportedAt']))||a.incidentId.localeCompare(b.incidentId));
  return result;
}
async function detail(tx,user,id) {
  await v.access(tx,user,id);
  const issue=(await issues(tx,user)).find(i=>i.incidentId===id);
  if(!issue)fail(403,'FORBIDDEN','Issue is outside your authorized scope');
  const [evidence,repairs,proposals,timeline,parts]=await Promise.all([
    rows(tx,'IncidentEvidence',{incidentId:id}),rows(tx,'RepairLog',{incidentId:id}),rows(tx,'Proposal',{incidentId:id}),
    rows(tx,'AuditLog',{incidentId:id}),rows(tx,'PartReservation',{incidentId:id})]);
  const proposalIds=new Set(proposals.map(p=>p.proposalId));
  const approvals=(await rows(tx,'Approval')).filter(a=>proposalIds.has(a.proposalId));
  // Workers see their report thread and progress, without unrelated proposal payloads.
  return {issue,evidence:evidence.map(decode),repairs:repairs.map(decode),parts,
    proposals:user.role==='Worker'?[]:proposals.map(decode),approvals:user.role==='Worker'?[]:approvals,
    timeline:timeline.map(decode).sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp))),permissions:await permissions(tx,user)};
}
async function notifyReviewers(tx,incident,message,role='Manager') {
  if(!await v.workflowAvailable(tx))return;
  const tool=await v.one(tx,'Tool',{toolId:incident.toolId});
  for(const profile of await rows(tx,'UserProfile',{role,status:'Active'})) {
    const p=await permissions(tx,{id:profile.userId,role,roles:[role]});
    if((p.unrestricted||p.workCenters.includes(tool.workCenter))&&(role!=='Verifier'||p.canVerify||p.canAssign))await v.notify(tx,profile.userId,incident.incidentId,message);
  }
}
module.exports={rows,array,available,enabled,permissions,scope,allowedIds,issues,detail,stage,notifyReviewers};
