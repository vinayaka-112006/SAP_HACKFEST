const fs=require('fs'),path=require('path'),config=require('../srv/lib/database-config');
config.loadEnvironment();process.chdir(config.projectRoot);
async function main(){
 const cds=require('@sap/cds'),seed=require('../db/seed/v21'),operations=require('../srv/lib/hana-operations'),transfer=require('../srv/lib/data-transfer');
 const model=await cds.load('db/schema.cds'),graph=seed.build(),preview={synthetic:true,plannedRecords:Object.values(graph).reduce((n,rows)=>n+rows.length,0),tables:Object.fromEntries(Object.entries(graph).map(([name,rows])=>[name,rows.length])),traceImpact:'No baseline production/Tool B records modified',applied:false};
 if(!process.argv.includes('--hana-apply')){console.log(JSON.stringify(preview,null,2));return;}
 // A configuration switch is not approval. This command additionally requires a reviewed,
 // existing full backup with a valid manifest; it is never called automatically.
 const backupFile=process.env.HANA_V21_BACKUP;
 if(!backupFile)throw Object.assign(new Error('Verified recoverable backup required; remote update remains gated.'),{code:'HANA_BACKUP_REQUIRED'});
 const resolved=path.resolve(backupFile),root=path.resolve('../backup')+path.sep;
 if(!resolved.startsWith(root))throw Error('Backup must be in the ignored repository backup directory');
 const snapshot=JSON.parse(fs.readFileSync(resolved,'utf8'));
 const selected=config.configureDatabase(cds,{mode:'hana'});config.assertTarget(selected);
 const db=await cds.connect.to('db',{...cds.env.requires.db,model,silent:true});
 try{
  const metadata=await operations.inspect(db,selected.schema);operations.assertExclusive(metadata,model);
  const present=new Set(metadata.objects.filter(o=>o.OBJECT_TYPE==='TABLE').map(o=>o.OBJECT_NAME));
  const descriptors=transfer.entities(model).filter(e=>present.has(e.table.toUpperCase()));
  if(JSON.stringify(transfer.manifest(snapshot.data,descriptors))!==JSON.stringify(snapshot.manifest))throw Error('Backup manifest invalid');
  // Verify the complete backup against current records before any CREATE or INSERT.
  const current={};for(const e of descriptors)current[e.name]=await db.run(transfer.readQuery(cds,e,'hana'));
  if(JSON.stringify(transfer.manifest(current,descriptors))!==JSON.stringify(snapshot.manifest))throw Error('Backup is stale; no remote writes performed');
  await operations.deploy(db,cds,model,selected,{apply:true});
  const result=await db.tx(tx=>seed.apply(tx));
  console.log(JSON.stringify({...preview,applied:true,...result}));
 }finally{await db.disconnect();}
}
main().catch(e=>{console.error(JSON.stringify({code:e.code||'HANA_V21_UPDATE_BLOCKED',message:/^HANA_/.test(e.code||'')?e.message:'Backup, target or schema validation failed. No reset or overwrite is permitted.'}));process.exitCode=1;});
