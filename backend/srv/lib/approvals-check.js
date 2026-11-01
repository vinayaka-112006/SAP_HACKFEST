const { cds, entity, decode, transaction } = require("./db");
const { fail } = require("./http");
const fields = {
  MAINTENANCE_NOTIFICATION: ["toolId", "shortText", "priority"],
  QUALITY_NOTIFICATION: ["toolId", "shortText", "batchIds"],
  STOCK_BLOCK: ["batchIds", "plant", "storageLocation", "reason"],
  TOOL_RESTRICTION: ["toolId", "action", "reason"],
};
function requiredScopeFields(type) {
  return fields[type] ? [...fields[type]] : null;
}
function bypassEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENFORCE_APPROVALS === "false" &&
    process.env.ALLOW_UNAPPROVED_MOCKS === "true"
  );
}
let warned = false;
async function assertApproved(
  { approvalId, requiredRole, incidentId, proposalType, scope = {} },
  tx,
) {
  if (!tx)
    return transaction((t) =>
      assertApproved(
        { approvalId, requiredRole, incidentId, proposalType, scope },
        t,
      ),
    );
  if (bypassEnabled()) {
    if (!warned) {
      console.warn(
        "WARNING: DEVELOPMENT ONLY: UNAPPROVED SIMULATED ACTIONS ENABLED; NEVER USE FOR DEMO",
      );
      warned = true;
    }
    return { bypassed: true };
  }
  const deny = (reason) =>
    fail(409, "APPROVAL_REQUIRED", "A matching approved record is required", {
      reason,
    });
  if (!approvalId) return deny("MISSING_APPROVAL");
  const approval = await tx.run(
    cds.ql.SELECT.one
      .from(entity("Approval"))
      .where({ approvalId })
      .forUpdate(),
  );
  if (
    !approval ||
    approval.decision !== "APPROVED" ||
    !approval.decidedBy ||
    !Number.isFinite(Date.parse(approval.decidedAt)) ||
    approval.approverRole !== requiredRole
  )
    return deny("DECISION_OR_ROLE_MISMATCH");
  const proposal = decode(
    await tx.run(
      cds.ql.SELECT.one
        .from(entity("Proposal"))
        .where({ proposalId: approval.proposalId })
        .forUpdate(),
    ),
  );
  if (!proposal || proposal.incidentId !== incidentId)
    return deny("INCIDENT_MISMATCH");
  if (proposal.state !== "Approved") return deny("PROPOSAL_NOT_APPROVED");
  if (!proposalType) return { approval, proposal }; // Backward-compatible base check; action services always pass type and scope.
  if (!fields[proposalType] || proposal.type !== proposalType)
    return deny("ACTION_MISMATCH");
  const approved = proposal.payload || {};
  for (const field of fields[proposalType]) {
    if (field === "batchIds") {
      if (
        !Array.isArray(approved.batchIds) ||
        !scope.batchIds?.every((id) => approved.batchIds.includes(id))
      )
        return deny("RESOURCE_SCOPE_MISMATCH");
    } else if (approved[field] !== scope[field])
      return deny("RESOURCE_SCOPE_MISMATCH");
  }
  return { approval, proposal };
}
module.exports = { assertApproved, bypassEnabled, requiredScopeFields };
