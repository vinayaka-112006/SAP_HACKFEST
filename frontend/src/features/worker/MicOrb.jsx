import React from 'react';

/**
 * MicOrb: Glossy glass sphere with pulsating audio ring waveform.
 * Used on the shop floor worker intake screen.
 */
export default function MicOrb({ isRecording = false, onToggleRecord, language = 'kn', disabled = false }) {
  const getPromptText = () => {
    if (language === 'kn') return isRecording ? 'ಆಲಿಸಲಾಗುತ್ತಿದೆ... ನಿಲ್ಲಿಸಲು ಒತ್ತಿ' : 'ಮಾತನಾಡಲು ಒತ್ತಿ (ಕನ್ನಡ)';
    if (language === 'hi') return isRecording ? 'सुन रहे हैं... रोकने के लिए टैप करें' : 'बोलने के लिए टैप करें (हिन्दी)';
    return isRecording ? 'Listening... Tap to finish' : 'Tap to speak (English)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <button
        disabled={disabled} onClick={onToggleRecord}
        aria-label={isRecording ? "Stop recording voice report" : "Start recording voice report"}
        className={isRecording ? 'animate-orb-pulse' : ''}
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: isRecording
            ? 'radial-gradient(circle at 35% 35%, #FF6B81 0%, #E0314B 70%, #9E1224 100%)'
            : 'radial-gradient(circle at 35% 35%, #708CFF 0%, #3B5BFF 70%, #1E38C4 100%)',
          boxShadow: isRecording
            ? '0 12px 36px rgba(224, 49, 75, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.6)'
            : '0 12px 36px rgba(59, 91, 255, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.6)',
          border: '3px solid rgba(255, 255, 255, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isRecording ? 'scale(1.08)' : 'scale(1)',
          minWidth: '56px',
          minHeight: '56px'
        }}
      >
        <svg
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>

      <span style={{
        fontSize: '15px',
        fontWeight: 700,
        color: isRecording ? 'var(--ruby-ink)' : 'var(--cobalt-ink)',
        fontFamily: language === 'kn' ? 'var(--font-kannada)' : language === 'hi' ? 'var(--font-devanagari)' : 'var(--font-sans)'
      }}>
        {getPromptText()}
      </span>
    </div>
  );
}
