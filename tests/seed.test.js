const fs = require("node:fs");
const { generate, artifacts } = require("../db/seed/generate");
const { groundTruth } = require("../db/seed/plan");
test("two actual seed runs are byte-identical and match the construction artifacts", () => {
  generate();
  const first = Object.fromEntries(
    Object.keys(artifacts()).map((p) => [p, fs.readFileSync(p, "utf8")]),
  );
  generate();
  for (const p of Object.keys(first))
    expect(fs.readFileSync(p, "utf8")).toBe(first[p]);
});
test("construction candidate matches independently specified totals", () => {
  const truth = groundTruth();
  for (const [w, total, c, p, u, s, x, y, score] of [
    [24, 35, 35, 0, 0, 35, 0, 0, 100],
    [72, 100, 90, 4, 6, 40, 35, 25, 82],
    [168, 160, 146, 8, 6, 50, 55, 55, 83],
  ]) {
    const a = truth.tools["TOOL-B"][w];
    expect([
      a.totalUnits,
      a.byTier.CONFIRMED,
      a.byTier.PROBABLE,
      a.byTier.UNKNOWN,
      a.inStock,
      a.dealerX,
      a.dealerY,
      a.score,
    ]).toEqual([total, c, p, u, s, x, y, score]);
  }
});

test("generated CSVs independently load with valid references and match provisional plan", () => {
  const output = require("node:child_process").execFileSync(
    process.execPath,
    ["db/seed/verify.js"],
    {
      env: { ...process.env, NODE_ENV: "development", CDS_ENV: "development" },
      encoding: "utf8",
      timeout: 30000,
    },
  );
  expect(output).toMatch(/Verified CSV loading/);
}, 30000);
