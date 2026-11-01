import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './state/store';
import SyntheticRibbon from './components/SyntheticRibbon';
import TopNavbar from './components/TopNavbar';
import Dock from './components/Dock';
import IntroSequence from './components/IntroSequence';
import Launcher from './screens/Launcher';
import Console from './screens/Console';
import Worker from './screens/Worker';
import ToolHistory from './screens/ToolHistory';
import Kitchen from './screens/Kitchen';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <StoreProvider>
      <div className="app-shell" style={{ minHeight: '100vh', position: 'relative' }}>
        {/* 5.5s Animated Cinematic Intro Sequence */}
        {showIntro && (
          <IntroSequence onComplete={() => setShowIntro(false)} />
        )}

        {/* Background Refractive Glows (Cyan-Teal Metallic with Fluid Drift) */}
        <div className="ambient-glows" aria-hidden="true">
          <div className="ambient-glow-1 animate-glow-drift-1" />
          <div className="ambient-glow-2 animate-glow-drift-2" />
          <div className="ambient-glow-3 animate-glow-drift-3" />
          <div className="ambient-glow-4 animate-glow-drift-4" />
        </div>

        {/* Top Enterprise Manufacturing Status Ribbon */}
        <SyntheticRibbon />

        {/* Persistent Branding Navigation Bar (Every Page with Official Logo) */}
        <TopNavbar />

        {/* Main Application Screen Routes */}
        <main style={{ position: 'relative', zIndex: 1 }}>
          <Routes>
            <Route path="/" element={<Launcher />} />
            <Route path="/console" element={<Console />} />
            <Route path="/worker" element={<Worker />} />
            <Route path="/history" element={<ToolHistory />} />
            <Route path="/kitchen" element={<Kitchen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Replay Intro Floating Button (Bottom Right) */}
        {!showIntro && (
          <button
            onClick={() => setShowIntro(true)}
            className="intro-replay" title="Replay ToolSathi AI Cinematic Intro"
            style={{
              position: 'fixed',
              bottom: '26px',
              right: '24px',
              zIndex: 90,
              padding: '7px 16px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(7, 17, 32, 0.15)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: 'var(--ink)',
              boxShadow: '0 4px 16px rgba(7, 17, 32, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Replay Intro</span>
          </button>
        )}

        {/* Floating Navigation Dock */}
        <Dock />
      </div>
    </StoreProvider>
  );
}
