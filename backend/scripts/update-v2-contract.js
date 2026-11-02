const fs=require('node:fs');
const schemas={
  string:{type:'string',minLength:1,maxLength:120},long:{type:'string',minLength:1,maxLength:4000},
  language:{type:'string',enum:['en','kn','hi']},boolean:{type:'boolean'},version:{type:'integer',minimum:0},
};
const contracts=[
  ['get','/v2/system','Manager Administrator','',''],
  ['post','/v2/system/check','Administrator','',''],
  ['get','/v2/incidents/{id}/workforce','Manager','',''],
  ['post','/v2/incidents/{id}/workforce/assign','Manager','workerId stationId minutes reason',''],
  ['post','/v2/workforce/{id}/return','Manager','reason',''],
  ['post','/v2/register','Any authenticated role','displayName language workCenter team','invitationId'],
  ['get','/v2/me','Any authenticated role','',''],
  ['post','/v2/invitations','Administrator','userId role',''],
  ['put','/v2/qualifications/{userId}','Administrator','toolType workCenter skill certification expiresAt safetyAuthorization availableUntil maxAssignments',''],
  ['put','/v2/equipment-requirements/{type}','Administrator','skill certification safetyAuthorization',''],
  ['put','/v2/parts/{id}','Administrator','name toolType location quantity reorderThreshold',''],
  ['get','/v2/incidents/{id}/review','Manager Quality Verifier; assigned Technician','',''],
  ['post','/v2/incidents/{id}/information-request','Manager','message',''],
  ['post','/v2/incidents/{id}/information','Owning Worker','message',''],
  ['get','/v2/incidents/{id}/technicians','Manager','',''],
  ['post','/v2/incidents/{id}/assign','Manager','technicianId',''],
  ['get','/v2/work-orders','Manager Quality Verifier; Technician sees own','',''],
  ['post','/v2/incidents/{id}/work','Assigned Technician / Manager review','action','findings repairId'],
  ['get','/v2/incidents/{id}/duplicates','Manager Quality','',''],
  ['post','/v2/incidents/{id}/relationship','Manager','canonicalId decision reason',''],
  ['get','/v2/incidents/{id}/repair-context','Manager or assigned Technician','',''],
  ['post','/v2/incidents/{id}/repair-guidance','Manager or assigned Technician','',''],
  ['post','/v2/incidents/{id}/parts','Assigned Technician','partId quantity',''],
  ['post','/v2/incidents/{id}/parts/{partId}/decision','Assigned Technician','action',''],
  ['post','/v2/conversations','Worker Manager','toolId language',''],
  ['get','/v2/conversations/{id}','Session owner Worker Manager','',''],
  ['get','/v2/conversations/{id}/duplicates','Session owner Worker Manager','',''],
  ['post','/v2/conversations/{id}/readback','Session owner Worker Manager','reviewed',''],
  ['post','/v2/conversations/{id}/messages','Session owner Worker Manager','version text','facts extract reason'],
  ['post','/v2/conversations/{id}/submit','Session owner Worker Manager','version confirmed description','category translatedText reportedAt'],
  ['post','/v2/chat','Any authenticated role; object and tool permissions enforced','message language','incidentId generate tool'],
];
function property(key){
  if(['extract','generate','confirmed','reviewed','reason'].includes(key))return key==='reason'?schemas.long:schemas.boolean;
  if(key==='language')return schemas.language;
  if(key==='version')return schemas.version;
  if(['maxAssignments','quantity','reorderThreshold'].includes(key))return {type:'integer',minimum:0};
  if(key==='facts')return {type:'object',additionalProperties:{oneOf:[{type:'string',maxLength:1000},{type:'boolean'}]}};
  if(['message','text','description','findings','reason','translatedText'].includes(key))return schemas.long;
  return schemas.string;
}
function update(){
  const file='docs/openapi.yaml',api=JSON.parse(fs.readFileSync(file,'utf8'));
  api.paths['/tools'].get.responses['200'].content['application/json'].schema.properties.demoScenario={type:'object',nullable:true,description:'Verified original synthetic-v1 fixture clock from stored import audit and matching runs. Null when the fixture cannot be identified.',properties:{toolId:{type:'string'},reportedAt:{type:'string',format:'date-time'},synthetic:{type:'boolean'},source:{type:'string'},auditId:{type:'string'}}};
  for(const [method,path,roles,req,opt] of contracts){
    const fields=(req+' '+opt).trim().split(/\s+/).filter(Boolean);
    const parameters=[...path.matchAll(/\{([^}]+)\}/g)].map(([,name])=>({name,in:'path',required:true,schema:schemas.string}));
    if(path.endsWith('/duplicates'))parameters.push({name:'semantic',in:'query',schema:{type:'boolean'},description:'Request optional configured reasoning-provider comparison; failure retains deterministic results'});
    const responses={200:{description:'Persisted result or authorized read. Provider limitations are explicit in providerStatus / semanticStatus.',content:{'application/json':{schema:{type:'object',required:['_label','_stub'],properties:{_label:{type:'string',enum:['SIMULATED']},_stub:{type:'boolean',enum:[false]}},additionalProperties:true}}}}};
    for(const code of [400,401,403,404,409,429,500])responses[code]={description:{400:'Invalid input',401:'Authentication required',403:'Role, scope, invitation or object ownership denied',404:'Record not found',409:'State, idempotency conflict or reviewed V2 schema deployment required',429:'AI rate limited',500:'Database/internal error; no success claimed'}[code],content:{'application/json':{schema:{$ref:'#/components/schemas/Error'}}}};
    const operation={summary:path.split('/').slice(2).join(' ')+' ('+method+')',description:'Roles: '+roles+'. Reuses XSUAA; development headers are local demonstration only. No HANA migration is executed by this endpoint.',tags:['V2'],parameters,responses};
    if(method!=='get')operation.requestBody={required:true,content:{'application/json':{schema:{type:'object',additionalProperties:false,...(req?{required:req.split(' ')}:{}),properties:Object.fromEntries(fields.map(key=>[key,key==='reason'&&path.endsWith('/messages')?schemas.boolean:property(key)]))}}}};
    api.paths[path]||={};api.paths[path][method]=operation;
  }
  fs.writeFileSync(file,JSON.stringify(api,null,2)+'\n');
  const rows=contracts.map(([method,path,roles,req,opt])=>`| ${method.toUpperCase()} ${path} | ${roles} | ${req||'—'} | ${opt||'—'} |`);
  fs.writeFileSync('../docs/v2-api-contract.md','# V2 API contract\n\nGenerated from `backend/scripts/update-v2-contract.js`; exact schemas extend `backend/docs/openapi.yaml`. All paths below are relative to `/api`. Successful V2 endpoints return HTTP 200 and `_label: SIMULATED`, `_stub: false`. This labels the manufacturing demonstration; external AI calls use real adapters.\n\n| Method and path | Authority | Required body fields | Optional body fields |\n|---|---|---|---|\n'+rows.join('\n')+'\n\nErrors: 400 validation, 401 authentication, 403 role/scope/ownership, 404 missing record, 409 state/conflicting retry/schema not enabled, 429 rate limit, 500 database/internal. AI outages normally return explicit providerStatus/semanticStatus with usable manual or deterministic results; no provider success is fabricated.\n\nAssignment retries reuse the existing primary work order only for the same technician. Session submissions reuse the saved incident; stale versions reject message updates. Relationship decisions are terminal; reports and original authors remain intact. Inventory reservations and use/release decisions are transactional and repeat-safe. Manager assignment never creates a containment Approval. Every V2 mutation writes application audit history.\n\nFacts: symptom, onset, equipmentStopped, productionStopped, safety, actionTaken, errorCode. Values must be explicit text or boolean; `unknown` is supported. `/work` actions: accept, progress, submit, review. Submit requires findings and a passing repairId from the existing repair API. `/relationship` decisions: LINK, SEPARATE, INCORRECT. Parts decisions: USE, RELEASE. Chat read tools: status, queue, eligibility, history, parts, procedures, workOrders; technical and review tools enforce role checks.\n');
}
module.exports=update;
if(require.main===module)update();
