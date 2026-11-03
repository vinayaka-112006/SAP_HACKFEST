import React, { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useStore } from "../state/store";
import { useOperation } from "../features/operations/common";
import { PageHead } from "../components/AppShell";
import { Bars, Card, CardHead, Chip, Empty, ErrorNote, Icon, Loading, Progress, Stat, when } from "../components/ui";

const WINDOWS = [24, 72, 168];

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function ExposurePage() {
  const { incidentId } = useParams();
  const { client, currentRole } = useStore();
  const [params, setParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const [filters, setFilters] = useState({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const pending = useRef(false);
  const hours = Number(params.get("window") || 72);
  const reportId = params.get("report");
  const allowed = ["Manager", "Quality", "Verifier"].includes(currentRole);
  const state = useOperation(
    reportId ? `/v2/exposure-reports/${encodeURIComponent(reportId)}` : `/incidents/${encodeURIComponent(incidentId)}/trace?window=${hours}`,
    revision,
    allowed,
  );
  const report = state.data?.report;
  const trace = report?.snapshot?.trace || (reportId ? null : state.data);

  useEffect(() => {
    if (report?.snapshot?.filters) setFilters(report.snapshot.filters);
  }, [report?.reportId]);

  if (!allowed) {
    return (
      <div className="v23-page">
        <PageHead title="Product exposure" description="Traceability review is limited to managers, quality and verifiers." />
        <Card><Empty title="Not authorised">Your role cannot read exposure traces.</Empty></Card>
      </div>
    );
  }

  const units = trace?.units || [];
  const shown = units.filter((unit) =>
    (!filters.serial || unit.serial === filters.serial) &&
    (!filters.batchId || unit.batchId === filters.batchId) &&
    (!filters.tier || unit.tier === filters.tier) &&
    (!filters.locationStatus || unit.locationStatus === filters.locationStatus));
  const change = (key, value) => setFilters((current) => {
    const next = { ...current };
    if (value) next[key] = value; else delete next[key];
    return next;
  });

  async function store() {
    if (pending.current) return null;
    pending.current = true;
    try {
      if (report && JSON.stringify(report.snapshot.filters) === JSON.stringify(filters) && report.windowHours === hours) return report;
      const result = await client.request(`/v2/incidents/${encodeURIComponent(incidentId)}/exposure-reports`, {
        method: "POST", body: { window: hours, filters }, requestTimeoutMs: 65000,
      });
      setParams({ window: String(hours), report: result.report.reportId }, { replace: true });
      return result.report;
    } finally { pending.current = false; }
  }

  async function download(format) {
    setBusy(format); setError("");
    try {
      const current = await store();
      if (!current) return;
      if (format === "html") {
        const blob = await client.download(`/incidents/${encodeURIComponent(incidentId)}/executive-report`, { requestTimeoutMs: 65000, headers: { Accept: "text/html" } });
        window.open(URL.createObjectURL(blob), "_blank");
      } else {
        const blob = await client.download(`/v2/exposure-reports/${encodeURIComponent(current.reportId)}/download?format=${format}`, { requestTimeoutMs: 65000 });
        saveBlob(blob, `ToolSathi_${current.reportId}.${format}`);
      }
    } catch (cause) { setError(cause.message); } finally { setBusy(""); }
  }

  const tierSeries = trace ? Object.entries(trace.summary.byTier || {}).map(([label, value]) => ({
    label, value,
    tone: { CONFIRMED: "linear-gradient(180deg,#6ee7b7,#059669)", PROBABLE: "linear-gradient(180deg,#fde68a,#d97706)" }[label],
  })) : [];

  return (
    <div className="v23-page">
      <Link to={`/issues/${encodeURIComponent(incidentId)}`} className="v23-btn sm ghost" style={{ justifySelf: "start" }}><Icon name="chevron" size={13} /> Back to incident</Link>
      <PageHead
        title="Product exposure"
        description="Deterministic traversal of recorded tool use, production runs, batches, stock and shipments inside the selected window."
        chips={["Potentially associated units only", "Recorded associations do not determine product condition"]}
        actions={<button type="button" className="v23-btn" onClick={() => setRevision((n) => n + 1)}><Icon name="refresh" size={15} /> Recompute</button>}
      />

      <Card>
        <form className="v23-filters" onSubmit={(event) => event.preventDefault()}>
          <label className="v23-field">
            <span>Investigation window</span>
            <select value={hours} onChange={(event) => { setParams({ window: event.target.value }, { replace: true }); setFilters({}); }}>
              {WINDOWS.map((value) => <option key={value} value={value}>{value} hours</option>)}
            </select>
          </label>
          <label className="v23-field">
            <span>Batch</span>
            <select value={filters.batchId || ""} onChange={(event) => change("batchId", event.target.value)}>
              <option value="">All batches</option>
              {[...new Set(units.map((unit) => unit.batchId))].map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          <label className="v23-field">
            <span>Association tier</span>
            <select value={filters.tier || ""} onChange={(event) => change("tier", event.target.value)}>
              <option value="">All tiers</option>
              {["CONFIRMED", "PROBABLE", "UNKNOWN"].map((tier) => <option key={tier} value={tier}>{tier}</option>)}
            </select>
          </label>
          <label className="v23-field">
            <span>Location status</span>
            <select value={filters.locationStatus || ""} onChange={(event) => change("locationStatus", event.target.value)}>
              <option value="">Any location</option>
              {["IN_STOCK", "SHIPPED", "UNKNOWN_LOCATION"].map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
            </select>
          </label>
          <label className="v23-field">
            <span>Serial number</span>
            <input value={filters.serial || ""} onChange={(event) => change("serial", event.target.value)} placeholder="Exact serial" />
          </label>
          <div className="v23-filter-actions" style={{ gridColumn: "1 / -1" }}>
            <span className="v23-faint">{shown.length} of {units.length} units selected</span>
            <button type="button" className="v23-btn sm ghost" onClick={() => setFilters({})} disabled={!Object.keys(filters).length}>Clear filters</button>
            <button type="button" className="v23-btn sm" disabled={Boolean(busy)} onClick={() => download("pdf")}>{busy === "pdf" ? "Preparing PDF…" : "Download PDF"}</button>
            <button type="button" className="v23-btn sm" disabled={Boolean(busy)} onClick={() => download("csv")}>{busy === "csv" ? "Preparing CSV…" : "Download CSV"}</button>
            <button type="button" className="v23-btn sm ghost" disabled={Boolean(busy)} onClick={() => download("html")}>Executive report</button>
          </div>
        </form>
        {error && <p className="v23-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      </Card>

      {state.loading && <Loading rows={3} />}
      {state.error && <ErrorNote message={state.error} retry={() => setRevision((n) => n + 1)} />}

      {trace && (
        <>
          <div className="v23-grid kpi">
            <Stat label="Associated units" value={trace.summary.totalUnits} hint={`${trace.toolId} · ${trace.windowHours} h window`} tone="accent" />
            <Stat label="Confirmed records" value={trace.summary.byTier?.CONFIRMED || 0} tone="good" hint="Serial-level evidence recorded" />
            <Stat label="Probable records" value={trace.summary.byTier?.PROBABLE || 0} tone="warn" hint="Indirect association" />
            <Stat label="Unknown location" value={trace.exposureRange?.unknownSeparate || 0} tone="danger" hint="Cannot be located from records" />
            <Stat label="Evidence quality" value={`${trace.dataQuality?.score ?? 0}/100`} hint={`Range ${trace.exposureRange?.low ?? 0}–${trace.exposureRange?.high ?? 0}`} />
          </div>

          <div className="v23-grid split">
            <Card>
              <CardHead title="Serial-level associations" subtitle={`${trace.windowStart} → ${trace.windowEnd}`} />
              {shown.length === 0 ? <Empty title="No unit matches these filters" /> : (
                <div className="v23-table-wrap">
                  <table className="v23-table">
                    <thead><tr><th>Serial</th><th>Batch</th><th>Tier</th><th>Location</th><th>Evidence</th></tr></thead>
                    <tbody>
                      {shown.map((unit) => (
                        <tr key={unit.serial}>
                          <td><span className="id">{unit.serial}</span></td>
                          <td>{unit.batchId}</td>
                          <td><Chip variant={unit.tier === "CONFIRMED" ? "good" : unit.tier === "PROBABLE" ? "warn" : "neutral"}>{unit.tier}</Chip><small>{unit.tierReason}</small></td>
                          <td><Chip variant={unit.locationStatus === "IN_STOCK" ? "info" : unit.locationStatus === "SHIPPED" ? "violet" : "danger"}>{unit.locationStatus.replace("_", " ")}</Chip><small>{unit.location || "Unknown"} {unit.dealerId ? `· ${unit.dealerId}` : ""}</small></td>
                          <td><small>{unit.evidenceIds.length} references</small><small>{unit.flags.join(", ") || "No flags"}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <div style={{ display: "grid", gap: 16 }}>
              <Card>
                <CardHead title="Association mix" subtitle="Tier distribution in the selected window." />
                <Bars data={tierSeries} height={130} />
                <div style={{ marginTop: 14 }}>
                  <span className="v23-faint">Evidence completeness</span>
                  <Progress value={trace.dataQuality?.score || 0} />
                </div>
              </Card>
              <Card light>
                <CardHead title="Evidence gaps" subtitle="Missing or conflicting records found during traversal." />
                {trace.gaps?.length ? (
                  <ol className="v23-timeline">
                    {trace.gaps.slice(0, 8).map((gap, index) => (
                      <li key={`${gap.code}-${index}`}>
                        <strong>{gap.code}</strong>
                        <p>{gap.message}</p>
                        <small>{gap.runId || "no run reference"} · {(gap.evidenceIds || []).join(", ") || "no evidence reference"}</small>
                      </li>
                    ))}
                  </ol>
                ) : <Empty title="No gaps recorded" />}
              </Card>
            </div>
          </div>

          {report && (
            <p className="v23-faint" style={{ margin: 0 }}>
              Stored snapshot {report.reportId} · generated {when(report.createdAt)} · digest {report.digest?.slice(0, 16)}… ·
              downloads contain the evidence references, window and synthetic-data disclosure.
            </p>
          )}
          <p className="v23-faint" style={{ margin: 0 }}>
            Dispatch is recorded; transit progress and dealer receipt are never inferred. Quality decisions remain human approved and no report triggers a recall automatically.
          </p>
        </>
      )}
    </div>
  );
}
