import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import IntroSequence from "../components/IntroSequence";

const JOURNEY_STEPS = [
  {
    id: "step1",
    time: "10:42 AM",
    phase: "STEP 1",
    title: "Multilingual Voice Intake",
    subtitle: "Kannada & Hindi Speech-to-Intent",
    actor: "Worker (Operator 01)",
    roleId: "Worker",
    route: "/worker",
    color: "#00E5FF",
    badge: "Sarvam AI Voice",
    telemetry: {
      status: "TORQUE DRIFT DETECTED",
      statusColor: "#DC2626",
      reading: "48.2 Nm",
      spec: "45.0 ± 1.0 Nm",
      exposed: "Scanning...",
      action: "Voice Transcript Captured",
    },
    detail: "Operator speaks on shop-floor in Kannada: 'ಟಾರ್ಕ್ ಸರಿಯಾಗಿ ಬೀಳುತ್ತಿಲ್ಲ' (Torque slipping). AI parses tool ID, symptom, and category in 240ms without manual typing.",
    codeSnippet: 'INTAKE_PAYLOAD: { tool: "TOOL-B", symptom: "SLIP", lang: "kn", confidence: 0.94 }',
  },
  {
    id: "step2",
    time: "10:43 AM",
    phase: "STEP 2",
    title: "AI Deduplication Guardrail",
    subtitle: "Historical Pattern Match",
    actor: "Incident Engine",
    roleId: "Manager",
    route: "/manager",
    color: "#0284C7",
    badge: "Zero Duplicate Tickets",
    telemetry: {
      status: "DUPLICATE MATCH: INC-004",
      statusColor: "#D97706",
      reading: "48.2 Nm",
      spec: "Historical Repeat Flagged",
      exposed: "35 Initial Units",
      action: "Linked to Prior Shift Anomaly",
    },
    detail: "System detects an identical torque variance reported 12 days ago on TOOL-B. Prompts manager to link investigations, eliminating duplicate work orders.",
    codeSnippet: 'DUPLICATE_CHECK: { matches: ["INC-2026-004"], similarity: 0.88, mergeRecommended: true }',
  },
  {
    id: "step3",
    time: "10:44 AM",
    phase: "STEP 3",
    title: "Physical Lockout & Containment",
    subtitle: "OSHA LOTO + SAP DM Lock",
    actor: "Plant Quality Manager",
    roleId: "Manager",
    route: "/manager",
    color: "#DC2626",
    badge: "Line Brake 1 Halted",
    telemetry: {
      status: "TOOL-B LOCKED OUT",
      statusColor: "#DC2626",
      reading: "RESTRICTED",
      spec: "Physical Tag Engaged",
      exposed: "100 Units Quarantined",
      action: "Mock S/4 Containment Sent",
    },
    detail: "Manager triggers digital Lockout/Tagout. Line Brake 1 halts, tool status switches to RESTRICTED, and immediate containment hold is dispatched to simulated S/4HANA.",
    codeSnippet: 'CONTAINMENT_DISPATCH: { target: "S/4HANA", action: "QUARANTINE_BATCH", batch: "BATCH-2026-10-31" }',
  },
  {
    id: "step4",
    time: "10:45 AM",
    phase: "STEP 4",
    title: "300-Unit Evidence Yard Trace",
    subtitle: "Deterministic Optical Yard",
    actor: "Traceability Analyst",
    roleId: "Quality",
    route: "/exposure/TS-0001",
    color: "#D97706",
    badge: "100 Affected in 72h",
    telemetry: {
      status: "EVIDENCE TRACE ACTIVE",
      statusColor: "#00E5FF",
      reading: "72h Window",
      spec: "90 Confirmed • 4 Probable • 6 Unknown",
      exposed: "40 Stock • 35 Dlr X • 25 Dlr Y",
      action: "Optical Block Refraction",
    },
    detail: "Evaluates 300 assemblies. In the 72h window, 100 units fan out into 40 Factory Stock, 35 Dealer X (Hindi notice), and 25 Dealer Y (Kannada notice).",
    codeSnippet: 'TRACE_RESULT: { window: 72, confirmed: 90, probable: 4, unknown: 6, dataQuality: 92 }',
  },
  {
    id: "step5",
    time: "10:48 AM",
    phase: "STEP 5",
    title: "Two-Person Verifier Gate",
    subtitle: "Independent Safety Sign-Off",
    actor: "Independent Verifier",
    roleId: "Verifier",
    route: "/verifier",
    color: "#059669",
    badge: "Verified Return to Service",
    telemetry: {
      status: "CALIBRATION PASSED",
      statusColor: "#059669",
      reading: "45.0 Nm",
      spec: "Tolerance Target Met",
      exposed: "0 Residual Risks",
      action: "Tool State: ACTIVE",
    },
    detail: "Technician repairs clutch and enters 45.0 Nm readings. Independent Verifier conducts two-person sign-off, unlocking the gate and returning Tool B to active production.",
    codeSnippet: 'GATE_VERIFICATION: { technician: "V21-TECH-2", verifier: "V21-VERIFIER", passed: true, toolState: "Active" }',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { setCurrentRole } = useStore();
  // Always show intro on fresh page load; sessionStorage flag only skips within same tab lifecycle
  const [showIntro, setShowIntro] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [simProgress, setSimProgress] = useState(0);

  const step = JOURNEY_STEPS[currentStepIndex];

  // Auto-advance journey simulation with visual progress beam
  useEffect(() => {
    if (!isPlaying) return;
    const progressInterval = setInterval(() => {
      setSimProgress((prev) => (prev < 100 ? prev + 2.5 : 0));
    }, 100);

    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % JOURNEY_STEPS.length);
      setSimProgress(0);
    }, 4000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [isPlaying]);

  const handleLaunch = (role, route) => {
    setCurrentRole(role);
    navigate(route);
  };

  const handleReplayIntro = () => {
    setShowIntro(true);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F0F6FF 0%, #E3EFFF 45%, #D6E8FA 100%)",
        color: "#0B1B33",
        fontFamily: "var(--font-sans)",
        position: "relative",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 8-Second Cinematic 3D Onboarding Intro Sequence */}
      {showIntro && (
        <IntroSequence
          onComplete={() => {
            setShowIntro(false);
          }}
        />
      )}

      {/* Repeating Industrial Tools Pattern Wallpaper (15% Opacity) */}
      <svg
        width="100%"
        height="100%"
        style={{
          position: "fixed",
          inset: 0,
          opacity: 0.16,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <defs>
          <pattern id="landing-pattern" width="180" height="180" patternUnits="userSpaceOnUse">
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
            <circle cx="90" cy="90" r="1.5" fill="#2B5B8C" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#landing-pattern)" />
      </svg>

      {/* Floating Cyan & Ruby Aurora Lights */}
      <div
        style={{
          position: "fixed",
          top: "-10%",
          left: "20%",
          width: "55vw",
          height: "45vh",
          background: "radial-gradient(circle, rgba(0, 229, 255, 0.28) 0%, transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "40%",
          right: "5%",
          width: "45vw",
          height: "45vh",
          background: "radial-gradient(circle, rgba(220, 38, 38, 0.18) 0%, transparent 70%)",
          filter: "blur(90px)",
          pointerEvents: "none",
        }}
      />

      {/* Header Bar */}
      <header
        style={{
          position: "relative",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 48px",
          maxWidth: "1600px",
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Unified ToolSathi Brand Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #00E5FF 0%, #0070F3 50%, #7C3AED 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              boxShadow: "0 8px 24px rgba(0, 229, 255, 0.55), 0 0 36px rgba(0, 112, 243, 0.35)",
              border: "1.5px solid rgba(255, 255, 255, 0.5)",
              flexShrink: 0,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 21 7 21 17 12 22 3 17 3 7" stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" />
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "28px", fontWeight: "900", color: "#0B1B33", letterSpacing: "-0.5px", lineHeight: 1 }}>
              ToolSathi
            </div>
            <div style={{ fontSize: "12px", fontWeight: "800", color: "#007A8C", letterSpacing: "1.4px", marginTop: "3px", fontFamily: "var(--font-mono, monospace)" }}>
              EVIDENCE LINE • INTELLIGENT MANUFACTURING CONTROL
            </div>
          </div>
        </div>

        {/* Action Controls & Replay 3D Intro */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={handleReplayIntro}
            style={{
              background: "#FFFFFF",
              border: "2px solid rgba(0, 229, 255, 0.5)",
              color: "#007A8C",
              padding: "10px 20px",
              borderRadius: "var(--radius-pill)",
              fontSize: "14px",
              fontWeight: "800",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 16px rgba(0, 229, 255, 0.25)",
            }}
          >
            <span>🎬 Replay 3D Cinematic Intro</span>
          </button>

          <Link
            to="/login"
            style={{
              background: "linear-gradient(135deg, #00A6B8 0%, #0070F3 100%)",
              color: "#FFFFFF",
              border: "none",
              padding: "11px 24px",
              borderRadius: "var(--radius-pill)",
              fontWeight: "800",
              fontSize: "14px",
              textDecoration: "none",
              boxShadow: "0 6px 20px rgba(0, 166, 184, 0.4)",
            }}
          >
            Role Login Portal ➔
          </Link>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "1600px",
          margin: "0 auto",
          padding: "10px 48px 40px",
          width: "100%",
          boxSizing: "border-box",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Top Hero Banner */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "26px",
            padding: "26px 36px",
            border: "2px solid rgba(0, 229, 255, 0.35)",
            boxShadow: "0 16px 48px rgba(11, 27, 51, 0.08), 0 0 32px rgba(0, 229, 255, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "800",
                  fontFamily: "var(--font-mono)",
                  background: "#FEF2F2",
                  color: "#DC2626",
                  padding: "5px 12px",
                  borderRadius: "var(--radius-pill)",
                  border: "1.5px solid #FCA5A5",
                }}
              >
                LIVE SAP HACKFEST SCENARIO • BRAKE LINE 1
              </span>
              <span style={{ fontSize: "14px", color: "#4A5A75", fontWeight: "700" }}>
                Active Incident TS-0001 • Pneumatic Torque Wrench TOOL-B
              </span>
            </div>
            <h1
              style={{
                fontSize: "clamp(34px, 3.6vw, 48px)",
                fontWeight: "900",
                letterSpacing: "-1.2px",
                margin: 0,
                color: "#0B1B33",
                lineHeight: 1.15,
              }}
            >
              Zero Blind Spots on the Factory Floor.
            </h1>
            <p style={{ margin: "8px 0 0", fontSize: "17px", color: "#334766", fontWeight: "600", maxWidth: "80ch" }}>
              Real-time multilingual operator voice intelligence, 300-unit isometric forward exposure tracing, and human-approved SAP S/4HANA quarantine.
            </p>
          </div>

          {/* Simulation Toggle & Indicator */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: isPlaying ? "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)" : "#FFFFFF",
                border: isPlaying ? "2px solid #F59E0B" : "2px solid rgba(11, 27, 51, 0.2)",
                color: isPlaying ? "#92400E" : "#0B1B33",
                padding: "12px 24px",
                borderRadius: "var(--radius-pill)",
                fontSize: "15px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: isPlaying ? "0 4px 20px rgba(245, 158, 11, 0.4)" : "0 4px 14px rgba(11, 27, 51, 0.08)",
                transition: "all 180ms ease",
              }}
            >
              {isPlaying ? (
                <>
                  <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#DC2626", animation: "blink 1s infinite" }} />
                  <span>⏸️ SIMULATION PLAYING (CLICK TO PAUSE)</span>
                </>
              ) : (
                <>
                  <span>▶️ PLAY AUTO-SIMULATION</span>
                </>
              )}
            </button>

            {isPlaying && (
              <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", fontWeight: "800", color: "#007A8C" }}>
                ADVANCING MILESTONE [{currentStepIndex + 1} / 5]
              </span>
            )}
          </div>
        </div>

        {/* Middle Stage: Left Interactive Journey & Right 3D Visualizer */}
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: "28px" }}>
          {/* Left Column: Color-Coded Glowing Milestone Cards */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "26px",
              padding: "28px",
              border: `2px solid ${step.color}`,
              boxShadow: `0 16px 44px rgba(11, 27, 51, 0.08), 0 0 32px ${step.color}25`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "border-color 300ms ease, box-shadow 300ms ease",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Simulation Progress Beam */}
            {isPlaying && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "4px",
                  width: `${simProgress}%`,
                  background: step.color,
                  boxShadow: `0 0 12px ${step.color}`,
                  transition: "width 100ms linear",
                }}
              />
            )}

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <span style={{ fontSize: "13px", fontWeight: "800", color: "#4A5A75", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  Interactive Incident Milestones:
                </span>
                <span
                  style={{
                    fontSize: "12.5px",
                    fontWeight: "800",
                    fontFamily: "var(--font-mono)",
                    color: step.color,
                    background: `${step.color}15`,
                    padding: "4px 12px",
                    borderRadius: "8px",
                    border: `1px solid ${step.color}40`,
                  }}
                >
                  {step.badge}
                </span>
              </div>

              {/* 5 Milestone Cards with Glowing Color Coding */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                {JOURNEY_STEPS.map((s, idx) => {
                  const isCurrent = idx === currentStepIndex;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setCurrentStepIndex(idx);
                        setIsPlaying(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 20px",
                        borderRadius: "16px",
                        background: isCurrent ? `${s.color}15` : "#F8FAFD",
                        border: isCurrent ? `2.5px solid ${s.color}` : "1.5px solid rgba(11, 27, 51, 0.08)",
                        cursor: "pointer",
                        boxShadow: isCurrent ? `0 6px 24px ${s.color}35` : "none",
                        transition: "all 160ms ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "10px",
                            background: isCurrent ? s.color : "#E2E8F0",
                            color: isCurrent ? "#FFFFFF" : "#64748B",
                            fontWeight: "900",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-mono)",
                            boxShadow: isCurrent ? `0 2px 10px ${s.color}60` : "none",
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: "16px", fontWeight: "900", color: "#0B1B33" }}>
                            {s.title}
                          </div>
                          <div style={{ fontSize: "13px", color: "#64748B", fontWeight: "600", marginTop: "2px" }}>
                            {s.subtitle} • <strong style={{ color: "#0B1B33" }}>{s.actor}</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "#0B1B33", fontWeight: "800" }}>
                          {s.time}
                        </span>
                        <span style={{ color: isCurrent ? s.color : "#94A3B8", fontWeight: "900", fontSize: "16px" }}>
                          ➔
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Phase Detail with Code Pill */}
              <div
                style={{
                  background: "#F1F5F9",
                  borderRadius: "18px",
                  padding: "20px 24px",
                  borderLeft: `6px solid ${step.color}`,
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: "800", color: step.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {step.phase} ARCHITECTURAL DETAIL:
                </div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#0B1B33", marginTop: "4px", lineHeight: 1.45 }}>
                  {step.detail}
                </div>
                <div
                  style={{
                    marginTop: "12px",
                    background: "#0B1B33",
                    color: "#38BDF8",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    fontSize: "12.5px",
                    fontFamily: "var(--font-mono)",
                    overflowX: "auto",
                  }}
                >
                  {step.codeSnippet}
                </div>
              </div>
            </div>

            {/* Jump Button */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "22px", paddingTop: "18px", borderTop: "1px solid rgba(11, 27, 51, 0.08)" }}>
              <span style={{ fontSize: "14px", fontWeight: "800", color: "#334766" }}>
                Test this operational phase live:
              </span>
              <button
                onClick={() => handleLaunch(step.roleId, step.route)}
                style={{
                  background: step.color,
                  color: "#FFFFFF",
                  border: "none",
                  padding: "12px 26px",
                  borderRadius: "var(--radius-pill)",
                  fontWeight: "900",
                  fontSize: "14.5px",
                  cursor: "pointer",
                  boxShadow: `0 6px 20px ${step.color}60`,
                }}
              >
                Enter {step.title} ➔
              </button>
            </div>
          </div>

          {/* Right Column: 3D Digital Twin Inspection Station & Live Telemetry */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "26px",
              padding: "28px",
              border: "2.5px solid rgba(0, 229, 255, 0.4)",
              boxShadow: "0 20px 54px rgba(11, 27, 51, 0.09), 0 0 36px rgba(0, 229, 255, 0.2)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              {/* Telemetry Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: step.telemetry.statusColor,
                      boxShadow: `0 0 12px ${step.telemetry.statusColor}`,
                    }}
                  />
                  <span style={{ fontSize: "14.5px", fontWeight: "900", color: "#0B1B33", letterSpacing: "0.5px" }}>
                    TOOL-B DIGITAL TWIN • LINE BRAKE 1
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    fontFamily: "var(--font-mono)",
                    fontWeight: "900",
                    color: step.telemetry.statusColor,
                    background: `${step.telemetry.statusColor}15`,
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: `1.5px solid ${step.telemetry.statusColor}40`,
                  }}
                >
                  {step.telemetry.status}
                </span>
              </div>

              {/* 3D Visualizer Canvas */}
              <div
                style={{
                  position: "relative",
                  height: "310px",
                  background: "linear-gradient(180deg, #F8FAFD 0%, #EBF4FC 100%)",
                  borderRadius: "22px",
                  border: "2px solid rgba(11, 27, 51, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {/* Precision Grid */}
                <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.18 }}>
                  <defs>
                    <pattern id="station-grid-2" width="28" height="28" patternUnits="userSpaceOnUse">
                      <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#0070F3" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#station-grid-2)" />
                </svg>

                {/* Saturated Ruby Shockwave Pulse */}
                {(step.id === "step1" || step.id === "step2" || step.id === "step3") && (
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "45%",
                      width: "140px",
                      height: "140px",
                      borderRadius: "50%",
                      border: "3px solid #DC2626",
                      transform: "translate(-50%, -50%)",
                      animation: "shockwavePulse 2.2s ease-out infinite",
                    }}
                  />
                )}

                {/* 3D Pneumatic Torque Wrench Outline */}
                <svg viewBox="0 0 340 200" width="90%" height="90%">
                  <g stroke="#0B1B33" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="25" y="55" width="45" height="38" rx="4" fill="#FFFFFF" />
                    <path d="M 8 74 L 25 74" strokeWidth="5.5" stroke="#00A6B8" />
                    <rect x="70" y="50" width="80" height="48" rx="5" fill="#FFFFFF" />
                    <rect
                      x="150"
                      y="55"
                      width="50"
                      height="38"
                      rx="3"
                      stroke={step.id === "step5" ? "#059669" : "#DC2626"}
                      strokeWidth="3"
                      fill={step.id === "step5" ? "#DCFCE7" : "#FEF2F2"}
                    />
                    <circle cx="175" cy="74" r="10" stroke={step.id === "step5" ? "#059669" : "#DC2626"} strokeWidth="2.5" strokeDasharray="3 3" />
                    <rect x="200" y="60" width="80" height="28" rx="4" fill="#FFFFFF" />
                    <path d="M 280 74 C 305 74, 310 98, 295 128 L 280 148" stroke="#0B1B33" strokeWidth="3.5" />
                    <rect x="80" y="62" width="60" height="24" rx="3" fill="#0B1B33" />
                    <text x="88" y="78" fontSize="12" fontWeight="900" fill="#FFFFFF" fontFamily="IBM Plex Mono">
                      TOOL-B
                    </text>
                  </g>

                  {/* 3D Lockout Tag hanging when in Step 3 or 4 */}
                  {(step.id === "step3" || step.id === "step4") && (
                    <g transform="translate(145, 120)">
                      <line x1="15" y1="0" x2="15" y2="24" stroke="#DC2626" strokeWidth="3" />
                      <circle cx="15" cy="24" r="3.5" fill="#DC2626" />
                      <rect x="-8" y="24" width="46" height="66" rx="4" fill="#DC2626" stroke="#991B1B" strokeWidth="2" />
                      <rect x="-4" y="28" width="38" height="18" rx="2" fill="#FFFFFF" />
                      <text x="15" y="38" fontSize="7" fontWeight="900" fill="#DC2626" textAnchor="middle" fontFamily="IBM Plex Sans">
                        DANGER
                      </text>
                      <text x="15" y="44" fontSize="5" fontWeight="800" fill="#0B1B33" textAnchor="middle" fontFamily="IBM Plex Sans">
                        LOCKED OUT
                      </text>
                      <rect x="-4" y="48" width="38" height="36" rx="2" fill="#FFFFFF" fillOpacity="0.95" />
                      <text x="15" y="58" fontSize="6" fontWeight="900" fill="#991B1B" textAnchor="middle" fontFamily="IBM Plex Mono">
                        DO NOT
                      </text>
                      <text x="15" y="66" fontSize="6" fontWeight="900" fill="#991B1B" textAnchor="middle" fontFamily="IBM Plex Mono">
                        OPERATE
                      </text>
                    </g>
                  )}
                </svg>

                {/* Live Action Pill */}
                <div
                  style={{
                    position: "absolute",
                    top: "14px",
                    left: "14px",
                    background: "#FFFFFF",
                    border: "1.5px solid rgba(11, 27, 51, 0.18)",
                    padding: "7px 16px",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "13px",
                    fontWeight: "900",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(11, 27, 51, 0.1)",
                  }}
                >
                  <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: step.color }} />
                  <span>ACTION: {step.telemetry.action}</span>
                </div>
              </div>

              {/* Big Telemetry Numbers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "18px" }}>
                <div style={{ background: "#F8FAFD", border: "1.5px solid rgba(11, 27, 51, 0.1)", padding: "14px 16px", borderRadius: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#4A5A75", textTransform: "uppercase" }}>CALIBRATION READING</div>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: step.telemetry.statusColor, fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    {step.telemetry.reading}
                  </div>
                  <div style={{ fontSize: "12px", color: "#4A5A75", fontWeight: "600" }}>Target: {step.telemetry.spec}</div>
                </div>

                <div style={{ background: "#F8FAFD", border: "1.5px solid rgba(11, 27, 51, 0.1)", padding: "14px 16px", borderRadius: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#4A5A75", textTransform: "uppercase" }}>POTENTIALLY EXPOSED</div>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#0B1B33", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    {step.telemetry.exposed}
                  </div>
                  <div style={{ fontSize: "12px", color: "#4A5A75", fontWeight: "600" }}>Deterministic Window</div>
                </div>

                <div style={{ background: "#F8FAFD", border: "1.5px solid rgba(11, 27, 51, 0.1)", padding: "14px 16px", borderRadius: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#4A5A75", textTransform: "uppercase" }}>AUDIT TRAIL</div>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#059669", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    APPENDED
                  </div>
                  <div style={{ fontSize: "12px", color: "#4A5A75", fontWeight: "600" }}>Immutable ledger hash</div>
                </div>
              </div>
            </div>

            {/* Direct Link into 300-Unit Evidence Yard */}
            <div style={{ marginTop: "18px" }}>
              <button
                onClick={() => handleLaunch("Quality", "/exposure/TS-0001")}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #00A6B8 0%, #0070F3 100%)",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "14px",
                  borderRadius: "16px",
                  fontWeight: "900",
                  fontSize: "15px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  boxShadow: "0 6px 20px rgba(0, 166, 184, 0.45)",
                }}
              >
                <span>🔬 View Full 300-Unit Evidence Yard Breakdown ➔</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3-Lane Factory Breakdown Preview */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "22px",
            padding: "24px 36px",
            border: "2px solid rgba(0, 229, 255, 0.3)",
            boxShadow: "0 12px 36px rgba(11, 27, 51, 0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", fontWeight: "800", color: "#4A5A75", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              DESTINATION BREAKDOWN (72-HOUR BENCHMARK):
            </div>
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#0B1B33", marginTop: "2px" }}>
              100 Potentially Exposed Units Fanned Across 3 Factory Lanes
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ background: "#F0FDF4", padding: "12px 20px", borderRadius: "14px", border: "1.5px solid #86EFAC" }}>
              <span style={{ fontSize: "13px", color: "#166534", fontWeight: "800" }}>FACTORY STOCK:</span>
              <strong style={{ fontSize: "20px", color: "#166534", marginLeft: "10px", fontFamily: "var(--font-mono)" }}>40 UNITS</strong>
              <small style={{ display: "block", fontSize: "11.5px", color: "#15803D", fontWeight: "600" }}>✓ Immediate on-site quarantine hold</small>
            </div>

            <div style={{ background: "#FEF3C7", padding: "12px 20px", borderRadius: "14px", border: "1.5px solid #FCD34D" }}>
              <span style={{ fontSize: "13px", color: "#92400E", fontWeight: "800" }}>DEALER X (NORTH):</span>
              <strong style={{ fontSize: "20px", color: "#92400E", marginLeft: "10px", fontFamily: "var(--font-mono)" }}>35 UNITS</strong>
              <small style={{ display: "block", fontSize: "11.5px", color: "#B45309", fontWeight: "600" }}>⚡ Hindi dealer notification drafted</small>
            </div>

            <div style={{ background: "#FEF2F2", padding: "12px 20px", borderRadius: "14px", border: "1.5px solid #FCA5A5" }}>
              <span style={{ fontSize: "13px", color: "#991B1B", fontWeight: "800" }}>DEALER Y (SOUTH):</span>
              <strong style={{ fontSize: "20px", color: "#991B1B", marginLeft: "10px", fontFamily: "var(--font-mono)" }}>25 UNITS</strong>
              <small style={{ display: "block", fontSize: "11.5px", color: "#B91C1C", fontWeight: "600" }}>⚠️ Kannada notice + 1 stale shipment flagged</small>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes shockwavePulse {
          0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
