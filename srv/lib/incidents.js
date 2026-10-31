const {cds,entity,decode}=require('./db');const {fail,required}=require('./http');
async function find(tx,id){const row=await tx.run(cds.ql.SELECT.one.from(entity('Incident')).where({incidentId:id}));if(!row)fail(404,'INCIDENT_NOT_FOUND','Incident not found');return decode(row);}
async function tool(tx,id){const row=await tx.run(cds.ql.SELECT.one.from(entity('Tool')).where({toolId:id}));if(!row)fail(404,'TOOL_NOT_FOUND','Tool not found');return row;}
function validate(body){required(body,['toolId','reporterId','language','rawText']);
 for(const key of ['toolId','reporterId','language','category','suggestedNcCode','modelVersion'])if(body[key]!=null&&(typeof body[key]!=='string'||body[key].length>120))fail(400,'INVALID_INPUT',`Invalid ${key}`);
 if(!['kn','hi','en'].includes(body.language))fail(400,'INVALID_INPUT','Unsupported language');
 for(const key of ['translatedText','photoRef'])if(body[key]!=null&&typeof body[key]!=='string')fail(400,'INVALID_INPUT',`Invalid ${key}`);
 if(body.confidence!=null&&(typeof body.confidence!=='number'||body.confidence<0||body.confidence>1))fail(400,'INVALID_INPUT','Confidence must be between zero and one');
 if(body.missingFields!=null&&(!Array.isArray(body.missingFields)||!body.missingFields.every(x=>typeof x==='string')))fail(400,'INVALID_INPUT','missingFields must be an array of strings');
 if(body.reportedAt!=null&&(typeof body.reportedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(body.reportedAt)||!Number.isFinite(Date.parse(body.reportedAt))))fail(400,'INVALID_INPUT','reportedAt must be an ISO UTC timestamp ending in Z');
}
module.exports={find,tool,validate};
