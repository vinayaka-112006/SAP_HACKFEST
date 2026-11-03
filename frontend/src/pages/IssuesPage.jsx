import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "../state/store";
import { useOperation } from "../features/operations/common";
import { useOperationsText } from "../features/operations/text";
import { PageHead } from "../components/AppShell";
import { Card, Chip, Empty, ErrorNote, Icon, Loading, Stat, shortId, when } from "../components/ui";

const STATUSES = [
  "Awaiting worker confirmation", "Awaiting manager review", "Awaiting technician assignment",
  "Awaiting authorized assigner", "Awaiting technician acceptance", "Repair in progress",
  "Blocked by spare parts", "Awaiting information", "Awaiting manager completion review",
  "Awaiting additional repair evidence", "Awaiting verification", "Awaiting closure", "Linked report", "Closed",
];
const SEVERITIES = ["Critical", "High", "Medium", "Low", "Unassessed"];
const URGENCIES = ["Immediate", "Urgent", "Normal"];
const PAGE_SIZE = 12;
const FILTER_KEYS = ["search", "status", "severity", "urgency", "workCenter", "toolId", "from", "to", "sort", "order"];

export default function IssuesPage() {
  const { currentRole, tools } = useStore();
  const L = useOperationsText();
  const [params, setParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const [technician, setTechnician] = useState("");
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState(params.get("search") || "");

  const query = useMemo(() => {
    const next = new URLSearchParams();
    for (const key of FILTER_KEYS) if (params.get(key)) next.set(key, params.get(key));
    next.set("limit", "200");
    return next.toString();
  }, [params]);

  const state = useOperation(`/v2/issues?${query}`, revision);
  const reload = () => setRevision((n) => n + 1);
  useEffect(() => { setPage(0); }, [query, technician]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };
  const clear = () => { setParams(new URLSearchParams(), { replace: true }); setTechnician(""); setDraft(""); };

  const issues = state.data?.issues || [];
  const technicians = useMemo(() => [...new Set(issues.map((issue) => issue.workOrder?.technicianId).filter(Boolean))].sort(), [issues]);
  const filtered = useMemo(() => (technician ? issues.filter((issue) => issue.workOrder?.technicianId === technician) : issues), [issues, technician]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const summary = [
    { label: "Open", value: issues.filter((issue) => issue.status !== "Closed").length, tone: "accent", status: "" },
    { label: "Awaiting review", value: issues.filter((issue) => issue.status === "Awaiting manager review").length, tone: "warn", status: "Awaiting manager review" },
    { label: "Critical", value: issues.filter((issue) => issue.severity === "Critical" && issue.status !== "Closed").length, tone: "danger", severity: "Critical" },
    { label: "In repair", value: issues.filter((issue) => issue.status === "Repair in progress" || issue.status === "Awaiting manager completion review").length, tone: "violet", status: "Repair in progress" },
    { label: "Verification", value: issues.filter((issue) => issue.status === "Awaiting verification").length, tone: "good", status: "Awaiting verification" },
  ];
  const activeFilters = FILTER_KEYS.filter((key) => params.get(key) && key !== "sort" && key !== "order").length + (technician ? 1 : 0);

  return (
    <div className="v23-page">
      <PageHead
        title="Issue register"
        description="Every confirmed fault report with its repair, verification, workforce and traceability state. Records are scoped to what your role may read."
        chips={[`${currentRole} view`, `${filtered.length} of ${issues.length} records`]}
        actions={
          <>
            <Link className="v23-btn ghost" to="/worker"><Icon name="plus" size={16} /> New report</Link>
            <button type="button" className="v23-btn" onClick={reload}><Icon name="refresh" size={15} /> Refresh</button>
          </>
        }
      />

      <div className="v23-summary">
        {summary.map((item) => (
          <Stat key={item.label} label={item.label} value={item.value} tone={item.tone}
            onClick={() => setFilter(item.severity ? "severity" : "status", item.severity || item.status)} />
        ))}
      </div>

      <Card>
        <form className="v23-filters" onSubmit={(event) => { event.preventDefault(); setFilter("search", draft); }}>
          <label className="v23-field span-2">
            <span>Search</span>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Issue ID, equipment, description or reporter" />
          </label>
          <label className="v23-field">
            <span>Status</span>
            <select value={params.get("status") || ""} onChange={(event) => setFilter("status", event.target.value)}>
              <option value="">Any status</option>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="v23-field">
            <span>Severity</span>
            <select value={params.get("severity") || ""} onChange={(event) => setFilter("severity", event.target.value)}>
              <option value="">Any severity</option>
              {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
            </select>
          </label>
          <label className="v23-field">
            <span>Urgency</span>
            <select value={params.get("urgency") || ""} onChange={(event) => setFilter("urgency", event.target.value)}>
              <option value="">Any urgency</option>
              {URGENCIES.map((urgency) => <option key={urgency} value={urgency}>{urgency}</option>)}
            </select>
          </label>
          <label className="v23-field">
            <span>Work center</span>
            <select value={params.get("workCenter") || ""} onChange={(event) => setFilter("workCenter", event.target.value)}>
              <option value="">All work centers</option>
              {[...new Set(tools.map((tool) => tool.workCenter))].sort().map((center) => <option key={center} value={center}>{center}</option>)}
            </select>
          </label>
          <label className="v23-field">
            <span>Equipment</span>
            <select value={params.get("toolId") || ""} onChange={(event) => setFilter("toolId", event.target.value)}>
              <option value="">All equipment</option>
              {tools.map((tool) => <option key={tool.toolId} value={tool.toolId}>{tool.toolId}</option>)}
            </select>
          </label>
          <label className="v23-field">
            <span>Assigned technician</span>
            <select value={technician} onChange={(event) => setTechnician(event.target.value)}>
              <option value="">Anyone</option>
              {technicians.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          <label className="v23-field">
            <span>Reported from</span>
            <input type="date" value={params.get("from") || ""} onChange={(event) => setFilter("from", event.target.value)} />
          </label>
          <label className="v23-field">
            <span>Reported to</span>
            <input type="date" value={params.get("to") || ""} onChange={(event) => setFilter("to", event.target.value)} />
          </label>
          <label className="v23-field">
            <span>Sort</span>
            <select value={(params.get("sort") || "reportedAt") + ":" + (params.get("order") || "desc")}
              onChange={(event) => { const [sort, order] = event.target.value.split(":"); const next = new URLSearchParams(params); next.set("sort", sort); next.set("order", order); setParams(next, { replace: true }); }}>
              <option value="reportedAt:desc">Newest first</option>
              <option value="reportedAt:asc">Oldest first</option>
              <option value="status:asc">Status A–Z</option>
            </select>
          </label>
          <div className="v23-filter-actions" style={{ gridColumn: "1 / -1" }}>
            <span className="v23-faint">{activeFilters ? `${activeFilters} filter${activeFilters === 1 ? "" : "s"} applied` : "No filters applied"}</span>
            <button type="button" className="v23-btn sm ghost" onClick={clear} disabled={!activeFilters}>Clear filters</button>
            <button type="submit" className="v23-btn sm primary"><Icon name="search" size={15} /> Search</button>
          </div>
        </form>
      </Card>

      <Card>
        {state.loading && <Loading rows={3} />}
        {state.error && <ErrorNote message={state.error} retry={reload} />}
        {!state.loading && !state.error && (
          <>
            {visible.length === 0 ? (
              <Empty title="No issue matches these filters">Adjust the filters or clear them to see the full register.</Empty>
            ) : (
              <div className="v23-table-wrap">
                <table className="v23-table">
                  <thead>
                    <tr>
                      <th>Issue</th><th>Equipment</th><th>Work center</th><th>Severity</th><th>Status</th>
                      <th>Technician</th><th>Updated</th><th>Next action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((issue) => (
                      <tr key={issue.incidentId}>
                        <td>
                          <Link to={`/issues/${encodeURIComponent(issue.incidentId)}`}>{issue.translatedText || issue.rawText || "Fault report"}</Link>
                          <small className="id">{issue.incidentId}</small>
                        </td>
                        <td>{issue.toolId}<small>{issue.tool?.state}</small></td>
                        <td>{issue.tool?.workCenter || "—"}</td>
                        <td><Chip>{issue.severity}</Chip></td>
                        <td><Chip>{issue.status}</Chip></td>
                        <td>{issue.workOrder?.technicianId ? <span className="id">{issue.workOrder.technicianId}</span> : <span className="v23-faint">Unassigned</span>}</td>
                        <td>{when(issue.reportedAt)}</td>
                        <td>
                          <div className="actions">
                            <Link className="v23-btn sm" to={`/issues/${encodeURIComponent(issue.incidentId)}`}>{issue.nextAction || "Open"}</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="v23-pager">
              <span className="v23-faint">
                Showing {visible.length ? page * PAGE_SIZE + 1 : 0}–{page * PAGE_SIZE + visible.length} of {filtered.length} · page {page + 1} of {pages}
              </span>
              <div className="v23-actions">
                <button type="button" className="v23-btn sm" disabled={page === 0} onClick={() => setPage(0)}>{L("first")}</button>
                <button type="button" className="v23-btn sm" disabled={page === 0} onClick={() => setPage((n) => Math.max(0, n - 1))}>Previous</button>
                <button type="button" className="v23-btn sm" disabled={page + 1 >= pages} onClick={() => setPage((n) => Math.min(pages - 1, n + 1))}>{L("more")}</button>
              </div>
            </div>
          </>
        )}
      </Card>

      <p className="v23-faint" style={{ margin: 0 }}>
        Issues use one shared incident record: the worker report, repair work order, workforce assignments and exposure trace always reference the same identifier.
        Technical identifiers stay visible in secondary text; human-readable labels are the primary column values.
      </p>
    </div>
  );
}
