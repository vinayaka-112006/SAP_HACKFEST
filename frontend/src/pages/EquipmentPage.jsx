import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useOperation } from "../features/operations/common";
import { PageHead } from "../components/AppShell";
import { Card, CardHead, Chip, Empty, ErrorNote, Icon, Loading, when } from "../components/ui";

export default function EquipmentPage() {
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const toolsState = useOperation("/tools", revision);
  const historyState = useOperation(selected ? `/tools/${encodeURIComponent(selected)}/history` : "/tools", revision, Boolean(selected));
  const tools = toolsState.data?.tools || [];
  const query = search.trim().toLowerCase();
  const shown = tools.filter((tool) => !query || [tool.toolId, tool.workCenter, tool.state, tool.toolType].some((value) => String(value || "").toLowerCase().includes(query)));

  return (
    <div className="v23-page">
      <PageHead
        title="Equipment register"
        description="QR-linked equipment identity, lifecycle state and the recorded tool history that product traceability is built from."
        chips={[`${tools.length} registered assets`]}
        actions={<button type="button" className="v23-btn" onClick={() => setRevision((n) => n + 1)}><Icon name="refresh" size={15} /> Refresh</button>}
      />
      <Card>
        <form className="v23-filters" onSubmit={(event) => event.preventDefault()}>
          <label className="v23-field span-2"><span>Search equipment</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Equipment ID, type, work center or state" />
          </label>
          <div className="v23-filter-actions" style={{ gridColumn: "1 / -1" }}>
            <span className="v23-faint">{shown.length} of {tools.length} assets shown</span>
          </div>
        </form>
      </Card>

      {toolsState.loading && <Loading rows={2} />}
      {toolsState.error && <ErrorNote message={toolsState.error} retry={() => setRevision((n) => n + 1)} />}

      {!toolsState.loading && !toolsState.error && (
        <div className="v23-grid split">
          <Card>
            <CardHead title="Assets" subtitle="Select an asset to inspect its recorded history." />
            {shown.length === 0 ? <Empty title="No equipment matches this search" /> : (
              <div className="v23-table-wrap">
                <table className="v23-table">
                  <thead><tr><th>Equipment</th><th>Type</th><th>Work center</th><th>State</th><th>Last verified good</th><th></th></tr></thead>
                  <tbody>
                    {shown.map((tool) => (
                      <tr key={tool.toolId}>
                        <td><span className="id">{tool.toolId}</span></td>
                        <td>{tool.toolType || "—"}</td>
                        <td>{tool.workCenter}</td>
                        <td><Chip>{tool.state}</Chip></td>
                        <td>{tool.lastVerifiedGood ? when(tool.lastVerifiedGood) : "—"}</td>
                        <td><button type="button" className="v23-btn sm" aria-pressed={selected === tool.toolId} onClick={() => setSelected(tool.toolId)}>History</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card light>
            <CardHead title={selected ? `Recorded history · ${selected}` : "Recorded history"} subtitle={selected ? "Tool-use, inspection and production events in stored order." : "Choose an asset from the register."} />
            {!selected && <Empty title="No asset selected">Pick an equipment row to read its tool-use history.</Empty>}
            {selected && historyState.loading && <Loading rows={2} />}
            {selected && historyState.error && <ErrorNote message={historyState.error} retry={() => setRevision((n) => n + 1)} />}
            {selected && !historyState.loading && !historyState.error && (
              <>
                <div className="v23-actions" style={{ marginBottom: 12 }}>
                  {Object.entries(historyState.data?.counts || {}).map(([key, value]) => <Chip key={key} variant="neutral">{key}: {value}</Chip>)}
                </div>
                {(historyState.data?.events || []).length ? (
                  <ol className="v23-timeline">
                    {historyState.data.events.slice(0, 40).map((entry) => (
                      <li key={entry.eventId}>
                        <strong>{entry.type}</strong>
                        <p>{entry.detail || entry.reason || "Recorded event"}</p>
                        <small>{new Date(entry.at).toLocaleString()}</small>
                      </li>
                    ))}
                  </ol>
                ) : <Empty title="No history recorded for this asset" />}
              </>
            )}
          </Card>
        </div>
      )}

      <p className="v23-faint" style={{ margin: 0 }}>
        Equipment history is generated from the stored fixtures. Exposure traces read these same records; the register is not an editable master-data source.
        <Link to="/issues" style={{ marginLeft: 8 }}>Open the issue register</Link>
      </p>
    </div>
  );
}
