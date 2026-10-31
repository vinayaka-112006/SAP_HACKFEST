import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/api';
import seedUnits from '../api/fixtures/seed.json';
import initialIncident from '../api/fixtures/incident.json';
import initialTools from '../api/fixtures/tools.json';
import initialProposals from '../api/fixtures/proposals.json';
import initialHistory from '../api/fixtures/history.json';
import initialAudit from '../api/fixtures/audit.json';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  // Role: 'Worker' | 'Manager' | 'Quality' | 'Technician'
  const [currentRole, setCurrentRole] = useState('Manager');
  
  // Investigation Window: 24 | 72 | 168 (hours)
  const [selectedWindow, setSelectedWindow] = useState(72);
  
  // Data entities
  const [incident, setIncident] = useState(initialIncident);
  const [tools, setTools] = useState(initialTools);
  const [proposals, setProposals] = useState(initialProposals);
  const [history, setHistory] = useState(initialHistory);
  const [auditLog, setAuditLog] = useState(initialAudit);
  
  // UI States
  const [selectedUnit, setSelectedUnit] = useState(null); // Clicked unit for EvidenceDrawer
  const [viewMode, setViewMode] = useState('yard'); // 'yard' | 'list'
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeTab, setActiveTab] = useState('console'); // console view sub-section

  // Auto-detect reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Compute live window metrics based on selectedWindow
  const windowKey = selectedWindow === 24 ? '24h' : selectedWindow === 168 ? '7d' : '72h';
  
  // All 300 assemblies
  const allUnits = seedUnits;
  
  // Units inside the investigation window (Tool B units)
  const inWindowUnits = allUnits.filter(
    u => u.toolId === 'TOOL-B' && u.windowMembership.includes(windowKey)
  );

  // Dynamic counts for Glass Tanks
  const tankCounts = {
    factoryStock: inWindowUnits.filter(u => u.location === 'Factory stock').length,
    dealerX: inWindowUnits.filter(u => u.location === 'Dealer X').length,
    dealerY: inWindowUnits.filter(u => u.location === 'Dealer Y').length,
  };

  // Dynamic tier breakdown
  const tierCounts = {
    confirmed: inWindowUnits.filter(u => u.tier === 'Confirmed').length,
    probable: inWindowUnits.filter(u => u.tier === 'Probable').length,
    unknown: inWindowUnits.filter(u => u.tier === 'Unknown').length,
  };

  // Autonomy Ladder validation helper
  const canRoleApprove = (proposal) => {
    if (!proposal || proposal.status !== 'Pending') return false;
    const req = (proposal.requiredRole || '').toLowerCase();
    const curr = currentRole.toLowerCase();

    if (req === 'manager') return curr === 'manager';
    if (req === 'quality') return curr === 'quality';
    if (req === 'technician') return curr === 'technician';
    return false;
  };

  // 1. Approve Proposal action
  const approveProposal = async (proposalId, customReason = '') => {
    const target = proposals.find(p => p.proposalId === proposalId);
    if (!target) return;

    if (!canRoleApprove(target)) {
      alert(`Permission Denied: Proposal requires approval by ${target.requiredRole}. Current persona is ${currentRole}. Please switch role.`);
      return;
    }

    const approvalReason = customReason || `Validated by ${currentRole}: safety boundary confirmed`;
    const now = new Date();

    // Update proposal
    const updatedProposals = proposals.map(p => {
      if (p.proposalId === proposalId) {
        return {
          ...p,
          status: 'Approved',
          approvedBy: `${currentRole} (${now.toLocaleTimeString()})`,
          approvedAt: now.toISOString(),
          approvalReason,
          simulatedReceipt: {
            transactionId: `SAP-TX-${Math.floor(100000 + Math.random() * 900000)}`,
            status: 'EXECUTED_SUCCESSFULLY',
            timestamp: now.toISOString(),
            chip: 'Simulated: sent to mock S/4'
          }
        };
      }
      return p;
    });
    setProposals(updatedProposals);

    // If restricting tool was approved, ensure Tool B remains restricted
    if (target.type === 'restrict_tool') {
      setTools(tools.map(t => t.toolId === 'TOOL-B' ? { ...t, status: 'Restricted' } : t));
    }

    // Append to immutable audit log
    const newAuditEntry = {
      auditId: `AUD-${Math.floor(9100 + Math.random() * 800)}`,
      incidentId: incident.incidentId,
      timestamp: now.toISOString(),
      actor: `${currentRole} User`,
      role: currentRole,
      action: 'PROPOSAL_APPROVED',
      details: `Proposal ${proposalId} (${target.title}) approved. ${approvalReason}.`,
      modelVersion: 'Human-in-the-Loop Gate M10'
    };
    setAuditLog(prev => [newAuditEntry, ...prev]);
  };

  // 2. Reject Proposal action (Requires explicit reason)
  const rejectProposal = async (proposalId, rejectReason) => {
    if (!rejectReason || !rejectReason.trim()) {
      alert('A formal rejection reason is strictly mandatory for governance compliance.');
      return;
    }

    const target = proposals.find(p => p.proposalId === proposalId);
    if (!target) return;

    const now = new Date();
    const updatedProposals = proposals.map(p => {
      if (p.proposalId === proposalId) {
        return {
          ...p,
          status: 'Rejected',
          approvedBy: null,
          approvedAt: now.toISOString(),
          approvalReason: rejectReason,
          simulatedReceipt: null
        };
      }
      return p;
    });
    setProposals(updatedProposals);

    // Append to audit log
    const newAuditEntry = {
      auditId: `AUD-${Math.floor(9100 + Math.random() * 800)}`,
      incidentId: incident.incidentId,
      timestamp: now.toISOString(),
      actor: `${currentRole} User`,
      role: currentRole,
      action: 'PROPOSAL_REJECTED',
      details: `Proposal ${proposalId} REJECTED: "${rejectReason}"`,
      modelVersion: 'Human-in-the-Loop Gate M10'
    };
    setAuditLog(prev => [newAuditEntry, ...prev]);
  };

  // 3. Verify Return to Service
  const verifyReturnToService = (toolId, { repairLog, testReadings, verifierName }) => {
    const now = new Date();
    
    // Update Tool status to Active/Verified
    setTools(tools.map(t => {
      if (t.toolId === toolId) {
        return {
          ...t,
          status: 'Active',
          lastVerifiedGood: now.toISOString(),
          lockoutDetails: {
            isLockedOut: false,
            tagId: t.lockoutDetails?.tagId || 'LOTO-VERIFIED',
            lockedBy: `Verified Return by ${verifierName}`,
            lockReason: 'Passed metrology verification',
            verifiedAt: now.toISOString()
          }
        };
      }
      return t;
    }));

    // Update incident state
    setIncident(prev => ({ ...prev, state: 'Closed' }));

    // Append history event
    const returnHistoryEvent = {
      eventId: `HIST-VERIFY-${Math.floor(100 + Math.random() * 900)}`,
      date: now.toISOString(),
      type: 'return_to_service',
      toolId,
      title: 'Verified Return to Service',
      author: verifierName,
      resolution: `Repair Log: "${repairLog}". 3-Cycle Torque Verification: ${testReadings.join('Nm, ')}Nm (All within 85±2Nm). Lockout removed.`,
      badge: 'Verified Return'
    };
    setHistory(prev => [returnHistoryEvent, ...prev]);

    // Append audit log
    const newAuditEntry = {
      auditId: `AUD-${Math.floor(9200 + Math.random() * 800)}`,
      incidentId: incident.incidentId,
      timestamp: now.toISOString(),
      actor: verifierName,
      role: currentRole,
      action: 'TOOL_RETURN_TO_SERVICE_VERIFIED',
      details: `Tool ${toolId} restored to service. Test readings: ${testReadings.join(', ')}Nm.`,
      modelVersion: 'Metrology Verifier Gate M12'
    };
    setAuditLog(prev => [newAuditEntry, ...prev]);
  };

  // 4. Handle Duplicate Prompt decision
  const handleDuplicateDecision = (decision, reason = '') => {
    const now = new Date();
    const actionText = decision === 'merge' ? 'DUPLICATE_MERGED' : 'DUPLICATE_KEPT_SEPARATE';
    
    const newAuditEntry = {
      auditId: `AUD-${Math.floor(9300 + Math.random() * 800)}`,
      incidentId: incident.incidentId,
      timestamp: now.toISOString(),
      actor: `${currentRole} User`,
      role: currentRole,
      action: actionText,
      details: `Secondary report TS-0002 was ${decision === 'merge' ? 'MERGED with' : 'KEPT SEPARATE from'} TS-0001. Justification: ${reason || 'Operator confirmation'}.`,
      modelVersion: 'Duplicate Similarity Guardrail M7'
    };
    setAuditLog(prev => [newAuditEntry, ...prev]);
  };

  return (
    <StoreContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        selectedWindow,
        setSelectedWindow,
        incident,
        setIncident,
        tools,
        proposals,
        history,
        auditLog,
        selectedUnit,
        setSelectedUnit,
        viewMode,
        setViewMode,
        reducedMotion,
        activeTab,
        setActiveTab,
        allUnits,
        inWindowUnits,
        tankCounts,
        tierCounts,
        canRoleApprove,
        approveProposal,
        rejectProposal,
        verifyReturnToService,
        handleDuplicateDecision
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
