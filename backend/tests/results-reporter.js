const fs = require("node:fs");
module.exports = class ResultsReporter {
  onRunComplete(_contexts, result) {
    fs.mkdirSync("tests/results", { recursive: true });
    const file = "tests/results/trace-validation.json";
    const trace =
      result.testResults.some((t) =>
        t.testFilePath.endsWith("trace.test.js"),
      ) && fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file))
        : null;
    fs.writeFileSync(
      "tests/results/summary.json",
      JSON.stringify(
        {
          label: "synthetic data, simulated services",
          executedAt: new Date().toISOString(),
          passed: result.numPassedTests,
          failed: result.numFailedTests,
          skipped: result.numPendingTests,
          suitesFailed: result.numFailedTestSuites,
          externalChecksNotExecuted: [
            "Jamuna ground truth sign-off",
            "Real teammate workflow and verified return",
            "Real XSUAA binding/token",
            "HANA/MTAR deployment and cloud audit protection",
          ],
          groundTruth: trace?.groundTruth || "not exercised",
          trace: trace?.rows || [],
        },
        null,
        2,
      ) + "\n",
    );
  }
};
