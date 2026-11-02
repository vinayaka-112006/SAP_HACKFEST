const {cds,entity}=require('./db');
const {fail}=require('./http');
const v=require('./v2');
const list=s=>JSON.parse(s||'[]');
async function recommend(tx,incidentId,minutes=120){
  if(!Number.isInteger(minutes)||minutes<15||minutes>480)fail(400,'INVALID_INPUT','Choose 15–480 minutes');
  const incident=await v.one(tx,'Incident',{incidentId});if(!incident)fail(404,'INCIDENT_NOT_FOUND','Incident not found');
  const source=await v.one(tx,'Tool',{toolId:incident.toolId});
  const workers=await tx.run(cds.ql.SELECT.from(entity('WorkforceProfile')).where({homeToolId:source.toolId}));
  const stations=await tx.run(cds.ql.SELECT.from(entity('WorkStation'))),demand=await tx.run(cds.ql.SELECT.from(entity('ProductionDemand'))),active=await tx.run(cds.ql.SELECT.from(entity('TemporaryAssignment')).where({status:'Active'}));
  const now=Date.now(),recommendations=[],rejected=[];
  for(const worker of workers)for(const station of stations){
    const reasons=[],profile=await v.one(tx,'UserProfile',{userId:worker.workerId}),tool=await v.one(tx,'Tool',{toolId:station.toolId});
    if(source.state==='Active')reasons.push('Source equipment is operational; no downtime release');
    if(!profile||profile.role!=='Worker'||profile.status!=='Active'||!worker.available)reasons.push('Worker profile or availability is not active');
    if(!list(worker.skills).includes(station.requiredSkill)||!list(worker.certifications).includes(station.requiredCertification)||!list(worker.safetyAuthorizations).includes(station.safetyAuthorization))reasons.push('Mandatory destination qualifications not met');
    if(Date.parse(worker.certificationExpiresAt)<=now||!Number.isFinite(Date.parse(worker.certificationExpiresAt)))reasons.push('Certification not current');
    if(active.some(a=>a.workerId===worker.workerId&&Date.parse(a.endsAt)>now))reasons.push('Overlapping assignment');
    const occupied=active.filter(a=>a.stationId===station.stationId&&Date.parse(a.endsAt)>now).length;
    if(occupied>=station.slots||station.slots<1)reasons.push('No station capacity');
    if(!station.materialsAvailable||tool?.state!=='Active'||station.toolId===source.toolId)reasons.push('Equipment or materials unavailable');
    const orders=demand.filter(d=>d.stationId===station.stationId&&d.requiredQuantity>d.completedQuantity);
    const backlog=orders.reduce((n,d)=>n+d.requiredQuantity-d.completedQuantity,0);
    const reservedOutput=active.filter(a=>a.stationId===station.stationId&&Date.parse(a.endsAt)>now).reduce((n,a)=>n+a.estimatedOutput,0);
    const availableMinutes=Math.min(minutes,(Date.parse(worker.shiftEndsAt)-now)/60000)-station.setupMinutes;
    if(!(availableMinutes>0)||!(station.unitsPerHour>0))reasons.push('No productive shift time or recorded rate');
    const output=Math.max(0,Math.min(backlog-reservedOutput,Math.floor(availableMinutes/60*station.unitsPerHour)));
    if(!output)reasons.push('No unallocated demand');
    const candidate={workerId:worker.workerId,stationId:station.stationId,workCenter:station.workCenter,eligible:!reasons.length,reasons,
      baselineOutput:0,expectedReassignedOutput:output,estimatedImprovement:output,minutes,endsAt:new Date(Math.min(now+minutes*60000,Date.parse(worker.shiftEndsAt)||now)).toISOString(),
      assumptions:{backlog,alreadyAllocatedOutput:reservedOutput,unitsPerHour:station.unitsPerHour,setupMinutes:station.setupMinutes,productiveMinutes:Math.max(0,Math.floor(availableMinutes)),basis:'Recorded synthetic demand and rates; downtime baseline zero. Estimate, not guaranteed output.'},
      dueAt:orders.map(o=>o.dueAt).sort()[0]||null};
    (reasons.length?rejected:recommendations).push(candidate);
  }
  recommendations.sort((a,b)=>(a.dueAt||'').localeCompare(b.dueAt||'')||b.estimatedImprovement-a.estimatedImprovement||a.workerId.localeCompare(b.workerId));
  return {incidentId,sourceTool:source,affectedWorkers:workers.map(w=>w.workerId),recommendations,rejected,
    activeAssignments:active.filter(a=>a.incidentId===incidentId),returnCandidates:source.state==='Active'?active.filter(a=>a.sourceToolId===source.toolId).map(a=>a.assignmentId):[]};
}
module.exports={recommend};
