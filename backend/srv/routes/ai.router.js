const { cds, entity } = require('../lib/db');
const { createRouter } = require('../ai-adapter/endpoints');
module.exports = { mount: '/api', owner: 'Shashank', router: createRouter({
  lookupTool: toolId => cds.db.run(cds.ql.SELECT.one.from(entity('Tool')).where({ toolId })),
  loadNcCatalogue: () => cds.db.run(cds.ql.SELECT.from(entity('NcCode')).columns('code', 'group', 'description')),
}) };
