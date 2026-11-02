// Namespaced synthetic fixture graph. No baseline Tool B trace rows are changed.
const {cds,entity}=require('../../srv/lib/db');
const v=require('../../srv/lib/v2');
function build(){
  const rows={},add=(table,row)=>(rows[table]||=[]).push(row),at='2026-11-02T08:00:00.000Z',expiry='2030-12-31T23:59:59.000Z',shift='2026-11-03T23:59:59.000Z';
  const types=['Torque','Conveyor','Motor','Inspection','CNC'];
  types.forEach((type,i)=>{
    const toolId='V21-TOOL-'+(i+1),workCenter='V21-WC-'+(i+1),toolType='SYNTHETIC-'+type;
    add('Tool',{toolId,type:toolType,line:'V21-LINE',workCenter,state:i===0?'Restricted':i===1?'Under repair':'Active',calibrationDue:'2027-12-31',usageCount:0,lastVerifiedGood:at});
    add('EquipmentRequirement',{toolType,skill:'V21-'+type,certification:'V21-CERT-'+type,safetyAuthorization:'V21-SAFETY',approvedBy:'V21-ADMIN'});
    add('WorkStation',{stationId:'V21-STATION-'+(i+1),workCenter,toolId,requiredSkill:'V21-'+type,requiredCertification:'V21-CERT-'+type,safetyAuthorization:'V21-SAFETY',materialsAvailable:true,slots:2,unitsPerHour:10+i*2,setupMinutes:15});
    add('ProductionDemand',{orderId:'V21-ORDER-'+(i+1),stationId:'V21-STATION-'+(i+1),requiredQuantity:500,completedQuantity:50,dueAt:'2026-11-04T12:00:00.000Z'});
    add('SopDoc',{docId:'V21-DOC-'+(i+1),title:'SYNTHETIC '+type+' maintenance example',section:'Illustration only',text:'SYNTHETIC training example for '+type+'. Record observable symptoms and escalate to an authorized supervisor. Obtain the approved equipment procedure and isolation authorization before maintenance. This is not a manufacturer-approved SOP.'});
    for(let j=1;j<=4;j++)add('SparePart',{partId:`V21-PART-${i+1}-${j}`,name:'SYNTHETIC '+type+' component '+j,toolType,location:'V21-STORES',quantity:j===4?0:5+j,reserved:0,reorderThreshold:2});
  });
  for(let i=1;i<=14;i++){
    const workerId='V21-WORKER-'+String(i).padStart(2,'0'),qualified=i!==3;
    add('UserProfile',{userId:workerId,displayName:'Synthetic Worker '+i,role:'Worker',language:['en','kn','hi'][i%3],workCenter:i<=3?'V21-WC-1':'V21-WC-'+(i%4+2),team:'V21 SYNTHETIC',status:'Active',createdAt:at});
    add('WorkforceProfile',{workerId,homeToolId:i<=3?'V21-TOOL-1':'V21-TOOL-'+(i%4+2),skills:JSON.stringify(qualified?['V21-Motor','V21-Inspection']:['V21-Torque']),certifications:JSON.stringify(qualified?['V21-CERT-Motor','V21-CERT-Inspection']:['V21-CERT-Torque']),safetyAuthorizations:'["V21-SAFETY"]',certificationExpiresAt:expiry,shiftEndsAt:shift,available:true});
  }
  for(let i=1;i<=8;i++){
    const userId='V21-TECH-'+i,type=types[(i-1)%5];
    add('UserProfile',{userId,displayName:'Synthetic Technician '+i,role:'Technician',language:'en',workCenter:'V21-WC-'+((i-1)%5+1),team:'V21 SYNTHETIC',status:'Active',createdAt:at});
    add('TechnicianQualification',{userId,toolType:'SYNTHETIC-'+type,workCenter:'V21-WC-'+((i-1)%5+1),skill:'V21-'+type,certification:'V21-CERT-'+type,safetyAuthorization:'V21-SAFETY',expiresAt:expiry,availableUntil:shift,maxAssignments:3,approvedBy:'V21-ADMIN'});
  }
  for(const role of ['Manager','Quality','Verifier','Administrator'])add('UserProfile',{userId:'V21-'+(role==='Administrator'?'ADMIN':role.toUpperCase()),displayName:'Synthetic '+role,role,language:'en',workCenter:'V21-PLANT',team:'V21 SYNTHETIC',status:'Active',createdAt:at});
  const descriptions=['Torque tool leaves bolts loose','ಬೋಲ್ಟ್ ಸಡಿಲವಾಗಿದೆ','बोल्ट ढीले हैं','Conveyor stopped unexpectedly','Motor overheating observed','Inspection sensor reading missing','CNC vibration observed','Earlier repaired torque fault','Awaiting manager investigation','Historical inspection report'];
  descriptions.forEach((rawText,i)=>add('Incident',{incidentId:'V21-INC-'+String(i+1).padStart(2,'0'),toolId:'V21-TOOL-'+(i<3||i===7?1:i===3||i===8?2:i===4?3:i===5?4:i===6?5:4),reporterId:'V21-WORKER-'+String(i%14+1).padStart(2,'0'),language:i===1?'kn':i===2?'hi':'en',rawText:'SYNTHETIC: '+rawText,translatedText:'SYNTHETIC: '+(i<3?'Torque tool leaves bolts loose':rawText),category:i<3?'TORQUE':'SYNTHETIC',state:i===7?'Closed':'Confirmed',createdAt:at,reportedAt:at,reportedAtSource:'SYNTHETIC_FIXTURE',confirmedAt:at,confirmedBy:'V21-MANAGER',missingFields:'[]',confidence:null,modelVersion:null}));
  add('RepairLog',{repairId:'V21-REPAIR-HISTORY',incidentId:'V21-INC-08',toolId:'V21-TOOL-1',description:'SYNTHETIC historical repair example',loggedBy:'V21-TECH-1',loggedAt:at,testReadings:'[{"name":"Synthetic check","passed":true}]',passed:true,verifiedBy:'V21-VERIFIER',verifiedAt:at});
  add('RepairWorkOrder',{incidentId:'V21-INC-04',workOrderId:'V21-WO-ACTIVE',technicianId:'V21-TECH-2',assignedBy:'V21-MANAGER',assignedAt:at,status:'Accepted',findings:'SYNTHETIC conveyor inspection in progress',repairId:null,reviewedBy:null,reviewedAt:null});
  add('RepairLog',{repairId:'V21-REPAIR-ACTIVE',incidentId:'V21-INC-04',toolId:'V21-TOOL-2',description:'SYNTHETIC inspection in progress',loggedBy:'V21-TECH-2',loggedAt:at,testReadings:'[]',passed:false,verifiedBy:null,verifiedAt:null});
  return rows;
}
async function apply(tx,{preview=false}={}){
  const graph=build(),plan=[];
  // Validate every identifier collision before inserting any row; never UPSERT fixtures.
  const model=cds.model||await cds.load('db/schema.cds');
  const pending=[];
  for(const [table,rows] of Object.entries(graph)){
    const definition=model.definitions[entity(table)],keys=Object.entries(definition.elements).filter(([,e])=>e.key).map(([k])=>k);
    let insert=0,skip=0;
    for(const row of rows){const where=Object.fromEntries(keys.map(k=>[k,row[k]])),found=await v.one(tx,table,where);if(found){if(Object.entries(row).some(([k,value])=>{
      const stored=found[k];return value!==null&&/At$|Good$/.test(k)?Date.parse(stored)!==Date.parse(value):String(stored??'')!==String(value??'');
    }))throw Object.assign(new Error('Namespaced fixture conflict in '+table),{code:'DEMO_IDENTIFIER_CONFLICT'});skip++;}else{insert++;pending.push([table,row]);}}
    plan.push({table,insert,skip});
  }
  if(!preview){for(const [table,row] of pending)await tx.run(cds.ql.INSERT.into(entity(table)).entries(row));if(pending.length)await v.event(tx,{id:'V21-SEED',role:'Administrator'},'V21_SYNTHETIC_SEEDED','Explicit namespaced synthetic fixture graph',{plan});}
  return {preview,inserted:preview?0:pending.length,plan,traceImpact:'No baseline tool-use, run, batch, unit, shipment or Tool B changes'};
}
module.exports={build,apply};
