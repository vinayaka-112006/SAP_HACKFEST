const router=require('express').Router(),{transaction}=require('../lib/db');
const {wrap,label,fail}=require('../lib/http'),{requireRole}=require('../lib/auth'),v=require('../lib/v2'),reports=require('../lib/exposure-report');
router.post('/v2/incidents/:id/exposure-reports',requireRole('Manager','Quality','Verifier'),wrap(async(req,res)=>res.json(label(await transaction(tx=>reports.create(tx,req.user,req.params.id,req.body))))));
router.get('/v2/exposure-reports/:id',requireRole('Manager','Quality','Verifier'),wrap(async(req,res)=>res.json(label({report:await transaction(tx=>reports.read(tx,req.user,req.params.id))}))));
router.get('/v2/exposure-reports/:id/download',requireRole('Manager','Quality','Verifier'),wrap(async(req,res)=>{
  const format=req.query.format;if(!['pdf','csv'].includes(format))fail(400,'INVALID_FORMAT','Choose pdf or csv');
  const report=await transaction(tx=>reports.read(tx,req.user,req.params.id));
  const bytes=format==='pdf'?await reports.pdf(report):Buffer.from(reports.csv(report),'utf8');
  await transaction(async tx=>{await reports.authorize(tx,req.user,report.incidentId);await v.event(tx,req.user,'EXPOSURE_REPORT_EXPORTED','Authorized stored snapshot rendered for download',{reportId:report.reportId,format,digest:report.digest,bytes:bytes.length},{incidentId:report.incidentId,toolId:report.snapshot.tool.toolId});});
  res.set('Cache-Control','private, no-store');res.set('X-Content-Type-Options','nosniff');
  res.set('Content-Disposition',`attachment; filename="ToolSathi_${report.reportId.replace(/[^A-Za-z0-9_-]/g,'_')}.${format}"`);
  res.type(format==='pdf'?'application/pdf':'text/csv; charset=utf-8').send(bytes);
}));
module.exports={mount:'/api',router,owner:'platform-v22'};
