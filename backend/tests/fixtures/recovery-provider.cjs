// Browser-test preload only. Production server never imports this file.
const recovery = require('../../srv/routes/recovery.router');
// Isolated browser server only: seed after legacy cases so their three-tool baseline stays intact.
if(process.env.V21_BROWSER_FIXTURES==='true')require('@sap/cds').on('bootstrap',app=>app.post('/api/test/v21-seed',async(_req,res,next)=>{
  try{res.json(await require('@sap/cds').db.tx(tx=>require('../../db/seed/v21').apply(tx)));}catch(e){next(e);}
}));
recovery.router = recovery.createRouter({ clientFactory: () => ({ complete: async messages => {
  const previous = messages.at(-1).content;
  let data;
  try { data = JSON.parse(previous).toolResults; } catch { /* Initial tool request */ }
  if (!data) return { model: 'TEST-ONLY-MOCK-PROVIDER', content: JSON.stringify({ toolCalls: ['get_incident', 'get_trace', 'get_alternatives'] }) };
  const option = data.get_alternatives.options.find(o => o.eligible && o.optionId.startsWith('ALTERNATIVE:')) || data.get_alternatives.options[0];
  return { model: 'TEST-ONLY-MOCK-PROVIDER', content: JSON.stringify({ optionId: option.optionId, evidenceIds: data.get_alternatives.evidenceIds }) };
} }) });
