import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { useLocale, LanguageSelector } from "../features/v2/locale";
import { Icon, Avatar, Chip } from "./ui";
import FactoryScene from "./FactoryScene";
import RoleDock from "./RoleDock";
import StoryRail from "./StoryRail";

const homes = {
  Worker: "/worker",
  Manager: "/manager",
  Technician: "/technician",
  Verifier: "/verifier",
  Quality: "/exposure/V22-INC-01",
  Administrator: "/admin",
};

export const homeFor = (role) => homes[role] || "/worker";

export default function AppShell({ children }) {
  const { currentRole, demoUserId, apiConfig, demoIdentities } = useStore();
  const location = useLocation();
  const identity = demoIdentities.find((item) => item.userId === demoUserId);

  return (
    <div
      className="factory-shell-root"
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        color: "var(--ink)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* 1. Persistent 5-Zone Factory Scene Canvas */}
      <FactoryScene />

      {/* 2. Floating Glass Role Dock (Top Navigation) */}
      <RoleDock />

      {/* 3. Main Viewport Area */}
      <main
        className="factory-viewport"
        id="main-content"
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          paddingTop: "76px",
          paddingBottom: "80px",
          boxSizing: "border-box",
          maxWidth: "1520px",
          margin: "0 auto",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
      >
        {children}
      </main>

      {/* 4. Floating Story Rail (Bottom Progression) */}
      <StoryRail />
    </div>
  );
}

export function PageHead({ title, description, actions, chips }) {
  return (
    <header
      className="glass-dense specular-rim"
      style={{
        padding: "20px 24px",
        marginBottom: "20px",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px",
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: "24px",
            fontWeight: "800",
            color: "var(--ink)",
            letterSpacing: "-0.4px",
            fontFamily: "var(--font-sans)",
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{
              margin: "5px 0 0",
              fontSize: "14.5px",
              fontWeight: "500",
              color: "var(--ink-soft)",
              lineHeight: 1.4,
            }}
          >
            {description}
          </p>
        )}
        {chips && (
          <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
            {chips.map((chip) => (
              <span
                key={chip}
                className="glass-l1"
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  fontFamily: "var(--font-mono)",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--ink-secondary)",
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {actions}
        </div>
      )}
    </header>
  );
}
