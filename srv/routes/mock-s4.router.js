const router=require('express').Router();const {requireRole}=require('../lib/auth');const {wrap}=require('../lib/http');const actions=require('../lib/mock-actions');
for(const [url,action] of [['maintenance-notifications','maintenanceNotification'],['quality-notifications','qualityNotification'],['stock-blocks','stockBlock']])router.post('/mock/s4/'+url,requireRole('Manager','Quality'),wrap(async(req,res)=>res.json(await actions[action](req.body,req.user))));
module.exports={mount:'/api',router,owner:'platform'};
