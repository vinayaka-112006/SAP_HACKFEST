const router = require("express").Router();
const { cds, entity, decode, transaction } = require("../lib/db");
const { wrap, required, fail, label } = require("../lib/http");
const { requireRole } = require("../lib/auth");
const incidents = require("../lib/incidents");
const ids = require("../lib/ids");
const audit = require("../lib/audit");
const history = require("../lib/history");
const rules = require("../lib/rules-adapter");
router.post(
  "/incidents",
  requireRole("Worker", "Manager"),
  wrap(async (req, res) => {
    const body = req.body;
    incidents.validate(body);
    const result = await transaction(async (tx) => {
      await incidents.tool(tx, body.toolId);
      const now = new Date().toISOString();
      const incident = {
        incidentId: await ids.next(tx, "incident", "TS-"),
        toolId: body.toolId,
        reporterId: body.reporterId,
        language: body.language,
        rawText: body.rawText,
        translatedText: body.translatedText || null,
        category: body.category || null,
        suggestedNcCode: body.suggestedNcCode || null,
        confidence: body.confidence ?? null,
        missingFields: JSON.stringify(body.missingFields || []),
        state: "Reported",
        createdAt: now,
        reportedAt: body.reportedAt
          ? new Date(body.reportedAt).toISOString()
          : now,
        reportedAtSource: body.reportedAt
          ? "CLIENT_REPORTED"
          : "SERVER_RECEIVED",
        confirmedAt: null,
        confirmedBy: null,
        modelVersion: body.modelVersion || null,
      };
      await tx.run(cds.ql.INSERT.into(entity("Incident")).entries(incident));
      if (body.photoRef)
        await tx.run(
          cds.ql.INSERT.into(entity("IncidentEvidence")).entries({
            evidenceId: ids.uuid("EVID"),
            incidentId: incident.incidentId,
            type: "photo",
            reference: body.photoRef,
            sourceTime: incident.reportedAt,
          }),
        );
      const auditId = await audit.write(
        {
          incidentId: incident.incidentId,
          toolId: body.toolId,
          actor: req.user.id,
          actorRole: req.user.role,
          action: "INCIDENT_CREATED",
          reason: "Worker report received",
          details: {
            state: "Reported",
            reporterId: body.reporterId,
            reportedAtSource: incident.reportedAtSource,
          },
          modelVersion: incident.modelVersion,
        },
        tx,
      );
      await history.append(
        {
          toolId: body.toolId,
          type: "INCIDENT",
          summary: "Incident reported",
          refId: incident.incidentId,
          details: { state: "Reported" },
        },
        tx,
      );
      return {
        incident: decode(incident),
        warnings: body.reportedAt
          ? []
          : ["reportedAt omitted; server receive time used"],
        auditId,
      };
    });
    res.status(201).json(label(result));
  }),
);
router.post(
  "/incidents/:id/confirm",
  requireRole("Worker", "Manager"),
  wrap(async (req, res) => {
    required(req.body, ["confirmedBy"]);
    if (req.body.confirmedBy.length > 120)
      fail(400, "INVALID_INPUT", "Invalid confirmedBy identifier");
    const changes = req.body.corrections || {};
    if (typeof changes !== "object" || Array.isArray(changes))
      fail(400, "INVALID_INPUT", "corrections must be an object");
    for (const [k, v] of Object.entries(changes))
      if (
        !["translatedText", "category", "suggestedNcCode", "toolId"].includes(
          k,
        ) ||
        typeof v !== "string" ||
        (k !== "translatedText" && v.length > 120) ||
        !v.trim()
      )
        fail(400, "INVALID_INPUT", "Invalid correction", { field: k });
    const result = await transaction(async (tx) => {
      await tx.run(
        cds.ql.SELECT.one
          .from(entity("Incident"))
          .where({ incidentId: req.params.id })
          .forUpdate(),
      );
      const before = await incidents.find(tx, req.params.id);
      if (
        before.state !== "Reported" ||
        !(await rules.canIncidentTransition(before.state, "Confirmed", {
          ...req.user,
          incident: before,
          tx,
        }))
      )
        fail(
          409,
          "INVALID_STATE",
          "Incident cannot be confirmed from its current state",
        );
      if (changes.toolId) await incidents.tool(tx, changes.toolId);
      const update = {
        ...changes,
        state: "Confirmed",
        confirmedAt: new Date().toISOString(),
        confirmedBy: req.body.confirmedBy,
      };
      await tx.run(
        cds.ql
          .UPDATE(entity("Incident"))
          .set(update)
          .where({ incidentId: before.incidentId }),
      );
      const after = { ...before, ...update };
      const auditId = await audit.write(
        {
          incidentId: before.incidentId,
          toolId: after.toolId,
          actor: req.user.id,
          actorRole: req.user.role,
          action: "INCIDENT_CONFIRMED",
          reason: "Worker confirmed report",
          details: { before, after },
          modelVersion: after.modelVersion,
        },
        tx,
      );
      for (const toolId of [...new Set([before.toolId, after.toolId])])
        await history.append(
          {
            toolId,
            type: "INCIDENT",
            summary:
              toolId !== after.toolId
                ? "Incident reassigned to corrected tool"
                : "Incident confirmed",
            refId: before.incidentId,
            details: {
              fromTool: before.toolId,
              toTool: after.toolId,
              state: "Confirmed",
            },
          },
          tx,
        );
      return { incident: after, warnings: [], auditId };
    });
    res.json(label(result));
  }),
);
router.get(
  "/incidents/:id",
  requireRole(),
  wrap(async (req, res) => {
    const result = await transaction(async (tx) => {
      const incident = await incidents.find(tx, req.params.id);
      const evidence = await tx.run(
        cds.ql.SELECT.from(entity("IncidentEvidence"))
          .where({ incidentId: incident.incidentId })
          .orderBy("evidenceId"),
      );
      const entries = (
        await tx.run(
          cds.ql.SELECT.from(entity("AuditLog"))
            .where({ incidentId: incident.incidentId })
            .orderBy("timestamp", "auditId"),
        )
      ).map(decode);
      const traces = await tx.run(
        cds.ql.SELECT.from(entity("TraceResult"))
          .where({ incidentId: incident.incidentId })
          .orderBy("windowHours", "version"),
      );
      return {
        incident,
        evidence,
        auditSummary: {
          count: entries.length,
          last: entries.slice(-5).reverse(),
        },
        traceResults: traces.map((t) => ({
          windowHours: t.windowHours,
          version: t.version,
          totalUnits: JSON.parse(t.units).length,
          byTier: JSON.parse(t.tiers),
          dataQualityScore: t.dataQualityScore,
          snapshotTime: t.snapshotTime,
        })),
      };
    });
    res.json(label(result));
  }),
);
module.exports = { mount: "/api", router, owner: "platform" };
