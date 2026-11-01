const schema = require('./schemas/incident-card.json');
function error(code, message) { return Object.assign(new Error(message), { code }); }
// This validator covers every keyword in our fixed schema. Fail closed if the schema grows.
function conforms(value, rule) {
  const supported = ['type', 'additionalProperties', 'required', 'properties', 'enum', 'minLength', 'maxLength', 'minimum', 'maximum', 'uniqueItems', 'maxItems', 'items'];
  if (Object.keys(rule).some(key => !supported.includes(key))) throw new Error('Unsupported schema keyword');
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (!(Array.isArray(rule.type) ? rule.type : [rule.type]).includes(type)) return false;
  if (rule.enum && !rule.enum.includes(value)) return false;
  if (type === 'string' && (!value.trim() || value.length < (rule.minLength ?? 0) || value.length > (rule.maxLength ?? Infinity))) return false;
  if (type === 'number' && (!Number.isFinite(value) || value < (rule.minimum ?? -Infinity) || value > (rule.maximum ?? Infinity))) return false;
  if (type === 'object') {
    if (rule.required?.some(key => !Object.hasOwn(value, key))) return false;
    if (rule.additionalProperties === false && Object.keys(value).some(key => !Object.hasOwn(rule.properties, key))) return false;
    return Object.entries(rule.properties).every(([key, child]) => !Object.hasOwn(value, key) || conforms(value[key], child));
  }
  if (type === 'array') return value.length <= (rule.maxItems ?? Infinity) &&
    (!rule.uniqueItems || new Set(value).size === value.length) && value.every(item => conforms(item, rule.items));
  return true;
}
function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      typeof input.rawText !== 'string' || !input.rawText.trim() || input.rawText.length > 2000 ||
      typeof input.toolId !== 'string' || !input.toolId.trim() || input.toolId.length > 120 ||
      !['kn', 'hi', 'en'].includes(input.language))
    throw error('AI_INVALID_INPUT', 'Supply toolId, language (kn/hi/en), and 1–2000 characters of report text.');
  for (const key of ['reporterId', 'reportedAt']) if (input[key] != null &&
    (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > 120))
    throw error('AI_INVALID_INPUT', `Invalid ${key}.`);
  if (input.reportedAt != null && (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(input.reportedAt) ||
      !Number.isFinite(Date.parse(input.reportedAt)) || new Date(input.reportedAt).toISOString().slice(0, 19) !== input.reportedAt.slice(0, 19)))
    throw error('AI_INVALID_INPUT', 'reportedAt must be a valid UTC timestamp.');
}
function validateOutput(value, catalogue) {
  if (!conforms(value, schema)) throw error('AI_INVALID_OUTPUT', 'AI output did not match the incident schema.');
  const entry = catalogue.find(row => row.code === value.suggestedNcCode);
  if (value.suggestedNcCode !== null && (!entry || entry.group !== value.category))
    throw error('AI_INVALID_OUTPUT', 'AI suggested an unsupported catalogue code or category.');
  if (/\bdefective\b/i.test([value.translatedText, value.symptom].filter(Boolean).join(' ')))
    throw error('AI_INVALID_OUTPUT', 'AI wording requires manual review.');
  return value;
}
module.exports = { schema, conforms, error, validateInput, validateOutput };
