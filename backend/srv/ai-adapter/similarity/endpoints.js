const express = require('express');
const { requireRole } = require('../../lib/auth');
const { createSearch } = require('./search');
function createSimilarityRouter({ lookupTool, lookupIncident, loadSources, embedder }) {
  const router = express.Router(), search = createSearch({ embedder, loadSources });
  let active = 0;
  const handle = fn => async (req, res) => {
    try {
      if (active >= 2) return res.status(429).json({ error: { code: 'SEARCH_BUSY', message: 'Search is busy. Try again shortly.', details: {} } });
      active++;
      try { await fn(req, res); } finally { active--; }
    } catch (error) {
      const known = ['AI_INVALID_INPUT', 'TOOL_NOT_FOUND', 'INCIDENT_NOT_FOUND'].includes(error.code);
      res.status(error.code === 'AI_INVALID_INPUT' ? 400 : known ? 404 : 503).json({ error: {
        code: known ? error.code : 'SEARCH_UNAVAILABLE', message: known ? error.message : 'Source records could not be searched. Try again later.', details: {},
      } });
    }
  };
  router.post('/ai/search', requireRole(), handle(async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('Provide a search request.'), { code: 'AI_INVALID_INPUT' });
    if (body.toolId != null && (typeof body.toolId !== 'string' || !body.toolId.trim() || body.toolId.length > 120))
      throw Object.assign(new Error('Invalid tool filter.'), { code: 'AI_INVALID_INPUT' });
    if (body.toolId && !(await lookupTool(body.toolId))) throw Object.assign(new Error('Select a tool from the register.'), { code: 'TOOL_NOT_FOUND' });
    res.json(await search({ query: body.query, toolId: body.toolId, category: body.category, limit: body.limit, asOf: body.asOf }));
  }));
  router.get('/incidents/:id/similar', requireRole(), handle(async (req, res) => {
    const incident = await lookupIncident(req.params.id);
    if (!incident) throw Object.assign(new Error('Incident not found.'), { code: 'INCIDENT_NOT_FOUND' });
    if (req.query.scope != null && !['same-tool', 'all-tools'].includes(req.query.scope))
      throw Object.assign(new Error('scope must be same-tool or all-tools.'), { code: 'AI_INVALID_INPUT' });
    const query = [incident.translatedText, incident.rawText, incident.category].filter(Boolean).join('\n').slice(0, 2000);
    res.json(await search({ query, toolId: req.query.scope === 'all-tools' ? undefined : incident.toolId,
      excludeIncidentId: incident.incidentId, asOf: incident.reportedAt, limit: req.query.limit }));
  }));
  return router;
}
module.exports = { createSimilarityRouter };
