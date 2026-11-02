const cds = require("@sap/cds");
const request = require("supertest");
const { entity } = require("../srv/lib/db");

cds.test(__dirname + "/..");
jest.setTimeout(30000);

const api = (method, path, body, role = "Manager", identity = true) => {
  const call = request(cds.app)[method]("/api" + path);
  if (identity)
    call.set("x-demo-user", "APPROVAL-REVIEWER").set("x-demo-role", role);
  return body === undefined ? call : call.send(body);
};

let sequence = 0;
const payloads = {
  TOOL_RESTRICTION: {
    toolId: "TOOL-B",
    action: "RESTRICT",
    reason: "Review the confirmed recurrence",
  },
  MAINTENANCE_NOTIFICATION: {
    toolId: "TOOL-B",
    shortText: "Review Tool B recurring reports",
    priority: "2",
  },
  QUALITY_NOTIFICATION: {
    toolId: "TOOL-B",
    shortText: "Review trace-linked quality concern",
    batchIds: ["BATCH-B-DUP"],
  },
  STOCK_BLOCK: {
    batchIds: ["BATCH-B-DUP"],
    plant: "PLANT-01",
    storageLocation: "STORE-01",
    reason: "Review trace-linked stock",
  },
};
const roles = {
  TOOL_RESTRICTION: "Manager",
  MAINTENANCE_NOTIFICATION: "Manager",
  QUALITY_NOTIFICATION: "Quality",
  STOCK_BLOCK: "Quality",
};

async function pendingProposal(type = "TOOL_RESTRICTION", payload = payloads[type]) {
  sequence += 1;
  const proposalId = `PROP-APPROVAL-${sequence}`;
  await cds.db.run(
    cds.ql.INSERT.into(entity("Proposal")).entries({
      proposalId,
      incidentId: "TS-0001",
      type,
      payload: JSON.stringify(payload),
      reason: "Synthetic pending proposal for workflow validation",
      state: "Pending",
      createdAt: "2026-10-31T05:14:00.000Z",
    }),
  );
  return proposalId;
}

test.each(Object.entries(roles))(
  "%s approval uses the platform required role and creates no action side effect",
  async (type, requiredRole) => {
    const proposalId = await pendingProposal(type);
    const response = await api(
      "post",
      `/approvals/${proposalId}/decision`,
      { decision: "APPROVED", reason: "Evidence reviewed and approved" },
      requiredRole,
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      _label: "SIMULATED",
      _stub: false,
      actionExecuted: false,
      approval: {
        proposalId,
        approverRole: requiredRole,
        decision: "APPROVED",
        reason: "Evidence reviewed and approved",
        decidedBy: "APPROVAL-REVIEWER",
      },
      proposal: { proposalId, state: "Approved" },
    });
    expect(Number.isFinite(Date.parse(response.body.approval.decidedAt))).toBe(true);
    expect(response.body.auditId).toBeTruthy();
    expect(
      await cds.db.run(
        cds.ql.SELECT.from(entity("Approval")).where({ proposalId }),
      ),
    ).toHaveLength(1);
    expect(
      await cds.db.run(
        cds.ql.SELECT.one.from(entity("AuditLog")).where({
          auditId: response.body.auditId,
          action: "PROPOSAL_APPROVED",
        }),
      ),
    ).toMatchObject({ actor: "APPROVAL-REVIEWER", actorRole: requiredRole });
    expect(
      await cds.db.run(
        cds.ql.SELECT.from(entity("MockDocument")).where({
          incidentId: "TS-0001",
        }),
      ),
    ).toHaveLength(0);
    expect(
      (await cds.db.run(
        cds.ql.SELECT.one.from(entity("Tool")).where({ toolId: "TOOL-B" }),
      )).state,
    ).toBe("Active");
  },
);

test("rejection requires and persists a reason, updates proposal once, and cannot execute", async () => {
  const proposalId = await pendingProposal("TOOL_RESTRICTION");
  const response = await api(
    "post",
    `/approvals/${proposalId}/decision`,
    { decision: "REJECTED", reason: "Recurrence evidence needs more review" },
    "Manager",
  );
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({
    actionExecuted: false,
    proposal: { proposalId, state: "Rejected" },
    approval: {
      proposalId,
      approverRole: "Manager",
      decision: "REJECTED",
      reason: "Recurrence evidence needs more review",
      decidedBy: "APPROVAL-REVIEWER",
    },
  });
  const action = await api(
    "post",
    "/mock/dm/tool-restrictions",
    {
      toolId: "TOOL-B",
      incidentId: "TS-0001",
      action: "RESTRICT",
      reason: "Review the confirmed recurrence",
      approvalId: response.body.approval.approvalId,
    },
    "Manager",
  );
  expect(action.status).toBe(409);
  expect(action.body.error.code).toBe("APPROVAL_REQUIRED");
  expect((await cds.db.run(cds.ql.SELECT.one.from(entity("Tool")).where({ toolId: "TOOL-B" }))).state).toBe("Active");
});

test("rejection reason is mandatory; approval reason is persisted and reviewer identity cannot be supplied", async () => {
  const rejectionTarget = await pendingProposal("STOCK_BLOCK");
  const missingRejectionReason = await api(
    "post",
    `/approvals/${rejectionTarget}/decision`,
    { decision: "REJECTED" },
    "Quality",
  );
  expect(missingRejectionReason.status).toBe(400);
  expect(missingRejectionReason.body.error.message).toMatch(/rejection reason/i);
  expect(await cds.db.run(cds.ql.SELECT.from(entity("Approval")).where({ proposalId: rejectionTarget }))).toHaveLength(0);

  const approvalTarget = await pendingProposal("STOCK_BLOCK");
  const spoof = await api(
    "post",
    `/approvals/${approvalTarget}/decision`,
    { decision: "APPROVED", reason: "Reviewed", decidedBy: "SPOOFED" },
    "Quality",
  );
  expect(spoof.status).toBe(400);
  const missingApprovalReason = await api(
    "post",
    `/approvals/${approvalTarget}/decision`,
    { decision: "APPROVED" },
    "Quality",
  );
  expect(missingApprovalReason.status).toBe(400);
  expect(
    await cds.db.run(
      cds.ql.SELECT.one.from(entity("Proposal")).where({ proposalId: approvalTarget }),
    ),
  ).toMatchObject({ state: "Pending" });
});

test("authentication and proposal-specific role checks deny unauthorized decisions", async () => {
  const proposalId = await pendingProposal("QUALITY_NOTIFICATION");
  const path = `/approvals/${proposalId}/decision`;
  const body = { decision: "APPROVED", reason: "Review complete" };
  expect((await api("post", path, body, "Quality", false)).status).toBe(401);
  expect((await api("post", path, body, "Worker")).status).toBe(403);
  expect((await api("post", path, body, "Manager")).status).toBe(403);
  expect(await cds.db.run(cds.ql.SELECT.from(entity("Approval")).where({ proposalId }))).toHaveLength(0);
});

test("missing proposals, unsupported decisions, and malformed pending payloads fail safely", async () => {
  const missing = await api(
    "post",
    "/approvals/PROP-MISSING/decision",
    { decision: "APPROVED", reason: "Reviewed" },
  );
  expect(missing.status).toBe(404);
  expect(missing.body.error.code).toBe("PROPOSAL_NOT_FOUND");
  const malformed = await pendingProposal("TOOL_RESTRICTION", { action: "RESTRICT" });
  const invalid = await api(
    "post",
    `/approvals/${malformed}/decision`,
    { decision: "MAYBE", reason: "Reviewed" },
  );
  expect(invalid.status).toBe(400);
  const badPayload = await api(
    "post",
    `/approvals/${malformed}/decision`,
    { decision: "APPROVED", reason: "Reviewed" },
  );
  expect(badPayload.status).toBe(409);
  expect(badPayload.body.error.code).toBe("INVALID_PROPOSAL");
});

test("terminal proposals reject retries and conflicting decisions without extra Approval rows", async () => {
  const approvedId = await pendingProposal("TOOL_RESTRICTION");
  const approve = { decision: "APPROVED", reason: "Approved after review" };
  expect((await api("post", `/approvals/${approvedId}/decision`, approve)).status).toBe(200);
  const retry = await api("post", `/approvals/${approvedId}/decision`, approve);
  const conflict = await api("post", `/approvals/${approvedId}/decision`, {
    decision: "REJECTED",
    reason: "Conflicting later decision",
  });
  expect(retry.status).toBe(409);
  expect(conflict.status).toBe(409);
  expect(await cds.db.run(cds.ql.SELECT.from(entity("Approval")).where({ proposalId: approvedId }))).toHaveLength(1);

  const rejectedId = await pendingProposal("STOCK_BLOCK");
  expect((await api("post", `/approvals/${rejectedId}/decision`, {
    decision: "REJECTED",
    reason: "Rejected after review",
  }, "Quality")).status).toBe(200);
  const lateApproval = await api("post", `/approvals/${rejectedId}/decision`, {
    decision: "APPROVED",
    reason: "Try to reverse rejection",
  }, "Quality");
  expect(lateApproval.status).toBe(409);
  expect(await cds.db.run(cds.ql.SELECT.from(entity("Approval")).where({ proposalId: rejectedId }))).toHaveLength(1);
  expect(await cds.db.run(cds.ql.SELECT.one.from(entity("Proposal")).where({ proposalId: rejectedId }))).toMatchObject({ state: "Rejected" });
});

test("conflicting concurrent decisions produce at most one committed decision", async () => {
  const proposalId = await pendingProposal("TOOL_RESTRICTION");
  const path = `/approvals/${proposalId}/decision`;
  const responses = await Promise.all([
    api("post", path, { decision: "APPROVED", reason: "Concurrent approval" }),
    api("post", path, { decision: "REJECTED", reason: "Concurrent rejection" }),
  ]);
  expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
  expect(await cds.db.run(cds.ql.SELECT.from(entity("Approval")).where({ proposalId }))).toHaveLength(1);
  const proposal = await cds.db.run(cds.ql.SELECT.one.from(entity("Proposal")).where({ proposalId }));
  expect(["Approved", "Rejected"]).toContain(proposal.state);
});
