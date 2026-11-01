"use strict";
// Run directly: node test_e2e_verify.js
process.env.NODE_ENV = "test";
const databaseConfig = require("./srv/lib/database-config");
process.chdir(databaseConfig.projectRoot);
databaseConfig.loadEnvironment();
const cds = require("@sap/cds");
databaseConfig.configureDatabase(cds, { mode: "sqlite" });

const express = require("express");
const cors = require("cors");
const { loadRouters } = require("./srv/lib/router-loader");
const errors = require("./srv/lib/errors");

const REPAIR_ID = "REP-734ab610-4076-4cd4-9edd-406fb78431ca";
const INCIDENT_ID = "TS-0004";

cds.on("served", async () => {
  const app = cds.app;

  async function apiCall(method, path, body, role = "Manager", user = "DEMO-MANAGER") {
    const http = require("http");
    return new Promise((resolve, reject) => {
      const bodyStr = body ? JSON.stringify(body) : undefined;
      const req = http.request({
        hostname: "127.0.0.1",
        port: 4004,
        path: `/api${path}`,
        method,
        headers: {
          "Content-Type": "application/json",
          "x-demo-user": user,
          "x-demo-role": role,
          ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
        },
      }, (res) => {
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      });
      req.on("error", reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  await new Promise(r => cds.app.listen(4004, r));

  console.log("=== Test: verify-return for TS-0004 ===");
  const vr = await apiCall("POST", `/incidents/${INCIDENT_ID}/verify-return`,
    { repairId: REPAIR_ID }, "Verifier", "VER-01");
  console.log("Status:", vr.status);
  console.log("Body:", JSON.stringify(vr.body, null, 2));

  if (vr.status === 200) {
    console.log("\n=== Test: close incident TS-0004 ===");
    const cr = await apiCall("POST", `/incidents/${INCIDENT_ID}/close`,
      { reason: "Tool recalibrated and independently verified.", insufficientEvidence: false });
    console.log("Close status:", cr.status);
    console.log("Close body:", JSON.stringify(cr.body, null, 2));

    const ir = await apiCall("GET", `/incidents/${INCIDENT_ID}`, null);
    console.log("Incident state after close:", ir.body?.incident?.state);

    const tr = await apiCall("GET", "/tools", null);
    const toolB = tr.body?.tools?.find(t => t.toolId === "TOOL-B");
    console.log("TOOL-B state after close:", toolB?.state);
  }

  process.exit(0);
});

cds.on("bootstrap", (app) => {
  app.use(express.json());
  app.use(cors({ origin: true }));
  loadRouters(app);
  app.use(errors.handler);
});

cds.serve("all").in(express());
