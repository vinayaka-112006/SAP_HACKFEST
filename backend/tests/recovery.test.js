const cds = require('@sap/cds');
const express = require('express');
const request = require('supertest');
const { entity, decode } = require('../srv/lib/db');
const { eligibility, plan } = require('../srv/lib/recovery-planner');
const { createRouter } = require('../srv/routes/recovery.router');
cds.test(__dirname + '/..');
jest.setTimeout(30000);
let sequence = 0;
function provider(option = 'PAUSE') {
  let calls = 0;
  return { complete: jest.fn(async messages => {
    calls++;
    if (calls % 2) return { content: JSON.stringify({ toolCalls: ['get_incident', 'get_trace', 'get_alternatives'] }), model: 'test-model' };
    const evidence = JSON.parse(messages.at(-1).content).toolResults.get_alternatives;
    return { content: JSON.stringify({ optionId: option, evidenceIds: evidence.evidenceIds }), model: 'test-model' };
  }) };
}
function app(client = provider()) {
  const value = express(); value.use(express.json());
  value.use('/api', createRouter({ clientFactory: () => client }));
  value.use('/api', require('../srv/routes/proposals.router').router);
  value.use('/api', require('../srv/routes/incident.router').router);
  value.use(require('../srv/lib/errors'));
  return value;
}
const api = (server, method, path, body, role = 'Manager') => {
  const call = request(server)[method]('/api' + path).set('x-demo-user', 'RECOVERY-TEST').set('x-demo-role', role);
  return body === undefined ? call : call.send(body);
};
async function incident() {
  const id = `RECOVERY-TEST-${++sequence}`;
  await cds.db.run(cds.ql.INSERT.into(entity('Incident')).entries({ incidentId: id, toolId: 'TOOL-B',
    reporterId: 'RECOVERY-WORKER', language: 'en', rawText: 'Wire is not working', state: 'Confirmed',
    createdAt: new Date().toISOString(), reportedAt: new Date().toISOString(), confirmedBy: 'RECOVERY-WORKER' }));
  return id;
}
const endpoint = id => `/incidents/${id}/recovery`;
async function createPlan(server, id) {
  const result = await api(server, 'post', endpoint(id) + '/plans', {});
  expect(result.status).toBe(201);
  return result.body;
}
async function propose(server, id, planId) {
  const result = await api(server, 'post', endpoint(id) + '/proposals', { planId, reason: 'Reviewed recovery evidence' });
  expect(result.status).toBe(201);
  return result.body.proposal;
}
async function approve(server, proposalId) {
  const result = await api(server, 'post', `/approvals/${proposalId}/decision`, { decision: 'APPROVED', reason: 'Reviewed simulation scope' });
  expect(result.status).toBe(200);
  return result.body.approval.approvalId;
}
test('missing evidence, expired calibration and incompatible tool stay Unknown', () => {
  const source = { type: 'TORQUE' };
  const candidate = { state: 'Active', type: 'TORQUE', calibrationDue: '2099-01-01' };
  expect(eligibility(source, candidate).eligible).toBe(false);
  const evidence = { operationCompatible: true, available: true, sourceReference: 'SPEC-1', reviewedBy: 'MGR', validUntil: '2099-01-01' };
  expect(eligibility(source, candidate, evidence).eligible).toBe(true);
  expect(eligibility(source, { ...candidate, calibrationDue: '2000-01-01' }, evidence).eligible).toBe(false);
  expect(eligibility(source, { ...candidate, type: 'DRILL' }, evidence).eligible).toBe(false);
  expect(eligibility(source, candidate, { ...evidence, available: false }).eligible).toBe(false);
  expect(eligibility(source, candidate, { ...evidence, validUntil: '2000-01-01' }).eligible).toBe(false);
});
test('planner must retrieve all allowlisted tools and cannot invent evidence or choose ineligible options', async () => {
  const context = { incident: { incidentId: 'I' }, candidates: [], options: [{ optionId: 'PAUSE', eligible: true }], evidenceIds: ['I'] };
  for (const output of [{ optionId: 'PAUSE', evidenceIds: ['I'] }, { toolCalls: ['execute_action'] }, { toolCalls: ['__proto__'] }, null, []]) {
    await expect(plan(context, { complete: async () => ({ content: JSON.stringify(output) }) })).rejects.toBeDefined();
  }
  for (const output of [{ optionId: 'ALTERNATIVE:TOOL-C', evidenceIds: ['I'] }, { optionId: 'PAUSE', evidenceIds: ['FAKE'] }]) {
    let calls = 0;
    await expect(plan(context, { complete: async () => ({ content: JSON.stringify(++calls === 1 ? { toolCalls: ['get_incident', 'get_trace', 'get_alternatives'] } : output) }) })).rejects.toBeDefined();
  }
});
test('persisted plan has actual handoffs, audit, no automatic proposal, and Unknown downtime', async () => {
  const client = provider(), server = app(client), id = await incident();
  const result = await createPlan(server, id);
  expect(client.complete).toHaveBeenCalledTimes(2);
  expect(result).toMatchObject({ _label: 'SIMULATED', actionExecuted: false, estimatedDowntimeAvoided: null, requiresApproval: true });
  expect(result.steps.filter(s => s.tool)).toHaveLength(3);
  expect(await cds.db.run(cds.ql.SELECT.from(entity('Proposal')).where({ incidentId: id }))).toHaveLength(0);
  expect(await cds.db.run(cds.ql.SELECT.from(entity('AuditLog')).where({ incidentId: id, action: 'RECOVERY_PLAN_GENERATED' }))).toHaveLength(1);
});
test('pause proposal uses existing approval workflow; scope mismatch denied, execution once only', async () => {
  const server = app(), id = await incident(), saved = await createPlan(server, id);
  const proposal = await propose(server, id, saved.docId);
  expect((await api(server, 'post', endpoint(id) + '/execute', { approvalId: 'FAKE' })).status).toBe(409);
  const approvalId = await approve(server, proposal.proposalId);
  const other = await incident();
  expect((await api(server, 'post', endpoint(other) + '/execute', { approvalId })).status).toBe(409);
  const executed = await api(server, 'post', endpoint(id) + '/execute', { approvalId });
  expect(executed.status).toBe(201);
  expect(executed.body).toMatchObject({ _label: 'SIMULATED', actionExecuted: true, externalActionExecuted: false });
  expect((await api(server, 'post', endpoint(id) + '/execute', { approvalId })).status).toBe(409);
});
test('worker cannot plan or attest; Quality cannot approve recovery; provider failure creates no plan', async () => {
  const server = app(), id = await incident();
  expect((await api(server, 'post', endpoint(id) + '/plans', {}, 'Worker')).status).toBe(403);
  expect((await api(server, 'post', endpoint(id) + '/evidence', {}, 'Quality')).status).toBe(403);
  const saved = await createPlan(server, id), proposal = await propose(server, id, saved.docId);
  expect((await api(server, 'post', `/approvals/${proposal.proposalId}/decision`, { decision: 'APPROVED', reason: 'test' }, 'Quality')).status).toBe(403);
  const brokenId = await incident();
  const failure = await api(app({ complete: async () => { throw new Error('provider-private-detail'); } }), 'post', endpoint(brokenId) + '/plans', {});
  expect(failure.status).toBe(503); expect(JSON.stringify(failure.body)).not.toContain('provider-private-detail');
  expect(await cds.db.run(cds.ql.SELECT.from(entity('MockDocument')).where({ incidentId: brokenId }))).toHaveLength(0);
});
test('evidence changes invalidate a saved recommendation', async () => {
  const server = app(), id = await incident(), saved = await createPlan(server, id);
  expect((await api(server, 'post', endpoint(id) + '/evidence', { alternativeToolId: 'TOOL-C', sourceReference: 'Reviewed SPEC test', operationCompatible: true, available: true, validUntil: new Date(Date.now() + 3600000).toISOString() })).status).toBe(201);
  const result = await api(server, 'post', endpoint(id) + '/proposals', { planId: saved.docId, reason: 'Review' });
  expect(result.status).toBe(409); expect(result.body.error.code).toBe('STALE_RECOVERY_PLAN');
});
test('alternative execution rechecks eligibility after approval and rejects development bypass', async () => {
  const server = app(provider('ALTERNATIVE:TOOL-C')), id = await incident();
  await cds.db.run(cds.ql.UPDATE(entity('Tool')).set({ calibrationDue: '2099-01-01', state: 'Active' }).where({ toolId: 'TOOL-C' }));
  const result = await api(server, 'post', endpoint(id) + '/evidence', { alternativeToolId: 'TOOL-C', sourceReference: 'SPEC-TEST / SHIFT-TEST', operationCompatible: true, available: true, validUntil: new Date(Date.now() + 3600000).toISOString() });
  expect(result.status).toBe(201);
  const saved = await createPlan(server, id), proposal = await propose(server, id, saved.docId);
  const approvalId = await approve(server, proposal.proposalId);
  await cds.db.run(cds.ql.UPDATE(entity('Tool')).set({ state: 'Restricted' }).where({ toolId: 'TOOL-C' }));
  const stale = await api(server, 'post', endpoint(id) + '/execute', { approvalId });
  expect(stale.status).toBe(409); expect(stale.body.error.code).toBe('STALE_RECOVERY_PLAN');
  await cds.db.run(cds.ql.UPDATE(entity('Tool')).set({ state: 'Active' }).where({ toolId: 'TOOL-C' }));
  const previous = { enforce: process.env.ENFORCE_APPROVALS, allow: process.env.ALLOW_UNAPPROVED_MOCKS };
  try {
    process.env.ENFORCE_APPROVALS = 'false'; process.env.ALLOW_UNAPPROVED_MOCKS = 'true';
    expect((await api(server, 'post', endpoint(id) + '/execute', { approvalId })).status).toBe(409);
  } finally {
    for (const [name, value] of [['ENFORCE_APPROVALS', previous.enforce], ['ALLOW_UNAPPROVED_MOCKS', previous.allow]])
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
  expect((await api(server, 'post', endpoint(id) + '/execute', { approvalId })).status).toBe(201);
});
test('report reflects stored observations and state, not invented causes, readings or closure', async () => {
  const server = app(), id = await incident();
  const result = await api(server, 'get', `/incidents/${id}/executive-report`);
  expect(result.status).toBe(200);
  expect(result.body.incident).toMatchObject({ rawText: 'Wire is not working', state: 'Confirmed' });
  expect(result.body.repairs).toEqual([]); expect(result.body.traces).toEqual([]);
  expect(JSON.stringify(result.body)).not.toMatch(/45\.2|spring relaxation|FULLY RESOLVED|cryptographic/);
  expect((await api(server, 'get', `/incidents/${id}/repair-records`, undefined, 'Technician')).status).toBe(200);
});
test('worker name and same-tool reporting history survive persistence without confusing reporter and submitter', async () => {
  const server = app();
  const created = await api(server, 'post', '/incidents', { toolId: 'TOOL-B', reporterId: 'WRK-NAMED',
    reporterName: 'Test Worker <One>', language: 'en', rawText: 'Synthetic named-worker observation' }, 'Worker');
  expect(created.status).toBe(201);
  const id = created.body.incident.incidentId;
  await incident(); // Another report on the same tool, without a stored name.
  await cds.db.run(cds.ql.INSERT.into(entity('Incident')).entries({ incidentId: 'OTHER-TOOL-REPORT', toolId: 'TOOL-A', reporterId: 'OTHER', state: 'Reported' }));
  const result = await api(server, 'get', `/incidents/${id}/executive-report`);
  expect(result.status).toBe(200);
  expect(result.body.reportingWorker).toMatchObject({ reporterId: 'WRK-NAMED', reporterName: 'Test Worker <One>',
    submittedBy: 'RECOVERY-TEST', submitterRole: 'Worker', nameEvidenceId: expect.any(String), submissionAuditId: expect.any(String) });
  expect(result.body.workerReportHistory.some(r => r.reporterName === null && r.reporterId === 'RECOVERY-WORKER')).toBe(true);
  expect(result.body.workerReportHistory.some(r => r.incidentId === 'OTHER-TOOL-REPORT')).toBe(false);
  for (const reporterName of [123, 'x'.repeat(121)]) {
    expect((await api(server, 'post', '/incidents', { toolId: 'TOOL-B', reporterId: 'WRK-NAMED', reporterName, language: 'en', rawText: 'Synthetic' }, 'Worker')).status).toBe(400);
  }
});
