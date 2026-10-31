import React, { useState } from 'react';
import GlassPanel from '../components/GlassPanel';
import StatusBadge from '../components/StatusBadge';
import MicOrb from '../features/worker/MicOrb';
import { useStore } from '../state/store';

const SAMPLE_TRANSCRIPTS = {
  kn: 'ಟೂಲ್ ಬಿ ಬೋಲ್ಟ್ ಸಡಿಲವಾಗಿ ಬಿಡುತ್ತಿದೆ, ಟಾರ್ಕ್ ಸರಿಯಾಗಿ ಹಿಡಿಯುತ್ತಿಲ್ಲ',
  hi: 'टूल बी नट कसने में झटके दे रहा है और स्लिप हो रहा है',
  en: 'Tool B is leaving bolts loose and slipping past 65Nm threshold'
};

export default function Worker() {
  const { tools, setAuditLog } = useStore();

  // Steps: 'scan' | 'lang' | 'report' | 'card' | 'status'
  const [currentStep, setCurrentStep] = useState('scan');
  
  // Intake state
  const [selectedToolId, setSelectedToolId] = useState('TOOL-B');
  const [language, setLanguage] = useState('kn'); // 'kn' | 'hi' | 'en'
  const [isRecording, setIsRecording] = useState(false);
  const [workerWords, setWorkerWords] = useState(SAMPLE_TRANSCRIPTS.kn);
  
  // Structured card fields (editable)
  const [fields, setFields] = useState({
    tool: 'TOOL-B (Digital Angle Torque Wrench 120Nm)',
    symptom: 'Torque Drift / Bolts leaving loose',
    category: 'Fastener Tightening Nonconformance',
    time: '10:42 AM (Shift A)',
    suggestedNc: 'NC-FAST-042 (Bolt Torque Deviation)',
    confidence: 0.88
  });

  // Track field corrections by user
  const [editedFields, setEditedFields] = useState({});

  const handleFieldChange = (key, val) => {
    setFields(prev => ({ ...prev, [key]: val }));
    setEditedFields(prev => ({ ...prev, [key]: true }));
  };

  const handleMicToggle = () => {
    if (!isRecording) {
      setIsRecording(true);
      // Simulate speech recognition
      setTimeout(() => {
        setIsRecording(false);
        setWorkerWords(SAMPLE_TRANSCRIPTS[language] || SAMPLE_TRANSCRIPTS.en);
        setCurrentStep('card');
      }, 2200);
    } else {
      setIsRecording(false);
      setCurrentStep('card');
    }
  };

  const handleSubmitCard = () => {
    const now = new Date();
    // Append to audit trail
    setAuditLog(prev => [
      {
        auditId: `AUD-${Math.floor(9400 + Math.random() * 500)}`,
        incidentId: 'TS-0001',
        timestamp: now.toISOString(),
        actor: 'Basavaraj K. (Assembly Specialist OP-104)',
        role: 'Worker',
        action: 'WORKER_INCIDENT_CONFIRMED',
        details: `Worker confirmed intake report in language ${language}. Corrected fields count: ${Object.keys(editedFields).length}.`,
        modelVersion: 'Generative AI Hub Audio Adapter v2.4'
      },
      ...prev
    ]);

    setCurrentStep('status');
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '24px 20px 140px 20px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Mobile Top App Bar */}
      <GlassPanel variant="strong" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
                ToolSathi Shop-Floor Terminal
              </h1>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
              Rugged Intake Interface • 56px Touch Target Ergonomics
            </div>
          </div>
          <StatusBadge status="Built" size="small" />
        </div>

        {/* Step Progression Indicators */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '14px' }}>
          {['scan', 'lang', 'report', 'card', 'status'].map((step, idx) => {
            const stepOrder = ['scan', 'lang', 'report', 'card', 'status'];
            const isCompleted = stepOrder.indexOf(currentStep) > idx;
            const isCurrent = currentStep === step;

            return (
              <div
                key={step}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: isCurrent ? 'var(--cobalt)' : isCompleted ? 'var(--jade)' : 'rgba(14,26,47,0.1)'
                }}
              />
            );
          })}
        </div>
      </GlassPanel>

      {/* STEP 1: SCAN QR CODE / SELECT TOOL */}
      {currentStep === 'scan' && (
        <GlassPanel variant="strong" style={{ padding: '28px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink)' }}>
            Step 1: Scan Tool QR Code
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-soft)', marginBottom: '24px' }}>
            Point terminal camera at the physical calibration barcode or QR plate on the tool handle.
          </p>

          {/* Camera Viewfinder */}
          <div style={{
            position: 'relative',
            height: '220px',
            borderRadius: '16px',
            backgroundColor: '#0F172A',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            border: '2px solid rgba(255,255,255,0.8)'
          }}>
            <div style={{
              width: '140px',
              height: '140px',
              border: '2px solid #38BDF8',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ color: '#38BDF8', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                [OPTICAL SENSOR ACTIVE]
              </span>
            </div>
            <div style={{
              position: 'absolute',
              bottom: '10px',
              background: 'rgba(0,0,0,0.6)',
              color: '#FFFFFF',
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--font-mono)'
            }}>
              DETECTED: Tool B (Brake Caliper Station 04)
            </div>
          </div>

          {/* Manual Tool Dropdown Fallback */}
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Manual Tool Registry Fallback:
            </label>
            <select
              value={selectedToolId}
              onChange={(e) => setSelectedToolId(e.target.value)}
              style={{
                width: '100%',
                minHeight: '56px',
                padding: '0 16px',
                borderRadius: '12px',
                border: '1px solid rgba(14, 26, 47, 0.15)',
                fontSize: '15px',
                backgroundColor: '#FFFFFF',
                color: 'var(--ink)'
              }}
            >
              {tools.map(t => (
                <option key={t.toolId} value={t.toolId}>
                  {t.toolId}: {t.name} ({t.line})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setCurrentStep('lang')}
            style={{
              width: '100%',
              minHeight: '56px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--cobalt)',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: 700,
              boxShadow: '0 6px 20px rgba(59, 91, 255, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>Confirm Tool &amp; Proceed</span>
            <span>→</span>
          </button>
        </GlassPanel>
      )}

      {/* STEP 2: LANGUAGE SELECTION */}
      {currentStep === 'lang' && (
        <GlassPanel variant="strong" style={{ padding: '28px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink)' }}>
            Step 2: Choose Language
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-soft)', marginBottom: '24px' }}>
            ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ • अपनी भाषा चुनें • Select preferred intake language
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            {/* Kannada */}
            <button
              onClick={() => { setLanguage('kn'); setWorkerWords(SAMPLE_TRANSCRIPTS.kn); }}
              style={{
                minHeight: '64px',
                padding: '12px 20px',
                borderRadius: '16px',
                border: language === 'kn' ? '2px solid var(--cobalt)' : '1px solid rgba(14,26,47,0.1)',
                backgroundColor: language === 'kn' ? 'var(--cobalt-soft)' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-kannada)'
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>ಕನ್ನಡ (Kannada)</div>
                <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>ಸ್ಥಳೀಯ ಕಾರ್ಖಾನೆ ಭಾಷೆ</div>
              </div>
              {language === 'kn' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>

            {/* Hindi */}
            <button
              onClick={() => { setLanguage('hi'); setWorkerWords(SAMPLE_TRANSCRIPTS.hi); }}
              style={{
                minHeight: '64px',
                padding: '12px 20px',
                borderRadius: '16px',
                border: language === 'hi' ? '2px solid var(--cobalt)' : '1px solid rgba(14,26,47,0.1)',
                backgroundColor: language === 'hi' ? 'var(--cobalt-soft)' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-devanagari)'
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>हिन्दी (Hindi)</div>
                <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>संयंत्र ऑपरेटर रिपोर्ट</div>
              </div>
              {language === 'hi' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>

            {/* English */}
            <button
              onClick={() => { setLanguage('en'); setWorkerWords(SAMPLE_TRANSCRIPTS.en); }}
              style={{
                minHeight: '64px',
                padding: '12px 20px',
                borderRadius: '16px',
                border: language === 'en' ? '2px solid var(--cobalt)' : '1px solid rgba(14,26,47,0.1)',
                backgroundColor: language === 'en' ? 'var(--cobalt-soft)' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>English</div>
                <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>Standard Plant English</div>
              </div>
              {language === 'en' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setCurrentStep('scan')}
              style={{ minHeight: '56px', flex: 1, borderRadius: 'var(--radius-pill)', border: '1px solid rgba(14,26,47,0.15)', color: 'var(--ink)' }}
            >
              ← Back
            </button>
            <button
              onClick={() => setCurrentStep('report')}
              style={{
                minHeight: '56px',
                flex: 2,
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--cobalt)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '16px'
              }}
            >
              Continue to Report →
            </button>
          </div>
        </GlassPanel>
      )}

      {/* STEP 3: REPORT (MIC ORB + TYPED FALLBACK) */}
      {currentStep === 'report' && (
        <GlassPanel variant="strong" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink)' }}>
            Step 3: State the Issue
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-soft)', marginBottom: '28px' }}>
            Speak naturally or type. Generative AI Hub structures your report without altering your words.
          </p>

          {/* The Glossy Mic Orb */}
          <div style={{ marginBottom: '32px' }}>
            <MicOrb
              isRecording={isRecording}
              onToggleRecord={handleMicToggle}
              language={language}
            />
          </div>

          {/* Typed Fallback Input */}
          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Manual Typed Input Fallback:
            </label>
            <textarea
              rows="3"
              value={workerWords}
              onChange={(e) => setWorkerWords(e.target.value)}
              placeholder="Describe the issue with the tool..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid rgba(14, 26, 47, 0.15)',
                fontSize: '14px',
                fontFamily: language === 'kn' ? 'var(--font-kannada)' : language === 'hi' ? 'var(--font-devanagari)' : 'var(--font-sans)',
                backgroundColor: '#FFFFFF'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setCurrentStep('lang')}
              style={{ minHeight: '56px', flex: 1, borderRadius: 'var(--radius-pill)', border: '1px solid rgba(14,26,47,0.15)', color: 'var(--ink)' }}
            >
              ← Back
            </button>
            <button
              onClick={() => setCurrentStep('card')}
              style={{
                minHeight: '56px',
                flex: 2,
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--cobalt)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '16px'
              }}
            >
              Structure Incident Card →
            </button>
          </div>
        </GlassPanel>
      )}

      {/* STEP 4: EDITABLE STRUCTURED INCIDENT CARD */}
      {currentStep === 'card' && (
        <GlassPanel variant="strong" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <span style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--cobalt-soft)',
                color: 'var(--cobalt-ink)'
              }}>
                STEP 4: OPERATOR CONFIRMATION
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: 'var(--ink)' }}>
                Verify Structured Card
              </h2>
            </div>
            <StatusBadge status="Built" size="small" />
          </div>

          {/* Worker's Original Words (Highlighted at top) */}
          <div style={{
            padding: '14px 16px',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid rgba(14, 26, 47, 0.12)',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '4px' }}>
              Your Spoken Intake (Preserved Exactly):
            </div>
            <div style={{
              fontSize: '15px',
              fontStyle: 'italic',
              color: 'var(--ink)',
              fontFamily: language === 'kn' ? 'var(--font-kannada)' : language === 'hi' ? 'var(--font-devanagari)' : 'var(--font-sans)'
            }}>
              "{workerWords}"
            </div>
          </div>

          {/* Confidence Badge & Needs Review Warning */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(59, 91, 255, 0.08)',
            border: '1px solid rgba(59, 91, 255, 0.25)',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cobalt-ink)' }}>
              Extraction Confidence: <strong>{Math.round(fields.confidence * 100)}%</strong>
            </div>
            <span style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(242, 161, 0, 0.15)',
              color: 'var(--saffron-ink)'
            }}>
              Needs Review • Never Auto-Confirms
            </span>
          </div>

          {/* Editable Fields Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Identified Tool:</span>
                <span style={{ color: editedFields.tool ? 'var(--jade-ink)' : 'var(--cobalt-ink)', fontWeight: 600 }}>
                  {editedFields.tool ? 'Operator Edited' : 'AI Suggested'}
                </span>
              </div>
              <input
                type="text"
                value={fields.tool}
                onChange={(e) => handleFieldChange('tool', e.target.value)}
                style={{ width: '100%', minHeight: '48px', padding: '0 12px', borderRadius: '8px', border: '1px solid rgba(14,26,47,0.15)', fontSize: '14px' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Symptom Observed:</span>
                <span style={{ color: editedFields.symptom ? 'var(--jade-ink)' : 'var(--cobalt-ink)', fontWeight: 600 }}>
                  {editedFields.symptom ? 'Operator Edited' : 'AI Suggested'}
                </span>
              </div>
              <input
                type="text"
                value={fields.symptom}
                onChange={(e) => handleFieldChange('symptom', e.target.value)}
                style={{ width: '100%', minHeight: '48px', padding: '0 12px', borderRadius: '8px', border: '1px solid rgba(14,26,47,0.15)', fontSize: '14px' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Suggested SAP Nonconformance (NC) Code:</span>
                <span style={{ color: editedFields.suggestedNc ? 'var(--jade-ink)' : 'var(--cobalt-ink)', fontWeight: 600 }}>
                  {editedFields.suggestedNc ? 'Operator Edited' : 'AI Suggested'}
                </span>
              </div>
              <input
                type="text"
                value={fields.suggestedNc}
                onChange={(e) => handleFieldChange('suggestedNc', e.target.value)}
                style={{ width: '100%', minHeight: '48px', padding: '0 12px', borderRadius: '8px', border: '1px solid rgba(14,26,47,0.15)', fontSize: '14px', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setCurrentStep('report')}
              style={{ minHeight: '56px', flex: 1, borderRadius: 'var(--radius-pill)', border: '1px solid rgba(14,26,47,0.15)', color: 'var(--ink)' }}
            >
              ← Back
            </button>
            <button
              onClick={handleSubmitCard}
              style={{
                minHeight: '56px',
                flex: 2,
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--jade)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '16px',
                boxShadow: '0 6px 20px rgba(14, 163, 122, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Confirm &amp; Transmit Case</span>
            </button>
          </div>
        </GlassPanel>
      )}

      {/* STEP 5: STATUS FEEDBACK IN WORKER'S SCRIPT */}
      {currentStep === 'status' && (
        <GlassPanel variant="strong" style={{ padding: '36px 24px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--jade-soft)',
            color: 'var(--jade-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 style={{
            fontSize: '22px',
            fontWeight: 800,
            marginBottom: '10px',
            color: 'var(--ink)',
            fontFamily: language === 'kn' ? 'var(--font-kannada)' : language === 'hi' ? 'var(--font-devanagari)' : 'var(--font-sans)'
          }}>
            {language === 'kn' && 'ಘಟನೆ ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ (TS-0001)'}
            {language === 'hi' && 'घटना सफलतापूर्वक दर्ज की गई (TS-0001)'}
            {language === 'en' && 'Incident Logged Successfully (TS-0001)'}
          </h2>

          <p style={{
            fontSize: '15px',
            color: 'var(--ink-soft)',
            lineHeight: 1.5,
            marginBottom: '24px',
            fontFamily: language === 'kn' ? 'var(--font-kannada)' : language === 'hi' ? 'var(--font-devanagari)' : 'var(--font-sans)'
          }}>
            {language === 'kn' && 'ಟೂಲ್ ಬಿ ಅನ್ನು ಸುರಕ್ಷತೆಗಾಗಿ ನಿರ್ಬಂಧಿಸಲು ಪ್ರಸ್ತಾಪಿಸಲಾಗಿದೆ. ಗುಣಮಟ್ಟ ನಿರ್ವಾಹಕರಿಗೆ ಮತ್ತು ತಂತ್ರಜ್ಞರಿಗೆ ಎಚ್ಚರಿಕೆ ಕಳುಹಿಸಲಾಗಿದೆ.'}
            {language === 'hi' && 'टूल बी को सुरक्षा के लिए प्रतिबंधित करने का प्रस्ताव दिया गया है। गुणवत्ता प्रबंधक और तकनीशियन को अलर्ट भेजा गया है।'}
            {language === 'en' && 'Tool B has been proposed for containment restriction. Quality Manager and technician matching have been dispatched.'}
          </p>

          <div style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(14,26,47,0.1)',
            marginBottom: '24px',
            textAlign: 'left',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div>Case Reference: <strong style={{ fontFamily: 'var(--font-mono)' }}>TS-0001</strong></div>
            <div>Containment Gate: <strong>AI Proposal Dispatched to Manager</strong></div>
            <div>Exposure Trace: <strong>72h Window Evaluated (100 assemblies)</strong></div>
          </div>

          <button
            onClick={() => setCurrentStep('scan')}
            style={{
              width: '100%',
              minHeight: '56px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--ink)',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 700
            }}
          >
            Start Another Report
          </button>
        </GlassPanel>
      )}
    </div>
  );
}
