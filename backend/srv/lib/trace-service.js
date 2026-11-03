const {cds,entity}=require('./db'),incidents=require('./incidents'),engine=require('./trace-engine'),v=require('./v2');
const {fail}=require('./http'),audit=require('./audit'),history=require('./history'),{uuid}=require('./ids');
async function generate(tx,user,id,hours){
  if(!['Manager','Quality','Verifier'].includes(user.role))fail(403,'FORBIDDEN','Exposure tracing requires an authorized review role');
  // Enforce object scope here as well as at the HTTP boundary, including exports.
  await v.access(tx,user,id);
  await tx.run(cds.ql.SELECT.one.from(entity('Incident')).where({incidentId:id}).forUpdate());
  const incident=await incidents.find(tx,id),tool=await incidents.tool(tx,incident.toolId);
  const trace=await engine.generate(tx,tool,incident.reportedAt,hours);
  const previous=await tx.run(cds.ql.SELECT.one.from(entity('TraceResult')).where({incidentId:id,windowHours:hours}).orderBy('version desc'));
  const version=(previous?.version||0)+1,generatedAt=new Date().toISOString(),traceId=uuid('TRACE');
  await tx.run(cds.ql.INSERT.into(entity('TraceResult')).entries({traceId,incidentId:id,windowHours:hours,units:JSON.stringify(trace.units),tiers:JSON.stringify(trace.summary.byTier),valueAtRisk:trace.valueAtRisk.amountINR,dataQualityScore:trace.dataQuality.score,gaps:JSON.stringify(trace.gaps),snapshotTime:trace.snapshotTime,version,generatedAt}));
  await audit.write({incidentId:id,toolId:tool.toolId,actor:user.id,actorRole:user.role,action:'TRACE_GENERATED',reason:'Human requested deterministic exposure review',details:{traceId,windowHours:hours,version,totalUnits:trace.summary.totalUnits}},tx);
  await history.append({toolId:tool.toolId,type:'TRACE',summary:`${hours}h trace generated`,refId:id,details:{traceId,windowHours:hours,version,totalUnits:trace.summary.totalUnits}},tx);
  return {incidentId:id,traceId,...trace,generatedAt,version};
}
module.exports={generate};
