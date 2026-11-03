const cds = require("@sap/cds");
const request = require("supertest");
const fs = require("node:fs");
const path = require("node:path");
const { backupRoot } = require("../scripts/paths");
const uploads = require("../srv/lib/uploads");

cds.test(__dirname + "/..");
jest.setTimeout(40000);
const api = (method, url, role = "Worker", user = "APPLICANT-1") => {
  const req = request(cds.app)[method]("/api" + url).set("x-demo-user", user).set("x-demo-role", role);
  return req;
};
const json = (method, url, body, role, user) => api(method, url, role, user).send(body);

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("an applicant can save details, declare skills and submit for review", async () => {
  const saved = await json("put", "/v2/onboarding/me", {
    fullName: "Synthetic Applicant", email: "applicant@example.com", phone: "+91 90000 00000",
    language: "kn", department: "Maintenance", workCenter: "WC-A", shift: "Morning",
    employeeId: "EMP-9001", team: "Line A", requestedRole: "Technician", notes: "Synthetic onboarding test",
  });
  expect(saved.status).toBe(200);
  expect(saved.body.application).toMatchObject({ status: "Draft", requestedRole: "Technician" });

  const skill = await json("post", "/v2/onboarding/me/skills", {
    category: "Mechanical", name: "Torque calibration", level: "Advanced", years: 4,
    specialization: "TORQUE", workCenter: "WC-A", certification: "CERT-A", issuer: "Synthetic Institute",
    validUntil: "2028-01-31", notes: "Synthetic declaration",
  });
  expect(skill.status).toBe(200);
  expect(skill.body.skill).toMatchObject({ verified: false, source: "manual" });

  const me = await api("get", "/v2/onboarding/me");
  expect(me.status).toBe(200);
  expect(me.body.blockers).toEqual([]);
  expect(me.body.skills).toHaveLength(1);

  const submitted = await api("post", "/v2/onboarding/me/submit");
  expect(submitted.status).toBe(200);
  expect(submitted.body.status).toBe("Submitted");

  // A submitted application is locked until it is reviewed.
  expect((await api("post", "/v2/onboarding/me/skills").send({ category: "x", name: "y", level: "Expert", years: 1 })).status).toBe(409);
});

test("uploads are validated and downloads stay authorisation protected", async () => {
  const upload = await api("post", "/v2/onboarding/me/documents")
    .set("content-type", "image/png")
    .set("x-document-type", "certificate")
    .set("x-file-name", "certificate.png")
    .set("x-document-description", "Synthetic certificate")
    .send(png);
  expect(upload.status).toBe(201);
  const documentId = upload.body.document.documentId;
  const stored = path.join(uploads.root, fs.readdirSync(uploads.root)[0]);
  expect(fs.existsSync(stored)).toBe(true);
  expect(upload.body.document.storageName).toBeUndefined();

  const owner = await api("get", `/v2/documents/${documentId}/download`);
  expect(owner.status).toBe(200);
  expect(owner.headers["content-type"]).toBe("image/png");
  expect(owner.headers["x-content-type-options"]).toBe("nosniff");

  expect((await api("get", `/v2/documents/${documentId}/download`, "Worker", "OTHER-APPLICANT")).status).toBe(403);
  expect((await api("get", `/v2/documents/${documentId}/download`, "Administrator", "ADMIN-1")).status).toBe(200);

  const disguised = await api("post", "/v2/onboarding/me/documents")
    .set("content-type", "application/pdf")
    .set("x-document-type", "resume")
    .set("x-file-name", "resume.pdf")
    .send(Buffer.from("<script>alert(1)</script>"));
  expect(disguised.status).toBe(400);
  expect(disguised.body.error.code).toBe("DOCUMENT_CONTENT_MISMATCH");

  const executable = await api("post", "/v2/onboarding/me/documents")
    .set("content-type", "image/png").set("x-document-type", "certificate").set("x-file-name", "payload.exe").send(png);
  expect(executable.status).toBe(400);
});

test("a requested role never grants access and only an independent administrator can approve", async () => {
  // The requested role creates no profile: only the review may grant an operational role.
  const identity = await api("get", "/v2/me");
  expect(identity.body.profile ?? null).toBeNull();
  expect(await cds.db.run(cds.ql.SELECT.from("toolsathi.UserProfile").where({ userId: "APPLICANT-1" }))).toHaveLength(0);

  const queue = await api("get", "/v2/onboarding", "Administrator", "ADMIN-1");
  expect(queue.status).toBe(200);
  const application = queue.body.applications.find((item) => item.userId === "APPLICANT-1");
  expect(application).toBeTruthy();

  // Applicant cannot review their own application even with an Administrator header, and
  // another role cannot approve at all.
  expect((await json("post", `/v2/onboarding/${application.applicationId}/review`, { decision: "Approve" }, "Manager", "MGR-1")).status).toBe(403);
  expect((await json("post", `/v2/onboarding/${application.applicationId}/review`, { decision: "Reject" }, "Administrator", "ADMIN-1")).status).toBe(400);

  const approved = await json("post", `/v2/onboarding/${application.applicationId}/review`, {
    decision: "Approve", role: "Technician", notes: "Verified synthetic qualification", verifySkills: true,
  }, "Administrator", "ADMIN-1");
  expect(approved.status).toBe(200);
  expect(approved.body.profile).toMatchObject({ role: "Technician", status: "Active" });

  const me = await api("get", "/v2/onboarding/me");
  expect(me.body.application.status).toBe("Approved");
  const skills = await cds.db.run(cds.ql.SELECT.from("toolsathi.ApplicantSkill").where({ userId: "APPLICANT-1" }));
  expect(skills.every((skill) => skill.verified === true)).toBe(true);

  // Quality and Administrator cannot be granted through operational onboarding.
  expect((await json("post", `/v2/onboarding/${application.applicationId}/review`, { decision: "Approve", role: "Administrator" }, "Administrator", "ADMIN-1")).status).toBe(409);
});

test("incident photos are protected, attached as evidence and never auto-diagnosed", async () => {
  const incident = await json("post", "/incidents", {
    toolId: "TOOL-A", reporterId: "PHOTO-WORKER", language: "en", rawText: "Synthetic photo evidence test", category: "OBSERVATION",
  }, "Worker", "PHOTO-WORKER");
  expect(incident.status).toBe(201);
  const incidentId = incident.body.incident.incidentId;
  const photo = await api("post", `/v2/incidents/${encodeURIComponent(incidentId)}/photos`, "Worker", "PHOTO-WORKER")
    .set("content-type", "image/png").set("x-file-name", "fault.png").send(png);
  expect(photo.status).toBe(201);
  const evidence = await cds.db.run(cds.ql.SELECT.from("toolsathi.IncidentEvidence").where({ incidentId }));
  const attachment = evidence.find((row) => row.type === "PHOTO");
  expect(attachment).toBeTruthy();
  const reference = JSON.parse(attachment.reference);
  expect(reference).toMatchObject({ fileName: "fault.png", mimeType: "image/png" });
  expect(reference.diagnosis).toBeUndefined();

  const audit = await cds.db.run(cds.ql.SELECT.from("toolsathi.AuditLog").where({ incidentId, action: "PHOTO_ATTACHED" }));
  expect(audit).toHaveLength(1);
  expect((await api("get", `/v2/documents/${photo.body.document.documentId}/download`, "Worker", "UNRELATED-WORKER")).status).toBe(403);
});
