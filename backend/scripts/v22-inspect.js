// Read-only schema ownership/count inspection. No row contents or credentials exported.
const config=require('../srv/lib/database-config');
config.loadEnvironment();process.chdir(config.projectRoot);
const fs=require('node:fs'),cds=require('@sap/cds'),operations=require('../srv/lib/hana-operations'),transfer=require('../srv/lib/data-transfer');
async function main(){
  let db;try{
    const selected=config.configureDatabase(cds,{mode:'hana'});config.assertTarget(selected);
    const model=await cds.load('db/schema.cds');db=await cds.connect.to('db',{...cds.env.requires.db,model,silent:true});
    const metadata=await operations.inspect(db,selected.schema);operations.assertExclusive(metadata,model);
    const tables=new Set(metadata.objects.filter(o=>o.OBJECT_TYPE==='TABLE').map(o=>o.OBJECT_NAME));
    const descriptors=transfer.entities(model),counts={};
    for(const descriptor of descriptors.filter(e=>tables.has(e.table.toUpperCase()))){const [row]=await db.run(cds.ql.SELECT.from(descriptor.name).columns('count(*) as records'));counts[descriptor.name]=Number(row.records);}
    const result={checkedAt:new Date().toISOString(),remoteWrites:false,exclusiveSchema:true,targetSchema:selected.schema,counts,totalRecords:Object.values(counts).reduce((a,b)=>a+b,0),existingTables:Object.keys(counts).length,missingTables:descriptors.filter(e=>!tables.has(e.table.toUpperCase())).map(e=>e.name)};
    fs.writeFileSync('../docs/v2.2-hana-inspection.json',JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({...result,counts:undefined},null,2));
  }finally{await db?.disconnect();}
}
main().catch(e=>{console.error(JSON.stringify(config.diagnostic(e)));process.exitCode=1;});
