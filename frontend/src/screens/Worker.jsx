import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GlassPanel from "../components/GlassPanel";
import StatusBadge from "../components/StatusBadge";
import ResourceState from "../components/ResourceState";
import MicOrb from "../features/worker/MicOrb";
import { useStore } from "../state/store";
import { buildIncidentPayload, resolveToolCode } from "../api/mappings";
import useSarvamRecorder from "../features/worker/useSarvamRecorder";
import SimilarEvidence from "../features/memory/SimilarEvidence";
import Communication from "../features/worker/Communication";
const DEMO_INPUT = {
  toolId: "TOOL-B",
  reporterId: "WRK-014",
  language: "kn",
  rawText:
    "\u0c9f\u0cc2\u0cb2\u0ccd B \u0cac\u0ccb\u0cb2\u0ccd\u0c9f\u0ccd \u0cb8\u0ca1\u0cbf\u0cb2\u0cb5\u0cbe\u0c97\u0cbf\u0ca6\u0cc6",
  translatedText: "Tool B is leaving bolts loose",
  category: "TORQUE",
  suggestedNcCode: "NC-TORQUE-LOOSE",
  reportedAt: "2026-11-04T05:12:00.000Z",
};
const emptyFields = (tool) => ({
  tool, symptom: "", category: "", time: "", suggestedNc: "",
  confidence: null, missingFields: [], modelVersion: null,
});

export default function Worker() {
  const {
    tools,
    toolsState,
    client,
    apiConfig,
    currentRole,
    openIncident,
    setSelectedToolId: selectGlobalTool,
    refresh,
  } = useStore();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState("scan");
  const [selectedToolId, setSelectedToolId] = useState("TOOL-B");
  const [toolCode, setToolCode] = useState("");
  const [language, setLanguage] = useState("kn");
  const [workerWords, setWorkerWords] = useState("");
  const [reporterId, setReporterId] = useState("");
  const [fields, setFields] = useState(() => emptyFields("TOOL-B"));
  const [editedFields, setEditedFields] = useState({});
  const [saved, setSaved] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [speechSource, setSpeechSource] = useState(null);
  const [aiWarnings, setAiWarnings] = useState([]);
  const [toolConflict, setToolConflict] = useState(false);
  const [conflictReviewed, setConflictReviewed] = useState(false);
  const pending = useRef(false), aiRequest = useRef(null);
  const canReport = ["Worker", "Manager"].includes(currentRole);
  const recorder = useSarvamRecorder({ client, language, enabled: canReport && apiConfig.aiEnabled,
    onError: setActionError,
    onTranscript: (result) => {
      setWorkerWords(result.transcript);
      setSpeechSource(result);
      setFields(emptyFields(selectedToolId));
      setAiWarnings([]); setToolConflict(false); setConflictReviewed(false);
      setActionError(result.detectedLanguage && result.detectedLanguage !== language
        ? "Detected speech language differs from your selection. Review the transcript and language." : "");
    },
  });
  useEffect(() => () => { aiRequest.current?.abort(); }, [client, language]);
  const stopRecording = () => {
    recorder.cancel();
  };
  const handleFieldChange = (key, value) => {
    if (key === "tool") setConflictReviewed(false);
    setFields((previous) => ({ ...previous, [key]: value }));
    setEditedFields((previous) => ({ ...previous, [key]: true }));
  };
  const chooseTool = (id) => {
    setSelectedToolId(id);
    setFields((previous) => ({ ...previous, tool: id }));
    selectGlobalTool(id);
  };
  const resolveCode = () => {
    const tool = resolveToolCode(toolCode, tools);
    if (!tool) {
      setActionError(
        "Unknown tool code. Choose a tool from the live register.",
      );
      return;
    }
    chooseTool(tool.toolId);
    setActionError("");
  };
  const loadDemo = () => {
    stopRecording();
    setSpeechSource(null); setAiWarnings([]); setToolConflict(false); setConflictReviewed(false);
    chooseTool(DEMO_INPUT.toolId);
    setLanguage(DEMO_INPUT.language);
    setReporterId(DEMO_INPUT.reporterId);
    setWorkerWords(DEMO_INPUT.rawText);
    setFields({
      tool: DEMO_INPUT.toolId,
      symptom: DEMO_INPUT.translatedText,
      category: DEMO_INPUT.category,
      time: DEMO_INPUT.reportedAt,
      suggestedNc: DEMO_INPUT.suggestedNcCode,
      confidence: null,
      missingFields: [],
      modelVersion: null,
    });
    setActionError("");
  };
  const handleMicToggle = () => {
    setActionError("");
    void recorder.toggle();
  };
  const prepareCard = () => {
    if (!workerWords.trim() || !reporterId.trim()) {
      setActionError("Enter your reporter ID and the original issue text.");
      return;
    }
    setActionError("");
    stopRecording();
    if (speechSource) setFields(previous => ({ ...previous, modelVersion: `asr:${speechSource.modelVersion}` }));
    setCurrentStep("card");
  };
  const structureWithAI = async () => {
    if (pending.current || recorder.transcribing || recorder.recording) return;
    pending.current = true;
    const controller = new AbortController();
    aiRequest.current = controller;
    setBusy(true);
    setActionError("");
    try {
      const result = await client.structureReport({
        toolId: selectedToolId,
        language,
        rawText: workerWords,
        ...(reporterId.trim() ? { reporterId } : {}),
        ...(fields.time ? { reportedAt: fields.time } : {}),
      }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (
        ["translatedText", "category", "suggestedNcCode", "modelVersion"].some(
          (key) => result[key] != null && typeof result[key] !== "string",
        ) ||
        (result.missingFields != null &&
          (!Array.isArray(result.missingFields) ||
            !result.missingFields.every(
              (value) => typeof value === "string",
            ))) ||
        typeof result.translatedText !== "string" ||
        (result.confidence != null &&
          (typeof result.confidence !== "number" ||
            result.confidence < 0 ||
            result.confidence > 1))
      )
        throw new Error("AI response fields are invalid; use the manual card.");
      setFields((previous) => ({
        ...previous,
        symptom: result.translatedText,
        category: result.category || "",
        suggestedNc: result.suggestedNcCode || "",
        confidence: result.confidence ?? null,
        missingFields: result.missingFields || [],
        modelVersion: result.modelVersion ? result.modelVersion + (speechSource ? `|asr:${speechSource.modelVersion}` : "") : null,
      }));
      setAiWarnings(result.warnings || []);
      setToolConflict(result.missingFields?.includes("toolId") || false);
      setConflictReviewed(false);
      stopRecording();
      setCurrentStep("card");
    } catch (error) {
      if (!controller.signal.aborted) setActionError(error.message);
    } finally {
      if (aiRequest.current === controller) aiRequest.current = null;
      pending.current = false;
      setBusy(false);
    }
  };
  const handleSubmitCard = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setActionError("");
    try {
      if (!canReport)
        throw new Error(
          "Select the Worker or Manager local demo role to submit a report.",
        );
      if (toolConflict && !conflictReviewed) throw new Error("Review the tool conflict and explicitly confirm your selected tool.");
      if (currentStep === "confirm") {
        const corrections = {};
        for (const [key, value] of Object.entries({
          toolId: fields.tool,
          translatedText: fields.symptom,
          category: fields.category,
          suggestedNcCode: fields.suggestedNc,
        })) {
          if ((saved.incident[key] || "") !== value) {
            if (!value.trim())
              throw new Error(
                "A correction cannot clear a previously supplied field.",
              );
            corrections[key] = value;
          }
        }
        const result = await client.confirmIncident(saved.incident.incidentId, {
          confirmedBy: reporterId,
          corrections,
        });
        setSaved(result);
        openIncident(result.incident.incidentId);
        selectGlobalTool(result.incident.toolId);
        refresh();
        setCurrentStep("status");
      } else {
        const payload = buildIncidentPayload({
          toolId: fields.tool,
          reporterId,
          language,
          rawText: workerWords,
          translatedText: fields.symptom,
          category: fields.category,
          suggestedNcCode: fields.suggestedNc,
          reportedAt: fields.time,
          confidence: fields.confidence,
          missingFields: fields.missingFields,
          modelVersion: fields.modelVersion,
        });
        const result = await client.createIncident(payload);
        setSaved(result);
        setWarnings(result.warnings || []);
        openIncident(result.incident.incidentId);
        setCurrentStep("confirm");
      }
    } catch (error) {
      setActionError(error.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "24px 20px 140px 20px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {actionError && (
        <div className="resource-message error" role="alert">
          {actionError}
        </div>
      )}
      {!canReport && (
        <div className="resource-message">
          Reporting requires Worker or Manager. Use the local demo role
          selector.
        </div>
      )}
      {/* Mobile Top App Bar */}
      <GlassPanel variant="strong" style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <h1
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "var(--ink)",
                }}
              >
                ToolSathi Shop-Floor Terminal
              </h1>
            </div>
            <div style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
              Rugged Intake Interface • 56px Touch Target Ergonomics
            </div>
          </div>
          <StatusBadge status="Built" size="small" />
        </div>

        {/* Step Progression Indicators */}
        <div style={{ display: "flex", gap: "6px", marginTop: "14px" }}>
          {["scan", "lang", "report", "card", "confirm", "status"].map(
            (step, idx) => {
              const stepOrder = [
                "scan",
                "lang",
                "report",
                "card",
                "confirm",
                "status",
              ];
              const isCompleted = stepOrder.indexOf(currentStep) > idx;
              const isCurrent = currentStep === step;

              return (
                <div
                  key={step}
                  style={{
                    flex: 1,
                    height: "4px",
                    borderRadius: "2px",
                    backgroundColor: isCurrent
                      ? "var(--cobalt)"
                      : isCompleted
                        ? "var(--jade)"
                        : "rgba(14,26,47,0.1)",
                  }}
                />
              );
            },
          )}
        </div>
      </GlassPanel>

      {/* STEP 1: SCAN QR CODE / SELECT TOOL */}
      {currentStep === "scan" && (
        <GlassPanel
          variant="strong"
          style={{ padding: "28px 24px", textAlign: "center" }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              marginBottom: "8px",
              color: "var(--ink)",
            }}
          >
            Step 1: Scan Tool QR Code
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "var(--ink-soft)",
              marginBottom: "24px",
            }}
          >
            Select a tool from the database, or enter the ID printed in its QR
            code.
          </p>

          <div className="qr-manual-box">
            <p>
              Camera QR scanning is not connected. The live register and
              tool-code input work without a scanner.
            </p>
            <label htmlFor="tool-code">QR contents / tool ID</label>
            <input
              id="tool-code"
              value={toolCode}
              onChange={(e) => setToolCode(e.target.value)}
              placeholder="TOOL-B"
            />
            <button
              className="secondary-action"
              onClick={resolveCode}
              disabled={toolsState.loading}
            >
              Resolve tool code
            </button>
          </div>
          <ResourceState state={toolsState} />
          {/* Manual Tool Dropdown Fallback */}
          <div style={{ marginBottom: "24px", textAlign: "left" }}>
            <label
              style={{
                fontSize: "13px",
                fontWeight: 600,
                display: "block",
                marginBottom: "6px",
              }}
            >
              Manual Tool Registry Fallback:
            </label>
            <select
              value={selectedToolId}
              onChange={(e) => chooseTool(e.target.value)}
              aria-label="Tool register"
              disabled={toolsState.loading}
              style={{
                width: "100%",
                minHeight: "56px",
                padding: "0 16px",
                borderRadius: "12px",
                border: "1px solid rgba(14, 26, 47, 0.15)",
                fontSize: "15px",
                backgroundColor: "#FFFFFF",
                color: "var(--ink)",
              }}
            >
              {tools.map((t) => (
                <option key={t.toolId} value={t.toolId}>
                  {t.toolId}: {t.type} ({t.line}, {t.workCenter}) ? {t.state}
                </option>
              ))}
            </select>
          </div>

          <button
            disabled={!tools.some((tool) => tool.toolId === selectedToolId)}
            onClick={() => setCurrentStep("lang")}
            style={{
              width: "100%",
              minHeight: "56px",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--cobalt)",
              color: "#FFFFFF",
              fontSize: "16px",
              fontWeight: 700,
              boxShadow: "0 6px 20px rgba(59, 91, 255, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span>Confirm Tool &amp; Proceed</span>
            <span>→</span>
          </button>
        </GlassPanel>
      )}

      {/* STEP 2: LANGUAGE SELECTION */}
      {currentStep === "lang" && (
        <GlassPanel
          variant="strong"
          style={{ padding: "28px 24px", textAlign: "center" }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              marginBottom: "8px",
              color: "var(--ink)",
            }}
          >
            Step 2: Choose Language
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "var(--ink-soft)",
              marginBottom: "24px",
            }}
          >
            ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ • अपनी भाषा चुनें • Select preferred
            intake language
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              marginBottom: "24px",
            }}
          >
            {/* Kannada */}
            <button
              onClick={() => {
                recognition.current?.abort();
                setLanguage("kn");
              }}
              style={{
                minHeight: "64px",
                padding: "12px 20px",
                borderRadius: "16px",
                border:
                  language === "kn"
                    ? "2px solid var(--cobalt)"
                    : "1px solid rgba(14,26,47,0.1)",
                backgroundColor:
                  language === "kn" ? "var(--cobalt-soft)" : "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "var(--font-kannada)",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--ink)",
                  }}
                >
                  ಕನ್ನಡ (Kannada)
                </div>
                <div style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                  ಸ್ಥಳೀಯ ಕಾರ್ಖಾನೆ ಭಾಷೆ
                </div>
              </div>
              {language === "kn" && (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--cobalt-ink)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>

            {/* Hindi */}
            <button
              onClick={() => {
                recognition.current?.abort();
                setLanguage("hi");
              }}
              style={{
                minHeight: "64px",
                padding: "12px 20px",
                borderRadius: "16px",
                border:
                  language === "hi"
                    ? "2px solid var(--cobalt)"
                    : "1px solid rgba(14,26,47,0.1)",
                backgroundColor:
                  language === "hi" ? "var(--cobalt-soft)" : "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "var(--font-devanagari)",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--ink)",
                  }}
                >
                  हिन्दी (Hindi)
                </div>
                <div style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                  संयंत्र ऑपरेटर रिपोर्ट
                </div>
              </div>
              {language === "hi" && (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--cobalt-ink)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>

            {/* English */}
            <button
              onClick={() => {
                recognition.current?.abort();
                setLanguage("en");
              }}
              style={{
                minHeight: "64px",
                padding: "12px 20px",
                borderRadius: "16px",
                border:
                  language === "en"
                    ? "2px solid var(--cobalt)"
                    : "1px solid rgba(14,26,47,0.1)",
                backgroundColor:
                  language === "en" ? "var(--cobalt-soft)" : "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--ink)",
                  }}
                >
                  English
                </div>
                <div style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                  Standard Plant English
                </div>
              </div>
              {language === "en" && (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--cobalt-ink)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setCurrentStep("scan")}
              style={{
                minHeight: "56px",
                flex: 1,
                borderRadius: "var(--radius-pill)",
                border: "1px solid rgba(14,26,47,0.15)",
                color: "var(--ink)",
              }}
            >
              ← Back
            </button>
            <button
              disabled={busy || currentStep === "confirm"}
              onClick={() => setCurrentStep("report")}
              style={{
                minHeight: "56px",
                flex: 2,
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--cobalt)",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "16px",
              }}
            >
              Continue to Report →
            </button>
          </div>
        </GlassPanel>
      )}

      {/* STEP 3: REPORT (MIC ORB + TYPED FALLBACK) */}
      {currentStep === "report" && (
        <GlassPanel
          variant="strong"
          style={{ padding: "32px 24px", textAlign: "center" }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              marginBottom: "8px",
              color: "var(--ink)",
            }}
          >
            Step 3: State the Issue
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "var(--ink-soft)",
              marginBottom: "28px",
            }}
          >
            Speak for up to 20 seconds using Sarvam, or type your report.
            Review and correct the transcript before creating the incident card.
          </p>

          {/* The Glossy Mic Orb */}
          <div style={{ marginBottom: "32px" }}>
            <MicOrb
              disabled={!recorder.supported || !apiConfig.aiEnabled || !canReport || busy || recorder.transcribing}
              isRecording={recorder.recording}
              onToggleRecord={handleMicToggle}
              language={language}
            />
          </div>

          {!recorder.supported && (
            <p className="resource-message">
              Speech recognition is unavailable on this device. Typed reporting
              is ready.
            </p>
          )}
          {recorder.transcribing && <p role="status">Transcribing with Sarvam… Your typed text stays available if this fails.</p>}
          {speechSource && <p className="resource-message">Sarvam transcript ({speechSource.modelVersion}): {speechSource.transcript}. Review the text below; corrections are welcome.</p>}
          <div className="integration-fields">
            <label htmlFor="reporter-id">Reporter ID (required)</label>
            <input
              id="reporter-id"
              disabled={busy || recorder.transcribing || recorder.recording}
              value={reporterId}
              onChange={(e) => setReporterId(e.target.value)}
              maxLength={120}
              placeholder="Your worker ID"
            />
            <button className="secondary-action" disabled={busy || recorder.transcribing} onClick={loadDemo}>
              Load synthetic demo report
            </button>
            <p className="muted">
              The demo input explicitly uses the 4 November scenario time. It is
              not an AI extraction.
            </p>
          </div>
          {/* Typed Fallback Input */}
          <div style={{ textAlign: "left", marginBottom: "24px" }}>
            <label
              style={{
                fontSize: "13px",
                fontWeight: 600,
                display: "block",
                marginBottom: "6px",
              }}
            >
              Manual Typed Input Fallback:
            </label>
            <textarea
              aria-label="Original report"
              rows="3"
              value={workerWords}
              disabled={busy || recorder.transcribing}
              onChange={(e) => {
                setWorkerWords(e.target.value);
                setFields(previous => previous.modelVersion ? { ...emptyFields(selectedToolId), time: previous.time } : previous);
                setAiWarnings([]); setToolConflict(false); setConflictReviewed(false);
              }}
              placeholder="Describe the issue with the tool..."
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid rgba(14, 26, 47, 0.15)",
                fontSize: "14px",
                fontFamily:
                  language === "kn"
                    ? "var(--font-kannada)"
                    : language === "hi"
                      ? "var(--font-devanagari)"
                      : "var(--font-sans)",
                backgroundColor: "#FFFFFF",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setCurrentStep("lang")}
              disabled={busy || recorder.transcribing || recorder.recording}
              style={{
                minHeight: "56px",
                flex: 1,
                borderRadius: "var(--radius-pill)",
                border: "1px solid rgba(14,26,47,0.15)",
                color: "var(--ink)",
              }}
            >
              ← Back
            </button>
            <button
              onClick={prepareCard}
              disabled={busy || recorder.transcribing || recorder.recording}
              style={{
                minHeight: "56px",
                flex: 2,
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--cobalt)",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "16px",
              }}
            >
              Review Manual Incident Card →
            </button>
          </div>
        </GlassPanel>
      )}

      {currentStep === "report" && (
        <div className="resource-message">
          <button
            className="secondary-action"
            disabled={!apiConfig.aiEnabled || !canReport || busy || recorder.transcribing || recorder.recording || !workerWords.trim()}
            onClick={structureWithAI}
          >
            Structure with AI
          </button>
          <p>
            {apiConfig.aiEnabled
              ? "Sarvam suggestions require worker review. Manual reporting always remains available."
              : "AI extraction unavailable: disabled by configuration. Use the manual card."}
          </p>
        </div>
      )}
      {/* STEP 4: EDITABLE STRUCTURED INCIDENT CARD */}
      {(currentStep === "card" || currentStep === "confirm") && (
        <GlassPanel variant="strong" style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-pill)",
                  backgroundColor: "var(--cobalt-soft)",
                  color: "var(--cobalt-ink)",
                }}
              >
                STEP 4: OPERATOR CONFIRMATION
              </span>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  marginTop: "4px",
                  color: "var(--ink)",
                }}
              >
                Review Incident Card
              </h2>
            </div>
            <StatusBadge status="Built" size="small" />
          </div>

          {/* Worker's Original Words (Highlighted at top) */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "12px",
              backgroundColor: "#F8FAFC",
              border: "1px solid rgba(14, 26, 47, 0.12)",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--ink-soft)",
                marginBottom: "4px",
              }}
            >
              Original Report (Preserved Exactly):
            </div>
            <div
              style={{
                fontSize: "15px",
                fontStyle: "italic",
                color: "var(--ink)",
                fontFamily:
                  language === "kn"
                    ? "var(--font-kannada)"
                    : language === "hi"
                      ? "var(--font-devanagari)"
                      : "var(--font-sans)",
              }}
            >
              "{workerWords}"
            </div>
          </div>

          {/* Confidence Badge & Needs Review Warning */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderRadius: "10px",
              backgroundColor: "rgba(59, 91, 255, 0.08)",
              border: "1px solid rgba(59, 91, 255, 0.25)",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--cobalt-ink)",
              }}
            >
              {fields.confidence == null ? (
                "Manual entry ? no AI confidence supplied"
              ) : (
                <>
                  AI self-assessment (not measured accuracy):{" "}
                  <strong>{Math.round(fields.confidence * 100)}%</strong>
                </>
              )}
            </div>
            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "var(--radius-pill)",
                backgroundColor: "rgba(242, 161, 0, 0.15)",
                color: "var(--saffron-ink)",
              }}
            >
              Needs Review • Never Auto-Confirms
            </span>
          </div>

          {currentStep === "confirm" && (
            <div className="resource-message" role="status">
              Saved {saved?.incident.incidentId} as Reported. Review
              corrections, then explicitly confirm below.
            </div>
          )}
          {warnings.map((warning) => (
            <p className="resource-message" key={warning}>
              {warning}
            </p>
          ))}
          {aiWarnings.map(warning => <p className="resource-message" key={warning}>{warning}</p>)}
          {toolConflict && <label className="resource-message"><input type="checkbox" checked={conflictReviewed}
            onChange={event => setConflictReviewed(event.target.checked)} /> I reviewed the conflicting tool mention and confirm the tool ID entered below.</label>}
          {fields.missingFields.length > 0 && (
            <p className="resource-message">
              Missing fields: {fields.missingFields.join(", ")}
            </p>
          )}
          <div className="integration-fields">
            <label htmlFor="incident-category">Category (optional)</label>
            <input
              id="incident-category"
              value={fields.category}
              maxLength={120}
              onChange={(e) => handleFieldChange("category", e.target.value)}
            />
            <label htmlFor="reported-at">
              Reported at (UTC ISO timestamp, optional)
            </label>
            <input
              id="reported-at"
              value={fields.time}
              disabled={currentStep === "confirm"}
              onChange={(e) => handleFieldChange("time", e.target.value)}
              placeholder="2026-11-04T05:12:00Z"
            />
            <p className="muted">
              If omitted, the backend records server receive time and a warning.
            </p>
          </div>
          {/* Editable Fields Form */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              marginBottom: "24px",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  marginBottom: "4px",
                }}
              >
                <span style={{ fontWeight: 600 }}>Identified Tool:</span>
                <span
                  style={{
                    color: editedFields.tool
                      ? "var(--jade-ink)"
                      : "var(--cobalt-ink)",
                    fontWeight: 600,
                  }}
                >
                  {editedFields.tool ? "Operator Edited" : "Operator Entered"}
                </span>
              </div>
              <input
                type="text"
                aria-label="Card tool ID"
                value={fields.tool}
                onChange={(e) => handleFieldChange("tool", e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "48px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(14,26,47,0.15)",
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  marginBottom: "4px",
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  Translated report / English explanation (optional):
                </span>
                <span
                  style={{
                    color: editedFields.symptom
                      ? "var(--jade-ink)"
                      : "var(--cobalt-ink)",
                    fontWeight: 600,
                  }}
                >
                  {editedFields.symptom
                    ? "Operator Edited"
                    : "Operator Entered"}
                </span>
              </div>
              <input
                type="text"
                aria-label="Translated report"
                value={fields.symptom}
                onChange={(e) => handleFieldChange("symptom", e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "48px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(14,26,47,0.15)",
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  marginBottom: "4px",
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  Suggested SAP Nonconformance (NC) Code:
                </span>
                <span
                  style={{
                    color: editedFields.suggestedNc
                      ? "var(--jade-ink)"
                      : "var(--cobalt-ink)",
                    fontWeight: 600,
                  }}
                >
                  {editedFields.suggestedNc
                    ? "Operator Edited"
                    : "Operator Entered"}
                </span>
              </div>
              <input
                type="text"
                aria-label="Suggested NC code"
                value={fields.suggestedNc}
                onChange={(e) =>
                  handleFieldChange("suggestedNc", e.target.value)
                }
                style={{
                  width: "100%",
                  minHeight: "48px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(14,26,47,0.15)",
                  fontSize: "14px",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              disabled={busy || currentStep === "confirm"}
              onClick={() => setCurrentStep("report")}
              style={{
                minHeight: "56px",
                flex: 1,
                borderRadius: "var(--radius-pill)",
                border: "1px solid rgba(14,26,47,0.15)",
                color: "var(--ink)",
              }}
            >
              ← Back
            </button>
            <button
              disabled={busy || !canReport}
              onClick={handleSubmitCard}
              style={{
                minHeight: "56px",
                flex: 2,
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--jade)",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "16px",
                boxShadow: "0 6px 20px rgba(14, 163, 122, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>
                {busy
                  ? "Saving..."
                  : currentStep === "confirm"
                    ? "Confirm Incident"
                    : "Save Incident"}
              </span>
            </button>
          </div>
        </GlassPanel>
      )}

      {apiConfig.aiEnabled && ["card", "confirm"].includes(currentStep) && <Communication mode="readback" language={language}
        card={{ toolId: fields.tool, rawText: workerWords, translatedText: fields.symptom, category: fields.category, suggestedNcCode: fields.suggestedNc, reporterId, reportedAt: fields.time }} />}
      {currentStep === "status" && <Communication incidentId={saved?.incident?.incidentId} language={language} />}
      {["card", "confirm", "status"].includes(currentStep) && <SimilarEvidence
        query={[fields.symptom, workerWords].filter(Boolean).join('\n').slice(0, 2000)} toolId={fields.tool}
        category={fields.category || undefined} asOf={fields.time || undefined} incidentId={saved?.incident?.incidentId} />}
      {currentStep === "status" && (
        <GlassPanel variant="strong" style={{ padding: "28px" }}>
          <h2>Incident Confirmed: {saved?.incident.incidentId}</h2>
          <p>
            Tool {saved?.incident.toolId} | {saved?.incident.state}
          </p>
          <p>
            Your report is stored with application audit history. Containment
            requires a separate human approval workflow.
          </p>
          <button
            className="primary-action"
            onClick={() => navigate("/console")}
          >
            Open Incident Details
          </button>
          <button
            className="secondary-action"
            onClick={() => {
              stopRecording();
              setCurrentStep("scan");
              setSaved(null);
              setWorkerWords("");
              setSpeechSource(null); setAiWarnings([]); setToolConflict(false); setConflictReviewed(false);
              setWarnings([]);
              setFields(emptyFields(selectedToolId));
              setEditedFields({});
              setActionError("");
            }}
          >
            Report Another Issue
          </button>
        </GlassPanel>
      )}
    </div>
  );
}
