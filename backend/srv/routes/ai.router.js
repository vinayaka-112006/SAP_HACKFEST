const { cds, entity } = require('../lib/db');
const { createRouter } = require('../ai-adapter/endpoints');
module.exports = { mount: '/api', owner: 'Shashank', router: createRouter({
  clientFactory: () => require('../lib/reasoning').createReasoningClient(),
  lookupTool: toolId => cds.db.run(cds.ql.SELECT.one.from(entity('Tool')).where({ toolId })),
  loadNcCatalogue: () => cds.db.run(cds.ql.SELECT.from(entity('NcCode')).columns('code', 'group', 'description')),
}) };
// Preserve teammate handlers while reporting actual selected reasoning provenance/errors.
for(const layer of module.exports.router.stack){
  const first=layer.route.stack[0],handler=first.handle;
  first.handle=function providerDiagnostics(req,res,next){const json=res.json.bind(res);res.json=value=>{
    if(value?.modelVersion?.startsWith('groq/'))value={...value,aiProvider:'groq'};
    const status={AI_AUTH_FAILED:502,AI_INVALID_OUTPUT:502,AI_TIMEOUT:504,AI_RATE_LIMITED:429,AI_NOT_CONFIGURED:503,AI_NETWORK_ERROR:503};
    if(value?.error?.code&&status[value.error.code])res.status(status[value.error.code]);
    return json(value);
  };return handler(req,res,next);};
}
