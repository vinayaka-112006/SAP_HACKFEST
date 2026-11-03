import React from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/store";
import { homeFor } from "../components/AppShell";
import Logo from "../components/Logo";
import { Icon } from "../components/ui";
import "../styles/v23.css";

const pillars = [
  { icon: "wrench", title: "Maintenance", text: "Qualified technician matching, spare-parts checks and reviewed repair guidance on the same incident record." },
  { icon: "workforce", title: "Workforce continuity", text: "Affected operators move to eligible stations under policy or manager approval, with results returned for review." },
  { icon: "shield", title: "Quality & traceability", text: "Deterministic tool-use tracing links finished units, batches, stock and shipments to one investigated fault." },
];
const steps = [
  ["Capture", "QR-selected equipment, voice or typed report, worker confirmation."],
  ["Understand", "Kannada, Hindi and English speech, structured fault facts and clarification."],
  ["Trace", "Deterministic windows over production runs, batches and serials."],
  ["Respond", "Repair, workforce continuity and quality review from one incident."],
  ["Verify", "Independent verification, audited return to service, evidence downloads."],
];

function Robot() {
  return (
    <div className="v23-robot" aria-hidden="true">
      <div className="v23-ring r1" />
      <div className="v23-ring r2" />
      <div className="v23-ring r3" />
      <svg className="v23-arm" viewBox="0 0 320 320" role="img" aria-label="Industrial robot arm illustration">
        <defs>
          <linearGradient id="armMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d9f6ff" />
            <stop offset="0.45" stopColor="#7fd8ef" />
            <stop offset="1" stopColor="#2b8ba4" />
          </linearGradient>
          <linearGradient id="armDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#183049" />
            <stop offset="1" stopColor="#0a1826" />
          </linearGradient>
        </defs>
        <ellipse cx="160" cy="286" rx="104" ry="16" fill="rgba(34,211,238,.16)" />
        <rect x="96" y="252" width="128" height="26" rx="10" fill="url(#armDark)" stroke="#2f5b71" />
        <circle cx="160" cy="238" r="22" fill="url(#armMetal)" opacity="0.9" />
        <rect x="120" y="120" width="34" height="122" rx="16" fill="url(#armMetal)" transform="rotate(-16 137 181)" />
        <circle cx="130" cy="128" r="20" fill="#0e2336" stroke="#59c9e2" strokeWidth="3" />
        <rect x="126" y="58" width="28" height="86" rx="14" fill="url(#armMetal)" transform="rotate(30 140 101)" />
        <circle cx="158" cy="66" r="17" fill="#0e2336" stroke="#59c9e2" strokeWidth="3" />
        <rect x="150" y="26" width="52" height="18" rx="8" fill="url(#armDark)" stroke="#59c9e2" strokeWidth="2" transform="rotate(18 176 35)" />
        <path d="M196 44 l26 -12 l8 16 l-26 12 z" fill="url(#armMetal)" />
        <circle cx="160" cy="238" r="8" fill="#04212b" />
        <circle cx="130" cy="128" r="7" fill="#22d3ee" opacity="0.9" />
        <circle cx="158" cy="66" r="6" fill="#2dd4bf" opacity="0.9" />
        <g stroke="#7fe9ff" strokeWidth="1.6" opacity="0.55">
          <path d="M60 210 h34" /><path d="M60 196 h22" /><path d="M232 120 h30" /><path d="M232 106 h18" />
        </g>
      </svg>
      <span className="v23-float-chip" style={{ top: "8%", left: "2%" }}>TRACE 72h · 100 units</span>
      <span className="v23-float-chip" style={{ bottom: "16%", right: "-2%", animationDelay: "1.2s" }}>Groq · RAG grounded</span>
      <span className="v23-float-chip" style={{ bottom: "2%", left: "8%", animationDelay: "2.1s" }}>Kannada · Hindi · English</span>
    </div>
  );
}

export default function Landing() {
  const { currentRole } = useStore();
  return (
    <div className="v23-landing">
      <header className="v23-landing-nav">
        <Link to="/" className="v23-brand" style={{ padding: 0, textDecoration: "none" }}>
          <span className="v23-brand-mark"><Logo size={24} variant="mark" /></span>
          <span><strong>ToolSathi</strong><small>Intelligent manufacturing</small></span>
        </Link>
        <div className="links">
          <a href="#workflow" style={{ color: "#cfe6f3" }}>Workflow</a>
          <a href="#pillars" style={{ color: "#cfe6f3" }}>Capabilities</a>
          <Link to="/login" className="v23-btn ghost sm">Sign in</Link>
          <Link to="/register" className="v23-btn primary sm">Create account</Link>
        </div>
      </header>

      <section className="v23-hero">
        <div>
          <span className="v23-eyebrow"><Icon name="factory" size={13} /> Manufacturing incident intelligence</span>
          <h1>From a shop-floor voice note to an <em>evidence-backed factory decision</em>.</h1>
          <p className="lead">
            ToolSathi links multilingual incident capture, deterministic product traceability, qualified repair,
            workforce continuity and independent quality verification on one auditable incident record.
          </p>
          <div className="v23-cta">
            <Link to="/worker" className="v23-btn primary"><Icon name="mic" size={17} /> Report a problem</Link>
            <Link to={homeFor(currentRole)} className="v23-btn"><Icon name="dashboard" size={17} /> Enter {currentRole} dashboard</Link>
          </div>
          <div className="v23-hero-stats">
            <div><strong>3 languages</strong><span>Kannada · Hindi · English</span></div>
            <div><strong>Deterministic</strong><span>Trace with record gaps</span></div>
            <div><strong>Human verified</strong><span>Repair → independent return</span></div>
            <div><strong>Audited</strong><span>Every state change</span></div>
          </div>
        </div>
        <Robot />
      </section>

      <section className="v23-section" id="pillars">
        <h2>One incident, three coordinated responses</h2>
        <p>The same confirmed report drives maintenance, workforce continuity and product-quality review. No parallel applications, no duplicated records.</p>
        <div className="v23-grid cols-3">
          {pillars.map((pillar) => (
            <article className="v23-card" key={pillar.title}>
              <div className="v23-pillar">
                <span className="v23-icon-tile"><Icon name={pillar.icon} size={20} /></span>
                <h3>{pillar.title}</h3>
                <p className="v23-muted" style={{ margin: 0 }}>{pillar.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="v23-section" id="workflow">
        <h2>The lifecycle this platform actually runs</h2>
        <p>Capture, understanding, traceability, response and verification are implemented workflows with server-side authorization — not slides.</p>
        <div className="v23-steps">
          {steps.map(([title, text]) => (
            <div className="v23-step" key={title}><strong>{title}</strong><span>{text}</span></div>
          ))}
        </div>
      </section>

      <section className="v23-section">
        <div className="v23-card" style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ marginBottom: 6 }}>Ready to see a real incident move end to end?</h2>
            <p className="v23-muted" style={{ margin: 0 }}>Open the manager dashboard and follow a seeded fault from review to verified return to service.</p>
          </div>
          <div className="v23-actions">
            <Link to="/manager" className="v23-btn primary">Manager dashboard <Icon name="arrowRight" size={16} /></Link>
            <Link to="/issues" className="v23-btn">Browse issues</Link>
          </div>
        </div>
      </section>

      <footer className="v23-footer">
        <span>ToolSathi · synthetic manufacturing data · simulated SAP S/4HANA &amp; Digital Manufacturing</span>
        <span>Deterministic trace · human-approved quality decisions</span>
      </footer>
    </div>
  );
}
