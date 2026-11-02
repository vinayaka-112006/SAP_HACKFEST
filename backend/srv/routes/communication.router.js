const { cds, entity, decode, transaction } = require('../lib/db');
const { uuid } = require('../lib/ids');
const audit = require('../lib/audit');
const { error } = require('../ai-adapter/validation');
const text = require('../ai-adapter/communication');
const { createRouter } = require('../ai-adapter/communication-endpoints');
const { requiredApproverRole } = require('../lib/rules-adapter');
const one = (tx, table, where) => tx.run(cds.ql.SELECT.one.from(entity(table)).where(where));
async function saveDealerDraft({ incidentId, approvalId, dealerId, language, actor }) {
  return transaction(async tx => {
    const deny = () => { throw error('APPROVAL_REQUIRED', 'A matching approved Quality notification with shipped batch scope is required.'); };
    if (!actor?.id || actor.role !== 'Quality') deny();
    // Deliberately fail closed even when development mock approval bypass is enabled.
    const approval = await tx.run(cds.ql.SELECT.one.from(entity('Approval')).where({ approvalId }).forUpdate());
    if (!approval || approval.decision !== 'APPROVED' || !approval.decidedBy || !Number.isFinite(Date.parse(approval.decidedAt)) || approval.approverRole !== requiredApproverRole('QUALITY_NOTIFICATION')) deny();
    const proposal = decode(await tx.run(cds.ql.SELECT.one.from(entity('Proposal')).where({ proposalId: approval.proposalId }).forUpdate()));
    const incident = await one(tx, 'Incident', { incidentId });
    const dealer = await one(tx, 'Dealer', { dealerId });
    if (!incident || !dealer) throw error('SOURCE_NOT_FOUND', 'Incident or dealer was not found.');
    if (!proposal || proposal.incidentId !== incidentId || proposal.type !== 'QUALITY_NOTIFICATION' || proposal.payload?.toolId !== incident.toolId) deny();
    const batches = proposal.payload.batchIds;
    if (!Array.isArray(batches) || !batches.length || batches.length > 100 || batches.some(id => typeof id !== 'string' || id.length > 120)) deny();
    const shipments = await tx.run(cds.ql.SELECT.from(entity('Shipment')).columns('shipmentId', 'batchId').where({ dealerId, batchId: { in: batches } }));
    const batchIds = [...new Set(shipments.map(row => row.batchId))].sort();
    if (!batchIds.length) deny();
    const value = text.dealerNotice({ incidentId, dealerId, approvalId, batchIds }, language);
    value.sourceIds.push(proposal.proposalId, ...shipments.map(row => row.shipmentId).sort());
    const docId = uuid('DRAFT');
    await tx.run(cds.ql.INSERT.into(entity('MockDocument')).entries({ docId, system: 'TOOLSATHI', type: 'DEALER_NOTICE_DRAFT', incidentId, payload: JSON.stringify(value), createdAt: new Date().toISOString() }));
    await audit.write({ incidentId, toolId: incident.toolId, actor: actor.id, actorRole: actor.role, action: 'DEALER_NOTICE_DRAFT_CREATED', reason: 'Human requested an approval-bound simulated dealer draft; no message sent', modelVersion: text.VERSION, details: { docId, approvalId, proposalId: proposal.proposalId, dealerId, batchIds, language, sent: false } }, tx);
    return { ...value, docId };
  });
}
module.exports = { mount: '/api', owner: 'Shashank', router: createRouter({
  loadIncident: id => one(cds.db, 'Incident', { incidentId: id }),
  loadTrace: async (incidentId, windowHours) => decode(await cds.db.run(cds.ql.SELECT.one.from(entity('TraceResult')).where({ incidentId, windowHours }).orderBy('version desc'))),
  saveDealerDraft,
}) };
module.exports.saveDealerDraft = saveDealerDraft;
