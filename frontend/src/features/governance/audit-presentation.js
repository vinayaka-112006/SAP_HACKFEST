const labels = {
  INCIDENT_CREATED: "Incident reported",
  INCIDENT_CONFIRMED: "Incident confirmed",
  TRACE_GENERATED: "Trace generated",
  CONTAINMENT_PROPOSAL_CREATED: "Containment proposal created",
  PROPOSAL_APPROVED: "Proposal approved",
  PROPOSAL_REJECTED: "Proposal rejected",
  TOOL_RETURN_TO_SERVICE_VERIFIED: "Tool return verified",
  TOOL_STATE_CHANGED: "Tool state changed",
  ACTION_REJECTED: "Action rejected",
  REPAIR_STARTED: "Repair started",
  REPAIR_COMPLETED: "Repair submission recorded",
};

export function parseAuditDetails(details) {
  if (details && typeof details === "object" && !Array.isArray(details)) return details;
  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function auditActionLabel(action) {
  return labels[action] || String(action || "Unknown event")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function auditEventDescription(entry) {
  const details = parseAuditDetails(entry?.details);
  switch (entry?.action) {
    case "PROPOSAL_APPROVED":
      return `Containment proposal ${details.proposalId || "(ID unavailable)"} approved.`;
    case "PROPOSAL_REJECTED":
      return `Containment proposal ${details.proposalId || "(ID unavailable)"} rejected.`;
    case "TRACE_GENERATED":
      return `${details.windowHours ?? "Unknown"}-hour trace run ${details.traceId || "(ID unavailable)"} completed and persisted.`;
    case "INCIDENT_CREATED":
      return "Incident report persisted.";
    case "INCIDENT_CONFIRMED":
      return "Incident confirmation persisted.";
    case "CONTAINMENT_PROPOSAL_CREATED":
      return "Review-only containment proposal persisted; no action was executed.";
    case "TOOL_RETURN_TO_SERVICE_VERIFIED":
      return "Repair evidence was verified and the tool state transition was recorded.";
    case "TOOL_STATE_CHANGED":
      return `Tool state changed from ${details.from || "Unknown"} to ${details.to || "Unknown"}.`;
    case "ACTION_REJECTED":
      return "The requested action was rejected by backend checks.";
    default:
      return `${auditActionLabel(entry?.action)} event recorded.`;
  }
}

function displayValue(value) {
  if (value === undefined) return "(not present)";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function auditSnapshotDiff(entry) {
  const details = parseAuditDetails(entry?.details);
  const before = details.before;
  const after = details.after;
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return keys
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((field) => ({ field, before: displayValue(before[field]), after: displayValue(after[field]) }));
}

export function formatAuditTimestamp(value) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return String(value || "Timestamp unavailable");
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(parsed);
}
