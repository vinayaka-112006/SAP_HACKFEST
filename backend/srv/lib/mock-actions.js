const { createHash } = require("node:crypto");
const { cds, entity, decode, transaction } = require("./db");
const { fail, required, label } = require("./http");
const { assertApproved } = require("./approvals-check");
const { requiredApproverRole } = require("./rules-adapter");
const incidents = require("./incidents");
const ids = require("./ids");
const audit = require("./audit");
const history = require("./history");
const toolState = require("./tool-state");
const config = {
  MAINTENANCE_NOTIFICATION: {
    system: "S4",
    family: "S/4HANA Maintenance Notification",
    strings: ["toolId", "shortText", "priority", "requestedBy"],
  },
  QUALITY_NOTIFICATION: {
    system: "S4",
    family: "S/4HANA Quality Notification",
    strings: ["toolId", "shortText", "requestedBy"],
    batches: true,
  },
  STOCK_BLOCK: {
    system: "S4",
    family: "S/4HANA Material Document",
    strings: ["plant", "storageLocation", "reason"],
    batches: true,
  },
  TOOL_RESTRICTION: {
    system: "DM",
    family: "Digital Manufacturing Resource",
    strings: ["toolId", "action", "reason"],
  },
};
function validate(type, input, actor) {
  if (!actor?.id || !["Manager", "Quality"].includes(actor.role))
    fail(403, "FORBIDDEN", "A trusted Manager or Quality actor is required");
  const c = config[type];
  if (!c) fail(400, "INVALID_INPUT", "Unsupported simulated action");
  required(input, ["incidentId", ...c.strings]);
  if (
    c.batches &&
    (!Array.isArray(input.batchIds) ||
      !input.batchIds.length ||
      input.batchIds.length > 100 ||
      !input.batchIds.every(
        (x) => typeof x === "string" && x.length <= 120 && x.trim(),
      ))
  )
    fail(400, "INVALID_INPUT", "batchIds must contain 1 to 100 identifiers");
  if (type === "TOOL_RESTRICTION" && input.action !== "RESTRICT")
    fail(400, "INVALID_INPUT", "Only RESTRICT is supported");
  if (input.approvalId != null && typeof input.approvalId !== "string")
    fail(400, "INVALID_INPUT", "Invalid approvalId");
}
async function execute(type, input, actor, tx) {
  validate(type, input, actor);
  if (!tx) return transaction((t) => execute(type, input, actor, t));
  const c = config[type],
    incident = await incidents.find(tx, input.incidentId);
  if (input.toolId) {
    await incidents.tool(tx, input.toolId);
    if (input.toolId !== incident.toolId)
      fail(400, "INVALID_INPUT", "Tool does not match the incident");
  }
  if (c.batches) {
    for (const batchId of [...new Set(input.batchIds)])
      if (
        !(await tx.run(
          cds.ql.SELECT.one.from(entity("Batch")).where({ batchId }),
        ))
      )
        fail(404, "BATCH_NOT_FOUND", "Batch not found", { batchId });
  }
  const approval = await assertApproved(
    {
      approvalId: input.approvalId,
      requiredRole: await requiredApproverRole(type),
      incidentId: input.incidentId,
      proposalType: type,
      scope: input,
    },
    tx,
  );
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify(
        Object.fromEntries(
          Object.keys(input)
            .filter((k) => k !== "requestedBy")
            .sort()
            .map((k) => [
              k,
              Array.isArray(input[k])
                ? [...new Set(input[k])].sort()
                : input[k],
            ]),
        ),
      ),
    )
    .digest("hex");
  const docs = await tx.run(
    cds.ql.SELECT.from(entity("MockDocument"))
      .where({ incidentId: input.incidentId, type })
      .orderBy("createdAt", "docId"),
  );
  const replay = docs
    .map(decode)
    .find(
      (d) =>
        d.payload.requestHash === requestHash &&
        d.payload.approvalId === input.approvalId,
    );
  if (
    replay &&
    ["MAINTENANCE_NOTIFICATION", "QUALITY_NOTIFICATION"].includes(type)
  ) {
    await audit.write(
      {
        incidentId: input.incidentId,
        toolId: incident.toolId,
        actor: actor.id,
        actorRole: actor.role,
        action: "MOCK_ACTION_REPLAYED",
        reason: "Idempotent notification retry",
        details: { type, docId: replay.docId },
      },
      tx,
    );
    await history.append(
      {
        toolId: incident.toolId,
        type: "APPROVAL",
        summary: "Approved simulated notification replayed",
        refId: input.incidentId,
        details: { type, docId: replay.docId },
      },
      tx,
    );
    return replay.payload.result;
  }
  let result;
  if (type === "MAINTENANCE_NOTIFICATION")
    result = {
      MaintenanceNotification: await ids.next(tx, "mockDocument", "", 10),
      NotificationType: "M1",
      NotificationText: input.shortText,
      TechnicalObject: input.toolId,
      Plant: "PLANT-01",
      MaintPriority: input.priority,
      NotificationStatus: "OSNO",
    };
  if (type === "QUALITY_NOTIFICATION")
    result = {
      QualityNotification: await ids.next(tx, "mockDocument", "", 10),
      NotificationType: "Q3",
      NotificationText: input.shortText,
      TechnicalObject: input.toolId,
      batchIds: [...new Set(input.batchIds)].sort(),
    };
  if (type === "STOCK_BLOCK") {
    result = {
      MaterialDocument: await ids.next(tx, "mockDocument", "", 10),
      GoodsMovementType: "344",
      items: [],
      skipped: [],
      alreadyBlocked: [],
    };
    for (const batchId of [...new Set(input.batchIds)].sort()) {
      const shipments = await tx.run(
        cds.ql.SELECT.from(entity("Shipment")).where({ batchId }),
      );
      if (shipments.length) {
        result.skipped.push({ batchId, reason: "SHIPPED" });
        continue;
      }
      const stock = await tx.run(
        cds.ql.SELECT.from(entity("InventoryStock"))
          .where({ batchId })
          .forUpdate(),
      );
      const eligible = stock.filter(
        (s) => s.quantity > 0 && s.location === input.storageLocation,
      );
      if (input.plant !== "PLANT-01" || !eligible.length) {
        result.skipped.push({ batchId, reason: "NO_MATCHING_FACTORY_STOCK" });
        continue;
      }
      for (const s of eligible) {
        if (s.stockStatus === "BLOCKED") {
          result.alreadyBlocked.push({ batchId, stockId: s.stockId });
          continue;
        }
        if (s.stockStatus !== "UNRESTRICTED") {
          result.skipped.push({
            batchId,
            stockId: s.stockId,
            reason: "UNSUPPORTED_STOCK_STATUS",
          });
          continue;
        }
        await tx.run(
          cds.ql
            .UPDATE(entity("InventoryStock"))
            .set({ stockStatus: "BLOCKED" })
            .where({ stockId: s.stockId }),
        );
        result.items.push({
          batchId,
          stockId: s.stockId,
          quantity: s.quantity,
          fromStatus: "UNRESTRICTED",
          toStatus: "BLOCKED",
        });
      }
    }
  }
  if (type === "TOOL_RESTRICTION") {
    await toolState.setState(
      {
        toolId: input.toolId,
        state: "Restricted",
        incidentId: input.incidentId,
        actor: actor.id,
        actorRole: actor.role,
        reason: input.reason,
        approvalId: input.approvalId,
      },
      tx,
    );
    result = { ResourceId: input.toolId, Status: "RESTRICTED" };
  }
  result = label({
    _shapedLike: c.family,
    ...result,
    ...(approval.bypassed ? { _approvalBypassed: true } : {}),
  });
  const docId = ids.uuid("MOCK"),
    createdAt = new Date().toISOString();
  await tx.run(
    cds.ql.INSERT.into(entity("MockDocument")).entries({
      docId,
      system: c.system,
      type,
      incidentId: input.incidentId,
      payload: JSON.stringify({
        approvalId: input.approvalId || null,
        requestHash,
        result,
      }),
      createdAt,
    }),
  );
  await audit.write(
    {
      incidentId: input.incidentId,
      toolId: incident.toolId,
      actor: actor.id,
      actorRole: actor.role,
      action: "MOCK_" + type,
      reason: input.reason || input.shortText,
      details: {
        docId,
        approvalId: input.approvalId || null,
        scope: input,
        bypassed: !!approval.bypassed,
      },
    },
    tx,
  );
  await history.append(
    {
      toolId: incident.toolId,
      type: "APPROVAL",
      summary: `Approved simulated ${type.toLowerCase()} action`,
      refId: input.incidentId,
      details: { docId, approvalId: input.approvalId || null },
    },
    tx,
  );
  return result;
}
module.exports = {
  execute,
  maintenanceNotification: (input, actor, tx) =>
    execute("MAINTENANCE_NOTIFICATION", input, actor, tx),
  qualityNotification: (input, actor, tx) =>
    execute("QUALITY_NOTIFICATION", input, actor, tx),
  stockBlock: (input, actor, tx) => execute("STOCK_BLOCK", input, actor, tx),
  restrictTool: (input, actor, tx) =>
    execute("TOOL_RESTRICTION", input, actor, tx),
};
