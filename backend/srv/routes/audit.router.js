const router = require("express").Router();
const { cds, entity, decode, transaction } = require("../lib/db");
const { wrap, fail, label } = require("../lib/http");
const { requireRole } = require("../lib/auth");
const { find } = require("../lib/incidents");
router.get(
  "/audit",
  requireRole("Manager", "Quality", "Verifier"),
  wrap(async (req, res) => {
    if (typeof req.query.incident !== "string" || !req.query.incident)
      fail(400, "INVALID_INPUT", "incident query parameter is required");
    const result = await transaction(async (tx) => {
      await find(tx, req.query.incident);
      const entries = await tx.run(
        cds.ql.SELECT.from(entity("AuditLog"))
          .where({ incidentId: req.query.incident })
          .orderBy("timestamp", "auditId"),
      );
      return { incidentId: req.query.incident, entries: entries.map(decode) };
    });
    res.json(label(result));
  }),
);
module.exports = { mount: "/api", router, owner: "platform" };
