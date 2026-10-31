import React from 'react';
import GlassPanel from '../../components/GlassPanel';

/**
 * GlassTanks: Three tall glass vessels (Factory stock, Dealer X, Dealer Y)
 * filling with in-window units, stacked by tier.
 * Scaled-up high-visibility typography.
 */
export default function GlassTanks({
  counts = { factoryStock: 40, dealerX: 35, dealerY: 25 },
  tiers = { confirmed: 90, probable: 4, unknown: 6 },
  totalUnits = 100,
  onTankClick
}) {
  const tanks = [
    {
      id: 'factoryStock',
      title: 'Factory Stock',
      locationTag: 'Plant 1010 • Loc 0001 (Warehouse)',
      count: counts.factoryStock,
      max: 60,
      status: 'Action: Ready for QA Block',
      actionBadge: 'Hold Proposed',
      accentColor: 'var(--ruby)'
    },
    {
      id: 'dealerX',
      title: 'Dealer X (Bengaluru North)',
      locationTag: 'Outbound Transit / Consignment',
      count: counts.dealerX,
      max: 60,
      status: 'Action: Trace Notice Dispatched',
      actionBadge: 'Escalated',
      accentColor: 'var(--brand-cyan)'
    },
    {
      id: 'dealerY',
      title: 'Dealer Y (Hubballi Central)',
      locationTag: 'Outbound Transit (1 Stale Scan)',
      count: counts.dealerY,
      max: 60,
      status: 'Action: Awaiting Transit Ping',
      actionBadge: '1 Warning',
      accentColor: 'var(--saffron)'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{
          fontSize: '22px',
          fontWeight: 800,
          color: 'var(--ink)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: 'var(--brand-cyan)',
            boxShadow: '0 0 8px var(--brand-cyan)'
          }} />
          Destination Inventory Vessels (Glass Tanks)
        </h3>
        <span style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-secondary)' }}>
          {totalUnits} Units Flowed Downstream
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '22px' }}>
        {tanks.map(tank => {
          const fillPct = Math.min(100, Math.round((tank.count / tank.max) * 100));

          return (
            <GlassPanel
              key={tank.id}
              variant="strong"
              interactive
              onClick={() => onTankClick && onTankClick(tank.id)}
              style={{ padding: '24px', overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)' }}>
                    {tank.title}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', marginTop: '3px' }}>
                    {tank.locationTag}
                  </div>
                </div>

                <span style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: tank.id === 'dealerY' ? 'rgba(217, 119, 6, 0.15)' : 'var(--brand-cyan-soft)',
                  color: tank.id === 'dealerY' ? 'var(--saffron-ink)' : 'var(--brand-cyan-ink)',
                  border: `1px solid ${tank.id === 'dealerY' ? 'rgba(217, 119, 6, 0.35)' : 'rgba(0, 184, 204, 0.35)'}`
                }}>
                  {tank.actionBadge}
                </span>
              </div>

              {/* Glass Vessel Column Visualization */}
              <div style={{
                position: 'relative',
                height: '120px',
                borderRadius: '16px',
                background: 'rgba(230, 236, 245, 0.75)',
                border: '2px solid rgba(255, 255, 255, 0.95)',
                boxShadow: 'inset 0 2px 6px rgba(7, 17, 32, 0.1), 0 8px 20px rgba(7, 17, 32, 0.05)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'flex-end',
                marginBottom: '16px'
              }}>
                {/* Volume graduation lines */}
                <div style={{
                  position: 'absolute',
                  right: '10px',
                  top: '10px',
                  bottom: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  pointerEvents: 'none',
                  zIndex: 2,
                  opacity: 0.6
                }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>60 max</span>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>40</span>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>20</span>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>0</span>
                </div>

                {/* Liquid / Pellet Column Fill */}
                <div
                  style={{
                    width: '100%',
                    height: `${fillPct}%`,
                    background: tank.id === 'factoryStock'
                      ? 'linear-gradient(180deg, rgba(220, 38, 38, 0.8) 0%, rgba(153, 27, 27, 0.95) 100%)'
                      : tank.id === 'dealerX'
                        ? 'linear-gradient(180deg, rgba(0, 184, 204, 0.8) 0%, rgba(0, 114, 243, 0.92) 100%)'
                        : 'linear-gradient(180deg, rgba(217, 119, 6, 0.8) 0%, rgba(146, 64, 14, 0.95) 100%)',
                    borderRadius: '0 0 14px 14px',
                    transition: 'height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    position: 'relative',
                    boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.6)'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '50%'
                  }} />
                </div>

                {/* Prominent Unit Count overlay */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 3
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(8px)',
                    padding: '6px 18px',
                    borderRadius: 'var(--radius-pill)',
                    boxShadow: '0 4px 12px rgba(7, 17, 32, 0.15)',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                      {tank.count}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-soft)' }}>
                      units
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '14px',
                color: 'var(--ink-secondary)'
              }}>
                <span style={{ fontWeight: 600 }}>{tank.status}</span>
                <span style={{ fontWeight: 800, color: 'var(--ink)' }}>{fillPct}% Capacity</span>
              </div>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}
