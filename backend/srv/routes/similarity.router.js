const { cds, entity } = require('../lib/db');
const { createEmbedder } = require('../ai-adapter/similarity/embeddings');
const { createSimilarityRouter } = require('../ai-adapter/similarity/endpoints');
module.exports = { mount: '/api', owner: 'Shashank', router: createSimilarityRouter({
  embedder: createEmbedder(),
  lookupTool: toolId => cds.db.run(cds.ql.SELECT.one.from(entity('Tool')).where({ toolId })),
  lookupIncident: incidentId => cds.db.run(cds.ql.SELECT.one.from(entity('Incident')).where({ incidentId })),
  loadSources: () => cds.db.tx(async tx => {
    const warnings = [], rows = {};
    for (const [key, table, columns, order] of [
      ['incidents', 'Incident', ['incidentId', 'toolId', 'language', 'rawText', 'translatedText', 'category', 'reportedAt', 'state'], 'incidentId'],
      ['repairs', 'RepairLog', ['repairId', 'toolId', 'incidentId', 'description', 'loggedAt', 'passed', 'verifiedAt'], 'repairId'],
      ['sops', 'SopDoc', ['docId', 'title', 'section', 'text'], 'docId'],
    ]) {
      const values = await tx.run(cds.ql.SELECT.from(entity(table)).columns(...columns).orderBy(order).limit(501));
      if (values.length > 500) warnings.push(`Prototype source limit: only the first 500 ${table} records were searched.`);
      rows[key] = values.slice(0, 500);
    }
    return { ...rows, warnings };
  }),
}) };
