import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { useLocale } from "../features/v2/locale";
import { homeFor } from "../components/AppShell";
import Logo from "../components/Logo";
import { Avatar, Chip, Field, Icon } from "../components/ui";
import "../styles/v23.css";

const ROLES = ["Worker", "Manager", "Technician", "Verifier", "Quality", "Administrator"];
const roleOrder = (role) => Math.max(0, ROLES.indexOf(role));

export default function Login() {
  const { apiConfig, demoIdentities, demoUserId, setDemoUserId, currentRole, setCurrentRole } = useStore();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [selected, setSelected] = useState(demoUserId || "");
  const [error, setError] = useState("");

  const accounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (demoIdentities || [])
      .filter((identity) => (role ? identity.role === role : true))
      .filter((identity) => !query || [identity.displayName, identity.userId, identity.workCenter].some((value) => String(value || "").toLowerCase().includes(query)))
      .sort((a, b) => roleOrder(a.role) - roleOrder(b.role) || a.displayName.localeCompare(b.displayName));
  }, [demoIdentities, search, role]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const account of accounts) {
      if (!map.has(account.role)) map.set(account.role, []);
      map.get(account.role).push(account);
    }
    return [...map.entries()];
  }, [accounts]);

  const chosen = (demoIdentities || []).find((identity) => identity.userId === selected);

  function enter(identity) {
    if (!identity) { setError("Choose a development account to continue."); return; }
    setDemoUserId(identity.userId);
    setCurrentRole(identity.role);
    sessionStorage.setItem("toolsathi.demoRole", identity.role);
    sessionStorage.setItem("toolsathi.demoUser", identity.userId);
    navigate(homeFor(identity.role));
  }

  return (
    <div className="v23-root">
      <div className="v23-auth">
        <aside className="v23-auth-art">
          <Link to="/" className="v23-brand" style={{ padding: 0, textDecoration: "none" }}>
            <span className="v23-brand-mark"><Logo size={24} variant="mark" /></span>
            <span><strong>ToolSathi</strong><small>Intelligent manufacturing</small></span>
          </Link>
          <div>
            <h2 style={{ fontSize: 32, lineHeight: 1.15, letterSpacing: "-0.03em", margin: "0 0 12px", color: "#fff" }}>
              One accountable record for every shop-floor fault.
            </h2>
            <p className="v23-muted" style={{ maxWidth: "46ch" }}>
              Sign in to your role dashboard to capture, review, repair, trace and verify manufacturing incidents.
            </p>
            <div className="v23-grid" style={{ marginTop: 28, gap: 10 }}>
              {["Server-side role checks on every action", "Independent verification before return to service", "Append-only application audit history"].map((line) => (
                <span key={line} style={{ display: "flex", gap: 9, alignItems: "center", color: "#cfe6f3", fontSize: 14 }}>
                  <Icon name="check" size={16} /> {line}
                </span>
              ))}
            </div>
          </div>
          <p className="v23-faint">Synthetic manufacturing data · simulated SAP integrations</p>
        </aside>

        <section className="v23-auth-form">
          <div className="v23-card">
            <h1 style={{ margin: 0, fontSize: 26, color: "#fff" }}>Sign in</h1>
            <p className="v23-faint" style={{ marginTop: 6 }}>
              {apiConfig.demoMode
                ? "This build runs in local demonstration mode. Accounts below are seeded synthetic identities; a role is never granted by selection alone."
                : "Production sign-in uses the deployed identity provider (SAP XSUAA)."}
            </p>

            {!apiConfig.demoMode ? (
              <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                <p className="v23-muted">Continue with your verified organisational account.</p>
                <Link className="v23-btn primary" to={homeFor(currentRole)}>Continue to {currentRole} dashboard</Link>
              </div>
            ) : (
              <>
                <div className="v23-grid" style={{ gap: 12, marginTop: 18 }}>
                  <Field label="Search accounts">
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, account ID or work center" autoComplete="off" />
                  </Field>
                  <div className="v23-actions" role="group" aria-label="Filter by role">
                    <button type="button" className="v23-btn sm" aria-pressed={role === ""} onClick={() => setRole("")} style={role === "" ? { background: "#22d3ee", color: "#04212b" } : undefined}>All</button>
                    {ROLES.map((item) => (
                      <button key={item} type="button" className="v23-btn sm" aria-pressed={role === item} onClick={() => setRole(item)}
                        style={role === item ? { background: "#22d3ee", color: "#04212b" } : undefined}>{item}</button>
                    ))}
                  </div>
                </div>

                <div className="v23-account-list" role="listbox" aria-label="Development accounts" style={{ marginTop: 14 }}>
                  {groups.length === 0 && <p className="v23-faint">No seeded account matches this filter.</p>}
                  {groups.map(([groupRole, items]) => (
                    <React.Fragment key={groupRole}>
                      <span className="v23-nav-label" style={{ margin: "8px 4px 2px" }}>{groupRole} · {items.length}</span>
                      {items.map((identity) => (
                        <button key={identity.userId} type="button" className="v23-account" role="option"
                          aria-selected={selected === identity.userId} aria-pressed={selected === identity.userId}
                          onClick={() => { setSelected(identity.userId); setError(""); }}>
                          <Avatar name={identity.displayName} />
                          <span style={{ minWidth: 0, flex: 1 }}>
                            <strong>{identity.displayName}</strong>
                            <small>{identity.workCenter} · {identity.userId}</small>
                          </span>
                          <Chip>{identity.role}</Chip>
                        </button>
                      ))}
                    </React.Fragment>
                  ))}
                </div>

                {error && <p className="v23-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}

                {chosen && (
                  <div className="v23-card" style={{ marginTop: 14, padding: 14, background: "rgba(34,211,238,.10)", borderColor: "rgba(34,211,238,.4)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={chosen.displayName} size={40} />
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ color: "#fff", display: "block" }}>{chosen.displayName}</strong>
                        <span className="v23-faint">{chosen.role} · {chosen.workCenter} · {chosen.userId}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="v23-actions" style={{ marginTop: 16 }}>
                  <button type="button" className="v23-btn primary" onClick={() => enter(chosen)} disabled={!chosen}>
                    Enter dashboard <Icon name="arrowRight" size={16} />
                  </button>
                  <Link to="/register" className="v23-btn ghost">Request a new account</Link>
                </div>
                <p className="v23-faint" style={{ marginTop: 12 }}>
                  Demonstration identity only. Production deployments use verified bearer authentication; this picker is disabled outside development.
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
