const {createHash}=require('node:crypto');
const {cds,entity}=require('./db'),{fail}=require('./http'),{uuid}=require('./ids');
const v=require('./v2'),ops=require('./operations'),workforce=require('./workforce');
const at=()=>new Date().toISOString();
function stable(value){if(Array.isArray(value))return value.map(stable).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
const fingerprint=data=>createHash('sha256').update(JSON.stringify(stable(data))).digest('hex');
async function authority(tx,user,id){await v.access(tx,user,id);if(user.role!=='Manager')fail(403,'FORBIDDEN','A manager must authorize workforce allocation');return ops.permissions(tx,user);}
async function lockScope(tx,id,workers,stations){
  await v.one(tx,'Incident',{incidentId:id},true);
  for(const workerId of [...new Set(workers)].sort())await v.one(tx,'WorkforceProfile',{workerId},true);
  for(const stationId of [...new Set(stations)].sort())await v.one(tx,'WorkStation',{stationId},true);
  // Demand and equipment rows are locked before recalculation, in a stable order.
  const incident=await v.one(tx,'Incident',{incidentId:id});
  const allStations=(await ops.rows(tx,'WorkStation')).filter(s=>stations.includes(s.stationId));
  for(const toolId of [...new Set([incident.toolId,...allStations.map(s=>s.toolId)])].sort())await v.one(tx,'Tool',{toolId},true);
  for(const demand of (await ops.rows(tx,'ProductionDemand')).filter(d=>stations.includes(d.stationId)).sort((a,b)=>a.orderId.localeCompare(b.orderId)))await v.one(tx,'ProductionDemand',{orderId:demand.orderId},true);
}
async function persist(tx,user,id,sourceTool,candidate,reason,{mode='Manual',planId=null,policyId=null}={}){
  const timestamp=at(),assignment={assignmentId:uuid('WA'),workerId:candidate.workerId,incidentId:id,sourceToolId:sourceTool.toolId,stationId:candidate.stationId,startsAt:timestamp,endsAt:candidate.endsAt,status:'Active',estimatedOutput:candidate.estimatedImprovement,assumptions:JSON.stringify(candidate.assumptions),approvedBy:user.id,approvedAt:timestamp};
  await tx.run(cds.ql.INSERT.into(entity('TemporaryAssignment')).entries(assignment));
  const detail={assignmentId:assignment.assignmentId,mode,planId,policyId,decision:'Assigned',decidedAt:timestamp,decidedBy:user.id};
  if(await ops.available(tx))await tx.run(cds.ql.INSERT.into(entity('AssignmentDetail')).entries(detail));
  await v.event(tx,user,'WORKFORCE_REASSIGNED',reason,{assignment,candidate,mode,planId,policyId},{incidentId:id,toolId:sourceTool.toolId});
  await v.notify(tx,assignment.workerId,id,`${mode} temporary assignment to ${candidate.stationId}; review and acknowledge`);
  return {...assignment,detail};
}
async function manual(tx,user,id,body){
  v.keys(body,['workerId','stationId','minutes','reason']);
  const p=await authority(tx,user,id),workerId=v.text(body.workerId,'workerId'),stationId=v.text(body.stationId,'stationId'),reason=v.text(body.reason,'reason',1000);
  await lockScope(tx,id,[workerId],[stationId]);
  const existing=(await ops.rows(tx,'TemporaryAssignment',{workerId,status:'Active'})).find(a=>a.incidentId===id&&a.stationId===stationId&&Date.parse(a.endsAt)>Date.now());
  if(existing)return {assignment:existing,reused:true};
  const result=await workforce.recommend(tx,id,body.minutes??120,{centers:p.unrestricted?null:p.workCenters});
  const candidate=result.recommendations.find(c=>c.workerId===workerId&&c.stationId===stationId);
  if(!candidate)fail(409,'INELIGIBLE_REASSIGNMENT','Qualifications, demand, shift, work-center authority or capacity no longer permit assignment');
  return {assignment:await persist(tx,user,id,result.sourceTool,candidate,reason)};
}
async function policy(tx,user,policyId,data,{lock=false}={}){
  const record=await v.one(tx,'AllocationPolicy',{policyId},lock);
  if(!record||!record.enabled||!(Date.parse(record.expiresAt)>Date.now()))fail(409,'AUTOMATION_NOT_AUTHORIZED','A current enabled bounded automation policy is required');
  if(!ops.array(record.sourceToolIds).includes(data.incident.toolId))fail(403,'POLICY_SCOPE','Source equipment is outside the approved policy');
  const approver={id:record.approvedBy,role:record.approvedRole,roles:[record.approvedRole]};
  if(!['Manager','Administrator'].includes(approver.role))fail(403,'POLICY_AUTHORITY','Policy approval authority is invalid');
  const permission=await ops.permissions(tx,approver);
  const destinations=data.WorkStation.filter(s=>ops.array(record.destinationStationIds).includes(s.stationId));
  const source=data.Tool.find(t=>t.toolId===data.incident.toolId);
  if(!permission.unrestricted&&(!permission.workCenters.includes(source.workCenter)||destinations.some(s=>!permission.workCenters.includes(s.workCenter))))fail(403,'POLICY_AUTHORITY','Policy approver no longer has the required work-center scope');
  const linked=new Set((await ops.rows(tx,'AssignmentDetail',{policyId})).map(a=>a.assignmentId));
  const current=(await ops.rows(tx,'TemporaryAssignment')).filter(a=>linked.has(a.assignmentId)&&a.status==='Active'&&Date.parse(a.endsAt)>Date.now());
  return {...record,remainingWorkers:record.maxWorkers-current.length,remainingEstimatedUnits:record.maxEstimatedUnits-current.reduce((n,a)=>n+a.estimatedOutput,0)};
}
async function preview(tx,user,id,body){
  v.keys(body,['minutes','policyId','automatic']);
  const p=await authority(tx,user,id),minutes=body.minutes??120,data=await workforce.load(tx,id);
  if(body.automatic!==undefined&&typeof body.automatic!=='boolean')fail(400,'INVALID_INPUT','automatic must be explicit true or false');
  if(body.automatic&&!body.policyId)fail(409,'AUTOMATION_NOT_AUTHORIZED','Automatic execution requires a named approved policy; preview needs manager confirmation');
  const approved=body.policyId?await policy(tx,user,v.text(body.policyId,'policyId'),data):null;
  if(approved&&minutes>approved.maxMinutes)fail(409,'POLICY_LIMIT','Duration exceeds the policy');
  if(approved&&approved.remainingWorkers<=0)fail(409,'POLICY_LIMIT','Policy concurrent worker limit is reached');
  const snapshot=workforce.optimize(data,minutes,{centers:p.unrestricted?null:p.workCenters,...(approved?{stationIds:ops.array(approved.destinationStationIds),maxWorkers:approved.remainingWorkers}:{})});
  if(approved&&snapshot.totalEstimatedUnits>approved.remainingEstimatedUnits)fail(409,'POLICY_LIMIT','Estimated output exceeds the bounded policy; request manager review');
  const plan={planId:uuid('ALLOC'),incidentId:id,createdBy:user.id,createdAt:at(),expiresAt:new Date(Date.now()+300000).toISOString(),minutes,status:'Preview',snapshot:JSON.stringify(snapshot),fingerprint:fingerprint(data),policyId:approved?.policyId||null};
  await tx.run(cds.ql.INSERT.into(entity('AllocationPlan')).entries(plan));
  await v.event(tx,user,'ALLOCATION_PREVIEWED','Deterministic allocation preview; no execution authority from AI',{planId:plan.planId,workers:snapshot.assignments.length,estimatedUnits:snapshot.totalEstimatedUnits,policyId:plan.policyId},data.incident);
  if(body.automatic)return execute(tx,user,plan.planId,{automatic:true,reason:'Automatic execution under bounded manager-approved policy'});
  return {plan:{...plan,snapshot},confirmationRequired:true,executed:false};
}
async function execute(tx,user,planId,body){
  v.keys(body,['confirmed','reason','automatic']);
  const plan=await v.one(tx,'AllocationPlan',{planId},true);
  if(!plan)fail(404,'PLAN_NOT_FOUND','Allocation plan not found');
  const p=await authority(tx,user,plan.incidentId);
  if(plan.createdBy!==user.id)fail(403,'PLAN_OWNER','Only the previewing manager can execute this plan');
  if(plan.status==='Executed'){
    const ids=new Set((await ops.rows(tx,'AssignmentDetail',{planId})).map(d=>d.assignmentId));
    return {plan:{...plan,snapshot:JSON.parse(plan.snapshot)},executed:true,reused:true,assignments:(await ops.rows(tx,'TemporaryAssignment')).filter(a=>ids.has(a.assignmentId))};
  }
  if(plan.status!=='Preview'||Date.parse(plan.expiresAt)<=Date.now())fail(409,'STALE_PLAN','Preview expired; recompute the allocation');
  const snapshot=JSON.parse(plan.snapshot),reason=v.text(body.reason,'reason',1000);
  if(!snapshot.assignments.length)fail(409,'NO_FEASIBLE_ALLOCATION','No eligible assignments are available');
  await lockScope(tx,plan.incidentId,snapshot.assignments.map(a=>a.workerId),snapshot.assignments.map(a=>a.stationId));
  let data=await workforce.load(tx,plan.incidentId);
  if(fingerprint(data)!==plan.fingerprint)fail(409,'STALE_PLAN','Equipment, staffing or demand changed; refresh the preview');
  if(body.automatic===true){
    if(!plan.policyId)fail(409,'AUTOMATION_NOT_AUTHORIZED','Automatic execution needs an approved policy');
    const approved=await policy(tx,user,plan.policyId,data,{lock:true});
    if(plan.minutes>approved.maxMinutes||snapshot.assignments.length>approved.remainingWorkers||snapshot.totalEstimatedUnits>approved.remainingEstimatedUnits||snapshot.assignments.some(a=>!ops.array(approved.destinationStationIds).includes(a.stationId)))fail(409,'POLICY_LIMIT','Plan no longer meets the approved policy');
  }else if(body.confirmed!==true)fail(403,'MANAGER_CONFIRMATION_REQUIRED','Explicit manager confirmation is required');
  const assignments=[];
  for(const proposed of snapshot.assignments){
    data=await workforce.load(tx,plan.incidentId);
    const result=workforce.evaluate(data,plan.minutes,{centers:p.unrestricted?null:p.workCenters});
    const candidate=result.recommendations.find(c=>c.workerId===proposed.workerId&&c.stationId===proposed.stationId);
    if(!candidate||candidate.estimatedImprovement<proposed.estimatedImprovement)fail(409,'STALE_PLAN','A worker, destination or shift no longer supports the exact reviewed allocation');
    // The execution records the reviewed amount, never a larger unreviewed estimate.
    candidate.estimatedImprovement=proposed.estimatedImprovement;candidate.expectedReassignedOutput=proposed.expectedReassignedOutput;
    assignments.push(await persist(tx,user,plan.incidentId,result.sourceTool,candidate,reason,{mode:'Automatic',planId,policyId:body.automatic?plan.policyId:null}));
  }
  const update={status:'Executed',executedBy:user.id,executedAt:at()};
  await tx.run(cds.ql.UPDATE(entity('AllocationPlan')).set(update).where({planId}));
  await v.event(tx,user,'ALLOCATION_EXECUTED',reason,{planId,assignmentIds:assignments.map(a=>a.assignmentId),policyId:body.automatic?plan.policyId:null,confirmed:body.confirmed===true},data.incident);
  return {plan:{...plan,...update,snapshot},assignments,executed:true,reused:false};
}
module.exports={fingerprint,manual,preview,execute,authority,policy,persist,lockScope};
