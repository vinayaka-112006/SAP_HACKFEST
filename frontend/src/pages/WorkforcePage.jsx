import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/store";
import { useOperation } from "../features/operations/common";
import WorkforcePanel from "../features/v2/WorkforcePanel";
import { PageHead } from "../components/AppShell";
import { Card, CardHead, Chip, Empty, ErrorNote, Icon, Loading, when } from "../components/ui";

export default function WorkforcePage() {
  const { currentRole, refresh } = useStore();
  const [revision, setRevision] = useState(0);
  const [incidentId, setIncidentId] = useState("");
  const state = useOperation("/v2/dashboard", revision);
  const issues = state.data?.issues || [];
  const candidates = issues.filter((issue) => issue.status !== "Closed" && issue.tool?.state !== "Active");

  useEffect(() => {
    if (!incidentId && candidates.length) setIncidentId(candidates[0].incidentId);
  }, [candidates.length, incidentId]);

  if (currentRole !== "Manager") {
    return (
      <div className="v23-page">
        <PageHead title="Workforce allocation" description="Only managers may apply workforce continuity decisions." />
        <Card><Empty title="Manager capability required">Assignments are validated server-side against your recorded role; this page does not reveal allocation data to other roles.</Empty></Card>
      </div>
    );
  }

  return (
    <div className="v23-page">
      <PageHead
        title="Workforce allocation"
        description="Move qualified workers off a stopped machine to stations with real demand. Recommendations use deterministic constraints; the AI only explains them."
        chips={[`${candidates.length} incidents with restricted equipment`]}
        actions={<button type="button" className="v23-btn" onClick={() => { setRevision((n) => n + 1); refresh(); }}><Icon name="refresh" size={15} /> Refresh</button>}
      />

      {state.loading && <Loading rows={2} />}
      {state.error && <ErrorNote message={state.error} retry={() => setRevision((n) => n + 1)} />}

      {!state.loading && !state.error && (
        <div className="v23-grid split">
          <Card>
            <CardHead title="Choose the downtime incident" subtitle="Automatic and manual allocation both belong to one incident record." />
            {candidates.length === 0 ? (
              <Empty title="No restricted equipment with an open incident">Allocation becomes available when a machine is recorded as unavailable.</Empty>
            ) : (
              <div className="v23-table-wrap">
                <table className="v23-table">
                  <thead><tr><th>Incident</th><th>Equipment</th><th>State</th><th>Status</th><th>Select</th></tr></thead>
                  <tbody>
                    {candidates.map((issue) => (
                      <tr key={issue.incidentId}>
                        <td><Link to={`/issues/${encodeURIComponent(issue.incidentId)}?tab=workforce`}>{issue.incidentId}</Link></td>
                        <td>{issue.toolId}<small>{issue.tool?.workCenter}</small></td>
                        <td><Chip>{issue.tool?.state}</Chip></td>
                        <td><Chip>{issue.status}</Chip></td>
                        <td><button type="button" className="v23-btn sm" aria-pressed={incidentId === issue.incidentId} onClick={() => setIncidentId(issue.incidentId)}>Allocate</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="v23-faint" style={{ marginTop: 12 }}>
              Estimated production figures are derived from stored demand, rate, setup and travel assumptions. They are estimates, never measured output.
            </p>
          </Card>
          <Card>
            <CardHead title="Allocation rules" subtitle="Enforced by the backend for every decision." />
            <ul className="v23-timeline">
              <li><strong>Qualification first</strong><p>Destination skill records, certification expiry and work-center authorisation are checked before any proposal.</p></li>
              <li><strong>Active shift</strong><p>Workers must be on an active shift window with no overlapping assignment.</p></li>
              <li><strong>Authorised execution</strong><p>An explicit manager confirmation or a bounded approved automation policy is required to persist an assignment.</p></li>
              <li><strong>Audited</strong><p>Every assignment, acknowledgement and return writes application audit history.</p></li>
            </ul>
          </Card>
        </div>
      )}

      {incidentId && <WorkforcePanel key={incidentId} incidentId={incidentId} />}

      <p className="v23-faint" style={{ margin: 0 }}>
        {incidentId ? `Active module scoped to ${incidentId} · opened ${when(issues.find((issue) => issue.incidentId === incidentId)?.reportedAt)}` : "Select an incident to begin."}
      </p>
    </div>
  );
}
