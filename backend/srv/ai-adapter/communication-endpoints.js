const express = require('express');
const { requireRole } = require('../lib/auth');
const { readConfig, createClient } = require('./sarvam-client');
const text = require('./communication');
const { error } = require('./validation');
function createRouter({ loadIncident, loadTrace, saveDealerDraft, clientFactory = () => createClient(readConfig()) }) {
  const router = express.Router();
  let client, active = 0;
  const calls = new Map();
  const wrap = fn => async (req, res) => {
    try {
      if (req.method === 'POST' && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) throw error('AI_INVALID_INPUT', 'Provide a JSON request object.');
      await fn(req, res);
    }
    catch (cause) {
      const known = /^(AI_|SOURCE_NOT_FOUND|APPROVAL_REQUIRED)/.test(cause.code || '');
      const status = cause.status || ({ AI_INVALID_INPUT: 400, SOURCE_NOT_FOUND: 404, APPROVAL_REQUIRED: 409, AI_RATE_LIMITED: 429, AI_CALL_LIMIT: 429, AI_INVALID_OUTPUT: 502 })[cause.code] || 503;
      res.status(status).json({ _label: 'SIMULATED', error: { code: known ? cause.code : 'AI_UNAVAILABLE', message: known ? cause.message : 'Communication is unavailable. Existing workflows remain available.', details: {} } });
    }
  };
  async function incident(id) {
    text.clean(id);
    const row = await loadIncident(id);
    if (!row) throw error('SOURCE_NOT_FOUND', 'Incident was not found.');
    return row;
  }
  router.post('/ai/readback', requireRole('Worker', 'Manager'), wrap(async (req, res) => {
    const lang = text.language(req.body.language);
    if (req.body.reviewed !== true) throw error('AI_INVALID_INPUT', 'Review the displayed card before requesting readback.');
    const card = req.body.incidentId ? await incident(req.body.incidentId) : req.body.card;
    if (!card || typeof card !== 'object') throw error('AI_INVALID_INPUT', 'Provide the reviewed card.');
    const value = text.readback(card, lang);
    const now = Date.now();
    for (const [id, entry] of calls) if (now - entry.at >= 60000) calls.delete(id);
    const entry = calls.get(req.user.id) || { at: now, count: 0 };
    if (active >= 2 || entry.count >= 6 || calls.size >= 1000 && !calls.has(req.user.id)) throw error('AI_RATE_LIMITED', 'Wait a minute before requesting more audio.');
    entry.count++; calls.set(req.user.id, entry); active++;
    try {
      client ||= clientFactory();
      res.json({ ...value, ...(await client.speak(value.text, lang)), sourceIds: req.body.incidentId ? [card.incidentId] : [], requiresWorkerConfirmation: true });
    } finally { active--; }
  }));
  router.get('/incidents/:id/status-text', requireRole(), wrap(async (req, res) => {
    res.json(text.status(await incident(req.params.id), req.query.language || 'en'));
  }));
  router.get('/incidents/:id/trace-explanation', requireRole('Manager', 'Quality', 'Verifier'), wrap(async (req, res) => {
    text.language(req.query.language || 'en');
    const windowHours = Number(req.query.window || 24);
    if (![24, 72, 168].includes(windowHours)) throw error('AI_INVALID_INPUT', 'Window must be 24, 72 or 168 hours.');
    await incident(req.params.id);
    const trace = await loadTrace(req.params.id, windowHours);
    if (!trace) throw error('SOURCE_NOT_FOUND', 'Generate a deterministic trace for this window first.');
    res.json(text.explain(trace, req.query.language || 'en'));
  }));
  router.post('/incidents/:id/dealer-draft', requireRole('Quality'), wrap(async (req, res) => {
    const lang = text.language(req.body.language || 'en');
    text.clean(req.params.id); text.clean(req.body.approvalId); text.clean(req.body.dealerId);
    res.status(201).json(await saveDealerDraft({ incidentId: req.params.id, approvalId: req.body.approvalId, dealerId: req.body.dealerId, language: lang, actor: req.user }));
  }));
  return router;
}
module.exports = { createRouter };
