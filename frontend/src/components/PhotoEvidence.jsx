import React, { useState } from "react";
import { useStore } from "../state/store";
import { Icon } from "./ui";

// Optional photographic evidence for a confirmed incident. Files are validated and stored
// outside the web root; a photo never produces an automatic diagnosis.
export default function PhotoEvidence({ incidentId, label = "Attach a photo of the faulty equipment (optional)" }) {
  const { client } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState([]);

  async function upload(file) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("Use a PNG, JPG or WEBP photo."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Photos must be 5 MB or smaller."); return; }
    setBusy(true); setError("");
    try {
      const result = await client.request(`/v2/incidents/${encodeURIComponent(incidentId)}/photos`, {
        method: "POST", body: file, requestTimeoutMs: 45000,
        headers: { "x-file-name": file.name, "x-document-description": "Worker photo of the faulty equipment" },
      });
      setDone((rows) => [...rows, result.document]);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label className="v23-field">
        <span>{label}</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy}
          onChange={(event) => upload(event.target.files?.[0])} aria-label="Incident photo" />
      </label>
      {busy && <p className="v23-faint" role="status">Uploading protected photo…</p>}
      {error && <p className="v23-error" role="alert">{error}</p>}
      {done.map((doc) => (
        <div className="v23-file-row" key={doc.documentId}>
          <Icon name="camera" size={15} />
          <span className="grow">{doc.fileName} · {(doc.size / 1024).toFixed(0)} KB</span>
          <span className="v23-chip good">Evidence attached</span>
        </div>
      ))}
      <p className="v23-faint" style={{ margin: 0 }}>
        Photos are stored privately against the incident. No vision model is configured, so no automated fault diagnosis is produced.
      </p>
    </div>
  );
}
