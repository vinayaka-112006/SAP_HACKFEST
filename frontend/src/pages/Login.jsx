import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { homeFor } from "../components/AppShell";

const ROLES = ["All", "Worker", "Manager", "Technician", "Quality", "Verifier", "Administrator"];

// Comprehensive fallback seeded identities so all 10+ managers, workers, technicians are ALWAYS visible
const FALLBACK_IDENTITIES = [
  { userId: "TS-DEMO-V23-WRK-01", displayName: "Ravi Kumar (Worker 1)", role: "Worker", workCenter: "BRAKE", language: "en", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-WRK-02", displayName: "Suresh Gowda (Worker 2)", role: "Worker", workCenter: "BRAKE", language: "kn", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-WRK-03", displayName: "Arjun Sharma (Worker 3)", role: "Worker", workCenter: "BRAKE", language: "hi", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-WRK-04", displayName: "Manjunath Patil (Worker 4)", role: "Worker", workCenter: "MACHINING", language: "kn", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-WRK-05", displayName: "Ganesh Bhat (Worker 5)", role: "Worker", workCenter: "MACHINING", language: "en", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-WRK-06", displayName: "Pooja Deshmukh (Worker 6)", role: "Worker", workCenter: "MACHINING", language: "hi", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-WRK-07", displayName: "Basavaraj Hiremath (Worker 7)", role: "Worker", workCenter: "PACKAGING", language: "kn", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-WRK-08", displayName: "Rajeshwar Singh (Worker 8)", role: "Worker", workCenter: "PACKAGING", language: "en", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-WRK-09", displayName: "Karthik Shettar (Worker 9)", role: "Worker", workCenter: "PACKAGING", language: "kn", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-WRK-10", displayName: "Alok Tiwari (Worker 10)", role: "Worker", workCenter: "INSPECTION", language: "hi", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-WRK-11", displayName: "Chandan Gowda (Worker 11)", role: "Worker", workCenter: "INSPECTION", language: "kn", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-WRK-12", displayName: "Deepak Choudhary (Worker 12)", role: "Worker", workCenter: "INSPECTION", language: "en", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-WRK-13", displayName: "Vinod Naidu (Worker 13)", role: "Worker", workCenter: "QUALITY", language: "en", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-WRK-14", displayName: "Shivakumar Halli (Worker 14)", role: "Worker", workCenter: "QUALITY", language: "kn", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-WRK-15", displayName: "Santosh Yadav (Worker 15)", role: "Worker", workCenter: "QUALITY", language: "hi", shift: "Demonstration Operational Shift A" },
  { userId: "TS-DEMO-V23-MGR-01", displayName: "Deepa Nair (Manager 1)", role: "Manager", workCenter: "BRAKE", language: "en", shift: "Shift Leadership Roster" },
  { userId: "TS-DEMO-V23-MGR-02", displayName: "Kavita Rao (Manager 2)", role: "Manager", workCenter: "BRAKE", language: "kn", shift: "Shift Leadership Roster" },
  { userId: "TS-DEMO-V23-MGR-03", displayName: "Priya Sundaram (Manager 3)", role: "Manager", workCenter: "MACHINING", language: "hi", shift: "Shift Leadership Roster" },
  { userId: "TS-DEMO-V23-MGR-04", displayName: "Anand Kulkarni (Manager 4)", role: "Manager", workCenter: "MACHINING", language: "en", shift: "Shift Leadership Roster" },
  { userId: "TS-DEMO-V23-MGR-05", displayName: "Sunil Hegde (Manager 5)", role: "Manager", workCenter: "PACKAGING", language: "kn", shift: "Shift Leadership Roster" },
  { userId: "TS-DEMO-V23-MGR-06", displayName: "Meera Joshi (Manager 6)", role: "Manager", workCenter: "PACKAGING", language: "hi", shift: "Shift Leadership Roster" },
  { userId: "TS-DEMO-V23-MGR-07", displayName: "Raghavendra Murthy (Manager 7)", role: "Manager", workCenter: "INSPECTION", language: "en", shift: "Shift Leadership Roster" },
  { userId: "TS-DEMO-V23-MGR-08", displayName: "Srinivas Prasad (Manager 8)", role: "Manager", workCenter: "INSPECTION", language: "kn", shift: "Shift Leadership Roster" },
  { userId: "TS-DEMO-V23-MGR-09", displayName: "Anita Verma (Manager 9)", role: "Manager", workCenter: "QUALITY", language: "hi", shift: "Shift Leadership Roster" },
  { userId: "TS-DEMO-V23-MGR-10", displayName: "Vikram Sengupta (Manager 10)", role: "Manager", workCenter: "QUALITY", language: "en", shift: "Shift Leadership Roster" },
  { userId: "TS-DEMO-V23-TECH-01", displayName: "Prakash Shenoy (Tech 1 - Torque Specialist)", role: "Technician", workCenter: "BRAKE", language: "en", shift: "Maintenance Active Roster" },
  { userId: "TS-DEMO-V23-TECH-02", displayName: "Mahesh Angadi (Tech 2 - Torque Lead)", role: "Technician", workCenter: "BRAKE", language: "kn", shift: "Maintenance Active Roster" },
  { userId: "TS-DEMO-V23-TECH-03", displayName: "Rohit Malhotra (Tech 3 - Mechanical)", role: "Technician", workCenter: "BRAKE", language: "hi", shift: "Maintenance Active Roster" },
  { userId: "TS-DEMO-V23-TECH-04", displayName: "Venkatesh Rao (Tech 4 - Electrical)", role: "Technician", workCenter: "BRAKE", language: "kn", shift: "Maintenance Active Roster" },
  { userId: "TS-DEMO-V23-TECH-05", displayName: "Naveen Saxena (Tech 5 - CNC Maintenance)", role: "Technician", workCenter: "MACHINING", language: "en", shift: "Maintenance Active Roster" },
  { userId: "TS-DEMO-V23-TECH-06", displayName: "Ashok Kamath (Tech 6 - Packaging Specialist)", role: "Technician", workCenter: "PACKAGING", language: "hi", shift: "Maintenance Active Roster" },
  { userId: "TS-DEMO-V23-TECH-07", displayName: "Chetan Biradar (Tech 7 - Calibration Rig)", role: "Technician", workCenter: "QUALITY", language: "kn", shift: "Maintenance Active Roster" },
  { userId: "TS-DEMO-V23-TECH-08", displayName: "Manoj Mishra (Tech 8 - Automation CNC)", role: "Technician", workCenter: "MACHINING", language: "hi", shift: "Maintenance Active Roster" },
  { userId: "TS-DEMO-V23-TECH-09", displayName: "Jagadish Kulkarni (Tech 9 - Metrology)", role: "Technician", workCenter: "INSPECTION", language: "kn", shift: "Maintenance Active Roster" },
  { userId: "TS-DEMO-V23-TECH-10", displayName: "Abhishek Bannerjee (Tech 10 - Vision Systems)", role: "Technician", workCenter: "INSPECTION", language: "en", shift: "Maintenance Active Roster" },
  { userId: "TS-DEMO-V23-VERIFIER-01", displayName: "Dr. Lakshmi Swamy (Verifier 1 - Dual)", role: "Verifier", workCenter: "BRAKE", language: "en", shift: "Independent Return Gate Shift" },
  { userId: "TS-DEMO-V23-VERIFIER-02", displayName: "Harish Chandra (Verifier 2 - Independent)", role: "Verifier", workCenter: "BRAKE", language: "kn", shift: "Independent Return Gate Shift" },
  { userId: "TS-DEMO-V23-VERIFIER-03", displayName: "Neeraj Tripathi (Verifier 3 - Assigner)", role: "Verifier", workCenter: "MACHINING", language: "hi", shift: "Independent Return Gate Shift" },
  { userId: "TS-DEMO-V23-VERIFIER-04", displayName: "Prashant Dixit (Verifier 4 - Independent)", role: "Verifier", workCenter: "INSPECTION", language: "en", shift: "Independent Return Gate Shift" },
  { userId: "TS-DEMO-V23-VERIFIER-05", displayName: "Vandana Patil (Verifier 5 - Plant-wide)", role: "Verifier", workCenter: "QUALITY", language: "kn", shift: "Independent Return Gate Shift" },
  { userId: "TS-DEMO-V23-QUAL-01", displayName: "Sanjay Menon (Quality Lead)", role: "Quality", workCenter: "QUALITY", language: "en", shift: "Quality Assurance Shift" },
  { userId: "TS-DEMO-V23-QUAL-02", displayName: "Ananya Sen (Quality Compliance)", role: "Quality", workCenter: "QUALITY", language: "hi", shift: "Quality Assurance Shift" },
  { userId: "TS-DEMO-V23-ADMIN-01", displayName: "ToolSathi Enterprise Administrator", role: "Administrator", workCenter: "BRAKE", language: "en", shift: "Continuous Administration Governance" },
];

const ROLE_COLORS = {
  Worker: { accent: "#00A6B8", bg: "#F0FDF4", border: "#22D3EE", hover: "#E0F7FA" },
  Manager: { accent: "#0284C7", bg: "#F0F9FF", border: "#38BDF8", hover: "#E0F2FE" },
  Technician: { accent: "#D97706", bg: "#FFFBEB", border: "#FBBF24", hover: "#FEF3C7" },
  Quality: { accent: "#DC2626", bg: "#FEF2F2", border: "#F87171", hover: "#FEE2E2" },
  Verifier: { accent: "#059669", bg: "#ECFDF5", border: "#34D399", hover: "#D1FAE5" },
  Administrator: { accent: "#475569", bg: "#F8FAFC", border: "#94A3B8", hover: "#F1F5F9" },
};

export default function Login() {
  const { demoIdentities, demoUserId, setDemoUserId, setCurrentRole } = useStore();
  const navigate = useNavigate();

  // Combine backend demoIdentities with fallback array to ensure full rich list
  const allIdentities = useMemo(() => {
    if (demoIdentities && demoIdentities.length > 0) {
      return demoIdentities;
    }
    return FALLBACK_IDENTITIES;
  }, [demoIdentities]);

  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedUser, setSelectedUser] = useState(demoUserId || allIdentities[0]?.userId || "V22-20261103-MANAGER-01");
  const [search, setSearch] = useState("");

  // Filtered accounts based on search and selected role
  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allIdentities.filter((item) => {
      const roleMatch = selectedRole === "All" || item.role === selectedRole;
      if (!roleMatch) return false;
      if (!q) return true;
      return (
        (item.displayName && item.displayName.toLowerCase().includes(q)) ||
        (item.userId && item.userId.toLowerCase().includes(q)) ||
        (item.workCenter && item.workCenter.toLowerCase().includes(q)) ||
        (item.language && item.language.toLowerCase().includes(q)) ||
        (item.role && item.role.toLowerCase().includes(q))
      );
    });
  }, [allIdentities, selectedRole, search]);

  // Group accounts by role
  const groups = useMemo(() => {
    const map = new Map();
    for (const item of filteredAccounts) {
      if (!map.has(item.role)) map.set(item.role, []);
      map.get(item.role).push(item);
    }
    return [...map.entries()];
  }, [filteredAccounts]);

  const chosen = useMemo(() => {
    return allIdentities.find((id) => id.userId === selectedUser) || allIdentities[0];
  }, [allIdentities, selectedUser]);

  const handleSelectAccount = (identity) => {
    setSelectedUser(identity.userId);
  };

  const handleAuthorize = () => {
    const targetIdentity = chosen || allIdentities[0];
    if (!targetIdentity) return;
    setDemoUserId(targetIdentity.userId);
    setCurrentRole(targetIdentity.role);
    sessionStorage.setItem("toolsathi.demoRole", targetIdentity.role);
    sessionStorage.setItem("toolsathi.demoUser", targetIdentity.userId);
    navigate(homeFor(targetIdentity.role));
  };

  return (
    <>
      <style>{`
        .login-card-container {
          border: 3px solid #0284C7;
          box-shadow: 0 24px 64px rgba(11, 27, 51, 0.14), 0 0 35px rgba(2, 132, 199, 0.22);
        }
        .login-account-card {
          border: 2px solid rgba(2, 132, 199, 0.45);
          background: #FFFFFF;
          border-radius: 18px;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .login-account-card:hover {
          border-color: #0070F3 !important;
          background: #F0F9FF !important;
          transform: translateY(-4px) scale(1.01) !important;
          box-shadow: 0 12px 30px rgba(0, 112, 243, 0.24), 0 0 16px rgba(0, 229, 255, 0.35) !important;
        }
        .login-account-card.selected {
          border: 3px solid #0070F3 !important;
          background: #F0F9FF !important;
          box-shadow: 0 0 0 3px rgba(0, 112, 243, 0.3), 0 10px 28px rgba(0, 112, 243, 0.28) !important;
          transform: translateY(-2px);
        }
        .role-filter-btn {
          border: 2px solid rgba(2, 132, 199, 0.35);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .role-filter-btn:hover {
          border-color: #0070F3 !important;
          background: #E0F2FE !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 18px rgba(2, 132, 199, 0.28) !important;
        }
        .authorize-action-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .authorize-action-btn:hover {
          transform: translateY(-2px) scale(1.04) !important;
          box-shadow: 0 10px 28px rgba(0, 166, 184, 0.55) !important;
        }
      `}</style>

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
          padding: "36px 24px",
          position: "relative",
          boxSizing: "border-box",
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
          aria-hidden
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
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-tools-pattern)" />
        </svg>

        {/* Floating Aurora Glows */}
        <div
          style={{
            position: "fixed",
            top: "8%",
            left: "20%",
            width: "50vw",
            height: "45vh",
            background: "radial-gradient(circle, rgba(0, 229, 255, 0.25) 0%, transparent 70%)",
            filter: "blur(85px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "fixed",
            bottom: "8%",
            right: "15%",
            width: "45vw",
            height: "45vh",
            background: "radial-gradient(circle, rgba(0, 112, 243, 0.18) 0%, transparent 70%)",
            filter: "blur(85px)",
            pointerEvents: "none",
          }}
        />

        {/* Main Glassmorphic Portal Card — Enhanced Thick Dark-Blue Border Outline */}
        <div
          className="login-card-container"
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            maxWidth: "1040px",
            background: "#FFFFFF",
            borderRadius: "32px",
            padding: "40px 48px",
            boxSizing: "border-box",
          }}
        >
          {/* Brand Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "54px",
                  height: "54px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #00E5FF 0%, #0070F3 50%, #7C3AED 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  boxShadow: "0 8px 26px rgba(0, 229, 255, 0.6), 0 0 38px rgba(0, 112, 243, 0.4)",
                  border: "2px solid #FFFFFF",
                  flexShrink: 0,
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 21 7 21 17 12 22 3 17 3 7" stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" />
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "900", color: "#0B1B33", letterSpacing: "-0.6px", lineHeight: 1.1 }}>
                  ToolSathi Identity Portal
                </h1>
                <div style={{ fontSize: "14px", fontWeight: "900", color: "#007A8C", letterSpacing: "1.4px", marginTop: "4px", fontFamily: "var(--font-mono, monospace)" }}>
                  AUTHENTICATED PLANT ROLE SIMULATION • {allIdentities.length} SEEDED PROFILES
                </div>
              </div>
            </div>

            <Link
              to="/"
              style={{
                fontSize: "15px",
                fontWeight: "900",
                color: "#007A8C",
                textDecoration: "none",
                padding: "10px 22px",
                borderRadius: "100px",
                border: "2px solid rgba(0, 229, 255, 0.6)",
                background: "#F0F9FF",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 14px rgba(0, 229, 255, 0.2)",
                transition: "all 140ms ease",
              }}
            >
              ← Back to Overview
            </Link>
          </div>

          {/* Search Bar & Role Filter Row */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "26px" }}>
            {/* Big Search Input with Dark-Blue Border */}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "18px", top: "50%", transform: "translateY(-50%)", color: "#0284C7", fontSize: "20px", pointerEvents: "none" }}>
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search across all 10+ managers, workers, technicians by name, user ID, work center, or language..."
                style={{
                  width: "100%",
                  padding: "16px 20px 16px 52px",
                  borderRadius: "16px",
                  border: "2.5px solid #0284C7",
                  background: "#F8FAFD",
                  fontSize: "17px",
                  fontWeight: "700",
                  color: "#0B1B33",
                  outline: "none",
                  boxSizing: "border-box",
                  boxShadow: "0 4px 14px rgba(2, 132, 199, 0.1)",
                  transition: "border-color 140ms ease, box-shadow 140ms ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0070F3";
                  e.target.style.boxShadow = "0 0 0 4px rgba(0, 112, 243, 0.25)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#0284C7";
                  e.target.style.boxShadow = "0 4px 14px rgba(2, 132, 199, 0.1)";
                }}
              />
            </div>

            {/* Role Filter Tabs with Hover Effects */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: "900", color: "#0B1B33", textTransform: "uppercase", letterSpacing: "0.8px", marginRight: "4px" }}>
                Filter Role:
              </span>
              {ROLES.map((r) => {
                const isActive = selectedRole === r;
                const count = r === "All" ? allIdentities.length : allIdentities.filter((i) => i.role === r).length;
                return (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className="role-filter-btn"
                    style={{
                      padding: "10px 18px",
                      borderRadius: "100px",
                      fontSize: "15px",
                      fontWeight: "900",
                      border: isActive ? "2.5px solid #0070F3" : "2px solid rgba(2, 132, 199, 0.35)",
                      background: isActive ? "linear-gradient(135deg, #0070F3 0%, #00A6B8 100%)" : "#FFFFFF",
                      color: isActive ? "#FFFFFF" : "#1E293B",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: isActive ? "0 6px 18px rgba(0, 112, 243, 0.35)" : "0 2px 8px rgba(11, 27, 51, 0.05)",
                    }}
                  >
                    <span>{r}</span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "900",
                        padding: "2px 8px",
                        borderRadius: "100px",
                        background: isActive ? "rgba(255, 255, 255, 0.3)" : "rgba(2, 132, 199, 0.12)",
                        color: isActive ? "#FFFFFF" : "#0284C7",
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Accounts List — Grouped by Role showing 10 Managers, 15 Workers, etc. */}
          <div
            style={{
              maxHeight: "420px",
              overflowY: "auto",
              paddingRight: "10px",
              marginBottom: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "22px",
            }}
          >
            {groups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px", color: "#64748B", fontSize: "18px", fontWeight: "800" }}>
                No seeded identities match your search "{search}".
              </div>
            ) : (
              groups.map(([groupRole, items]) => {
                const roleTheme = ROLE_COLORS[groupRole] || ROLE_COLORS.Worker;
                return (
                  <div key={groupRole}>
                    {/* Group Section Header with Bold Font & Dark-Blue Underline */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                        paddingBottom: "8px",
                        borderBottom: "2px solid rgba(2, 132, 199, 0.25)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            background: roleTheme.accent,
                            boxShadow: `0 0 10px ${roleTheme.accent}`,
                          }}
                        />
                        <span style={{ fontSize: "20px", fontWeight: "900", color: "#0B1B33", letterSpacing: "-0.3px" }}>
                          {groupRole} Profiles
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: "900",
                          fontFamily: "var(--font-mono, monospace)",
                          padding: "4px 14px",
                          borderRadius: "100px",
                          background: roleTheme.bg,
                          color: roleTheme.accent,
                          border: `2px solid ${roleTheme.border}`,
                          boxShadow: "0 2px 8px rgba(11, 27, 51, 0.05)",
                        }}
                      >
                        {items.length} Distinct {groupRole}s Available
                      </span>
                    </div>

                    {/* 2-Column Grid of Accounts with Dark-Blue Outlines & Rich Hover */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "14px" }}>
                      {items.map((identity) => {
                        const isSelected = selectedUser === identity.userId;
                        const initial = identity.displayName ? identity.displayName.charAt(0) : "U";
                        return (
                          <div
                            key={identity.userId}
                            onClick={() => handleSelectAccount(identity)}
                            className={`login-account-card ${isSelected ? "selected" : ""}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "16px",
                              padding: "16px 20px",
                              boxSizing: "border-box",
                            }}
                          >
                            {/* Avatar */}
                            <div
                              style={{
                                width: "50px",
                                height: "50px",
                                borderRadius: "14px",
                                background: isSelected ? "linear-gradient(135deg, #0070F3 0%, #00A6B8 100%)" : roleTheme.bg,
                                color: isSelected ? "#FFFFFF" : roleTheme.accent,
                                border: `2px solid ${roleTheme.border}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "20px",
                                fontWeight: "900",
                                flexShrink: 0,
                                boxShadow: isSelected ? "0 4px 14px rgba(0, 112, 243, 0.4)" : "none",
                              }}
                            >
                              {initial}
                            </div>

                            {/* Identity Info with Large, Bold Letters */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                <strong
                                  style={{
                                    fontSize: "18px",
                                    fontWeight: "900",
                                    color: isSelected ? "#0070F3" : "#0B1B33",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {identity.displayName}
                                </strong>
                                {identity.language && (
                                  <span
                                    style={{
                                      fontSize: "12px",
                                      fontWeight: "900",
                                      fontFamily: "var(--font-mono, monospace)",
                                      padding: "3px 8px",
                                      borderRadius: "6px",
                                      background: isSelected ? "#DBEAFE" : "#F1F5F9",
                                      color: isSelected ? "#1D4ED8" : "#334766",
                                      border: "1px solid rgba(11, 27, 51, 0.12)",
                                      textTransform: "uppercase",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {identity.language === "kn" ? "Kannada" : identity.language === "hi" ? "Hindi" : "English"}
                                  </span>
                                )}
                              </div>

                              <div
                                style={{
                                  fontSize: "14.5px",
                                  fontWeight: "800",
                                  color: "#1E293B",
                                  marginTop: "4px",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                📍 {identity.workCenter}
                              </div>
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: "800",
                                  color: "#0284C7",
                                  fontFamily: "var(--font-mono, monospace)",
                                  marginTop: "3px",
                                }}
                              >
                                ID: {identity.userId}
                              </div>
                            </div>

                            {/* Selection Radio / Checkmark */}
                            <div
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "50%",
                                border: isSelected ? "7px solid #0070F3" : "2.5px solid #94A3B8",
                                background: "#FFFFFF",
                                flexShrink: 0,
                                boxSizing: "border-box",
                                boxShadow: isSelected ? "0 0 10px rgba(0, 112, 243, 0.5)" : "none",
                                transition: "all 140ms ease",
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Identity Confirmation & Action Bar with Dark-Blue Outline */}
          <div
            style={{
              background: "#F8FAFD",
              border: "3px solid #0070F3",
              borderRadius: "24px",
              padding: "24px 30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "18px",
              boxShadow: "0 8px 28px rgba(0, 112, 243, 0.15)",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", fontWeight: "900", color: "#007A8C", textTransform: "uppercase", letterSpacing: "1.2px" }}>
                ACTIVE SEEDED IDENTITY SELECTED:
              </div>
              <div style={{ fontSize: "24px", fontWeight: "900", color: "#0B1B33", marginTop: "4px" }}>
                {chosen?.displayName || "Select an identity above"}
              </div>
              <div style={{ fontSize: "15px", color: "#334766", marginTop: "4px", fontWeight: "700" }}>
                Role: <strong style={{ color: "#0070F3", fontSize: "16px" }}>{chosen?.role}</strong> • User ID:{" "}
                <code style={{ fontFamily: "var(--font-mono)", color: "#0B1B33", fontWeight: "900", fontSize: "14.5px" }}>{chosen?.userId}</code> • Work Center:{" "}
                <strong>{chosen?.workCenter}</strong>
              </div>
            </div>

            <button
              onClick={handleAuthorize}
              className="authorize-action-btn"
              style={{
                background: "linear-gradient(135deg, #00A6B8 0%, #0070F3 100%)",
                color: "#FFFFFF",
                border: "none",
                padding: "16px 38px",
                borderRadius: "100px",
                fontSize: "17px",
                fontWeight: "900",
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(0, 166, 184, 0.45)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span>Enter {chosen?.role || "Plant"} Workspace</span>
              <span style={{ fontSize: "20px" }}>➔</span>
            </button>
          </div>

          {/* Trust Notice */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid rgba(11, 27, 51, 0.1)", paddingTop: "20px", marginTop: "24px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ fontSize: "14px", color: "#475569", fontWeight: "700" }}>
              🔒 Local Demonstration Header Mode • Production uses SAP BTP XSUAA OAuth2
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)", fontWeight: "900", color: "#059669", background: "#DCFCE7", padding: "5px 12px", borderRadius: "8px", border: "1.5px solid #86EFAC" }}>
                ● SAP S/4 Mock: Connected
              </span>
              <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)", fontWeight: "900", color: "#0284C7", background: "#E0F2FE", padding: "5px 12px", borderRadius: "8px", border: "1.5px solid #7DD3FC" }}>
                ● SAP DM Mock: Connected
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
