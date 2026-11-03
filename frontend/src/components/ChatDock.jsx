import React, { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { useLocale, LanguageSelector } from "../features/v2/locale";
import { Icon } from "./ui";

const SUGGESTIONS = {
  Worker: [
    "What is the status of my reported incidents?",
    "Which equipment is registered in my work center?",
    "How do I confirm a machine fault report?",
    "What safety isolation procedures apply here?",
  ],
  default: [
    "Which incidents need review?",
    "Which technicians are qualified for this equipment?",
    "What spare parts are available?",
    "Which workers can be reassigned?",
  ]
};

export default function ChatDock() {
  const { client, incidentId, currentRole } = useStore();
  const { t, language } = useLocale();
  const [open, setOpen] = useState(false);
  const activeSuggestions = SUGGESTIONS[currentRole] || SUGGESTIONS.default;
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(null);
  const region = useRef(null);
  const composer = useRef(null);

  useEffect(() => { active.current?.abort(); setMessages([]); setError(""); }, [language]);
  useEffect(() => { if (open) composer.current?.focus(); }, [open]);
  useEffect(() => { if (region.current) region.current.scrollTop = region.current.scrollHeight; }, [messages, busy]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  async function send(question) {
    const value = (question ?? text).trim();
    if (!value || busy) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setText(""); setError(""); setBusy(true);
    setMessages((rows) => [...rows.slice(-16), { role: "worker", text: value }]);
    try {
      const result = await client.request("/v2/chat", {
        method: "POST", requestTimeoutMs: 65000, signal: controller.signal,
        body: { message: value, language, ...(incidentId ? { incidentId } : {}), generate: true },
      });
      if (controller.signal.aborted) return;
      setMessages((rows) => [...rows, { role: "assistant", text: result.answer, sources: (result.sources || []).slice(0, 5), provider: result.providerStatus }]);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause.message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <aside className="v23-dock" aria-label={t("chat")}>
      {open && (
        <section className="v23-dock-panel" role="dialog" aria-label={t("chat")}>
          <header>
            <span className="v23-dock-avatar"><Icon name="robot" size={18} /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: "block", color: "#fff", fontSize: 14 }}>ToolSathi AI</strong>
              <small style={{ color: "var(--v23-faint)", fontSize: 11.5 }}>
                {currentRole} · {incidentId ? incidentId : "authorised records only"}
              </small>
            </div>
            <LanguageSelector />
            <button type="button" className="v23-icon-btn" aria-label="Close assistant" onClick={() => setOpen(false)} style={{ width: 32, height: 32 }}>
              <Icon name="close" size={15} />
            </button>
          </header>

          <div className="v23-dock-region" ref={region} aria-live="polite">
            {messages.length === 0 && (
              <div style={{ display: "grid", gap: 8 }}>
                <p className="v23-muted" style={{ margin: 0, fontSize: 13.5 }}>
                  {t("readOnly")}
                </p>
                {activeSuggestions.map((suggestion) => (
                  <button key={suggestion} type="button" className="v23-dock-suggestion" onClick={() => send(suggestion)}>{suggestion}</button>
                ))}
              </div>
            )}
            {messages.map((message, index) => (
              <article key={index} className={"v23-bubble " + message.role}>
                <small>{message.role === "assistant" ? "ToolSathi AI" : "You"}</small>
                <p>{message.text}</p>
                {message.sources?.length > 0 && (
                  <details>
                    <summary>Sources · {message.sources.length}</summary>
                    {message.sources.map((source) => (
                      <div key={source.id} className="v23-bubble-source">
                        <strong>{source.data?.title || source.type}</strong>
                        <small>{source.citation?.sourceId || source.id}</small>
                        <span>{String(source.data?.excerpt || source.data?.state || source.data?.status || "").slice(0, 160)}</span>
                      </div>
                    ))}
                  </details>
                )}
                {message.provider?.startsWith("AI_") && <small className="v23-faint">{message.provider} · {t("provider")}</small>}
              </article>
            ))}
            {busy && <p className="v23-faint" role="status">Retrieving authorised records…</p>}
          </div>

          {error && <p className="v23-error" role="alert" style={{ margin: 0 }}>{error}</p>}

          <form className="v23-dock-composer" onSubmit={(event) => { event.preventDefault(); send(); }}>
            <label className="sr-only" htmlFor="v23-dock-input">{t("question")}</label>
            <textarea id="v23-dock-input" ref={composer} rows={2} value={text} placeholder={t("question")}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} />
            <button type="submit" className="v23-btn primary sm" disabled={busy || !text.trim()}>{t("ask")}</button>
          </form>
        </section>
      )}
      <button type="button" className="v23-dock-launcher" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name={open ? "close" : "robot"} size={18} />
        <span>{open ? "Close" : t("chat")}</span>
      </button>
    </aside>
  );
}
