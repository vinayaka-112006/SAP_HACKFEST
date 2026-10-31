export class ApiError extends Error {
  constructor(
    message,
    { code = "REQUEST_FAILED", status = 0, details = {} } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
export function createApiClient({
  baseUrl = "/api",
  demoMode = false,
  getSession = () => ({}),
  fetchImpl = globalThis.fetch,
  timeoutMs = 15000,
} = {}) {
  const base = baseUrl.replace(/\/$/, "");
  async function request(path, { method = "GET", body, signal } = {}) {
    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (demoMode) {
      const { userId, role } = getSession();
      if (!userId?.trim() || !role)
        throw new ApiError("Enter a local demo user ID and select a role.", {
          code: "DEMO_IDENTITY_REQUIRED",
        });
      headers["x-demo-user"] = userId;
      headers["x-demo-role"] = role;
    }
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, timeoutMs);
    try {
      const response = await fetchImpl(base + path, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      let value;
      try {
        value = await response.json();
      } catch {
        throw new ApiError("The API returned an unreadable response.", {
          code: "INVALID_RESPONSE",
          status: response.status,
        });
      }
      if (value === null || typeof value !== "object" || Array.isArray(value))
        throw new ApiError("The API returned an invalid response object.", {
          code: "INVALID_RESPONSE",
          status: response.status,
        });
      if (!response.ok)
        throw new ApiError(
          value.error?.message || `Request failed (${response.status}).`,
          {
            status: response.status,
            code: value.error?.code,
            details: value.error?.details,
          },
        );
      if (value._stub === true)
        throw new ApiError(
          "This teammate endpoint is still a stub. No action was executed.",
          { code: "STUB_UNAVAILABLE" },
        );
      return value;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (signal?.aborted) throw error;
      throw new ApiError(
        controller.signal.aborted
          ? "The API request timed out. Try again."
          : "Cannot reach the backend. Check that it is running and try again.",
        { code: controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR" },
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
  const id = (value) => encodeURIComponent(value);
  return {
    request,
    getTools: async (options) => {
      const value = await request("/tools", options);
      if (!Array.isArray(value.tools))
        throw new ApiError("The tool register response is invalid.", {
          code: "INVALID_RESPONSE",
        });
      return value.tools;
    },
    getIncident: (incidentId, options) =>
      request(`/incidents/${id(incidentId)}`, options),
    createIncident: (body) => request("/incidents", { method: "POST", body }),
    confirmIncident: (incidentId, body) =>
      request(`/incidents/${id(incidentId)}/confirm`, { method: "POST", body }),
    getTrace: (incidentId, windowHours, options) =>
      request(
        `/incidents/${id(incidentId)}/trace?window=${id(windowHours)}`,
        options,
      ),
    getToolHistory: (toolId, options) =>
      request(`/tools/${id(toolId)}/history`, options),
    getAudit: (incidentId, options) =>
      request(`/audit?incident=${id(incidentId)}`, options),
    getDocuments: (incidentId, options) =>
      request(`/mock/documents?incident=${id(incidentId)}`, options),
    structureReport: (body) =>
      request("/ai/structure-report", { method: "POST", body }),
    getDuplicates: (incidentId, options) =>
      request(`/incidents/${id(incidentId)}/duplicates`, options),
    createProposal: (incidentId, body) =>
      request(`/incidents/${id(incidentId)}/proposals`, {
        method: "POST",
        body,
      }),
    decideApproval: (approvalId, body) =>
      request(`/approvals/${id(approvalId)}/decision`, {
        method: "POST",
        body,
      }),
    verifyReturn: (incidentId, body) =>
      request(`/incidents/${id(incidentId)}/verify-return`, {
        method: "POST",
        body,
      }),
  };
}
