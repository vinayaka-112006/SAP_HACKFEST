import React, { useState } from "react";
import { useStore } from "../state/store";
import { useOperation } from "../features/operations/common";
import { PageHead } from "../components/AppShell";
import { Card, CardHead, Chip, Empty, ErrorNote, Icon, Loading, when } from "../components/ui";

const OPERATIONAL_ROLES = ["Worker", "Manager", "Technician", "Verifier"];

export default function AdminPage() {
  const { client, currentRole } = useStore();
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [decision, setDecision] = useState({ role: "Technician", notes: "", verifySkills: true });
  const [invite, setInvite] = useState({ userId: "", role: "Technician" });
  const [grant, setGrant] = useState({ userId: "", workCenters: "", canAssign: true, canVerify: false, expiresAt: "", reason: "" });
  const queue = useOperation("/v2/onboarding", revision, currentRole === "Administrator");
  const me = useOperation("/v2/me", revision);
  const workCenters = me.data?.profile?.workCenter ? [me.data.profile.workCenter] : [];

  if (currentRole !== "Administrator") {
    return (
      <div className="v23-page">
        <PageHead title="Administration" description="Only an independent administrator can review applications or approve privileged capabilities." />
        <Card><Empty title="Administrator capability required">The server enforces this check on every request; the interface hides nothing sensitive from other roles.</Empty></Card>
      </div>
    );
  }

  const applications = queue.data?.applications || [];
  const pending = applications.filter((item) => ["Submitted", "Under review"].includes(item.status));

  async function run(key, action) {
    setBusy(key); setError(""); setMessage("");
    try { const result = await action(); setMessage(result || "Saved."); setRevision((n) => n + 1); }
    catch (cause) { setError(cause.message); } finally { setBusy(""); }
  }

  return (
    <div className="v23-page">
      <PageHead
        title="Administration"
        description="Review qualification applications, issue invitations and grant scoped operational capabilities. Every action is written to audit history."
        chips={[`${pending.length} applications awaiting review`]}
        actions={<button type="button" className="v23-btn" onClick={() => setRevision((n) => n + 1)}><Icon name="refresh" size={15} /> Refresh</button>}
      />
      {message && <p className="v23-chip good" role="status" style={{ justifySelf: "start", padding: "8px 14px" }}>{message}</p>}
      {error && <ErrorNote message={error} />}

      <Card>
        <CardHead title="Onboarding review queue" subtitle="A requested role never grants access; this decision records the approved role." />
        {queue.loading && <Loading rows={2} />}
        {queue.error && <ErrorNote message={queue.error} retry={() => setRevision((n) => n + 1)} />}
        {!queue.loading && !queue.error && (applications.length === 0 ? (
          <Empty title="No applications recorded" />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {applications.map((application) => (
              <article key={application.applicationId} className="v23-card" style={{ padding: 16, boxShadow: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ color: "#fff" }}>{application.fullName || application.userId}</strong>
                    <p className="v23-faint" style={{ margin: "2px 0 0" }}>
                      {application.email || "no email"} · {application.department || "no department"} · {application.workCenter || "no work center"} · {application.shift || "no shift"}
                    </p>
                  </div>
                  <div className="v23-actions">
                    <Chip>{application.status}</Chip>
                    <Chip variant="info">requested {application.requestedRole}</Chip>
                    <span className="v23-faint">{when(application.updatedAt)}</span>
                  </div>
                </div>
                <div className="v23-actions" style={{ marginTop: 10 }}>
                  {(application.skills || []).map((skill) => (
                    <span className="v23-skill-tag" key={skill.skillId}>{skill.name} · {skill.level}
                      <Chip variant={skill.verified ? "good" : "warn"}>{skill.verified ? "Verified" : "Unverified"}</Chip>
                    </span>
                  ))}
                  {!(application.skills || []).length && <span className="v23-faint">No skills declared.</span>}
                </div>
                <div className="v23-actions" style={{ marginTop: 8 }}>
                  {(application.documents || []).map((doc) => (
                    <span className="v23-file-row" key={doc.documentId} style={{ padding: "6px 10px" }}>
                      <Icon name="file" size={14} />
                      <a href={`/api/v2/documents/${encodeURIComponent(doc.documentId)}/download`} target="_blank" rel="noreferrer">{doc.fileName}</a>
                      <Chip variant="neutral">{doc.docType}</Chip>
                    </span>
                  ))}
                  {!(application.documents || []).length && <span className="v23-faint">No documents uploaded.</span>}
                </div>
                {["Submitted", "Under review"].includes(application.status) && (
                  <div className="v23-form" style={{ marginTop: 14 }}>
                    <div className="cols">
                      <label className="v23-field"><span>Approved role</span>
                        <select value={decision.role} onChange={(event) => setDecision({ ...decision, role: event.target.value })}>
                          {OPERATIONAL_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                      </label>
                      <label className="v23-field"><span>Review notes</span>
                        <input value={decision.notes} onChange={(event) => setDecision({ ...decision, notes: event.target.value })} placeholder="Evidence checked" />
                      </label>
                    </div>
                    <div className="v23-actions">
                      <button type="button" className="v23-btn primary" disabled={busy === application.applicationId + "approve"}
                        onClick={() => run(application.applicationId + "approve", async () => {
                          await client.request(`/v2/onboarding/${encodeURIComponent(application.applicationId)}/review`, {
                            method: "POST", body: { decision: "Approve", ...decision, notes: decision.notes || "Qualification evidence reviewed" },
                          });
                          return `Approved ${application.userId} as ${decision.role}.`;
                        })}>Approve</button>
                      <button type="button" className="v23-btn danger" disabled={busy === application.applicationId + "reject"}
                        onClick={() => run(application.applicationId + "reject", async () => {
                          await client.request(`/v2/onboarding/${encodeURIComponent(application.applicationId)}/review`, {
                            method: "POST", body: { decision: "Reject", notes: decision.notes || "Qualification evidence insufficient" },
                          });
                          return `Rejected ${application.userId}.`;
                        })}>Reject</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        ))}
      </Card>

      <div className="v23-grid cols-2">
        <Card>
          <CardHead title="Invitation" subtitle="Invitations allow a verified identity to register a profile." />
          <form className="v23-form" onSubmit={(event) => { event.preventDefault(); run("invite", async () => {
            await client.request("/v2/invitations", { method: "POST", body: invite });
            return `Invitation recorded for ${invite.userId}.`;
          }); }}>
            <label className="v23-field"><span>Identity-provider user ID</span>
              <input required value={invite.userId} onChange={(event) => setInvite({ ...invite, userId: event.target.value })} />
            </label>
            <label className="v23-field"><span>Role</span>
              <select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value })}>
                {OPERATIONAL_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            <div className="v23-actions"><button className="v23-btn primary" disabled={busy === "invite"}>Create invitation</button></div>
          </form>
        </Card>

        <Card>
          <CardHead title="Scoped operational grant" subtitle="Assignment and verification capabilities are granted independently and always expire." />
          <form className="v23-form" onSubmit={(event) => { event.preventDefault(); run("grant", async () => {
            await client.request(`/v2/authorizations/${encodeURIComponent(grant.userId)}`, {
              method: "PUT",
              body: {
                workCenters: grant.workCenters.split(",").map((value) => value.trim()).filter(Boolean),
                canAssign: grant.canAssign, canVerify: grant.canVerify,
                expiresAt: new Date(grant.expiresAt).toISOString(), reason: grant.reason,
              },
            });
            return `Grant saved for ${grant.userId}.`;
          }); }}>
            <label className="v23-field"><span>Onboarded user ID</span>
              <input required value={grant.userId} onChange={(event) => setGrant({ ...grant, userId: event.target.value })} />
            </label>
            <label className="v23-field"><span>Work centers (comma separated)</span>
              <input required value={grant.workCenters} onChange={(event) => setGrant({ ...grant, workCenters: event.target.value })}
                placeholder={workCenters[0] || "WC-A, WC-B"} />
            </label>
            <label className="v23-field"><span>Expires at</span>
              <input required type="datetime-local" value={grant.expiresAt} onChange={(event) => setGrant({ ...grant, expiresAt: event.target.value })} />
            </label>
            <label className="v23-field" style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <input type="checkbox" checked={grant.canAssign} onChange={(event) => setGrant({ ...grant, canAssign: event.target.checked })} style={{ width: 18, height: 18 }} />
              <span style={{ textTransform: "none", letterSpacing: 0, color: "#c3dceb" }}>Assignment capability</span>
            </label>
            <label className="v23-field" style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <input type="checkbox" checked={grant.canVerify} onChange={(event) => setGrant({ ...grant, canVerify: event.target.checked })} style={{ width: 18, height: 18 }} />
              <span style={{ textTransform: "none", letterSpacing: 0, color: "#c3dceb" }}>Independent verification (Verifier identities only)</span>
            </label>
            <label className="v23-field"><span>Reason</span>
              <input required value={grant.reason} onChange={(event) => setGrant({ ...grant, reason: event.target.value })} />
            </label>
            <div className="v23-actions"><button className="v23-btn primary" disabled={busy === "grant"}>Save grant</button></div>
          </form>
        </Card>
      </div>

      <p className="v23-faint" style={{ margin: 0 }}>
        Quality and Administrator capabilities are granted only through the identity provider, not this interface.
        Part inventory is adjusted through the documented API with a recorded reason.
      </p>
    </div>
  );
}
