const {cds}=require('../../srv/lib/db');
const transfer=require('../../srv/lib/data-transfer');
const graph=require('./v22-scenario.json');
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
async function apply(tx,{preview=false,presentTables}={}){
 const model=cds.model||await cds.load('db/schema.cds');
 const descriptors=transfer.entities(model).filter(d=>graph.data[d.name]);
 if(JSON.stringify(transfer.manifest(graph.data,descriptors))!==JSON.stringify(graph.manifest))fail('V22_MANIFEST_INVALID','Synthetic scenario manifest does not match its records');
 if(graph.data['toolsathi.Counter']||Object.keys(graph.data).length!==descriptors.length)fail('V22_INVALID_TABLE','Scenario cannot alter counters or unknown tables');
 const pending=[],plan=[];
 for(const d of descriptors){
   let skip=0;
   for(const row of graph.data[d.name]){
     if(d.keys.some(k=>typeof row[k]!=='string'||!row[k].startsWith(graph.prefix)))fail('V22_NAMESPACE_INVALID','Every imported key must belong to the explicit scenario version');
     const where=Object.fromEntries(d.keys.map(k=>[k,row[k]]));
     const found=presentTables&&!presentTables.has(d.table.toUpperCase())?null:await tx.run(transfer.readQuery(cds,d,tx.kind||cds.db.kind).where(where));
     if(found?.length){
       if(JSON.stringify(transfer.canonicalRows(found,d)[0])!==JSON.stringify(row))fail('V22_IDENTIFIER_CONFLICT','Existing namespaced data differs in '+d.name+'; no overwrite is allowed');
       skip++;
     }else pending.push({name:d.name,row});
   }
   plan.push({table:d.name,records:graph.data[d.name].length,insert:graph.data[d.name].length-skip,identical:skip});
 }
 if(!preview)for(const {name,row}of pending)await tx.run(cds.ql.INSERT.into(name).entries(row));
 return {version:graph.version,synthetic:true,preview,inserted:preview?0:pending.length,planned:pending.length,plan,shiftStartsAt:graph.start,shiftEndsAt:graph.shiftEnd,traceImpact:'No Counter, baseline equipment, production, serial, shipment or trace record changes'};
}
module.exports={graph,apply};
