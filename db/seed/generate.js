const fs = require("node:fs");
const path = require("node:path");
const { T, at, serial, plan, groundTruth } = require("./plan");
function build() {
  const rows = {};
  const add = (entity, row) => (rows[entity] ||= []).push(row);
  for (const t of ["A", "B", "C"])
    add("Tool", {
      toolId: `TOOL-${t}`,
      type: "TORQUE",
      line: "LINE-BRAKE-1",
      workCenter: `WC-${t}`,
      state: "Active",
      calibrationDue: t === "C" ? "2026-11-09" : "2026-12-01",
      usageCount: t === "B" ? 200 : 50,
      lastVerifiedGood: at(240),
    });
  for (const [id, language] of [
    ["X", "hi"],
    ["Y", "kn"],
  ])
    add("Dealer", { dealerId: `DLR-${id}`, name: `Dealer ${id}`, language });
  for (const [index, p] of plan.entries()) {
    const quantity = p.last - p.first + 1,
      toolId = `TOOL-${p.tool}`;
    add("ProductionRun", {
      runId: p.runId,
      startTime: at(p.age),
      endTime: at(p.age + (p.suffix === "CONFLICT" ? 1 / 3 : -1)),
      operatorId: `OP-0${(index % 5) + 1}`,
      material: "BRAKE-ASM-01",
      workCenter: `WC-${p.tool}`,
    });
    if (p.suffix !== "NOREC") {
      const eventId =
        p.suffix === "DUP" ? "TUE-B-0001" : `TUE-${p.tool}-${p.suffix}`;
      const e = {
        eventId,
        toolId,
        runId: p.runId,
        start: at(p.age),
        end: ["CONFLICT", "NOEND"].includes(p.suffix) ? null : at(p.age - 1),
        sourceRecordId: `SRC-${index + 1}`,
      };
      add("ToolUseEvent", e);
      if (p.suffix === "DUP")
        add("ToolUseEvent", {
          ...e,
          eventId: "TUE-B-0001-DUP",
          sourceRecordId: "SRC-DUP",
        });
    }
    add("Batch", {
      batchId: p.batchId,
      runId: p.runId,
      material: "BRAKE-ASM-01",
      quantity,
      supplierLot: `LOT-${index + 1}`,
      status: p.location === "STOCK" ? "IN_STOCK" : "SHIPPED",
    });
    for (let n = p.first; n <= p.last; n++)
      add("Unit", {
        serial: serial(n),
        batchId: p.batchId,
        status: "ASSEMBLED",
        value: 3200,
      });
    if (p.location === "STOCK")
      add("InventoryStock", {
        stockId: `STOCK-${p.batchId}`,
        batchId: p.batchId,
        location: "STORE-01",
        quantity,
        value: quantity * 3200,
        stockStatus: "UNRESTRICTED",
        snapshotTime: at(1 / 6),
      });
    else
      add("Shipment", {
        shipmentId: `SHIP-${p.batchId}`,
        batchId: p.batchId,
        dealerId: `DLR-${p.location}`,
        quantity,
        shipDate: at(p.age - 2),
        recordTime: at(1 / 6 + (p.suffix === "STALE" ? 60 : 1 / 12)),
      });
  }
  add("Incident", {
    incidentId: "TS-0001",
    toolId: "TOOL-B",
    reporterId: "WRK-009",
    language: "hi",
    rawText: "Previous torque report (synthetic)",
    translatedText: "Previous torque report",
    category: "TORQUE",
    suggestedNcCode: "NC-TORQUE-LOOSE",
    confidence: 0.9,
    missingFields: "[]",
    state: "Closed",
    createdAt: at(288),
    reportedAt: at(288),
    reportedAtSource: "CLIENT_REPORTED",
    confirmedAt: at(287),
    confirmedBy: "WRK-009",
    modelVersion: "seed-v1",
  });
  add("RepairLog", {
    repairId: "REP-0001",
    toolId: "TOOL-B",
    incidentId: "TS-0001",
    description: "Synthetic torque adjustment",
    loggedBy: "TECH-01",
    loggedAt: at(270),
    testReadings: '{"torqueNm":[40,40,40]}',
    passed: true,
    verifiedBy: "VER-01",
    verifiedAt: at(264),
  });
  add("CalibrationRecord", {
    calibrationId: "CAL-0001",
    toolId: "TOOL-B",
    calibratedAt: at(960),
    result: "PASS",
  });
  for (const [i, type, h, refId] of [
    [1, "INCIDENT", 288, "TS-0001"],
    [2, "REPAIR", 270, "REP-0001"],
    [3, "CALIBRATION", 960, "CAL-0001"],
  ])
    add("ToolHistoryEvent", {
      eventId: `HIST-SEED-${i}`,
      toolId: "TOOL-B",
      type,
      at: at(h),
      summary: `Synthetic previous ${type.toLowerCase()}`,
      refId,
      details: "{}",
    });
  add("AuditLog", {
    auditId: "AUD-SEED-0001",
    incidentId: "TS-0001",
    toolId: "TOOL-B",
    actor: "SEED-GENERATOR",
    actorRole: "System",
    action: "SEED_HISTORY_IMPORTED",
    details: '{"state":"Closed","synthetic":true}',
    reason:
      "Historical synthetic fixture imported; not a live workflow execution",
    modelVersion: "seed-v1",
    timestamp: at(264),
  });
  add("Counter", { name: "incident", value: 1 });
  add("Counter", { name: "mockDocument", value: 0 });
  for (const group of ["TORQUE", "WEAR", "CALIBRATION", "ELECTRICAL", "OTHER"])
    add("NcCode", {
      code: group === "TORQUE" ? "NC-TORQUE-LOOSE" : `NC-${group}`,
      group,
      description: `Placeholder ${group} code; replace with reviewed list`,
    });
  for (let i = 1; i <= 3; i++)
    add("SopDoc", {
      docId: `SOP-${i}`,
      title: `Placeholder safety procedure ${i}`,
      section: String(i),
      text: "Stop use and request authorized human review. Synthetic placeholder.",
    });
  return rows;
}
const encode = (v) => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`);
function artifacts() {
  const files = {};
  for (const [entity, rows] of Object.entries(build())) {
    const headers = Object.keys(rows[0]);
    files[`db/data/toolsathi-${entity}.csv`] =
      headers.join(";") +
      "\n" +
      rows
        .map((row) => headers.map((k) => encode(row[k])).join(";"))
        .join("\n") +
      "\n";
  }
  files["tests/ground-truth.candidate.json"] =
    JSON.stringify(groundTruth(), null, 2) + "\n";
  const main = {
    toolId: "TOOL-B",
    reporterId: "WRK-014",
    language: "kn",
    rawText:
      "\u0c9f\u0cc2\u0cb2\u0ccd B \u0cac\u0ccb\u0cb2\u0ccd\u0c9f\u0ccd \u0cb8\u0ca1\u0cbf\u0cb2\u0cb5\u0cbe\u0c97\u0cbf\u0ca6\u0cc6",
    translatedText: "Tool B is leaving bolts loose",
    category: "TORQUE",
    suggestedNcCode: "NC-TORQUE-LOOSE",
    confidence: 0.82,
    missingFields: [],
    reportedAt: T,
    modelVersion: "demo-structured-v1",
  };
  files["docs/demo-incidents.json"] =
    JSON.stringify(
      [
        main,
        {
          ...main,
          reporterId: "WRK-015",
          language: "hi",
          rawText:
            "\u092c\u094b\u0932\u094d\u091f \u0922\u0940\u0932\u093e \u0939\u0948",
          reportedAt: at(-2),
        },
      ],
      null,
      2,
    ) + "\n";
  return files;
}
function generate() {
  for (const [file, content] of Object.entries(artifacts())) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  console.log(
    "Generated synthetic-v1 CSVs and PROVISIONAL ground truth candidate.",
  );
}
module.exports = { build, artifacts, generate };
if (require.main === module) generate();
