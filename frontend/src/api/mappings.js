// Display aliases only: every membership, count, tier and evidence ID comes from CAP.
export function traceView(trace) {
  if (!trace) return null;
  const s = trace.summary;
  return {
    units: trace.units.map((unit) => ({
      ...unit,
      unitId: unit.serial,
      tier:
        { CONFIRMED: "Confirmed", PROBABLE: "Probable", UNKNOWN: "Unknown" }[
          unit.tier
        ] || "Unknown",
      location:
        unit.locationStatus === "IN_STOCK"
          ? "Factory stock"
          : unit.locationStatus === "SHIPPED"
            ? unit.dealerId === "DLR-X"
              ? "Dealer X"
              : unit.dealerId === "DLR-Y"
                ? "Dealer Y"
                : unit.dealerId
            : "Unknown location",
      toolId: trace.toolId,
      toolUseEventId:
        unit.evidenceIds.filter((id) => id.startsWith("TUE-")).join(", ") ||
        null,
      warnings: [...unit.reasonCodes, ...unit.flags],
      snapshotTime: trace.snapshotTime,
    })),
    tankCounts: {
      factoryStock: s.byLocation.IN_STOCK,
      dealerX: s.shippedByDealer["DLR-X"] || 0,
      dealerY: s.shippedByDealer["DLR-Y"] || 0,
    },
    tierCounts: {
      confirmed: s.byTier.CONFIRMED,
      probable: s.byTier.PROBABLE,
      unknown: s.byTier.UNKNOWN,
    },
  };
}
export function resolveToolCode(code, tools) {
  let value = code.trim();
  try {
    const url = new URL(value);
    value =
      url.searchParams.get("toolId") ||
      url.pathname.split("/").filter(Boolean).at(-1) ||
      "";
  } catch {
    /* A plain tool ID is valid input. */
  }
  return tools.find((tool) => tool.toolId === value) || null;
}
export function buildIncidentPayload({
  toolId,
  reporterId,
  language,
  rawText,
  translatedText,
  category,
  suggestedNcCode,
  reportedAt,
  confidence,
  missingFields,
  modelVersion,
}) {
  const payload = { toolId, reporterId, language, rawText };
  for (const [key, value] of Object.entries({
    translatedText,
    category,
    suggestedNcCode,
    reportedAt,
    modelVersion,
  }))
    if (value) payload[key] = value;
  if (confidence !== undefined && confidence !== null)
    payload.confidence = confidence;
  if (Array.isArray(missingFields)) payload.missingFields = missingFields;
  return payload;
}
