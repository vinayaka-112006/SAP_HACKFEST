import React from 'react';
import GlassPanel from '../components/GlassPanel';
import StatusBadge from '../components/StatusBadge';
import DuplicatePrompt from '../features/history/DuplicatePrompt';
import LockoutTag from '../features/governance/LockoutTag';
import { useStore } from '../state/store';

export default function ToolHistory() {
  const { history, tools, handleDuplicateDecision } = useStore();
  const toolB = tools.find(t => t.toolId === 'TOOL-B') || tools[1];

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '32px 24px 140px 24px' }}>
      {/* Header */}
      <header style={{ marginBottom: '28px' }}>
        <GlassPanel variant="strong" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--cobalt-ink)' }}>
                  ASSET MASTER: TOOL-B
                </span>
                <StatusBadge status="Built" size="small" />
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)' }}>
                {toolB.name}
              </h1>
              <div style={{ fontSize: '14px', color: 'var(--ink-soft)', marginTop: '4px' }}>
                Location: <strong>{toolB.line}</strong> ({toolB.workCenter}) • Calibration Due: <strong>{toolB.calibrationDue}</strong>
              </div>
            </div>

            {/* Lockout status tile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>Total Fasten Cycles</div>
                <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                  {toolB.usageCount.toLocaleString()}
                </div>
              </div>
              <LockoutTag isRestricted={toolB.status === 'Restricted'} tagId="LOTO-B-09" />
            </div>
          </div>
        </GlassPanel>
      </header>

      {/* DUPLICATE PROMPT INTERACTIVE BANNER */}
      <section style={{ marginBottom: '28px' }}>
        <DuplicatePrompt onDecision={handleDuplicateDecision} />
      </section>

      {/* VERTICAL LIFECYCLE TIMELINE */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>
            Asset Incident &amp; Calibration Lifecycle Timeline
          </h2>
          <span style={{ fontSize: '13px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
            Chronological Audit Trail
          </span>
        </div>

        <div style={{
          position: 'relative',
          paddingLeft: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Vertical Glass Line */}
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '8px',
            bottom: '8px',
            width: '2px',
            background: 'linear-gradient(180deg, var(--cobalt) 0%, rgba(59, 91, 255, 0.2) 100%)'
          }} />

          {history.map(item => {
            const isRepeat = item.isRepeatFlag;
            const isDuplicate = item.type === 'duplicate_report';
            const isCurrent = item.incidentId === 'TS-0001';

            return (
              <div key={item.eventId} style={{ position: 'relative' }}>
                {/* Timeline node bullet */}
                <div style={{
                  position: 'absolute',
                  left: '-26px',
                  top: '16px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: isRepeat ? 'var(--ruby)' : isCurrent ? 'var(--cobalt)' : '#FFFFFF',
                  border: `3px solid ${isRepeat ? 'var(--ruby-glow)' : 'var(--cobalt)'}`,
                  boxShadow: '0 0 8px rgba(0,0,0,0.1)'
                }} />

                <GlassPanel
                  variant="strong"
                  style={{
                    padding: '20px 24px',
                    border: isRepeat
                      ? '2px solid rgba(224, 49, 75, 0.4)'
                      : isCurrent
                        ? '1px solid rgba(59, 91, 255, 0.35)'
                        : '1px solid rgba(14, 26, 47, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                          {item.title}
                        </span>
                        {isRepeat && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: 'var(--ruby-soft)',
                            color: 'var(--ruby-ink)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            REPEAT PATTERN FLAGGED (12 DAYS AGO)
                          </span>
                        )}
                        {item.badge && (
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: 'var(--cobalt-soft)',
                            color: 'var(--cobalt-ink)',
                            fontWeight: 700
                          }}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        Logged by: {item.author} • {new Date(item.date).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Multilingual transcript if present */}
                  {item.rawText && (
                    <div style={{
                      margin: '10px 0',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid rgba(14, 26, 47, 0.08)'
                    }}>
                      <div style={{ fontSize: '14px', color: 'var(--ink)', fontFamily: item.language === 'kn' ? 'var(--font-kannada)' : 'var(--font-devanagari)' }}>
                        "{item.rawText}"
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-soft)', fontStyle: 'italic', marginTop: '2px' }}>
                        Translated: "{item.translatedText}"
                      </div>
                    </div>
                  )}

                  {item.resolution && (
                    <div style={{ fontSize: '13px', color: 'var(--ink)', marginTop: '6px' }}>
                      <strong>Resolution / Metrology Action:</strong> {item.resolution}
                    </div>
                  )}
                </GlassPanel>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
