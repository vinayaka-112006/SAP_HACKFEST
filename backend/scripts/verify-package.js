const fs = require("node:fs");
const path = require("node:path");
const { fork, execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
async function verify() {
  const projectRoot = path.resolve(__dirname, "..");
  const cwd = path.resolve("gen/srv");
  assert(
    fs.existsSync(path.join(cwd, "srv/csn.json")),
    "Run npm run build first",
  );
  assert(
    fs.existsSync(path.join(cwd, "docs/examples/ai-structure.json")),
    "Packaged stub fixtures are missing",
  );
  const temporaryDirectory = fs.mkdtempSync(
    path.join(projectRoot, `.package-verification-${randomUUID()}-`),
  );
  const database = path.join(temporaryDirectory, "runtime.sqlite");
  const env = {
    ...process.env,
    NODE_ENV: "development",
    CDS_ENV: "development",
    DATABASE_MODE: "sqlite",
    CDS_CONFIG: "{}",
    CDS_REQUIRES_DB_KIND: "sqlite",
    CDS_REQUIRES_DB_IMPL: "@cap-js/sqlite",
    AUTH_MODE: "header",
    ENFORCE_APPROVALS: "true",
    ALLOW_UNAPPROVED_MOCKS: "false",
    CDS_REQUIRES_DB_CREDENTIALS_URL: database,
    PORT: "0",
  };
  let child;
  let output = "";
  try {
    execFileSync(process.execPath, ["scripts/reset-db.js"], {
      env,
      cwd: projectRoot,
      stdio: "pipe",
      timeout: 30000,
    });
    child = fork("srv/server.js", [], { cwd, env, silent: true });
    const base = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Packaged startup timeout: " + output)),
        20000,
      );
      child.stdout.on("data", (chunk) => {
        output += chunk;
        const match = output.match(
          /ToolSathi SIMULATED: (http:\/\/localhost:\d+)\/api/,
        );
        if (match) {
          clearTimeout(timeout);
          resolve(match[1]);
        }
      });
      child.stderr.on("data", (chunk) => {
        output += chunk;
      });
      child.once("exit", (code) => {
        clearTimeout(timeout);
        reject(new Error("Packaged startup exited " + code + ": " + output));
      });
    });
    const checked = await require("./verify-stubs")(base);
    const expectedChecks = require("../srv/routes/_stubs/contract.json").filter(
      (endpoint) => (endpoint.owner !== "platform" && endpoint.owner !== "Shashank") || endpoint.name === "health",
    ).length;
    assert.equal(checked, expectedChecks);
    const tools = await fetch(base + "/api/tools", {
      headers: { "x-demo-user": "PACKAGE-TEST", "x-demo-role": "Manager" },
    });
    assert.equal(tools.status, 200);
    assert.equal((await tools.json()).tools.length, 3);
    const report = {
      label: "synthetic data, simulated services",
      executedAt: new Date().toISOString(),
      status: "PASSED",
      runtimeDatabase: "isolated SQLite",
      checks: [
        "compiled CSN loads",
        "packaged stub fixtures resolve",
        "contract health/stub routes verified (" + checked + ")",
        "seeded CAP queries work",
      ],
      cloudDeployment: "NOT_EXECUTED",
    };
    fs.mkdirSync(path.join(projectRoot, "tests/results"), { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, "tests/results/package-results.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (child && child.exitCode === null) {
      const exited = new Promise((resolve) => child.once("exit", resolve));
      child.send({ type: "toolsathi:shutdown" });
      await exited;
    }
    const resolvedTemp = path.resolve(temporaryDirectory);
    if (
      path.dirname(resolvedTemp) === projectRoot &&
      path.basename(resolvedTemp).startsWith(".package-verification-")
    )
      fs.rmSync(resolvedTemp, { recursive: true, force: true });
  }
}
verify().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
