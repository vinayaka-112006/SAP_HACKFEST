const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_MINIMUM_REPORTS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseTimestamp(value) {
  if (value instanceof Date) {
    const milliseconds = value.getTime();
    return Number.isFinite(milliseconds) ? milliseconds : null;
  }
  if (typeof value !== "string") return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/i.exec(value);
  if (!parts) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , , offsetHourText, offsetMinuteText] = parts;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth[month - 1] ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    (offsetHourText !== undefined &&
      (Number(offsetHourText) > 23 || Number(offsetMinuteText) > 59))
  )
    return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function result(valid, thresholdMet, count, matchingIncidentIds, reason = null) {
  return { valid, thresholdMet, count, matchingIncidentIds, reason };
}

/**
 * Counts unique prior incident records matching a tool/category. The interval
 * is inclusive: [referenceAt - windowDays, referenceAt]. An optional
 * excludeIncidentId prevents the incident under evaluation from counting as
 * its own history. This counts database records, not verified distinct events.
 */
function detectRepeatFailure(toolId, category, incidents, options = {}) {
  if (typeof toolId !== "string" || !toolId.trim() || typeof category !== "string" || !category.trim())
    return result(false, false, 0, [], "invalid_tool_or_category");
  if (!Array.isArray(incidents)) return result(false, false, 0, [], "invalid_incidents");
  if (!options || typeof options !== "object" || Array.isArray(options))
    return result(false, false, 0, [], "invalid_options");

  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const minimumReports = options.minimumReports ?? DEFAULT_MINIMUM_REPORTS;
  const referenceAt = Object.hasOwn(options, "referenceAt")
    ? options.referenceAt
    : new Date();
  const referenceTime = parseTimestamp(referenceAt);
  if (
    !Number.isFinite(windowDays) ||
    windowDays <= 0 ||
    !Number.isFinite(windowDays * DAY_MS)
  )
    return result(false, false, 0, [], "invalid_window_days");
  if (!Number.isInteger(minimumReports) || minimumReports < 1)
    return result(false, false, 0, [], "invalid_minimum_reports");
  if (referenceTime === null)
    return result(false, false, 0, [], "invalid_reference_timestamp");

  const earliest = referenceTime - windowDays * DAY_MS;
  const matchingIncidentIds = [];
  const seenIds = new Set();
  let count = 0;
  for (const incident of incidents) {
    if (
      !incident ||
      typeof incident !== "object" ||
      Array.isArray(incident) ||
      incident.toolId !== toolId ||
      incident.category !== category ||
      (options.excludeIncidentId != null &&
        incident.id === options.excludeIncidentId)
    )
      continue;
    const incidentTime = parseTimestamp(incident.createdAt);
    if (
      incidentTime === null ||
      incidentTime < earliest ||
      incidentTime > referenceTime
    )
      continue;
    if (incident.id != null) {
      if (seenIds.has(incident.id)) continue;
      seenIds.add(incident.id);
      matchingIncidentIds.push(incident.id);
    }
    count += 1;
  }
  return result(true, count >= minimumReports, count, matchingIncidentIds);
}

module.exports = {
  detectRepeatFailure,
  DEFAULT_WINDOW_DAYS,
  DEFAULT_MINIMUM_REPORTS,
};
