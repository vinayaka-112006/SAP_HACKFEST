// Offline scenario compiler. Never connects to HANA or reads backend/.env.
// Operational records are produced by the real HTTP handlers in fresh SQLite.
process.env.NODE_ENV='test';process.env.CDS_ENV='test';process.env.DATABASE_MODE='sqlite';
process.env.AUTH_MODE='header';process.env.V2_WORKFLOW_ENABLED='true';process.env.V22_WORKFLOW_ENABLED='true';
process.env.CDS_CONFIG='{}';process.env.VCAP_SERVICES='{}';
process.env.CDS_REQUIRES_DB_KIND='sqlite';process.env.CDS_REQUIRES_DB_IMPL='@cap-js/sqlite';process.env.CDS_REQUIRES_DB_CREDENTIALS_URL=':memory:';
process.chdir(require('node:path').resolve(__dirname,'..'));
const fs=require('node:fs'),cds=require('@sap/cds'),express=require('express'),request=require('supertest');
const transfer=require('../srv/lib/data-transfer');
const version=process.argv.find(a=>a.startsWith('--version='))?.slice(10)||'20261103';
const start=process.argv.find(a=>a.startsWith('--start='))?.slice(8)||'2026-11-03T06:00:00.000Z';
if(!/^[0-9]{8}[A-Z0-9]{0,8}$/.test(version)||!Number.isFinite(Date.parse(start)))throw Error('Explicit valid scenario version and ISO start are required');
const prefix='V22-'+version+'-',id=s=>prefix+s,RealDate=Date;
let clock=RealDate.parse(start);
// Only this isolated compiler uses a scenario clock. The application clock is unchanged.
global.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}};
const at=new Date().toISOString(),shiftEnd=new Date(clock+36*3600000).toISOString(),expiry=new Date(clock+365*86400000).toISOString();
async function main(){
 const model=await cds.load('db/schema.cds');cds.model=model;
 const db=await cds.connect.to('db',{kind:'sqlite',impl:'@cap-js/sqlite',credentials:{url:':memory:'},model});cds.db=db;
 if(db.kind!=='sqlite')throw Error('Scenario compiler requires isolated SQLite');
 await cds.deploy(model).to(db);
 const descriptors=transfer.entities(model),baseline={};
 const key=(row,d)=>JSON.stringify(d.keys.map(k=>row[k]));
 for(const d of descriptors)baseline[d.name]=new Set((await db.run(cds.ql.SELECT.from(d.name))).map(r=>key(r,d)));
 const app=express();app.use(express.json());require('../srv/lib/router-loader').loadRouters(app);app.use(require('../srv/lib/errors'));
 const calls=[];
 async function call(method,url,body,role='Manager',actor='MANAGER-01'){
   clock+=1000;
   const response=await request(app)[method]('/api'+url).set('x-demo-user',id(actor)).set('x-demo-role',role).send(body);
   if(response.status>=400)throw Error(method+' '+url+' '+response.status+' '+JSON.stringify(response.body.error));
   calls.push({method,path:url,actor:id(actor),role,status:response.status,at:new Date().toISOString()});return response.body;
 }
 const rows={},add=(table,row)=>(rows[table]||=[]).push(row),pad=i=>String(i).padStart(2,'0');
 const centers=['Brake assembly','Machining','Packaging','Final inspection','Quality testing'];
 const profile=(userId,role,i,center)=>{
   add('UserProfile',{userId:id(userId),displayName:'SYNTHETIC '+role+' '+i,role,language:['en','kn','hi'][(i-1)%3],workCenter:id('WC-'+center),team:'V22 SYNTHETIC '+centers[center-1],status:'Active',createdAt:at});
   add('UserProfileDetail',{userId:id(userId),shift:'Version '+version+' demonstration shift',shiftStartsAt:at,shiftEndsAt:shiftEnd,updatedAt:at});
 };
 profile('ADMIN','Administrator',1,1);profile('QUALITY','Quality',1,1);
 for(let i=1;i<=20;i++){
   const center=Math.floor((i-1)/4)+1;profile('WORKER-'+pad(i),'Worker',i,center);
   const eligible=i%4!==3;
   add('WorkforceProfile',{workerId:id('WORKER-'+pad(i)),homeToolId:id((i%4===0?'BACKUP-':'TOOL-')+center),skills:JSON.stringify([id(eligible?'SKILL-CROSS':'SKILL-LOCAL')]),certifications:JSON.stringify([id('CERT-CROSS')]),safetyAuthorizations:JSON.stringify([id('SAFETY')]),certificationExpiresAt:i===19?at:expiry,shiftEndsAt:shiftEnd,available:true});
 }
 for(let i=1;i<=10;i++)profile('MANAGER-'+pad(i),'Manager',i,(i-1)%5+1);
 for(let i=1;i<=15;i++)profile('TECH-'+pad(i),'Technician',i,(i-1)%5+1);
 for(let i=1;i<=5;i++)profile('VERIFIER-'+pad(i),'Verifier',i,i);
 for(let i=1;i<=5;i++){
   const toolType=id('TYPE-'+i),workCenter=id('WC-'+i);
   for(const kind of ['TOOL-','BACKUP-'])add('Tool',{toolId:id(kind+i),type:toolType,line:id('LINE-'+i),workCenter,state:'Active',calibrationDue:expiry.slice(0,10),usageCount:0,lastVerifiedGood:at});
   add('WorkStation',{stationId:id('STATION-'+i),workCenter,toolId:id('BACKUP-'+i),requiredSkill:id('SKILL-CROSS'),requiredCertification:id('CERT-CROSS'),safetyAuthorization:id('SAFETY'),materialsAvailable:i!==5,slots:2,unitsPerHour:12+i,setupMinutes:10});
   add('WorkStationOperation',{stationId:id('STATION-'+i),travelMinutes:5,bottleneckUnitsPerHour:12,approvedBy:id('MANAGER-'+pad(i)),updatedAt:at});
   add('ProductionDemand',{orderId:id('ORDER-'+i),stationId:id('STATION-'+i),requiredQuantity:200,completedQuantity:20,dueAt:shiftEnd});
   add('SopDoc',{docId:id('DOC-'+i),title:'SYNTHETIC '+centers[i-1]+' observation guide',section:'Training only',text:'SYNTHETIC illustrative record, not an approved equipment procedure. Record observable symptoms, isolate only under approved plant procedures and request qualified technical review. No engineering tolerances or operating authorization are supplied.'});
 }
 await db.tx(async tx=>{for(const [table,entries]of Object.entries(rows))await tx.run(cds.ql.INSERT.into('toolsathi.'+table).entries(entries));await require('../srv/lib/v2').event(tx,{id:id('ADMIN'),role:'Administrator'},'V22_SYNTHETIC_BASE_CREATED','Explicit isolated scenario compilation',{version,start,shiftEnd});});
 for(let i=1;i<=10;i++)await call('put','/v2/authorizations/'+id('MANAGER-'+pad(i)),{workCenters:[id('WC-'+((i-1)%5+1)),id('WC-'+(i%5+1))],canAssign:true,canVerify:false,expiresAt:expiry,reason:'SYNTHETIC scoped demonstration authority'},'Administrator','ADMIN');
 for(let i=1;i<=5;i++){
   await call('put','/v2/authorizations/'+id('VERIFIER-'+pad(i)),{workCenters:[id('WC-'+i)],canAssign:i===1,canVerify:true,expiresAt:expiry,reason:'SYNTHETIC independent verification authority'},'Administrator','ADMIN');
   await call('put','/v2/equipment-requirements/'+id('TYPE-'+i),{skill:id('SKILL-'+i),certification:id('CERT-'+i),safetyAuthorization:id('SAFETY')},'Administrator','ADMIN');
   for(let j=0;j<3;j++)await call('put','/v2/qualifications/'+id('TECH-'+pad(i+j*5)),{toolType:id('TYPE-'+i),workCenter:id('WC-'+i),skill:id(j===2?'SKILL-MISMATCH':'SKILL-'+i),certification:id('CERT-'+i),safetyAuthorization:id('SAFETY'),expiresAt:expiry,availableUntil:shiftEnd,maxAssignments:j===0?2:1},'Administrator','ADMIN');
   for(let j=1;j<=3;j++)await call('put','/v2/parts/'+id('PART-'+i+'-'+j),{name:'SYNTHETIC training component '+j,toolType:id('TYPE-'+i),location:id('STORES'),quantity:j===3?0:10,reorderThreshold:2},'Administrator','ADMIN');
 }
 const scenarios=[];
 for(const solved of [true,false])for(let i=1;i<=5;i++){
   const manager='MANAGER-'+pad(i),worker='WORKER-'+pad((i-1)*4+1),tech='TECH-'+pad(i),verifier='VERIFIER-'+pad(i),toolId=id('TOOL-'+i);
   const words=['Observed vibration during a synthetic inspection','ಕೃತಕ ಪರೀಕ್ಷೆಯಲ್ಲಿ ಕಂಪನ ಕಂಡುಬಂದಿದೆ','कृत्रिम निरीक्षण में कंपन देखा गया'];
   const created=await call('post','/incidents',{toolId,reporterId:id(worker),language:['en','kn','hi'][(i-1)%3],rawText:'SYNTHETIC: '+words[(i-1)%3],category:id('OBSERVATION')},'Worker',worker);
   const incidentId=created.incident.incidentId,base='/v2/incidents/'+incidentId;
   await call('post','/incidents/'+incidentId+'/confirm',{confirmedBy:id(worker)},'Worker',worker);
   if(!solved&&i===1){scenarios.push({incidentId,expected:'Awaiting manager review',solved});continue;}
   await call('post',base+'/triage',{severity:'High',urgency:'Urgent',shift:'Synthetic version '+version,reason:'SYNTHETIC manager reviewed observed fault',version:0,escalate:!solved&&i===2},'Manager',manager);
   const proposal=await call('post','/incidents/'+incidentId+'/proposals',{type:'TOOL_RESTRICTION',reason:'SYNTHETIC reviewed isolation proposal'},'Manager',manager);
   const approved=await call('post','/approvals/'+proposal.proposal.proposalId+'/decision',{decision:'APPROVED',reason:'SYNTHETIC scope and evidence reviewed'},'Manager',manager);
   await call('post','/mock/dm/tool-restrictions',{incidentId,toolId,action:'RESTRICT',reason:'SYNTHETIC reviewed isolation proposal',approvalId:approved.approval.approvalId},'Manager',manager);
   if(!solved&&i===2){scenarios.push({incidentId,expected:'Awaiting authorized assigner',solved});continue;}
   await call('post',base+'/assign',{technicianId:id(tech)},'Manager',manager);
   await call('post',base+'/work',{action:'accept',findings:'SYNTHETIC scope accepted'},'Technician',tech);
   if(!solved&&i===4){await call('post',base+'/work',{action:'blockParts',findings:'SYNTHETIC compatible component unavailable',reason:'SYNTHETIC stores confirmed zero stock'},'Technician',tech);scenarios.push({incidentId,expected:'Blocked by spare parts',solved});continue;}
   await call('post',base+'/parts',{partId:id('PART-'+i+'-1'),quantity:1},'Technician',tech);
   const repair=await call('post','/incidents/'+incidentId+'/repairs',{description:'SYNTHETIC inspection and component replacement'},'Technician',tech),repairId=repair.repair.repairId;
   if(!solved&&i===3){scenarios.push({incidentId,expected:'Repair in progress',solved});continue;}
   await call('post','/repairs/'+repairId+'/complete',{testReadings:[{name:'SYNTHETIC inspection reading',value:'12',unit:'illustrative units',expected:'Illustration only, not an approved tolerance',evidenceRef:id('MEASUREMENT-'+(solved?'CLOSED-':'OPEN-')+i),passed:true}]},'Technician',tech);
   await call('post',base+'/work',{action:'submit',findings:'SYNTHETIC measurement evidence supplied',repairId},'Technician',tech);
   await call('post',base+'/work',{action:'review',reason:'SYNTHETIC completion evidence reviewed'},'Manager',manager);
   if(solved){await call('post','/incidents/'+incidentId+'/verify-return',{repairId},'Verifier',verifier);await call('post','/incidents/'+incidentId+'/close',{reason:'SYNTHETIC independently verified repair'},'Manager',manager);}
   scenarios.push({incidentId,expected:solved?'Closed':'Awaiting verification',solved});
 }
 const data={},mapping=new Map();
 for(const d of descriptors){
   if(d.name==='toolsathi.Counter')continue;
   const added=(await db.run(cds.ql.SELECT.from(d.name))).filter(r=>!baseline[d.name].has(key(r,d)));
   if(!added.length)continue;data[d.name]=transfer.canonicalRows(added,d);
   for(const [index,row]of data[d.name].entries())for(const field of [...d.keys,...(d.name==='toolsathi.RepairWorkOrder'?['workOrderId']:[])]){
     const value=row[field];if(typeof value==='string'&&!value.startsWith(prefix)&&!mapping.has(value))mapping.set(value,id(d.name.slice(10)+'-'+pad(index+1)));
   }
 }
 const pattern=new RegExp([...mapping.keys()].sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
 const remap=value=>JSON.parse(JSON.stringify(value).replace(pattern,s=>mapping.get(s)));
 const output={format:'toolsathi-v22-scenario-v1',synthetic:true,version,prefix,start:at,shiftEnd,expiry,clockPolicy:'Fixed explicit scenario dates; never extended at application startup',data:remap(data),scenarios:remap(scenarios),workflowRequests:remap(calls)};
 output.manifest=transfer.manifest(output.data,descriptors.filter(d=>output.data[d.name]));
 fs.writeFileSync('db/seed/v22-scenario.json',JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({version,records:Object.values(output.data).reduce((n,r)=>n+r.length,0),workflowRequests:calls.length,scenarios:output.scenarios,remoteWrites:false},null,2));
 await db.disconnect();
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>{global.Date=RealDate;});
