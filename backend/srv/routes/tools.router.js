const router = require("express").Router();
const { cds, entity, decode, transaction } = require("../lib/db");
const { wrap, label } = require("../lib/http");
const { requireRole } = require("../lib/auth");
const { tool } = require("../lib/incidents");
router.get(
  "/tools",
  requireRole(),
  wrap(async (req, res) =>
    res.json(
      label({
        demoScenario: await require('../lib/synthetic-scenario').read(cds.db),
        tools: await cds.db.run(
          cds.ql.SELECT.from(entity("Tool")).orderBy("toolId"),
        ),
      }),
    ),
  ),
);
router.get(
  "/tools/:id/history",
  requireRole(),
  wrap(async (req, res) => {
    const result = await transaction(async (tx) => {
      const selected=await tool(tx, req.params.id);
      if(await require('../lib/v2').workflowAvailable(tx))await require('../lib/operations').scope(tx,req.user,selected);
      const events = (
        await tx.run(
          cds.ql.SELECT.from(entity("ToolHistoryEvent"))
            .where({ toolId: req.params.id })
            .orderBy("at desc", "eventId desc"),
        )
      ).map(decode);
      const counts = {};
      for (const e of events) counts[e.type] = (counts[e.type] || 0) + 1;
      return { toolId: req.params.id, events, counts };
    });
    res.json(label(result));
  }),
);
module.exports = { mount: "/api", router, owner: "platform" };
