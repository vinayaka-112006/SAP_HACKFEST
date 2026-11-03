import React, { useState, useEffect } from 'react';

/**
 * IntroSequence — Industrial Tool-Themed 7-second Cinematic Intro
 * Background: Dark steel forge with animated tool silhouettes & metal sparks
 * Phase 0 (Electric Blue) : Multilingual Telemetry
 * Phase 1 (Forge Orange)  : Exposure Trace  
 * Phase 2 (Amber)         : Clarity Glass
 * Phase 3 (Jade Green)    : S/4 Governance
 */

const PHASES = [
  {
    id: 0,
    badge: 'PHASE 01  ·  SHOP-FLOOR TELEMETRY',
    title: 'Multilingual Incident Intelligence',
    sub: 'Kannada · Hindi · English — AI captures every voice on the shop floor in 240 ms.',
    accent: '#00D4FF',
    glow: 'rgba(0,212,255,0.6)',
    bg: 'rgba(0,212,255,0.09)',
    border: 'rgba(0,212,255,0.4)',
    spark: '#00D4FF',
    icon: (
      <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
        {/* Mic / voice waveform */}
        <rect x="26" y="8" width="16" height="28" rx="8" fill="rgba(0,212,255,0.18)" stroke="#00D4FF" strokeWidth="2"/>
        <path d="M18 36c0 8.8 7.2 16 16 16s16-7.2 16-16" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round"/>
        <line x1="34" y1="52" x2="34" y2="60" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round"/>
        <line x1="24" y1="60" x2="44" y2="60" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round"/>
        {/* Sound waves */}
        <path d="M12 30 Q8 34 12 38" stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6"/>
        <path d="M8 26 Q2 34 8 42" stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.35"/>
        <path d="M56 30 Q60 34 56 38" stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6"/>
        <path d="M60 26 Q66 34 60 42" stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.35"/>
        {/* Dot blink */}
        <circle cx="34" cy="22" r="3" fill="#00D4FF" opacity="0.9"/>
      </svg>
    ),
  },
  {
    id: 1,
    badge: 'PHASE 02  ·  FORWARD TRACE ENGINE',
    title: null,
    sub: '35 units in 24h · 100 in 72h · 160 in 7 days — routed to Factory, Dealer X & Dealer Y.',
    accent: '#F97316',
    glow: 'rgba(249,115,22,0.6)',
    bg: 'rgba(249,115,22,0.09)',
    border: 'rgba(249,115,22,0.4)',
    spark: '#F97316',
    icon: (
      <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
        {/* Caliper / measurement tool */}
        <rect x="8" y="28" width="52" height="6" rx="3" fill="rgba(249,115,22,0.2)" stroke="#F97316" strokeWidth="1.8"/>
        <line x1="16" y1="14" x2="16" y2="56" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="52" y1="20" x2="52" y2="50" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M16 14 L24 14" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
        <path d="M16 56 L24 56" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
        <path d="M44 20 L52 20" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
        <path d="M44 50 L52 50" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
        {/* Reading indicator */}
        <rect x="28" y="22" width="12" height="18" rx="2" fill="rgba(249,115,22,0.25)" stroke="#F97316" strokeWidth="1.2"/>
        <line x1="31" y1="27" x2="37" y2="27" stroke="#F97316" strokeWidth="1" strokeLinecap="round"/>
        <line x1="31" y1="31" x2="37" y2="31" stroke="#F97316" strokeWidth="1" strokeLinecap="round"/>
        <line x1="31" y1="35" x2="35" y2="35" stroke="#F97316" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 2,
    badge: 'PHASE 03  ·  CLARITY GLASS OPTICS',
    title: 'The Factory is Behind Glass',
    sub: 'Ruby confirmed · Saffron suspected · Frosted fog for unknown — visual uncertainty, made tangible.',
    accent: '#F59E0B',
    glow: 'rgba(245,158,11,0.6)',
    bg: 'rgba(245,158,11,0.09)',
    border: 'rgba(245,158,11,0.4)',
    spark: '#F59E0B',
    icon: (
      <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
        {/* Gear */}
        <circle cx="34" cy="34" r="12" fill="rgba(245,158,11,0.15)" stroke="#F59E0B" strokeWidth="2"/>
        <circle cx="34" cy="34" r="5" fill="#F59E0B" opacity="0.8"/>
        {/* Gear teeth */}
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 34 + Math.cos(rad) * 12;
          const y1 = 34 + Math.sin(rad) * 12;
          const x2 = 34 + Math.cos(rad) * 19;
          const y2 = 34 + Math.sin(rad) * 19;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F59E0B" strokeWidth="4" strokeLinecap="round"/>;
        })}
        {/* Status dots */}
        <circle cx="12" cy="12" r="5" fill="rgba(220,38,38,0.8)" stroke="#DC2626" strokeWidth="1.5"/>
        <circle cx="56" cy="12" r="5" fill="rgba(245,158,11,0.8)" stroke="#F59E0B" strokeWidth="1.5"/>
        <circle cx="12" cy="56" r="5" fill="rgba(100,116,139,0.5)" stroke="#64748B" strokeWidth="1.5" strokeDasharray="2 1.5"/>
        <circle cx="56" cy="56" r="5" fill="rgba(16,185,129,0.8)" stroke="#10B981" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 3,
    badge: 'PHASE 04  ·  S/4HANA GOVERNANCE',
    title: 'AI Proposes · Humans Approve',
    sub: 'Every SAP action is scoped, approved, and blockchain-audited — zero silent mutations.',
    accent: '#10B981',
    glow: 'rgba(16,185,129,0.6)',
    bg: 'rgba(16,185,129,0.09)',
    border: 'rgba(16,185,129,0.4)',
    spark: '#10B981',
    icon: (
      <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
        {/* Torque wrench */}
        <rect x="10" y="30" width="38" height="8" rx="4" fill="rgba(16,185,129,0.2)" stroke="#10B981" strokeWidth="2"/>
        <circle cx="52" cy="34" r="10" fill="rgba(16,185,129,0.15)" stroke="#10B981" strokeWidth="2"/>
        <circle cx="52" cy="34" r="4" fill="#10B981" opacity="0.7"/>
        <line x1="10" y1="34" x2="6" y2="26" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
        <line x1="10" y1="34" x2="6" y2="42" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
        {/* Checkmark */}
        <path d="M22 44 L28 52 L42 36" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

// Large animated tool SVG silhouettes for background
function ToolBg() {
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
      {/* Giant rotating gear — top right */}
      <svg width="420" height="420" viewBox="0 0 420 420" style={{
        position:'absolute', top:'-100px', right:'-80px', opacity:0.045,
        animation:'bg-spin 28s linear infinite',
        transformOrigin:'210px 210px',
      }}>
        <circle cx="210" cy="210" r="130" fill="none" stroke="#D97706" strokeWidth="18"/>
        <circle cx="210" cy="210" r="60" fill="none" stroke="#D97706" strokeWidth="18"/>
        {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg,i) => {
          const rad = (deg*Math.PI)/180;
          const x1 = 210+Math.cos(rad)*130, y1 = 210+Math.sin(rad)*130;
          const x2 = 210+Math.cos(rad)*165, y2 = 210+Math.sin(rad)*165;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D97706" strokeWidth="22" strokeLinecap="round"/>;
        })}
      </svg>

      {/* Torque wrench — bottom left */}
      <svg width="380" height="100" viewBox="0 0 380 100" style={{
        position:'absolute', bottom:'80px', left:'-30px', opacity:0.05,
        animation:'bg-float 6s ease-in-out infinite',
      }}>
        <rect x="0" y="38" width="300" height="24" rx="12" fill="#F97316"/>
        <circle cx="318" cy="50" r="38" fill="none" stroke="#F97316" strokeWidth="20"/>
        <circle cx="318" cy="50" r="14" fill="#F97316"/>
        <line x1="0" y1="50" x2="-18" y2="30" stroke="#F97316" strokeWidth="12" strokeLinecap="round"/>
        <line x1="0" y1="50" x2="-18" y2="70" stroke="#F97316" strokeWidth="12" strokeLinecap="round"/>
      </svg>

      {/* Hex bolt — mid left */}
      <svg width="120" height="120" viewBox="0 0 120 120" style={{
        position:'absolute', top:'35%', left:'60px', opacity:0.06,
        animation:'bg-spin 18s linear infinite reverse',
        transformOrigin:'60px 60px',
      }}>
        <polygon points="60,4 106,28 106,76 60,100 14,76 14,28" fill="none" stroke="#00D4FF" strokeWidth="6"/>
        <circle cx="60" cy="52" r="18" fill="none" stroke="#00D4FF" strokeWidth="6"/>
        <line x1="60" y1="52" x2="60" y2="100" stroke="#00D4FF" strokeWidth="8" strokeLinecap="round"/>
      </svg>

      {/* Small caliper marks — top centre */}
      <svg width="200" height="60" viewBox="0 0 200 60" style={{
        position:'absolute', top:'12%', left:'38%', opacity:0.06,
        animation:'bg-float 8s 1s ease-in-out infinite',
      }}>
        <rect x="0" y="22" width="200" height="10" rx="5" fill="#10B981"/>
        <line x1="20" y1="0" x2="20" y2="60" stroke="#10B981" strokeWidth="6" strokeLinecap="round"/>
        <line x1="170" y1="8" x2="170" y2="52" stroke="#10B981" strokeWidth="6" strokeLinecap="round"/>
        <line x1="20" y1="0" x2="45" y2="0" stroke="#10B981" strokeWidth="5" strokeLinecap="round"/>
        <line x1="20" y1="60" x2="45" y2="60" stroke="#10B981" strokeWidth="5" strokeLinecap="round"/>
        <line x1="150" y1="8" x2="170" y2="8" stroke="#10B981" strokeWidth="5" strokeLinecap="round"/>
        <line x1="150" y1="52" x2="170" y2="52" stroke="#10B981" strokeWidth="5" strokeLinecap="round"/>
      </svg>

      {/* Small gear — bottom right */}
      <svg width="160" height="160" viewBox="0 0 160 160" style={{
        position:'absolute', bottom:'60px', right:'120px', opacity:0.05,
        animation:'bg-spin 12s linear infinite',
        transformOrigin:'80px 80px',
      }}>
        <circle cx="80" cy="80" r="42" fill="none" stroke="#F59E0B" strokeWidth="10"/>
        <circle cx="80" cy="80" r="20" fill="none" stroke="#F59E0B" strokeWidth="10"/>
        {[0,45,90,135,180,225,270,315].map((deg,i) => {
          const rad=(deg*Math.PI)/180;
          return <line key={i} x1={80+Math.cos(rad)*42} y1={80+Math.sin(rad)*42}
            x2={80+Math.cos(rad)*60} y2={80+Math.sin(rad)*60}
            stroke="#F59E0B" strokeWidth="14" strokeLinecap="round"/>;
        })}
      </svg>

      {/* Blueprint scan lines */}
      {[15,30,45,60,75,85].map((pct,i) => (
        <div key={i} style={{
          position:'absolute', left:0, right:0,
          top:`${pct}%`, height:'1px',
          background:'rgba(0,212,255,0.04)',
          pointerEvents:'none',
        }}/>
      ))}
    </div>
  );
}

export default function IntroSequence({ onComplete }) {
  const [phase, setPhase]         = useState(0);
  const [counter, setCounter]     = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => {
    const tm = setTimeout(() => setMounted(true), 40);
    const t1 = setTimeout(() => setPhase(1), 1500);
    const t2 = setTimeout(() => setPhase(2), 3000);
    const t3 = setTimeout(() => setPhase(3), 4500);
    const t4 = setTimeout(() => setFadingOut(true), 6100);
    const t5 = setTimeout(() => { if (onComplete) onComplete(); }, 7000);

    const ctr = setInterval(() => {
      setCounter(prev => prev < 300 ? prev + 20 : 300);
    }, 40);

    return () => {
      clearTimeout(tm); clearTimeout(t1); clearTimeout(t2);
      clearTimeout(t3); clearTimeout(t4); clearTimeout(t5);
      clearInterval(ctr);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSkip = () => {
    setFadingOut(true);
    setTimeout(() => { if (onComplete) onComplete(); }, 350);
  };

  const cur = PHASES[phase];

  // Metal spark positions (deterministic)
  const sparks = Array.from({ length: 24 }, (_, i) => ({
    x: `${(i * 139.5 + 7) % 100}%`,
    y: `${(i * 77.3 + 11) % 100}%`,
    size: 1.5 + (i % 3),
    dur: `${2.8 + (i % 4) * 0.7}s`,
    delay: `${(i * 0.22) % 2.5}s`,
    color: i % 4 === 0 ? '#F97316' : i % 4 === 1 ? '#F59E0B' : i % 4 === 2 ? '#00D4FF' : '#DC2626',
  }));

  return (
    <>
      <style>{`
        @keyframes is-fadeUp {
          from { opacity:0; transform:translateY(22px) scale(0.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes is-pop {
          0%  { opacity:0; transform:scale(0.78); }
          65% { transform:scale(1.07); }
          100%{ opacity:1; transform:scale(1); }
        }
        @keyframes is-pulse {
          0%,100%{ opacity:0.5; transform:scale(1); }
          50%    { opacity:1;   transform:scale(1.3); }
        }
        @keyframes is-beam {
          0%  { left:-20%; opacity:0; }
          15% { opacity:1; }
          85% { opacity:1; }
          100%{ left:110%; opacity:0; }
        }
        @keyframes is-shimmer {
          from{ transform:translateX(-140%); }
          to  { transform:translateX(140%);  }
        }
        @keyframes is-spark {
          0%,100%{ opacity:0; transform:scale(0.5); }
          40%,60%{ opacity:1; transform:scale(1.4); }
        }
        @keyframes bg-spin {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
        @keyframes bg-float {
          0%,100%{ transform:translateY(0px); }
          50%    { transform:translateY(-12px); }
        }
        @keyframes is-brandCenter {
          0%   { opacity:0; transform:scale(0.85) translateY(-16px); }
          65%  { transform:scale(1.04) translateY(0); }
          100% { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes is-forge-glow {
          0%,100%{ opacity:0.35; }
          50%    { opacity:0.65; }
        }
        .is-fu  { animation: is-fadeUp 0.48s cubic-bezier(.16,1,.3,1) both; }
        .is-fu2 { animation: is-fadeUp 0.48s cubic-bezier(.16,1,.3,1) 0.1s both; }
        .is-fu3 { animation: is-fadeUp 0.48s cubic-bezier(.16,1,.3,1) 0.2s both; }
        .is-pop { animation: is-pop    0.55s cubic-bezier(.34,1.56,.64,1) both; }
      `}</style>

      {/* ROOT */}
      <div style={{
        position:'fixed', inset:0, zIndex:99999,
        /* Steel forge gradient — warm dark industrial */
        background:`
          radial-gradient(ellipse 70% 50% at 15% 85%, rgba(180,70,10,0.28) 0%, transparent 55%),
          radial-gradient(ellipse 60% 45% at 85% 10%, rgba(0,80,120,0.2) 0%, transparent 55%),
          linear-gradient(160deg, #111008 0%, #0e1510 30%, #0a0c12 60%, #110c08 100%)
        `,
        color:'#FFFFFF',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        overflow:'hidden',
        opacity: mounted && !fadingOut ? 1 : 0,
        transform: fadingOut ? 'scale(1.04)' : 'scale(1)',
        transition:'opacity 0.75s cubic-bezier(.16,1,.3,1), transform 0.75s cubic-bezier(.16,1,.3,1)',
        userSelect:'none',
      }}>

        {/* ── Blueprint grid ── */}
        <svg style={{ position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none' }} aria-hidden>
          <defs>
            <pattern id="forge-grid" width="52" height="52" patternUnits="userSpaceOnUse">
              <path d="M 52 0 L 0 0 0 52" fill="none" stroke="rgba(200,140,60,0.07)" strokeWidth="0.6"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#forge-grid)"/>
        </svg>

        {/* ── Animated tool silhouettes in background ── */}
        <ToolBg />

        {/* ── Forge glow at bottom (molten look) ── */}
        <div style={{
          position:'absolute', bottom:0, left:'15%', right:'15%', height:'200px',
          background:'radial-gradient(ellipse at 50% 100%, rgba(220,100,15,0.22) 0%, transparent 70%)',
          animation:'is-forge-glow 3.5s ease-in-out infinite',
          pointerEvents:'none',
        }}/>

        {/* ── Metal sparks ── */}
        {sparks.map((s, i) => (
          <div key={i} style={{
            position:'absolute', left:s.x, top:s.y,
            width:`${s.size}px`, height:`${s.size}px`,
            borderRadius:'50%',
            background: s.color,
            boxShadow:`0 0 ${s.size*3}px ${s.color}`,
            animation:`is-spark ${s.dur} ${s.delay} ease-in-out infinite`,
            pointerEvents:'none',
          }}/>
        ))}

        {/* ── Phase-colored laser beam ── */}
        <div style={{
          position:'absolute', top:'44%', height:'1.5px',
          width:'45%',
          background:`linear-gradient(90deg, transparent, ${cur.accent}, transparent)`,
          boxShadow:`0 0 22px 6px ${cur.glow}`,
          animation:'is-beam 2.4s ease-in-out infinite',
          pointerEvents:'none',
          transition:'background 0.5s, box-shadow 0.5s',
        }}/>

        {/* ── Phase accent corner glows ── */}
        <div style={{
          position:'absolute', bottom:0, right:0, width:'380px', height:'380px',
          background:`radial-gradient(circle at 100% 100%, ${cur.glow} 0%, transparent 65%)`,
          pointerEvents:'none', transition:'background 0.7s ease', opacity:0.6,
        }}/>
        <div style={{
          position:'absolute', top:0, left:0, width:'300px', height:'300px',
          background:'radial-gradient(circle at 0% 0%, rgba(200,130,40,0.12) 0%, transparent 65%)',
          pointerEvents:'none',
        }}/>

        {/* ══ TOP BRAND HEADER — CENTERED & HIGHLIGHTED BRAND ══ */}
        <div style={{
          position:'absolute', top:0, left:0, right:0,
          padding:'22px 36px', zIndex:30,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {/* Shop-Floor Status Pill on far left */}
          <div style={{
            position:'absolute', left:'36px',
            display:'flex', alignItems:'center', gap:'8px',
            padding:'7px 16px', borderRadius:'100px',
            background:'rgba(0, 229, 255, 0.08)',
            border:'1.5px solid rgba(0, 229, 255, 0.35)',
            color:'#00E5FF', fontSize:'12px', fontWeight:800, fontFamily:'monospace',
            letterSpacing:'0.06em',
            boxShadow:'0 0 16px rgba(0, 229, 255, 0.15)',
          }}>
            <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#00E5FF', boxShadow:'0 0 10px #00E5FF', animation:'is-pulse 1.2s infinite' }} />
            <span>AI SHOP-FLOOR ENGINE</span>
          </div>

          {/* GRAND CENTERED BRAND — BIG HIGHLIGHTED LETTERS & UNIFIED LOGO */}
          <div style={{
            display:'flex', alignItems:'center', gap:'18px',
            animation:'is-brandCenter 0.75s cubic-bezier(.16,1,.3,1) both',
          }}>
            {/* EXACT IDENTICAL LOGO TO LANDING PAGE (Unified Cyber-Teal Metallic Tool Emblem) */}
            <div style={{
              width:'58px', height:'58px', borderRadius:'16px',
              background:'linear-gradient(135deg, #00E5FF 0%, #0070F3 50%, #7C3AED 100%)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 8px 32px rgba(0, 229, 255, 0.7), 0 0 50px rgba(0, 112, 243, 0.45)',
              border:'2px solid rgba(255, 255, 255, 0.45)',
              flexShrink:0,
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 21 7 21 17 12 22 3 17 3 7" stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" />
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>

            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
              <div style={{
                fontSize:'clamp(34px, 3.8vw, 44px)',
                fontWeight:900,
                letterSpacing:'-0.03em',
                lineHeight:1,
                background:'linear-gradient(135deg, #FFFFFF 15%, #38BDF8 60%, #00E5FF 100%)',
                WebkitBackgroundClip:'text',
                WebkitTextFillColor:'transparent',
                backgroundClip:'text',
                filter:'drop-shadow(0 0 28px rgba(0, 229, 255, 0.75)) drop-shadow(0 4px 12px rgba(0,0,0,0.85))',
              }}>
                ToolSathi
              </div>
              <div style={{
                fontSize:'12px',
                letterSpacing:'1.8px',
                fontFamily:'monospace',
                color:'#38BDF8',
                fontWeight:800,
                marginTop:'4px',
                textShadow:'0 0 14px rgba(0,229,255,0.65)',
              }}>
                EVIDENCE LINE • INTELLIGENT MANUFACTURING CONTROL
              </div>
            </div>
          </div>

          {/* Skip button on far right */}
          <button onClick={handleSkip} style={{
            position:'absolute', right:'36px',
            padding:'10px 24px', borderRadius:'100px',
            background:'rgba(255,255,255,0.08)', backdropFilter:'blur(16px)',
            border:'1.5px solid rgba(0, 229, 255, 0.45)',
            color:'#FFFFFF', fontSize:'14px',
            fontWeight:800, fontFamily:'monospace', cursor:'pointer',
            boxShadow:'0 4px 16px rgba(0,0,0,0.4)',
            transition:'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(0,229,255,0.25)'; e.currentTarget.style.borderColor='#00E5FF'; e.currentTarget.style.transform='scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor='rgba(0,229,255,0.45)'; e.currentTarget.style.transform='scale(1)'; }}
          >
            Skip Intro →
          </button>
        </div>

        {/* ══ CENTER STAGE ══ */}
        <div style={{
          position:'relative', zIndex:20,
          display:'flex', flexDirection:'column', alignItems:'center',
          gap:'20px', textAlign:'center',
          maxWidth:'800px', width:'100%', padding:'0 32px',
        }}>
          {/* Icon card */}
          <div key={`ic-${phase}`} className="is-pop" style={{
            padding:'26px',
            borderRadius:'24px',
            background:`linear-gradient(145deg, rgba(20,15,8,0.8) 0%, ${cur.bg} 100%)`,
            border:`1.5px solid ${cur.border}`,
            boxShadow:`
              0 0 0 1px rgba(255,255,255,0.04),
              0 0 55px ${cur.glow},
              inset 0 1px 0 rgba(255,255,255,0.07),
              inset 0 -1px 0 rgba(0,0,0,0.3)
            `,
            backdropFilter:'blur(28px)',
            transition:'border-color 0.5s, box-shadow 0.5s',
          }}>
            {cur.icon}
          </div>

          {/* Phase badge */}
          <div key={`ba-${phase}`} className="is-fu" style={{
            display:'inline-flex', alignItems:'center', gap:'9px',
            padding:'7px 20px', borderRadius:'100px',
            background:cur.bg,
            border:`1px solid ${cur.accent}`,
            boxShadow:`0 0 22px ${cur.glow}`,
            transition:'background 0.5s, border-color 0.5s, box-shadow 0.5s',
          }}>
            <span style={{
              width:'8px', height:'8px', borderRadius:'50%', flexShrink:0,
              background:cur.accent, boxShadow:`0 0 10px ${cur.accent}`,
              animation:'is-pulse 1.1s ease-in-out infinite',
            }}/>
            <span style={{
              fontSize:'11.5px', fontWeight:800, fontFamily:'monospace',
              letterSpacing:'0.09em', color:cur.accent,
            }}>{cur.badge}</span>
          </div>

          {/* Title */}
          <h1 key={`ti-${phase}`} className="is-fu2" style={{
            fontSize:'clamp(28px,4.2vw,50px)', fontWeight:900,
            letterSpacing:'-0.035em', lineHeight:1.12, margin:0,
            color:'#FFFFFF', WebkitTextFillColor:'#FFFFFF',
            textShadow:`0 0 55px ${cur.glow}, 0 2px 28px rgba(0,0,0,0.98)`,
          }}>
            {phase === 1
              ? <>Exposure Boundary:{' '}
                  <span style={{ color:cur.accent, fontFamily:'monospace',
                    textShadow:`0 0 30px ${cur.accent}, 0 0 60px ${cur.accent}` }}>
                    {counter}
                  </span>{' '}Assemblies
                </>
              : cur.title}
          </h1>

          {/* Subtitle */}
          <p key={`su-${phase}`} className="is-fu3" style={{
            fontSize:'clamp(14px,1.8vw,18px)', lineHeight:1.7, margin:0,
            maxWidth:'650px', color:'rgba(220,210,190,0.85)',
            WebkitTextFillColor:'rgba(220,210,190,0.85)',
          }}>
            {cur.sub}
          </p>

          {/* Accent underline */}
          <div style={{
            width:'80px', height:'2.5px',
            background:`linear-gradient(90deg, transparent, ${cur.accent}, transparent)`,
            boxShadow:`0 0 14px ${cur.accent}`,
            borderRadius:'2px',
            transition:'background 0.5s, box-shadow 0.5s',
          }}/>
        </div>

        {/* ══ BOTTOM TIMELINE ══ */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          padding:'0 48px 24px', zIndex:30,
        }}>
          {/* Phase labels */}
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
            {PHASES.map((p, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{
                  width:'10px', height:'10px', borderRadius:'50%', flexShrink:0,
                  background: i <= phase ? p.accent : 'rgba(255,255,255,0.18)',
                  boxShadow: i === phase ? `0 0 16px ${p.accent}` : 'none',
                  transition:'background 0.4s, box-shadow 0.4s',
                }}/>
                <span style={{
                  fontSize:'13px', fontFamily:'monospace', fontWeight:800,
                  letterSpacing:'0.06em',
                  color: i < phase ? 'rgba(255,255,255,0.5)'
                       : i === phase ? p.accent
                       : 'rgba(255,255,255,0.28)',
                  textShadow: i === phase ? `0 0 14px ${p.accent}` : 'none',
                  transition:'color 0.4s, text-shadow 0.4s',
                }}>
                  {i < phase ? '✓ ' : i === phase ? '▶ ' : '○ '}
                  {['Telemetry Intake','Exposure Trace','Clarity Glass','S/4 Governance'][i]}
                </span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{
            width:'100%', height:'3px', borderRadius:'2px',
            background:'rgba(255,255,255,0.08)', overflow:'hidden', position:'relative',
          }}>
            <div style={{
              height:'100%',
              width:`${((phase+1)/4)*100}%`,
              background:`linear-gradient(90deg, #00D4FF, ${cur.accent})`,
              boxShadow:`0 0 14px ${cur.glow}`,
              borderRadius:'2px',
              transition:'width 0.85s cubic-bezier(.34,1.56,.64,1), background 0.5s',
            }}/>
            <div style={{
              position:'absolute', top:0, bottom:0, left:0, right:0,
              background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
              animation:'is-shimmer 1.8s ease-in-out infinite',
            }}/>
          </div>

          {/* Pill dots */}
          <div style={{ display:'flex', justifyContent:'center', gap:'8px', marginTop:'12px' }}>
            {PHASES.map((p, i) => (
              <div key={i} style={{
                height:'7px',
                width: i === phase ? '28px' : '7px',
                borderRadius:'4px',
                background: i < phase ? 'rgba(255,255,255,0.22)'
                           : i === phase ? p.accent
                           : 'rgba(255,255,255,0.1)',
                boxShadow: i === phase ? `0 0 14px ${p.accent}` : 'none',
                transition:'all 0.45s cubic-bezier(.34,1.56,.64,1)',
              }}/>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
