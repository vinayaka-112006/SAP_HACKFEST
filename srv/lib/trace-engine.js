const { cds, entity } = require("./db");
const { fail } = require("./http");
const HOURS = [24, 72, 168],
  MS = 3600000;
const sort = (a, b) => String(a).localeCompare(String(b), "en");
const time = (v) => (v == null ? NaN : Date.parse(v));
const inRange = (v, start, end) => time(v) >= start && time(v) <= end;
function parseWindow(value = "24") {
  const text = String(value).replace(/h$/, "");
  if (!["24", "72", "168"].includes(text))
    fail(400, "INVALID_WINDOW", "window must be 24, 72 or 168 hours");
  return Number(text);
}
function eventOverlaps(event, run, start, end) {
  const a = time(event.start);
  if (!Number.isFinite(a) || a > end) return false;
  if (event.end != null)
    return time(event.end) >= start || inRange(event.start, start, end);
  // Run-bounded assumption prevents a historic unfinished link spanning unrelated later runs.
  if (run && time(run.endTime) >= time(run.startTime))
    return time(run.endTime) >= start;
  if (run) return inRange(run.startTime, start, end);
  return true; // No run to bound it: expose a missing-link gap rather than invent units.
}
function buildWindow(data, tool, anchor, hours) {
  const end = time(anchor),
    start = end - hours * MS;
  const snapshotTime =
    data.InventoryStock.map((s) => s.snapshotTime)
      .filter(Boolean)
      .sort()
      .at(-1) || new Date(end).toISOString();
  const runMap = new Map(data.ProductionRun.map((r) => [r.runId, r]));
  const links = new Map();
  const gaps = [];
  const addGap = (
    code,
    severity,
    message,
    runId,
    affectedUnits,
    evidenceIds = [],
  ) =>
    gaps.push({
      code,
      severity,
      message,
      runId: runId || null,
      affectedUnits,
      evidenceIds: [...new Set(evidenceIds)].sort(sort),
    });
  for (const e of data.ToolUseEvent.filter(
    (e) => e.toolId === tool.toolId,
  ).sort((a, b) => sort(a.eventId, b.eventId))) {
    const run = runMap.get(e.runId);
    if (!eventOverlaps(e, run, start, end)) continue;
    if (!run) {
      addGap(
        "MISSING_PRODUCTION_RUN",
        "WARNING",
        "Tool-use link has no production run; association cannot be established.",
        e.runId,
        0,
        [e.eventId],
      );
      continue;
    }
    if (!links.has(run.runId)) links.set(run.runId, []);
    links.get(run.runId).push(e);
  }
  const linkedRuns = new Set(data.ToolUseEvent.map((e) => e.runId));
  for (const run of data.ProductionRun)
    if (
      run.workCenter === tool.workCenter &&
      inRange(run.startTime, start, end) &&
      !linkedRuns.has(run.runId)
    )
      links.set(run.runId, []);
  const output = new Map(),
    staleRecords = new Set(),
    conflictRuns = new Set();
  let amountINR = 0;
  for (const [runId, events] of [...links.entries()].sort(([a], [b]) =>
    sort(a, b),
  )) {
    const run = runMap.get(runId),
      batches = data.Batch.filter((b) => b.runId === runId).sort((a, b) =>
        sort(a.batchId, b.batchId),
      );
    const runUnits = data.Unit.filter((u) =>
      batches.some((b) => b.batchId === u.batchId),
    );
    const n = runUnits.length;
    const reasons = [];
    if (!events.length) reasons.push("MISSING_TOOL_USE_RECORD");
    if (events.some((e) => e.end == null)) reasons.push("MISSING_TOOL_USE_END");
    if (
      time(run.endTime) < time(run.startTime) ||
      events.some((e) => e.end != null && time(e.end) < time(e.start))
    )
      reasons.push("TIMESTAMP_CONFLICT");
    if (
      !Number.isFinite(time(run.startTime)) ||
      !Number.isFinite(time(run.endTime))
    )
      reasons.push("MISSING_RUN_TIMESTAMP");
    if (reasons.includes("TIMESTAMP_CONFLICT")) conflictRuns.add(runId);
    const tier =
      !events.length || reasons.includes("MISSING_RUN_TIMESTAMP")
        ? "UNKNOWN"
        : reasons.length
          ? "PROBABLE"
          : "CONFIRMED";
    const evidence = events.map((e) => e.eventId).sort(sort);
    for (const reason of reasons)
      addGap(
        reason,
        "WARNING",
        {
          MISSING_TOOL_USE_RECORD:
            "No tool-use record exists; work center alone does not establish association.",
          MISSING_TOOL_USE_END:
            "Tool-use end is missing; scope is bounded by linked run records where possible.",
          TIMESTAMP_CONFLICT:
            "Recorded timestamps conflict; investigate source records.",
          MISSING_RUN_TIMESTAMP:
            "Required production-run timestamp is missing; cannot establish association.",
        }[reason],
        runId,
        n,
        evidence.concat(runId),
      );
    if (events.length > 1)
      addGap(
        "DUPLICATE_TOOL_USE_LINK",
        "INFO",
        "Several tool-use links refer to this run; each serial is counted once.",
        runId,
        n,
        evidence,
      );
    if (!batches.length)
      addGap(
        "MISSING_BATCH_LINK",
        "WARNING",
        "Production run has no batch link; units cannot be enumerated.",
        runId,
        0,
        evidence.concat(runId),
      );
    for (const batch of batches) {
      const units = runUnits
        .filter((u) => u.batchId === batch.batchId)
        .sort((a, b) => sort(a.serial, b.serial));
      if (!units.length)
        addGap(
          "MISSING_UNIT_RECORDS",
          "WARNING",
          "Batch has no serial records; units cannot be enumerated.",
          runId,
          0,
          [batch.batchId],
        );
      const stocks = data.InventoryStock.filter(
        (s) => s.batchId === batch.batchId && s.quantity > 0,
      ).sort((a, b) => sort(a.stockId, b.stockId));
      const shipments = data.Shipment.filter(
        (s) => s.batchId === batch.batchId,
      ).sort((a, b) => sort(a.shipmentId, b.shipmentId));
      let locationStatus = "UNKNOWN_LOCATION",
        location = null,
        dealerId = null;
      const flags = [],
        locationIds = [];
      if (stocks.length && shipments.length) {
        flags.push("CONFLICTING_LOCATION");
        locationIds.push(
          ...stocks.map((s) => s.stockId),
          ...shipments.map((s) => s.shipmentId),
        );
        addGap(
          "CONFLICTING_LOCATION",
          "WARNING",
          "Stock and shipment records conflict; status uncertain.",
          runId,
          units.length,
          locationIds,
        );
      } else if (stocks.length) {
        locationStatus = "IN_STOCK";
        location = stocks[0].location;
        locationIds.push(...stocks.map((s) => s.stockId));
        if (
          stocks.some(
            (s) => time(snapshotTime) - time(s.snapshotTime) > 48 * MS,
          )
        ) {
          flags.push("STALE");
          addGap(
            "STALE_INVENTORY",
            "WARNING",
            "Inventory record is stale; status uncertain.",
            runId,
            units.length,
            locationIds,
          );
        }
      } else if (shipments.length) {
        locationIds.push(...shipments.map((s) => s.shipmentId));
        const dealers = [...new Set(shipments.map((s) => s.dealerId))];
        if (
          dealers.length === 1 &&
          data.Dealer.some((d) => d.dealerId === dealers[0])
        ) {
          locationStatus = "SHIPPED";
          dealerId = dealers[0];
          location = dealerId;
        } else flags.push("MISSING_OR_CONFLICTING_DEALER");
        const stale = shipments.filter(
          (s) =>
            !Number.isFinite(time(s.recordTime)) ||
            time(snapshotTime) - time(s.recordTime) > 48 * MS,
        );
        if (stale.length) {
          flags.push("STALE");
          for (const s of stale) staleRecords.add(s.shipmentId);
          addGap(
            "STALE_SHIPMENT",
            "WARNING",
            "Shipment record is stale or unsynchronized; status uncertain.",
            runId,
            units.length,
            stale.map((s) => s.shipmentId),
          );
        }
      }
      if (locationStatus === "UNKNOWN_LOCATION")
        addGap(
          "UNKNOWN_LOCATION",
          "WARNING",
          "Location cannot be determined from current records.",
          runId,
          units.length,
          locationIds,
        );
      for (const unit of units) {
        const tierLabel = {
          CONFIRMED: "Record-linked association",
          PROBABLE: "Potentially associated; investigate",
          UNKNOWN: "Cannot determine from current records",
        }[tier];
        const tierReason =
          tier === "CONFIRMED"
            ? "Valid tool-use interval links tool and run."
            : reasons.join("; ") +
              (events.some((e) => e.end == null)
                ? "; assumption: linked run bounds the unfinished event for window selection."
                : "");
        const row = {
          serial: unit.serial,
          batchId: batch.batchId,
          runId,
          tier,
          tierLabel,
          tierReason,
          reasonCodes: [...reasons],
          locationStatus,
          location,
          dealerId,
          flags,
          evidenceIds: [
            ...new Set([
              ...evidence,
              runId,
              batch.batchId,
              unit.serial,
              ...locationIds,
            ]),
          ],
        };
        if (!output.has(unit.serial)) {
          output.set(unit.serial, row);
          amountINR += Number(unit.value || 0);
        } else {
          const old = output.get(unit.serial);
          old.evidenceIds = [
            ...new Set([...old.evidenceIds, ...row.evidenceIds]),
          ];
        }
      }
    }
  }
  const units = [...output.values()].sort((a, b) => sort(a.serial, b.serial));
  const byTier = { CONFIRMED: 0, PROBABLE: 0, UNKNOWN: 0 },
    byLocation = { IN_STOCK: 0, SHIPPED: 0, UNKNOWN_LOCATION: 0 },
    shippedByDealer = { "DLR-X": 0, "DLR-Y": 0 };
  for (const u of units) {
    byTier[u.tier]++;
    byLocation[u.locationStatus]++;
    if (u.dealerId)
      shippedByDealer[u.dealerId] = (shippedByDealer[u.dealerId] || 0) + 1;
  }
  const total = units.length;
  const deductions = [
    {
      code: "UNKNOWN_UNITS",
      amount: total ? (40 * byTier.UNKNOWN) / total : 0,
    },
    {
      code: "PROBABLE_UNITS",
      amount: total ? (20 * byTier.PROBABLE) / total : 0,
    },
    { code: "STALE_SHIPMENT_RECORDS", amount: 5 * staleRecords.size },
    { code: "CONFLICT_RUNS", amount: 10 * conflictRuns.size },
  ];
  const score = total
    ? Math.round(
        Math.max(0, 100 - deductions.reduce((sum, d) => sum + d.amount, 0)),
      )
    : 100;
  return {
    toolId: tool.toolId,
    windowHours: hours,
    windowStart: new Date(start).toISOString(),
    windowEnd: new Date(end).toISOString(),
    snapshotTime,
    summary: {
      totalUnits: total,
      byTier,
      byLocation,
      staleLocationUnits: units.filter((u) => u.flags.includes("STALE")).length,
      shippedByDealer,
    },
    dataQuality: { score, deductions },
    valueAtRisk: { amountINR, label: "ESTIMATE_SYNTHETIC" },
    gaps: gaps.sort((a, b) => sort(a.runId, b.runId) || sort(a.code, b.code)),
    units,
  };
}
async function generate(tx, tool, anchor, hours) {
  const data = {};
  for (const table of [
    "ToolUseEvent",
    "ProductionRun",
    "Batch",
    "Unit",
    "InventoryStock",
    "Shipment",
    "Dealer",
  ])
    data[table] = await tx.run(cds.ql.SELECT.from(entity(table)));
  const windows = Object.fromEntries(
    HOURS.map((h) => [h, buildWindow(data, tool, anchor, h)]),
  );
  const selected = windows[hours];
  const seven = windows[168].summary.byTier;
  return {
    ...selected,
    exposureRange: {
      low: windows[24].summary.byTier.CONFIRMED,
      high: seven.CONFIRMED + seven.PROBABLE,
      unknownSeparate: seven.UNKNOWN,
      definition:
        "low=Confirmed in 24h; high=Confirmed+Probable in 7d; Unknown counted separately",
    },
    disclaimer:
      "Potentially exposed units only. No fault or quality determination is made by this system.",
  };
}
module.exports = { parseWindow, eventOverlaps, buildWindow, generate };
