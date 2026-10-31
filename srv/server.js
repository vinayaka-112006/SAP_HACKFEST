const cds = require('@sap/cds');
const express = require('express');
const cors = require('cors');
const {loadRouters} = require('./lib/router-loader');
const errors = require('./lib/errors');
cds.on('served', async () => require('./lib/db-protection').install(cds.db));
cds.on('bootstrap', app => {
  app.disable('x-powered-by');
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',').map(x=>x.trim());
  app.use(cors({origin:(origin, cb)=>cb(null, !origin || origins.includes(origin))}));
  app.use(express.json({limit:'1mb'}));
  app.locals.routeRegistry = loadRouters(app);
  app.use((_req, res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Endpoint not found',details:{}}}));
  app.use(errors);
});
module.exports = options => cds.server({...options, from:'db/schema.cds',in_memory:true, cors:false,index:false,static:false,health:false});
if (require.main === module) module.exports({}).then(server=> {
  console.log(`ToolSathi SIMULATED: http://localhost:${server.address().port}/api`);
}).catch(()=> { console.error('ToolSathi startup failed');process.exitCode=1; });
