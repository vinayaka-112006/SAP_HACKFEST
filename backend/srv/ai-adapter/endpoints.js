const express = require('express');
const { requireRole } = require('../lib/auth');
const { readConfig, createClient } = require('./sarvam-client');
const { createIntake } = require('./intake');
const { validateInput, error } = require('./validation');
function createRouter({ lookupTool, loadNcCatalogue, clientFactory = () => createClient(readConfig()) }) {
  const router = express.Router();
  let client, active = 0;
  const requests = new Map();
  const limited = handler => async (req, res) => {
    try {
      const now = Date.now();
      for (const [id, record] of requests) if (now - record.at >= 60000) requests.delete(id);
      const count = requests.get(req.user.id)?.count || 0;
      if (count >= 6 || active >= 2 || (requests.size >= 1000 && !requests.has(req.user.id)))
        throw error('AI_RATE_LIMITED', 'Too many AI requests. Wait a minute or report manually.');
      requests.set(req.user.id, { at: requests.get(req.user.id)?.at || now, count: count + 1 });
      active++;
      try { await handler(req, res, () => (client ||= clientFactory())); }
      finally { active--; }
    } catch (cause) {
      const statuses = { AI_INVALID_INPUT: 400, TOOL_NOT_FOUND: 404, AI_UNSUPPORTED_AUDIO: 415,
        AI_AUDIO_REJECTED: 422, AI_INVALID_OUTPUT: 502, AI_RATE_LIMITED: 429, AI_CALL_LIMIT: 429 };
      const known = /^AI_|^TOOL_NOT_FOUND$/.test(cause.code || '');
      res.status(statuses[cause.code] || 503).json({ error: {
        code: known ? cause.code : 'AI_UNAVAILABLE',
        message: known ? cause.message : 'AI is unavailable. Manual reporting remains available.', details: {},
      } });
    }
  };
  router.post('/ai/structure-report', requireRole('Worker', 'Manager'), limited(async (req, res, getClient) => {
    validateInput(req.body);
    if (!(await lookupTool(req.body.toolId))) throw error('TOOL_NOT_FOUND', 'Select a tool from the live register.');
    const catalogue = await loadNcCatalogue();
    res.json(await createIntake({ client: getClient(), catalogue })(req.body));
  }));
  router.post('/ai/transcribe', requireRole('Worker', 'Manager'),
    express.raw({ type: () => true, limit: '2mb' }), limited(async (req, res, getClient) => {
      const mimeType = (req.get('content-type') || '').split(';')[0].toLowerCase();
      if (!['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg'].includes(mimeType))
        throw error('AI_UNSUPPORTED_AUDIO', 'Unsupported recording format. Type your report instead.');
      if (!Buffer.isBuffer(req.body) || !req.body.length || !['kn', 'hi', 'en'].includes(req.query.language))
        throw error('AI_INVALID_INPUT', 'Provide nonempty audio and language kn, hi or en.');
      res.json(await getClient().transcribe(req.body, mimeType, req.query.language));
    }));
  return router;
}
module.exports = { createRouter };
