// Explicit local synthetic fixtures only. The combined --v2 launcher creates a new DB file.
module.exports = async function seed(db) {
  const {cds,entity}=require('../../srv/lib/db');
  const {event}=require('../../srv/lib/v2');
  if(db.kind!=='sqlite'||process.env.NODE_ENV==='production')throw new Error('Synthetic fixture guard');
  await db.tx(async tx=>{
    if((await tx.run(cds.ql.SELECT.from(entity('UserProfile')).limit(1))).length)return;
    const now=new Date().toISOString(),future=new Date(Date.now()+86400000).toISOString();
    const tools=await tx.run(cds.ql.SELECT.from(entity('Tool')));
    for(const role of ['Worker','Manager','Quality','Verifier'])await tx.run(cds.ql.INSERT.into(entity('UserProfile')).entries({userId:'DEMO-'+role.toUpperCase(),displayName:'Synthetic '+role,role,language:'en',workCenter:tools[0].workCenter,team:'Synthetic local demonstration',status:'Active',createdAt:now}));
    for(const tool of tools){
      const userId='DEMO-TECH-'+tool.toolId;
      await tx.run(cds.ql.INSERT.into(entity('UserProfile')).entries({userId,displayName:'Synthetic '+tool.toolId+' technician',role:'Technician',language:'en',workCenter:tool.workCenter,team:'Synthetic local demonstration',status:'Active',createdAt:now}));
      const requirement={toolType:tool.type,skill:'SYNTHETIC-'+tool.type,certification:'SYNTHETIC-CERT-'+tool.type,safetyAuthorization:'SYNTHETIC-ISOLATION',approvedBy:'SYNTHETIC-BOOTSTRAP'};
      await tx.run(cds.ql.UPSERT.into(entity('EquipmentRequirement')).entries(requirement));
      await tx.run(cds.ql.INSERT.into(entity('TechnicianQualification')).entries({...requirement,userId,workCenter:tool.workCenter,expiresAt:future,availableUntil:future,maxAssignments:2}));
      await tx.run(cds.ql.INSERT.into(entity('SparePart')).entries({partId:'DEMO-PART-'+tool.toolId,name:'Synthetic compatible demonstration part',toolType:tool.type,location:'Synthetic stores',quantity:3,reserved:0,reorderThreshold:1}));
    }
    await event(tx,{id:'SYNTHETIC-BOOTSTRAP',role:'Administrator'},'V2_DEMO_SEEDED','Explicit development-only synthetic demo fixtures',{users:'Synthetic identities only; no identity-provider account or real certification was created'});
  });
};
