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
          testFiles: result.testResults.map((suite) => ({
            file: require("node:path").relative(process.cwd(), suite.testFilePath).replaceAll("\\", "/"),
            passed: suite.numPassingTests,
            failed: suite.numFailingTests,
            skipped: suite.numPendingTests,
          })),
          externalChecksNotExecuted: [
            "Jamuna ground truth sign-off",
            "Real XSUAA binding/token",
            "BTP/HDI deployment",
            "Domain-defined inspection requirements and tolerances",
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
