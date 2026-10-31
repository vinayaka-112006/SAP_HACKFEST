import React from "react";
import GlassPanel from "../../components/GlassPanel";
export default function DuplicatePrompt() {
  return (
    <GlassPanel
      variant="strong"
      style={{ padding: "24px", border: "1px solid rgba(242,161,0,.4)" }}
    >
      <h3>Duplicate Incident Correlation Gate</h3>
      <p>
        Duplicate review is unavailable until Jamuna's real workflow is
        integrated. No correlation score or merge decision has been generated.
      </p>
      <button className="secondary-action" disabled>
        Merge Reports
      </button>
      <button className="secondary-action" disabled>
        Keep Separate
      </button>
    </GlassPanel>
  );
}
