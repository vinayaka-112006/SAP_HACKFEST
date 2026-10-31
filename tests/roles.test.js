const cds=require('@sap/cds');const request=require('supertest');const {roles}=require('../srv/lib/auth');
cds.test(__dirname+'/..');jest.setTimeout(30000);
const req=(method,url,role,body)=>{let r=request(cds.app)[method]('/api'+url).set('x-demo-user','ROLE-TEST').set('x-demo-role',role);return body===undefined?r:r.send(body);};
for(const role of roles)test(`${role} role matrix on all implemented endpoint classes`,async()=>{
 const canReport=['Worker','Manager'].includes(role),canReview=['Manager','Quality','Verifier'].includes(role),canMock=['Manager','Quality'].includes(role);
 const create=await req('post','/incidents',role,require('../docs/demo-incidents.json')[0]);expect(create.status).toBe(canReport?201:403);
 expect((await req('post','/incidents/TS-0001/confirm',role,{confirmedBy:'TEST'})).status).toBe(canReport?409:403);
 for(const url of ['/tools','/tools/TOOL-B/history','/incidents/TS-0001','/mock/documents?incident=TS-0001'])expect((await req('get',url,role)).status).toBe(200);
 expect((await req('get','/audit?incident=TS-0001',role)).status).toBe(canReview?200:403);
 expect((await req('get','/incidents/TS-0001/trace?window=24',role)).status).toBe(canReview?200:403);
 for(const url of ['/mock/s4/maintenance-notifications','/mock/s4/quality-notifications','/mock/s4/stock-blocks','/mock/dm/tool-restrictions'])expect((await req('post',url,role,{})).status).toBe(canMock?400:403);
});
test('unknown role and comma-separated escalation are refused',async()=>{
 for(const role of ['Admin','Worker,Manager'])expect((await req('get','/tools',role)).status).toBe(403);
});
test('XSUAA mode fails closed without verified token or binding',async()=>{
 const saved=process.env.AUTH_MODE;try{process.env.AUTH_MODE='xsuaa';
 expect((await req('get','/tools','Manager')).status).toBe(401);
 const r=await request(cds.app).get('/api/tools').set('Authorization','Bearer unverified.jwt.claims').set('x-demo-user','MGR').set('x-demo-role','Manager');expect(r.status).toBe(503);expect(r.body.error.message).toBe('Internal server error');
 }finally{if(saved===undefined)delete process.env.AUTH_MODE;else process.env.AUTH_MODE=saved;}
});
test('header mode is unavailable in production',async()=>{
 const saved={NODE_ENV:process.env.NODE_ENV,AUTH_MODE:process.env.AUTH_MODE};try{process.env.NODE_ENV='production';process.env.AUTH_MODE='header';expect((await req('get','/tools','Manager')).status).toBe(503);}finally{for(const[k,v]of Object.entries(saved))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
