"use strict";

const rules = require("./rules-adapter");

const READING_SHAPE = "Each inspection reading must be { name, passed: true }";

function validText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validTimestamp(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime());
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second] = match;
  const probe = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second));
  return probe.getUTCFullYear() === +year &&
    probe.getUTCMonth() === +month - 1 &&
    probe.getUTCDate() === +day &&
    probe.getUTCHours() === +hour &&
    probe.getUTCMinutes() === +minute &&
    probe.getUTCSeconds() === +second;
}

function validateRepairEvidence(repairLog) {
  const errors = [];
  if (!repairLog || typeof repairLog !== "object" || Array.isArray(repairLog))
    return ["repair_log_required"];
  if (!validText(repairLog.description)) errors.push("repair_description_required");
  if (!validText(repairLog.loggedBy)) errors.push("repair_technician_required");
  if (!validTimestamp(repairLog.loggedAt))
    errors.push("repair_timestamp_invalid");
  const isPassed = repairLog.passed === true || repairLog.passed === 1 || repairLog.passed === "true";
  if (!isPassed) errors.push("repair_not_marked_passed");

  if (!Array.isArray(repairLog.testReadings) || repairLog.testReadings.length === 0) {
    errors.push("inspection_readings_required");
  } else {
    for (const reading of repairLog.testReadings) {
      if (!reading || typeof reading !== "object" || Array.isArray(reading)) {
        errors.push("inspection_reading_malformed");
      } else {
        if (!validText(reading.name)) errors.push("inspection_reading_name_required");
        if (typeof reading.passed !== "boolean")
          errors.push("inspection_result_unknown");
        else if (!reading.passed) errors.push("inspection_reading_failed");
      }
    }
  }
  return [...new Set(errors)];
}

/**
 * Validate persisted repair evidence and the platform's current tool transition.
 * This function checks role labels only; the route must authenticate the user.
 * Separation of duties is enforced by comparing the authenticated verifier with
 * RepairLog.loggedBy. The inspection reading schema is intentionally explicit:
 * a non-empty array of { name: string, passed: boolean } records.
 */
async function validateReturnToService({
  repairLog,
  toolState,
  verifierId,
  verifierRole,
} = {}) {
  const errors = validateRepairEvidence(repairLog);
  if (verifierRole !== "Verifier") errors.push("verifier_role_required");
  if (!validText(verifierId)) errors.push("verifier_identity_required");
  if (
    validText(verifierId) &&
    validText(repairLog?.loggedBy) &&
    verifierId.trim().toLocaleLowerCase("en-US") ===
      repairLog.loggedBy.trim().toLocaleLowerCase("en-US")
  )
    errors.push("verifier_must_differ_from_repair_technician");

  if (!validText(toolState)) {
    errors.push("tool_state_required");
  } else if (
    !(await rules.canToolTransition(toolState, "Active", {
      verified: true,
      role: verifierRole,
    }))
  ) {
    errors.push("invalid_tool_state_transition");
  }
  const uniqueErrors = [...new Set(errors)];
  return Object.freeze({
    valid: uniqueErrors.length === 0,
    errors: Object.freeze(uniqueErrors),
    readingShape: READING_SHAPE,
  });
}

module.exports = {
  validateRepairEvidence,
  validateReturnToService,
  validTimestamp,
  READING_SHAPE,
};
