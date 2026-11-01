const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_SIMILARITY_THRESHOLD = 0.8;

function parseTimestamp(value) {
  if (value instanceof Date) {
    const milliseconds = value.getTime();
    return Number.isFinite(milliseconds) ? milliseconds : null;
  }
  if (typeof value !== "string") return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/i.exec(value);
  if (!parts) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , , offsetHour, offsetMinute] = parts;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    month < 1 || month > 12 || day < 1 || day > monthDays[month - 1] ||
    hour > 23 || minute > 59 || second > 59 ||
    (offsetHour !== undefined && (Number(offsetHour) > 23 || Number(offsetMinute) > 59))
  ) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function similarity(left, right) {
  const tokens = (text) =>
    new Set(text.toLowerCase().trim().replace(/\s+/g, " ").split(" ").filter(Boolean));
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

/**
 * Deterministic candidate finder ported from the standalone Member 4 rule.
 * Input shape: { id?, toolId, category, description, createdAt }. The window
 * includes both endpoints. Token-set Jaccard ignores word order, punctuation,
 * and meaning; a match is only a prompt for human review, never proof of identity.
 */
function detectDuplicateIncidents(current, existing, options = {}) {
  const invalid = (reason) => ({ valid: false, matches: [], reason });
  if (!current || typeof current !== "object" || Array.isArray(current))
    return invalid("invalid_current_incident");
  if (!Array.isArray(existing)) return invalid("invalid_existing_incidents");
  if (!options || typeof options !== "object" || Array.isArray(options))
    return invalid("invalid_options");
  const currentTime = parseTimestamp(current.createdAt);
  if (
    typeof current.toolId !== "string" ||
    !current.toolId.trim() ||
    typeof current.category !== "string" ||
    !current.category.trim() ||
    typeof current.description !== "string" ||
    currentTime === null
  )
    return invalid("invalid_current_incident_fields");
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const threshold = options.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  if (!Number.isFinite(windowDays) || windowDays <= 0)
    return invalid("invalid_window_days");
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)
    return invalid("invalid_similarity_threshold");
  const earliest = currentTime - windowDays * DAY_MS;
  const matches = [];
  for (const incident of existing) {
    if (!incident || typeof incident !== "object" || Array.isArray(incident)) continue;
    if (current.id != null && incident.id != null && current.id === incident.id) continue;
    if (
      incident.toolId !== current.toolId ||
      incident.category !== current.category ||
      typeof incident.description !== "string"
    )
      continue;
    const incidentTime = parseTimestamp(incident.createdAt);
    if (incidentTime === null || incidentTime < earliest || incidentTime > currentTime)
      continue;
    const score = similarity(current.description, incident.description);
    if (score < threshold) continue;
    matches.push({
      ...(incident.id == null ? {} : { id: incident.id }),
      createdAt:
        incident.createdAt instanceof Date
          ? incident.createdAt.toISOString()
          : incident.createdAt,
      similarity: score,
    });
  }
  return { valid: true, matches, reason: null };
}

module.exports = {
  detectDuplicateIncidents,
  DEFAULT_WINDOW_DAYS,
  DEFAULT_SIMILARITY_THRESHOLD,
};
