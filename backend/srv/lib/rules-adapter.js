const path = require("node:path");
const fs = require("node:fs");
function optional(name) {
  const file = path.join(__dirname, "../rules", name);
  try {
    return require(require.resolve(file));
  } catch (e) {
    if (
      e.code === "MODULE_NOT_FOUND" &&
      !fs.existsSync(file + ".js") &&
      !fs.existsSync(file) &&
      !fs.existsSync(file + ".json")
    )
      return null;
    throw e;
  }
}

const incident = {
  Reported: ["Confirmed", "Closed with insufficient evidence"],
  Confirmed: ["Under review", "Closed with insufficient evidence"],
  "Under review": ["Containment proposed", "Closed with insufficient evidence"],
  "Containment proposed": ["Approved", "Rejected"],
  Approved: ["Repairing"],
  Rejected: ["Repairing"],
  Repairing: ["Awaiting verification"],
  "Awaiting verification": ["Closed"],
};
const tool = {
  Active: ["Restricted"],
  Restricted: ["Under repair"],
  "Under repair": ["Awaiting verification"],
  "Awaiting verification": ["Active"],
};
const roleByType = {
  MAINTENANCE_NOTIFICATION: "Manager",
  TOOL_RESTRICTION: "Manager",
  QUALITY_NOTIFICATION: "Quality",
  STOCK_BLOCK: "Quality",
};
function createAdapter(machine, approvals) {
  function canIncidentTransition(from, to, ctx = {}) {
    return machine
      ? machine.canIncidentTransition(from, to, ctx)
      : (incident[from] || []).includes(to) ||
          (to === "Closed with insufficient evidence" &&
            Object.hasOwn(incident, from));
  }
  function canToolTransition(from, to, ctx = {}) {
    if (machine) return machine.canToolTransition(from, to, ctx);
    if (from === "Retired") return false;
    if (to === "Retired") return true;
    if (!(tool[from] || []).includes(to)) return false;
    return (
      to !== "Active" || (ctx.verified === true && ctx.role === "Verifier")
    );
  }
  function requiredApproverRole(type) {
    if (type === "RECOVERY_PLAN") return "Manager";
    if (approvals) return approvals.requiredApproverRole(type);
    if (!roleByType[type]) throw new Error("Unsupported proposal type");
    return roleByType[type];
  }
  return {
    canIncidentTransition,
    canToolTransition,
    requiredApproverRole,
    usingDefaults: !machine || !approvals,
  };
}
const adapter = createAdapter(optional("state-machine"), optional("approvals"));
if (adapter.usingDefaults) console.warn("using default rules");
module.exports = { ...adapter, createAdapter };
