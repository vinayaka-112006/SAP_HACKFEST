const router=require('express').Router();
const {transaction}=require('../lib/db'),{wrap,label}=require('../lib/http'),{requireRole}=require('../lib/auth');
const engine=require('../lib/trace-engine'),trace=require('../lib/trace-service'),v=require('../lib/v2');
router.get('/incidents/:id/trace',requireRole('Manager','Quality','Verifier'),wrap(async(req,res)=>{
  const hours=engine.parseWindow(req.query.window);
  const result=await transaction(async tx=>{await v.access(tx,req.user,req.params.id);return trace.generate(tx,req.user,req.params.id,hours);});
  res.json(label(result));
}));
module.exports={mount:'/api',router,owner:'platform'};
