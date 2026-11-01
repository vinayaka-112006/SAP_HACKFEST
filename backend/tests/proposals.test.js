const cds = require("@sap/cds");
const request = require("supertest");
const { entity } = require("../srv/lib/db");
const { buildContainmentProposal } = require("../srv/lib/containment-proposals");

cds.test(__dirname + "/..");
jest.setTimeout(30000);

const api = (method, url, body, role = "Worker", identity = true) => {
  const call = request(cds.app)[method]("/api" + url);
  if (identity)
    call.set("x-demo-user", "PROPOSAL-TEST").set("x-demo-role", role);
  return body === undefined ? call : call.send(body);
};

let sequence = 0;
function category(prefix) {
  sequence += 1;
  return `PROPOSAL-${prefix}-${sequence}`;
}

async function report(
  failureCategory,
  reportedAt = "2026-10-31T05:12:00.000Z",
  { suggestedNcCode = null, toolId = "TOOL-B" } = {},
) {
  const response = await api("post", "/incidents", {
    toolId,
    reporterId: `PROPOSAL-REPORTER-${sequence + 1}`,
    language: "en",
    rawText: `Synthetic ${failureCategory} tool report`,
    translatedText: `Synthetic ${failureCategory} tool report`,
    category: failureCategory,
    suggestedNcCode,
    reportedAt,
  });
  expect(response.status).toBe(201);
  return response.body.incident;
}

async function confirm(incident) {
  const response = await api("post", `/incidents/${incident.incidentId}/confirm`, {
    confirmedBy: "PROPOSAL-REPORTER",
  });
  expect(response.status).toBe(200);
  return response.body.incident;
}

async function repeatedConfirmedIncident(prefix) {
  const failureCategory = category(prefix);
  await report(failureCategory, "2026-10-29T05:12:00.000Z");
  await report(failureCategory, "2026-10-30T05:12:00.000Z");
  return confirm(await report(failureCategory));
}

async function createTrace(incident) {
  const response = await api(
    "get",
    `/incidents/${incident.incidentId}/trace?window=168`,
    undefined,
    "Manager",
  );
  expect(response.status).toBe(200);
  return response.body;
}

test("TOOL_RESTRICTION requires repeat evidence and remains review-only", async () => {
  const incident = await repeatedConfirmedIncident("RESTRICT");
  const proposal = await api("post", `/incidents/${incident.incidentId}/proposals`, {
    type: "TOOL_RESTRICTION",
    reason: "Review recurring tool reports",
  });
  expect(proposal.status).toBe(200);
  expect(proposal.body).toMatchObject({
    _stub: false,
    created: true,
    requiredApproverRole: "Manager",
    actionExecuted: false,
    proposal: {
      type: "TOOL_RESTRICTION",
      state: "Pending",
      payload: {
        toolId: "TOOL-B",
        action: "RESTRICT",
        evidence: {
          repeatFailure: {
            count: 2,
            matchingIncidentIds: expect.any(Array),
          },
        },
      },
    },
  });
  expect(proposal.body.proposal.payload.evidence.repeatFailure.matchingIncidentIds).toHaveLength(2);
  expect(await cds.db.run(cds.ql.SELECT.one.from(entity("AuditLog")).where({
    incidentId: incident.incidentId,
    action: "CONTAINMENT_PROPOSAL_CREATED",
  }))).toMatchObject({ actor: "PROPOSAL-TEST", actorRole: "Worker" });
  expect((await cds.db.run(cds.ql.SELECT.one.from(entity("Tool")).where({ toolId: "TOOL-B" }))).state).toBe("Active");
  expect(await cds.db.run(cds.ql.SELECT.from(entity("Approval")).where({ proposalId: proposal.body.proposal.proposalId }))).toHaveLength(0);
});

test("MAINTENANCE_NOTIFICATION uses repeat reports and current platform priority", async () => {
  const incident = await repeatedConfirmedIncident("MAINT");
  const response = await api("post", `/incidents/${incident.incidentId}/proposals`, {
    type: "MAINTENANCE_NOTIFICATION",
    reason: "Request maintenance review",
  });
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({
    requiredApproverRole: "Manager",
    proposal: {
      type: "MAINTENANCE_NOTIFICATION",
      state: "Pending",
      payload: {
        toolId: "TOOL-B",
        priority: "2",
        shortText: expect.stringContaining("recurring"),
      },
    },
    actionExecuted: false,
  });
});

test("QUALITY_NOTIFICATION requires a confirmed NC code and trace-backed real batch IDs", async () => {
  const incident = await confirm(
    await report(category("QUALITY"), undefined, {
      suggestedNcCode: "NC-TORQUE-LOOSE",
    }),
  );
  const trace = await createTrace(incident);
  const response = await api("post", `/incidents/${incident.incidentId}/proposals`, {
    type: "QUALITY_NOTIFICATION",
    reason: "Quality review requested",
  });
  expect(response.status).toBe(200);
  expect(response.body.requiredApproverRole).toBe("Quality");
  expect(response.body.proposal.state).toBe("Pending");
  expect(response.body.actionExecuted).toBe(false);
  const batchIds = response.body.proposal.payload.batchIds;
  expect(batchIds.length).toBeGreaterThan(0);
  expect(batchIds.every((id) => trace.units.some((unit) => unit.batchId === id && unit.tier === "CONFIRMED"))).toBe(true);
  expect(response.body.proposal.payload.evidence.basis.confirmedBatchIds).toEqual(batchIds);
});

test("STOCK_BLOCK is limited to trace-linked batches with positive unrestricted stock and no shipments", async () => {
  const incident = await confirm(await report(category("STOCK")));
  const trace = await createTrace(incident);
  const response = await api("post", `/incidents/${incident.incidentId}/proposals`, {
    type: "STOCK_BLOCK",
    reason: "Review trace-linked stock",
  });
  expect(response.status).toBe(200);
  expect(response.body.requiredApproverRole).toBe("Quality");
  expect(response.body.proposal.payload).toMatchObject({
    plant: "PLANT-01",
    storageLocation: "STORE-01",
  });
  const batchIds = response.body.proposal.payload.batchIds;
  expect(batchIds.length).toBeGreaterThan(0);
  for (const batchId of batchIds) {
    expect(trace.units.some((unit) => unit.batchId === batchId && unit.tier === "CONFIRMED" && unit.locationStatus === "IN_STOCK")).toBe(true);
    expect(await cds.db.run(cds.ql.SELECT.one.from(entity("Batch")).where({ batchId }))).toBeTruthy();
    expect((await cds.db.run(cds.ql.SELECT.from(entity("InventoryStock")).where({ batchId }))).some((row) => row.location === "STORE-01" && row.stockStatus === "UNRESTRICTED" && row.quantity > 0)).toBe(true);
    expect(await cds.db.run(cds.ql.SELECT.one.from(entity("Shipment")).where({ batchId }))).toBeFalsy();
  }
  expect(response.body.evidence.affectedQuantity).toBeNull();
});

test("missing trace or batch evidence keeps exposure Unknown and writes no proposal", async () => {
  const incident = await confirm(await report(category("NO-TRACE")));
  const before = await cds.db.run(cds.ql.SELECT.from(entity("Proposal")).where({ incidentId: incident.incidentId }));
  const response = await api("post", `/incidents/${incident.incidentId}/proposals`, {
    type: "STOCK_BLOCK",
    reason: "Review possible stock concern",
  });
  expect(response.status).toBe(409);
  expect(response.body.error.details).toMatchObject({
    reason: "exposure_unknown_or_batch_evidence_missing",
    exposure: "Unknown",
  });
  expect(await cds.db.run(cds.ql.SELECT.from(entity("Proposal")).where({ incidentId: incident.incidentId }))).toEqual(before);
});

test("repeat proposals stay below threshold with one prior report and quality requires an NC code", async () => {
  const repeatCategory = category("BELOW-THRESHOLD");
  await report(repeatCategory, "2026-10-30T05:12:00.000Z");
  const repeatIncident = await confirm(await report(repeatCategory));
  const restriction = await api(
    "post",
    `/incidents/${repeatIncident.incidentId}/proposals`,
    { type: "TOOL_RESTRICTION", reason: "Review tool" },
  );
  expect(restriction.status).toBe(409);
  expect(restriction.body.error.details.reason).toBe(
    "repeat_failure_threshold_not_met",
  );

  const qualityIncident = await confirm(await report(category("NO-NC-CODE")));
  await createTrace(qualityIncident);
  const quality = await api(
    "post",
    `/incidents/${qualityIncident.incidentId}/proposals`,
    { type: "QUALITY_NOTIFICATION", reason: "Review quality evidence" },
  );
  expect(quality.status).toBe(409);
  expect(quality.body.error.details.reason).toBe("quality_code_missing");
});

test("pure builder rejects empty batch evidence and non-confirmed incidents", () => {
  const incident = {
    incidentId: "I-1",
    toolId: "TOOL-B",
    category: "TORQUE",
    state: "Confirmed",
    suggestedNcCode: "NC-TORQUE-LOOSE",
  };
  expect(buildContainmentProposal({
    type: "STOCK_BLOCK",
    reason: "Review stock",
    incident,
    trace: { traceId: "T-1", version: 1 },
    stockBatchIds: [],
  })).toMatchObject({ eligible: false, reason: "exposure_unknown_or_batch_evidence_missing" });
  expect(buildContainmentProposal({
    type: "QUALITY_NOTIFICATION",
    reason: "Review quality",
    incident: { ...incident, state: "Reported" },
    trace: { traceId: "T-1", version: 1 },
    qualityBatchIds: ["B-1"],
  })).toMatchObject({ eligible: false, reason: "incident_not_confirmed" });
});

test("proposal retries reuse the pending proposal and do not add audit records", async () => {
  const incident = await repeatedConfirmedIncident("IDEMPOTENT");
  const body = { type: "TOOL_RESTRICTION", reason: "Retry-safe request" };
  const first = await api("post", `/incidents/${incident.incidentId}/proposals`, body);
  const auditBefore = await cds.db.run(cds.ql.SELECT.from(entity("AuditLog")).where({ incidentId: incident.incidentId, action: "CONTAINMENT_PROPOSAL_CREATED" }));
  const second = await api("post", `/incidents/${incident.incidentId}/proposals`, body);
  const auditAfter = await cds.db.run(cds.ql.SELECT.from(entity("AuditLog")).where({ incidentId: incident.incidentId, action: "CONTAINMENT_PROPOSAL_CREATED" }));
  expect(first.status).toBe(200);
  expect(second.status).toBe(200);
  expect(second.body.created).toBe(false);
  expect(second.body.proposal.proposalId).toBe(first.body.proposal.proposalId);
  expect(second.body.auditId).toBe(first.body.auditId);
  expect(auditAfter).toHaveLength(auditBefore.length);
  expect(await cds.db.run(cds.ql.SELECT.from(entity("Proposal")).where({ incidentId: incident.incidentId, type: "TOOL_RESTRICTION" }))).toHaveLength(1);
});

test("retrying an approved proposal returns its persisted Approval ID for the UI handoff", async () => {
  const incident = await repeatedConfirmedIncident("APPROVED-RETRY");
  const body = { type: "TOOL_RESTRICTION", reason: "Approved retry handoff" };
  const first = await api("post", `/incidents/${incident.incidentId}/proposals`, body);
  const proposalId = first.body.proposal.proposalId;
  const decision = await api("post", `/approvals/${proposalId}/decision`, {
    decision: "APPROVED",
    reason: "Reviewed and approved",
  }, "Manager");
  expect(decision.status).toBe(200);
  const retry = await api("post", `/incidents/${incident.incidentId}/proposals`, body);
  expect(retry.status).toBe(200);
  expect(retry.body.created).toBe(false);
  expect(retry.body.proposal.state).toBe("Approved");
  expect(retry.body.approval.approvalId).toBe(decision.body.approval.approvalId);
});

test("proposal generation requires authentication and permits only Worker or Manager", async () => {
  const incident = await repeatedConfirmedIncident("AUTH");
  const path = `/incidents/${incident.incidentId}/proposals`;
  expect((await api("post", path, { type: "TOOL_RESTRICTION", reason: "Review" }, "Worker", false)).status).toBe(401);
  expect((await api("post", path, { type: "TOOL_RESTRICTION", reason: "Review" }, "Technician")).status).toBe(403);
  expect((await api("post", path, { type: "TOOL_RESTRICTION", reason: "Review" }, "Manager")).status).toBe(200);
});

test("invalid, unconfirmed, incomplete and caller-supplied batch evidence are rejected", async () => {
  expect((await api("post", "/incidents/MISSING-PROPOSAL/proposals", { type: "TOOL_RESTRICTION", reason: "Review" })).body.error.code).toBe("INCIDENT_NOT_FOUND");
  const incident = await report(category("UNCONFIRMED"));
  const unconfirmed = await api("post", `/incidents/${incident.incidentId}/proposals`, { type: "TOOL_RESTRICTION", reason: "Review" });
  expect(unconfirmed.status).toBe(409);
  expect(unconfirmed.body.error.details.reason).toBe("incident_not_confirmed");
  const extra = await api("post", `/incidents/${incident.incidentId}/proposals`, {
    type: "STOCK_BLOCK",
    reason: "Review",
    batchIds: ["INVENTED-BATCH"],
  });
  expect(extra.status).toBe(400);
  const noReason = await api("post", `/incidents/${incident.incidentId}/proposals`, { type: "STOCK_BLOCK", reason: " " });
  expect(noReason.status).toBe(400);
});
