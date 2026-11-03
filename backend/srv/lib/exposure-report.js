const {createHash}=require('node:crypto'),path=require('node:path');
const {cds,entity,decode}=require('./db'),{fail}=require('./http'),{uuid}=require('./ids');
const v=require('./v2'),ops=require('./operations'),traceService=require('./trace-service'),engine=require('./trace-engine');
const digest=text=>createHash('sha256').update(text).digest('hex');
const disclaimer='SYNTHETIC MANUFACTURING DEMONSTRATION. Potentially exposed units only; association is not a fault or quality determination. ERP/DM actions are SIMULATED. Application audit history is not a tamper-proof ledger.';
async function authorize(tx,user,id){
  await ops.enabled(tx);
  if(!['Manager','Quality','Verifier'].includes(user.role))fail(403,'FORBIDDEN','Exposure reports require an authorized review role');
  await ops.permissions(tx,user);
  return v.access(tx,user,id);
}
function filterUnits(units,filters={}){
  return units.filter(u=>(!filters.serial||u.serial===filters.serial)&&(!filters.batchId||u.batchId===filters.batchId)&&(!filters.tier||u.tier===filters.tier)&&(!filters.locationStatus||u.locationStatus===filters.locationStatus)&&(!filters.shipmentId||u.evidenceIds.includes(filters.shipmentId)));
}
async function create(tx,user,id,body){
  v.keys(body,['window','filters']);const incident=await authorize(tx,user,id),filters=body.filters||{};
  v.keys(filters,['serial','batchId','tier','locationStatus','shipmentId']);
  for(const [key,value]of Object.entries(filters))v.text(value,key);
  if(filters.tier&&!['CONFIRMED','PROBABLE','UNKNOWN'].includes(filters.tier))fail(400,'INVALID_FILTER','Unknown association tier');
  if(filters.locationStatus&&!['IN_STOCK','SHIPPED','UNKNOWN_LOCATION'].includes(filters.locationStatus))fail(400,'INVALID_FILTER','Only recorded stock, shipment or unknown location is supported');
  const trace=await traceService.generate(tx,user,id,engine.parseWindow(body.window));
  if(trace.units.length>20000)fail(413,'REPORT_TOO_LARGE','Narrow the trace window before generating this report');
  const tool=await v.one(tx,'Tool',{toolId:incident.toolId}),workOrder=await v.one(tx,'RepairWorkOrder',{incidentId:id});
  const proposals=(await ops.rows(tx,'Proposal',{incidentId:id})).map(decode),proposalIds=new Set(proposals.map(p=>p.proposalId));
  const approvals=(await ops.rows(tx,'Approval')).filter(a=>proposalIds.has(a.proposalId));
  const repairs=(await ops.rows(tx,'RepairLog',{incidentId:id})).map(decode),evidence=await ops.rows(tx,'IncidentEvidence',{incidentId:id});
  const includedEvidence=new Set(trace.units.flatMap(u=>u.evidenceIds)),shipments=(await ops.rows(tx,'Shipment')).filter(s=>includedEvidence.has(s.shipmentId));
  const selectedUnits=filterUnits(trace.units,filters),reportId=uuid('EXPOSURE'),createdAt=new Date().toISOString();
  const snapshot={reportId,reportVersion:'exposure-report-v1',createdAt,createdBy:user.id,createdRole:user.role,synthetic:true,disclaimer,
    incident:decode(incident),tool,workOrder,proposals,approvals,repairs,evidence,shipments,trace,filters,selectedUnits,
    recommendedInvestigation:['Review recorded association evidence and Unknown gaps with Quality.','Reconcile missing or stale production, inventory and shipment records.','Use existing approval gates for containment; this report grants no action or release authority.'],
    locationLimitations:'Shipment records establish dispatch association only. Transit progress and dealer receipt are not recorded and are not inferred.'};
  const serialized=JSON.stringify(snapshot),record={reportId,incidentId:id,createdBy:user.id,createdAt,windowHours:trace.windowHours,version:trace.version,digest:digest(serialized),snapshot:serialized};
  await tx.run(cds.ql.INSERT.into(entity('ExposureReport')).entries(record));
  await v.event(tx,user,'EXPOSURE_REPORT_CREATED','Authorized complete server trace snapshot persisted',{reportId,traceId:trace.traceId,version:trace.version,windowHours:trace.windowHours,selectedUnits:selectedUnits.length,totalUnits:trace.units.length,filters,digest:record.digest},incident);
  return {report:{...record,snapshot},downloads:{pdf:`/v2/exposure-reports/${reportId}/download?format=pdf`,csv:`/v2/exposure-reports/${reportId}/download?format=csv`}};
}
async function read(tx,user,reportId){
  await ops.enabled(tx);
  const record=await v.one(tx,'ExposureReport',{reportId});
  if(!record)fail(404,'REPORT_NOT_FOUND','Exposure report not found');
  await authorize(tx,user,record.incidentId);
  if(digest(record.snapshot)!==record.digest)fail(409,'SNAPSHOT_INTEGRITY','Stored report snapshot no longer matches its recorded digest');
  return {...record,snapshot:JSON.parse(record.snapshot)};
}
function cell(value){let text=value==null?'':String(value);if(/^[\s\u0000-\u001f]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
function csv(report){
  const s=report.snapshot,columns=['Report ID','Snapshot digest','Report version','Generated UTC','Incident ID','Equipment','Worker report','Reporter','Trace hours','Trace version','Window start UTC','Window end UTC','Last verified good UTC','Full trace units','Selected units','Serial','Batch','Run','Association tier','Association reason','Location status','Recorded location','Dealer ID','Evidence IDs','Flags','Disclaimer'];
  const rows=s.selectedUnits.map(u=>[s.reportId,report.digest,s.reportVersion,s.createdAt,s.incident.incidentId,s.tool.toolId,s.incident.rawText,s.incident.reporterId,s.trace.windowHours,s.trace.version,s.trace.windowStart,s.trace.windowEnd,s.tool.lastVerifiedGood,s.trace.units.length,s.selectedUnits.length,u.serial,u.batchId,u.runId,u.tier,u.tierReason,u.locationStatus,u.location,u.dealerId,u.evidenceIds.join('; '),(u.flags||[]).join('; '),s.disclaimer]);
  return '\ufeff'+[columns,...rows].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
async function pdf(report){
  const {PDFDocument}=require('pdfkit'),s=report.snapshot;
  const doc=new PDFDocument({size:'A4',margin:42,bufferPages:true,info:{Title:`ToolSathi Exposure ${s.incident.incidentId}`,Author:'ToolSathi',Subject:'Recorded product association; synthetic scenario',CreationDate:new Date(s.createdAt),ModDate:new Date(s.createdAt)}});
  doc.registerFont('Kannada',path.join(__dirname,'../assets/fonts/kannada.woff'));doc.registerFont('Devanagari',path.join(__dirname,'../assets/fonts/devanagari.woff'));
  const chunks=[],complete=new Promise((resolve,reject)=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
  const text=(value,size=10)=>{doc.fontSize(size).fillColor('#173247');const parts=String(value??'Unknown').match(/[\u0900-\u097f\u200c\u200d]+|[\u0c80-\u0cff\u200c\u200d]+|[^\u0900-\u097f\u0c80-\u0cff\u200c\u200d]+/g)||[''];parts.forEach((part,index)=>doc.font(/[\u0c80-\u0cff]/.test(part)?'Kannada':/[\u0900-\u097f]/.test(part)?'Devanagari':'Helvetica').text(part,{continued:index<parts.length-1,lineGap:3}));};
  const section=title=>{if(doc.y>700)doc.addPage();doc.moveDown(.7);doc.font('Helvetica-Bold').fontSize(13).fillColor('#006c80').text(title);doc.moveDown(.3);};
  text('ToolSathi | Product exposure report',21);text('Recorded associations. Human review. Controlled action.',10);doc.moveDown();
  text(s.disclaimer,9);section('Report identity and incident');
  for(const [name,value]of Object.entries({'Report ID':s.reportId,'Snapshot SHA-256':report.digest,'Report format':s.reportVersion,'Generated UTC':s.createdAt,'Generated by':`${s.createdBy} (${s.createdRole})`,'Incident':s.incident.incidentId,'Reported UTC':s.incident.reportedAt,'Equipment':`${s.tool.toolId} / ${s.tool.type} / ${s.tool.workCenter}`,'Equipment state at snapshot':s.tool.state,'Reporter':s.incident.reporterId,'Assigned technician':s.workOrder?.technicianId||'Unknown','Completion reviewer':s.workOrder?.reviewedBy||'Not recorded'}))text(`${name}: ${value}`,9);
  section('Original worker report');text(s.incident.rawText);section('Reviewed / translated description');text(s.incident.translatedText||'Not recorded');text(`Intake model: ${s.incident.modelVersion||'Manual / Unknown'}`,9);
  section('Deterministic exposure summary');
  text(`Window: ${s.trace.windowHours}h | ${s.trace.windowStart} to ${s.trace.windowEnd}`);text(`Last verified good: ${s.tool.lastVerifiedGood||'Unknown'} | Trace version ${s.trace.version}`);
  text(`Full trace: ${s.trace.units.length} serials | Export selection: ${s.selectedUnits.length} serials`);
  text(`Association tiers: ${Object.entries(s.trace.summary.byTier).map(([k,n])=>`${k} ${n}`).join(' | ')}`);
  text(`Recorded locations: ${Object.entries(s.trace.summary.byLocation).map(([k,n])=>`${k} ${n}`).join(' | ')}`);
  text(`Exposure range: ${s.trace.exposureRange.low} to ${s.trace.exposureRange.high}; Unknown separate: ${s.trace.exposureRange.unknownSeparate}`);
  text(`Data quality score: ${s.trace.dataQuality.score}/100. Value estimate: INR ${s.trace.valueAtRisk.amountINR} (synthetic).`);
  text(`Filters: ${Object.keys(s.filters).length?JSON.stringify(s.filters):'None; all serials in selected window'}`,9);text(s.locationLimitations,9);
  section('Evidence gaps and uncertainty');if(!s.trace.gaps.length)text('No gaps recorded by this trace window. This is not a determination of product condition.');
  for(const gap of s.trace.gaps)text(`${gap.code}: ${gap.message} | ${gap.runId||''} | ${(gap.evidenceIds||[]).join(', ')}`,9);
  section('Approvals and independent repair evidence');
  if(!s.approvals.length)text('No approval decisions recorded for this incident.');
  for(const a of s.approvals)text(`${a.approvalId} | ${a.approverRole} | ${a.decision} | ${a.decidedBy} | ${a.decidedAt}\n${a.reason}`,9);
  for(const repair of s.repairs)text(`${repair.repairId} | Technician ${repair.loggedBy} | Passed ${repair.passed} | Verifier ${repair.verifiedBy||'Not verified'} | ${repair.verifiedAt||'Pending'}`,9);
  section('Recommended next investigation');for(const item of s.recommendedInvestigation)text(item,10);
  section('Serial-level evidence');
  for(const u of s.selectedUnits){if(doc.y>685)doc.addPage();text(`${u.serial} | ${u.tier} | ${u.locationStatus}`,10);text(`Batch ${u.batchId} | Run ${u.runId} | Location ${u.location||'Unknown'} | Dealer ${u.dealerId||'Unknown'}`,8);text(`Basis: ${u.tierReason}`,8);text(`Evidence: ${u.evidenceIds.join(', ')}${u.flags?.length?' | Flags: '+u.flags.join(', '):''}`,8);doc.moveDown(.35);}
  const range=doc.bufferedPageRange();for(let index=range.start;index<range.start+range.count;index++){doc.switchToPage(index);doc.font('Helvetica').fontSize(7).fillColor('#52616b').text(`ToolSathi | SYNTHETIC | ${s.reportId} | Page ${index+1} / ${range.count}`,42,doc.page.height-28,{lineBreak:false,width:510});}
  doc.end();return complete;
}
module.exports={create,read,filterUnits,cell,csv,pdf,authorize,disclaimer};
