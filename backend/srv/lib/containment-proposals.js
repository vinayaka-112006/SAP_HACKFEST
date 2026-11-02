"use strict";

const TYPES = new Set([
  "TOOL_RESTRICTION",
  "STOCK_BLOCK",
  "QUALITY_NOTIFICATION",
  "MAINTENANCE_NOTIFICATION",
]);
const PRIORITY = "2"; // Provisional demo default; confirm the platform priority policy.
const PLANT = "PLANT-01";
const STORAGE_LOCATION = "STORE-01";

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function failed(reason, details = {}) {
  return { eligible: false, reason, details };
}

/**
 * Build an advisory platform proposal from persisted incident evidence.
 * `evidence` must be assembled by the route from database records; this pure
 * function never treats report text or similarity alone as proof of exposure.
 */
function buildContainmentProposal({
  type,
  reason,
  incident,
  tool,
  repeatFailure,
  trace,
  qualityBatchIds = [],
  stockBatchIds = [],
}) {
  if (!TYPES.has(type)) return failed("unsupported_proposal_type");
  const proposalReason = text(reason);
  if (!proposalReason) return failed("proposal_reason_required");
  if (!incident || incident.state !== "Confirmed")
    return failed("incident_not_confirmed", { state: incident?.state ?? null });
  const toolId = text(incident.toolId);
  const category = text(incident.category);
  if (!toolId || !category) return failed("incident_tool_or_category_missing");
  const repeat = repeatFailure?.valid && repeatFailure.thresholdMet;
  const repeatEvidence = repeat
    ? {
        count: repeatFailure.count,
        matchingIncidentIds: repeatFailure.matchingIncidentIds,
        potentialDuplicateIncidentIds:
          repeatFailure.potentialDuplicateIncidentIds || [],
        windowDays: 30,
        minimumReports: 2,
      }
    : null;
  const confirmedBatches = (ids) =>
    [...new Set(ids.filter((id) => typeof id === "string" && id.trim()))].sort();
  const evidence = trace
    ? {
        traceId: trace.traceId,
        version: trace.version,
        windowHours: trace.windowHours,
        generatedAt: trace.generatedAt,
      }
    : null;
  let payload;

  if (type === "TOOL_RESTRICTION") {
    if (!repeat) return failed("repeat_failure_threshold_not_met");
    if (!tool || tool.state !== "Active")
      return failed("tool_not_in_restrictable_state", {
        state: tool?.state ?? null,
      });
    payload = {
      toolId,
      action: "RESTRICT",
      reason: proposalReason,
      evidence: { repeatFailure: repeatEvidence },
    };
  } else if (type === "MAINTENANCE_NOTIFICATION") {
    if (!repeat) return failed("repeat_failure_threshold_not_met");
    if (!tool || !["Active", "Restricted"].includes(tool.state))
      return failed("tool_not_in_maintenance_candidate_state", {
        state: tool?.state ?? null,
      });
    payload = {
      toolId,
      shortText: `Review recurring ${category} reports for ${toolId}`.slice(0, 120),
      priority: PRIORITY,
      evidence: { repeatFailure: repeatEvidence },
    };
  } else {
    const batchIds = confirmedBatches(
      type === "STOCK_BLOCK" ? stockBatchIds : qualityBatchIds,
    );
    if (!trace || !batchIds.length)
      return failed("exposure_unknown_or_batch_evidence_missing", {
        exposure: "Unknown",
        traceAvailable: !!trace,
      });
    if (batchIds.length > 100)
      return failed("batch_scope_exceeds_action_limit", {
        batchCount: batchIds.length,
        maximum: 100,
      });
    if (type === "QUALITY_NOTIFICATION") {
      const ncCode = text(incident.suggestedNcCode);
      if (!ncCode) return failed("quality_code_missing");
      payload = {
        toolId,
        shortText: `Review ${category} report ${incident.incidentId} (${ncCode})`.slice(
          0,
          120,
        ),
        batchIds,
        evidence: {
          traceId: trace.traceId,
          version: trace.version,
          confirmedBatchIds: batchIds,
        },
      };
    } else {
      payload = {
        batchIds,
        plant: PLANT,
        storageLocation: STORAGE_LOCATION,
        reason: proposalReason,
        evidence: {
          traceId: trace.traceId,
          version: trace.version,
          confirmedInStockBatchIds: batchIds,
        },
      };
    }
  }

  return {
    eligible: true,
    reason: null,
    proposal: {
      type,
      payload,
      reason: proposalReason,
      evidence: {
        ...(repeatEvidence ? { repeatFailure: repeatEvidence } : {}),
        ...(evidence ? { trace: evidence } : {}),
        exposure: trace ? "Potentially exposed" : "Unknown",
        affectedQuantity: null,
      },
    },
  };
}

module.exports = { buildContainmentProposal, TYPES: [...TYPES] };
