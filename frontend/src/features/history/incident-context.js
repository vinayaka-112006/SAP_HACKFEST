export function incidentIdFromHistoryEvent(event) {
  if (!event || !["INCIDENT", "REPAIR"].includes(event.type)) return null;
  return typeof event.refId === "string" && event.refId.trim()
    ? event.refId.trim()
    : null;
}

export async function loadIncidentEvaluations(client, incidentId) {
  if (!incidentId) return { duplicates: null, repeatFailures: null };
  const [duplicates, repeatFailures] = await Promise.allSettled([
    client.getDuplicates(incidentId),
    client.getRepeatFailures(incidentId),
  ]);
  return {
    duplicates:
      duplicates.status === "fulfilled"
        ? duplicates.value
        : { error: duplicates.reason?.message || "Duplicate evaluation failed" },
    repeatFailures:
      repeatFailures.status === "fulfilled"
        ? repeatFailures.value
        : { error: repeatFailures.reason?.message || "Repeat-failure evaluation failed" },
  };
}
