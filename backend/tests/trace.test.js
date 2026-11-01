const cds = require("@sap/cds");
const request = require("supertest");
const fs = require("node:fs");
const { performance } = require("node:perf_hooks");
const { entity } = require("../srv/lib/db");
const { parseWindow, buildWindow } = require("../srv/lib/trace-engine");
const approved = fs.existsSync("tests/ground-truth.json");
const candidate = require("./ground-truth.candidate.json");
const truth = approved
  ? JSON.parse(fs.readFileSync("tests/ground-truth.json"))
  : candidate;
cds.test(__dirname + "/..");
jest.setTimeout(30000);
const api = (method, url, body, role = "Manager") => {
  const r = request(cds.app)
    [method]("/api" + url)
    .set("x-demo-user", "TRACE-TEST")
    .set("x-demo-role", role);
  return body === undefined ? r : r.send(body);
};
const results = {};
let id;
beforeAll(async () => {
  if (approved) expect(truth).toEqual(candidate);
  const r = await api(
    "post",
    "/incidents",
    require("../docs/demo-incidents.json")[0],
  );
  expect(r.status).toBe(201);
  id = r.body.incident.incidentId;
});
afterAll(() => {
  const rows = Object.entries(results).map(([window, r]) => ({
    window: Number(window),
    expected: (({ units, ...expected }) => expected)(
      truth.tools["TOOL-B"][window],
    ),
    actual: {
      totalUnits: r.body.summary?.totalUnits,
      byTier: r.body.summary?.byTier,
      byLocation: r.body.summary?.byLocation,
      shippedByDealer: r.body.summary?.shippedByDealer,
      score: r.body.dataQuality?.score,
      exposureRange: r.body.exposureRange,
    },
    durationMs: r.durationMs,
    status: r.status,
  }));
  fs.mkdirSync("tests/results", { recursive: true });
  fs.writeFileSync(
    "tests/results/trace-validation.json",
    JSON.stringify(
      {
        label: "synthetic data, simulated services",
        groundTruth: approved
          ? "approved matches candidate"
          : "PROVISIONAL CANDIDATE; Jamuna review pending",
        rows,
      },
      null,
      2,
    ) + "\n",
  );
  const lines = rows.map(
    (r) =>
      `| ${r.window} | ${r.expected.totalUnits} / ${r.actual.totalUnits} | ${r.expected.byTier.CONFIRMED}/${r.expected.byTier.PROBABLE}/${r.expected.byTier.UNKNOWN} / ${r.actual.byTier?.CONFIRMED}/${r.actual.byTier?.PROBABLE}/${r.actual.byTier?.UNKNOWN} | ${r.expected.inStock}/${r.expected.dealerX}/${r.expected.dealerY} / ${r.actual.byLocation?.IN_STOCK}/${r.actual.shippedByDealer?.["DLR-X"]}/${r.actual.shippedByDealer?.["DLR-Y"]} | ${r.expected.score} / ${r.actual.score} | ${r.durationMs.toFixed(2)} |`,
  );
  fs.writeFileSync(
    "tests/results/trace-results.md",
    "# Executed trace results\n\nSynthetic data, simulated services. Ground truth: " +
      (approved
        ? "approved matches candidate"
        : "PROVISIONAL candidate, awaiting Jamuna") +
      ". API-level timing includes SQLite persistence and audit on this local test machine. Target <500ms; actual below.\n\n| Window | Units expected/actual | C/P/U expected / actual | Stock/X/Y expected / actual | Score expected/actual | ms |\n|---|---|---|---|---|---|\n" +
      lines.join("\n") +
      "\n\nExposure range expected 35/154/6; assertions verify every result. See summary.json for executed suite status.\n",
  );
});
for (const h of [24, 72, 168])
  test(`TOOL-B ${h}h exact serial classifications, location, score, evidence and range`, async () => {
    const start = performance.now();
    const r = await api("get", `/incidents/${id}/trace?window=${h}`);
    results[h] = {
      body: r.body,
      status: r.status,
      durationMs: performance.now() - start,
    };
    expect(r.status).toBe(200);
    const e = truth.tools["TOOL-B"][h],
      b = r.body;
    expect(
      b.units.map((u) => ({
        serial: u.serial,
        tier: u.tier,
        location: u.locationStatus,
        dealerId: u.dealerId,
      })),
    ).toEqual(e.units);
    expect(b.summary.totalUnits).toBe(e.totalUnits);
    expect(b.summary.byTier).toEqual(e.byTier);
    expect(b.summary.byLocation.IN_STOCK).toBe(e.inStock);
    expect(b.summary.shippedByDealer).toEqual({
      "DLR-X": e.dealerX,
      "DLR-Y": e.dealerY,
    });
    expect(b.dataQuality.score).toBe(e.score);
    expect([
      b.exposureRange.low,
      b.exposureRange.high,
      b.exposureRange.unknownSeparate,
    ]).toEqual([35, 154, 6]);
    expect(b.valueAtRisk.amountINR).toBe(e.totalUnits * 3200);
    expect(
      b.units.every(
        (u) =>
          u.evidenceIds.includes(u.serial) && u.evidenceIds.includes(u.runId),
      ),
    ).toBe(true);
    expect(JSON.stringify(b)).not.toMatch(/defective/i);
    expect(b.units[0].evidenceIds.slice(0, 2)).toEqual([
      "TUE-B-0001",
      "TUE-B-0001-DUP",
    ]);
    expect(b.gaps.some((g) => g.code === "DUPLICATE_TOOL_USE_LINK")).toBe(true);
    if (h >= 72) {
      expect(b.units.filter((u) => u.tier === "UNKNOWN")).toHaveLength(6);
      expect(b.units.filter((u) => u.flags.includes("STALE"))).toHaveLength(5);
      expect(
        b.units.filter((u) => u.reasonCodes.includes("TIMESTAMP_CONFLICT")),
      ).toHaveLength(4);
      expect(
        b.units
          .filter((u) => u.runId === "RUN-B-NOREC")
          .every((u) => !u.evidenceIds.some((id) => id.startsWith("TUE-"))),
      ).toBe(true);
    }
    if (h === 168)
      expect(
        b.units.filter(
          (u) => u.runId === "RUN-B-NOEND" && u.tier === "PROBABLE",
        ),
      ).toHaveLength(4);
  });
test("nested windows exclude out-of-scope units and repeated output is deterministic", async () => {
  for (const [a, b] of [
    [24, 72],
    [72, 168],
  ])
    expect(
      results[a].body.units.every((u) =>
        results[b].body.units.some((v) => v.serial === u.serial),
      ),
    ).toBe(true);
  expect(
    results[168].body.units.some((u) => Number(u.serial.slice(3)) > 160),
  ).toBe(false);
  const again = (await api("get", `/incidents/${id}/trace?window=72h`)).body;
  const normalized = (x) => {
    const { generatedAt, version, traceId, ...rest } = x;
    return rest;
  };
  expect(normalized(again)).toEqual(normalized(results[72].body));
  expect(again.version).toBe(results[72].body.version + 1);
  expect(again.traceId).not.toBe(results[72].body.traceId);
});
test("other tools have exact selectivity including valid empty trace", async () => {
  for (const toolId of ["TOOL-A", "TOOL-C"]) {
    const created = await api("post", "/incidents", {
      ...require("../docs/demo-incidents.json")[0],
      toolId,
    });
    for (const h of [24, 72, 168]) {
      const r = await api(
        "get",
        `/incidents/${created.body.incident.incidentId}/trace?window=${h}`,
      );
      expect(r.status).toBe(200);
      expect(r.body.units.map((u) => u.serial)).toEqual(
        truth.tools[toolId][h].units.map((u) => u.serial),
      );
      if (toolId === "TOOL-C") expect(r.body.dataQuality.score).toBe(100);
    }
  }
});
test("invalid window, incident and underlying tool return contract errors", async () => {
  for (const w of ["0", "48", "7d", "24hh", "024"]) {
    const r = await api("get", `/incidents/${id}/trace?window=${w}`);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_WINDOW");
  }
  expect((await api("get", "/incidents/MISSING/trace?window=24")).status).toBe(
    404,
  );
  await cds.db.run(
    cds.ql.INSERT.into(entity("Incident")).entries({
      incidentId: "ORPHAN",
      toolId: "MISSING",
      reportedAt: "2026-10-31T05:12:00Z",
    }),
  );
  expect(
    (await api("get", "/incidents/ORPHAN/trace?window=24")).body.error.code,
  ).toBe("TOOL_NOT_FOUND");
});
test("trace persists version, audit and tool history for each successful call", async () => {
  const detail = await api("get", "/incidents/" + id);
  expect(detail.body.traceResults).toHaveLength(4);
  const log = await api("get", "/audit?incident=" + id);
  const traceAudits = log.body.entries.filter((e) => e.action === "TRACE_GENERATED");
  expect(traceAudits).toHaveLength(4);
  expect(new Set(traceAudits.map((e) => e.details.traceId)).size).toBe(4);
  expect(new Set(detail.body.traceResults.map((trace) => trace.traceId)).size).toBe(4);
  expect(traceAudits.map((e) => e.details.traceId).sort()).toEqual(detail.body.traceResults.map((trace) => trace.traceId).sort());
  const h = await api("get", "/tools/TOOL-B/history");
  const traceEvents = h.body.events.filter((e) => e.type === "TRACE" && e.refId === id);
  expect(traceEvents).toHaveLength(4);
  expect(new Set(traceEvents.map((event) => event.details.traceId)).size).toBe(4);
});
test("missing batch, unit and location evidence produces explicit gaps", () => {
  const data = {
    ToolUseEvent: [
      {
        eventId: "E",
        toolId: "T",
        runId: "R",
        start: "2026-10-31T01:00:00Z",
        end: "2026-10-31T02:00:00Z",
      },
    ],
    ProductionRun: [
      {
        runId: "R",
        workCenter: "W",
        startTime: "2026-10-31T01:00:00Z",
        endTime: "2026-10-31T02:00:00Z",
      },
    ],
    Batch: [],
    Unit: [],
    InventoryStock: [],
    Shipment: [],
    Dealer: [],
  };
  const tool = { toolId: "T", workCenter: "W" };
  expect(buildWindow(data, tool, "2026-10-31T05:12:00Z", 24).gaps[0].code).toBe(
    "MISSING_BATCH_LINK",
  );
  data.Batch = [{ batchId: "B", runId: "R" }];
  expect(
    buildWindow(data, tool, "2026-10-31T05:12:00Z", 24).gaps.some(
      (g) => g.code === "MISSING_UNIT_RECORDS",
    ),
  ).toBe(true);
  data.Unit = [{ serial: "S", batchId: "B", value: 3200 }];
  const result = buildWindow(data, tool, "2026-10-31T05:12:00Z", 24);
  expect(result.units[0].locationStatus).toBe("UNKNOWN_LOCATION");
  expect(result.gaps.some((g) => g.code === "UNKNOWN_LOCATION")).toBe(true);
});
