// Explicit additive deployment; --preview is read-only and writes local metadata only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const config=require('../srv/lib/database-config');config.loadEnvironment();process.chdir(config.projectRoot);
async function main(){
 const cds=require('@sap/cds'),seed=require('../db/seed/v22'),operations=require('../srv/lib/hana-operations'),transfer=require('../srv/lib/data-transfer');
 const apply=process.argv.includes('--hana-apply');
 if(!apply&&!process.argv.includes('--preview'))throw Error('Use --preview or --hana-apply');
 const selected=config.configureDatabase(cds,{mode:'hana'});config.assertTarget(selected);
 const model=await cds.load('db/schema.cds');cds.model=model;
 const db=await cds.connect.to('db',{...cds.env.requires.db,model,silent:true});
 try{
   const metadata=await operations.inspect(db,selected.schema);operations.assertExclusive(metadata,model);await operations.validateTables(db,model,selected.schema);
   const present=new Set(metadata.objects.filter(o=>o.OBJECT_TYPE==='TABLE').map(o=>o.OBJECT_NAME));
   const descriptors=transfer.entities(model).filter(d=>present.has(d.table.toUpperCase()));
   const deployment=await operations.deploy(db,cds,model,selected),counts={};
   for(const d of descriptors){const [r]=await db.run(cds.ql.SELECT.from(d.name).columns('count(*) as records'));counts[d.name]=Number(r.records);}
   const preview=await db.tx(tx=>seed.apply(tx,{preview:true,presentTables:present}));
   const report={checkedAt:new Date().toISOString(),targetSchema:selected.schema,exclusiveSchema:true,remoteWrites:false,existingTables:descriptors.length,existingRecords:Object.values(counts).reduce((a,b)=>a+b,0),counts,createTables:deployment.createTables,createAuditTriggers:deployment.createAuditTriggers,...preview,scenarioManifest:seed.graph.manifest};
   if(!apply){
     fs.writeFileSync('../docs/v2.2-seed-preview.json',JSON.stringify(report,null,2)+'\n');
     fs.writeFileSync('../docs/v2.2-hana-additions.sql','-- CREATE-only V2.2 additions; existing tables and rows are preserved.\n'+deployment.statements.join('\n\n')+'\n');
     console.log(JSON.stringify({...report,counts:undefined,plan:undefined,scenarioManifest:undefined},null,2));return;
   }
   const reviewed=JSON.parse(fs.readFileSync('../docs/v2.2-seed-preview.json','utf8'));
   assert.equal(reviewed.targetSchema,selected.schema);assert.deepEqual(reviewed.scenarioManifest,seed.graph.manifest);assert.equal(reviewed.createTables,deployment.createTables);
   const backupReport=JSON.parse(fs.readFileSync('../docs/v2.2-backup-verification.json','utf8'));
   assert.equal(backupReport.manifestVerified,true);assert.equal(backupReport.sqliteRestoreVerified,true);
   const backupFile=path.resolve('../backup',backupReport.backupFile);assert.ok(backupFile.startsWith(path.resolve('../backup')+path.sep));
   const snapshot=JSON.parse(fs.readFileSync(backupFile,'utf8'));
   assert.deepEqual(transfer.manifest(snapshot.data,descriptors),snapshot.manifest);
   const current={};for(const d of descriptors)current[d.name]=await db.run(transfer.readQuery(cds,d,'hana'));
   assert.deepEqual(transfer.manifest(current,descriptors),snapshot.manifest,'Backup must match every current record before CREATE or INSERT');
   await operations.deploy(db,cds,model,selected,{apply:true});
   const result=await db.tx(tx=>seed.apply(tx));
   fs.writeFileSync('../docs/v2.2-hana-apply.json',JSON.stringify({at:new Date().toISOString(),targetSchema:selected.schema,backupFile:backupReport.backupFile,createdTables:deployment.createTables,originalRecords:report.existingRecords,...result},null,2)+'\n');
   console.log(JSON.stringify({applied:true,createdTables:deployment.createTables,inserted:result.inserted,originalRecords:report.existingRecords}));
 }finally{await db.disconnect();}
}
main().catch(e=>{console.error(JSON.stringify({code:e.code||'V22_UPDATE_BLOCKED',message:'Target, preview, backup, schema or namespace validation failed. No overwrite or reset is permitted.'}));process.exitCode=1;});
