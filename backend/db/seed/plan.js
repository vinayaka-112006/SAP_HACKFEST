// Fixed synthetic event-time anchor. It is intentionally a past UTC instant.
const T = "2026-10-31T05:12:00.000Z";
const at = (hours) => new Date(Date.parse(T) - hours * 3600000).toISOString();
const serial = (n) => `SN-${String(n).padStart(6, "0")}`;
// Fixed construction plan: start/end serial, tool, age hours, location, special run.
const plan = [
  [1, 10, "B", 3, "STOCK", "DUP"],
  [11, 35, "B", 12, "STOCK", "RECENT"],
  [36, 40, "B", 30, "STOCK", "STOCK72"],
  [41, 71, "B", 36, "X", "X72"],
  [72, 75, "B", 48, "X", "CONFLICT"],
  [76, 81, "B", 52, "Y", "NOREC"],
  [82, 86, "B", 56, "Y", "STALE"],
  [87, 100, "B", 60, "Y", "Y72"],
  [101, 110, "B", 90, "STOCK", "STOCK168"],
  [111, 126, "B", 100, "X", "X168"],
  [127, 130, "B", 110, "X", "NOEND"],
  [131, 160, "B", 130, "Y", "Y168"],
  [161, 180, "B", 210, "STOCK", "OLDSTOCK"],
  [181, 200, "B", 250, "X", "OLDX"],
  [201, 205, "A", 6, "STOCK", "24"],
  [206, 215, "A", 42, "STOCK", "72"],
  [216, 250, "A", 120, "STOCK", "168"],
  [251, 300, "C", 360, "STOCK", "OLD"],
].map(([first, last, tool, age, location, suffix]) => ({
  first,
  last,
  tool,
  age,
  location,
  runId: `RUN-${tool}-${suffix}`,
  batchId: `BATCH-${tool}-${suffix}`,
  suffix,
}));
// Independent expected classifications from the specification, not trace output.
function groundTruth() {
  const result = {
    status: "PROVISIONAL_CANDIDATE_REQUIRES_JAMUNA_REVIEW",
    seedVersion: "synthetic-v1",
    anchor: T,
    exposureRange: { low: 35, high: 154, unknownSeparate: 6 },
    tools: {},
  };
  for (const tool of ["B", "A", "C"]) {
    result.tools[`TOOL-${tool}`] = {};
    for (const window of [24, 72, 168]) {
      const units = plan
        .filter((p) => p.tool === tool && p.age < window)
        .flatMap((p) =>
          Array.from({ length: p.last - p.first + 1 }, (_, i) => ({
            serial: serial(p.first + i),
            tier:
              p.suffix === "NOREC"
                ? "UNKNOWN"
                : ["CONFLICT", "NOEND"].includes(p.suffix)
                  ? "PROBABLE"
                  : "CONFIRMED",
            location: p.location === "STOCK" ? "IN_STOCK" : "SHIPPED",
            dealerId: p.location === "STOCK" ? null : `DLR-${p.location}`,
          })),
        );
      const count = (field) =>
        units.reduce(
          (out, u) => ((out[u[field]] = (out[u[field]] || 0) + 1), out),
          {},
        );
      result.tools[`TOOL-${tool}`][window] = {
        units,
        totalUnits: units.length,
        byTier: { CONFIRMED: 0, PROBABLE: 0, UNKNOWN: 0, ...count("tier") },
        inStock: units.filter((u) => u.location === "IN_STOCK").length,
        dealerX: units.filter((u) => u.dealerId === "DLR-X").length,
        dealerY: units.filter((u) => u.dealerId === "DLR-Y").length,
        score: tool === "B" ? { 24: 100, 72: 82, 168: 83 }[window] : 100,
      };
    }
  }
  return result;
}
module.exports = { T, at, serial, plan, groundTruth };
