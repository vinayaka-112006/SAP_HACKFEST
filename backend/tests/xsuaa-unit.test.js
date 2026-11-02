jest.mock("@sap/xssec", () => ({
  XsuaaService: jest.fn(),
  createSecurityContext: jest.fn(),
}));
const xssec = require("@sap/xssec");
const cds = require("@sap/cds");
const request = require("supertest");
const express = require("express");
const { requireRole } = require("../srv/lib/auth");
const app = express();
app.get("/quality", requireRole("Quality"), (req, res) => res.json(req.user));
app.use(require("../srv/lib/errors"));
let oldMode, oldCredentials;
beforeAll(() => {
  oldMode = process.env.AUTH_MODE;
  oldCredentials = cds.env.requires.auth.credentials;
  process.env.AUTH_MODE = "xsuaa";
  cds.env.requires.auth.credentials = { xsappname: "toolsathi-test" };
});
afterAll(() => {
  if (oldMode === undefined) delete process.env.AUTH_MODE;
  else process.env.AUTH_MODE = oldMode;
  cds.env.requires.auth.credentials = oldCredentials;
});
test("scope mapping occurs only after SDK verification; header role is ignored (mocked SDK unit test)", async () => {
  const checkScope = jest.fn((scope) => scope === "toolsathi-test.Quality");
  xssec.createSecurityContext.mockResolvedValue({
    checkScope,
    token: { getPayload: () => ({ user_name: "VERIFIED-TEST-USER" }) },
  });
  const r = await request(app)
    .get("/quality")
    .set("Authorization", "Bearer synthetic-unit-test-input")
    .set("x-demo-user", "SPOOF")
    .set("x-demo-role", "Manager");
  expect(r.status).toBe(200);
  expect(r.body).toMatchObject({ id: "VERIFIED-TEST-USER", role: "Quality" });
  expect(checkScope).toHaveBeenCalledWith("toolsathi-test.Quality");
});
test("SDK validation rejection returns 401 without token contents", async () => {
  xssec.createSecurityContext.mockRejectedValue(
    new Error("synthetic token rejected"),
  );
  const r = await request(app)
    .get("/quality")
    .set("Authorization", "Bearer rejected-unit-test-input");
  expect(r.status).toBe(401);
  expect(JSON.stringify(r.body)).not.toContain("rejected-unit-test-input");
});
