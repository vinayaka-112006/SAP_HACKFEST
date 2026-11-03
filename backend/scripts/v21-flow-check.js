// Real provider HTTP checks; all incidents live only in an isolated in-memory SQLite child.
const config=require('../srv/lib/database-config');config.loadEnvironment();
const {fork}=require('child_process'),path=require('path'),fs=require('fs');
const report={at:new Date().toISOString(),database:'isolated SQLite memory',remoteDatabaseWrites:false,microphoneTested:false};
const child=fork(path.join(config.projectRoot,'srv/server.js'),['--database=sqlite'],{cwd:config.projectRoot,silent:true,env:{...process.env,NODE_ENV:'development',DATABASE_MODE:'sqlite',CDS_REQUIRES_DB_CREDENTIALS_URL:':memory:',PORT:'0',AUTH_MODE:'header',V2_SYNTHETIC_FIXTURES:'false'}});
const headers={'content-type':'application/json','x-demo-user':'V21-SYNTHETIC-LIVE-CHECK','x-demo-role':'Worker'};
async function ready(){return new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('LOCAL_STARTUP_TIMEOUT')),30000);child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/ToolSathi SIMULATED: (http:\/\/localhost:\d+)\/api/);if(match){clearTimeout(timer);resolve(match[1]);}});child.once('exit',()=>{clearTimeout(timer);reject(Error('LOCAL_STARTUP_FAILED'));});});}
async function main(){
 const base=await ready();async function post(route,body){const response=await fetch(base+'/api'+route,{method:'POST',headers,body:JSON.stringify(body)});const value=await response.json();if(!response.ok)throw Object.assign(new Error('Live check failed'),{code:value.error?.code});return value;}
 try{
  let session=await post('/v2/conversations',{toolId:'TOOL-B',language:'en'});
  session=await post(`/v2/conversations/${session.sessionId}/messages`,{version:session.version,text:'Synthetic test: the torque tool leaves bolts loose.',reason:true});
  report.firstTurn={version:session.version,provider:session.providerStatus,questionPresent:!!session.question,missingFields:session.missingFields};
  const audio=await post(`/v2/conversations/${session.sessionId}/readback`,{reviewed:true});report.tts={verified:!!audio.audio,provider:audio.providerStatus};
  if(audio.audio){const response=await fetch(base+'/api/ai/transcribe?language=en',{method:'POST',headers:{...headers,'content-type':audio.mimeType},body:Buffer.from(audio.audio,'base64')});const transcript=await response.json();report.stt={status:response.status,verified:!!transcript.transcript,mimeType:audio.mimeType};}
  session=await post(`/v2/conversations/${session.sessionId}/messages`,{version:session.version,text:'Synthetic test: it started ten minutes ago. We stopped the tool and production. There is no immediate safety concern and no error code. I informed my supervisor.',reason:true});
  report.secondTurn={version:session.version,provider:session.providerStatus,missingFields:session.missingFields,contextPreserved:session.messages.some(m=>m.text.includes('bolts loose'))};
  const structured=await post('/ai/structure-report',{toolId:'TOOL-B',language:'en',rawText:'Synthetic test: the torque tool leaves bolts loose. We stopped it ten minutes ago.'});report.legacyStructuring={provider:structured.aiProvider,model:structured.modelVersion,schemaValidated:!!structured.requiresWorkerConfirmation};
  const submitted=await post(`/v2/conversations/${session.sessionId}/submit`,{version:session.version,confirmed:true,description:'Synthetic operator-reviewed torque report'});report.confirmed={state:submitted.incident.state,originalRetained:submitted.incident.rawText.includes('bolts loose')};
  const chat=await post('/v2/chat',{message:'What is the status of this incident?',language:'en',incidentId:submitted.incident.incidentId,generate:true});report.groundedChat={provider:chat.providerStatus,sourceCount:chat.sources.length,retrievalMethod:chat.retrieval?.method,answerNonempty:!!chat.answer};
 }catch(e){report.failure=e.code||'CHECK_FAILED';}
 fs.writeFileSync(path.resolve(config.projectRoot,'../docs/v2.1-live-flow.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
main().catch(()=>{console.error('Local provider flow check failed.');process.exitCode=1;}).finally(()=>{if(child.connected)child.send({type:'toolsathi:shutdown'});else child.kill();setTimeout(()=>{if(child.exitCode===null)child.kill();},3000).unref();});
