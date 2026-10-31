module.exports = async function errors(err, req, res, next) {
  if (res.headersSent) return next(err);
  const malformed = err.type === "entity.parse.failed";
  const status = malformed ? 400 : err.status || 500;
  if ([401, 403].includes(status) || err.code === "APPROVAL_REQUIRED") {
    try {
      const cds = require("@sap/cds");
      if (cds.db) {
        const id =
          typeof req.body?.incidentId === "string"
            ? req.body.incidentId
            : req.path.startsWith("/api/incidents/")
              ? req.params.id
              : null;
        const incident = id
          ? await cds.db.run(
              cds.ql.SELECT.one
                .from("toolsathi.Incident")
                .where({ incidentId: id }),
            )
          : null;
        await require("./audit").write({
          incidentId: incident?.incidentId,
          toolId: incident?.toolId,
          actor: req.user?.id || "UNAUTHENTICATED",
          actorRole: req.user?.role || "Anonymous",
          action: "ACTION_REJECTED",
          reason: err.code || "ACCESS_DENIED",
          details: { method: req.method, path: req.path },
        });
      }
    } catch {
      /* Preserve the denial response if the database itself is unavailable. */
    }
  }
  res
    .status(status)
    .json({
      error: {
        code: malformed
          ? "INVALID_JSON"
          : status >= 500
            ? "INTERNAL_ERROR"
            : err.code || "REQUEST_FAILED",
        message: status >= 500 ? "Internal server error" : err.message,
        details: status >= 500 ? {} : err.details || {},
      },
    });
};
