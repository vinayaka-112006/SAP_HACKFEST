const router=require('express').Router();const {cds,entity,transaction}=require('../lib/db');const {wrap,label}=require('../lib/http');const {requireRole}=require('../lib/auth');const incidents=require('../lib/incidents');const engine=require('../lib/trace-engine');const audit=require('../lib/audit');const history=require('../lib/history');const {uuid}=require('../lib/ids');
router.get('/incidents/:id/trace',requireRole('Manager','Quality','Verifier'),wrap(async(req,res)=>{
 const hours=engine.parseWindow(req.query.window);
 const result=await transaction(async tx=>{
  await tx.run(cds.ql.SELECT.one.from(entity('Incident')).where({incidentId:req.params.id}).forUpdate());
  const incident=await incidents.find(tx,req.params.id),tool=await incidents.tool(tx,incident.toolId);
  const trace=await engine.generate(tx,tool,incident.reportedAt,hours);
  const previous=await tx.run(cds.ql.SELECT.one.from(entity('TraceResult')).where({incidentId:incident.incidentId,windowHours:hours}).orderBy('version desc'));
  const version=(previous?.version||0)+1,generatedAt=new Date().toISOString();
  await tx.run(cds.ql.INSERT.into(entity('TraceResult')).entries({traceId:uuid('TRACE'),incidentId:incident.incidentId,windowHours:hours,units:JSON.stringify(trace.units),tiers:JSON.stringify(trace.summary.byTier),valueAtRisk:trace.valueAtRisk.amountINR,dataQualityScore:trace.dataQuality.score,gaps:JSON.stringify(trace.gaps),snapshotTime:trace.snapshotTime,version,generatedAt}));
  await audit.write({incidentId:incident.incidentId,toolId:tool.toolId,actor:req.user.id,actorRole:req.user.role,action:'TRACE_GENERATED',reason:'Human requested deterministic exposure review',details:{windowHours:hours,version,totalUnits:trace.summary.totalUnits}},tx);
  await history.append({toolId:tool.toolId,type:'TRACE',summary:`${hours}h trace generated`,refId:incident.incidentId,details:{version,totalUnits:trace.summary.totalUnits}},tx);
  return {incidentId:incident.incidentId,...trace,generatedAt,version};
 });res.json(label(result));
}));module.exports={mount:'/api',router,owner:'platform'};
