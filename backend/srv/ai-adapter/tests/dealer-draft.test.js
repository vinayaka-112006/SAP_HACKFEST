const mockRun = jest.fn();
jest.mock('../../lib/db', () => {
  const cds = require('@sap/cds');
  return { cds, entity: name => `toolsathi.${name}`, decode: row => row && ({ ...row, ...(row.payload ? { payload: JSON.parse(row.payload) } : {}) }), transaction: fn => fn({ run: mockRun }) };
});
const { saveDealerDraft } = require('../../routes/communication.router');
let records;
beforeEach(() => {
  records = {
    Approval: { approvalId: 'A1', proposalId: 'P1', decision: 'APPROVED', decidedBy: 'Q1', decidedAt: '2026-11-01T00:00:00Z', approverRole: 'Quality' },
    Proposal: { proposalId: 'P1', incidentId: 'TS-1', type: 'QUALITY_NOTIFICATION', payload: JSON.stringify({ toolId: 'TOOL-B', batchIds: ['B1', 'B2'] }) },
    Incident: { incidentId: 'TS-1', toolId: 'TOOL-B' }, Dealer: { dealerId: 'D1' },
    Shipment: [{ shipmentId: 'S1', batchId: 'B1' }],
  };
  mockRun.mockReset().mockImplementation(async query => query.SELECT ? records[query.SELECT.from.ref[0].split('.').at(-1)] : 1);
});
const input = { incidentId: 'TS-1', approvalId: 'A1', dealerId: 'D1', language: 'kn', actor: { id: 'Q2', role: 'Quality' } };
const writes = () => mockRun.mock.calls.filter(([q]) => q.INSERT).map(([q]) => q.INSERT);
test('matching approval creates an unsent draft and append-only audit in same transaction', async () => {
  const result = await saveDealerDraft(input);
  expect(result).toMatchObject({ _label: 'SIMULATED', sent: false, approvalId: 'A1', batchIds: ['B1'] });
  expect(result.sourceIds).toEqual(expect.arrayContaining(['P1', 'S1', 'A1', 'D1']));
  expect(writes().map(q => q.into.ref[0])).toEqual(['toolsathi.MockDocument', 'toolsathi.AuditLog']);
  expect(writes()[1].entries[0]).toMatchObject({ actor: 'Q2', actorRole: 'Quality', action: 'DEALER_NOTICE_DRAFT_CREATED', modelVersion: 'communication-1' });
  const shipmentQuery = mockRun.mock.calls.find(([q]) => q.SELECT?.from.ref[0] === 'toolsathi.Shipment')[0];
  expect(JSON.stringify(shipmentQuery)).toContain('D1'); expect(JSON.stringify(shipmentQuery)).toContain('B2');
});
test.each(['missing', 'rejected', 'role', 'actor', 'time', 'incident', 'type', 'tool', 'scope', 'shipments', 'requester'])('rejects %s approval/scope with no document or audit writes', async failure => {
  if (failure === 'missing') records.Approval = null;
  if (failure === 'rejected') records.Approval.decision = 'REJECTED';
  if (failure === 'role') records.Approval.approverRole = 'Manager';
  if (failure === 'actor') records.Approval.decidedBy = '';
  if (failure === 'time') records.Approval.decidedAt = 'bad';
  if (failure === 'incident') records.Proposal.incidentId = 'OTHER';
  if (failure === 'type') records.Proposal.type = 'STOCK_BLOCK';
  if (failure === 'tool') records.Proposal.payload = JSON.stringify({ toolId: 'OTHER', batchIds: ['B1'] });
  if (failure === 'scope') records.Proposal.payload = JSON.stringify({ toolId: 'TOOL-B', batchIds: [] });
  if (failure === 'shipments') records.Shipment = [];
  process.env.ENFORCE_APPROVALS = 'false'; process.env.ALLOW_UNAPPROVED_MOCKS = 'true';
  await expect(saveDealerDraft(failure === 'requester' ? { ...input, actor: { id: 'M1', role: 'Manager' } } : input)).rejects.toMatchObject({ code: 'APPROVAL_REQUIRED' });
  expect(writes()).toHaveLength(0);
  delete process.env.ENFORCE_APPROVALS; delete process.env.ALLOW_UNAPPROVED_MOCKS;
});
