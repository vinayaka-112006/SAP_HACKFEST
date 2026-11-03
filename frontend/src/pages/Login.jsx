import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { homeFor } from "../components/AppShell";

const ROLE_PRESETS = [
  {
    role: "Worker",
    title: "Assembly Operator",
    defaultUser: "V21-WORKER-01",
    workCenter: "WC-B (Brake Line 1)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M6 3h12l1 4H5z" />
      </svg>
    ),
    color: "#00A6B8",
  },
  {
    role: "Manager",
    title: "Plant Quality Manager",
    defaultUser: "V21-MANAGER",
    workCenter: "Quality Control Tower",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
    color: "#0284C7",
  },
  {
    role: "Quality",
    title: "Traceability Analyst",
    defaultUser: "DEMO-QUALITY",
    workCenter: "Metrology & Evidence Yard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    color: "#DC2626",
  },
  {
    role: "Technician",
    title: "Maintenance Technician",
    defaultUser: "V21-TECH-2",
    workCenter: "Tool Calibration Depot",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    color: "#D97706",
  },
  {
    role: "Verifier",
    title: "Independent Quality Verifier",
    defaultUser: "V21-VERIFIER",
    workCenter: "Compliance & Safety Gate",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    color: "#059669",
  },
  {
    role: "Administrator",
    title: "System Compliance Auditor",
    defaultUser: "DEMO-ADMIN",
    workCenter: "Audit Vault",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    color: "#475569",
  },
];

export default function Login() {
  const { demoIdentities, demoUserId, setDemoUserId, setCurrentRole } = useStore();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("Worker");
  const [selectedUser, setSelectedUser] = useState(demoUserId || "V21-WORKER-01");
  const [search, setSearch] = useState("");

  const accounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (demoIdentities || [])
      .filter((identity) => (selectedRole ? identity.role === selectedRole : true))
      .filter((identity) => !query || [identity.displayName, identity.userId, identity.workCenter].some((val) => String(val || "").toLowerCase().includes(query)));
  }, [demoIdentities, search, selectedRole]);

  const handleRoleSelect = (preset) => {
    setSelectedRole(preset.role);
    // Find matching identity from demoIdentities or fallback to preset defaultUser
    const match = (demoIdentities || []).find((id) => id.role === preset.role);
    setSelectedUser(match ? match.userId : preset.defaultUser);
  };

  const handleAuthorize = () => {
    setDemoUserId(selectedUser);
    setCurrentRole(selectedRole);
    sessionStorage.setItem("toolsathi.demoRole", selectedRole);
    sessionStorage.setItem("toolsathi.demoUser", selectedUser);
    navigate(homeFor(selectedRole));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F0F6FF 0%, #E3EFFF 50%, #D8E8FA 100%)",
        color: "#0B1B33",
        fontFamily: "var(--font-sans)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        position: "relative",
      }}
    >
      {/* Background Wallpaper Pattern */}
      <svg
        width="100%"
        height="100%"
        style={{
          position: "fixed",
          inset: 0,
          opacity: 0.14,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <defs>
          <pattern id="login-tools-pattern" width="180" height="180" patternUnits="userSpaceOnUse">
            <g transform="translate(20, 20) scale(0.7)" stroke="#2B5B8C" strokeWidth="1.8" fill="none">
              <rect x="0" y="8" width="14" height="10" rx="1.5" />
              <line x1="0" y1="13" x2="-6" y2="13" strokeWidth="2.5" />
              <rect x="14" y="6" width="22" height="14" rx="2" />
              <rect x="36" y="8" width="28" height="10" rx="1.5" />
              <path d="M 64 13 L 74 24 C 76 27, 74 30, 70 30" />
            </g>
            <g transform="translate(130, 25) scale(0.65)" stroke="#2B5B8C" strokeWidth="1.8" fill="none">
              <polygon points="15,0 30,8.6 30,26 15,34.6 0,26 0,8.6" />
              <circle cx="15" cy="17.3" r="7" />
            </g>
            <g transform="translate(25, 110) scale(0.65)" stroke="#2B5B8C" strokeWidth="1.8" fill="none">
              <rect x="0" y="0" width="60" height="8" rx="1" />
              <line x1="10" y1="8" x2="10" y2="18" strokeWidth="2" />
              <line x1="30" y1="8" x2="30" y2="18" strokeWidth="2" />
            </g>
            <g transform="translate(125, 110) scale(0.65)" stroke="#2B5B8C" strokeWidth="1.8" fill="none">
              <circle cx="20" cy="20" r="14" />
              <circle cx="20" cy="20" r="5" />
              <line x1="20" y1="2" x2="20" y2="6" strokeWidth="3" />
              <line x1="20" y1="34" x2="20" y2="38" strokeWidth="3" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#login-tools-pattern)" />
      </svg>

      {/* Floating Aurora Glow */}
      <div
        style={{
          position: "fixed",
          top: "15%",
          left: "30%",
          width: "40vw",
          height: "40vh",
          background: "radial-gradient(circle, rgba(0, 184, 204, 0.25) 0%, transparent 70%)",
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      {/* Centered Login Portal Glass Card */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "760px",
          background: "#FFFFFF",
          border: "2px solid rgba(0, 166, 184, 0.35)",
          borderRadius: "28px",
          padding: "36px 42px",
          boxShadow: "0 24px 60px rgba(11, 27, 51, 0.10), 0 0 36px rgba(0, 166, 184, 0.12)",
        }}
      >
        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #00A6B8 0%, #0066CC 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                boxShadow: "0 4px 14px rgba(0, 166, 184, 0.4)",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "900", color: "#0B1B33", letterSpacing: "-0.4px" }}>
                ToolSathi Identity Portal
              </h1>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#007A8C", letterSpacing: "0.8px" }}>
                AUTHENTICATED PLANT ROLE SIMULATION
              </div>
            </div>
          </div>

          <Link
            to="/"
            style={{
              fontSize: "13px",
              fontWeight: "700",
              color: "#4A5A75",
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid rgba(11, 27, 51, 0.12)",
              background: "#F8FAFC",
            }}
          >
            ← Back to Overview
          </Link>
        </div>

        {/* Step 1: Select Role Presets */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "12px", fontWeight: "800", color: "#4A5A75", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
            1. Select Demo Authorization Role:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {ROLE_PRESETS.map((preset) => {
              const isSelected = selectedRole === preset.role;
              return (
                <div
                  key={preset.role}
                  onClick={() => handleRoleSelect(preset)}
                  style={{
                    padding: "14px",
                    borderRadius: "16px",
                    background: isSelected ? `${preset.color}12` : "#FFFFFF",
                    border: isSelected ? `2px solid ${preset.color}` : "1.5px solid rgba(11, 27, 51, 0.12)",
                    boxShadow: isSelected ? `0 6px 18px ${preset.color}25` : "0 2px 6px rgba(11, 27, 51, 0.04)",
                    cursor: "pointer",
                    transition: "all 140ms ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: isSelected ? preset.color : "#4A5A75" }}>
                    {preset.icon}
                    <span style={{ fontSize: "14px", fontWeight: "800", color: "#0B1B33" }}>{preset.role}</span>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#4A5A75", marginTop: "4px" }}>
                    {preset.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Selected Identity Confirmation */}
        <div
          style={{
            background: "#F8FAFD",
            border: "1px solid rgba(11, 27, 51, 0.12)",
            borderRadius: "18px",
            padding: "18px 22px",
            marginBottom: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#4A5A75", textTransform: "uppercase" }}>
              ACTIVE SEEDED IDENTITY
            </div>
            <div style={{ fontSize: "17px", fontWeight: "800", color: "#0B1B33", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
              {selectedUser}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
              Role: <strong style={{ color: "#0B1B33" }}>{selectedRole}</strong> • Shift: Active Shop-Floor Authorization
            </div>
          </div>

          <button
            onClick={handleAuthorize}
            style={{
              background: "linear-gradient(135deg, #00A6B8 0%, #0070F3 100%)",
              color: "#FFFFFF",
              border: "none",
              padding: "13px 28px",
              borderRadius: "var(--radius-pill)",
              fontSize: "14.5px",
              fontWeight: "800",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(0, 166, 184, 0.4)",
              transition: "transform 140ms ease",
            }}
          >
            Enter {selectedRole} Workspace ➔
          </button>
        </div>

        {/* Trust Notice */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(11, 27, 51, 0.08)", paddingTop: "16px" }}>
          <div style={{ fontSize: "11.5px", color: "#64748B" }}>
            🔒 Local Demonstration Header Mode • Production uses SAP BTP XSUAA OAuth2
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <span style={{ fontSize: "10.5px", fontFamily: "var(--font-mono)", fontWeight: "700", color: "#059669", background: "#DCFCE7", padding: "3px 8px", borderRadius: "4px" }}>
              SAP S/4 Mock: Ready
            </span>
            <span style={{ fontSize: "10.5px", fontFamily: "var(--font-mono)", fontWeight: "700", color: "#0284C7", background: "#E0F2FE", padding: "3px 8px", borderRadius: "4px" }}>
              SAP DM Mock: Ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
