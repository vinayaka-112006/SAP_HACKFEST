const cds = require("@sap/cds");
const request = require("supertest");
const express = require("express");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { loadRouters } = require("../srv/lib/router-loader");
const verify = require("../scripts/verify-stubs");
cds.test(__dirname + "/..");
jest.setTimeout(30000);
test("remaining teammate stubs and live health match documented fixtures", async () => {
  expect(
    await verify(
      cds.app.server
        ? `http://localhost:${cds.app.server.address().port}`
        : cds.test.url,
    ),
  ).toBe(5);
});
test("unknown route returns contract error", async () => {
  const response = await request(cds.app).get("/api/no-such-route");
  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe("NOT_FOUND");
});
test("malformed JSON returns contract error", async () => {
  const response = await request(cds.app)
    .post("/api/incidents")
    .set("Content-Type", "application/json")
    .send("{");
  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("INVALID_JSON");
});
test("configured local UI origin receives CORS headers", async () => {
  const response = await request(cds.app)
    .options("/api/incidents")
    .set("Origin", "http://localhost:5173")
    .set("Access-Control-Request-Method", "POST");
  expect(response.headers["access-control-allow-origin"]).toBe(
    "http://localhost:5173",
  );
});
test("unlisted origin receives no CORS grant", async () => {
  const response = await request(cds.app)
    .get("/api/health")
    .set("Origin", "https://unlisted.example");
  expect(response.headers["access-control-allow-origin"]).toBeUndefined();
});
test("real router overrides only its matching stub; duplicate methods fail startup", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "toolsathi-routes-"));
  const expressPath = JSON.stringify(require.resolve("express"));
  try {
    const code = `const router=require(${expressPath}).Router();router.get('/tools',(_req,res)=>res.json({real:true}));module.exports={mount:'/api',router,owner:'test'};`;
    fs.writeFileSync(path.join(dir, "real.router.js"), code);
    const app = express();
    const registry = loadRouters(app, dir);
    expect(registry.get("GET /api/tools").stub).toBe(false);
    expect((await request(app).get("/api/tools")).body).toEqual({ real: true });
    expect((await request(app).get("/api/incidents/TS-0002")).body._stub).toBe(
      true,
    );
    fs.writeFileSync(path.join(dir, "duplicate.router.js"), code);
    expect(() => loadRouters(express(), dir)).toThrow("Duplicate route");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
