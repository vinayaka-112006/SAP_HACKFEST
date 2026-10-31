const cds=require('@sap/cds');const request=require('supertest');const {entity,transaction}=require('../srv/lib/db');const {uuid}=require('../srv/lib/ids');const actions=require('../srv/lib/mock-actions');const toolState=require('../srv/lib/tool-state');
cds.test(__dirname+'/..');jest.setTimeout(30000);
const api=(url,body,role='Manager',extra={})=>{let r=request(cds.app).post('/api'+url).set('x-demo-user','MOCK-TEST').set('x-demo-role',role);for(const [k,v]of Object.entries(extra))r=r.set(k,v);return r.send(body);};
let id;const requests=()=>[
 ['MAINTENANCE_NOTIFICATION','/mock/s4/maintenance-notifications','Manager',{incidentId:id,toolId:'TOOL-B',shortText:'Inspect torque',priority:'2',requestedBy:'MGR-01'}],
 ['QUALITY_NOTIFICATION','/mock/s4/quality-notifications','Quality',{incidentId:id,toolId:'TOOL-B',shortText:'Review potential exposure',batchIds:['BATCH-B-DUP'],requestedBy:'QA-01'}],
 ['STOCK_BLOCK','/mock/s4/stock-blocks','Quality',{incidentId:id,batchIds:['BATCH-B-DUP','BATCH-B-X72'],plant:'PLANT-01',storageLocation:'STORE-01',reason:'Review exposure'}],
 ['TOOL_RESTRICTION','/mock/dm/tool-restrictions','Manager',{incidentId:id,toolId:'TOOL-B',action:'RESTRICT',reason:'Review torque'}]
];
async function approval(type,role,payload,options={}){const proposalId=uuid('P'),approvalId=uuid('A');await cds.db.run(cds.ql.INSERT.into(entity('Proposal')).entries({proposalId,incidentId:options.incidentId||id,type:options.type||type,payload:JSON.stringify(payload),reason:'test',state:'Approved',createdAt:new Date().toISOString()}));await cds.db.run(cds.ql.INSERT.into(entity('Approval')).entries({approvalId,proposalId,approverRole:role,decision:options.decision||'APPROVED',reason:'Reviewed synthetic containment',decidedBy:'TEST-APPROVER',decidedAt:new Date().toISOString()}));return approvalId;}
beforeAll(async()=>{const r=await api('/incidents',require('../docs/demo-incidents.json')[0]);expect(r.status).toBe(201);id=r.body.incident.incidentId;});
test.each([0,1,2,3])('mock action %i refuses missing, wrong role, action, incident and resource scope',async index=>{
 const [type,url,role,body]=requests()[index];
 for(const extra of [{},{approvalId:'MISSING'},{approvalId:await approval(type,role==='Manager'?'Quality':'Manager',body)},{approvalId:await approval(type,role,body,{incidentId:'TS-0001'})},{approvalId:await approval(type,role,body,{type:'WRONG_ACTION'})},{approvalId:await approval(type,role,{...body,toolId:'TOOL-A',batchIds:['BATCH-A-24']})},{approvalId:await approval(type,role,body,{decision:'REJECTED'})}]){
  const r=await api(url,{...body,...extra},role);expect(r.status).toBe(409);expect(r.body.error.code).toBe('APPROVAL_REQUIRED');
 }
});
test.each([0,1,2,3])('approved mock action %i changes only approved scope and writes audit/history/documents',async index=>{
 const [type,url,role,body]=requests()[index];const approvalId=await approval(type,role,body);
 const r=await api(url,{...body,approvalId},role);expect(r.status).toBe(200);expect(r.body._label).toBe('SIMULATED');expect(r.body._stub).toBe(false);expect(r.body._shapedLike).toBeTruthy();
 const docs=await cds.db.run(cds.ql.SELECT.from(entity('MockDocument')).where({incidentId:id,type}));expect(docs.length).toBeGreaterThan(0);
 expect((await cds.db.run(cds.ql.SELECT.from(entity('AuditLog')).where({incidentId:id,action:'MOCK_'+type}))).length).toBeGreaterThan(0);
 expect((await cds.db.run(cds.ql.SELECT.from(entity('ToolHistoryEvent')).where({toolId:'TOOL-B',refId:id}))).some(e=>JSON.parse(e.details).approvalId===approvalId)).toBe(true);
 if(type==='STOCK_BLOCK'){
  expect(r.body.items.map(x=>x.batchId)).toEqual(['BATCH-B-DUP']);expect(r.body.skipped).toEqual([{batchId:'BATCH-B-X72',reason:'SHIPPED'}]);
  const again=await api(url,{...body,approvalId},role);expect(again.body.items).toEqual([]);expect(again.body.alreadyBlocked[0].batchId).toBe('BATCH-B-DUP');
 }else if(type==='TOOL_RESTRICTION'){
  expect((await cds.db.run(cds.ql.SELECT.one.from(entity('Tool')).where({toolId:'TOOL-B'}))).state).toBe('Restricted');expect((await api(url,{...body,approvalId},role)).status).toBe(409);
 }else {
  const again=await api(url,{...body,approvalId},role);expect(again.body).toEqual(r.body);expect((await cds.db.run(cds.ql.SELECT.from(entity('MockDocument')).where({incidentId:id,type}))).length).toBe(docs.length);
 }
});
test('header impersonation does not bypass auth or approval',async()=>{
 const [,url,,body]=requests()[0];expect((await request(cds.app).post('/api'+url).set('x-system-call','workflow').send(body)).status).toBe(401);
 expect((await api(url,body,'Worker',{'x-system-call':'workflow'})).status).toBe(403);
 expect((await api(url,body,'Manager',{'x-system-call':'workflow'})).status).toBe(409);
});
test('in-process calls enforce actor and approval gates too',async()=>{
 const body=requests()[0][3];await expect(actions.maintenanceNotification(body,{id:'worker',role:'Worker'})).rejects.toMatchObject({status:403});
 await expect(actions.maintenanceNotification(body,{id:'manager',role:'Manager'})).rejects.toMatchObject({code:'APPROVAL_REQUIRED'});
 await expect(toolState.setState({toolId:'TOOL-A',state:'Restricted',incidentId:id,actor:'MGR',actorRole:'Manager',reason:'Missing approval'})).rejects.toMatchObject({code:'APPROVAL_REQUIRED'});
});
test('stock/document/audit changes roll back as one operation',async()=>{
 const [type,,role,base]=requests()[2],body={...base,batchIds:['BATCH-B-RECENT']};const approvalId=await approval(type,role,body);
 const before=(await cds.db.run(cds.ql.SELECT.from(entity('MockDocument')))).length;
 await expect(transaction(async tx=>{await actions.stockBlock({...body,approvalId},{id:'TEST',role},tx);throw new Error('abort mock operation');})).rejects.toThrow('abort mock');
 expect((await cds.db.run(cds.ql.SELECT.one.from(entity('InventoryStock')).where({batchId:'BATCH-B-RECENT'}))).stockStatus).toBe('UNRESTRICTED');expect((await cds.db.run(cds.ql.SELECT.from(entity('MockDocument')))).length).toBe(before);
});
test('production cannot use bypass and setting ENFORCE_APPROVALS alone never disables checks',async()=>{
 const saved={NODE_ENV:process.env.NODE_ENV,ENFORCE_APPROVALS:process.env.ENFORCE_APPROVALS,ALLOW_UNAPPROVED_MOCKS:process.env.ALLOW_UNAPPROVED_MOCKS};
 try{
  process.env.ENFORCE_APPROVALS='false';process.env.ALLOW_UNAPPROVED_MOCKS='false';await expect(actions.maintenanceNotification(requests()[0][3],{id:'TEST',role:'Manager'})).rejects.toMatchObject({code:'APPROVAL_REQUIRED'});
  process.env.NODE_ENV='production';process.env.ALLOW_UNAPPROVED_MOCKS='true';await expect(actions.maintenanceNotification(requests()[0][3],{id:'TEST',role:'Manager'})).rejects.toMatchObject({code:'APPROVAL_REQUIRED'});
 }finally{for(const[k,v]of Object.entries(saved))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
test('document pagination and rejected-action audit entries are real',async()=>{
 const get=url=>request(cds.app).get('/api'+url).set('x-demo-user','TEST').set('x-demo-role','Manager');
 expect((await get(`/mock/documents?incident=${id}&limit=1`)).body.documents).toHaveLength(1);
 expect((await get(`/mock/documents?incident=${id}&limit=101`)).status).toBe(400);
 expect((await get('/mock/documents')).status).toBe(400);
 const denied=await cds.db.run(cds.ql.SELECT.from(entity('AuditLog')).where({action:'ACTION_REJECTED'}));expect(denied.length).toBeGreaterThan(0);
});
