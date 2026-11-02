const router=require('express').Router(),{cds,entity,transaction}=require('../lib/db');
const {wrap,label,fail}=require('../lib/http'),{requireRole}=require('../lib/auth'),v=require('../lib/v2'),{uuid}=require('../lib/ids');
const workforce=require('../lib/workforce');
const run=fn=>wrap(async(req,res)=>res.json(label(await transaction(async tx=>{await v.ensureEnabled(tx);return fn(req,tx);})))) ;
router.get('/v2/incidents/:id/workforce',requireRole('Manager'),run((req,tx)=>workforce.recommend(tx,req.params.id,Number(req.query.minutes||120))));
router.post('/v2/incidents/:id/workforce/assign',requireRole('Manager'),run(async(req,tx)=>{
  v.keys(req.body,['workerId','stationId','minutes','reason']);
  const workerId=v.text(req.body.workerId,'workerId'),stationId=v.text(req.body.stationId,'stationId'),reason=v.text(req.body.reason,'reason',1000);
  await v.one(tx,'WorkforceProfile',{workerId},true);await v.one(tx,'WorkStation',{stationId},true);
  const previous=await tx.run(cds.ql.SELECT.from(entity('TemporaryAssignment')).where({workerId,status:'Active'}));
  const existing=previous.find(a=>a.incidentId===req.params.id&&a.stationId===stationId&&Date.parse(a.endsAt)>Date.now());
  if(existing)return {assignment:existing,reused:true};
  const result=await workforce.recommend(tx,req.params.id,req.body.minutes||120),candidate=result.recommendations.find(c=>c.workerId===workerId&&c.stationId===stationId);
  if(!candidate)fail(409,'INELIGIBLE_REASSIGNMENT','Qualifications, demand, shift or capacity no longer permit this assignment');
  const at=new Date().toISOString(),assignment={assignmentId:uuid('WA'),workerId,incidentId:req.params.id,sourceToolId:result.sourceTool.toolId,stationId,startsAt:at,endsAt:candidate.endsAt,status:'Active',estimatedOutput:candidate.estimatedImprovement,assumptions:JSON.stringify(candidate.assumptions),approvedBy:req.user.id,approvedAt:at};
  await tx.run(cds.ql.INSERT.into(entity('TemporaryAssignment')).entries(assignment));
  await v.event(tx,req.user,'WORKFORCE_REASSIGNED',reason,{assignment,candidate},{incidentId:req.params.id,toolId:result.sourceTool.toolId});await v.notify(tx,workerId,req.params.id,'Manager approved temporary work-center assignment');
  return {assignment};
}));
router.post('/v2/workforce/:id/return',requireRole('Manager'),run(async(req,tx)=>{
  v.keys(req.body,['reason']);const reason=v.text(req.body.reason,'reason',1000),assignment=await v.one(tx,'TemporaryAssignment',{assignmentId:req.params.id},true);
  if(!assignment)fail(404,'ASSIGNMENT_NOT_FOUND','Assignment not found');
  if(assignment.status==='Returned')return {assignment,reused:true};
  const tool=await v.one(tx,'Tool',{toolId:assignment.sourceToolId});if(tool.state!=='Active')fail(409,'EQUIPMENT_UNAVAILABLE','Original equipment must pass return-to-service verification first');
  await tx.run(cds.ql.UPDATE(entity('TemporaryAssignment')).set({status:'Returned'}).where({assignmentId:assignment.assignmentId}));await v.event(tx,req.user,'WORKFORCE_RETURNED',reason,{assignmentId:assignment.assignmentId},{incidentId:assignment.incidentId,toolId:tool.toolId});
  return {assignment:{...assignment,status:'Returned'}};
}));
module.exports={mount:'/api',router,owner:'platform-v21'};
