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
  async function request(path, { method = "GET", body, headers: customHeaders, signal, requestTimeoutMs = timeoutMs } = {}) {
    const headers = { Accept: "application/json", ...customHeaders };
    const binary = typeof Blob !== "undefined" && body instanceof Blob;
    if (body !== undefined) headers["Content-Type"] = binary ? body.type : "application/json";
    if (demoMode) {
      const { userId, role } = getSession();
      if (!userId?.trim() || !role)
        throw new ApiError("Enter a local demo user ID and select a role.", {
          code: "DEMO_IDENTITY_REQUIRED",
        });
      if (!headers["x-demo-user"]) headers["x-demo-user"] = userId;
      if (!headers["x-demo-role"]) headers["x-demo-role"] = role;
    }
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, requestTimeoutMs);
    try {
      const response = await fetchImpl(base + path, {
        method,
        headers,
        ...(body !== undefined ? { body: binary ? body : JSON.stringify(body) } : {}),
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
    getIncidents: async (params = {}, options) => {
      const search = new URLSearchParams();
      if (params.toolId) search.set("toolId", params.toolId);
      if (params.state) search.set("state", params.state);
      if (params.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      const value = await request(`/incidents${qs ? `?${qs}` : ""}`, options);
      if (!Array.isArray(value.incidents))
        throw new ApiError("The incident list response is invalid.", {
          code: "INVALID_RESPONSE",
        });
      return value.incidents;
    },
    closeIncident: (incidentId, body, options = {}) =>
      request(`/incidents/${id(incidentId)}/close`, { method: "POST", body, ...options }),
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
    structureReport: (body, options = {}) =>
      request("/ai/structure-report", { ...options, method: "POST", body, requestTimeoutMs: 45000 }),
    transcribe: (body, language, options = {}) =>
      request(`/ai/transcribe?language=${id(language)}`, { ...options, method: "POST", body, requestTimeoutMs: 25000 }),
    readback: (body, options = {}) => request('/ai/readback', { ...options, method: 'POST', body, requestTimeoutMs: 25000 }),
    getStatusText: (incidentId, language, options) => request(`/incidents/${id(incidentId)}/status-text?language=${id(language)}`, options),
    getTraceExplanation: (incidentId, windowHours, language, options) => request(`/incidents/${id(incidentId)}/trace-explanation?window=${id(windowHours)}&language=${id(language)}`, options),
    createDealerDraft: (incidentId, body, options = {}) => request(`/incidents/${id(incidentId)}/dealer-draft`, { ...options, method: 'POST', body }),
    searchEvidence: (body, options = {}) =>
      request('/ai/search', { ...options, method: 'POST', body, requestTimeoutMs: 60000 }),
    getSimilar: (incidentId, { scope = 'same-tool', ...options } = {}) =>
      request(`/incidents/${id(incidentId)}/similar?scope=${id(scope)}`, { ...options, requestTimeoutMs: 60000 }),
    getDuplicates: (incidentId, options) =>
      request(`/incidents/${id(incidentId)}/duplicates`, options),
    getRepeatFailures: (incidentId, options) =>
      request(`/incidents/${id(incidentId)}/repeat-failures`, options),
    createProposal: (incidentId, body, options = {}) =>
      request(`/incidents/${id(incidentId)}/proposals`, {
        method: "POST",
        body,
        ...options,
      }),
    decideApproval: (approvalId, body, options = {}) =>
      request(`/approvals/${id(approvalId)}/decision`, {
        method: "POST",
        body,
        ...options,
      }),
    restrictTool: (body, options = {}) =>
      request("/mock/dm/tool-restrictions", { method: "POST", body, ...options }),
    blockStock: (body, options = {}) =>
      request("/mock/s4/stock-blocks", { method: "POST", body, ...options }),
    notifyQuality: (body, options = {}) =>
      request("/mock/s4/quality-notifications", { method: "POST", body, ...options }),
    notifyMaintenance: (body, options = {}) =>
      request("/mock/s4/maintenance-notifications", { method: "POST", body, ...options }),
    startRepair: (incidentId, body, options = {}) =>
      request(`/incidents/${id(incidentId)}/repairs`, { method: "POST", body, ...options }),
    completeRepair: (repairId, body, options = {}) =>
      request(`/repairs/${id(repairId)}/complete`, { method: "POST", body, ...options }),
    verifyReturn: (incidentId, body, options = {}) =>
      request(`/incidents/${id(incidentId)}/verify-return`, {
        method: "POST",
        body,
        ...options,
      }),
  };
}
