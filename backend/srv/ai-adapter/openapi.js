const fs = require('node:fs');
const path = require('node:path');
function applyAiSpec(spec) {
  const security = [{ demoIdentity: [], demoRole: [] }, { bearerAuth: [] }];
  const responses = Object.fromEntries([400, 401, 403, 404, 413, 415, 422, 429, 502, 503].map(status => [status, {
    description: 'Validation, authorization, audio, quota or provider error; manual reporting remains available.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  }]));
  function nullable(rule) {
    const copy = structuredClone(rule);
    if (Array.isArray(copy.type)) { copy.type = copy.type.find(type => type !== 'null'); copy.nullable = true; }
    for (const [key, child] of Object.entries(copy.properties || {})) copy.properties[key] = nullable(child);
    if (copy.items) copy.items = nullable(copy.items);
    return copy;
  }
  const card = nullable(require('./schemas/incident-card.json'));
  card.additionalProperties = true;
  Object.assign(card.properties, { _stub: { type: 'boolean', enum: [false] }, _label: { type: 'string', enum: ['SIMULATED'] },
    toolId: { type: 'string' }, language: { type: 'string', enum: ['kn', 'hi', 'en'] }, rawText: { type: 'string' },
    modelVersion: { type: 'string' }, needsReview: { type: 'boolean' }, requiresWorkerConfirmation: { type: 'boolean', enum: [true] } });
  spec.paths['/ai/structure-report'] = { post: {
    operationId: 'ai-structure', tags: ['Shashank'], 'x-owner': 'Shashank', 'x-implementation': 'real', security,
    description: 'Live Sarvam extraction with local schema/catalogue validation. Worker/Manager only. Does not create or confirm incidents. Provisional NC catalogue; explicit worker review required.',
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['toolId', 'language', 'rawText'], properties: {
      toolId: { type: 'string', maxLength: 120 }, language: { type: 'string', enum: ['kn', 'hi', 'en'] },
      rawText: { type: 'string', minLength: 1, maxLength: 2000 }, reporterId: { type: 'string', maxLength: 120 }, reportedAt: { type: 'string', format: 'date-time' },
    } } } } },
    responses: { ...responses, 200: { description: 'Editable suggestions, not confirmation.', content: { 'application/json': { schema: card } } } },
  } };
  spec.paths['/ai/transcribe'] = { post: {
    operationId: 'ai-transcribe', tags: ['Shashank'], 'x-owner': 'Shashank', 'x-implementation': 'real', security,
    description: 'Raw audio up to 2 MiB. UI limits recordings to 20 seconds; Sarvam rejects audio exceeding its 30-second synchronous limit. In-memory upload only. Review transcript before extracting fields.',
    parameters: [{ name: 'language', in: 'query', required: true, schema: { type: 'string', enum: ['kn', 'hi', 'en'] } }],
    requestBody: { required: true, content: Object.fromEntries(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg'].map(type => [type, { schema: { type: 'string', format: 'binary' } }])) },
    responses: { ...responses, 200: { description: 'Transcript in the source language.', content: { 'application/json': { schema: { type: 'object', required: ['transcript', 'detectedLanguage', 'modelVersion', 'requiresTranscriptReview'], properties: {
      transcript: { type: 'string' }, detectedLanguage: { type: 'string', nullable: true, enum: ['kn', 'hi', 'en', null] },
      modelVersion: { type: 'string' }, requiresTranscriptReview: { type: 'boolean', enum: [true] },
    }, additionalProperties: true } } } } },
  } };
  spec.info.description = 'Synthetic manufacturing data, simulated SAP actions, live Sarvam intake/transcription; four pending workflow stubs. AI suggestions require human review.';
  return spec;
}
if (require.main === module) {
  const file = path.resolve(__dirname, '../../docs/openapi.yaml');
  fs.writeFileSync(file, JSON.stringify(applyAiSpec(JSON.parse(fs.readFileSync(file, 'utf8'))), null, 2) + '\n');
  console.log('Updated AI operations in OpenAPI.');
}
module.exports = { applyAiSpec };
