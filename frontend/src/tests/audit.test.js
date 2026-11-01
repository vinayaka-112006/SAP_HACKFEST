import { test } from "node:test";
import assert from "node:assert/strict";
import {
  auditActionLabel,
  auditEventDescription,
  auditSnapshotDiff,
  formatAuditTimestamp,
} from "../features/governance/audit-presentation.js";

test("approval comments remain separate from the generated audit event description", () => {
  const entry = {
    action: "PROPOSAL_APPROVED",
    reason: "its detecting problem",
    details: { proposalId: "PROP-001", proposalType: "TOOL_RESTRICTION" },
  };
  assert.equal(auditActionLabel(entry.action), "Proposal approved");
  assert.equal(auditEventDescription(entry), "Containment proposal PROP-001 approved.");
  assert.notEqual(auditEventDescription(entry), entry.reason);
});

test("trace and confirmation audit labels describe persisted operations and identity context", () => {
  assert.equal(
    auditEventDescription({ action: "TRACE_GENERATED", details: { traceId: "TRACE-1", windowHours: 72 } }),
    "72-hour trace run TRACE-1 completed and persisted.",
  );
  assert.equal(auditEventDescription({ action: "INCIDENT_CONFIRMED" }), "Incident confirmation persisted.");
});

test("before and after snapshots become a stable field diff", () => {
  assert.deepEqual(auditSnapshotDiff({
    details: { before: { state: "Reported", category: null }, after: { state: "Confirmed", category: "TORQUE", confirmedBy: "WRK-1" } },
  }), [
    { field: "category", before: "null", after: "TORQUE" },
    { field: "confirmedBy", before: "(not present)", after: "WRK-1" },
    { field: "state", before: "Reported", after: "Confirmed" },
  ]);
});

test("invalid stored timestamps are shown explicitly without substituting a time", () => {
  assert.equal(formatAuditTimestamp("not-a-time"), "not-a-time");
});
