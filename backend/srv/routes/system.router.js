const router=require('express').Router(),{requireRole}=require('../lib/auth'),{wrap,label}=require('../lib/http');
let verification=null;
router.get('/v2/system',requireRole('Manager','Administrator'),wrap(async(req,res)=>{
 const cds=require('@sap/cds');await cds.db.run(cds.ql.SELECT.from('toolsathi.Tool').limit(1));
 res.json(label({database:{mode:cds.db.kind,connected:true},sarvam:{configured:!!process.env.SARVAM_API_KEY,verified:verification?.sarvam||false},groq:{configured:!!process.env.GROQ_API_KEY,verified:verification?.groq||false},checkedAt:verification?.at||null,s4hana:'SIMULATED',digitalManufacturing:'SIMULATED',manufacturingData:'SYNTHETIC',schemaChangesAutomatic:false}));
}));
router.post('/v2/system/check',requireRole('Administrator'),wrap(async(req,res)=>{
 const {createReasoningClient}=require('../lib/reasoning'),client=createReasoningClient(),result={at:new Date().toISOString(),groq:false,sarvam:false,errors:[]};
 try{const answer=await client.complete([{role:'user',content:'Synthetic connectivity check. Return {ok:true}.'}],{type:'object',properties:{ok:{type:'boolean'}},required:['ok']});result.groq=answer.model.startsWith('groq/');}catch(e){result.errors.push({provider:'groq',code:e.code||'AI_UNAVAILABLE'});}
 try{await client.speak('Synthetic ToolSathi connection test.','en');result.sarvam=true;}catch(e){result.errors.push({provider:'sarvam',code:e.code||'AI_UNAVAILABLE'});}
 verification=result;await require('../lib/audit').write({actor:req.user.id,actorRole:req.user.role,action:'PROVIDERS_CHECKED',reason:'Administrator explicitly requested synthetic connectivity checks',details:result});res.json(label(result));
}));
module.exports={mount:'/api',router,owner:'platform-v21'};
