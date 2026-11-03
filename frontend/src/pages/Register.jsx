import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { homeFor } from "../components/AppShell";
import Logo from "../components/Logo";
import { Card, CardHead, Chip, Empty, ErrorNote, Field, Icon, Loading } from "../components/ui";
import "../styles/v23.css";

const STEPS = ["Personal", "Role", "Skills & documents", "Review", "Status"];
const ROLE_CARDS = [
  { role: "Worker", icon: "mic", text: "Report faults for your work center, confirm your own evidence and follow progress." },
  { role: "Manager", icon: "dashboard", text: "Review reports, assign qualified technicians and decide repair and exposure actions." },
  { role: "Technician", icon: "wrench", text: "Accept assigned work, reserve parts, record findings and submit completion evidence." },
  { role: "Verifier", icon: "verify", text: "Independently verify repairs and make authorised return-to-service decisions." },
];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const DOC_TYPES = [
  { value: "certificate", label: "Certificate (PDF, PNG, JPG)" },
  { value: "resume", label: "Résumé / qualification document (PDF)" },
  { value: "identity", label: "Identity document (PDF, PNG, JPG)" },
];
const empty = {
  fullName: "", email: "", phone: "", language: "en", department: "", workCenter: "", shift: "Morning",
  employeeId: "", team: "", requestedRole: "Worker", notes: "",
};
const maxBytes = 5 * 1024 * 1024;
const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export default function Register() {
  const { client, demoUserId, apiConfig, demoIdentities, currentRole } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", application: null, skills: [], documents: [], blockers: [] });
  const [form, setForm] = useState(empty);
  const [skill, setSkill] = useState({ category: "", name: "", level: "Intermediate", years: 1, specialization: "", workCenter: "", certification: "", issuer: "", validUntil: "", notes: "" });
  const [docType, setDocType] = useState("certificate");
  const [upload, setUpload] = useState({ busy: false, error: "", active: false });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await client.request("/v2/onboarding/me");
      const application = data.application || null;
      setState({ loading: false, error: "", application, skills: data.skills || [], documents: data.documents || [], blockers: data.blockers || [] });
      if (application) {
        setForm({
          fullName: application.fullName || "", email: application.email || "", phone: application.phone || "",
          language: application.language || "en", department: application.department || "", workCenter: application.workCenter || "",
          shift: application.shift || "Morning", employeeId: application.employeeId || "", team: application.team || "",
          requestedRole: application.requestedRole || "Worker", notes: application.notes || "",
        });
        if (application.status !== "Draft") setStep(4);
      }
    } catch (cause) {
      setState({ loading: false, error: cause.message, application: null, skills: [], documents: [], blockers: [] });
    }
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const identity = demoIdentities.find((item) => item.userId === demoUserId);

  async function saveDetails(event, nextStep = 1) {
    if (event) event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      await client.request("/v2/onboarding/me", { method: "PUT", body: form });
      setMessage("Details saved.");
      await load();
      setStep(nextStep);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  async function addSkill(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      await client.request("/v2/onboarding/me/skills", { method: "POST", body: { ...skill, years: Number(skill.years) || 0, source: "manual" } });
      setSkill({ category: "", name: "", level: "Intermediate", years: 1, specialization: "", workCenter: "", certification: "", issuer: "", validUntil: "", notes: "" });
      setMessage("Skill added. An administrator verifies controlled qualifications.");
      await load();
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  async function removeSkill(id) {
    try { await client.request(`/v2/onboarding/me/skills/${encodeURIComponent(id)}`, { method: "DELETE" }); await load(); }
    catch (cause) { setError(cause.message); }
  }

  async function uploadFile(file) {
    if (!file) return;
    if (!allowed.includes(file.type)) { setUpload({ busy: false, error: "Use PDF, PNG, JPG or WEBP files.", active: false }); return; }
    if (file.size > maxBytes) { setUpload({ busy: false, error: "Files must be 5 MB or smaller.", active: false }); return; }
    setUpload({ busy: true, error: "", active: false });
    try {
      await client.request("/v2/onboarding/me/documents", {
        method: "POST", body: file,
        headers: { "x-document-type": docType, "x-file-name": file.name },
        requestTimeoutMs: 45000,
      });
      setMessage("Document uploaded for review.");
      await load();
    } catch (cause) { setUpload({ busy: false, error: cause.message, active: false }); return; }
    setUpload({ busy: false, error: "", active: false });
    if (fileInput.current) fileInput.current.value = "";
  }

  async function removeDocument(id) {
    try { await client.request(`/v2/onboarding/me/documents/${encodeURIComponent(id)}`, { method: "DELETE" }); await load(); }
    catch (cause) { setError(cause.message); }
  }

  async function submit() {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await client.request("/v2/onboarding/me/submit", { method: "POST", body: {} });
      setMessage(result.message || "Submitted for review.");
      await load();
      setStep(4);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  const status = state.application?.status || "Draft";
  const locked = status !== "Draft";
  const applicationRef = state.application?.applicationId;

  return (
    <div className="v23-root">
      <div className="v23-shell" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
        <div>
          <header className="v23-topbar">
            <Link to="/" className="v23-brand" style={{ padding: 0, textDecoration: "none" }}>
              <span className="v23-brand-mark"><Logo size={22} variant="mark" /></span>
              <span><strong>ToolSathi</strong><small>Onboarding</small></span>
            </Link>
            <div className="v23-topbar-spacer" />
            <Link to="/login" className="v23-btn sm ghost">Sign in</Link>
            <Link to={homeFor(currentRole)} className="v23-btn sm">Dashboard</Link>
          </header>
          <main className="v23-main">
            <div className="v23-page" style={{ maxWidth: 1040 }}>
              <div className="v23-page-head">
                <div>
                  <h1>Join the manufacturing control room</h1>
                  <p>Request access for your operational role. Privileged roles require qualification review and an administrator decision — selecting a role here never grants permissions.</p>
                </div>
                <Chip variant="info">
                  {apiConfig.demoMode ? `Simulated identity · ${identity?.displayName || demoUserId}` : "Verified organisational identity"}
                </Chip>
              </div>

              <div className="v23-steps-bar" aria-label="Registration progress">
                {STEPS.map((label, index) => (
                  <span key={label} data-state={index === step ? "active" : index < step ? "done" : "todo"}>
                    {index + 1}. {label}
                  </span>
                ))}
              </div>

              {message && <p className="v23-chip good" role="status" style={{ alignSelf: "flex-start", padding: "8px 14px" }}>{message}</p>}
              {error && <ErrorNote message={error} />}
              {state.loading && <Loading rows={2} />}
              {state.error && <ErrorNote message={state.error} retry={load} />}

              {!state.loading && !state.error && step === 0 && (
                <Card>
                  <CardHead title="Personal information" subtitle="Used for your application record and contact only." />
                  <form className="v23-form" onSubmit={saveDetails}>
                    <div className="cols">
                      <Field label="Full name"><input required value={form.fullName} onChange={set("fullName")} placeholder="As printed on your ID" /></Field>
                      <Field label="Work email"><input required type="email" value={form.email} onChange={set("email")} placeholder="name@company.com" /></Field>
                      <Field label="Phone (optional)"><input value={form.phone} onChange={set("phone")} placeholder="+91 …" /></Field>
                      <Field label="Employee ID (optional)"><input value={form.employeeId} onChange={set("employeeId")} /></Field>
                      <Field label="Preferred language">
                        <select value={form.language} onChange={set("language")}>
                          <option value="en">English</option><option value="kn">ಕನ್ನಡ (Kannada)</option><option value="hi">हिन्दी (Hindi)</option>
                        </select>
                      </Field>
                      <Field label="Department"><input required value={form.department} onChange={set("department")} placeholder="Maintenance, Production…" /></Field>
                      <Field label="Work center"><input required value={form.workCenter} onChange={set("workCenter")} placeholder="WC-A" /></Field>
                      <Field label="Shift / team">
                        <select value={form.shift} onChange={set("shift")}>
                          {["Morning", "Afternoon", "Night", "General"].map((shift) => <option key={shift}>{shift}</option>)}
                        </select>
                      </Field>
                    </div>
                    <Field label="Notes for the reviewer (optional)"><textarea rows={2} value={form.notes} onChange={set("notes")} /></Field>
                    <div className="v23-actions">
                      <button className="v23-btn primary" disabled={busy || locked}>Save and continue <Icon name="arrowRight" size={16} /></button>
                      {locked && <span className="v23-faint">Submitted applications are locked until reviewed.</span>}
                    </div>
                  </form>
                </Card>
              )}

              {!state.loading && step === 1 && (
                <Card>
                  <CardHead title="Requested role" subtitle="Your request is reviewed; the granted role is recorded by an administrator." />
                  <div className="v23-role-cards">
                    {ROLE_CARDS.map((card) => (
                      <button key={card.role} type="button" className="v23-role-card" aria-pressed={form.requestedRole === card.role}
                        disabled={locked} onClick={() => setForm({ ...form, requestedRole: card.role })}>
                        <span className="v23-icon-tile" style={{ width: 36, height: 36 }}><Icon name={card.icon} size={18} /></span>
                        <strong>{card.role}</strong>
                        <span>{card.text}</span>
                      </button>
                    ))}
                  </div>
                  <p className="v23-faint" style={{ marginTop: 14 }}>
                    Quality and Administrator capabilities are granted only through the existing identity-provider and invitation process.
                  </p>
                  <div className="v23-actions" style={{ marginTop: 18 }}>
                    <button type="button" className="v23-btn ghost" onClick={() => setStep(0)}>Back</button>
                    <button type="button" className="v23-btn primary" disabled={busy || locked} onClick={() => saveDetails(null, 2)}>Save and continue <Icon name="arrowRight" size={16} /></button>
                  </div>
                </Card>
              )}

              {!state.loading && step === 2 && (
                <div className="v23-grid split">
                  <Card>
                    <CardHead title="Skills and qualifications" subtitle="Declare what you can do. Controlled qualifications are verified by a reviewer." />
                    {state.skills.length === 0 ? (
                      <Empty title="No skills declared yet">Add at least one skill or upload a supporting certificate to submit your application.</Empty>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {state.skills.map((item) => (
                          <span className="v23-skill-tag" key={item.skillId}>
                            {item.name} · {item.level}
                            <Chip variant={item.verified ? "good" : "warn"}>{item.verified ? "Verified" : "Unverified"}</Chip>
                            {!locked && <button type="button" aria-label={`Remove ${item.name}`} onClick={() => removeSkill(item.skillId)}
                              style={{ background: "none", border: 0, color: "inherit", cursor: "pointer", padding: 0 }}><Icon name="close" size={13} /></button>}
                          </span>
                        ))}
                      </div>
                    )}
                    <form className="v23-form" style={{ marginTop: 18 }} onSubmit={addSkill}>
                      <div className="cols">
                        <Field label="Skill name"><input required value={skill.name} onChange={(e) => setSkill({ ...skill, name: e.target.value })} placeholder="Torque calibration" /></Field>
                        <Field label="Category"><input required value={skill.category} onChange={(e) => setSkill({ ...skill, category: e.target.value })} placeholder="Mechanical" /></Field>
                        <Field label="Experience level">
                          <select value={skill.level} onChange={(e) => setSkill({ ...skill, level: e.target.value })}>{LEVELS.map((level) => <option key={level}>{level}</option>)}</select>
                        </Field>
                        <Field label="Years of experience"><input type="number" min="0" max="60" value={skill.years} onChange={(e) => setSkill({ ...skill, years: e.target.value })} /></Field>
                        <Field label="Equipment specialization"><input value={skill.specialization} onChange={(e) => setSkill({ ...skill, specialization: e.target.value })} placeholder="TORQUE" /></Field>
                        <Field label="Work center"><input value={skill.workCenter} onChange={(e) => setSkill({ ...skill, workCenter: e.target.value })} placeholder="WC-A" /></Field>
                        <Field label="Certification name"><input value={skill.certification} onChange={(e) => setSkill({ ...skill, certification: e.target.value })} /></Field>
                        <Field label="Issuer"><input value={skill.issuer} onChange={(e) => setSkill({ ...skill, issuer: e.target.value })} /></Field>
                        <Field label="Valid until"><input type="date" value={skill.validUntil} onChange={(e) => setSkill({ ...skill, validUntil: e.target.value })} /></Field>
                      </div>
                      <Field label="Supporting notes"><textarea rows={2} value={skill.notes} onChange={(e) => setSkill({ ...skill, notes: e.target.value })} /></Field>
                      <div className="v23-actions">
                        <button className="v23-btn primary" disabled={busy || locked}>Add skill</button>
                        <span className="v23-faint">Declarations are suggestions, not certified qualifications.</span>
                      </div>
                    </form>
                  </Card>

                  <div style={{ display: "grid", gap: 16 }}>
                    <Card>
                      <CardHead title="Upload documents" subtitle="Stored privately; only you and reviewers can open them." />
                      <Field label="Document type">
                        <select value={docType} onChange={(event) => setDocType(event.target.value)}>
                          {DOC_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                        </select>
                      </Field>
                      <div
                        className="v23-dropzone" data-active={upload.active} style={{ marginTop: 12 }}
                        onDragOver={(event) => { event.preventDefault(); setUpload((u) => ({ ...u, active: true })); }}
                        onDragLeave={() => setUpload((u) => ({ ...u, active: false }))}
                        onDrop={(event) => { event.preventDefault(); uploadFile(event.dataTransfer.files?.[0]); }}
                        onClick={() => fileInput.current?.click()}
                        role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInput.current?.click(); }}
                      >
                        <Icon name="upload" size={22} />
                        <p style={{ margin: "8px 0 2px", color: "#eaf6ff", fontWeight: 600 }}>{upload.busy ? "Uploading…" : "Drag a file here or click to choose"}</p>
                        <small>PDF, PNG, JPG or WEBP · 5 MB maximum · scanned file contents are validated</small>
                        <input ref={fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" disabled={upload.busy || locked}
                          onChange={(event) => uploadFile(event.target.files?.[0])} aria-label="Choose a document to upload" />
                      </div>
                      {upload.error && <p className="v23-error" role="alert" style={{ marginTop: 10 }}>{upload.error}</p>}
                      <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                        {state.documents.length === 0 && <p className="v23-faint">No documents uploaded.</p>}
                        {state.documents.map((doc) => (
                          <div className="v23-file-row" key={doc.documentId}>
                            <Icon name="file" size={16} />
                            <span className="grow">{doc.fileName} <span className="v23-faint">· {doc.docType} · {(doc.size / 1024).toFixed(0)} KB</span></span>
                            <Chip>{doc.status}</Chip>
                            <a className="v23-btn sm ghost" href={`/api/v2/documents/${encodeURIComponent(doc.documentId)}/download`} target="_blank" rel="noreferrer">View</a>
                            {!locked && <button type="button" className="v23-btn sm danger" aria-label={`Delete ${doc.fileName}`} onClick={() => removeDocument(doc.documentId)}><Icon name="trash" size={14} /></button>}
                          </div>
                        ))}
                      </div>
                      <p className="v23-faint" style={{ marginTop: 12 }}>
                        Automated extraction is not enabled in this deployment: only text-based AI providers are configured, so no certificate is parsed or trusted automatically.
                      </p>
                    </Card>
                    <Card>
                      <h3>Why this matters</h3>
                      <p className="v23-muted" style={{ margin: 0, fontSize: 14 }}>
                        Uploaded files never grant a qualification. Reviewers verify certificates before recording technician or verifier authority.
                        Safety authorizations are never inferred from a document or photograph.
                      </p>
                    </Card>
                  </div>
                </div>
              )}

              {!state.loading && step === 2 && (
                <div className="v23-actions" style={{ justifyContent: "space-between" }}>
                  <button type="button" className="v23-btn ghost" onClick={() => setStep(1)}>Back</button>
                  <button type="button" className="v23-btn primary" onClick={() => setStep(3)}>Review application <Icon name="arrowRight" size={16} /></button>
                </div>
              )}

              {!state.loading && step === 3 && (
                <Card>
                  <CardHead title="Review and submit" subtitle="Check the details recorded for review." actions={<button type="button" className="v23-btn sm ghost" onClick={() => setStep(0)}>Edit</button>} />
                  <div className="v23-grid cols-2" style={{ gap: 12 }}>
                    {[["Name", form.fullName], ["Email", form.email], ["Phone", form.phone || "—"], ["Language", form.language.toUpperCase()],
                      ["Department", form.department], ["Work center", form.workCenter], ["Shift", form.shift], ["Employee ID", form.employeeId || "—"],
                      ["Requested role", form.requestedRole], ["Identity", apiConfig.demoMode ? demoUserId : "verified account"]].map(([label, value]) => (
                      <div key={label}><span className="v23-faint">{label}</span><p style={{ margin: 0, color: "#fff" }}>{value}</p></div>
                    ))}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <span className="v23-faint">Skills ({state.skills.length})</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                      {state.skills.map((item) => <span className="v23-skill-tag" key={item.skillId}>{item.name} · {item.level}</span>)}
                    </div>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <span className="v23-faint">Documents ({state.documents.length})</span>
                    <div className="v23-actions" style={{ marginTop: 6 }}>
                      {state.documents.map((doc) => <Chip key={doc.documentId} variant="neutral">{doc.fileName}</Chip>)}
                    </div>
                  </div>
                  {state.blockers.length > 0 && (
                    <p className="v23-error" role="alert" style={{ marginTop: 16 }}>Still required: {state.blockers.join(", ")}.</p>
                  )}
                  <div className="v23-actions" style={{ marginTop: 18 }}>
                    <button type="button" className="v23-btn ghost" onClick={() => setStep(2)}>Back</button>
                    <button type="button" className="v23-btn primary" onClick={submit} disabled={busy || locked || state.blockers.length > 0}>
                      Submit for review
                    </button>
                  </div>
                </Card>
              )}

              {!state.loading && step === 4 && (
                <Card>
                  <CardHead title="Application status" subtitle={applicationRef ? `Reference ${applicationRef}` : "No application on file"} />
                  {!state.application ? (
                    <Empty title="No application yet">Start with your personal details to request access.</Empty>
                  ) : (
                    <>
                      <div className="v23-actions" style={{ marginBottom: 14 }}>
                        <Chip>{status}</Chip>
                        {state.application.reviewedAt && <span className="v23-faint">Reviewed {new Date(state.application.reviewedAt).toLocaleString()}</span>}
                      </div>
                      <ol className="v23-timeline" style={{ marginBottom: 16 }}>
                        <li><strong>Application started</strong><p>{new Date(state.application.createdAt).toLocaleString()}</p></li>
                        {state.application.updatedAt && <li><strong>Last updated</strong><p>{new Date(state.application.updatedAt).toLocaleString()}</p></li>}
                        {["Submitted", "Under review"].includes(status) && <li><strong>Awaiting qualification review</strong><p>An administrator checks skills, documents and the requested role.</p></li>}
                        {status === "Approved" && <li><strong>Approved</strong><p>Your profile is active with the role recorded by the reviewer.</p></li>}
                        {status === "Rejected" && <li><strong>Rejected</strong><p>{state.application.reviewNotes || "See the reviewer notes."}</p></li>}
                      </ol>
                      {state.application.reviewNotes && status !== "Rejected" && <p className="v23-faint">Reviewer notes: {state.application.reviewNotes}</p>}
                      <div className="v23-actions">
                        {status === "Approved" && <button type="button" className="v23-btn primary" onClick={() => navigate(homeFor(identity?.role || currentRole))}>Open my dashboard</button>}
                        {status === "Rejected" && <button type="button" className="v23-btn" onClick={() => setStep(0)}>Update and resubmit</button>}
                        <button type="button" className="v23-btn ghost" onClick={load}>Refresh status</button>
                      </div>
                    </>
                  )}
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
