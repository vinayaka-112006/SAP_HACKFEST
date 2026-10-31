const { createAdapter } = require("../srv/lib/rules-adapter");
test("missing modules use documented fallback; retirement is terminal; verified return is required", () => {
  const rules = createAdapter(null, null);
  expect(rules.usingDefaults).toBe(true);
  expect(rules.canIncidentTransition("Reported", "Confirmed")).toBe(true);
  expect(rules.canIncidentTransition("Closed", "Confirmed")).toBe(false);
  expect(rules.canToolTransition("Active", "Restricted")).toBe(true);
  expect(rules.canToolTransition("Active", "Active")).toBe(false);
  expect(rules.canToolTransition("Retired", "Active")).toBe(false);
  expect(rules.canToolTransition("Active", "Retired")).toBe(true);
  expect(rules.canToolTransition("Awaiting verification", "Active")).toBe(
    false,
  );
  expect(
    rules.canToolTransition("Awaiting verification", "Active", {
      verified: true,
      role: "Verifier",
    }),
  ).toBe(true);
  expect(rules.requiredApproverRole("STOCK_BLOCK")).toBe("Quality");
});
test("present teammate interfaces receive arguments; broken exports fail instead of falling back", () => {
  const machine = {
      canIncidentTransition: jest.fn(() => true),
      canToolTransition: jest.fn(() => false),
    },
    approvals = { requiredApproverRole: jest.fn(() => "Quality") };
  const rules = createAdapter(machine, approvals),
    ctx = { role: "Verifier" };
  expect(rules.usingDefaults).toBe(false);
  expect(rules.canIncidentTransition("X", "Y", ctx)).toBe(true);
  expect(machine.canIncidentTransition).toHaveBeenCalledWith("X", "Y", ctx);
  expect(rules.canToolTransition("X", "Y", ctx)).toBe(false);
  expect(rules.requiredApproverRole("CUSTOM")).toBe("Quality");
  expect(() =>
    createAdapter({}, approvals).canIncidentTransition("A", "B"),
  ).toThrow();
});
