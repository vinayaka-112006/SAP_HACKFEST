import { test } from "node:test";
import assert from "node:assert/strict";
import {
  incidentIdFromHistoryEvent,
  loadIncidentEvaluations,
} from "../features/history/incident-context.js";

test("history evaluation is bound to the selected incident event, not a global incident", async () => {
  const selected = { type: "INCIDENT", refId: "TS-INCIDENT-B" };
  assert.equal(incidentIdFromHistoryEvent(selected), "TS-INCIDENT-B");
  const calls = [];
  const result = await loadIncidentEvaluations({
    getDuplicates: async (id) => (calls.push(["duplicates", id]), { valid: true, matches: [] }),
    getRepeatFailures: async (id) => (calls.push(["repeat", id]), { valid: true, count: 0, thresholdMet: false }),
  }, incidentIdFromHistoryEvent(selected));
  assert.deepEqual(calls, [["duplicates", "TS-INCIDENT-B"], ["repeat", "TS-INCIDENT-B"]]);
  assert.deepEqual(result, {
    duplicates: { valid: true, matches: [] },
    repeatFailures: { valid: true, count: 0, thresholdMet: false },
  });
});

test("non-incident history rows and missing references do not trigger evaluations", async () => {
  assert.equal(incidentIdFromHistoryEvent({ type: "CALIBRATION", refId: "TS-1" }), null);
  assert.equal(incidentIdFromHistoryEvent({ type: "INCIDENT", refId: " " }), null);
  let calls = 0;
  const result = await loadIncidentEvaluations({
    getDuplicates: () => calls++,
    getRepeatFailures: () => calls++,
  }, null);
  assert.deepEqual(result, { duplicates: null, repeatFailures: null });
  assert.equal(calls, 0);
});

test("evaluation helper remains loading until both endpoint results settle", async () => {
  let resolveDuplicates;
  let resolveRepeat;
  let settled = false;
  const pending = loadIncidentEvaluations({
    getDuplicates: () => new Promise((resolve) => { resolveDuplicates = resolve; }),
    getRepeatFailures: () => new Promise((resolve) => { resolveRepeat = resolve; }),
  }, "TS-LOADING").then((value) => { settled = true; return value; });
  await Promise.resolve();
  assert.equal(settled, false);
  resolveDuplicates({ valid: true, matches: [] });
  resolveRepeat({ valid: true, count: 0, thresholdMet: false });
  const result = await pending;
  assert.equal(settled, true);
  assert.equal(result.duplicates.matches.length, 0);
});

test("duplicate and repeat endpoint failures are shown as errors instead of stale results", async () => {
  const result = await loadIncidentEvaluations({
    getDuplicates: async () => { throw new Error("Incident not found"); },
    getRepeatFailures: async () => { throw new Error("Access denied"); },
  }, "TS-MISSING");
  assert.deepEqual(result, {
    duplicates: { error: "Incident not found" },
    repeatFailures: { error: "Access denied" },
  });
});
