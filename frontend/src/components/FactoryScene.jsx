import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "../state/store";

export default function FactoryScene() {
  const location = useLocation();
  const { toolState: storeToolState, activeIncident } = useStore();
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const handleVisibility = () => setIsTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setPointer({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [reducedMotion]);

  const path = location.pathname;
  let zone = "tower";
  if (path.includes("/worker")) zone = "intake";
  else if (path.includes("/manager") || path.includes("/issues")) zone = "tower";
  else if (path.includes("/exposure") || path.includes("/console")) zone = "tower";
  else if (path.includes("/technician")) zone = "bench";
  else if (path.includes("/verifier")) zone = "gate";
  else if (path.includes("/admin")) zone = "vault";

  let toolState = "active";
  if (storeToolState === "Restricted" || storeToolState === "RESTRICTED") toolState = "restricted";
  else if (storeToolState === "Repairing" || storeToolState === "IN_REPAIR") toolState = "repairing";
  else if (storeToolState === "Awaiting Verification" || storeToolState === "AWAITING_VERIFICATION") toolState = "awaiting";
  else if (storeToolState === "Verified" || (storeToolState === "Active" && activeIncident?.status === "Closed")) toolState = "verified";
  else if (activeIncident?.status === "Assigned") toolState = "assigned";
  else if (activeIncident?.status === "Reported" || activeIncident?.status === "Under Review") toolState = "reported";

  const cameraTransforms = {
    intake: "scale(1.08) translate(8%, 6%) rotate(-0.3deg)",
    tower: "scale(1.0) translate(0%, 0%) rotate(0deg)",
    bench: "scale(1.1) translate(-6%, 5%) rotate(0.5deg)",
    gate: "scale(1.05) translate(0%, -5%) rotate(0deg)",
    vault: "scale(1.02) translate(10%, -2%) rotate(-0.4deg)",
  };

  const cameraStyle = {
    transform: reducedMotion
      ? "none"
      : `${cameraTransforms[zone] || "none"} translate(${pointer.x * 5}px, ${pointer.y * 5}px)`,
    transition: reducedMotion ? "none" : "transform 800ms cubic-bezier(0.2, 0.8, 0.25, 1)",
  };

  return (
    <div
      className="factory-scene-root"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        background: "linear-gradient(180deg, #F0F6FF 0%, #E6F0FC 40%, #D8E8FA 100%)",
      }}
      aria-hidden="true"
    >
      {/* Soft Ambient Aurora Lights */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "15%",
          width: "55vw",
          height: "40vh",
          background: "radial-gradient(circle, rgba(165, 224, 255, 0.5) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "5%",
          right: "10%",
          width: "50vw",
          height: "45vh",
          background: "radial-gradient(circle, rgba(255, 230, 220, 0.4) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "-5%",
          width: "40vw",
          height: "40vh",
          background: "radial-gradient(circle, rgba(220, 215, 255, 0.35) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Layer 1: Repeating Small Industrial Tools Pattern Wallpaper (Low opacity, clearly visible) */}
      <svg
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.16,
        }}
      >
        <defs>
          <pattern id="small-tools-pattern" width="180" height="180" patternUnits="userSpaceOnUse">
            {/* 1. Small Torque Wrench */}
            <g transform="translate(20, 20) scale(0.7)" stroke="#2B5B8C" strokeWidth="1.8" fill="none">
              <rect x="0" y="8" width="14" height="10" rx="1.5" />
              <line x1="0" y1="13" x2="-6" y2="13" strokeWidth="2.5" />
              <rect x="14" y="6" width="22" height="14" rx="2" />
              <rect x="36" y="8" width="28" height="10" rx="1.5" />
              <path d="M 64 13 L 74 24 C 76 27, 74 30, 70 30" />
            </g>

            {/* 2. Small Hex Nut & Bolt */}
            <g transform="translate(130, 25) scale(0.65)" stroke="#2B5B8C" strokeWidth="1.8" fill="none">
              <polygon points="15,0 30,8.6 30,26 15,34.6 0,26 0,8.6" />
              <circle cx="15" cy="17.3" r="7" />
            </g>

            {/* 3. Small Caliper / Measuring Tool */}
            <g transform="translate(25, 110) scale(0.65)" stroke="#2B5B8C" strokeWidth="1.8" fill="none">
              <rect x="0" y="0" width="60" height="8" rx="1" />
              <line x1="10" y1="8" x2="10" y2="18" strokeWidth="2" />
              <line x1="30" y1="8" x2="30" y2="18" strokeWidth="2" />
              <path d="M 5 0 L 5 -12 M 25 0 L 25 -12" strokeWidth="2" />
            </g>

            {/* 4. Small Planetary Gear Cog */}
            <g transform="translate(125, 110) scale(0.65)" stroke="#2B5B8C" strokeWidth="1.8" fill="none">
              <circle cx="20" cy="20" r="14" />
              <circle cx="20" cy="20" r="5" />
              <line x1="20" y1="2" x2="20" y2="6" strokeWidth="3" />
              <line x1="20" y1="34" x2="20" y2="38" strokeWidth="3" />
              <line x1="2" y1="20" x2="6" y2="20" strokeWidth="3" />
              <line x1="34" y1="20" x2="38" y2="20" strokeWidth="3" />
              <line x1="7" y1="7" x2="10" y2="10" strokeWidth="3" />
              <line x1="30" y1="30" x2="33" y2="33" strokeWidth="3" />
              <line x1="7" y1="33" x2="10" y2="30" strokeWidth="3" />
              <line x1="30" y1="10" x2="33" y2="7" strokeWidth="3" />
            </g>

            {/* Subtle Crosshair alignment dots */}
            <circle cx="90" cy="90" r="1.5" fill="#2B5B8C" opacity="0.6" />
            <circle cx="0" cy="0" r="1.5" fill="#2B5B8C" opacity="0.4" />
            <circle cx="180" cy="180" r="1.5" fill="#2B5B8C" opacity="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#small-tools-pattern)" />
      </svg>

      {/* Camera Glide Container */}
      <div
        className="factory-camera-viewport"
        style={{
          position: "absolute",
          inset: 0,
          willChange: "transform",
          ...cameraStyle,
        }}
      >
        {/* Layer 2: Subtle Factory Conveyor Line at the Bottom (9% opacity) */}
        <svg
          viewBox="0 0 1600 900"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid slice"
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.10,
          }}
        >
          <path
            d="M -100 620 L 1700 620"
            stroke="#0B1B33"
            strokeWidth="3"
            strokeDasharray={isTabVisible && !reducedMotion ? (toolState === "restricted" ? "8 16" : "12 12") : "none"}
            style={{
              animation: isTabVisible && !reducedMotion ? (toolState === "restricted" ? "conveyorSlow 6s linear infinite" : "conveyorNormal 2.5s linear infinite") : "none",
            }}
          />
          <path d="M -100 635 L 1700 635" stroke="#0B1B33" strokeWidth="1.5" strokeOpacity="0.4" />
          <line x1="240" y1="620" x2="240" y2="900" stroke="#0B1B33" strokeWidth="2.5" />
          <line x1="800" y1="620" x2="800" y2="900" stroke="#0B1B33" strokeWidth="2.5" />
          <line x1="1360" y1="620" x2="1360" y2="900" stroke="#0B1B33" strokeWidth="2.5" />
        </svg>

        {/* Layer 3: Reactive Tool B Focal Indicator (Pneumatic Torque Wrench with Reactive Glow) */}
        <div
          className={`tool-b-focal-node tool-b-state--${toolState}`}
          style={{
            position: "absolute",
            right: "5%",
            top: "14%",
            width: "320px",
            height: "240px",
            pointerEvents: "none",
            transition: "all 600ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <svg viewBox="0 0 340 260" width="100%" height="100%">
            {/* Reactive Shockwave when Restricted or Reported */}
            {toolState === "restricted" && (
              <circle
                cx="150"
                cy="120"
                r="100"
                fill="none"
                stroke="#DC2626"
                strokeWidth="2.5"
                opacity="0.35"
                style={{ animation: "shockwavePulse 2.4s ease-out infinite" }}
              />
            )}
            {toolState === "reported" && (
              <circle
                cx="150"
                cy="120"
                r="90"
                fill="none"
                stroke="#D97706"
                strokeWidth="2"
                opacity="0.35"
                style={{ animation: "shockwavePulse 3s ease-out infinite" }}
              />
            )}

            {/* Tool B Outline */}
            <g
              transform="translate(40, 50)"
              stroke={
                toolState === "restricted"
                  ? "#DC2626"
                  : toolState === "reported"
                  ? "#D97706"
                  : toolState === "assigned"
                  ? "#0284C7"
                  : toolState === "verified"
                  ? "#059669"
                  : "#3B5B8C"
              }
              strokeWidth="2"
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.85"
            >
              <rect x="20" y="45" width="35" height="30" rx="3" fill="#FFFFFF" fillOpacity="0.7" />
              <path d="M 5 60 L 20 60" strokeWidth="4" />
              <rect x="55" y="40" width="70" height="40" rx="4" />
              <rect x="125" y="44" width="40" height="32" rx="2" strokeDasharray="3 3" />
              <rect x="165" y="48" width="80" height="24" rx="3" />
              <path d="M 245 60 C 270 60, 275 80, 260 110 L 245 135 C 240 145, 230 150, 220 150" />
              <rect x="70" y="50" width="45" height="18" rx="2" fill="#FFFFFF" fillOpacity="0.9" />
              <text x="74" y="63" fontSize="9" fontWeight="800" fill="#0B1B33" stroke="none" fontFamily="IBM Plex Mono">
                TOOL-B
              </text>
            </g>

            {/* 3D OSHA Lockout Tag hanging when Restricted */}
            {toolState === "restricted" && (
              <g
                transform="translate(130, 115)"
                style={{
                  transformOrigin: "130px 115px",
                  animation: !reducedMotion ? "lotoSwing 3.5s ease-in-out infinite alternate" : "none",
                }}
              >
                <line x1="15" y1="0" x2="15" y2="24" stroke="#DC2626" strokeWidth="2.5" />
                <circle cx="15" cy="24" r="3" fill="#DC2626" />
                <rect x="-8" y="24" width="46" height="66" rx="4" fill="#DC2626" stroke="#991B1B" strokeWidth="1.5" />
                <rect x="-4" y="28" width="38" height="18" rx="2" fill="#FFFFFF" />
                <text x="15" y="38" fontSize="6.5" fontWeight="900" fill="#DC2626" textAnchor="middle" fontFamily="IBM Plex Sans">
                  DANGER
                </text>
                <text x="15" y="44" fontSize="4.5" fontWeight="800" fill="#0B1B33" textAnchor="middle" fontFamily="IBM Plex Sans">
                  LOCKED OUT
                </text>
                <rect x="-4" y="48" width="38" height="36" rx="2" fill="#FFFFFF" fillOpacity="0.95" />
                <text x="15" y="58" fontSize="5.5" fontWeight="800" fill="#991B1B" textAnchor="middle" fontFamily="IBM Plex Mono">
                  DO NOT
                </text>
                <text x="15" y="66" fontSize="5.5" fontWeight="800" fill="#991B1B" textAnchor="middle" fontFamily="IBM Plex Mono">
                  OPERATE
                </text>
                <text x="15" y="76" fontSize="4.5" fontWeight="700" fill="#4A5A75" textAnchor="middle" fontFamily="IBM Plex Sans">
                  MGR SIGNED
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes conveyorNormal {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -48; }
        }
        @keyframes conveyorSlow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -48; }
        }
        @keyframes shockwavePulse {
          0% { transform: scale(0.9); opacity: 0.5; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes lotoSwing {
          0% { transform: rotate(-10deg); }
          50% { transform: rotate(12deg); }
          100% { transform: rotate(-8deg); }
        }
      `}</style>
    </div>
  );
}
