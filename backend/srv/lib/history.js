const { cds, entity, transaction } = require("./db");
const { uuid } = require("./ids");
const types = [
  "INCIDENT",
  "TRACE",
  "RESTRICTION",
  "REPAIR",
  "CALIBRATION",
  "APPROVAL",
];
async function append(entry, tx) {
  if (!tx) return transaction((t) => append(entry, t));
  if (!types.includes(entry.type) || !entry.toolId || !entry.summary)
    throw new Error("Invalid tool history event");
  const row = {
    eventId: uuid("HIST"),
    toolId: entry.toolId,
    type: entry.type,
    at: entry.at || new Date().toISOString(),
    summary: entry.summary,
    refId: entry.refId || null,
    details: JSON.stringify(entry.details || {}),
  };
  await tx.run(cds.ql.INSERT.into(entity("ToolHistoryEvent")).entries(row));
  return row.eventId;
}
module.exports = { append };
