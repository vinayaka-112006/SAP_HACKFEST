import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/store";
import { useOperation } from "../features/operations/common";
import { useLocale } from "../features/v2/locale";
import { WorkerAssignments } from "../features/operations/CaseActions";
import VoiceAgent from "../features/v2/VoiceAgent";
import PhotoEvidence from "../components/PhotoEvidence";
import { PageHead } from "../components/AppShell";
import { Bars, Card, CardHead, Chip, Empty, ErrorNote, Icon, Loading, Progress, Stat, shortId, when } from "../components/ui";

const refreshable = (state, revision, setRevision) => ({ state, reload: () => setRevision(revision + 1) });

function IssueList({ issues = [], empty = "No issues in your scope yet.", showNext = true }) {
  if (!issues.length) return <Empty title={empty}>Reports appear here as soon as the record reaches your role.</Empty>;
  return (
    <div className="v23-table-wrap">
      <table className="v23-table">
        <thead>
          <tr><th>Issue</th><th>Equipment</th><th>Severity</th><th>Status</th><th>Updated</th>{showNext && <th>Next action</th>}</tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.incidentId}>
              <td>
                <Link to={`/issues/${encodeURIComponent(issue.incidentId)}`}>{issue.translatedText ? shortText(issue.translatedText) : "Fault report"}</Link>
                <small className="id">{issue.incidentId}</small>
              </td>
              <td>{issue.toolId}<small>{issue.tool?.workCenter} · {issue.tool?.state}</small></td>
              <td><Chip>{issue.severity}</Chip></td>
              <td><Chip>{issue.status}</Chip></td>
              <td>{when(issue.reportedAt)}</td>
              {showNext && <td>{issue.nextAction ? <Link to={`/issues/${encodeURIComponent(issue.incidentId)}`}>{issue.nextAction}</Link> : "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const shortText = (text) => (text.length > 74 ? text.slice(0, 72) + "…" : text);

function DataGate({ state, reload, children }) {
  if (state.loading) return <Loading rows={3} />;
  if (state.error) return <ErrorNote message={state.error} retry={reload} />;
  return children(state.data || {});
}

const countOf = (issues, predicate) => issues.filter(predicate).length;
const severitySeries = (issues) => ["Critical", "High", "Medium", "Low", "Unassessed"].map((label) => ({
  label, value: countOf(issues, (issue) => issue.severity === label),
  tone: { Critical: "linear-gradient(180deg,#fda4af,#e11d48)", High: "linear-gradient(180deg,#fde68a,#d97706)", Medium: "linear-gradient(180deg,#a5f3fc,#0891b2)" }[label],
}));

export function WorkerDashboard() {
  const { currentRole, demoIdentities, demoUserId, tools, refresh, openIncident } = useStore();
  const { t } = useLocale();
  const [revision, setRevision] = useState(0);
  const [toolId, setToolId] = useState("");
  const [confirmed, setConfirmed] = useState("");
  const state = useOperation("/v2/dashboard", revision);
  const reload = () => { setRevision((n) => n + 1); refresh(); };
  const identity = demoIdentities.find((item) => item.userId === demoUserId);
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="v23-page">
      <PageHead
        title={`${greeting}, ${identity?.displayName || state.data?.permissions?.profile?.displayName || "colleague"}`}
        description="Report a machine fault in your own language, confirm the evidence and follow every decision taken on it."
        chips={[`${currentRole} workspace`, tools.length ? `${tools.length} registered equipment` : "register loading"]}
        actions={<button type="button" className="v23-btn ghost" onClick={reload}><Icon name="refresh" size={15} /> Refresh</button>}
      />
      <DataGate state={state} reload={reload}>
        {(data) => {
          const issues = data.issues || [];
          const mine = issues.filter((issue) => issue.reporterId === demoUserId || currentRole !== "Worker");
          const shift = data.profileDetail?.shift || data.permissions?.profile?.workCenter || "Current shift";
          return (
            <>
              <div className="v23-grid kpi">
                <Stat label="My open reports" value={countOf(mine, (issue) => issue.status !== "Closed")} hint="Records still in the repair lifecycle" />
                <Stat label="Awaiting my confirmation" value={countOf(mine, (issue) => issue.status === "Awaiting worker confirmation")} to="/issues?status=Awaiting%20worker%20confirmation" tone="warn" />
                <Stat label="Repairs in progress" value={data.counts.repairs} tone="accent" hint="Machines currently under repair" />
                <Stat label="Temporary reassignments" value={data.counts.reassigned} tone="good" hint="Active station moves today" />
              </div>

              <div className="v23-grid split">
                <Card>
                  <CardHead
                    title="Report a problem"
                    subtitle={`${shift} · select the machine, then talk or type. Nothing is submitted until you confirm the reviewed description.`}
                  />
                  <div className="v23-form">
                    <label className="v23-field">
                      <span>Equipment (QR payload or register ID)</span>
                      <select value={toolId} onChange={(event) => setToolId(event.target.value)} aria-label="Equipment">
                        <option value="">Select registered equipment…</option>
                        {(tools.length ? tools : data.tools || []).map((tool) => (
                          <option key={tool.toolId} value={tool.toolId}>{tool.toolId} · {tool.workCenter} · {tool.state}</option>
                        ))}
                      </select>
                    </label>
                    <VoiceAgent
                      toolId={toolId}
                      onConfirmed={(id) => { setConfirmed(id); openIncident(id); reload(); }}
                    />
                    {confirmed && (
                      <div style={{ display: "grid", gap: 12 }}>
                        <div className="v23-chip good" style={{ justifySelf: "start", padding: "8px 14px" }}>
                          Submitted · {confirmed} is now with the manager
                        </div>
                        <PhotoEvidence incidentId={confirmed} />
                        <div className="v23-actions">
                          <Link className="v23-btn primary sm" to={`/issues/${encodeURIComponent(confirmed)}`}>Track this issue</Link>
                          <Link className="v23-btn ghost sm" to="/worker/manual">Report with the full form instead</Link>
                        </div>
                      </div>
                    )}
                    {!confirmed && <p className="v23-faint">{t("provider")}</p>}
                  </div>
                </Card>

                <div style={{ display: "grid", gap: 16 }}>
                  <Card>
                    <CardHead title="My submitted issues" subtitle="Latest records linked to your identity." actions={<Link className="v23-btn sm ghost" to="/issues">All issues</Link>} />
                    <IssueList issues={mine.slice(0, 6)} empty="You have not reported a fault yet." showNext={false} />
                  </Card>
                  <Card>
                    <CardHead title="Notifications" subtitle={`${data.counts.new || 0} reports are awaiting manager review.`} actions={<Link className="v23-btn sm ghost" to="/notifications">Open centre</Link>} />
                    <ul className="v23-timeline">
                      {issues.slice(0, 4).map((issue) => (
                        <li key={issue.incidentId}>
                          <strong>{issue.status}</strong>
                          <p>{issue.toolId} · {issue.tool?.workCenter}</p>
                          <small>{when(issue.reportedAt)}</small>
                        </li>
                      ))}
                      {!issues.length && <li><strong>No activity yet</strong><p>Your confirmed reports and manager decisions appear here.</p></li>}
                    </ul>
                  </Card>
                </div>
              </div>

              <Card>
                <CardHead title="Temporary reassignments" subtitle="Station moves created while your equipment is down." />
                <WorkerAssignments assignments={data.assignments || []} done={reload} />
              </Card>
            </>
          );
        }}
      </DataGate>
    </div>
  );
}

export function ManagerDashboard() {
  const { refresh } = useStore();
  const [revision, setRevision] = useState(0);
  const state = useOperation("/v2/dashboard", revision);
  const reload = () => { setRevision((n) => n + 1); refresh(); };
  return (
    <div className="v23-page">
      <PageHead
        title="Manager control tower"
        description="Review new reports, place qualified technicians, follow repairs and authorise workforce continuity — all from one incident record."
        chips={["Scope-limited to your approved work centers"]}
        actions={<><Link className="v23-btn ghost" to="/workforce"><Icon name="workforce" size={16} /> Workforce</Link><button type="button" className="v23-btn" onClick={reload}><Icon name="refresh" size={15} /> Refresh</button></>}
      />
      <DataGate state={state} reload={reload}>
        {(data) => {
          const issues = data.issues || [];
          const open = issues.filter((issue) => issue.status !== "Closed");
          const queue = open.filter((issue) => ["Awaiting manager review", "Awaiting technician assignment", "Awaiting authorized assigner"].includes(issue.status));
          const utilisation = data.counts.availableTechnicians
            ? Math.round(((data.counts.availableTechnicians - data.counts.idle) / Math.max(1, data.counts.availableTechnicians)) * 100)
            : 0;
          return (
            <>
              <div className="v23-grid kpi">
                <Stat label="Open incidents" value={data.counts.open} hint="Across your approved work centers" to="/issues" />
                <Stat label="Awaiting review" value={data.counts.new} tone="warn" to="/issues?status=Awaiting%20manager%20review" hint="Unreviewed worker reports" />
                <Stat label="Critical" value={data.counts.critical} tone="danger" to="/issues?severity=Critical" hint="Open critical severity" />
                <Stat label="Machines under repair" value={data.counts.repairs} tone="accent" />
                <Stat label="Completion review" value={data.counts.review} tone="violet" to="/issues?status=Awaiting%20manager%20completion%20review" />
                <Stat label="Awaiting verification" value={data.counts.verification} tone="warn" hint="Independent verifier action" />
                <Stat label="Restricted equipment" value={data.counts.restricted} tone="danger" hint="Not available for production" />
                <Stat label="Eligible technicians" value={data.counts.availableTechnicians} tone="good" hint="Qualified for at least one restricted machine" />
                <Stat label="Idle affected workers" value={data.counts.idle} hint="Available with their machine down" />
                <Stat label="Remaining demand" value={data.counts.pendingDemand} hint="Units still required at affected stations" />
              </div>

              <div className="v23-grid split">
                <Card>
                  <CardHead title="Actionable incident queue" subtitle="Reports that need a manager decision now." actions={<Link className="v23-btn sm ghost" to="/issues">Full register</Link>} />
                  <IssueList issues={queue.slice(0, 8)} empty="Nothing is waiting on you." />
                </Card>
                <div style={{ display: "grid", gap: 16 }}>
                  <Card>
                    <CardHead title="Severity mix" subtitle="Open incidents by reviewed severity." />
                    <Bars data={severitySeries(open)} height={140} />
                  </Card>
                  <Card>
                    <CardHead title="Production recovery" subtitle="Stored demand for the stations on your equipment." />
                    <div className="v23-grid" style={{ gap: 10 }}>
                      {["Repairs in progress", "Awaiting verification", "Awaiting closure"].map((label) => (
                        <div key={label} style={{ display: "grid", gap: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <span className="v23-faint">{label}</span>
                            <strong className="v23-mono" style={{ color: "#fff" }}>{countOf(issues, (issue) => issue.status === label)}</strong>
                          </div>
                          <Progress value={countOf(issues, (issue) => issue.status === label)} max={Math.max(1, data.counts.open)} />
                        </div>
                      ))}
                    </div>
                    <p className="v23-faint" style={{ marginTop: 14 }}>
                      Estimated recovery basis: {data.estimation?.basis}. Utilisation of qualified technicians: {utilisation}% available.
                    </p>
                  </Card>
                  <Card>
                    <CardHead title="Product exposure" subtitle="Deterministic traces linked to these incidents." />
                    <h3 style={{ margin: "0 0 6px", fontSize: 30, fontFamily: "var(--v23-mono)", color: "#fff" }}>{data.counts.exposed}</h3>
                    <p className="v23-faint" style={{ margin: 0 }}>Potentially associated units recorded in the latest traces. Not confirmed defective units.</p>
                    <Link className="v23-btn sm ghost" style={{ marginTop: 12 }} to="/issues?status=Awaiting%20verification">Review before any quality action</Link>
                  </Card>
                </div>
              </div>

              <Card>
                <CardHead title="Station demand" subtitle="Required versus completed units recorded for your stations." />
                {(data.demand || []).length === 0 ? <Empty title="No demand recorded for these stations" /> : (
                  <div className="v23-table-wrap">
                    <table className="v23-table">
                      <thead><tr><th>Station</th><th>Required</th><th>Completed</th><th>Remaining</th><th>Progress</th></tr></thead>
                      <tbody>
                        {(data.demand || []).slice(0, 12).map((row) => (
                          <tr key={row.stationId}>
                            <td>{row.stationId}<small>{row.workCenter || "recorded station"}</small></td>
                            <td>{row.requiredQuantity}</td>
                            <td>{row.completedQuantity}</td>
                            <td>{Math.max(0, row.requiredQuantity - row.completedQuantity)}</td>
                            <td style={{ minWidth: 140 }}><Progress value={row.completedQuantity} max={row.requiredQuantity} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          );
        }}
      </DataGate>
    </div>
  );
}

export function TechnicianDashboard() {
  const { refresh } = useStore();
  const [revision, setRevision] = useState(0);
  const dashboard = useOperation("/v2/dashboard", revision);
  const orders = useOperation("/v2/work-orders", revision);
  const reload = () => { setRevision((n) => n + 1); refresh(); };
  return (
    <div className="v23-page">
      <PageHead
        title="Technician workbench"
        description="Your assigned work orders, parts availability and evidence-backed repair guidance. Acceptance and completion are recorded decisions."
        actions={<button type="button" className="v23-btn" onClick={reload}><Icon name="refresh" size={15} /> Refresh</button>}
      />
      <DataGate state={orders} reload={reload}>
        {(data) => {
          const workOrders = (data.workOrders || []).filter((order) => order.technicianId);
          const counts = {
            pending: countOf(workOrders, (order) => order.status === "Assigned"),
            active: countOf(workOrders, (order) => ["Accepted", "NeedsInformation", "BlockedParts"].includes(order.status)),
            blocked: countOf(workOrders, (order) => order.status === "BlockedParts"),
            submitted: countOf(workOrders, (order) => ["Submitted", "NeedsEvidence"].includes(order.status)),
            verified: countOf(workOrders, (order) => order.status === "Closed"),
          };
          return (
            <>
              <div className="v23-grid kpi">
                <Stat label="Pending acceptance" value={counts.pending} tone="warn" hint="Assigned to you" />
                <Stat label="Active repairs" value={counts.active} tone="accent" />
                <Stat label="Blocked on parts" value={counts.blocked} tone="danger" />
                <Stat label="Awaiting review" value={counts.submitted} tone="violet" />
                <Stat label="Closed repairs" value={counts.verified} tone="good" />
              </div>
              <Card>
                <CardHead title="My work orders" subtitle="Open a work order to record findings, reserve parts and submit completion evidence." />
                {!workOrders.length ? (
                  <Empty title="No work orders assigned">A manager or authorised assigner places qualified work here; you never enter incident IDs manually.</Empty>
                ) : (
                  <div className="v23-table-wrap">
                    <table className="v23-table">
                      <thead><tr><th>Work order</th><th>Incident</th><th>Status</th><th>Assigned</th><th>Findings</th><th>Open</th></tr></thead>
                      <tbody>
                        {workOrders.map((order) => (
                          <tr key={order.workOrderId}>
                            <td><span className="id">{order.workOrderId}</span></td>
                            <td><Link to={`/issues/${encodeURIComponent(order.incidentId)}?tab=repair`}>{order.incidentId}</Link></td>
                            <td><Chip>{order.status}</Chip></td>
                            <td>{when(order.assignedAt)}</td>
                            <td><small style={{ maxWidth: "48ch" }}>{order.findings || "No findings recorded yet"}</small></td>
                            <td><Link className="v23-btn sm" to={`/issues/${encodeURIComponent(order.incidentId)}?tab=repair`}>Open workspace</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
              <div className="v23-grid cols-2">
                <Card>
                  <CardHead title="Repair assistant" subtitle="Evidence-grounded guidance is generated inside each work order." />
                  <p className="v23-muted" style={{ marginTop: 0 }}>
                    Possible causes, similar historical failures, compatible spare parts and next checks are retrieved from permitted records.
                    Approved SOP metadata must be validated by a reviewer; generated advice never certifies machine safety.
                  </p>
                  <Link className="v23-btn sm" to={workOrders[0] ? `/issues/${encodeURIComponent(workOrders[0].incidentId)}?tab=repair` : "/technician"}>Open repair workspace</Link>
                </Card>
                <Card>
                  <CardHead title="Spare parts" subtitle="Availability is read from the persisted inventory." />
                  <p className="v23-muted" style={{ marginTop: 0 }}>Reserve and consume parts inside the work order so every quantity change is transactional and audited.</p>
                  <Link className="v23-btn sm ghost" to="/equipment">Equipment register</Link>
                </Card>
              </div>
            </>
          );
        }}
      </DataGate>
      {dashboard.data?.permissions && !dashboard.data.permissions.profile && (
        <p className="v23-faint">This identity has no approved application profile; work orders are limited to the demonstration scope.</p>
      )}
    </div>
  );
}

export function VerifierDashboard() {
  const { refresh } = useStore();
  const [revision, setRevision] = useState(0);
  const state = useOperation("/v2/dashboard", revision);
  const orders = useOperation("/v2/work-orders", revision);
  const reload = () => { setRevision((n) => n + 1); refresh(); };
  return (
    <div className="v23-page">
      <PageHead
        title="Verifier and assigner console"
        description="Assignment and verification are independent capabilities. You can only act where the recorded grant allows it."
        actions={<button type="button" className="v23-btn" onClick={reload}><Icon name="refresh" size={15} /> Refresh</button>}
      />
      <DataGate state={state} reload={reload}>
        {(data) => {
          const permissions = data.permissions || {};
          const issues = data.issues || [];
          const awaitingAssignment = issues.filter((issue) => ["Awaiting technician assignment", "Awaiting authorized assigner"].includes(issue.status));
          const awaitingVerification = issues.filter((issue) => issue.status === "Awaiting verification");
          const failed = (orders.data?.workOrders || []).filter((order) => order.status === "NeedsEvidence");
          return (
            <>
              <div className="v23-actions">
                <Chip variant={permissions.canAssign ? "good" : "neutral"}>{permissions.canAssign ? "Assignment capability granted" : "Assignment not granted"}</Chip>
                <Chip variant={permissions.canVerify ? "good" : "neutral"}>{permissions.canVerify ? "Independent verification granted" : "Verification not granted"}</Chip>
                <Chip variant={permissions.unrestricted ? "violet" : "info"}>
                  {permissions.unrestricted ? "Unrestricted quality scope" : `${(permissions.workCenters || []).length} approved work centers`}
                </Chip>
              </div>
              <div className="v23-grid kpi">
                <Stat label="Awaiting assignment" value={awaitingAssignment.length} tone="warn" hint="Qualified technician required" />
                <Stat label="Awaiting verification" value={awaitingVerification.length} tone="accent" hint="Manager-reviewed completions" />
                <Stat label="Completion review" value={data.counts.review} tone="violet" hint="Manager action outstanding" />
                <Stat label="Additional evidence" value={failed.length} tone="danger" hint="Repairs returned for evidence" />
                <Stat label="Equipment restricted" value={data.counts.restricted} tone="danger" hint="Independent checks required before release" />
              </div>
              <div className="v23-grid split">
                <Card>
                  <CardHead title="Assignment queue" subtitle="Open each report to inspect technician eligibility before deciding." />
                  <IssueList issues={awaitingAssignment} empty="Nothing awaits assignment." />
                </Card>
                <Card>
                  <CardHead title="Verification queue" subtitle="Return to service requires an independent check of the recorded evidence." />
                  <IssueList issues={awaitingVerification} empty="No repair is awaiting verification." />
                </Card>
              </div>
              <Card>
                <CardHead title="Inspection and audit activity" subtitle="Recent application audit entries for work orders in your scope." />
                <ul className="v23-timeline">
                  {(orders.data?.workOrders || []).slice(0, 6).map((order) => (
                    <li key={order.workOrderId}>
                      <strong>{order.workOrderId} · {order.status}</strong>
                      <p>{order.incidentId} · technician {order.technicianId}</p>
                      <small>{when(order.assignedAt)}</small>
                    </li>
                  ))}
                  {!(orders.data?.workOrders || []).length && <li><strong>No work orders in scope</strong><p>Assignments and verifications appear here.</p></li>}
                </ul>
              </Card>
            </>
          );
        }}
      </DataGate>
    </div>
  );
}
