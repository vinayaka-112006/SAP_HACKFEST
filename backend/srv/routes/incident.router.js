const router = require("express").Router();
const { cds, entity, decode, transaction } = require("../lib/db");
const { wrap, required, fail, label } = require("../lib/http");
const { requireRole } = require("../lib/auth");
const incidents = require("../lib/incidents");
const ids = require("../lib/ids");
const audit = require("../lib/audit");
const history = require("../lib/history");
const rules = require("../lib/rules-adapter");
const toolState = require("../lib/tool-state");
const { validateReturnToService } = require("../lib/return-to-service");
const {
  detectDuplicateIncidents,
  DEFAULT_SIMILARITY_THRESHOLD,
} = require("../lib/duplicate-detection");
const {
  detectRepeatFailure,
  DEFAULT_WINDOW_DAYS,
  DEFAULT_MINIMUM_REPORTS,
} = require("../lib/repeat-failure");
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
    if (
      typeof req.body.confirmedBy !== "string" ||
      !req.body.confirmedBy.trim() ||
      req.body.confirmedBy.length > 120
    )
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
        confirmedBy: req.body.confirmedBy.trim(),
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
          traceId: t.traceId,
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
router.get(
  "/incidents/:id/duplicates",
  requireRole(),
  wrap(async (req, res) => {
    const result = await transaction(async (tx) => {
      const incident = await incidents.find(tx, req.params.id);
      // translatedText is the comparable canonical language when available;
      // rawText remains the explicit fallback. reportedAt is event time, while
      // createdAt records server receipt time. Do not silently substitute it.
      const description =
        typeof incident.translatedText === "string" &&
        incident.translatedText.trim()
          ? incident.translatedText
          : incident.rawText;
      const descriptionSource = description === incident.translatedText
        ? "translatedText"
        : "rawText";
      const current = {
        id: incident.incidentId,
        toolId: incident.toolId,
        category: incident.category,
        description,
        createdAt: incident.reportedAt,
      };
      const history = incident.category
        ? await tx.run(
            cds.ql.SELECT.from(entity("Incident")).where({
              toolId: incident.toolId,
              category: incident.category,
            }),
          )
        : [];
      const candidates = history.map((row) => {
        const decoded = decode(row);
        return {
          id: decoded.incidentId,
          toolId: decoded.toolId,
          category: decoded.category,
          description:
            typeof decoded.translatedText === "string" &&
            decoded.translatedText.trim()
              ? decoded.translatedText
              : decoded.rawText,
          createdAt: decoded.reportedAt,
          state: decoded.state,
        };
      });
      const evaluation = detectDuplicateIncidents(current, candidates);
      const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
      return {
        incidentId: incident.incidentId,
        descriptionSource,
        evaluation: { valid: evaluation.valid, reason: evaluation.reason },
        candidates: evaluation.matches.map((match) => {
          const candidate = byId.get(match.id);
          return {
            incidentId: match.id,
            reportedAt: match.createdAt,
            state: candidate.state,
            similarity: match.similarity,
            reason:
              "Same tool, category, and sufficiently similar description; human review required.",
          };
        }),
      };
    });
    res.json(label(result));
  }),
);
router.get(
  "/incidents/:id/repeat-failures",
  requireRole(),
  wrap(async (req, res) => {
    const positiveNumber = (name, fallback, integer = false) => {
      const raw = req.query[name];
      if (raw === undefined) return fallback;
      if (
        typeof raw !== "string" ||
        !/^\d+(?:\.\d+)?$/.test(raw.trim())
      )
        fail(400, "INVALID_WINDOW", `${name} must be a positive number`);
      const value = Number(raw);
      if (
        !Number.isFinite(value) ||
        value <= 0 ||
        !Number.isFinite(value * 24 * 60 * 60 * 1000) ||
        (integer && !Number.isSafeInteger(value))
      )
        fail(400, "INVALID_WINDOW", `${name} must be a positive ${integer ? "integer" : "number"}`);
      return value;
    };
    const windowDays = positiveNumber("windowDays", DEFAULT_WINDOW_DAYS);
    const minimumReports = positiveNumber(
      "minimumReports",
      DEFAULT_MINIMUM_REPORTS,
      true,
    );
    const result = await transaction(async (tx) => {
      const incident = await incidents.find(tx, req.params.id);
      const history =
        typeof incident.toolId === "string" &&
        incident.toolId.trim() &&
        typeof incident.category === "string" &&
        incident.category.trim()
          ? await tx.run(
              cds.ql.SELECT.from(entity("Incident")).where({
                toolId: incident.toolId,
                category: incident.category,
              }).orderBy("reportedAt", "incidentId"),
            )
          : [];
      const records = history.map((row) => {
        const decoded = decode(row);
        return {
          id: decoded.incidentId,
          toolId: decoded.toolId,
          category: decoded.category,
          description:
            typeof decoded.translatedText === "string" &&
            decoded.translatedText.trim()
              ? decoded.translatedText
              : decoded.rawText,
          createdAt: decoded.reportedAt,
          state: decoded.state,
          reportedAtSource: decoded.reportedAtSource ?? null,
        };
      });
      const evaluation = detectRepeatFailure(
        incident.toolId,
        incident.category,
        records,
        {
          windowDays,
          minimumReports,
          referenceAt: incident.reportedAt,
          excludeIncidentId: incident.incidentId,
        },
      );
      const duplicateReview = detectDuplicateIncidents(
        {
          id: incident.incidentId,
          toolId: incident.toolId,
          category: incident.category,
          description:
            typeof incident.translatedText === "string" &&
            incident.translatedText.trim()
              ? incident.translatedText
              : incident.rawText,
          createdAt: incident.reportedAt,
        },
        records,
        { windowDays, similarityThreshold: DEFAULT_SIMILARITY_THRESHOLD },
      );
      const byId = new Map(records.map((record) => [record.id, record]));
      return {
        incidentId: incident.incidentId,
        toolId: incident.toolId ?? null,
        category: incident.category ?? null,
        referenceAt: incident.reportedAt ?? null,
        referenceAtSource: incident.reportedAtSource ?? null,
        currentIncidentExcluded: true,
        windowDays,
        minimumReports,
        valid: evaluation.valid,
        thresholdMet: evaluation.thresholdMet,
        count: evaluation.count,
        matchingIncidentIds: evaluation.matchingIncidentIds,
        potentialDuplicateIncidentIds: duplicateReview.valid
          ? duplicateReview.matches.map((match) => match.id)
          : [],
        matchingIncidents: evaluation.matchingIncidentIds.map((id) => {
          const record = byId.get(id);
          return {
            incidentId: id,
            reportedAt: record.createdAt,
            reportedAtSource: record.reportedAtSource,
            state: record.state,
          };
        }),
        countBasis:
          "unique prior incident records; potential duplicates remain in the count and distinct real-world events are not verified",
        reason: evaluation.reason,
      };
    });
    res.json(label(result));
  }),
);
router.post(
  "/incidents/:id/verify-return",
  requireRole("Verifier"),
  wrap(async (req, res) => {
    required(req.body, ["repairId"]);
    if (
      Object.keys(req.body).some((key) => key !== "repairId") ||
      req.body.repairId.length > 120
    )
      fail(400, "INVALID_INPUT", "Only repairId may be supplied");
    const repairId = req.body.repairId.trim();
    if (typeof req.user.id !== "string" || !req.user.id.trim())
      fail(403, "FORBIDDEN", "An authenticated verifier identity is required");

    const result = await transaction(async (tx) => {
      const verifierId = req.user.id.trim();
      const incident = await incidents.find(tx, req.params.id);
      const currentTool = await tx.run(
        cds.ql.SELECT.one
          .from(entity("Tool"))
          .where({ toolId: incident.toolId })
          .forUpdate(),
      );
      if (!currentTool) fail(404, "TOOL_NOT_FOUND", "Tool not found");

      const row = await tx.run(
        cds.ql.SELECT.one
          .from(entity("RepairLog"))
          .where({
            repairId,
            incidentId: incident.incidentId,
            toolId: incident.toolId,
          })
          .forUpdate(),
      );
      if (!row) fail(404, "REPAIR_LOG_NOT_FOUND", "Repair log not found for this incident and tool");
      if (row.verifiedBy || row.verifiedAt)
        fail(409, "INVALID_STATE", "Repair log has already been verified");

      let readings;
      try {
        readings = typeof row.testReadings === "string"
          ? JSON.parse(row.testReadings)
          : row.testReadings;
      } catch {
        fail(409, "INVALID_REPAIR_EVIDENCE", "Repair log inspection readings are malformed", {
          errors: ["inspection_readings_malformed"],
        });
      }
      const repairLog = { ...row, testReadings: readings };
      const validation = await validateReturnToService({
        repairLog,
        toolState: currentTool.state,
        verifierId,
        verifierRole: req.user.role,
      });
      if (!validation.valid) {
        const invalidState = validation.errors.includes("invalid_tool_state_transition");
        fail(
          409,
          invalidState ? "INVALID_STATE" : "INVALID_REPAIR_EVIDENCE",
          invalidState
            ? "Tool is not in a state that permits return-to-service verification"
            : "Repair or inspection evidence is incomplete or invalid",
          { errors: validation.errors },
        );
      }

      const verifiedAt = new Date().toISOString();
      const updated = await tx.run(
        cds.ql
          .UPDATE(entity("RepairLog"))
          .set({ verifiedBy: verifierId, verifiedAt })
          .where({
            repairId: row.repairId,
            verifiedBy: null,
            verifiedAt: null,
          }),
      );
      if (updated !== 1)
        fail(409, "INVALID_STATE", "Repair log has already been verified");

      await toolState.setState(
        {
          toolId: incident.toolId,
          state: "Active",
          incidentId: incident.incidentId,
          actor: verifierId,
          actorRole: req.user.role,
          reason: "Independent verifier accepted repair and passing inspection readings",
          verified: true,
        },
        tx,
      );

      // Advance incident state to "Awaiting verification" when the incident is still
      // in an intermediate state (Confirmed, Under review, etc.) so the StateRail
      // reflects the actual progress. The incident will be fully closed by the
      // Manager using POST /incidents/:id/close.
      const INCIDENT_AWAITING_STATES = [
        "Reported", "Confirmed", "Under review",
        "Containment proposed", "Approved", "Repairing",
      ];
      if (INCIDENT_AWAITING_STATES.includes(incident.state)) {
        await tx.run(
          cds.ql.UPDATE(entity("Incident"))
            .set({ state: "Awaiting verification" })
            .where({ incidentId: incident.incidentId }),
        );
        await history.append(
          {
            toolId: incident.toolId,
            type: "INCIDENT",
            summary: `Incident ${incident.incidentId}: Tool verified and returned to service. Awaiting manager closure.`,
            refId: incident.incidentId,
            details: { fromState: incident.state, toState: "Awaiting verification" },
          },
          tx,
        );
      }

      const auditId = await audit.write(
        {
          incidentId: incident.incidentId,
          toolId: incident.toolId,
          actor: verifierId,
          actorRole: req.user.role,
          action: "TOOL_RETURN_TO_SERVICE_VERIFIED",
          reason: "Repair and inspection evidence independently verified",
          details: {
            repairId: row.repairId,
            repairTechnicianId: row.loggedBy,
            verifierId,
            fromState: currentTool.state,
            toState: "Active",
            incidentFromState: incident.state,
            incidentToState: INCIDENT_AWAITING_STATES.includes(incident.state) ? "Awaiting verification" : incident.state,
            testReadings: readings.map(({ name, passed }) => ({ name, passed })),
          },
        },
        tx,
      );
      return {
        incidentId: incident.incidentId,
        toolId: incident.toolId,
        toolState: { from: currentTool.state, to: "Active" },
        verification: {
          repairId: row.repairId,
          repairTechnicianId: row.loggedBy,
          verifiedBy: verifierId,
          verifiedAt,
          readings,
        },
        auditId,
      };
    });
    res.json(label(result));
  }),
);

router.get(
  "/incidents",
  requireRole(),
  wrap(async (req, res) => {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;
    const result = await transaction(async (tx) => {
      let query = cds.ql.SELECT.from(entity("Incident")).orderBy("reportedAt desc", "incidentId desc").limit(limit);
      const where = {};
      if (typeof req.query.toolId === "string" && req.query.toolId.trim()) {
        where.toolId = req.query.toolId.trim();
      }
      if (typeof req.query.state === "string" && req.query.state.trim()) {
        where.state = req.query.state.trim();
      }
      if (Object.keys(where).length > 0) {
        query = query.where(where);
      }
      const rows = await tx.run(query);
      return {
        incidents: rows.map(decode),
        count: rows.length,
      };
    });
    res.json(label(result));
  }),
);

router.post(
  "/incidents/:id/close",
  requireRole("Manager", "Quality", "Verifier"),
  wrap(async (req, res) => {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason || reason.length > 1000)
      fail(400, "INVALID_INPUT", "A non-empty closure reason of at most 1000 characters is required");
    const result = await transaction(async (tx) => {
      const incident = await incidents.find(tx, req.params.id);
      if (incident.state === "Closed" || incident.state === "Closed with insufficient evidence")
        fail(409, "INVALID_STATE", `Incident is already ${incident.state}`);

      const targetState = req.body?.insufficientEvidence === true
        ? "Closed with insufficient evidence"
        : "Closed";
      const hasVerifiedRepair = Boolean(
        await tx.run(
          cds.ql.SELECT.one.from(entity("RepairLog"))
            .where({ incidentId: incident.incidentId, verifiedBy: { "!=": null } }),
        ),
      );
      const allowed = hasVerifiedRepair || await rules.canIncidentTransition(incident.state, targetState, {
        ...req.user,
        incident,
        tx,
      });
      if (!allowed)
        fail(409, "INVALID_STATE", `Incident cannot transition from ${incident.state} to ${targetState}`);

      const closedAt = new Date().toISOString();
      await tx.run(
        cds.ql.UPDATE(entity("Incident"))
          .set({ state: targetState })
          .where({ incidentId: incident.incidentId }),
      );
      const auditId = await audit.write(
        {
          incidentId: incident.incidentId,
          toolId: incident.toolId,
          actor: req.user.id,
          actorRole: req.user.role,
          action: "INCIDENT_CLOSED",
          reason,
          details: { fromState: incident.state, toState: targetState, closedAt },
          modelVersion: incident.modelVersion,
        },
        tx,
      );
      await history.append(
        {
          toolId: incident.toolId,
          type: "INCIDENT",
          summary: `Incident ${incident.incidentId} closed: ${targetState}`,
          refId: incident.incidentId,
          details: { fromState: incident.state, toState: targetState, reason },
        },
        tx,
      );
      return {
        incidentId: incident.incidentId,
        fromState: incident.state,
        toState: targetState,
        closedAt,
        auditId,
      };
    });
    res.json(label(result));
  }),
);

module.exports = { mount: "/api", router, owner: "platform" };
