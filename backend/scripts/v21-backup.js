// Explicitly authorized by the user's HANA backup/additive-update approval.
// Export only the configured exclusive ToolSathi schema into ignored local backup/.
const config=require('../srv/lib/database-config');config.loadEnvironment();process.chdir(config.projectRoot);
const fs=require('fs'),path=require('path'),crypto=require('crypto');
async function main(){
 const cds=require('@sap/cds'),operations=require('../srv/lib/hana-operations'),transfer=require('../srv/lib/data-transfer');
 const selected=config.configureDatabase(cds,{mode:'hana'});config.assertTarget(selected);
 const model=await cds.load('db/schema.cds'),db=await cds.connect.to('db',{...cds.env.requires.db,model,silent:true});
 try{
  const metadata=await operations.inspect(db,selected.schema);operations.assertExclusive(metadata,model);await operations.validateTables(db,model,selected.schema);
  const present=new Set(metadata.objects.filter(o=>o.OBJECT_TYPE==='TABLE').map(o=>o.OBJECT_NAME));
  const descriptors=transfer.entities(model).filter(e=>present.has(e.table.toUpperCase()));
  const data=await db.tx(async tx=>{
    const rows={};for(const descriptor of descriptors)rows[descriptor.name]=transfer.canonicalRows(await tx.run(transfer.readQuery(cds,descriptor,'hana')),descriptor);
    return rows;
  });
  const snapshot={format:'toolsathi-data-transfer-v1',data,manifest:transfer.manifest(data,descriptors)};
  const backup=transfer.saveSnapshot(snapshot,path.resolve('../backup')),reloaded=JSON.parse(fs.readFileSync(backup,'utf8'));
  if(JSON.stringify(transfer.manifest(reloaded.data,descriptors))!==JSON.stringify(snapshot.manifest))throw Error('Backup verification mismatch');
  // Prove that the exported rows can be reconstructed in a fresh local SQLite DB.
  const {DatabaseSync}=require('node:sqlite'),temporary=path.resolve('../backup/v21-restore-'+crypto.randomUUID()+'.sqlite'),sqlite=new DatabaseSync(temporary);
  try{
    for(const statement of cds.compile.to.sql(model,{dialect:'sqlite'}))sqlite.exec(statement);
    for(const descriptor of descriptors){
      const columns=descriptor.columns,statement=sqlite.prepare('INSERT INTO '+descriptor.table+' ('+columns.map(k=>'"'+k+'"').join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')');
      for(const row of reloaded.data[descriptor.name])statement.run(...columns.map(k=>typeof row[k]==='boolean'?Number(row[k]):row[k]));
      const rows=sqlite.prepare('SELECT * FROM '+descriptor.table).all();
      if(JSON.stringify(transfer.canonicalRows(rows,descriptor))!==JSON.stringify(reloaded.data[descriptor.name]))throw Error('Restore verification mismatch');
    }
  }finally{sqlite.close();if(temporary.startsWith(path.resolve('../backup')+path.sep))fs.unlinkSync(temporary);}
  const report={at:new Date().toISOString(),backupFile:path.basename(backup),tables:descriptors.length,records:Object.values(data).reduce((n,r)=>n+r.length,0),manifestVerified:true,sqliteRestoreVerified:true,remoteWrites:false};
  fs.writeFileSync('../docs/v2.1-backup-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await db.disconnect();}
}
main().catch(e=>{console.error(JSON.stringify({code:e.code||'HANA_BACKUP_FAILED',message:'Backup or restore verification failed; no remote write was performed.'}));process.exitCode=1;});
