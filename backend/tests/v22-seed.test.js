const cds=require('@sap/cds'),request=require('supertest');
const seed=require('../db/seed/v22'),transfer=require('../srv/lib/data-transfer');
cds.test(__dirname+'/..');jest.setTimeout(30000);
const id=s=>seed.graph.prefix+s;
test('V22 graph inserts once, preserves every original row and has coherent API-derived closed and unresolved workflows',async()=>{
 const descriptors=transfer.entities(cds.model),baseline={};
 for(const d of descriptors)baseline[d.name]=transfer.canonicalRows(await cds.db.run(cds.ql.SELECT.from(d.name)),d);
 const preview=await cds.db.tx(tx=>seed.apply(tx,{preview:true}));expect(preview.planned).toBe(738);expect(preview.inserted).toBe(0);
 expect(await cds.db.run(cds.ql.SELECT.from('toolsathi.UserProfile'))).toHaveLength(0);
 expect((await cds.db.tx(tx=>seed.apply(tx))).inserted).toBe(738);
 expect((await cds.db.tx(tx=>seed.apply(tx))).inserted).toBe(0);
 for(const d of descriptors){
   const current=transfer.canonicalRows(await cds.db.run(cds.ql.SELECT.from(d.name)),d);
   for(const row of baseline[d.name])expect(current).toContainEqual(row);
 }
 const profiles=await cds.db.run(cds.ql.SELECT.from('toolsathi.UserProfile'));
 for(const [role,count]of [['Worker',20],['Manager',10],['Technician',15],['Verifier',5]])expect(profiles.filter(p=>p.role===role)).toHaveLength(count);
 const statuses=[];
 for(const scenario of seed.graph.scenarios){
   const response=await request(cds.app).get('/api/v2/issues/'+scenario.incidentId).set('x-demo-role','Quality').set('x-demo-user',id('QUALITY'));
   expect(response.status).toBe(200);const detail=response.body;statuses.push(detail.issue.status);expect(detail.issue.status).toBe(scenario.expected);
   if(scenario.solved){
     expect(detail.issue.status).toBe('Closed');expect(detail.repairs).toHaveLength(1);
     expect(detail.repairs[0].verifiedBy).not.toBe(detail.repairs[0].loggedBy);
     expect(detail.repairs[0].verifiedBy).not.toBe(detail.issue.workOrder.reviewedBy);
     expect(detail.approvals.some(a=>a.decision==='APPROVED')).toBe(true);
     expect(detail.timeline.some(a=>a.action==='REPAIR_STARTED')).toBe(true);
     expect(detail.timeline.some(a=>a.action==='WORK_REVIEW')).toBe(true);
   }
 }
 expect(statuses.filter(s=>s==='Closed')).toHaveLength(5);expect(new Set(statuses.slice(5)).size).toBe(5);
});
test('changed namespaced rows reject the complete seed transaction rather than overwriting live work',async()=>{
 const userId=id('WORKER-01');await cds.db.run(cds.ql.UPDATE('toolsathi.UserProfile').set({displayName:'Changed after seed'}).where({userId}));
 await expect(cds.db.tx(tx=>seed.apply(tx))).rejects.toMatchObject({code:'V22_IDENTIFIER_CONFLICT'});
 expect((await cds.db.run(cds.ql.SELECT.one.from('toolsathi.UserProfile').where({userId}))).displayName).toBe('Changed after seed');
});
