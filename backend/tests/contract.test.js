const cds = require("@sap/cds");
const request = require("supertest");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const spec = JSON.parse(
  require("node:fs").readFileSync("docs/openapi.yaml", "utf8"),
);
const contract = require("../srv/routes/_stubs/contract.json");
cds.test(__dirname + "/..");
jest.setTimeout(30000);
const ajv = new Ajv({ strict: false });
addFormats(ajv);
const check = (template, method, status, body) => {
  const operation = spec.paths[template][method];
  expect(operation).toBeDefined();
  const response = operation.responses[String(status)];
  expect(response).toBeDefined();
  let schema = response.content["application/json"].schema;
  if (schema.$ref) schema = spec.components.schemas.Error;
  const valid = ajv.compile(schema);
  if (!valid(body)) throw new Error(JSON.stringify(valid.errors));
};
const api = (method, path, body) => {
  const r = request(cds.app)
    [method]("/api" + path)
    .set("x-demo-user", "CONTRACT-TEST")
    .set("x-demo-role", "Manager");
  return body ? r.send(body) : r;
};
test("real endpoint status codes and response structures conform to OpenAPI", async () => {
  for (const [url, template] of [
    ["/health", "/health"],
    ["/tools", "/tools"],
    ["/tools/TOOL-B/history", "/tools/{id}/history"],
  ]) {
    const r = await api("get", url);
    check(template, "get", r.status, r.body);
  }
  const created = await api(
    "post",
    "/incidents",
    require("../docs/demo-incidents.json")[0],
  );
  check("/incidents", "post", created.status, created.body);
  const id = created.body.incident.incidentId;
  const confirmed = await api("post", `/incidents/${id}/confirm`, {
    confirmedBy: "WRK-014",
  });
  check("/incidents/{id}/confirm", "post", confirmed.status, confirmed.body);
  for (const [url, template] of [
    [`/incidents/${id}/trace?window=72`, "/incidents/{id}/trace"],
    [`/incidents/${id}`, "/incidents/{id}"],
    [`/audit?incident=${id}`, "/audit"],
    [`/mock/documents?incident=${id}`, "/mock/documents"],
  ]) {
    const r = await api("get", url);
    check(template, "get", r.status, r.body);
  }
  const denied = await api("post", "/mock/dm/tool-restrictions", {
    toolId: "TOOL-B",
    incidentId: id,
    action: "RESTRICT",
    reason: "Review",
  });
  check("/mock/dm/tool-restrictions", "post", denied.status, denied.body);
});
test("every declared endpoint is claimed by a real router or explicitly marked stub", () => {
  const registry = cds.app.locals.routeRegistry;
  expect(registry.size).toBe(19);
  for (const e of contract) {
    const key = e.method + " /api" + e.path.replace(/:[^/]+/g, ":param");
    expect(registry.get(key)).toMatchObject({ stub: e.owner === "Jamuna" });
  }
  expect(registry.get("POST /api/ai/transcribe")).toMatchObject({ stub: false, owner: "Shashank" });
});
test("approved simulated HTTP actions conform to documented schemas", async () => {
  const created = await api(
    "post",
    "/incidents",
    require("../docs/demo-incidents.json")[0],
  );
  const incidentId = created.body.incident.incidentId;
  const types = {
    maintenance: ["MAINTENANCE_NOTIFICATION", "Manager"],
    quality: ["QUALITY_NOTIFICATION", "Quality"],
    "stock-block": ["STOCK_BLOCK", "Quality"],
    restriction: ["TOOL_RESTRICTION", "Manager"],
  };
  for (const e of contract.filter((e) => types[e.name])) {
    const [type, role] = types[e.name],
      body = { ...e.request, incidentId };
    const { uuid } = require("../srv/lib/ids");
    const { entity } = require("../srv/lib/db");
    const proposalId = uuid("P"),
      approvalId = uuid("A");
    await cds.db.run(
      cds.ql.INSERT.into(entity("Proposal")).entries({
        proposalId,
        incidentId,
        type,
        payload: JSON.stringify(body),
        state: "Approved",
        reason: "Contract test",
        createdAt: new Date().toISOString(),
      }),
    );
    await cds.db.run(
      cds.ql.INSERT.into(entity("Approval")).entries({
        approvalId,
        proposalId,
        approverRole: role,
        decision: "APPROVED",
        reason: "Contract test",
        decidedBy: "TEST-APPROVER",
        decidedAt: new Date().toISOString(),
      }),
    );
    const r = await api("post", e.path, { ...body, approvalId });
    expect(r.status).toBe(200);
    check(e.path, "post", r.status, r.body);
  }
});
