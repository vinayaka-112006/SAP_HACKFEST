const { cds, entity } = require("./db");
const { randomUUID } = require("node:crypto");
async function next(tx, name, prefix = "", width = 4) {
  const changed = await tx.run(
    cds.ql
      .UPDATE(entity("Counter"))
      .set({ value: { "+=": 1 } })
      .where({ name }),
  );
  if (changed !== 1) throw new Error(`Counter is not initialized: ${name}`);
  const row = await tx.run(
    cds.ql.SELECT.one.from(entity("Counter")).where({ name }),
  );
  return prefix + String(row.value).padStart(width, "0");
}
module.exports = { next, uuid: (prefix) => prefix + "-" + randomUUID() };
