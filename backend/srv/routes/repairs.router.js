"use strict";

const router = require("express").Router();
const { cds, entity, decode, transaction } = require("../lib/db");
const { wrap, required, fail, label } = require("../lib/http");
const { requireRole } = require("../lib/auth");
const { uuid } = require("../lib/ids");
const audit = require("../lib/audit");
const history = require("../lib/history");
const incidents = require("../lib/incidents");
const toolState = require("../lib/tool-state");

function validateReadings(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100)
    fail(400, "INVALID_REPAIR_EVIDENCE", "testReadings must contain 1 to 100 named readings");
  return value.map((reading) => {
    if (
      !reading ||
      typeof reading !== "object" ||
      Array.isArray(reading) ||
      Object.keys(reading).some((key) => !["name", "passed"].includes(key)) ||
      typeof reading.name !== "string" ||
      !reading.name.trim() ||
      reading.name.trim().length > 120 ||
      typeof reading.passed !== "boolean"
    )
      fail(400, "INVALID_REPAIR_EVIDENCE", "Each reading must contain only a non-empty name and an explicit boolean passed result");
    return { name: reading.name.trim(), passed: reading.passed };
  });
}

router.post(
  "/incidents/:id/repairs",
  requireRole("Technician"),
  wrap(async (req, res) => {
    required(req.body, ["description"]);
    if (
      Object.keys(req.body).some((key) => key !== "description") ||
      req.body.description.trim().length > 4000
    )
      fail(400, "INVALID_INPUT", "Only a repair description of at most 4000 characters is accepted");

    const result = await transaction(async (tx) => {
      const incidentRow = await tx.run(
        cds.ql.SELECT.one
          .from(entity("Incident"))
          .where({ incidentId: req.params.id })
          .forUpdate(),
      );
      if (!incidentRow) fail(404, "INCIDENT_NOT_FOUND", "Incident not found");
      const incident = decode(incidentRow);
      if (incident.state !== "Confirmed")
        fail(409, "INVALID_STATE", "Repair logging requires a Confirmed incident", {
          incidentId: incident.incidentId,
          state: incident.state,
        });

      const tool = await tx.run(
        cds.ql.SELECT.one.from(entity("Tool"))
          .where({ toolId: incident.toolId })
          .forUpdate(),
      );
      if (!tool) fail(404, "TOOL_NOT_FOUND", "Tool not found");
      const repairs = (await tx.run(
        cds.ql.SELECT.from(entity("RepairLog"))
          .where({ toolId: incident.toolId })
          .forUpdate(),
      )).map(decode);
      const openRepair = repairs.find((repair) => !repair.verifiedBy && !repair.verifiedAt);
      if (openRepair)
        fail(409, "REPAIR_ALREADY_OPEN", "An unverified repair log already exists for this incident and tool", {
          repairId: openRepair.repairId,
        });

      if (tool.state === "Restricted") {
        await toolState.setState(
          {
            toolId: incident.toolId,
            state: "Under repair",
            incidentId: incident.incidentId,
            actor: req.user.id,
            actorRole: req.user.role,
            reason: "Technician began a repair; independent verification is required before return to service",
          },
          tx,
        );
      } else if (tool.state !== "Under repair") {
        fail(409, "INVALID_STATE", "Repair logging is permitted only for a Restricted or Under repair tool", {
          state: tool.state,
        });
      }

      const repair = {
        repairId: uuid("REP"),
        toolId: incident.toolId,
        incidentId: incident.incidentId,
        description: req.body.description.trim(),
        loggedBy: req.user.id,
        loggedAt: new Date().toISOString(),
        testReadings: JSON.stringify([]),
        passed: false,
        verifiedBy: null,
        verifiedAt: null,
      };
      await tx.run(cds.ql.INSERT.into(entity("RepairLog")).entries(repair));
      const auditId = await audit.write(
        {
          incidentId: incident.incidentId,
          toolId: incident.toolId,
          actor: req.user.id,
          actorRole: req.user.role,
          action: "REPAIR_STARTED",
          reason: "Technician recorded repair work; the tool remains unavailable pending independent verification",
          details: { repairId: repair.repairId, state: "Under repair" },
        },
        tx,
      );
      await history.append(
        {
          toolId: incident.toolId,
          type: "REPAIR",
          summary: "Repair work recorded; inspection and completion are pending",
          refId: incident.incidentId,
          details: { repairId: repair.repairId, loggedBy: repair.loggedBy },
        },
        tx,
      );
      return {
        incidentId: incident.incidentId,
        toolId: incident.toolId,
        repairStatus: "Under repair",
        completed: false,
        repair: { ...repair, testReadings: [] },
        auditId,
      };
    });
    res.status(201).json(label(result));
  }),
);

router.post(
  "/repairs/:id/complete",
  requireRole("Technician"),
  wrap(async (req, res) => {
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body) ||
      Object.keys(req.body).some((key) => key !== "testReadings")
    )
      fail(400, "INVALID_INPUT", "Expected a testReadings array only");
    const testReadings = validateReadings(req.body.testReadings);

    const result = await transaction(async (tx) => {
      const repairRef = await tx.run(
        cds.ql.SELECT.one.from(entity("RepairLog"))
          .where({ repairId: req.params.id }),
      );
      if (!repairRef) fail(404, "REPAIR_LOG_NOT_FOUND", "Repair log not found");
      const incidentRow = await tx.run(
        cds.ql.SELECT.one.from(entity("Incident"))
          .where({ incidentId: repairRef.incidentId })
          .forUpdate(),
      );
      if (!incidentRow) fail(404, "INCIDENT_NOT_FOUND", "Incident not found");
      const incident = decode(incidentRow);
      const tool = await tx.run(
        cds.ql.SELECT.one.from(entity("Tool"))
          .where({ toolId: repairRef.toolId })
          .forUpdate(),
      );
      if (!tool) fail(404, "TOOL_NOT_FOUND", "Tool not found");
      const row = await tx.run(
        cds.ql.SELECT.one.from(entity("RepairLog"))
          .where({ repairId: req.params.id })
          .forUpdate(),
      );
      const repair = decode(row);
      if (repair.incidentId !== incident.incidentId || repair.toolId !== tool.toolId)
        fail(409, "INVALID_REPAIR_EVIDENCE", "Repair log is not linked to the incident tool");
      if (repair.loggedBy !== req.user.id)
        fail(403, "FORBIDDEN", "Only the Technician who recorded this repair may submit its readings");
      if (repair.verifiedBy || repair.verifiedAt || repair.passed === true || tool.state !== "Under repair")
        fail(409, "INVALID_STATE", "Repair is already complete or the tool is not Under repair", {
          toolState: tool.state,
          repairPassed: repair.passed,
        });

      const passed = testReadings.every((reading) => reading.passed);
      const submittedAt = new Date().toISOString();
      await tx.run(
        cds.ql.UPDATE(entity("RepairLog"))
          .set({ testReadings: JSON.stringify(testReadings), passed })
          .where({ repairId: repair.repairId, passed: false, verifiedBy: null, verifiedAt: null }),
      );

      let stateChange = null;
      if (passed) {
        stateChange = await toolState.setState(
          {
            toolId: tool.toolId,
            state: "Awaiting verification",
            incidentId: incident.incidentId,
            actor: req.user.id,
            actorRole: req.user.role,
            reason: "Technician completed repair with explicitly passing recorded readings; independent verification is required",
          },
          tx,
        );
      }
      const auditId = await audit.write(
        {
          incidentId: incident.incidentId,
          toolId: tool.toolId,
          actor: req.user.id,
          actorRole: req.user.role,
          action: passed ? "REPAIR_COMPLETED" : "REPAIR_TESTS_RECORDED_FAILED",
          reason: passed
            ? "Repair readings passed; tool awaits independent verification"
            : "At least one repair reading did not pass; tool remains Under repair",
          details: {
            repairId: repair.repairId,
            submittedAt,
            testReadings: testReadings.map((reading) => ({ ...reading })),
            passed,
            fromState: tool.state,
            toState: passed ? "Awaiting verification" : tool.state,
          },
        },
        tx,
      );
      await history.append(
        {
          toolId: tool.toolId,
          type: "REPAIR",
          summary: passed
            ? "Repair readings passed; awaiting independent verification"
            : "Repair readings did not all pass; tool remains Under repair",
          refId: incident.incidentId,
          details: {
            repairId: repair.repairId,
            submittedBy: req.user.id,
            submittedAt,
            testReadings: testReadings.map((reading) => ({ ...reading })),
            passed,
          },
        },
        tx,
      );
      return {
        incidentId: incident.incidentId,
        toolId: tool.toolId,
        repairStatus: passed ? "Awaiting verification" : "Under repair",
        completed: passed,
        repair: { ...repair, testReadings, passed },
        ...(stateChange
          ? { toolState: { from: tool.state, to: "Awaiting verification" } }
          : { toolState: { from: tool.state, to: tool.state } }),
        auditId,
      };
    });
    res.json(label(result));
  }),
);

module.exports = { mount: "/api", router, owner: "platform" };
