const router=require('express').Router();
const {cds,entity,transaction}=require('../lib/db');
const {wrap,fail,label}=require('../lib/http');
const {requireRole}=require('../lib/auth');
const v=require('../lib/v2'),ops=require('../lib/operations');
const run=fn=>wrap(async(req,res)=>res.json(label(await transaction(async tx=>{await ops.enabled(tx);return fn(req,tx);})))) ;
const now=()=>new Date().toISOString();
router.get('/v2/dashboard',requireRole(),run(async(req,tx)=>{
  const permissions=await ops.permissions(tx,req.user),issues=await ops.issues(tx,req.user);
  const allTools=await ops.rows(tx,'Tool'),tools=allTools.filter(t=>permissions.unrestricted||permissions.workCenters.includes(t.workCenter));
  const assignments=(await ops.rows(tx,'TemporaryAssignment')).filter(a=>req.user.role==='Worker'?a.workerId===req.user.id:issues.some(i=>i.incidentId===a.incidentId));
  const counts={open:issues.filter(i=>i.status!=='Closed').length,new:issues.filter(i=>i.status==='Awaiting manager review').length,
    critical:issues.filter(i=>i.severity==='Critical'&&i.status!=='Closed').length,repairs:issues.filter(i=>i.status==='Repair in progress').length,
    review:issues.filter(i=>i.status==='Awaiting manager completion review').length,verification:issues.filter(i=>i.status==='Awaiting verification').length,
    restricted:tools.filter(t=>t.state!=='Active').length,exposed:issues.reduce((n,i)=>n+(i.exposure?.units||0),0),
    reassigned:assignments.filter(a=>a.status==='Active'&&Date.parse(a.endsAt)>Date.now()).length};
  const profiles=await ops.rows(tx,'WorkforceProfile'),assigned=new Set(assignments.filter(a=>a.status==='Active'&&Date.parse(a.endsAt)>Date.now()).map(a=>a.workerId));
  counts.idle=profiles.filter(w=>!assigned.has(w.workerId)&&w.available&&Date.parse(w.shiftEndsAt)>Date.now()&&tools.some(t=>t.toolId===w.homeToolId&&t.state!=='Active')).length;
  const eligible=new Set();
  if(permissions.canAssign)for(const tool of tools)for(const candidate of await v.eligible(tx,tool))if(candidate.eligible)eligible.add(candidate.userId);
  counts.availableTechnicians=eligible.size;
  const stations=(await ops.rows(tx,'WorkStation')).filter(s=>tools.some(t=>t.toolId===s.toolId));
  const demand=(await ops.rows(tx,'ProductionDemand')).filter(d=>stations.some(s=>s.stationId===d.stationId));
  counts.pendingDemand=demand.reduce((n,d)=>n+Math.max(0,d.requiredQuantity-d.completedQuantity),0);
  const profileDetail=await v.one(tx,'UserProfileDetail',{userId:req.user.id});
  return {role:req.user.role,permissions,profileDetail,counts,issues:issues.slice(0,100),tools,assignments,
    estimation:{basis:'Stored temporary assignments; estimates, not measured production',units:assignments.filter(a=>a.status==='Active').reduce((n,a)=>n+a.estimatedOutput,0)},demand};
}));
router.get('/v2/issues',requireRole(),run(async(req,tx)=>{
  const issues=await ops.issues(tx,req.user,req.query);
  const offset=Number(req.query.offset||0),limit=Number(req.query.limit||50);
  if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>200)fail(400,'INVALID_FILTER','Use a nonnegative offset and limit from 1 to 200');
  return {issues:issues.slice(offset,offset+limit),total:issues.length,offset,limit};
}));
router.get('/v2/issues/:id',requireRole(),run((req,tx)=>ops.detail(tx,req.user,req.params.id)));
router.get('/v2/notifications',requireRole(),run(async(req,tx)=>{
  const reads=new Set((await ops.rows(tx,'NotificationRead',{userId:req.user.id})).map(n=>n.notificationId));
  const all=(await ops.rows(tx,'UserNotification',{userId:req.user.id})).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  return {unread:all.filter(n=>!reads.has(n.notificationId)).length,notifications:all.slice(0,100).map(n=>({...n,read:reads.has(n.notificationId),href:n.incidentId?`/issues/${encodeURIComponent(n.incidentId)}`:'/dashboard'}))};
}));
router.post('/v2/notifications/:id/read',requireRole(),run(async(req,tx)=>{
  v.keys(req.body,[]);
  const n=await v.one(tx,'UserNotification',{notificationId:req.params.id},true);
  if(!n||n.userId!==req.user.id)fail(404,'NOTIFICATION_NOT_FOUND','Notification not found');
  const existing=await v.one(tx,'NotificationRead',{notificationId:n.notificationId});
  if(!existing){await tx.run(cds.ql.INSERT.into(entity('NotificationRead')).entries({notificationId:n.notificationId,userId:req.user.id,readAt:now()}));await v.event(tx,req.user,'NOTIFICATION_READ','User acknowledged notification',{notificationId:n.notificationId},{incidentId:n.incidentId});}
  return {read:true,reused:!!existing};
}));
router.put('/v2/authorizations/:userId',requireRole('Administrator'),run(async(req,tx)=>{
  v.keys(req.body,['workCenters','canAssign','canVerify','expiresAt','reason']);
  const reason=v.text(req.body.reason,'reason',2000),profile=await v.one(tx,'UserProfile',{userId:req.params.userId},true);
  if(!profile||!['Manager','Verifier'].includes(profile.role))fail(400,'INVALID_PROFILE','Only onboarded managers and verifiers can receive operational scope');
  if(req.user.id===profile.userId)fail(403,'SELF_AUTHORIZATION','An independent administrator must approve operational capabilities');
  const centers=req.body.workCenters,known=new Set((await ops.rows(tx,'Tool')).map(t=>t.workCenter));
  if(!Array.isArray(centers)||!centers.length||centers.length>20||centers.some(c=>!known.has(c)))fail(400,'INVALID_WORK_CENTER','Select existing equipment work centers');
  if(typeof req.body.canAssign!=='boolean'||typeof req.body.canVerify!=='boolean'||!(Date.parse(req.body.expiresAt)>Date.now()))fail(400,'INVALID_INPUT','Explicit capabilities and a future expiry are required');
  if(profile.role!=='Verifier'&&req.body.canVerify)fail(400,'INVALID_CAPABILITY','Independent verification requires the Verifier identity role');
  const grant={userId:profile.userId,workCenters:JSON.stringify([...new Set(centers)]),canAssign:req.body.canAssign,canVerify:req.body.canVerify,expiresAt:new Date(req.body.expiresAt).toISOString(),approvedBy:req.user.id,updatedAt:now()};
  await tx.run(cds.ql.UPSERT.into(entity('UserAuthorization')).entries(grant));await v.event(tx,req.user,'OPERATIONAL_AUTHORIZATION_APPROVED',reason,grant);
  return {authorization:grant};
}));
router.put('/v2/profile',requireRole(),run(async(req,tx)=>{
  v.keys(req.body,['displayName','language']);
  const profile=await v.one(tx,'UserProfile',{userId:req.user.id},true);
  if(!profile)fail(404,'PROFILE_NOT_FOUND','Complete registration first');
  if(!['en','kn','hi'].includes(req.body.language))fail(400,'INVALID_INPUT','Unsupported language');
  const update={displayName:v.text(req.body.displayName,'displayName'),language:req.body.language};
  await tx.run(cds.ql.UPDATE(entity('UserProfile')).set(update).where({userId:req.user.id}));
  const detail=await v.one(tx,'UserProfileDetail',{userId:req.user.id})||{userId:req.user.id};
  await tx.run(cds.ql.UPSERT.into(entity('UserProfileDetail')).entries({...detail,updatedAt:now()}));
  await v.event(tx,req.user,'PROFILE_UPDATED','User updated display preferences',update);
  return {profile:{...profile,...update}};
}));
router.post('/v2/incidents/:id/triage',requireRole('Manager'),run(async(req,tx)=>{
  v.keys(req.body,['severity','urgency','shift','reason','version','escalate']);
  const incident=await v.access(tx,req.user,req.params.id),reason=v.text(req.body.reason,'reason',2000);
  await v.one(tx,'Incident',{incidentId:incident.incidentId},true);
  if(incident.state!=='Confirmed')fail(409,'INVALID_STATE','Triage requires a confirmed open report');
  const old=await v.one(tx,'IssueOperation',{incidentId:incident.incidentId},true);
  if(req.body.version!==(old?.version||0))fail(409,'STALE_REVIEW','Refresh this issue before reviewing it');
  if(!['Low','Medium','High','Critical'].includes(req.body.severity)||!['Normal','Urgent','Immediate'].includes(req.body.urgency)||typeof req.body.escalate!=='boolean')fail(400,'INVALID_INPUT','Select explicit severity, urgency and escalation');
  const operation={incidentId:incident.incidentId,severity:req.body.severity,urgency:req.body.urgency,shift:v.text(req.body.shift,'shift'),reviewedBy:req.user.id,reviewedAt:now(),assignmentEscalated:req.body.escalate,version:(old?.version||0)+1,updatedAt:now()};
  await tx.run(cds.ql.UPSERT.into(entity('IssueOperation')).entries(operation));
  await v.event(tx,req.user,'INCIDENT_TRIAGED',reason,operation,incident);
  await v.notify(tx,incident.reporterId,incident.incidentId,'Manager reviewed your report');
  if(operation.assignmentEscalated)await ops.notifyReviewers(tx,incident,'Assignment escalation requires an authorized assigner','Verifier');
  return {operation};
}));
module.exports={mount:'/api',router,owner:'platform'};
