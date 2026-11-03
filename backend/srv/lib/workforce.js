const {fail}=require('./http');
const v=require('./v2'),ops=require('./operations');
const list=ops.array;
async function load(tx,incidentId){
  const incident=await v.one(tx,'Incident',{incidentId});if(!incident)fail(404,'INCIDENT_NOT_FOUND','Incident not found');
  const names=['Tool','UserProfile','WorkforceProfile','WorkStation','ProductionDemand','TemporaryAssignment'];
  if(await ops.available(tx))names.push('UserProfileDetail','WorkStationOperation');
  const values=await Promise.all(names.map(name=>ops.rows(tx,name)));
  return {incident,...Object.fromEntries(names.map((name,index)=>[name,values[index]]))};
}
function evaluate(data,minutes=120,{now=Date.now(),virtual=[],centers=null}={}){
  if(!Number.isInteger(minutes)||minutes<15||minutes>480)fail(400,'INVALID_INPUT','Choose 15–480 minutes');
  const incidentId=data.incident.incidentId,source=data.Tool.find(t=>t.toolId===data.incident.toolId);
  if(!source)fail(409,'EQUIPMENT_MISSING','Source equipment record is missing');
  const workers=data.WorkforceProfile.filter(w=>w.homeToolId===source.toolId),stations=data.WorkStation;
  const active=[...data.TemporaryAssignment,...virtual].filter(a=>a.status==='Active'&&Date.parse(a.endsAt)>now);
  const recommendations=[],rejected=[];
  const tools=new Map(data.Tool.map(t=>[t.toolId,t])),profiles=new Map(data.UserProfile.map(p=>[p.userId,p]));
  const details=new Map((data.UserProfileDetail||[]).map(p=>[p.userId,p])),stationDetails=new Map((data.WorkStationOperation||[]).map(s=>[s.stationId,s]));
  for(const worker of workers)for(const station of stations){
    const reasons=[],profile=profiles.get(worker.workerId),tool=tools.get(station.toolId),detail=details.get(worker.workerId),stationDetail=stationDetails.get(station.stationId);
    if(!['Restricted','Under repair','Awaiting verification'].includes(source.state))reasons.push('Source equipment is not in a temporary downtime state');
    if(!profile||profile.role!=='Worker'||profile.status!=='Active'||!worker.available)reasons.push('Worker profile or availability is not active');
    if(!list(worker.skills).includes(station.requiredSkill)||!list(worker.certifications).includes(station.requiredCertification)||!list(worker.safetyAuthorizations).includes(station.safetyAuthorization))reasons.push('Mandatory destination qualifications not met');
    if(!(Date.parse(worker.certificationExpiresAt)>now))reasons.push('Certification not current');
    if(detail?.shiftStartsAt&&!(Date.parse(detail.shiftStartsAt)<=now))reasons.push('Worker shift has not started');
    if(active.some(a=>a.workerId===worker.workerId))reasons.push('Overlapping assignment');
    const occupied=active.filter(a=>a.stationId===station.stationId).length;
    if(occupied>=station.slots||!(station.slots>=1))reasons.push('No station capacity');
    if(!station.materialsAvailable||tool?.state!=='Active'||station.toolId===source.toolId)reasons.push('Equipment or materials unavailable');
    if(centers&&!centers.includes(station.workCenter))reasons.push('Destination is outside manager work-center authority');
    const orders=data.ProductionDemand.filter(d=>d.stationId===station.stationId&&d.requiredQuantity>d.completedQuantity);
    const backlog=orders.reduce((n,d)=>n+d.requiredQuantity-d.completedQuantity,0);
    const reservedOutput=active.filter(a=>a.stationId===station.stationId).reduce((n,a)=>n+a.estimatedOutput,0);
    const travelMinutes=stationDetail?.travelMinutes??0,rate=stationDetail?.bottleneckUnitsPerHour!=null?Math.min(station.unitsPerHour,stationDetail.bottleneckUnitsPerHour):station.unitsPerHour;
    const availableMinutes=Math.min(minutes,(Date.parse(worker.shiftEndsAt)-now)/60000),productiveMinutes=availableMinutes-station.setupMinutes-travelMinutes;
    if(!(productiveMinutes>0)||!(rate>0)||station.setupMinutes<0||travelMinutes<0)reasons.push('No productive shift time or validated station rate');
    const output=Math.max(0,Math.min(backlog-reservedOutput,Math.floor(Math.max(0,productiveMinutes)/60*rate)))||0;
    if(!output)reasons.push('No unallocated demand');
    const candidate={workerId:worker.workerId,stationId:station.stationId,workCenter:station.workCenter,eligible:!reasons.length,reasons,
      baselineOutput:0,expectedReassignedOutput:output,estimatedImprovement:output,minutes,
      endsAt:new Date(Math.max(now,Math.min(now+minutes*60000,Date.parse(worker.shiftEndsAt)||now))).toISOString(),
      assumptions:{backlog,alreadyAllocatedOutput:reservedOutput,unitsPerHour:rate,recordedStationRate:station.unitsPerHour,setupMinutes:station.setupMinutes,travelMinutes,availableMinutes:Math.max(0,availableMinutes)||0,productiveMinutes:Math.max(0,productiveMinutes)||0,
        shiftStart:detail?.shiftStartsAt||null,shiftEnd:worker.shiftEndsAt,stationSlots:station.slots,occupiedSlots:occupied,
        basis:'Stored demand, qualifications, station rate, setup/travel and shift limits. Downtime baseline zero. Estimated contribution, not measured production.'},
      dueAt:orders.map(o=>o.dueAt).sort()[0]||null};
    (reasons.length?rejected:recommendations).push(candidate);
  }
  recommendations.sort((a,b)=>(a.dueAt||'9999').localeCompare(b.dueAt||'9999')||b.estimatedImprovement-a.estimatedImprovement||a.workerId.localeCompare(b.workerId)||a.stationId.localeCompare(b.stationId));
  return {incidentId,sourceTool:source,affectedWorkers:workers.map(w=>w.workerId),recommendations,rejected,
    activeAssignments:active.filter(a=>a.incidentId===incidentId),returnCandidates:source.state==='Active'?active.filter(a=>a.sourceToolId===source.toolId).map(a=>a.assignmentId):[]};
}
function optimize(data,minutes,options={}){
  const now=options.now||Date.now(),virtual=[],initial=evaluate(data,minutes,{...options,now}),assignments=[];
  const maxWorkers=options.maxWorkers||100;
  while(assignments.length<maxWorkers){
    let choices=evaluate(data,minutes,{...options,now,virtual}).recommendations;
    if(options.stationIds)choices=choices.filter(c=>options.stationIds.includes(c.stationId));
    const alternatives=new Map();for(const c of choices)alternatives.set(c.workerId,(alternatives.get(c.workerId)||0)+1);
    // Earliest demand first; preserve scarce skills, then maximize feasible output.
    choices.sort((a,b)=>(a.dueAt||'9999').localeCompare(b.dueAt||'9999')||alternatives.get(a.workerId)-alternatives.get(b.workerId)||b.estimatedImprovement-a.estimatedImprovement||a.workerId.localeCompare(b.workerId)||a.stationId.localeCompare(b.stationId));
    const c=choices[0];if(!c)break;
    assignments.push(c);virtual.push({workerId:c.workerId,stationId:c.stationId,incidentId:data.incident.incidentId,sourceToolId:initial.sourceTool.toolId,status:'Active',startsAt:new Date(now).toISOString(),endsAt:c.endsAt,estimatedOutput:c.estimatedImprovement});
  }
  const excluded=initial.affectedWorkers.filter(w=>!assignments.some(a=>a.workerId===w)).map(workerId=>({workerId,reasons:[...new Set(initial.rejected.filter(r=>r.workerId===workerId).flatMap(r=>r.reasons))],allocationReason:initial.recommendations.some(c=>c.workerId===workerId)?'Higher-priority demand, shared capacity or bounded policy allocated available slots':'No eligible destination'}));
  return {incidentId:data.incident.incidentId,sourceTool:initial.sourceTool,assignments,excluded,rejected:initial.rejected,totalEstimatedUnits:assignments.reduce((n,a)=>n+a.estimatedImprovement,0),
    algorithm:'deterministic-constrained-ranking-v1',ranking:['earliest demand due date','fewest eligible alternatives (scarce skills)','highest feasible output','stable worker and station ID'],optimality:'Feasible constrained ranking; not a claim of a global mathematical optimum',evaluatedAt:new Date(now).toISOString()};
}
async function recommend(tx,incidentId,minutes=120,options={}){return evaluate(await load(tx,incidentId),minutes,options);}
module.exports={load,evaluate,optimize,recommend};
