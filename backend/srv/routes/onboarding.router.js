// V2.3 onboarding: role applications, declared skills and protected document uploads.
// A requested role is recorded only; an Administrator review creates the profile.
const router = require("express").Router();
const express = require("express");
const { cds, entity, transaction } = require("../lib/db");
const { wrap, fail, label } = require("../lib/http");
const { requireRole } = require("../lib/auth");
const v = require("../lib/v2");
const ids = require("../lib/ids");
const uploads = require("../lib/uploads");

const now = () => new Date().toISOString();
const run = (fn) =>
  wrap(async (req, res) =>
    res.json(label(await transaction(async (tx) => fn(req, tx)))),
  );
const text = (value, name, max = 120) => {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail(400, "INVALID_INPUT", `${name} is required (max ${max} characters)`);
  return value.trim();
};
const optional = (value, name, max = 120) => {
  if (value === undefined || value === null || value === "") return null;
  return text(value, name, max);
};
const ROLES = ["Worker", "Manager", "Technician", "Verifier"];
const STATUS = { Draft: "Draft", Submitted: "Submitted", UnderReview: "Under review", Approved: "Approved", Rejected: "Rejected" };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function application(tx, userId) {
  return v.one(tx, "OnboardingApplication", { userId });
}
async function notifyAdmins(tx, message, applicationId) {
  for (const profile of await tx.run(cds.ql.SELECT.from(entity("UserProfile")).where({ role: "Administrator", status: "Active" })))
    await v.notify(tx, profile.userId, null, message);
  await v.event(tx, { id: "SYSTEM", role: "Administrator" }, "ONBOARDING_REVIEW_REQUESTED", message, { applicationId });
}

router.get("/v2/onboarding/me", requireRole(), run(async (req, tx) => {
  const row = await application(tx, req.user.id);
  if (!row) return { application: null, skills: [], documents: [], blockers: [] };
  const [skills, documents] = await Promise.all([
    tx.run(cds.ql.SELECT.from(entity("ApplicantSkill")).where({ applicationId: row.applicationId }).orderBy("name")),
    tx.run(cds.ql.SELECT.from(entity("UploadedDocument")).where({ applicationId: row.applicationId }).orderBy("createdAt")),
  ]);
  const blockers = [];
  if (!row.fullName) blockers.push("Full name");
  if (!emailPattern.test(row.email || "")) blockers.push("Work email");
  if (!row.department) blockers.push("Department");
  if (!row.workCenter) blockers.push("Work center");
  if (!row.shift) blockers.push("Shift");
  if (!ROLES.includes(row.requestedRole)) blockers.push("Requested role");
  if (!skills.length) blockers.push("At least one skill or qualification");
  return { application: row, skills, documents: documents.map(({ storageName, ...doc }) => doc), blockers };
}));

router.put("/v2/onboarding/me", requireRole(), run(async (req, tx) => {
  v.keys(req.body, ["fullName", "email", "phone", "language", "department", "workCenter", "shift", "employeeId", "team", "requestedRole", "notes"]);
  const existing = await application(tx, req.user.id);
  if (existing && ["Approved"].includes(existing.status))
    fail(409, "APPLICATION_LOCKED", "Your onboarding application is already approved");
  if (existing && ["Submitted", "Under review"].includes(existing.status))
    fail(409, "APPLICATION_LOCKED", "Withdraw or wait for the review before editing a submitted application");
  if (!["en", "kn", "hi"].includes(req.body.language)) fail(400, "INVALID_INPUT", "Choose English, Kannada or Hindi");
  if (!ROLES.includes(req.body.requestedRole)) fail(400, "INVALID_INPUT", "Choose Worker, Manager, Technician or Verifier");
  if (!emailPattern.test(String(req.body.email || ""))) fail(400, "INVALID_INPUT", "Enter a valid work email address");
  const record = {
    applicationId: existing?.applicationId || ids.uuid("APP"),
    userId: req.user.id,
    status: existing?.status || STATUS.Draft,
    requestedRole: req.body.requestedRole,
    fullName: text(req.body.fullName, "fullName"),
    email: text(req.body.email, "email", 200),
    phone: optional(req.body.phone, "phone", 40),
    language: req.body.language,
    department: text(req.body.department, "department"),
    workCenter: text(req.body.workCenter, "workCenter"),
    shift: text(req.body.shift, "shift"),
    employeeId: optional(req.body.employeeId, "employeeId", 60),
    team: optional(req.body.team, "team"),
    notes: optional(req.body.notes, "notes", 2000),
    createdAt: existing?.createdAt || now(),
    updatedAt: now(),
  };
  if (existing) await tx.run(cds.ql.UPDATE(entity("OnboardingApplication")).set(record).where({ applicationId: record.applicationId }));
  else await tx.run(cds.ql.INSERT.into(entity("OnboardingApplication")).entries({ ...record, reviewNotes: null, reviewedBy: null, reviewedAt: null }));
  await v.event(tx, req.user, existing ? "ONBOARDING_UPDATED" : "ONBOARDING_STARTED", "Applicant saved onboarding details", { applicationId: record.applicationId, requestedRole: record.requestedRole });
  return { application: { ...record, reviewNotes: existing?.reviewNotes || null } };
}));

router.post("/v2/onboarding/me/submit", requireRole(), run(async (req, tx) => {
  const row = await application(tx, req.user.id);
  if (!row) fail(404, "APPLICATION_NOT_FOUND", "Start your onboarding application first");
  if (row.status === "Approved") fail(409, "APPLICATION_LOCKED", "Your application is already approved");
  const skills = await tx.run(cds.ql.SELECT.from(entity("ApplicantSkill")).where({ applicationId: row.applicationId }));
  const missing = [];
  if (!row.fullName) missing.push("full name");
  if (!emailPattern.test(row.email || "")) missing.push("valid email");
  if (!row.department) missing.push("department");
  if (!row.workCenter) missing.push("work center");
  if (!row.shift) missing.push("shift");
  if (!ROLES.includes(row.requestedRole)) missing.push("requested role");
  if (!skills.length) missing.push("at least one skill or qualification");
  if (missing.length) fail(400, "APPLICATION_INCOMPLETE", "Complete the application: " + missing.join(", "));
  const status = STATUS.Submitted;
  await tx.run(cds.ql.UPDATE(entity("OnboardingApplication")).set({ status, updatedAt: now(), reviewNotes: null }).where({ applicationId: row.applicationId }));
  await v.event(tx, req.user, "ONBOARDING_SUBMITTED", "Applicant requested qualification and role review", { applicationId: row.applicationId, requestedRole: row.requestedRole });
  await notifyAdmins(tx, `Onboarding application from ${row.fullName || req.user.id} requires review`, row.applicationId);
  return { status, message: "Submitted for qualification and role review" };
}));

router.post("/v2/onboarding/me/skills", requireRole(), run(async (req, tx) => {
  v.keys(req.body, ["category", "name", "level", "years", "specialization", "workCenter", "certification", "issuer", "validUntil", "notes", "source"]);
  const row = await application(tx, req.user.id);
  if (!row) fail(404, "APPLICATION_NOT_FOUND", "Save your personal details first");
  if (row.status !== STATUS.Draft) fail(409, "APPLICATION_LOCKED", "Skills can only change while the application is a draft");
  if (!["Beginner", "Intermediate", "Advanced", "Expert"].includes(req.body.level)) fail(400, "INVALID_INPUT", "Choose an experience level");
  const years = Number(req.body.years ?? 0);
  if (!Number.isInteger(years) || years < 0 || years > 60) fail(400, "INVALID_INPUT", "Years of experience must be 0–60");
  if (req.body.validUntil && !Number.isFinite(Date.parse(req.body.validUntil))) fail(400, "INVALID_INPUT", "Enter a valid certificate validity date");
  if (req.body.source && !["manual", "certificate"].includes(req.body.source)) fail(400, "INVALID_INPUT", "Unsupported skill source");
  const skill = {
    skillId: ids.uuid("SKL"), applicationId: row.applicationId, userId: req.user.id,
    category: text(req.body.category, "category"), name: text(req.body.name, "name"),
    level: req.body.level, years,
    specialization: optional(req.body.specialization, "specialization"),
    workCenter: optional(req.body.workCenter, "workCenter"),
    certification: optional(req.body.certification, "certification"),
    issuer: optional(req.body.issuer, "issuer"),
    validUntil: req.body.validUntil ? new Date(req.body.validUntil).toISOString().slice(0, 10) : null,
    notes: optional(req.body.notes, "notes", 1000),
    source: req.body.source || "manual", verified: false, verifiedBy: null, verifiedAt: null,
  };
  await tx.run(cds.ql.INSERT.into(entity("ApplicantSkill")).entries(skill));
  await v.event(tx, req.user, "SKILL_DECLARED", "Applicant declared a skill requiring review", { skill: skill.name, applicationId: row.applicationId });
  return { skill };
}));

router.delete("/v2/onboarding/me/skills/:id", requireRole(), run(async (req, tx) => {
  const row = await application(tx, req.user.id);
  if (!row) fail(404, "APPLICATION_NOT_FOUND", "Onboarding application not found");
  const skill = await v.one(tx, "ApplicantSkill", { skillId: req.params.id }, true);
  if (!skill || skill.applicationId !== row.applicationId) fail(404, "SKILL_NOT_FOUND", "Skill not found");
  await tx.run(cds.ql.DELETE.from(entity("ApplicantSkill")).where({ skillId: skill.skillId }));
  await v.event(tx, req.user, "SKILL_REMOVED", "Applicant removed a declared skill", { skill: skill.name });
  return { removed: true };
}));

// Raw upload: the browser sends the file bytes with its real MIME type.
router.post("/v2/onboarding/me/documents", requireRole(), express.raw({ type: "*/*", limit: "6mb" }), wrap(async (req, res) => {
  const documentType = String(req.get("x-document-type") || "");
  const fileName = String(req.get("x-file-name") || "document");
  const mimeType = String(req.get("content-type") || "application/octet-stream");
  const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const meta = uploads.store(buffer, mimeType, documentType, fileName);
  const result = await transaction(async (tx) => {
    const row = await application(tx, req.user.id);
    if (!row) fail(404, "APPLICATION_NOT_FOUND", "Save your personal details before uploading documents");
    if (row.status === "Approved") fail(409, "APPLICATION_LOCKED", "Approved applications cannot receive new documents");
    const document = {
      documentId: ids.uuid("DOC"), userId: req.user.id, applicationId: row.applicationId, incidentId: null,
      docType: documentType, fileName: meta.fileName, mimeType: meta.mimeType, size: meta.size,
      storageName: meta.storageName, checksum: meta.checksum,
      description: String(req.get("x-document-description") || "").slice(0, 500) || null,
      status: "Uploaded", reviewNote: null, createdAt: now(),
    };
    await tx.run(cds.ql.INSERT.into(entity("UploadedDocument")).entries(document));
    await v.event(tx, req.user, "DOCUMENT_UPLOADED", "Applicant uploaded a qualification document", { documentId: document.documentId, docType: documentType, checksum: meta.checksum });
    const { storageName, ...safe } = document;
    return safe;
  }).catch((error) => { uploads.remove(meta.storageName); throw error; });
  res.status(201).json(label({ document: result }));
}));

router.delete("/v2/onboarding/me/documents/:id", requireRole(), run(async (req, tx) => {
  const document = await v.one(tx, "UploadedDocument", { documentId: req.params.id }, true);
  if (!document || document.userId !== req.user.id) fail(404, "DOCUMENT_NOT_FOUND", "Document not found");
  if (document.status === "Reviewed") fail(409, "DOCUMENT_LOCKED", "A reviewed document cannot be deleted");
  await tx.run(cds.ql.DELETE.from(entity("UploadedDocument")).where({ documentId: document.documentId }));
  await v.event(tx, req.user, "DOCUMENT_DELETED", "Applicant removed an uploaded document", { documentId: document.documentId });
  uploads.remove(document.storageName);
  return { removed: true };
}));

router.get("/v2/documents/:id/download", requireRole(), wrap(async (req, res) => {
  const document = await transaction((tx) => v.one(tx, "UploadedDocument", { documentId: req.params.id }));
  if (!document) fail(404, "DOCUMENT_NOT_FOUND", "Document not found");
  const role = req.user.role;
  let allowed = document.userId === req.user.id || ["Administrator", "Quality"].includes(role);
  if (!allowed && document.incidentId && ["Manager", "Verifier"].includes(role)) {
    try { await v.access(cds.db, req.user, document.incidentId); allowed = true; } catch { allowed = false; }
  }
  if (!allowed) fail(403, "FORBIDDEN", "This document is not accessible");
  const bytes = uploads.read(document.storageName);
  res.setHeader("Content-Type", document.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${document.fileName.replace(/["\\\r\n]/g, "_")}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  res.send(bytes);
}));

router.post("/v2/incidents/:id/photos", requireRole("Worker", "Manager", "Technician"), express.raw({ type: "*/*", limit: "6mb" }), wrap(async (req, res) => {
  const incidentId = req.params.id;
  const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const meta = uploads.store(buffer, String(req.get("content-type") || "application/octet-stream"), "incident-photo", String(req.get("x-file-name") || "photo"));
  const result = await transaction(async (tx) => {
    const incident = await v.access(tx, req.user, incidentId);
    const document = {
      documentId: ids.uuid("DOC"), userId: req.user.id, applicationId: null, incidentId: incident.incidentId,
      docType: "incident-photo", fileName: meta.fileName, mimeType: meta.mimeType, size: meta.size,
      storageName: meta.storageName, checksum: meta.checksum,
      description: String(req.get("x-document-description") || "").slice(0, 500) || "Worker photo attachment",
      status: "Uploaded", reviewNote: null, createdAt: now(),
    };
    await tx.run(cds.ql.INSERT.into(entity("UploadedDocument")).entries(document));
    await tx.run(cds.ql.INSERT.into(entity("IncidentEvidence")).entries({
      evidenceId: ids.uuid("EVID"), incidentId: incident.incidentId, type: "PHOTO",
      reference: JSON.stringify({ documentId: document.documentId, fileName: document.fileName, mimeType: document.mimeType, size: document.size, description: document.description }),
      sourceTime: now(),
    }));
    await v.event(tx, req.user, "PHOTO_ATTACHED", "Photo evidence attached without automated diagnosis", { documentId: document.documentId }, incident);
    const { storageName, ...safe } = document;
    return safe;
  }).catch((error) => { uploads.remove(meta.storageName); throw error; });
  res.status(201).json(label({ document: result }));
}));

router.get("/v2/onboarding", requireRole("Administrator"), run(async (req, tx) => {
  const rows = await tx.run(cds.ql.SELECT.from(entity("OnboardingApplication")).orderBy("updatedAt desc"));
  const skills = await tx.run(cds.ql.SELECT.from(entity("ApplicantSkill")));
  const documents = await tx.run(cds.ql.SELECT.from(entity("UploadedDocument")));
  return {
    applications: rows.map((row) => ({
      ...row,
      skills: skills.filter((skill) => skill.applicationId === row.applicationId),
      documents: documents.filter((doc) => doc.applicationId === row.applicationId).map(({ storageName, ...doc }) => doc),
    })),
  };
}));

router.post("/v2/onboarding/:id/review", requireRole("Administrator"), run(async (req, tx) => {
  v.keys(req.body, ["decision", "role", "notes", "verifySkills"]);
  const row = await v.one(tx, "OnboardingApplication", { applicationId: req.params.id }, true);
  if (!row) fail(404, "APPLICATION_NOT_FOUND", "Onboarding application not found");
  if (!["Approve", "Reject"].includes(req.body.decision)) fail(400, "INVALID_INPUT", "Choose Approve or Reject");
  if (row.status === "Approved") fail(409, "APPLICATION_LOCKED", "This application is already approved");
  const notes = optional(req.body.notes, "notes", 2000);
  if (req.body.decision === "Reject" && !notes) fail(400, "REASON_REQUIRED", "Record the reason for rejection");
  if (req.body.decision === "Reject") {
    await tx.run(cds.ql.UPDATE(entity("OnboardingApplication")).set({ status: STATUS.Rejected, reviewNotes: notes, reviewedBy: req.user.id, reviewedAt: now(), updatedAt: now() }).where({ applicationId: row.applicationId }));
    await v.event(tx, req.user, "ONBOARDING_REJECTED", notes, { applicationId: row.applicationId });
    await v.notify(tx, row.userId, null, `Onboarding application rejected: ${notes}`);
    return { status: STATUS.Rejected };
  }
  const role = req.body.role || row.requestedRole;
  if (!ROLES.includes(role)) fail(400, "INVALID_ROLE", "Approve an operational role; Quality and Administrator remain identity-provider controlled");
  if (row.userId === req.user.id) fail(403, "SELF_APPROVAL", "An independent Administrator must review this application");
  if (await v.one(tx, "UserProfile", { userId: row.userId }, true)) fail(409, "PROFILE_EXISTS", "A profile already exists for this identity");
  const profile = {
    userId: row.userId, displayName: row.fullName, role, language: row.language,
    workCenter: row.workCenter, team: row.team || row.department, status: "Active", createdAt: now(),
  };
  await tx.run(cds.ql.INSERT.into(entity("UserProfile")).entries(profile));
  await tx.run(cds.ql.UPSERT.into(entity("UserProfileDetail")).entries({ userId: row.userId, shift: row.shift, updatedAt: now() }));
  if (req.body.verifySkills === true)
    for (const skill of await tx.run(cds.ql.SELECT.from(entity("ApplicantSkill")).where({ applicationId: row.applicationId })))
      await tx.run(cds.ql.UPDATE(entity("ApplicantSkill")).set({ verified: true, verifiedBy: req.user.id, verifiedAt: now() }).where({ skillId: skill.skillId }));
  await tx.run(cds.ql.UPDATE(entity("OnboardingApplication")).set({ status: STATUS.Approved, reviewNotes: notes, reviewedBy: req.user.id, reviewedAt: now(), updatedAt: now() }).where({ applicationId: row.applicationId }));
  await v.event(tx, req.user, "ONBOARDING_APPROVED", notes || "Verified applicant onboarding", { applicationId: row.applicationId, grantedRole: role });
  await v.notify(tx, row.userId, null, `Onboarding approved as ${role}. Sign in again to load your dashboard.`);
  return { status: STATUS.Approved, profile };
}));

module.exports = { mount: "/api", router, owner: "platform" };
