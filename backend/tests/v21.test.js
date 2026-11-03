const cds=require('@sap/cds'),request=require('supertest');
const {entity}=require('../srv/lib/db');
cds.test(__dirname+'/..');jest.setTimeout(30000);
const call=(method,path,body,role='Manager')=>{const r=request(cds.app)[method]('/api'+path).set('x-demo-user','V21-TEST-M').set('x-demo-role',role);return body?r.send(body):r;};
test('namespaced fixture seed is idempotent and preserves original trace inputs',async()=>{
  const seed=require('../db/seed/v21');
  const before=await cds.db.run(cds.ql.SELECT.from(entity('ToolUseEvent')));
  const first=await cds.db.tx(tx=>seed.apply(tx));expect(first.inserted).toBeGreaterThan(80);
  const second=await cds.db.tx(tx=>seed.apply(tx));expect(second.inserted).toBe(0);
  expect(await cds.db.run(cds.ql.SELECT.from(entity('ToolUseEvent')))).toEqual(before);
  expect((await cds.db.run(cds.ql.SELECT.from(entity('WorkforceProfile')))).length).toBe(14);
});
test('downtime recommendations enforce qualifications, demand, capacity and manager approval',async()=>{
  const result=await call('get','/v2/incidents/V21-INC-01/workforce');expect(result.status).toBe(200);
  expect(result.body.affectedWorkers).toHaveLength(3);
  expect(result.body.recommendations.some(r=>r.workerId==='V21-WORKER-03')).toBe(false);
  const candidate=result.body.recommendations[0];expect(candidate.estimatedImprovement).toBeGreaterThan(0);expect(candidate.baselineOutput).toBe(0);
  const body={workerId:candidate.workerId,stationId:candidate.stationId,minutes:120,reason:'Synthetic demand reviewed'};
  expect((await call('post','/v2/incidents/V21-INC-01/workforce/assign',body,'Worker')).status).toBe(403);
  const assigned=await call('post','/v2/incidents/V21-INC-01/workforce/assign',body);expect(assigned.status).toBe(200);
  expect((await call('post','/v2/incidents/V21-INC-01/workforce/assign',body)).body.reused).toBe(true);
  expect((await call('get','/v2/incidents/V21-INC-01/workforce')).body.recommendations.some(r=>r.workerId===candidate.workerId)).toBe(false);
  expect((await call('post',`/v2/workforce/${assigned.body.assignment.assignmentId}/return`,{reason:'Return reviewed'})).status).toBe(409);
  await cds.db.run(cds.ql.UPDATE(entity('Tool')).set({state:'Active'}).where({toolId:'V21-TOOL-1'}));
  expect((await call('post',`/v2/workforce/${assigned.body.assignment.assignmentId}/return`,{reason:'Verified source restored'})).status).toBe(200);
});
test('Groq client validates model discovery, JSON and provider failures without leaking keys',async()=>{
  const {createReasoningClient}=require('../srv/lib/reasoning');
  const fetch=jest.fn().mockResolvedValueOnce({ok:true,json:async()=>({data:[{id:'test-model'}]})}).mockResolvedValueOnce({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'{"ok":true}'}}]})});
  const client=createReasoningClient({env:{AI_REASONING_PROVIDER:'groq',GROQ_API_KEY:'synthetic-test-input',GROQ_MODEL:'test-model'},fetchImpl:fetch});
  const response=await client.complete([{role:'user',content:'Synthetic test'}],{type:'object',properties:{ok:{type:'boolean'}},required:['ok']});expect(response.model).toBe('groq/test-model');
  const denied=createReasoningClient({env:{GROQ_API_KEY:'synthetic-test-input'},fetchImpl:async()=>({ok:false,status:401})});await expect(denied.model()).rejects.toMatchObject({code:'AI_AUTH_FAILED'});
});
test('adaptive interview accepts only worker-supported facts and omits supplied questions',async()=>{
  const {turn}=require('../srv/lib/interview');
  const client={complete:async()=>({model:'synthetic-groq',content:JSON.stringify({observations:[{field:'equipmentStopped',value:true,quote:'stopped'}],question:'When did it begin?',questionField:'onset',translatedText:'Tool stopped',category:null,suggestedNcCode:null})})};
  const result=await turn(client,{messages:[{role:'worker',text:'We stopped the tool'}],facts:{symptom:'loose bolts'},language:'en',toolId:'TOOL-B',catalogue:[]});
  expect(result.facts.equipmentStopped).toBe(true);expect(result.draft.nextField).toBe('onset');
  await expect(turn(client,{messages:[{role:'worker',text:'loose bolts'}],facts:{},language:'en',catalogue:[]})).rejects.toMatchObject({code:'AI_INVALID_OUTPUT'});
});

test('synthetic report clock follows stored fixture evidence and rejects inconsistent dates',async()=>{
  const {resolve}=require('../srv/lib/synthetic-scenario');
  const anchor='2026-11-04T05:12:00.000Z',at=hours=>new Date(Date.parse(anchor)-hours*3600000).toISOString();
  const audit={auditId:'AUD-SEED-0001',action:'SEED_HISTORY_IMPORTED',modelVersion:'seed-v1',timestamp:at(264)};
  expect(resolve(audit,{startTime:at(12)},{startTime:at(3)}).reportedAt).toBe(anchor);
  expect(resolve(audit,{startTime:at(13)},{startTime:at(3)})).toBe(null);
  const response=await call('get','/tools');
  expect(response.body.demoScenario.reportedAt).toBe(require('../db/seed/plan').T);
});
