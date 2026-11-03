const {cds,entity}=require('./db');
const {fail}=require('./http');
const v=require('./v2'),ops=require('./operations'),ids=require('./ids');
const now=()=>new Date().toISOString();
async function assignmentAccess(tx,user,id){
  const incident=await v.access(tx,user,id);
  if(!(await ops.permissions(tx,user)).canAssign)fail(403,'ASSIGNMENT_NOT_AUTHORIZED','A manager or explicitly authorized assigner is required');
  return incident;
}
async function assign(tx,user,id,body){
  v.keys(body,['technicianId','reason','replaceWorkOrderId']);
  await assignmentAccess(tx,user,id);
  const incident=await v.one(tx,'Incident',{incidentId:id},true);
  if(incident.state!=='Confirmed')fail(409,'INVALID_STATE','A confirmed incident is required');
  const tool=await v.one(tx,'Tool',{toolId:incident.toolId},true);
  if((await v.one(tx,'IncidentRelationship',{incidentId:id}))?.decision==='LINK')fail(409,'LINKED_REPORT','Assign the canonical investigation instead');
  const existing=await v.one(tx,'RepairWorkOrder',{incidentId:id},true),technicianId=v.text(body.technicianId,'technicianId');
  if(existing?.technicianId===technicianId)return {workOrder:existing,reused:true};
  if(existing){
    if(body.replaceWorkOrderId!==existing.workOrderId||!body.reason?.trim())fail(409,'ASSIGNMENT_CONFLICT','Reassignment requires the current work order and a recorded reason');
    if(!['Assigned','Accepted'].includes(existing.status)||(await ops.rows(tx,'RepairLog',{incidentId:id})).length||(await ops.rows(tx,'PartReservation',{incidentId:id})).some(p=>p.status==='Active'))fail(409,'WORK_IN_PROGRESS','Finish or correct recorded repair work before reassignment');
  }
  await v.one(tx,'UserProfile',{userId:technicianId},true);
  if(!(await v.eligible(tx,tool,{excludeIncidentId:id})).some(t=>t.userId===technicianId&&t.eligible))fail(409,'INELIGIBLE_TECHNICIAN','Current qualifications, shift or workload requirements are not met');
  const workOrder={incidentId:id,workOrderId:ids.uuid('WO'),technicianId,assignedBy:user.id,assignedAt:now(),status:'Assigned',findings:'',repairId:null,reviewedBy:null,reviewedAt:null};
  await tx.run(cds.ql.UPSERT.into(entity('RepairWorkOrder')).entries(workOrder));
  if(existing)await v.notify(tx,existing.technicianId,id,'An authorized reviewer reassigned this work order');
  await v.notify(tx,technicianId,id,'Repair investigation assigned; accept the work order');
  await v.notify(tx,incident.reporterId,id,'A qualified technician has been assigned');
  await v.event(tx,user,existing?'WORK_REASSIGNED':'WORK_ASSIGNED',body.reason?.trim()||'Authorized investigation; containment approval remains separate',{before:existing||null,after:workOrder},incident);
  return {workOrder};
}
async function correct(tx,user,incident,work,reason,verificationFailure=false){
  const repair=await v.one(tx,'RepairLog',{repairId:work.repairId,incidentId:incident.incidentId},true);
  if(!repair||repair.verifiedBy)fail(409,'INVALID_REPAIR_EVIDENCE','An unverified submitted repair is required');
  if(verificationFailure){
    if(!(await ops.permissions(tx,user)).canVerify)fail(403,'VERIFICATION_NOT_AUTHORIZED','Independent verification capability is required');
    if([repair.loggedBy,work.reviewedBy,work.assignedBy].includes(user.id))fail(403,'INDEPENDENCE_REQUIRED','Verifier must be independent of repair, assignment and completion approval');
  }
  await require('./tool-state').setState({toolId:incident.toolId,state:'Under repair',incidentId:incident.incidentId,actor:user.id,actorRole:user.role,reason,correctionRepairId:repair.repairId},tx);
  await tx.run(cds.ql.INSERT.into(entity('IncidentEvidence')).entries({evidenceId:ids.uuid('EVID'),incidentId:incident.incidentId,type:verificationFailure?'VERIFICATION_FAILED':'REPAIR_CORRECTION',reference:JSON.stringify({reason,actor:user.id,previousRepair:repair}),sourceTime:now()}));
  await tx.run(cds.ql.UPDATE(entity('RepairLog')).set({passed:false,testReadings:'[]'}).where({repairId:repair.repairId}));
}
async function transition(tx,user,id,body){
  v.keys(body,['action','findings','repairId','reason','evidenceRef']);
  const incident=await v.access(tx,user,id);
  await v.one(tx,'Incident',{incidentId:id},true);
  const work=await v.one(tx,'RepairWorkOrder',{incidentId:id},true);
  if(!work)fail(404,'WORK_ORDER_NOT_FOUND','Work order not found');
  const transitions={accept:[['Assigned'],'Accepted','Technician'],progress:[['Accepted'],'Accepted','Technician'],submit:[['Accepted'],'Submitted','Technician'],review:[['Submitted'],'Reviewed','Manager'],
    blockParts:[['Accepted'],'BlockedParts','Technician'],requestInformation:[['Accepted'],'NeedsInformation','Technician'],resume:[['BlockedParts','NeedsInformation'],'Accepted','Technician'],
    correct:[['Submitted','Reviewed','NeedsEvidence'],'Accepted','Manager'],requestEvidence:[['Submitted'],'NeedsEvidence','Manager'],supplement:[['NeedsEvidence'],'Submitted','Technician'],verificationFailed:[['Reviewed'],'Accepted','Verifier']};
  const action=body.action,step=transitions[action];
  if(!step||!step[0].includes(work.status)||user.role!==step[2])fail(409,'INVALID_STATE','Work transition is not allowed from the current state');
  const update={status:step[1]};
  if(user.role==='Technician'){
    if(work.technicianId!==user.id)fail(403,'ASSIGNMENT_REQUIRED','Only the assigned technician can perform this action');
    const tool=await v.one(tx,'Tool',{toolId:incident.toolId});
    if(!(await v.eligible(tx,tool,{excludeIncidentId:id})).some(t=>t.userId===user.id&&t.eligible))fail(409,'INELIGIBLE_TECHNICIAN','Qualifications or shift authorization are no longer current');
    update.findings=v.text(body.findings,'findings',4000);
  }
  const reason=['correct','verificationFailed','requestEvidence','blockParts','requestInformation'].includes(action)?v.text(body.reason,'reason',2000):body.reason?.trim()||'Explicit repair workflow decision';
  if(action==='submit'){
    const repair=await v.one(tx,'RepairLog',{repairId:v.text(body.repairId,'repairId'),incidentId:id});
    if(!repair||repair.loggedBy!==user.id||!repair.passed)fail(409,'REPAIR_EVIDENCE_REQUIRED','Submit passing evidence through the existing repair API first');
    update.repairId=repair.repairId;
  }
  if(action==='supplement'){
    const evidenceRef=v.text(body.evidenceRef,'evidenceRef',2000);
    await tx.run(cds.ql.INSERT.into(entity('IncidentEvidence')).entries({evidenceId:ids.uuid('EVID'),incidentId:id,type:'REPAIR_SUPPLEMENT',reference:JSON.stringify({evidenceRef,findings:update.findings,actor:user.id}),sourceTime:now()}));
  }
  if(action==='review'){
    if(work.technicianId===user.id)fail(403,'INDEPENDENCE_REQUIRED','The repair technician cannot review their own completion');
    update.reviewedBy=user.id;update.reviewedAt=now();
  }
  if(['correct','verificationFailed'].includes(action)){await correct(tx,user,incident,work,reason,action==='verificationFailed');update.reviewedBy=null;update.reviewedAt=null;}
  await tx.run(cds.ql.UPDATE(entity('RepairWorkOrder')).set(update).where({incidentId:id}));
  if(user.role==='Technician')await ops.notifyReviewers(tx,incident,`Repair work: ${step[1]}`);
  else await v.notify(tx,work.technicianId,id,`Repair decision: ${action}. ${reason}`);
  if(action==='review')await ops.notifyReviewers(tx,incident,'Completed repair awaits independent verification','Verifier');
  await v.notify(tx,incident.reporterId,id,`Repair progress: ${step[1]}`);
  await v.event(tx,user,'WORK_'+action.toUpperCase(),reason,{before:work,after:update},incident);
  return {workOrder:{...work,...update}};
}
module.exports={assignmentAccess,assign,transition};
