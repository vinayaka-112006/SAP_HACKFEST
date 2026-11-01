const express = require('express');
const { cds, entity, decode, transaction } = require('../lib/db');
const { wrap, required, fail, label } = require('../lib/http');
const { requireRole } = require('../lib/auth');
const { uuid } = require('../lib/ids');
const audit = require('../lib/audit');
const planner = require('../lib/recovery-planner');
const { assertApproved, bypassEnabled } = require('../lib/approvals-check');
const { createClient, readConfig } = require('../ai-adapter/sarvam-client');
const one = async (tx, name, where) => decode(await tx.run(cds.ql.SELECT.one.from(entity(name)).where(where)));
const open = incident => {
  if (!incident || incident.state !== 'Confirmed') fail(409, 'INVALID_STATE', 'Recovery requires a Confirmed incident');
};
async function record(tx, incidentId, type, payload, actor, action) {
  const docId = uuid('REC');
  await tx.run(cds.ql.INSERT.into(entity('MockDocument')).entries({ docId, incidentId, type,
    system: 'TOOLSATHI', payload: JSON.stringify(label(payload)), createdAt: new Date().toISOString() }));
  await audit.write({ incidentId, actor: actor.id, actorRole: actor.role, action,
    reason: 'Recovery workflow evidence recorded; external SAP actions are simulated',
    modelVersion: payload.modelVersion, details: { docId, type, planId: payload.planId || null,
      proposalId: payload.proposalId || null, approvalId: payload.approvalId || null,
      optionId: payload.optionId || payload.selectedOptionId || null } }, tx);
  return { docId, ...payload };
}
async function currentPlan(tx, incidentId, planId) {
  const doc = await one(tx, 'MockDocument', { incidentId, docId: planId, type: 'RECOVERY_PLAN' });
  if (!doc) fail(404, 'PLAN_NOT_FOUND', 'Recovery plan not found');
  const evidence = await planner.context(tx, incidentId);
  open(evidence.incident);
  if (doc.payload.evidence.fingerprint !== evidence.fingerprint)
    fail(409, 'STALE_RECOVERY_PLAN', 'Evidence changed or expired. Generate and approve a new recovery plan.');
  return doc.payload;
}
function createRouter({ clientFactory = () => createClient({ ...readConfig(), maxTokens: 1000, maxCalls: 30 }) } = {}) {
  const router = express.Router();
  let client, active = false;
  const requests = new Map();
  router.get('/incidents/:id/repair-records', requireRole('Technician', 'Verifier', 'Manager', 'Quality'), wrap(async (req, res) => {
    const repairs = await transaction(async tx => {
      if (!await one(tx, 'Incident', { incidentId: req.params.id })) fail(404, 'INCIDENT_NOT_FOUND', 'Incident not found');
      return planner.rows(tx, 'RepairLog', { incidentId: req.params.id });
    });
    res.json(label({ repairs }));
  }));
  router.get('/incidents/:id/recovery', requireRole('Manager', 'Quality', 'Verifier'), wrap(async (req, res) => {
    const value = await transaction(async tx => ({ context: await planner.context(tx, req.params.id),
      records: await planner.rows(tx, 'MockDocument', { incidentId: req.params.id, type: { in: ['RECOVERY_PLAN', 'RECOVERY_EVIDENCE', 'RECOVERY_EXECUTION'] } }),
      proposals: await planner.rows(tx, 'Proposal', { incidentId: req.params.id, type: 'RECOVERY_PLAN' }),
      approvals: await planner.rows(tx, 'Approval', {}) }));
    const ids = new Set(value.proposals.map(p => p.proposalId));
    value.approvals = value.approvals.filter(a => ids.has(a.proposalId));
    res.json(label(value));
  }));
  router.post('/incidents/:id/recovery/evidence', requireRole('Manager'), wrap(async (req, res) => {
    required(req.body, ['alternativeToolId', 'sourceReference', 'validUntil']);
    if (Object.keys(req.body).some(k => !['alternativeToolId', 'sourceReference', 'validUntil', 'operationCompatible', 'available'].includes(k)) ||
        req.body.sourceReference.length > 500 || typeof req.body.operationCompatible !== 'boolean' || typeof req.body.available !== 'boolean' ||
        !Number.isFinite(Date.parse(req.body.validUntil)) || Date.parse(req.body.validUntil) <= Date.now() || Date.parse(req.body.validUntil) > Date.now() + 86400000)
      fail(400, 'INVALID_INPUT', 'Provide explicit compatibility/availability, a source reference and an expiry within 24 hours');
    const result = await transaction(async tx => {
      const evidence = await planner.context(tx, req.params.id); open(evidence.incident);
      if (!evidence.candidates.some(c => c.tool.toolId === req.body.alternativeToolId)) fail(400, 'INVALID_INPUT', 'Select an alternative tool from the register');
      return record(tx, req.params.id, 'RECOVERY_EVIDENCE', { ...req.body, reviewedBy: req.user.id,
        reviewedAt: new Date().toISOString(), basis: 'Manager attestation; not an independently verified capability certificate' }, req.user, 'RECOVERY_EVIDENCE_RECORDED');
    });
    res.status(201).json(label(result));
  }));
  router.post('/incidents/:id/recovery/plans', requireRole('Manager'), wrap(async (req, res) => {
    const now = Date.now();
    for (const [key, item] of requests) if (now - item.at > 60000) requests.delete(key);
    const item = requests.get(req.user.id) || { at: now, count: 0 };
    if (active || item.count >= 3 || requests.size >= 1000) fail(429, 'PLANNER_RATE_LIMIT', 'Planner is busy or rate limited; try again later');
    item.count++; requests.set(req.user.id, item); active = true;
    try {
      const evidence = await transaction(tx => planner.context(tx, req.params.id)); open(evidence.incident);
      let result;
      try { result = await planner.plan(evidence, client ||= clientFactory()); }
      catch (error) {
        if (error.status) throw error;
        fail(503, /^AI_/.test(error.code || '') ? error.code : 'PLANNER_UNAVAILABLE', 'Recovery AI is unavailable. No proposal or action was created.');
      }
      const saved = await transaction(async tx => {
        const current = await planner.context(tx, req.params.id);
        if (current.fingerprint !== evidence.fingerprint) fail(409, 'STALE_RECOVERY_PLAN', 'Evidence changed while planning. Try again.');
        return record(tx, req.params.id, 'RECOVERY_PLAN', result, req.user, 'RECOVERY_PLAN_GENERATED');
      });
      res.status(201).json(label(saved));
    } finally { active = false; }
  }));
  router.post('/incidents/:id/recovery/proposals', requireRole('Manager'), wrap(async (req, res) => {
    required(req.body, ['planId', 'reason']);
    if (req.body.reason.length > 1000 || Object.keys(req.body).some(k => !['planId', 'reason'].includes(k))) fail(400, 'INVALID_INPUT', 'Expected planId and review reason');
    const result = await transaction(async tx => {
      await tx.run(cds.ql.SELECT.one.from(entity('Incident')).where({ incidentId: req.params.id }).forUpdate());
      const plan = await currentPlan(tx, req.params.id, req.body.planId);
      const existing = (await planner.rows(tx, 'Proposal', { incidentId: req.params.id, type: 'RECOVERY_PLAN' }))
        .find(p => p.payload.planId === req.body.planId && ['Pending', 'Approved', 'Executed'].includes(p.state));
      if (existing) return { proposal: existing, actionExecuted: existing.state === 'Executed' };
      const proposal = { proposalId: uuid('PROP'), incidentId: req.params.id, type: 'RECOVERY_PLAN',
        payload: { toolId: plan.evidence.source.toolId, planId: req.body.planId, optionId: plan.selectedOptionId },
        reason: req.body.reason.trim(), state: 'Pending', createdAt: new Date().toISOString() };
      await tx.run(cds.ql.INSERT.into(entity('Proposal')).entries({ ...proposal, payload: JSON.stringify(proposal.payload) }));
      await audit.write({ incidentId: req.params.id, toolId: proposal.payload.toolId, actor: req.user.id,
        actorRole: req.user.role, action: 'RECOVERY_PROPOSAL_CREATED', reason: proposal.reason, modelVersion: plan.modelVersion,
        details: { proposalId: proposal.proposalId, ...proposal.payload } }, tx);
      return { proposal, actionExecuted: false };
    }); res.status(201).json(label(result));
  }));
  router.post('/incidents/:id/recovery/execute', requireRole('Manager'), wrap(async (req, res) => {
    required(req.body, ['approvalId']);
    if (Object.keys(req.body).some(k => k !== 'approvalId')) fail(400, 'INVALID_INPUT', 'Only approvalId is accepted');
    const result = await transaction(async tx => {
      // Lock tool records before rechecking availability and reserving a simulated alternative.
      await tx.run(cds.ql.SELECT.from(entity('Tool')).forUpdate());
      const approval = await one(tx, 'Approval', { approvalId: req.body.approvalId });
      const proposal = approval && await one(tx, 'Proposal', { proposalId: approval.proposalId });
      if (bypassEnabled() || !proposal || proposal.type !== 'RECOVERY_PLAN') fail(409, 'APPROVAL_REQUIRED', 'A matching approved recovery record is required; bypass is disabled');
      await assertApproved({ approvalId: req.body.approvalId, requiredRole: 'Manager', incidentId: req.params.id,
        proposalType: 'RECOVERY_PLAN', scope: proposal.payload }, tx);
      const plan = await currentPlan(tx, req.params.id, proposal.payload.planId);
      if (plan.selectedOptionId !== proposal.payload.optionId) fail(409, 'APPROVAL_REQUIRED', 'Approved option does not match the stored plan');
      const alternateId = plan.selectedOptionId.startsWith('ALTERNATIVE:') ? plan.selectedOptionId.slice(12) : null;
      const changed = await tx.run(cds.ql.UPDATE(entity('Proposal')).set({ state: 'Executed' }).where({ proposalId: proposal.proposalId, state: 'Approved' }));
      if (changed !== 1) fail(409, 'INVALID_STATE', 'Recovery proposal is no longer approved');
      return record(tx, req.params.id, 'RECOVERY_EXECUTION', { planId: proposal.payload.planId,
        proposalId: proposal.proposalId, approvalId: approval.approvalId, optionId: plan.selectedOptionId,
        alternativeToolId: alternateId, executedBy: req.user.id, executedAt: new Date().toISOString(),
        modelVersion: plan.modelVersion,
        actionExecuted: true, externalActionExecuted: false,
        outcome: alternateId ? 'Simulated production reassignment recorded' : 'Simulated operation pause recorded',
        estimatedDowntimeAvoided: null }, req.user, 'RECOVERY_SIMULATION_EXECUTED');
    }); res.status(201).json(label(result));
  }));
  router.get('/incidents/:id/executive-report', requireRole('Manager', 'Quality', 'Verifier'), wrap(async (req, res) => {
    const report = await transaction(async tx => {
      const incident = await one(tx, 'Incident', { incidentId: req.params.id });
      if (!incident) fail(404, 'INCIDENT_NOT_FOUND', 'Incident not found');
      const proposals = await planner.rows(tx, 'Proposal', { incidentId: req.params.id });
      const proposalIds = new Set(proposals.map(p => p.proposalId));
      return { generatedAt: new Date().toISOString(), incident,
        tool: await one(tx, 'Tool', { toolId: incident.toolId }),
        traces: await planner.rows(tx, 'TraceResult', { incidentId: req.params.id }), proposals,
        approvals: (await planner.rows(tx, 'Approval', {})).filter(a => proposalIds.has(a.proposalId)),
        repairs: await planner.rows(tx, 'RepairLog', { incidentId: req.params.id }),
        documents: await planner.rows(tx, 'MockDocument', { incidentId: req.params.id }),
        audit: await planner.rows(tx, 'AuditLog', { incidentId: req.params.id }),
        limitations: ['Synthetic manufacturing scenario; S/4HANA and Digital Manufacturing actions are SIMULATED.',
          'Worker reports and model suggestions do not establish root cause or product quality.',
          'Unknown exposure remains separate. Missing records are not evidence of safety.',
          'Repair entries are submitted observations, not independently authenticated calibration certificates.',
          'No measured downtime benefit or physical production change is established by this report.'] };
    }); res.json(label(report));
  }));
  return router;
}
module.exports = { mount: '/api', owner: 'platform', router: createRouter(), createRouter };
