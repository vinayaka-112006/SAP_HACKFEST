"use strict";

const router = require("express").Router();
const { cds, entity, decode, transaction } = require("../lib/db");
const { wrap, required, fail, label } = require("../lib/http");
const { requireRole } = require("../lib/auth");
const incidents = require("../lib/incidents");
const ids = require("../lib/ids");
const audit = require("../lib/audit");
const rules = require("../lib/rules-adapter");
const { requiredScopeFields } = require("../lib/approvals-check");
const {
  detectRepeatFailure,
  DEFAULT_WINDOW_DAYS,
  DEFAULT_MINIMUM_REPORTS,
} = require("../lib/repeat-failure");
const {
  detectDuplicateIncidents,
  DEFAULT_SIMILARITY_THRESHOLD,
} = require("../lib/duplicate-detection");
const { buildContainmentProposal, TYPES } = require("../lib/containment-proposals");

const validReason = (value) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 1000;

function validProposalPayload(type, payload) {
  const fields = requiredScopeFields(type);
  if (!fields || !payload || typeof payload !== "object" || Array.isArray(payload))
    return false;
  return fields.every((field) =>
    field === "batchIds"
      ? Array.isArray(payload[field]) &&
        payload[field].length > 0 &&
        payload[field].every(
          (value) => typeof value === "string" && value.trim(),
        )
      : typeof payload[field] === "string" && payload[field].trim(),
  );
}

async function traceEvidence(tx, incidentId) {
  const row = await tx.run(
    cds.ql.SELECT.one
      .from(entity("TraceResult"))
      .where({ incidentId, windowHours: 168 })
      .orderBy("generatedAt desc", "version desc"),
  );
  if (!row) return null;
  try {
    const trace = decode(row);
    if (!Array.isArray(trace.units)) return null;
    const ids = [
      ...new Set(
        trace.units
          .filter(
            (unit) =>
              unit &&
              unit.tier === "CONFIRMED" &&
              typeof unit.batchId === "string" &&
              unit.batchId.trim(),
          )
          .map((unit) => unit.batchId),
      ),
    ].sort();
    const batchRows = ids.length
      ? await tx.run(
          cds.ql.SELECT.from(entity("Batch")).where({
            batchId: { in: ids },
          }),
        )
      : [];
    const knownBatchIds = new Set(batchRows.map((batch) => batch.batchId));
    const confirmedBatchIds = ids.filter((id) => knownBatchIds.has(id));
    const stockRows = confirmedBatchIds.length
      ? await tx.run(
          cds.ql.SELECT.from(entity("InventoryStock")).where({
            batchId: { in: confirmedBatchIds },
          }),
        )
      : [];
    const shipmentRows = confirmedBatchIds.length
      ? await tx.run(
          cds.ql.SELECT.from(entity("Shipment")).where({
            batchId: { in: confirmedBatchIds },
          }),
        )
      : [];
    const inStockUnitBatchIds = new Set(
      trace.units
        .filter(
          (unit) =>
            unit &&
            unit.tier === "CONFIRMED" &&
            unit.locationStatus === "IN_STOCK" &&
            !unit.flags?.includes("STALE") &&
            !unit.flags?.includes("CONFLICTING_LOCATION") &&
            confirmedBatchIds.includes(unit.batchId),
        )
        .map((unit) => unit.batchId),
    );
    const stockBatchIds = confirmedBatchIds.filter(
      (batchId) =>
        inStockUnitBatchIds.has(batchId) &&
        !shipmentRows.some((shipment) => shipment.batchId === batchId) &&
        stockRows.some(
          (stock) =>
            stock.batchId === batchId &&
            stock.location === "STORE-01" &&
            stock.stockStatus === "UNRESTRICTED" &&
            Number(stock.quantity) > 0,
        ),
    );
    return {
      traceId: trace.traceId,
      version: trace.version,
      windowHours: trace.windowHours,
      generatedAt: trace.generatedAt,
      confirmedBatchIds,
      stockBatchIds,
    };
  } catch {
    // Malformed persisted trace evidence is unknown, never evidence of safety.
    return null;
  }
}

router.post(
  "/incidents/:id/proposals",
  requireRole("Worker", "Manager"),
  wrap(async (req, res) => {
    required(req.body, ["type", "reason"]);
    if (
      Object.keys(req.body).some((key) => !["type", "reason"].includes(key)) ||
      !TYPES.includes(req.body.type) ||
      !validReason(req.body.reason)
    )
      fail(
        400,
        "INVALID_INPUT",
        "Only a supported type and non-empty reason are accepted",
      );

    const result = await transaction(async (tx) => {
      await tx.run(
        cds.ql.SELECT.one
          .from(entity("Incident"))
          .where({ incidentId: req.params.id })
          .forUpdate(),
      );
      const incident = await incidents.find(tx, req.params.id);
      const tool = await incidents.tool(tx, incident.toolId);
      const history = incident.category
        ? await tx.run(
            cds.ql.SELECT.from(entity("Incident")).where({
              toolId: incident.toolId,
              category: incident.category,
            }),
          )
        : [];
      const reports = history.map((row) => {
        const decoded = decode(row);
        return {
          id: decoded.incidentId,
          toolId: decoded.toolId,
          category: decoded.category,
          description:
            typeof decoded.translatedText === "string" &&
            decoded.translatedText.trim()
              ? decoded.translatedText
              : decoded.rawText,
          createdAt: decoded.reportedAt,
        };
      });
      const repeatFailure = detectRepeatFailure(
        incident.toolId,
        incident.category,
        reports,
        {
          referenceAt: incident.reportedAt,
          windowDays: DEFAULT_WINDOW_DAYS,
          minimumReports: DEFAULT_MINIMUM_REPORTS,
          excludeIncidentId: incident.incidentId,
        },
      );
      const duplicateReview = detectDuplicateIncidents(
        {
          id: incident.incidentId,
          toolId: incident.toolId,
          category: incident.category,
          description:
            typeof incident.translatedText === "string" &&
            incident.translatedText.trim()
              ? incident.translatedText
              : incident.rawText,
          createdAt: incident.reportedAt,
        },
        reports,
        { windowDays: DEFAULT_WINDOW_DAYS, similarityThreshold: DEFAULT_SIMILARITY_THRESHOLD },
      );
      const repeatEvidence = {
        ...repeatFailure,
        potentialDuplicateIncidentIds: duplicateReview.valid
          ? duplicateReview.matches.map((match) => match.id)
          : [],
      };
      const trace =
        req.body.type === "STOCK_BLOCK" ||
        req.body.type === "QUALITY_NOTIFICATION"
          ? await traceEvidence(tx, incident.incidentId)
          : null;
      const candidate = buildContainmentProposal({
        type: req.body.type,
        reason: req.body.reason,
        incident,
        tool,
        repeatFailure: repeatEvidence,
        trace,
        qualityBatchIds: trace?.confirmedBatchIds || [],
        stockBatchIds: trace?.stockBatchIds || [],
      });
      if (!candidate.eligible)
        fail(409, "INSUFFICIENT_EVIDENCE", "A review proposal cannot be supported", {
          type: req.body.type,
          reason: candidate.reason,
          ...candidate.details,
          ...(trace
            ? {
                exposure: trace.confirmedBatchIds.length
                  ? "Potentially exposed"
                  : "Unknown",
                traceId: trace.traceId,
                traceVersion: trace.version,
              }
            : req.body.type === "STOCK_BLOCK" ||
                req.body.type === "QUALITY_NOTIFICATION"
              ? { exposure: "Unknown" }
              : {}),
        });

      const existing = (
        await tx.run(
          cds.ql.SELECT.from(entity("Proposal"))
            .where({ incidentId: incident.incidentId, type: req.body.type })
            .orderBy("createdAt desc", "proposalId desc")
            .forUpdate(),
        )
      ).map(decode);
      const existingPendingOrApproved = existing.find((proposal) =>
        ["Pending", "Approved"].includes(proposal.state),
      );
      const existingEquivalent = existing.find(
        (proposal) =>
          JSON.stringify(proposal.payload) ===
          JSON.stringify(candidate.proposal.payload),
      );
      const reused = existingPendingOrApproved || existingEquivalent;
      const requiredApproverRole = await rules.requiredApproverRole(req.body.type);
      if (reused) {
        const priorApproval = reused.state === "Approved"
          ? await tx.run(
              cds.ql.SELECT.one.from(entity("Approval"))
                .where({ proposalId: reused.proposalId }),
            )
          : null;
        const previousAudit = await tx.run(
          cds.ql.SELECT.from(entity("AuditLog"))
            .where({
              incidentId: incident.incidentId,
              action: "CONTAINMENT_PROPOSAL_CREATED",
            })
            .orderBy("timestamp desc", "auditId desc"),
        );
        const auditId = previousAudit
          .map(decode)
          .find((entry) => entry.details?.proposalId === reused.proposalId)
          ?.auditId || null;
        return {
          proposal: reused,
          ...(priorApproval ? { approval: decode(priorApproval) } : {}),
          requiredApproverRole,
          created: false,
          evidence: reused.payload?.evidence || null,
          actionExecuted: false,
          auditId,
        };
      }

      const payload = {
        ...candidate.proposal.payload,
        evidence: {
          ...candidate.proposal.evidence,
          basis: candidate.proposal.payload.evidence,
        },
      };
      const proposal = {
        proposalId: ids.uuid("PROP"),
        incidentId: incident.incidentId,
        type: candidate.proposal.type,
        payload: JSON.stringify(payload),
        reason: candidate.proposal.reason,
        state: "Pending",
        createdAt: new Date().toISOString(),
      };
      await tx.run(cds.ql.INSERT.into(entity("Proposal")).entries(proposal));
      const auditId = await audit.write(
        {
          incidentId: incident.incidentId,
          toolId: incident.toolId,
          actor: req.user.id,
          actorRole: req.user.role,
          action: "CONTAINMENT_PROPOSAL_CREATED",
          reason: "Advisory proposal submitted for human review",
          details: {
            proposalId: proposal.proposalId,
            type: proposal.type,
            state: proposal.state,
            evidence: candidate.proposal.evidence,
          },
        },
        tx,
      );
      return {
        proposal: { ...proposal, payload },
        requiredApproverRole,
        created: true,
        evidence: candidate.proposal.evidence,
        actionExecuted: false,
        auditId,
      };
    });
    res.json(label(result));
  }),
);

router.post(
  "/approvals/:id/decision",
  requireRole("Manager", "Quality"),
  wrap(async (req, res) => {
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body) ||
      Object.keys(req.body).some((key) => !["decision", "reason"].includes(key))
    )
      fail(400, "INVALID_INPUT", "Expected decision and reason fields only");
    if (!["APPROVED", "REJECTED"].includes(req.body.decision))
      fail(400, "INVALID_INPUT", "decision must be APPROVED or REJECTED");
    if (!validReason(req.body.reason))
      fail(
        400,
        "INVALID_INPUT",
        req.body.decision === "REJECTED"
          ? "A non-empty rejection reason is required"
          : "A non-empty decision reason is required",
      );

    const result = await transaction(async (tx) => {
      const row = await tx.run(
        cds.ql.SELECT.one
          .from(entity("Proposal"))
          .where({ proposalId: req.params.id })
          .forUpdate(),
      );
      if (!row) fail(404, "PROPOSAL_NOT_FOUND", "Proposal not found");
      let proposal;
      try {
        proposal = decode(row);
      } catch {
        fail(409, "INVALID_PROPOSAL", "Proposal payload is malformed");
      }
      if (proposal.state !== "Pending")
        fail(409, "INVALID_STATE", "Proposal is no longer pending", {
          proposalId: proposal.proposalId,
          state: proposal.state,
        });

      const scopeFields = requiredScopeFields(proposal.type);
      if (!scopeFields)
        fail(409, "INVALID_PROPOSAL", "Proposal type is not supported");
      if (!validProposalPayload(proposal.type, proposal.payload))
        fail(409, "INVALID_PROPOSAL", "Proposal payload does not meet the action scope requirements");

      let requiredRole;
      try {
        requiredRole = await rules.requiredApproverRole(proposal.type);
      } catch (error) {
        if (error.message === "Unsupported proposal type")
          fail(409, "INVALID_PROPOSAL", "Proposal type is not supported");
        throw error;
      }
      if (!req.user.roles?.includes(requiredRole))
        fail(403, "FORBIDDEN", "Authenticated role is not permitted to decide this proposal", {
          requiredRole,
        });

      const priorDecision = await tx.run(
        cds.ql.SELECT.one
          .from(entity("Approval"))
          .where({ proposalId: proposal.proposalId })
          .forUpdate(),
      );
      if (priorDecision)
        fail(409, "INVALID_STATE", "Proposal already has a decision record");

      const incident = await incidents.find(tx, proposal.incidentId);
      if (proposal.payload.toolId && proposal.payload.toolId !== incident.toolId)
        fail(409, "INVALID_PROPOSAL", "Proposal tool does not match its incident");
      if (Array.isArray(proposal.payload.batchIds)) {
        const batches = await tx.run(
          cds.ql.SELECT.from(entity("Batch")).where({
            batchId: { in: proposal.payload.batchIds },
          }),
        );
        if (
          new Set(batches.map((batch) => batch.batchId)).size !==
          proposal.payload.batchIds.length
        )
          fail(409, "INVALID_PROPOSAL", "Proposal references an unavailable batch");
      }

      const approval = {
        approvalId: ids.uuid("APR"),
        proposalId: proposal.proposalId,
        approverRole: requiredRole,
        decision: req.body.decision,
        reason: req.body.reason.trim(),
        decidedAt: new Date().toISOString(),
        decidedBy: req.user.id,
      };
      const nextState =
        req.body.decision === "APPROVED" ? "Approved" : "Rejected";
      const changed = await tx.run(
        cds.ql
          .UPDATE(entity("Proposal"))
          .set({ state: nextState })
          .where({ proposalId: proposal.proposalId, state: "Pending" }),
      );
      if (changed !== 1)
        fail(409, "INVALID_STATE", "Proposal is no longer pending");
      await tx.run(cds.ql.INSERT.into(entity("Approval")).entries(approval));
      const auditId = await audit.write(
        {
          incidentId: incident.incidentId,
          toolId: incident.toolId,
          actor: req.user.id,
          actorRole: requiredRole,
          action:
            req.body.decision === "APPROVED"
              ? "PROPOSAL_APPROVED"
              : "PROPOSAL_REJECTED",
          reason: approval.reason,
          details: {
            proposalId: proposal.proposalId,
            approvalId: approval.approvalId,
            proposalType: proposal.type,
            decision: approval.decision,
            fromState: "Pending",
            toState: nextState,
          },
        },
        tx,
      );
      return {
        approval,
        proposal: { ...proposal, state: nextState },
        actionExecuted: false,
        auditId,
      };
    });
    res.json(label(result));
  }),
);

module.exports = { mount: "/api", router, owner: "platform" };
