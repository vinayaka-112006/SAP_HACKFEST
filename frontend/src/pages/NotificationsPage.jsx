import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/store";
import { useOperation } from "../features/operations/common";
import { PageHead } from "../components/AppShell";
import { Card, CardHead, Chip, Empty, ErrorNote, Icon, Loading, when } from "../components/ui";

export default function NotificationsPage() {
  const { client } = useStore();
  const [revision, setRevision] = useState(0);
  const [scope, setScope] = useState("all");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const state = useOperation("/v2/notifications", revision);
  const notifications = state.data?.notifications || [];
  const shown = scope === "unread" ? notifications.filter((item) => !item.read) : notifications;

  async function markRead(id) {
    setBusy(id); setError("");
    try {
      await client.request(`/v2/notifications/${encodeURIComponent(id)}/read`, { method: "POST", body: {} });
      setRevision((n) => n + 1);
    } catch (cause) { setError(cause.message); } finally { setBusy(""); }
  }

  return (
    <div className="v23-page">
      <PageHead
        title="Notification centre"
        description="Persisted notifications for your identity only. Reads are recorded server-side and never shared across accounts."
        chips={[`${state.data?.unread ?? 0} unread`]}
        actions={<button type="button" className="v23-btn" onClick={() => setRevision((n) => n + 1)}><Icon name="refresh" size={15} /> Refresh</button>}
      />
      <Card>
        <CardHead
          title="Inbox"
          subtitle="Open the linked record to act; the notification itself cannot change a state."
          actions={
            <div className="v23-actions" role="group" aria-label="Filter notifications">
              <button type="button" className="v23-btn sm" aria-pressed={scope === "all"} onClick={() => setScope("all")}>All</button>
              <button type="button" className="v23-btn sm" aria-pressed={scope === "unread"} onClick={() => setScope("unread")}>Unread</button>
            </div>
          }
        />
        {state.loading && <Loading rows={2} />}
        {state.error && <ErrorNote message={state.error} retry={() => setRevision((n) => n + 1)} />}
        {error && <p className="v23-error" role="alert">{error}</p>}
        {!state.loading && !state.error && (shown.length === 0 ? (
          <Empty title={scope === "unread" ? "No unread notifications" : "No notifications yet"}>Workflow and workforce events addressed to you appear here.</Empty>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {shown.map((item) => (
              <article key={item.notificationId} className="v23-file-row" style={{ alignItems: "flex-start", padding: "14px 16px" }}>
                <Icon name={item.read ? "bell" : "alert"} size={16} />
                <div className="grow" style={{ whiteSpace: "normal" }}>
                  <Link to={item.href}>{item.message}</Link>
                  <div className="v23-actions" style={{ marginTop: 6, gap: 8 }}>
                    <Chip variant={item.read ? "neutral" : "info"}>{item.read ? "Read" : "Unread"}</Chip>
                    <span className="v23-faint">{when(item.createdAt)}</span>
                    {item.incidentId && <span className="v23-faint v23-mono">{item.incidentId}</span>}
                  </div>
                </div>
                {!item.read && (
                  <button type="button" className="v23-btn sm" disabled={busy === item.notificationId} onClick={() => markRead(item.notificationId)}>
                    {busy === item.notificationId ? "Saving…" : "Mark read"}
                  </button>
                )}
              </article>
            ))}
          </div>
        ))}
      </Card>
    </div>
  );
}
