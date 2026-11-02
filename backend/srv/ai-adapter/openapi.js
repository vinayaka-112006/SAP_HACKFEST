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
  const searchResponse = { description: 'Ranked source passages with exact excerpts, content versions and model/policy provenance. Empty matches are a valid result.', content: { 'application/json': { schema: {
    type: 'object', required: ['method', 'matches', 'warnings', 'corpusVersion', 'scoreMeaning'],
    properties: { method: { type: 'string', enum: ['HYBRID', 'KEYWORD'] }, warnings: { type: 'array', items: { type: 'string' } }, corpusVersion: { type: 'string' }, scoreMeaning: { type: 'string' },
      matches: { type: 'array', items: { type: 'object', required: ['sourceId', 'sourceType', 'excerpt', 'citation', 'label'], properties: {
        sourceId: { type: 'string' }, sourceType: { type: 'string', enum: ['INCIDENT', 'REPAIR', 'SOP'] }, excerpt: { type: 'string' }, citation: { type: 'object', additionalProperties: true }, label: { type: 'string' },
      }, additionalProperties: true } },
    }, additionalProperties: true,
  } } } };
  const searchBase = { tags: ['Shashank'], 'x-owner': 'Shashank', 'x-implementation': 'real', security,
    description: 'Read-only local embeddings plus keyword retrieval. No Sarvam calls. Placeholder SOPs are excluded. Does not decide duplicates, repairs or exposure. Local model unavailable means explicitly labelled keyword fallback.',
    responses: { ...responses, 200: searchResponse },
  };
  spec.paths['/ai/search'] = { post: { ...searchBase, operationId: 'ai-search', requestBody: { required: true, content: { 'application/json': { schema: {
    type: 'object', required: ['query'], properties: { query: { type: 'string', minLength: 1, maxLength: 2000 }, toolId: { type: 'string', maxLength: 120 }, category: { type: 'string', maxLength: 120 },
      limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 }, asOf: { type: 'string', format: 'date-time' } },
  } } } } } };
  spec.paths['/incidents/{id}/similar'] = { get: { ...searchBase, operationId: 'incident-similar', parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    { name: 'scope', in: 'query', schema: { type: 'string', enum: ['same-tool', 'all-tools'], default: 'same-tool' } },
    { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10, default: 5 } },
  ] } };
  const communicationResponse = { description: 'Versioned communication text grounded in the current card or stored records. Audio is optional; drafts are unsent.', content: { 'application/json': { schema: { type: 'object', required: ['_label', '_stub', 'text', 'language', 'sourceIds', 'modelVersion', 'contentVersion', 'requiresHumanReview'], properties: {
    _label: { type: 'string', enum: ['SIMULATED'] }, _stub: { type: 'boolean', enum: [false] }, text: { type: 'string' }, language: { type: 'string', enum: ['kn', 'hi', 'en'] },
    sourceIds: { type: 'array', items: { type: 'string' } }, modelVersion: { type: 'string' }, contentVersion: { type: 'string' }, requiresHumanReview: { type: 'boolean', enum: [true] },
    audio: { type: 'string', format: 'byte' }, mimeType: { type: 'string', enum: ['audio/wav'] }, traceVersion: { type: 'integer' }, sent: { type: 'boolean', enum: [false] },
  }, additionalProperties: true } } } };
  const communicationBase = { tags: ['Shashank'], 'x-owner': 'Shashank', 'x-implementation': 'real', security, responses: { ...responses, 409: responses[400], 200: communicationResponse } };
  const incidentParameter = { name: 'id', in: 'path', required: true, schema: { type: 'string', maxLength: 120 } };
  const languageParameter = { name: 'language', in: 'query', schema: { type: 'string', enum: ['kn', 'hi', 'en'], default: 'en' } };
  spec.paths['/ai/readback'] = { post: { ...communicationBase, operationId: 'ai-readback', description: 'Worker/Manager only. Sarvam bulbul:v3 WAV readback of an explicitly reviewed editable card or server-loaded incident. No confirmation or workflow write. 2400-character complete readback limit; no silent truncation. Six requests per actor/minute, two concurrent, 30 provider calls per process for this adapter.',
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['language', 'reviewed'], properties: { language: { type: 'string', enum: ['kn', 'hi', 'en'] }, reviewed: { type: 'boolean', enum: [true] }, incidentId: { type: 'string', maxLength: 120 }, card: { type: 'object', required: ['toolId', 'rawText'], properties: { toolId: { type: 'string', maxLength: 120 }, rawText: { type: 'string', maxLength: 2000 }, translatedText: { type: 'string', maxLength: 4000 }, category: { type: 'string' }, suggestedNcCode: { type: 'string' }, reporterId: { type: 'string' }, reportedAt: { type: 'string' } } } }, anyOf: [{ required: ['incidentId'] }, { required: ['card'] }] } } } },
  } };
  spec.paths['/incidents/{id}/status-text'] = { get: { ...communicationBase, operationId: 'incident-status-text', description: 'Any authenticated role. Fresh persisted incident status with a read timestamp, localized fixed wording, canonical state and source ID. No provider calls or inferred approvals.', parameters: [incidentParameter, languageParameter] } };
  spec.paths['/incidents/{id}/trace-explanation'] = { get: { ...communicationBase, operationId: 'incident-trace-explanation', description: 'Manager/Quality/Verifier. Explains latest existing snapshot for the requested window. Does not generate a trace. Returns trace ID/version, exact counts, gaps and tier meanings; inconsistent snapshots fail closed.', parameters: [incidentParameter, languageParameter, { name: 'window', in: 'query', schema: { type: 'integer', enum: [24, 72, 168], default: 24 } }] } };
  spec.paths['/incidents/{id}/dealer-draft'] = { post: { ...communicationBase, operationId: 'incident-dealer-draft', description: 'Quality only. Requires a real approved QUALITY_NOTIFICATION for this incident/tool and matching dealer shipments within its batch scope. Development approval bypass is ignored. Atomically stores an unsent SIMULATED MockDocument plus application audit history; no external messages.', parameters: [incidentParameter], responses: { ...communicationBase.responses, 200: undefined, 201: communicationResponse },
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['approvalId', 'dealerId'], properties: { approvalId: { type: 'string', maxLength: 120 }, dealerId: { type: 'string', maxLength: 120 }, language: { type: 'string', enum: ['kn', 'hi', 'en'], default: 'en' } } } } } },
  } };
  spec.info.description = 'Synthetic manufacturing data, simulated SAP actions, live Sarvam intake/transcription/readback and grounded multilingual communication; four pending workflow stubs. Human review and approval remain separate.';
  return spec;
}
if (require.main === module) {
  const file = path.resolve(__dirname, '../../docs/openapi.yaml');
  fs.writeFileSync(file, JSON.stringify(applyAiSpec(JSON.parse(fs.readFileSync(file, 'utf8'))), null, 2) + '\n');
  console.log('Updated AI operations in OpenAPI.');
}
module.exports = { applyAiSpec };
