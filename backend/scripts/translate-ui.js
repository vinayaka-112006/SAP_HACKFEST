const fs=require('fs');require('../srv/lib/database-config').loadEnvironment();
const {createReasoningClient}=require('../srv/lib/reasoning');
const client=createReasoningClient();
const root=require('path').resolve(__dirname,'../../frontend/src/features/v2');
const source=JSON.parse(fs.readFileSync(root+'/ui-source.json','utf8'));
const file=root+'/ui-translations.json',translations=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
async function main(){
  const missing=source.filter(key=>!translations[key]);
  for(let i=0;i<missing.length;i+=8){
    const batch=missing.slice(i,i+8);
    const schema={type:'object',properties:{items:{type:'array',items:{type:'object',properties:{id:{type:'integer'},hi:{type:'string'},kn:{type:'string'}},required:['id','hi','kn'],additionalProperties:false}}},required:['items'],additionalProperties:false};
    let result;
    for(let attempt=0;attempt<8;attempt++)try{result=await client.complete([{role:'system',content:'Translate static manufacturing application interface text into clear Hindi and Kannada. Preserve placeholders, identifiers, ToolSathi/SAP branding and numbers. Use potentially exposed terminology, never claim damaged products or real SAP execution. Return one item per numeric id. Preserve each numeric id. These are static UI resources, not incident statements.'},{role:'user',content:JSON.stringify(batch.map((text,id)=>({id,text})))}],schema);break;}catch(e){if(attempt===7)throw e;await new Promise(resolve=>setTimeout(resolve,e.code==='AI_RATE_LIMITED'?30000:2500));}
    const items=JSON.parse(result.content).items;
    for(const [index,key] of batch.entries()){const item=items.find(x=>x.id===index);if(!item?.hi?.trim()||!item?.kn?.trim())throw Error('Incomplete translation batch');translations[key]={hi:item.hi,kn:item.kn};}
    fs.writeFileSync(file,JSON.stringify(translations,null,2)+'\n');console.log('Static resources '+Math.min(i+8,missing.length)+'/'+missing.length);await new Promise(resolve=>setTimeout(resolve,8000));
  }
}
main().catch(e=>{console.error(e.code||'TRANSLATION_RESOURCE_FAILED');process.exitCode=1;});
