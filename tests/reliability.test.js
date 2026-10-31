const fs = require("node:fs");
const path = require("node:path");
const { fork, execFileSync } = require("node:child_process");
const database = path.resolve(
  `backup/reliability-${require("node:crypto").randomUUID()}.sqlite`,
);
let server;
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
function run(file, args = []) {
  return execFileSync(process.execPath, [file, ...args], {
    env,
    encoding: "utf8",
    timeout: 30000,
  });
}
async function start() {
  return new Promise((resolve, reject) => {
    server = fork("srv/server.js", [], { env, silent: true });
    let output = "";
    const timeout = setTimeout(
      () => reject(new Error("Local startup timed out: " + output)),
      20000,
    );
    server.stderr.on("data", (chunk) => {
      output += chunk;
    });
    server.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(
        /ToolSathi SIMULATED: (http:\/\/localhost:\d+)\/api/,
      );
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
    server.once("exit", (code) => {
      clearTimeout(timeout);
      if (code) reject(new Error("Startup exit " + code + ": " + output));
    });
  });
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const current = server;
  const done = new Promise((resolve) => current.once("exit", resolve));
  current.send({ type: "toolsathi:shutdown" });
  await done;
  server = null;
}
const headers = {
  "content-type": "application/json",
  "x-demo-user": "RESTART-TEST",
  "x-demo-role": "Manager",
};
jest.setTimeout(90000);
afterAll(async () => {
  await stop();
});
test("offline SQLite restart, backup, reset, restore, and active-server maintenance guard", async () => {
  fs.mkdirSync("backup", { recursive: true });
  // A unique absent file verifies first-start schema/seed initialization.
  let base = await start();
  expect((await fetch(base + "/api/health")).status).toBe(200);
  const create = await fetch(base + "/api/incidents", {
    method: "POST",
    headers,
    body: JSON.stringify(require("../docs/demo-incidents.json")[0]),
  });
  const incident = await create.json();
  expect(incident.incident.incidentId).toBe("TS-0002");
  expect(() => run("scripts/reset-db.js")).toThrow();
  expect(() => run("scripts/backup-db.js")).toThrow();
  await stop();
  const backupOutput = run("scripts/backup-db.js");
  const backup = backupOutput.match(/Backup created: (.+)/)[1].trim();
  base = await start();
  expect(
    (await fetch(base + "/api/incidents/TS-0002", { headers })).status,
  ).toBe(200);
  await stop();
  run("scripts/reset-db.js");
  base = await start();
  expect(
    (await fetch(base + "/api/incidents/TS-0002", { headers })).status,
  ).toBe(404);
  await stop();
  run("scripts/restore-db.js", [backup]);
  base = await start();
  expect(
    (await fetch(base + "/api/incidents/TS-0002", { headers })).status,
  ).toBe(200);
  await stop();
});
