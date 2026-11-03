const cds=require('@sap/cds'),request=require('supertest');
const {entity}=require('../srv/lib/db'),workforce=require('../srv/lib/workforce');
cds.test(__dirname+'/..');jest.setTimeout(30000);
const call=(method,path,body,role='Manager',user='ALLOC-M')=>{const req=request(cds.app)[method]('/api'+path).set('x-demo-role',role).set('x-demo-user',user);return body===undefined?req:req.send(body);};
let incidentId,source;
const future=hours=>new Date(Date.now()+hours*3600000).toISOString();
async function setup(prefix){
  source=prefix+'-SOURCE';
  await cds.db.run(cds.ql.INSERT.into(entity('Tool')).entries([{toolId:source,type:'ALLOCATION-SYNTHETIC',state:'Restricted',workCenter:'ALLOC-SOURCE'},...['A','B'].map(k=>({toolId:prefix+'-DEST-'+k,type:'ALLOCATION-SYNTHETIC',state:'Active',workCenter:'ALLOC-'+k}))]));
  for(const [index,skills]of [[1,['A','B']],[2,['A']],[3,['UNQUALIFIED']]]){
    const id=prefix+'-W'+index;
    await cds.db.run(cds.ql.INSERT.into(entity('UserProfile')).entries({userId:id,role:'Worker',status:'Active',displayName:id,workCenter:'ALLOC-SOURCE'}));
    await cds.db.run(cds.ql.INSERT.into(entity('WorkforceProfile')).entries({workerId:id,homeToolId:source,skills:JSON.stringify(skills),certifications:'["CERT"]',safetyAuthorizations:'["SAFE"]',certificationExpiresAt:future(100),shiftEndsAt:future(8),available:true}));
    await cds.db.run(cds.ql.INSERT.into(entity('UserProfileDetail')).entries({userId:id,shift:'SYNTHETIC',shiftStartsAt:future(-1),shiftEndsAt:future(8)}));
  }
  for(const k of ['A','B']){
    const stationId=prefix+'-ST-'+k;
    await cds.db.run(cds.ql.INSERT.into(entity('WorkStation')).entries({stationId,toolId:prefix+'-DEST-'+k,workCenter:'ALLOC-'+k,requiredSkill:k,requiredCertification:'CERT',safetyAuthorization:'SAFE',materialsAvailable:true,slots:1,unitsPerHour:60,setupMinutes:10}));
    await cds.db.run(cds.ql.INSERT.into(entity('WorkStationOperation')).entries({stationId,travelMinutes:5,bottleneckUnitsPerHour:60,approvedBy:'ALLOC-A'}));
    await cds.db.run(cds.ql.INSERT.into(entity('ProductionDemand')).entries({orderId:prefix+'-DEMAND-'+k,stationId,requiredQuantity:500,completedQuantity:0,dueAt:future(10)}));
  }
  const created=await call('post','/incidents',{toolId:source,reporterId:prefix+'-W1',language:'en',rawText:'Synthetic downtime creates available workers'},'Worker',prefix+'-W1');expect(created.status).toBe(201);incidentId=created.body.incident.incidentId;
  expect((await call('post',`/incidents/${incidentId}/confirm`,{confirmedBy:prefix+'-W1'},'Worker',prefix+'-W1')).status).toBe(200);
  return {prefix,incidentId,source};
}
test('optimizer computes a feasible joint plan with scarce skills, setup/travel and real demand caps',async()=>{
  await setup('ALLOC-1');
  const data=await cds.db.tx(tx=>workforce.load(tx,incidentId));
  const plan=workforce.optimize(data,120);
  expect(plan.assignments).toHaveLength(2);
  expect(plan.assignments.find(a=>a.workerId==='ALLOC-1-W2').stationId).toBe('ALLOC-1-ST-A');
  expect(plan.assignments.find(a=>a.workerId==='ALLOC-1-W1').stationId).toBe('ALLOC-1-ST-B');
  expect(plan.totalEstimatedUnits).toBe(210);expect(plan.excluded.some(e=>e.workerId==='ALLOC-1-W3')).toBe(true);
  for(const mutate of [
    d=>d.WorkforceProfile.forEach(w=>w.certificationExpiresAt=future(-1)),
    d=>d.WorkforceProfile.forEach(w=>w.shiftEndsAt=future(-1)),
    d=>d.UserProfileDetail.forEach(w=>w.shiftStartsAt=future(1)),
    d=>d.WorkStation.forEach(s=>s.materialsAvailable=false),
    d=>d.ProductionDemand.forEach(o=>o.completedQuantity=o.requiredQuantity),
    d=>d.Tool.filter(t=>t.toolId!==source).forEach(t=>t.state='Restricted')
  ]){const copy=structuredClone(data);mutate(copy);expect(workforce.optimize(copy,120).assignments).toHaveLength(0);}
});
test('preview requires explicit manager confirmation and rejects a stale plan without partial assignments',async()=>{
  const path=`/v2/incidents/${incidentId}/workforce/plan`;
  expect((await call('post',path,{minutes:120},'Worker','ALLOC-1-W1')).status).toBe(403);
  const preview=await call('post',path,{minutes:120});expect(preview.status).toBe(200);
  const execute=`/v2/workforce/plans/${preview.body.plan.planId}/execute`;
  expect((await call('post',execute,{reason:'Unconfirmed'})).status).toBe(403);
  await cds.db.run(cds.ql.UPDATE(entity('WorkStation')).set({materialsAvailable:false}).where({stationId:'ALLOC-1-ST-A'}));
  expect((await call('post',execute,{confirmed:true,reason:'Demand reviewed'})).body.error.code).toBe('STALE_PLAN');
  expect((await cds.db.run(cds.ql.SELECT.from(entity('TemporaryAssignment')).where({incidentId}))).length).toBe(0);
  await cds.db.run(cds.ql.UPDATE(entity('WorkStation')).set({materialsAvailable:true}).where({stationId:'ALLOC-1-ST-A'}));
  const refreshed=await call('post',path,{minutes:120}),url=`/v2/workforce/plans/${refreshed.body.plan.planId}/execute`;
  expect((await call('post',url,{confirmed:true,reason:'Not the preview owner'},'Manager','ALLOC-OTHER')).status).toBe(403);
  const applied=await call('post',url,{confirmed:true,reason:'Reviewed complete joint allocation'});expect(applied.status).toBe(200);expect(applied.body.assignments).toHaveLength(2);
  expect((await call('post',url,{confirmed:true,reason:'Repeated click'})).body.reused).toBe(true);
  const assignment=applied.body.assignments[0];
  expect((await call('post',`/v2/incidents/${incidentId}/workforce/assign`,{workerId:assignment.workerId,stationId:'ALLOC-1-ST-B',minutes:120,reason:'Another concurrent station'})).status).toBe(409);
  expect((await call('post',`/v2/workforce/${assignment.assignmentId}/acknowledge`,{},'Worker','FOREIGN')).status).toBe(404);
  expect((await call('post',`/v2/workforce/${assignment.assignmentId}/acknowledge`,{},'Worker',assignment.workerId)).body.acknowledged).toBe(true);
  expect((await call('post',`/v2/workforce/${assignment.assignmentId}/return`,{reason:'Not restored'})).status).toBe(409);
  await cds.db.run(cds.ql.UPDATE(entity('Tool')).set({state:'Active'}).where({toolId:source}));
  expect((await call('post',`/v2/workforce/${assignment.assignmentId}/return`,{reason:'Destination commitment reviewed; finish current station',continue:true})).body.assignment.status).toBe('Active');
  expect((await call('post',`/v2/workforce/${assignment.assignmentId}/return`,{reason:'Destination handover complete; manager approves early return'})).body.assignment.status).toBe('Returned');
});
test('automatic execution is gated by an existing bounded policy, not an AI recommendation',async()=>{
  await setup('ALLOC-2');
  const policy={sourceToolIds:[source],destinationStationIds:['ALLOC-2-ST-A','ALLOC-2-ST-B'],maxWorkers:1,maxMinutes:120,maxEstimatedUnits:200,enabled:false,expiresAt:future(8),reason:'Synthetic bounded policy reviewed'};
  expect((await call('put','/v2/workforce/policies/ALLOC-POLICY',policy,'Worker','ALLOC-2-W1')).status).toBe(403);
  expect((await call('put','/v2/workforce/policies/ALLOC-POLICY',policy)).status).toBe(200);
  const path=`/v2/incidents/${incidentId}/workforce/plan`,body={minutes:120,policyId:'ALLOC-POLICY',automatic:true};
  expect((await call('post',path,body)).body.error.code).toBe('AUTOMATION_NOT_AUTHORIZED');
  expect((await call('put','/v2/workforce/policies/ALLOC-POLICY',{...policy,enabled:true})).status).toBe(200);
  const result=await call('post',path,body);expect(result.status).toBe(200);expect(result.body.executed).toBe(true);expect(result.body.assignments).toHaveLength(1);expect(result.body.assignments[0].detail.policyId).toBe('ALLOC-POLICY');
  expect((await call('post',path,body)).body.error.code).toBe('POLICY_LIMIT');
  expect((await call('post',path,{minutes:240,policyId:'ALLOC-POLICY',automatic:true})).body.error.code).toBe('POLICY_LIMIT');
});
