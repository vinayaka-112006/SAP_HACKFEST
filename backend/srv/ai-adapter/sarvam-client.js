const { error } = require('./validation');
function readConfig(env = process.env) {
  if (!env.SARVAM_API_KEY?.trim() || /^(your|replace|placeholder)/i.test(env.SARVAM_API_KEY))
    throw error('AI_NOT_CONFIGURED', 'Add SARVAM_API_KEY to backend/.env. Manual reporting remains available.');
  const model = env.SARVAM_CHAT_MODEL || 'sarvam-105b';
  if (!['sarvam-105b', 'sarvam-105b-conversations'].includes(model))
    throw error('AI_CONFIG_INVALID', 'Unsupported SARVAM_CHAT_MODEL.');
  return { apiKey: env.SARVAM_API_KEY, model, speechModel: 'saaras:v3', timeoutMs: 20000, maxTokens: 700, maxCalls: 30 };
}
function createClient(config, fetchImpl = globalThis.fetch) {
  let calls = 0;
  return {
    get calls() { return calls; },
    async speak(text, language) {
      if (typeof text !== 'string' || !text.trim() || text.length > 2400 || !['kn', 'hi', 'en'].includes(language))
        throw error('AI_INVALID_INPUT', 'Readback requires text under 2400 characters and language kn, hi or en.');
      if (calls >= config.maxCalls) throw error('AI_CALL_LIMIT', 'Local AI call cap reached. Read the card on screen.');
      calls++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        const response = await fetchImpl('https://api.sarvam.ai/text-to-speech', {
          method: 'POST', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', 'api-subscription-key': config.apiKey },
          body: JSON.stringify({ text, language_code: `${language}-IN`, model: 'bulbul:v3', speaker: 'shubh', output_audio_codec: 'wav', speech_sample_rate: 22050 }),
        });
        if (!response.ok) throw error(({ 402: 'AI_CREDITS_EXHAUSTED', 401: 'AI_AUTH_FAILED', 403: 'AI_AUTH_FAILED', 429: 'AI_RATE_LIMITED' })[response.status] || 'AI_PROVIDER_UNAVAILABLE', 'Readback is unavailable. Read the card on screen and check Sarvam configuration or credits.');
        const body = await response.json();
        const audio = body.audios?.[0];
        if (!Array.isArray(body.audios) || body.audios.length !== 1 || typeof audio !== 'string' || audio.length > 8000000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio))
          throw error('AI_INVALID_OUTPUT', 'Speech service returned unusable audio.');
        const bytes = Buffer.from(audio, 'base64');
        if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE')
          throw error('AI_INVALID_OUTPUT', 'Speech service returned invalid WAV audio.');
        return { audio, mimeType: 'audio/wav', modelVersion: 'bulbul:v3' };
      } catch (cause) {
        if (/^AI_/.test(cause.code || '')) throw cause;
        throw error(controller.signal.aborted ? 'AI_TIMEOUT' : 'AI_PROVIDER_UNAVAILABLE', 'Readback failed. Read the card on screen.');
      } finally { clearTimeout(timer); }
    },
    async transcribe(audio, mimeType, language) {
      if (calls >= config.maxCalls) throw error('AI_CALL_LIMIT', 'Local AI call cap reached. Report manually.');
      calls++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      const extension = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/mpeg': 'mp3' }[mimeType];
      const form = new FormData();
      form.append('file', new Blob([audio], { type: mimeType }), `report.${extension}`);
      form.append('model', config.speechModel || 'saaras:v3');
      form.append('mode', 'transcribe');
      form.append('language_code', { kn: 'kn-IN', hi: 'hi-IN', en: 'en-IN' }[language]);
      try {
        const response = await fetchImpl('https://api.sarvam.ai/speech-to-text', {
          method: 'POST', signal: controller.signal, headers: { 'api-subscription-key': config.apiKey }, body: form,
        });
        if (!response.ok) {
          const failures = { 402: ['AI_CREDITS_EXHAUSTED', 'Sarvam credits are exhausted.'],
            403: ['AI_AUTH_FAILED', 'Check the backend Sarvam key.'],
            429: ['AI_RATE_LIMITED', 'Sarvam rate limit reached. Try later.'],
            400: ['AI_AUDIO_REJECTED', 'Audio was rejected. Record a short report or type it.'],
            422: ['AI_AUDIO_REJECTED', 'Use supported audio under 30 seconds or type your report.'] };
          throw error(...(failures[response.status] || ['AI_PROVIDER_UNAVAILABLE', 'Speech service is unavailable. Type your report.']));
        }
        const body = await response.json();
        if (typeof body.transcript !== 'string' || !body.transcript.trim() || body.transcript.length > 2000)
          throw error('AI_INVALID_OUTPUT', 'No usable transcript returned. Try again or type your report.');
        return { _label: 'SIMULATED', _stub: false, transcript: body.transcript,
          detectedLanguage: { 'kn-IN': 'kn', 'hi-IN': 'hi', 'en-IN': 'en' }[body.language_code] || null,
          selectedLanguage: language, modelVersion: config.speechModel || 'saaras:v3', requiresTranscriptReview: true };
      } catch (cause) {
        if (/^AI_/.test(cause.code || '')) throw cause;
        throw error(controller.signal.aborted ? 'AI_TIMEOUT' : 'AI_PROVIDER_UNAVAILABLE', 'Speech request failed. Type your report.');
      } finally { clearTimeout(timer); }
    },
    async complete(messages, schema) {
      if (calls >= config.maxCalls) throw error('AI_CALL_LIMIT', 'Local AI call cap reached. Report manually.');
      calls++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        const response = await fetchImpl('https://api.sarvam.ai/v1/chat/completions', {
          method: 'POST', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', 'api-subscription-key': config.apiKey },
          body: JSON.stringify({ model: config.model, messages: [{ role: 'system', content: 'Return compact JSON matching this schema. Do not pad with whitespace: ' + JSON.stringify(schema) }, ...messages], temperature: 0, max_tokens: config.maxTokens,
            reasoning_effort: null,
            response_format: { type: 'json_object' } }),
        });
        if (!response.ok) {
          const failure = { 402: ['AI_CREDITS_EXHAUSTED', 'Sarvam credits are exhausted.'],
            401: ['AI_AUTH_FAILED', 'Check the backend Sarvam key.'], 403: ['AI_AUTH_FAILED', 'Check the backend Sarvam key.'],
            429: ['AI_RATE_LIMITED', 'Sarvam rate limit reached. Try later.'] }[response.status];
          throw error(...(failure || ['AI_PROVIDER_UNAVAILABLE', 'Sarvam could not process the report.']));
        }
        const body = await response.json();
        const choice = body?.choices?.[0];
        if (choice?.finish_reason !== 'stop' || typeof choice?.message?.content !== 'string')
          throw error('AI_INVALID_OUTPUT', 'AI response was incomplete.');
        return { content: choice.message.content,
          model: typeof body.model === 'string' && /^[a-zA-Z0-9:._/-]{1,60}$/.test(body.model) ? body.model : config.model,
          usage: Object.fromEntries(['prompt_tokens', 'completion_tokens', 'total_tokens']
            .filter(key => Number.isInteger(body.usage?.[key]) && body.usage[key] >= 0)
            .map(key => [key, body.usage[key]])) };
      } catch (cause) {
        if (/^AI_/.test(cause.code || '')) throw cause;
        throw error(controller.signal.aborted ? 'AI_TIMEOUT' : 'AI_PROVIDER_UNAVAILABLE', 'AI request failed. Manual reporting remains available.');
      } finally { clearTimeout(timer); }
    },
  };
}
module.exports = { readConfig, createClient };
