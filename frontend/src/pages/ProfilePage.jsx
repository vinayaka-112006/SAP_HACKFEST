import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/store";
import { useLocale } from "../features/v2/locale";
import { useOperation } from "../features/operations/common";
import { PageHead } from "../components/AppShell";
import { Card, CardHead, Chip, ErrorNote, Icon, Loading } from "../components/ui";

export default function ProfilePage() {
  const { client, demoUserId, currentRole, apiConfig, demoIdentities } = useStore();
  const { language, setLanguage } = useLocale();
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState({ displayName: "", language });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const state = useOperation("/v2/me", revision);
  const onboarding = useOperation("/v2/onboarding/me", revision);
  const profile = state.data?.profile;
  const identity = demoIdentities.find((item) => item.userId === demoUserId);

  useEffect(() => {
    if (profile) setForm({ displayName: profile.displayName || "", language: profile.language || language });
  }, [profile?.userId, profile?.displayName]);

  async function save(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      await client.request("/v2/profile", { method: "PUT", body: form });
      setLanguage(form.language);
      setMessage("Profile preferences saved.");
      setRevision((n) => n + 1);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  return (
    <div className="v23-page">
      <PageHead
        title="Profile"
        description="Your recorded application identity, role and preferences. Roles are never edited here."
        chips={[`${currentRole} · ${apiConfig.demoMode ? "simulated identity" : "verified identity"}`]}
        actions={<Link className="v23-btn ghost" to="/register"><Icon name="userPlus" size={15} /> Onboarding</Link>}
      />
      {state.loading && <Loading rows={2} />}
      {state.error && <ErrorNote message={state.error} retry={() => setRevision((n) => n + 1)} />}
      {!state.loading && !state.error && (
        <div className="v23-grid split">
          <Card>
            <CardHead title="Display preferences" subtitle={profile ? "Only your display name and language can be changed." : "An approved application profile is required before preferences can be saved."} />
            {profile ? (
              <form className="v23-form" onSubmit={save}>
                <label className="v23-field"><span>Display name</span>
                  <input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
                </label>
                <label className="v23-field"><span>Preferred language</span>
                  <select value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })}>
                    <option value="en">English</option><option value="kn">ಕನ್ನಡ (Kannada)</option><option value="hi">हिन्दी (Hindi)</option>
                  </select>
                </label>
                <div className="v23-actions">
                  <button className="v23-btn primary" disabled={busy}>{busy ? "Saving…" : "Save preferences"}</button>
                  {message && <span className="v23-chip good" role="status">{message}</span>}
                </div>
                {error && <p className="v23-error" role="alert">{error}</p>}
              </form>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <p className="v23-muted" style={{ margin: 0 }}>
                  This identity has no active application profile. Access is limited to the demonstration scope until an administrator approves an application.
                </p>
                <Link className="v23-btn primary" to="/register">Start an onboarding application</Link>
              </div>
            )}
          </Card>

          <div style={{ display: "grid", gap: 16 }}>
            <Card>
              <CardHead title="Identity" subtitle="Read-only record from the authenticated session." />
              <ul className="v23-timeline">
                <li><strong>{identity?.displayName || demoUserId}</strong><p>{currentRole} · {identity?.workCenter || "no work center"}</p><small className="v23-mono">{demoUserId}</small></li>
                <li><strong>Granted roles</strong><p>{(state.data?.identity?.roles || [currentRole]).join(", ")}</p><small>Roles come from the identity provider, never from this page</small></li>
                {profile && <li><strong>Approved application</strong><p>{profile.role} · {profile.workCenter} · {profile.team}</p><small>Status {profile.status}</small></li>}
              </ul>
            </Card>
            <Card light>
              <CardHead title="Onboarding status" subtitle="Skills and documents attached to your application." />
              {onboarding.loading && <Loading rows={1} />}
              {onboarding.error && <ErrorNote message={onboarding.error} retry={() => setRevision((n) => n + 1)} />}
              {!onboarding.loading && !onboarding.error && (
                <>
                  <div className="v23-actions" style={{ marginBottom: 10 }}>
                    <Chip variant="neutral">{onboarding.data?.application?.status || "No application"}</Chip>
                    <Chip variant="info">{onboarding.data?.skills?.length || 0} skills</Chip>
                    <Chip variant="violet">{onboarding.data?.documents?.length || 0} documents</Chip>
                  </div>
                  <Link className="v23-btn sm" to="/register">Open onboarding</Link>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
