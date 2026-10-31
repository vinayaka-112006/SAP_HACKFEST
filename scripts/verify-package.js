const fs = require("node:fs");
const path = require("node:path");
const { fork, execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
async function verify() {
  const cwd = path.resolve("gen/srv");
  assert(
    fs.existsSync(path.join(cwd, "srv/csn.json")),
    "Run npm run build first",
  );
  assert(
    fs.existsSync(path.join(cwd, "docs/examples/ai-structure.json")),
    "Packaged stub fixtures are missing",
  );
  fs.mkdirSync("backup", { recursive: true });
  const database = path.resolve("backup/packaged-runtime.sqlite");
  const env = {
    ...process.env,
    NODE_ENV: "development",
    CDS_ENV: "development",
    AUTH_MODE: "header",
    ENFORCE_APPROVALS: "true",
    ALLOW_UNAPPROVED_MOCKS: "false",
    CDS_REQUIRES_DB_CREDENTIALS_URL: database,
    PORT: "0",
  };
  execFileSync(process.execPath, ["scripts/reset-db.js"], {
    env,
    stdio: "pipe",
    timeout: 30000,
  });
  const child = fork("srv/server.js", [], { cwd, env, silent: true });
  let output = "";
  try {
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
    assert.equal(await require("./verify-stubs")(base), 6);
    const tools = await fetch(base + "/api/tools", {
      headers: { "x-demo-user": "PACKAGE-TEST", "x-demo-role": "Manager" },
    });
    assert.equal(tools.status, 200);
    assert.equal((await tools.json()).tools.length, 3);
    const report = {
      label: "synthetic data, simulated services",
      status: "PASSED",
      checks: [
        "compiled CSN loads",
        "packaged stub fixtures resolve",
        "health and five teammate stubs verified",
        "seeded CAP queries work",
      ],
      cloudDeployment: "NOT_EXECUTED",
    };
    fs.writeFileSync(
      "tests/results/package-results.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (child.exitCode === null) {
      const exited = new Promise((resolve) => child.once("exit", resolve));
      child.send({ type: "toolsathi:shutdown" });
      await exited;
    }
  }
}
verify().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
