import React, { useState } from 'react';
import GlassPanel from '../../components/GlassPanel';
import AuthorChip from '../../components/AuthorChip';
import StatusBadge from '../../components/StatusBadge';
import InterlockGate from './InterlockGate';

/**
 * ProposalCard: Interlock containment proposal card.
 * Starts cobalt ("AI proposed"), requires named human approval,
 * opens interlock gate doors upon approval, and displays simulated S/4 receipt.
 * Clean industrial design, zero emojis.
 */
export default function ProposalCard({
  proposal,
  currentRole = 'Manager',
  canApprove = false,
  onApprove,
  onReject
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isApproved = proposal.status === 'Approved';
  const isRejected = proposal.status === 'Rejected';
  const isPending = proposal.status === 'Pending';

  const handleApprove = () => {
    if (onApprove) onApprove(proposal.proposalId);
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) {
      alert('Formal compliance justification is required.');
      return;
    }
    if (onReject) onReject(proposal.proposalId, rejectReason);
    setRejecting(false);
  };

  return (
    <GlassPanel
      variant="strong"
      style={{
        padding: '24px',
        border: isApproved
          ? '1px solid rgba(14, 163, 122, 0.4)'
          : isRejected
            ? '1px solid rgba(224, 49, 75, 0.4)'
            : '1px solid rgba(59, 91, 255, 0.25)',
        backgroundColor: isApproved
          ? 'rgba(255, 255, 255, 0.94)'
          : 'rgba(255, 255, 255, 0.88)',
        boxShadow: isApproved
          ? '0 12px 28px rgba(14, 163, 122, 0.12)'
          : '0 8px 24px rgba(14, 26, 47, 0.06)'
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(14, 26, 47, 0.08)',
              color: 'var(--ink)'
            }}>
              {proposal.proposalId}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
              Target: <strong style={{ color: 'var(--ink)' }}>{proposal.targetSystem}</strong>
            </span>
          </div>

          <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
            {proposal.title}
          </h4>
        </div>

        <StatusBadge status="Simulated" size="small" />
      </div>

      <p style={{ fontSize: '14px', color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: '14px' }}>
        {proposal.description}
      </p>

      {/* Provenance Author Chip */}
      <div style={{ marginBottom: '14px' }}>
        {isPending && <AuthorChip type="ai" />}
        {isApproved && (
          <AuthorChip
            type="approved"
            role={proposal.approvedBy || 'Not supplied'}
            time={proposal.approvedAt ? new Date(proposal.approvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not supplied'}
            reason={proposal.approvalReason || 'Not supplied'}
          />
        )}
        {isRejected && (
          <AuthorChip
            type="rejected"
            reason={proposal.approvalReason}
          />
        )}
      </div>

      {/* 3D Physical Interlock Gate */}
      <InterlockGate
        isOpen={isApproved}
        status={proposal.status}
        requiredRole={proposal.requiredRole}
      />

      {/* Simulated S/4 / DM Receipt Stamp */}
      {isApproved && proposal.simulatedReceipt && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderRadius: '8px',
          backgroundColor: 'rgba(14, 163, 122, 0.08)',
          border: '1px solid rgba(14, 163, 122, 0.25)',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--jade-ink)',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{proposal.simulatedReceipt.chip}</span>
          </div>
          <span>Tx: {proposal.simulatedReceipt.transactionId}</span>
        </div>
      )}

      {/* Action Controls for Pending Proposals */}
      {isPending && !rejecting && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '12px',
          borderTop: '1px solid rgba(14, 26, 47, 0.08)'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
            Authority Required: <strong style={{ color: 'var(--cobalt-ink)' }}>{proposal.requiredRole}</strong>
            {!canApprove && (
              <span style={{ color: 'var(--saffron-ink)', marginLeft: '6px' }}>
                (Switch persona to approve)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              disabled={!canApprove} onClick={() => setRejecting(true)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--ruby-ink)',
                backgroundColor: 'var(--ruby-soft)',
                border: '1px solid rgba(224, 49, 75, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              Reject with Reason
            </button>

            <button
              onClick={handleApprove}
              disabled={!canApprove}
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '13px',
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: canApprove ? 'var(--jade)' : '#94A3B8',
                boxShadow: canApprove ? '0 4px 14px rgba(14, 163, 122, 0.35)' : 'none',
                cursor: canApprove ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
              <span>Approve &amp; Dispatch</span>
            </button>
          </div>
        </div>
      )}

      {/* Rejection Reason Form */}
      {isPending && rejecting && (
        <div style={{
          padding: '12px',
          borderRadius: '10px',
          backgroundColor: '#FFF5F5',
          border: '1px solid rgba(224, 49, 75, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ruby-ink)' }}>
            Compliance Justification for Rejection (Recorded in Audit Ledger):
          </label>
          <input
            type="text"
            placeholder="e.g. Work center calibration verified within acceptable tolerance..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(14, 26, 47, 0.15)',
              fontSize: '13px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={() => setRejecting(false)}
              style={{ fontSize: '12px', padding: '6px 12px', color: 'var(--ink-soft)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleRejectConfirm}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--ruby)',
                color: '#FFFFFF'
              }}
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
