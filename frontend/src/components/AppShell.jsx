import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { useLocale, LanguageSelector } from "../features/v2/locale";
import { useOperation } from "../features/operations/common";
import { Icon, Avatar, Chip } from "./ui";
import Logo from "./Logo";

const homes = { Worker: "/worker", Manager: "/manager", Technician: "/technician", Verifier: "/verifier", Quality: "/issues", Administrator: "/admin" };
export const homeFor = (role) => homes[role] || "/issues";

const labels = (role) => [
  { group: "Operations" },
  { to: homeFor(role), label: "Dashboard", icon: "dashboard", end: true },
  { to: "/issues", label: "Issues", icon: "issues" },
  { to: "/equipment", label: "Equipment", icon: "equipment" },
  ...(role === "Manager" ? [{ to: "/workforce", label: "Workforce", icon: "workforce" }] : []),
  ...(role === "Administrator" ? [{ to: "/admin", label: "Administration", icon: "settings" }] : []),
  { group: "Account" },
  { to: "/notifications", label: "Notifications", icon: "bell", badge: true },
  { to: "/profile", label: "Profile", icon: "user" },
];

const crumbFor = (pathname) => {
  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) return [{ label: "System overview", to: "/" }];
  const first = {
    worker: "Worker dashboard", manager: "Manager dashboard", technician: "Technician dashboard",
    verifier: "Verifier / Assigner", issues: "Issues", equipment: "Equipment register",
    workforce: "Workforce allocation", notifications: "Notifications", profile: "Profile",
    register: "Registration", login: "Sign in", admin: "Administration", exposure: "Exposure",
    console: "Evidence console", history: "Legacy asset history", kitchen: "Design system", workspace: "Workspace",
  }[parts[0]] || parts[0];
  const crumbs = [{ label: "Home", to: "/" }, { label: first, to: "/" + parts[0] }];
  if (parts[1]) crumbs.push({ label: decodeURIComponent(parts[1]), to: pathname });
  return crumbs;
};

function NavList({ role, unread, onNavigate }) {
  return (
    <nav className="v23-nav" aria-label="Primary">
      {labels(role).map((item, index) =>
        item.group ? (
          <span className="v23-nav-label" key={"g" + index}>{item.group}</span>
        ) : (
          <NavLink key={item.to} to={item.to} end={item.end} className="v23-nav-item" onClick={onNavigate}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.badge && unread > 0 && <span className="v23-badge">{unread}</span>}
          </NavLink>
        ),
      )}
    </nav>
  );
}

export default function AppShell({ children }) {
  const { currentRole, demoUserId, apiConfig, demoIdentities } = useStore();
  const { language, setLanguage } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const notifications = useOperation("/v2/notifications?limit=1", 0);
  const unread = notifications.data?.unread || 0;
  const identity = demoIdentities.find((item) => item.userId === demoUserId);
  const crumb = crumbFor(location.pathname);

  useEffect(() => { setDrawer(false); setMenu(false); }, [location.pathname]);
  useEffect(() => {
    if (!drawer) return undefined;
    const close = (event) => { if (event.key === "Escape") setDrawer(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [drawer]);

  function signOut() {
    sessionStorage.removeItem("toolsathi.demoRole");
    sessionStorage.removeItem("toolsathi.demoUser");
    if (apiConfig.demoMode) navigate("/login");
    else navigate("/");
  }

  const identityBlock = (
    <div className="v23-identity">
      <Avatar name={identity?.displayName || demoUserId} />
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: "block", fontSize: 13.5, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {identity?.displayName || demoUserId}
        </strong>
        <small>{currentRole} · {identity?.workCenter || "unassigned"}</small>
      </div>
    </div>
  );

  return (
    <div className="v23-root">
      <div className="v23-shell">
        <aside className="v23-sidebar" aria-label="Sidebar">
          <Link to="/" className="v23-brand" style={{ textDecoration: "none" }}>
            <span className="v23-brand-mark"><Logo size={26} variant="glyph" /></span>
            <span><strong>ToolSathi</strong><small>Intelligent manufacturing</small></span>
          </Link>
          <NavList role={currentRole} unread={unread} />
          <div className="v23-sidebar-foot">
            {apiConfig.demoMode && <span className="v23-chip warn" style={{ alignSelf: "flex-start" }}>Development identity</span>}
            {identityBlock}
            <button type="button" className="v23-btn sm ghost" onClick={signOut}><Icon name="logout" size={15} /> Sign out</button>
          </div>
        </aside>

        <div style={{ minWidth: 0 }}>
          <header className="v23-topbar">
            <button type="button" className="v23-icon-btn v23-mobile-toggle" aria-label="Open navigation" onClick={() => setDrawer(true)}>
              <Icon name="menu" />
            </button>
            <nav className="v23-crumbs" aria-label="Breadcrumb">
              {crumb.map((item, index) => (
                <React.Fragment key={item.to}>
                  {index > 0 && <Icon name="chevron" size={12} />}
                  {index === crumb.length - 1 ? <strong>{item.label}</strong> : <Link to={item.to}>{item.label}</Link>}
                </React.Fragment>
              ))}
            </nav>
            <div className="v23-topbar-spacer" />
            <LanguageSelector />
            <Link to="/notifications" className="v23-icon-btn" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
              <Icon name="bell" />{unread > 0 && <span className="v23-dot" />}
            </Link>
            <div style={{ position: "relative" }}>
              <button type="button" className="v23-icon-btn" aria-label="Account menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
                <Avatar name={identity?.displayName || demoUserId} size={26} />
              </button>
              {menu && (
                <div className="v23-card" style={{ position: "absolute", right: 0, top: 48, width: 260, zIndex: 50, padding: 16 }}>
                  <strong style={{ display: "block", color: "#fff" }}>{identity?.displayName || demoUserId}</strong>
                  <p className="v23-faint" style={{ margin: "2px 0 12px" }}>{currentRole}{apiConfig.demoMode ? " · simulated" : ""}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <Link to="/profile" className="v23-nav-item"><Icon name="user" size={16} /> Profile</Link>
                    <Link to="/register" className="v23-nav-item"><Icon name="userPlus" size={16} /> Onboarding</Link>
                    <button type="button" className="v23-nav-item" style={{ background: "none", textAlign: "left" }} onClick={signOut}>
                      <Icon name="logout" size={16} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>
          <main className="v23-main" id="main-content">{children}</main>
        </div>
      </div>

      <div className="v23-drawer" data-open={drawer}>
        <button type="button" className="v23-drawer-backdrop" aria-label="Close navigation" onClick={() => setDrawer(false)} />
        <div className="v23-drawer-panel" role="dialog" aria-modal="true" aria-label="Navigation">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Link to="/" className="v23-brand" style={{ padding: 0, textDecoration: "none" }}>
              <span className="v23-brand-mark"><Logo size={22} variant="glyph" /></span>
              <span><strong>ToolSathi</strong><small>{currentRole}</small></span>
            </Link>
            <button type="button" className="v23-icon-btn" aria-label="Close navigation" onClick={() => setDrawer(false)}><Icon name="close" /></button>
          </div>
          <NavList role={currentRole} unread={unread} onNavigate={() => setDrawer(false)} />
          <div className="v23-sidebar-foot">
            {identityBlock}
            <div className="v23-actions">
              <button type="button" className="v23-btn sm ghost" onClick={() => { setDrawer(false); setLanguage(language === "en" ? "kn" : language === "kn" ? "hi" : "en"); }}>
                <Icon name="globe" size={15} /> {language.toUpperCase()}
              </button>
              <button type="button" className="v23-btn sm ghost" onClick={signOut}><Icon name="logout" size={15} /> Sign out</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageHead({ title, description, actions, chips }) {
  return (
    <header className="v23-page-head">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {chips && <div className="v23-actions" style={{ marginTop: 10 }}>{chips.map((chip) => <Chip key={chip}>{chip}</Chip>)}</div>}
      </div>
      {actions && <div className="v23-actions">{actions}</div>}
    </header>
  );
}
