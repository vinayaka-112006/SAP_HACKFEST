// Print only allowlisted diagnostics; never provider bodies, credentials or connection identities.
const config=require('../srv/lib/database-config');
config.loadEnvironment();process.chdir(config.projectRoot);
const fs=require('node:fs');
const output={checkedAt:new Date().toISOString(),remoteWrites:false};
async function main(){
  if(!process.argv.includes('--providers-only')&&!process.argv.includes('--hana-readonly'))throw Error('Choose a narrow check mode');
  if(process.argv.includes('--providers-only')){
  const {createReasoningClient}=require('../srv/lib/reasoning');
  const client=createReasoningClient();
  try{const model=await client.model();const response=await client.complete([{role:'user',content:'Synthetic provider connectivity test. Return {ok:true}.'}],{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false});output.groq={connected:true,model,schemaValid:JSON.parse(response.content).ok===true};}catch(e){output.groq={connected:false,code:e.code||'CHECK_FAILED'};}
  output.sarvam={languages:[],microphoneTested:false};
  for(const [language,text] of [['en','This is a synthetic ToolSathi speech connectivity check.'],['kn','ಇದು ಟೂಲ್ ಸಾಥಿ ಧ್ವನಿ ಸಂಪರ್ಕದ ಪರೀಕ್ಷೆ.'],['hi','यह टूल साथी आवाज़ कनेक्शन की जाँच है।']]){
    try{const audio=await client.speak(text,language);const transcript=await client.transcribe(Buffer.from(audio.audio,'base64'),audio.mimeType,language);output.sarvam.languages.push({language,tts:true,stt:true,audioBytes:Buffer.from(audio.audio,'base64').length,transcriptNonempty:!!transcript.transcript});}
    catch(e){output.sarvam.languages.push({language,verified:false,code:e.code||'CHECK_FAILED'});}
  }
  }
  if(process.argv.includes('--hana-readonly')) {
  let db;
  try{
    const cds=require('@sap/cds'),operations=require('../srv/lib/hana-operations'),transfer=require('../srv/lib/data-transfer');
    const selected=config.configureDatabase(cds,{mode:'hana'});config.assertTarget(selected);
    const model=await cds.load('db/schema.cds');db=await cds.connect.to('db',{...cds.env.requires.db,model,silent:true});
    const metadata=await operations.inspect(db,selected.schema);
    const present=new Set(metadata.objects.filter(o=>o.OBJECT_TYPE==='TABLE').map(o=>o.OBJECT_NAME));
    const descriptors=transfer.entities(model).filter(e=>present.has(e.table.toUpperCase()));
    const counts={};for(const entity of descriptors){const [row]=await db.run(cds.ql.SELECT.from(entity.name).columns('count(*) as records'));counts[entity.name]=Number(row.records);}
    let exclusive=true;try{operations.assertExclusive(metadata,model);}catch{exclusive=false;}
    const found=await db.run(cds.ql.SELECT.one.from('toolsathi.Incident').columns('incidentId').where({incidentId:'TS-00078'}));
    output.hana={connected:true,tables:descriptors.length,counts,exclusiveSchema:exclusive,backupVerified:false,incidentTS00078Exists:!!found};
  }catch(e){output.hana={connected:false,code:config.diagnostic(e).code};}finally{await db?.disconnect();}
  }
  fs.mkdirSync('../docs',{recursive:true});fs.writeFileSync('../docs/v2.1-'+(process.argv.includes('--providers-only')?'provider':'hana')+'-checks.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
}
main().catch(()=>{console.error('Verification failed; inspect safe diagnostics.');process.exitCode=1;});
