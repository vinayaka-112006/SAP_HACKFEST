const fs = require('node:fs');
const path = require('node:path');
const { schema, error, validateInput, validateOutput } = require('./validation');
const PROMPT_VERSION = 'intake-1', SCHEMA_VERSION = 'card-1';
const prompt = fs.readFileSync(path.join(__dirname, 'prompts/intake.txt'), 'utf8');
function loadCatalogue() {
  return fs.readFileSync(path.join(__dirname, '../../db/data/toolsathi-NcCode.csv'), 'utf8').trim()
    .split(/\r?\n/).slice(1).map(line => {
      const cells = line.match(/"(?:[^"]|"")*"|[^;]+/g);
      if (!cells || cells.length !== 3) throw new Error('Invalid seed NC catalogue');
      const [code, group, description] = cells.map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"'));
      return { code, group, description };
    });
}
function createIntake({ client, catalogue = loadCatalogue(), reviewThreshold = 0.75 }) {
  if (!Array.isArray(catalogue) || !catalogue.length || catalogue.some(row =>
    !row || !['code', 'group', 'description'].every(key => typeof row[key] === 'string' && row[key].trim())))
    throw new Error('A nonempty NC catalogue is required');
  if (!Number.isFinite(reviewThreshold) || reviewThreshold < 0 || reviewThreshold > 1) throw new Error('Invalid review threshold');
  const providerSchema = structuredClone(schema);
  // Use the provider's portable grammar subset; enforce lengths, bounds and uniqueness locally.
  function portable(rule) {
    for (const key of ['uniqueItems', 'minLength', 'maxLength', 'minimum', 'maximum', 'maxItems']) delete rule[key];
    for (const child of Object.values(rule.properties || {})) portable(child);
    if (rule.items) portable(rule.items);
  }
  portable(providerSchema);
  providerSchema.properties.suggestedNcCode.enum = [...new Set(catalogue.map(row => row.code)), null];
  return async input => {
    validateInput(input);
    const messages = [{ role: 'system', content: prompt }, { role: 'user', content: JSON.stringify({
      selectedToolId: input.toolId, selectedLanguage: input.language, rawText: input.rawText, ncCatalogue: catalogue }) }];
    const usage = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.complete(messages, providerSchema);
        usage.push(response.usage || {});
        let value;
        try { value = JSON.parse(response.content); } catch { throw error('AI_INVALID_OUTPUT', 'AI returned invalid JSON.'); }
        validateOutput(value, catalogue);
        const missing = new Set(value.missingFields);
        for (const field of ['symptom', 'category', 'suggestedNcCode']) if (!value[field]) missing.add(field);
        if (!value.detectedLanguage) missing.add('language');
        if (!input.reporterId) missing.add('reporterId');
        if (!input.reportedAt) missing.add('reportedAt');
        const warnings = ['NC catalogue is provisional; every suggestion requires catalogue-owner review.'];
        if (value.mentionedToolId && value.mentionedToolId !== input.toolId) {
          missing.add('toolId'); warnings.push('Report tool differs from selected tool; worker must resolve the conflict.');
        }
        if (value.detectedLanguage && value.detectedLanguage !== input.language) warnings.push('Detected language differs from selected language.');
        if (!input.reportedAt) warnings.push('Time was not supplied; incident save uses server receive time.');
        return { _label: 'SIMULATED', _stub: false, aiProvider: 'sarvam',
          ...value, toolId: input.toolId, language: input.language, rawText: input.rawText,
          missingFields: [...missing].sort(), warnings,
          needsReview: value.confidence < reviewThreshold || missing.size > 0 || warnings.length > 0,
          requiresWorkerConfirmation: true, confidenceKind: 'UNCALIBRATED_MODEL_SELF_ASSESSMENT',
          modelVersion: `${response.model}|${PROMPT_VERSION}|${SCHEMA_VERSION}`,
          provenance: { model: response.model, promptVersion: PROMPT_VERSION, schemaVersion: SCHEMA_VERSION }, usage };
      } catch (cause) {
        if (cause.code !== 'AI_INVALID_OUTPUT' || attempt === 1) throw cause;
        messages.push({ role: 'user', content: 'Previous output failed validation. Return schema-valid JSON using only supplied report facts and catalogue codes.' });
      }
    }
  };
}
module.exports = { createIntake, loadCatalogue };
