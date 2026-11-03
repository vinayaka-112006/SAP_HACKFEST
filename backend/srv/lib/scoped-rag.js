const {cds,entity}=require('./db');
const {createSearch}=require('../ai-adapter/similarity/search');
const {createEmbedder}=require('../ai-adapter/similarity/embeddings');
const embedder=createEmbedder();
async function retrieve(tx,user,query,toolId){
  let selection=cds.ql.SELECT.from(entity('Incident')).limit(100);
  if(user.role==='Worker')selection=selection.where({reporterId:user.id});
  else if(user.role==='Technician'){
    const work=await tx.run(cds.ql.SELECT.from(entity('RepairWorkOrder')).where({technicianId:user.id}));
    if(!work.length)return {matches:[],method:'AUTHORIZED_EMPTY',warnings:[]};
    selection=selection.where({incidentId:{in:work.map(w=>w.incidentId)}});
  }else if(!['Manager','Quality','Verifier'].includes(user.role))return {matches:[],method:'AUTHORIZED_EMPTY',warnings:[]};
  const allowed=await require('./operations').allowedIds(tx,user);
  const incidents=(await tx.run(selection)).filter(i=>allowed.has(i.incidentId)),ids=incidents.map(i=>i.incidentId);
  const repairs=user.role==='Worker'||!ids.length?[]:await tx.run(cds.ql.SELECT.from(entity('RepairLog')).where({incidentId:{in:ids}}).limit(100));
  const sops=user.role==='Worker'?[]:await tx.run(cds.ql.SELECT.from(entity('SopDoc')).limit(50));
  const search=createSearch({embedder,loadSources:async()=>({incidents,repairs,sops})});
  return search({query,...(toolId?{toolId}:{}),limit:5});
}
module.exports={retrieve};
