const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
function entities(model) {
  return Object.entries(model.definitions)
    .filter(([name, definition]) => name.startsWith("toolsathi.") && definition.kind === "entity" && !definition.query)
    .map(([name, definition]) => ({
      name, table: name.replaceAll(".", "_"), definition,
      columns: Object.keys(definition.elements).filter(key => !definition.elements[key].target && !definition.elements[key].virtual).sort(),
      keys: Object.keys(definition.elements).filter(key => definition.elements[key].key),
    })).sort((a, b) => a.name.localeCompare(b.name));
}
function normalize(row, entity) {
  return Object.fromEntries(entity.columns.map(key => {
    let value = row[key] ?? null;
    const element = entity.definition.elements[key];
    if (value !== null) {
      if (element.type === "cds.Boolean") value = Boolean(value);
      else if (element.type === "cds.Integer64") value = String(value);
      else if (element.type === "cds.Integer") value = Number(value);
      else if (element.type === "cds.Decimal") value = Number(value).toFixed(element.scale || 0);
      else if (element.type === "cds.Timestamp") {
        const date = new Date(value).toISOString();
        const fraction = (value instanceof Date ? date : String(value)).match(/\.(\d+)/)?.[1] || "";
        value = date.slice(0, 19) + "." + fraction.padEnd(7, "0").slice(0, 7) + "Z";
      }
    }
    return [key, value];
  }));
}
const rowKey = (row, entity) => JSON.stringify(entity.keys.map(key => row[key]));
function canonicalRows(rows, entity) {
  return rows.map(row => normalize(row, entity)).sort((a, b) => rowKey(a, entity).localeCompare(rowKey(b, entity)));
}
const digest = rows => createHash("sha256").update(JSON.stringify(rows)).digest("hex");
function readQuery(cds, entity, kind) {
  const query = cds.ql.SELECT.from(entity.name);
  // The installed HANA adapter's normal Timestamp output uses FF3. Transfer verification
  // must read FF7 explicitly so a sub-millisecond source value cannot be silently truncated.
  if (kind === "hana") query.columns(entity.columns.map(key =>
    entity.definition.elements[key].type === "cds.Timestamp"
      ? { func: "to_char", args: [{ ref: [key] }, { val: 'YYYY-MM-DD"T"HH24:MI:SS.FF7"Z"' }], as: key, cast: { type: "cds.String" } }
      : { ref: [key] },
  ));
  return query;
}
function manifest(data, descriptors) {
  return descriptors.map(entity => ({ entity: entity.name, rows: data[entity.name].length, sha256: digest(canonicalRows(data[entity.name], entity)) }));
}
function snapshotSqlite(file, model) {
  const { DatabaseSync } = require("node:sqlite");
  if (!fs.existsSync(file)) fail("HANA_SOURCE_MISSING", "The existing SQLite source does not exist; no empty database was created.");
  const descriptors = entities(model), data = {};
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    db.exec("BEGIN");
    for (const entity of descriptors) {
      const columns = entity.columns.map(column => `"${column}"`).join(", ");
      const statement = db.prepare(`SELECT ${columns} FROM "${entity.table}"`);
      statement.setReadBigInts(true);
      data[entity.name] = canonicalRows(statement.all(), entity);
    }
    db.exec("COMMIT");
  } finally { db.close(); }
  return { format: "toolsathi-data-transfer-v1", data, manifest: manifest(data, descriptors) };
}
function saveSnapshot(snapshot, backupRoot) {
  fs.mkdirSync(backupRoot, { recursive: true });
  const file = path.join(backupRoot, `hana-source-${require("node:crypto").randomUUID()}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot) + "\n", { flag: "wx", mode: 0o600 });
  return file;
}
async function transfer(db, cds, model, snapshot, { apply = false } = {}) {
  const descriptors = entities(model);
  if (JSON.stringify(snapshot.manifest) !== JSON.stringify(manifest(snapshot.data, descriptors)))
    fail("HANA_SOURCE_INVALID", "The source snapshot failed its manifest check.");
  return db.tx(async tx => {
    if (apply && db.kind === "hana")
      for (const entity of descriptors) await tx.run(`LOCK TABLE ${entity.table} IN EXCLUSIVE MODE`);
    const pending = [], plan = [];
    // Complete every conflict check before the first insert. No UPSERT, update, delete or counter rewrite.
    for (const entity of descriptors) {
      const source = snapshot.data[entity.name];
      const destination = canonicalRows(await tx.run(readQuery(cds, entity, db.kind)), entity);
      const sourceByKey = new Map(source.map(row => [rowKey(row, entity), row]));
      const destinationByKey = new Map(destination.map(row => [rowKey(row, entity), row]));
      for (const row of destination) {
        const expected = sourceByKey.get(rowKey(row, entity));
        if (!expected || JSON.stringify(expected) !== JSON.stringify(row))
          fail("HANA_DATA_CONFLICT", `${entity.name} contains an extra or differing destination record. Nothing will be overwritten.`);
      }
      const missing = source.filter(row => !destinationByKey.has(rowKey(row, entity)));
      pending.push({ entity, missing });
      plan.push({ entity: entity.name, sourceRows: source.length, existingIdentical: destination.length, insertRows: missing.length });
    }
    if (apply) {
      for (const { entity, missing } of pending)
        for (let offset = 0; offset < missing.length; offset += 100)
          await tx.run(cds.ql.INSERT.into(entity.name).entries(missing.slice(offset, offset + 100)));
      const copied = {};
      for (const entity of descriptors) copied[entity.name] = await tx.run(readQuery(cds, entity, db.kind));
      if (JSON.stringify(manifest(copied, descriptors)) !== JSON.stringify(snapshot.manifest))
        fail("HANA_COPY_MISMATCH", "Destination verification differed from the source; the entire data transaction was rolled back.");
    }
    return { applied: apply, plan, sourceManifest: snapshot.manifest, verified: apply };
  });
}
module.exports = { entities, normalize, canonicalRows, manifest, snapshotSqlite, saveSnapshot, readQuery, transfer };
