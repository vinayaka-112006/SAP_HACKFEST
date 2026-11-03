import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useStore } from "../state/store";
import { useOperation } from "../features/operations/common";
import { useOperationsText } from "../features/operations/text";
import { AssignmentActions, ConversationActions, DuplicateActions, RepairActions } from "../features/operations/CaseActions";
import WorkforcePanel from "../features/v2/WorkforcePanel";
import WorkflowPanel from "../features/workflow/WorkflowPanel";
import PhotoEvidence from "../components/PhotoEvidence";
import { Card, CardHead, Chip, Empty, ErrorNote, Icon, Loading, when } from "../components/ui";

const TABS = ["overview", "conversation", "duplicates", "assignment", "repair", "exposure", "workforce", "approvals", "timeline"];

function Triage({ issue, done }) {
  const { client } = useStore();
  const [form, setForm] = useState({
    severity: issue.severity === "Unassessed" ? "Medium" : issue.severity,
    urgency: issue.urgency || "Normal", shift: issue.operation?.shift || "Day", reason: "", escalate: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await client.request(`/v2/incidents/${encodeURIComponent(issue.incidentId)}/triage`, {
        method: "POST", body: { ...form, version: issue.operation?.version || 0 },
      });
      done();
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  return (
    <form className="v23-form" onSubmit={submit}>
      <h3 style={{ margin: 0, color: "#fff" }}>Manager review</h3>
      <p className="v23-faint" style={{ margin: 0 }}>Recorded severity and urgency drive technician qualification checks; the AI never sets them.</p>
      <div className="cols">
        <label className="v23-field"><span>Severity</span>
          <select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}>
            {["Low", "Medium", "High", "Critical"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="v23-field"><span>Urgency</span>
          <select value={form.urgency} onChange={(event) => setForm({ ...form, urgency: event.target.value })}>
            {["Normal", "Urgent", "Immediate"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="v23-field"><span>Production shift</span>
          <input required value={form.shift} onChange={(event) => setForm({ ...form, shift: event.target.value })} />
        </label>
      </div>
      <label className="v23-field"><span>Decision reason</span>
        <input required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
      </label>
      <label className="v23-field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <input type="checkbox" checked={form.escalate} onChange={(event) => setForm({ ...form, escalate: event.target.checked })} style={{ width: 18, height: 18 }} />
        <span style={{ textTransform: "none", letterSpacing: 0, color: "#c3dceb" }}>Delegate assignment to an authorised assigner</span>
      </label>
      <div className="v23-actions"><button className="v23-btn primary" disabled={busy}>{busy ? "Saving…" : "Save review"}</button></div>
      {error && <p className="v23-error" role="alert">{error}</p>}
    </form>
  );
}

export default function IssueDetailPage() {
  const { incidentId } = useParams();
  const { currentRole, openIncident, refresh } = useStore();
  const L = useOperationsText();
  const [params, setParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const tab = params.get("tab") || "overview";
  const state = useOperation(`/v2/issues/${encodeURIComponent(incidentId)}`, revision);
  useEffect(() => { openIncident(incidentId); }, [incidentId]);
  const done = () => { setRevision((n) => n + 1); refresh(); };
  const issue = state.data?.issue;

  const tabs = TABS.filter((key) => {
    if (key === "duplicates") return ["Manager", "Quality"].includes(currentRole);
    if (key === "workforce") return currentRole === "Manager";
    if (key === "exposure") return ["Manager", "Quality", "Verifier"].includes(currentRole);
    if (key === "approvals") return ["Manager", "Quality", "Verifier", "Administrator"].includes(currentRole);
    return true;
  });

  return (
    <div className="v23-page">
      <Link to="/issues" className="v23-btn sm ghost" style={{ justifySelf: "start" }}><Icon name="chevron" size={13} /> Back to issues</Link>
      <header className="v23-page-head">
        <div>
          <h1>{issue?.translatedText || issue?.rawText || `Incident ${incidentId}`}</h1>
          <p className="v23-mono" style={{ fontSize: 13 }}>{incidentId}{issue ? ` · ${issue.toolId} · ${issue.tool?.workCenter}` : ""}</p>
          {issue && (
            <div className="v23-actions" style={{ marginTop: 10 }}>
              <Chip>{issue.status}</Chip>
              <Chip>{issue.severity}</Chip>
              <Chip variant="neutral">{issue.urgency}</Chip>
              <Chip variant="info">{issue.tool?.state}</Chip>
              {issue.workOrder?.technicianId && <Chip variant="good">Technician {issue.workOrder.technicianId}</Chip>}
            </div>
          )}
        </div>
        <div className="v23-actions">
          {issue?.nextAction && <span className="v23-chip info">Next: {issue.nextAction}</span>}
          <button type="button" className="v23-btn" onClick={done}><Icon name="refresh" size={15} /> Refresh</button>
        </div>
      </header>

      {state.loading && <Loading rows={4} />}
      {state.error && <ErrorNote message={state.error} retry={done} />}

      {issue && (
        <>
          <nav className="v23-actions" aria-label="Issue sections" style={{ gap: 6, borderBottom: "1px solid var(--v23-line)", paddingBottom: 10 }}>
            {tabs.map((key) => (
              <button key={key} type="button" className="v23-btn sm" aria-pressed={tab === key}
                style={tab === key ? { background: "#22d3ee", color: "#04212b" } : undefined}
                onClick={() => setParams({ tab: key }, { replace: true })}>{L(key)}</button>
            ))}
          </nav>

          {tab === "overview" && (
            <div className="v23-grid split">
              <div style={{ display: "grid", gap: 16 }}>
                <Card light>
                  <CardHead title="Original worker report" subtitle="Kept verbatim; corrections never overwrite the worker's own words." />
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--v23-ink)" }} className="preserve-text">{issue.rawText || "No free-text statement was recorded."}</p>
                  <p className="v23-faint" style={{ marginTop: 10 }}>
                    Reporter {issue.reporterId} · {new Date(issue.reportedAt).toLocaleString()} · language {issue.language || "—"}
                  </p>
                </Card>
                <Card>
                  <CardHead title="Reviewed summary" subtitle="English description confirmed by the worker before submission." />
                  <p style={{ margin: 0, color: "var(--v23-ink)", fontWeight: 500, fontSize: "16px", lineHeight: "1.6" }}>{issue.translatedText || "No translated description recorded."}</p>
                </Card>
                {currentRole === "Manager" && issue.state === "Confirmed" && (
                  <Card><Triage key={revision} issue={issue} done={done} /></Card>
                )}
              </div>
              <div style={{ display: "grid", gap: 16 }}>
                <Card>
                  <CardHead title="Equipment" subtitle="Registered identity behind the QR code." />
                  <ul className="v23-timeline">
                    <li><strong>{issue.toolId}</strong><p>{issue.tool?.workCenter} · {issue.tool?.state}</p><small>Lifecycle state recorded in the equipment register</small></li>
                    <li><strong>Exposure trace</strong><p>{issue.exposure ? `${issue.exposure.units} associated units · ${issue.exposure.windowHours} h window` : "No trace generated yet"}</p><small>{issue.exposure ? `Generated ${when(issue.exposure.generatedAt)}` : "Trace runs from the exposure tab"}</small></li>
                  </ul>
                  {["Manager", "Quality", "Verifier"].includes(currentRole) && (
                    <Link className="v23-btn sm" to={`/exposure/${encodeURIComponent(issue.incidentId)}`}>Open exposure dashboard</Link>
                  )}
                </Card>
                <Card>
                  <CardHead title="Photographic evidence" subtitle="Attach or review protected photos of the faulty equipment." />
                  <PhotoEvidence incidentId={issue.incidentId} label="Add a photo to this incident" />
                </Card>
              </div>
            </div>
          )}

          {tab === "conversation" && (
            <Card><CardHead title="AI conversation and evidence" subtitle="Original transcripts, worker corrections and manager information requests." />
              <ConversationActions data={state.data} done={done} />
            </Card>
          )}
          {tab === "duplicates" && (
            <Card><CardHead title="Duplicate review" subtitle="Human decision required; original statements are never discarded." />
              <DuplicateActions data={state.data} done={done} />
            </Card>
          )}
          {tab === "assignment" && (
            <Card><CardHead title="Technician assignment" subtitle="Eligibility uses recorded qualifications, expiry, shift, availability and workload." />
              <AssignmentActions data={state.data} done={done} />
            </Card>
          )}
          {tab === "repair" && (
            <Card><CardHead title="Repair workspace" subtitle="Findings, parts, evidence and independent verification for this work order." />
              <RepairActions key={revision} data={state.data} done={done} />
            </Card>
          )}
          {tab === "exposure" && (
            <Card><CardHead title="Product traceability" subtitle="Deterministic association of production units to this tool and window." />
              <p className="v23-muted" style={{ marginTop: 0 }}>
                Exposure is computed only from recorded tool-use, production, inventory and shipment relationships.
                Potentially associated units are not confirmed defective units.
              </p>
              <div className="v23-actions">
                <Link className="v23-btn primary" to={`/exposure/${encodeURIComponent(issue.incidentId)}`}>Open exposure dashboard</Link>
                <Link className="v23-btn ghost" to={`/exposure/${encodeURIComponent(issue.incidentId)}?window=24`}>24 h window</Link>
                <Link className="v23-btn ghost" to={`/exposure/${encodeURIComponent(issue.incidentId)}?window=168`}>168 h window</Link>
              </div>
            </Card>
          )}
          {tab === "workforce" && (
            <Card>
              <CardHead title="Workforce continuity" subtitle="Automatic recommendations and manual assignment for workers affected by this downtime." />
              <WorkforcePanel incidentId={issue.incidentId} />
            </Card>
          )}
          {tab === "approvals" && (
            <Card><CardHead title="Approvals" subtitle="Containment and recovery proposals recorded for these incidents." />
              <WorkflowPanel />
            </Card>
          )}
          {tab === "timeline" && (
            <Card light>
              <CardHead title="Audit timeline" subtitle="Every recorded state change with actor, role and reason." />
              {state.data.timeline?.length ? (
                <ol className="v23-timeline">
                  {state.data.timeline.map((entry) => (
                    <li key={entry.auditId}>
                      <strong>{entry.action}</strong>
                      <p>{entry.reason || "No reason recorded"}</p>
                      <small>{new Date(entry.timestamp).toLocaleString()} · {entry.actor} · {entry.actorRole}</small>
                    </li>
                  ))}
                </ol>
              ) : <Empty title="No audit entries yet" />}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
