const { cds, entity, transaction } = require("./db");
const { uuid } = require("./ids");
async function write(entry, tx) {
  if (!tx) return transaction((t) => write(entry, t));
  const { actor, actorRole, action, reason } = entry;
  if (!actor || !actorRole || !action || !reason)
    throw new Error("Audit requires actor, actorRole, action and reason");
  const row = {
    auditId: uuid("AUD"),
    incidentId: entry.incidentId || null,
    toolId: entry.toolId || null,
    actor,
    actorRole,
    action,
    details: JSON.stringify(entry.details || {}),
    reason,
    modelVersion: entry.modelVersion || null,
    timestamp: new Date().toISOString(),
  };
  await tx.run(cds.ql.INSERT.into(entity("AuditLog")).entries(row));
  return row.auditId;
}
module.exports = { write };
