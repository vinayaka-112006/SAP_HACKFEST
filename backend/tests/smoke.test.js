const cds = require("@sap/cds");
const smoke = require("../scripts/smoke");
cds.test(__dirname + "/..");
jest.setTimeout(30000);
test("real API smoke creates TS-0002, confirms, traces, audits and distinguishes teammate stubs", async () => {
  const report = await smoke(
    `http://localhost:${cds.app.server.address().port}`,
    { fresh: true },
  );
  expect(report.incidentId).toBe("TS-0002");
  expect(report.trace.map((r) => r.totalUnits)).toEqual([35, 100, 160]);
  expect(report.simulatedSAP).toHaveLength(4);
  expect(report.teammateStubs.sort()).toEqual(
    [
      "approval-decision",
      "duplicates",
      "proposals",
      "verify-return",
    ].sort(),
  );
  expect(report.blocked).toHaveLength(1);
});
