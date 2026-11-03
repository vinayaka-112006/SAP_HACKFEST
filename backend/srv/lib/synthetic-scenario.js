// Resolve only the original synthetic-v1 fixture clock, never a live incident time.
// Its immutable import audit is 264 hours before the scenario anchor (seed/generate.js).
const { cds, entity } = require('./db');
function resolve(audit, recent, duplicate) {
  if (audit?.action !== 'SEED_HISTORY_IMPORTED' || audit.modelVersion !== 'seed-v1') return null;
  const anchor = Date.parse(audit.timestamp) + 264 * 3600000;
  if (!Number.isFinite(anchor) || Date.parse(recent?.startTime) !== anchor - 12 * 3600000 ||
    Date.parse(duplicate?.startTime) !== anchor - 3 * 3600000) return null;
  return { toolId: 'TOOL-B', reportedAt: new Date(anchor).toISOString(), synthetic: true,
    source: 'Original synthetic-v1 import audit and matching production runs', auditId: audit.auditId };
}
async function read(db) {
  const audit = await db.run(cds.ql.SELECT.one.from(entity('AuditLog')).where({ auditId: 'AUD-SEED-0001' }));
  const recent = await db.run(cds.ql.SELECT.one.from(entity('ProductionRun')).where({ runId: 'RUN-B-RECENT' }));
  const duplicate = await db.run(cds.ql.SELECT.one.from(entity('ProductionRun')).where({ runId: 'RUN-B-DUP' }));
  return resolve(audit, recent, duplicate);
}
module.exports = { read, resolve };
