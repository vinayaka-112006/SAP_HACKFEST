import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../state/store";

export default function RoleDock() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRole, setCurrentRole } = useStore();

  const navItems = [
    {
      id: "Worker",
      label: "Worker Intake",
      path: "/worker",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <path d="M6 3h12l1 4H5z" />
        </svg>
      ),
    },
    {
      id: "Manager",
      label: "Manager Console",
      path: "/manager",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </svg>
      ),
    },
    {
      id: "Quality",
      label: "Evidence Yard",
      path: "/exposure/TS-0001",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      id: "Technician",
      label: "Technician Repair",
      path: "/technician",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
    },
    {
      id: "Verifier",
      label: "Verifier Gate",
      path: "/verifier",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "Admin",
      label: "Audit Ledger",
      path: "/admin",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
  ];

  const handleNav = (item) => {
    setCurrentRole(item.id === "Admin" ? "Administrator" : item.id);
    navigate(item.path);
  };

  const isItemActive = (item) => {
    if (item.path.startsWith("/exposure") && location.pathname.startsWith("/exposure")) return true;
    return location.pathname === item.path;
  };

  return (
    <header
      className="role-dock-container"
      style={{
        position: "fixed",
        top: "14px",
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        pointerEvents: "none",
      }}
    >
      {/* Left: Creative High-Tech Brand Medallion */}
      <div
        onClick={() => navigate("/")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "9px 20px",
          borderRadius: "var(--radius-pill)",
          background: "#FFFFFF",
          pointerEvents: "auto",
          cursor: "pointer",
          border: "2px solid rgba(0, 166, 184, 0.45)",
          boxShadow: "0 8px 30px rgba(11, 27, 51, 0.12), 0 0 24px rgba(0, 229, 255, 0.25)",
          transition: "all 200ms ease",
        }}
        title="ToolSathi Intelligent Manufacturing Control"
      >
        {/* Creative Interlocking Hexagonal Quantum Wrench Logo */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #00E5FF 0%, #0070F3 50%, #7C3AED 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0, 229, 255, 0.5)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 21 7 21 17 12 22 3 17 3 7" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: "17px", fontWeight: "900", color: "#0B1B33", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
            ToolSathi
          </div>
          <div style={{ fontSize: "11px", fontWeight: "800", color: "#007A8C", letterSpacing: "1px" }}>
            EVIDENCE LINE
          </div>
        </div>
      </div>

      {/* Center: Enriched, Highly Visible Navbar (Big Letters & Glowing Highlights) */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "6px 8px",
          borderRadius: "var(--radius-pill)",
          background: "rgba(255, 255, 255, 0.97)",
          backdropFilter: "blur(28px)",
          border: "2px solid rgba(2, 100, 180, 0.45)",
          boxShadow: "0 8px 32px rgba(2, 100, 180, 0.18), 0 2px 8px rgba(11, 27, 51, 0.1), inset 0 1px 0 rgba(255,255,255,0.9)",
          pointerEvents: "auto",
        }}
        aria-label="Role Navigation"
      >
        {navItems.map((item) => {
          const active = isItemActive(item);
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                borderRadius: "var(--radius-pill)",
                border: active
                  ? "2px solid #0070F3"
                  : "1.5px solid rgba(2, 100, 180, 0.18)",
                background: active
                  ? "linear-gradient(135deg, #0056B3 0%, #0070F3 100%)"
                  : "transparent",
                color: active ? "#FFFFFF" : "#0B2850",
                fontWeight: "800",
                fontSize: "14.5px",
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: active
                  ? "0 4px 16px rgba(0, 112, 243, 0.45), inset 0 1px 0 rgba(255,255,255,0.25)"
                  : "none",
                letterSpacing: "-0.01em",
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = "rgba(2, 100, 180, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(2, 100, 180, 0.45)";
                  e.currentTarget.style.color = "#00328C";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "rgba(2, 100, 180, 0.18)";
                  e.currentTarget.style.color = "#0B2850";
                }
              }}
              className="role-dock-btn"
            >
              <span style={{ display: "flex", alignItems: "center", color: active ? "rgba(255,255,255,0.9)" : "#0056B3", flexShrink: 0 }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: High-Contrast Trust Status Chips */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          pointerEvents: "auto",
        }}
      >
        <span
          style={{
            fontSize: "12.5px",
            fontFamily: "var(--font-mono)",
            fontWeight: "800",
            color: "#059669",
            background: "#FFFFFF",
            padding: "8px 14px",
            borderRadius: "var(--radius-pill)",
            border: "1.5px solid rgba(5, 150, 105, 0.35)",
            display: "flex",
            alignItems: "center",
            gap: "7px",
            boxShadow: "0 4px 14px rgba(5, 150, 105, 0.12)",
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#059669" }} />
          Simulated: S/4
        </span>
        <span
          style={{
            fontSize: "12.5px",
            fontFamily: "var(--font-mono)",
            fontWeight: "800",
            color: "#0284C7",
            background: "#FFFFFF",
            padding: "8px 14px",
            borderRadius: "var(--radius-pill)",
            border: "1.5px solid rgba(2, 132, 199, 0.35)",
            display: "flex",
            alignItems: "center",
            gap: "7px",
            boxShadow: "0 4px 14px rgba(2, 132, 199, 0.12)",
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0284C7" }} />
          Simulated: DM
        </span>
      </div>
    </header>
  );
}
