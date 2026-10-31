const { cds, entity, transaction } = require("./db");
const { fail } = require("./http");
const rules = require("./rules-adapter");
const audit = require("./audit");
const history = require("./history");
async function setState(
  {
    toolId,
    state,
    incidentId,
    actor,
    actorRole,
    reason,
    verified = false,
    approvalId,
  },
  tx,
) {
  if (!tx)
    return transaction((t) =>
      setState(
        {
          toolId,
          state,
          incidentId,
          actor,
          actorRole,
          reason,
          verified,
          approvalId,
        },
        t,
      ),
    );
  const tool = await tx.run(
    cds.ql.SELECT.one.from(entity("Tool")).where({ toolId }).forUpdate(),
  );
  if (!tool) fail(404, "TOOL_NOT_FOUND", "Tool not found");
  if (incidentId) {
    const incident = await require("./incidents").find(tx, incidentId);
    if (incident.toolId !== toolId)
      fail(400, "INVALID_INPUT", "Tool does not match incident");
  }
  if (
    !(await rules.canToolTransition(tool.state, state, {
      verified,
      role: actorRole,
      incidentId,
      toolId,
      tx,
    }))
  )
    fail(409, "INVALID_STATE", "Tool transition is not permitted", {
      from: tool.state,
      to: state,
    });
  if (state === "Restricted")
    await require("./approvals-check").assertApproved(
      {
        approvalId,
        requiredRole: "Manager",
        incidentId,
        proposalType: "TOOL_RESTRICTION",
        scope: { toolId, action: "RESTRICT", reason },
      },
      tx,
    );
  if (!actor || !actorRole || !reason)
    fail(400, "INVALID_INPUT", "Actor and reason are required");
  await tx.run(cds.ql.UPDATE(entity("Tool")).set({ state }).where({ toolId }));
  await audit.write(
    {
      toolId,
      incidentId,
      actor,
      actorRole,
      action: "TOOL_STATE_CHANGED",
      reason,
      details: { from: tool.state, to: state },
    },
    tx,
  );
  await history.append(
    {
      toolId,
      type: state === "Restricted" ? "RESTRICTION" : "REPAIR",
      summary: `Tool state changed to ${state}`,
      refId: incidentId,
      details: { from: tool.state, to: state },
    },
    tx,
  );
  return { ...tool, state };
}
module.exports = { setState };
