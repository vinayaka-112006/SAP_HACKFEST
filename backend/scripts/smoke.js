const assert = require("node:assert/strict");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const { performance } = require("node:perf_hooks");
async function smoke(
  base = process.env.BASE_URL || "http://localhost:4004",
  { fresh = false, examples = false } = {},
) {
  const report = {
    label: "synthetic data, simulated services",
    executedAt: new Date().toISOString(),
    realBackend: [],
    simulatedSAP: [],
    remainingStubs: [],
    blocked: [],
    trace: [],
  };
  const fixtures = {};
  // Each checked call is explicit: stub success cannot satisfy a real backend step.
  async function real(
    name,
    method,
    path,
    body,
    role = "Manager",
    expected = 200,
  ) {
    const start = performance.now();
    const response = await fetch(base + "/api" + path, {
      method,
      headers: {
        "content-type": "application/json",
        "x-demo-user":
          role === "Worker" ? "WRK-014" : "DEMO-" + role.toUpperCase(),
        "x-demo-role": role,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const value = await response.json();
    assert.equal(
      response.status,
      expected,
      `${method} ${path}: ${JSON.stringify(value)}`,
    );
    assert.notEqual(value._stub, true, `${path} unexpectedly returned a stub`);
    if (expected < 400) {
      assert.equal(value._label, "SIMULATED");
      if (name !== "trace" || !fixtures.trace) fixtures[name] = value;
      report.realBackend.push(name);
    }
    return { value, durationMs: performance.now() - start };
  }
  const tools = (await real("tools", "GET", "/tools")).value.tools;
  assert(tools.find((t) => t.toolId === "TOOL-B"));
  const created = (
    await real(
      "incident-create",
      "POST",
      "/incidents",
      {
        ...require("../docs/demo-incidents.json")[0],
        // Isolate the expected ineligible proposal check from prior synthetic runs.
        category: `SMOKE-${randomUUID()}`,
      },
      "Worker",
      201,
    )
  ).value;
  const id = created.incident.incidentId;
  if (fresh) assert.equal(id, "TS-0002");
  report.incidentId = id;
  await real(
    "incident-confirm",
    "POST",
    `/incidents/${id}/confirm`,
    { confirmedBy: "WRK-014", corrections: {} },
    "Worker",
  );
  const proposalResponse = await fetch(
    base + `/api/incidents/${id}/proposals`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-demo-user": "DEMO-MANAGER",
        "x-demo-role": "Manager",
      },
      body: JSON.stringify({
        type: "TOOL_RESTRICTION",
        reason: "Review recurring synthetic torque reports",
      }),
    },
  );
  const proposalAttempt = await proposalResponse.json();
  assert.notEqual(proposalAttempt._stub, true);
  assert.equal(proposalResponse.status, 409);
  assert.equal(proposalAttempt.error.code, "INSUFFICIENT_EVIDENCE");
  report.proposalAttempt = {
    status: proposalResponse.status,
    code: proposalAttempt.error.code,
    actionExecuted: false,
  };
  const history = (await real("tool-history", "GET", "/tools/TOOL-B/history"))
    .value;
  assert(history.events.some((e) => e.refId === "TS-0001"));
  const truth = require("../tests/ground-truth.candidate.json");
  for (const h of [24, 72, 168]) {
    const { value, durationMs } = await real(
      "trace",
      "GET",
      `/incidents/${id}/trace?window=${h}`,
    );
    const expected = truth.tools["TOOL-B"][h];
    assert.deepEqual(
      JSON.parse(
        JSON.stringify(
          value.units.map((u) => ({
            serial: u.serial,
            tier: u.tier,
            location: u.locationStatus,
            dealerId: u.dealerId,
          })),
        ),
      ),
      expected.units,
    );
    assert.equal(value.dataQuality.score, expected.score);
    assert.deepEqual(
      [
        value.exposureRange.low,
        value.exposureRange.high,
        value.exposureRange.unknownSeparate,
      ],
      [35, 154, 6],
    );
    assert(value.units.every((u) => u.evidenceIds.includes(u.serial)));
    report.trace.push({
      windowHours: h,
      totalUnits: value.summary.totalUnits,
      byTier: value.summary.byTier,
      score: value.dataQuality.score,
      durationMs,
    });
  }
  const mockRequests = [
    [
      "maintenance",
      "/mock/s4/maintenance-notifications",
      {
        incidentId: id,
        toolId: "TOOL-B",
        shortText: "Inspect Tool B",
        priority: "2",
        requestedBy: "MGR-01",
      },
    ],
    [
      "quality",
      "/mock/s4/quality-notifications",
      {
        incidentId: id,
        toolId: "TOOL-B",
        shortText: "Review potential exposure",
        batchIds: ["BATCH-B-DUP"],
        requestedBy: "QA-01",
      },
    ],
    [
      "stock-block",
      "/mock/s4/stock-blocks",
      {
        incidentId: id,
        batchIds: ["BATCH-B-DUP"],
        plant: "PLANT-01",
        storageLocation: "STORE-01",
        reason: "Review potential exposure",
      },
    ],
    [
      "restriction",
      "/mock/dm/tool-restrictions",
      {
        incidentId: id,
        toolId: "TOOL-B",
        action: "RESTRICT",
        reason: "Review torque report",
      },
    ],
  ];
  for (const [name, path, body] of mockRequests) {
    const { value } = await real(name, "POST", path, body, "Manager", 409);
    assert.equal(value.error.code, "APPROVAL_REQUIRED");
    report.simulatedSAP.push({
      action: name,
      status: "VERIFIED_APPROVAL_REJECTION",
    });
  }
  const contract = require("../srv/routes/_stubs/contract.json");
  for (const e of contract.filter((e) => e.owner !== "platform" && e.owner !== "Shashank")) {
    // Avoid deciding a real approval or verified return without persisted workflow/repair setup.
    if (["approval-decision", "verify-return"].includes(e.name)) {
      report.remainingStubs.push(e.name);
      continue;
    }
    const route = e.path.replace(":id", id);
    const response = await fetch(base + "/api" + route, {
      method: e.method,
      headers: {
        "content-type": "application/json",
        "x-demo-user": "DEMO-MANAGER",
        "x-demo-role": "Manager",
      },
      ...(e.method === "POST"
        ? { body: JSON.stringify(e.request) }
        : {}),
    });
    const value = await response.json();
    if (value._stub === true) {
      report.remainingStubs.push(e.name);
    } else
      report.blocked.push({
        step: e.name,
        reason:
          "A non-stub route answered an endpoint declared as a remaining external stub; review the contract ownership mapping.",
        httpStatus: response.status,
      });
  }
  const audit = (await real("audit", "GET", `/audit?incident=${id}`)).value
    .entries;
  for (const action of [
    "INCIDENT_CREATED",
    "INCIDENT_CONFIRMED",
    "TRACE_GENERATED",
  ])
    assert(audit.some((e) => e.action === action));
  const timeline = (await real("tool-history", "GET", "/tools/TOOL-B/history"))
    .value;
  assert(
    timeline.events.filter((e) => e.type === "TRACE" && e.refId === id)
      .length === 3,
  );
  await real("incident-get", "GET", "/incidents/" + id);
  await real("documents", "GET", "/mock/documents?incident=" + id);
  await real("health", "GET", "/health");
  if (examples)
    for (const [name, value] of Object.entries(fixtures))
      fs.writeFileSync(
        "docs/examples/" + name + ".json",
        JSON.stringify(value, null, 2) + "\n",
      );
  if (process.env.SMOKE_NO_ARTIFACTS !== "true") {
    fs.mkdirSync("tests/results", { recursive: true });
    fs.writeFileSync(
      "tests/results/smoke-results.json",
      JSON.stringify(report, null, 2) + "\n",
    );
  }
  console.log(JSON.stringify(report, null, 2));
  return report;
}
module.exports = smoke;
if (require.main === module)
  smoke(undefined, {
    fresh: process.argv.includes("--fresh"),
    examples: process.argv.includes("--update-examples"),
  }).catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
