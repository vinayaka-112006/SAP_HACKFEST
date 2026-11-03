import React from "react";
import { useStore } from "../state/store";

export default function StoryRail() {
  const { toolState: storeToolState, activeIncident } = useStore();

  const steps = [
    {
      id: "reported",
      label: "Reported",
      color: "#D97706",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
    {
      id: "restricted",
      label: "Restricted",
      color: "#DC2626",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      id: "assigned",
      label: "Assigned",
      color: "#0284C7",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <polyline points="17 11 19 13 23 9" />
        </svg>
      ),
    },
    {
      id: "repaired",
      label: "Repaired",
      color: "#D97706",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
    },
    {
      id: "verified",
      label: "Verified Return",
      color: "#059669",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
  ];

  // Determine active step index
  let activeIndex = 0;
  if (storeToolState === "Restricted" || storeToolState === "RESTRICTED") {
    activeIndex = 1;
  }
  if (activeIncident?.status === "Assigned") {
    activeIndex = 2;
  }
  if (storeToolState === "Repairing" || storeToolState === "IN_REPAIR" || activeIncident?.status === "Submitted") {
    activeIndex = 3;
  }
  if (storeToolState === "Verified" || (storeToolState === "Active" && activeIncident?.status === "Closed")) {
    activeIndex = 4;
  }

  return (
    <aside
      className="story-rail-container"
      style={{
        position: "fixed",
        bottom: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 90,
        pointerEvents: "none",
      }}
      aria-label="Incident Progression Story Rail"
    >
      <div
        className="glass-dense"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 14px",
          borderRadius: "var(--radius-pill)",
          border: "1px solid rgba(11, 27, 51, 0.15)",
          boxShadow: "0 6px 20px rgba(11, 27, 51, 0.10)",
          pointerEvents: "auto",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: "800",
            fontFamily: "var(--font-mono)",
            color: "#0B1B33",
            marginRight: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          STORY:
        </span>
        {steps.map((step, idx) => {
          const isPassed = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <React.Fragment key={step.id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "var(--radius-pill)",
                  background: isCurrent
                    ? step.color
                    : isPassed
                    ? "rgba(5, 150, 105, 0.12)"
                    : "#F1F5F9",
                  color: isCurrent
                    ? "#FFFFFF"
                    : isPassed
                    ? "#065F46"
                    : "#64748B",
                  boxShadow: isCurrent ? `0 2px 10px ${step.color}50` : "none",
                  transition: "all 200ms ease",
                }}
              >
                <span style={{ display: "flex", alignItems: "center" }}>
                  {step.icon}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: isCurrent ? "800" : isPassed ? "700" : "600",
                    fontFamily: "var(--font-sans)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isPassed ? "#059669" : "#94A3B8"} strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </aside>
  );
}
