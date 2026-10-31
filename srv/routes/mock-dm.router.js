const router=require('express').Router();const {cds,entity,decode,transaction}=require('../lib/db');const {requireRole}=require('../lib/auth');const {wrap,fail,label}=require('../lib/http');const actions=require('../lib/mock-actions');const {find}=require('../lib/incidents');
router.post('/mock/dm/tool-restrictions',requireRole('Manager','Quality'),wrap(async(req,res)=>res.json(await actions.restrictTool(req.body,req.user))));
router.get('/mock/documents',requireRole(),wrap(async(req,res)=>{
 if(typeof req.query.incident!=='string'||!req.query.incident)fail(400,'INVALID_INPUT','incident query parameter is required');
 const limit=req.query.limit===undefined?50:Number(req.query.limit),offset=req.query.offset===undefined?0:Number(req.query.offset);
 if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||offset>10000)fail(400,'INVALID_INPUT','limit must be 1..100 and offset 0..10000');
 const result=await transaction(async tx=>{await find(tx,req.query.incident);const rows=await tx.run(cds.ql.SELECT.from(entity('MockDocument')).where({incidentId:req.query.incident}).orderBy('createdAt','docId').limit(limit,offset));return {incidentId:req.query.incident,documents:rows.map(decode).map(d=>({...d,_label:'SIMULATED',payload:d.payload.result||d.payload})),limit,offset};});res.json(label(result));
}));module.exports={mount:'/api',router,owner:'platform'};
