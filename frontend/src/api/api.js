import seedData from './fixtures/seed.json';
import incidentData from './fixtures/incident.json';
import toolsData from './fixtures/tools.json';
import proposalsData from './fixtures/proposals.json';
import historyData from './fixtures/history.json';
import auditData from './fixtures/audit.json';
import ncCodesData from './fixtures/ncCodes.json';

const USE_MOCK = true;
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4004/api';

/**
 * ToolSathi API Service Layer
 * Fully supports offline mock execution using deterministic frozen fixtures
 * or live SAP BTP CAP endpoints when USE_MOCK is set to false.
 */

// Helper to simulate slight network latency for realistic loading states
const mockDelay = (ms = 120) => new Promise(res => setTimeout(res, ms));

export const api = {
  // 1. Incidents
  async getIncident(id = 'TS-0001') {
    if (USE_MOCK) {
      await mockDelay();
      return { ok: true, data: incidentData };
    }
    const res = await fetch(`${BASE_URL}/incidents/${id}`);
    return res.json();
  },

  async createIncident(payload) {
    if (USE_MOCK) {
      await mockDelay(200);
      return {
        ok: true,
        data: {
          incidentId: `TS-${Math.floor(1000 + Math.random() * 9000)}`,
          toolId: payload.toolId,
          state: 'Reported',
          reportedAt: new Date().toISOString(),
          ...payload
        }
      };
    }
    const res = await fetch(`${BASE_URL}/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async confirmIncident(id, confirmedFields) {
    if (USE_MOCK) {
      await mockDelay(150);
      return {
        ok: true,
        data: { incidentId: id, status: 'Confirmed', confirmedFields }
      };
    }
    const res = await fetch(`${BASE_URL}/incidents/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(confirmedFields)
    });
    return res.json();
  },

  // 2. Traceability & Exposure
  async getTrace(windowHours = 72) {
    if (USE_MOCK) {
      await mockDelay(80);
      const windowKey = windowHours === 24 ? '24h' : windowHours === 168 ? '7d' : '72h';
      
      // Filter units matching window
      const unitsInWindow = seedData.filter(u => 
        u.toolId === 'TOOL-B' && u.windowMembership.includes(windowKey)
      );

      // Group by location
      const locations = {
        factoryStock: unitsInWindow.filter(u => u.location === 'Factory stock').length,
        dealerX: unitsInWindow.filter(u => u.location === 'Dealer X').length,
        dealerY: unitsInWindow.filter(u => u.location === 'Dealer Y').length
      };

      // Group by tier
      const tiers = {
        confirmed: unitsInWindow.filter(u => u.tier === 'Confirmed').length,
        probable: unitsInWindow.filter(u => u.tier === 'Probable').length,
        unknown: unitsInWindow.filter(u => u.tier === 'Unknown').length
      };

      return {
        ok: true,
        data: {
          incidentId: 'TS-0001',
          toolId: 'TOOL-B',
          windowHours,
          totalExposed: unitsInWindow.length,
          locations,
          tiers,
          units: unitsInWindow,
          allSeedUnits: seedData
        }
      };
    }
    const res = await fetch(`${BASE_URL}/incidents/TS-0001/trace?window=${windowHours}`);
    return res.json();
  },

  // 3. Equipment & Tools
  async getTools() {
    if (USE_MOCK) {
      await mockDelay();
      return { ok: true, data: toolsData };
    }
    const res = await fetch(`${BASE_URL}/tools`);
    return res.json();
  },

  async getToolHistory(toolId = 'TOOL-B') {
    if (USE_MOCK) {
      await mockDelay();
      return {
        ok: true,
        data: historyData.filter(h => h.toolId === toolId || !h.toolId)
      };
    }
    const res = await fetch(`${BASE_URL}/tools/${toolId}/history`);
    return res.json();
  },

  // 4. Governance Proposals & Approvals
  async getProposals(incidentId = 'TS-0001') {
    if (USE_MOCK) {
      await mockDelay();
      return { ok: true, data: proposalsData };
    }
    const res = await fetch(`${BASE_URL}/incidents/${incidentId}/proposals`);
    return res.json();
  },

  async decideApproval(approvalId, decision, role, reason) {
    if (USE_MOCK) {
      await mockDelay(180);
      return {
        ok: true,
        data: {
          approvalId,
          decision,
          role,
          reason,
          timestamp: new Date().toISOString(),
          simulatedReceipt: {
            transactionId: `SAP-BTP-TX-${Math.floor(100000 + Math.random() * 900000)}`,
            status: decision === 'Approved' ? 'POSTED_TO_MOCK_S4' : 'REVOKED',
            chip: 'Simulated: sent to mock S/4'
          }
        }
      };
    }
    const res = await fetch(`${BASE_URL}/approvals/${approvalId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, role, reason })
    });
    return res.json();
  },

  // 5. Verified Return to Service
  async verifyReturn(toolId, verificationPayload) {
    if (USE_MOCK) {
      await mockDelay(220);
      return {
        ok: true,
        data: {
          toolId,
          status: 'Active',
          lastVerifiedGood: new Date().toISOString(),
          ...verificationPayload
        }
      };
    }
    const res = await fetch(`${BASE_URL}/incidents/verify-return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId, ...verificationPayload })
    });
    return res.json();
  },

  // 6. Audit Trail
  async getAudit(incidentId = 'TS-0001') {
    if (USE_MOCK) {
      await mockDelay();
      return { ok: true, data: auditData };
    }
    const res = await fetch(`${BASE_URL}/audit?incident=${incidentId}`);
    return res.json();
  },

  // 7. Nonconformance Catalog
  async getNcCodes() {
    if (USE_MOCK) {
      return { ok: true, data: ncCodesData };
    }
    const res = await fetch(`${BASE_URL}/ncCodes`);
    return res.json();
  }
};
