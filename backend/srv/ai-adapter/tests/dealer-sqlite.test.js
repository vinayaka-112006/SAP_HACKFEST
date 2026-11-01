process.env.DATABASE_MODE = 'sqlite';
process.env.CDS_REQUIRES_DB_KIND = 'sqlite';
process.env.CDS_REQUIRES_DB_CREDENTIALS_URL = ':memory:';
const path = require('node:path');
const cds = require('@sap/cds');
const { saveDealerDraft } = require('../../routes/communication.router');
let db;
beforeAll(async () => {
  db = await cds.deploy(path.resolve(__dirname, '../../../db/schema.cds')).to('sqlite::memory:');
  cds.db = db;
  await db.run(cds.ql.INSERT.into('toolsathi.Incident').entries({ incidentId: 'TS-SQLITE', toolId: 'TOOL-B', state: 'Confirmed' }));
  await db.run(cds.ql.INSERT.into('toolsathi.Dealer').entries({ dealerId: 'D-SQLITE', language: 'kn' }));
  await db.run(cds.ql.INSERT.into('toolsathi.Proposal').entries({ proposalId: 'P-SQLITE', incidentId: 'TS-SQLITE', type: 'QUALITY_NOTIFICATION', payload: JSON.stringify({ toolId: 'TOOL-B', batchIds: ['B-SQLITE'] }) }));
  await db.run(cds.ql.INSERT.into('toolsathi.Approval').entries({ approvalId: 'A-SQLITE', proposalId: 'P-SQLITE', decision: 'APPROVED', approverRole: 'Quality', decidedBy: 'Q1', decidedAt: '2026-11-01T00:00:00Z' }));
  await db.run(cds.ql.INSERT.into('toolsathi.Shipment').entries({ shipmentId: 'S-SQLITE', batchId: 'B-SQLITE', dealerId: 'D-SQLITE' }));
});
afterAll(async () => { await db?.disconnect(); });
test('real SQLite approval check persists draft and audit atomically; rejection adds no draft', async () => {
  const input = { incidentId: 'TS-SQLITE', approvalId: 'A-SQLITE', dealerId: 'D-SQLITE', language: 'hi', actor: { id: 'Q2', role: 'Quality' } };
  const result = await saveDealerDraft(input);
  const doc = await db.run(cds.ql.SELECT.one.from('toolsathi.MockDocument').where({ docId: result.docId }));
  expect(JSON.parse(doc.payload)).toMatchObject({ sent: false, batchIds: ['B-SQLITE'], language: 'hi' });
  const entries = await db.run(cds.ql.SELECT.from('toolsathi.AuditLog').where({ incidentId: 'TS-SQLITE' }));
  expect(entries).toHaveLength(1);
  expect(JSON.parse(entries[0].details).docId).toBe(result.docId);
  await expect(saveDealerDraft({ ...input, approvalId: 'MISSING' })).rejects.toMatchObject({ code: 'APPROVAL_REQUIRED' });
  const docs = await db.run(cds.ql.SELECT.from('toolsathi.MockDocument').where({ incidentId: 'TS-SQLITE' }));
  expect(docs).toHaveLength(1);
  const audit = require('../../lib/audit');
  const failedAudit = jest.spyOn(audit, 'write').mockRejectedValueOnce(new Error('Synthetic audit failure'));
  try { await expect(saveDealerDraft(input)).rejects.toThrow('Synthetic audit failure'); }
  finally { failedAudit.mockRestore(); }
  const afterRollback = await db.run(cds.ql.SELECT.from('toolsathi.MockDocument').where({ incidentId: 'TS-SQLITE' }));
  expect(afterRollback).toHaveLength(1);
});
