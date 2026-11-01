import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { useLocation } from "react-router-dom";
import { createApiClient, apiConfig } from "../api/api";
import { traceView } from "../api/mappings";
import { useResource } from "./useResource";
const StoreContext = createContext(null);
export function StoreProvider({ children }) {
  const [currentRole, setCurrentRole] = useState("Manager");
  const [demoUserId, setDemoUserId] = useState("DEMO-MANAGER");
  const [incidentId, setIncidentId] = useState(
    () => sessionStorage.getItem("toolsathi.incidentId") || "",
  );
  const [selectedToolId, setSelectedToolId] = useState("TOOL-B");
  const [selectedWindow, setSelectedWindow] = useState(72);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [viewMode, setViewMode] = useState("yard");
  const [revision, setRevision] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { pathname } = useLocation();
  const client = useMemo(
    () =>
      createApiClient({
        ...apiConfig,
        getSession: () => ({ userId: demoUserId, role: currentRole }),
      }),
    [currentRole, demoUserId],
  );
  const identityKey = currentRole + ":" + demoUserId;
  const toolsState = useResource("tools:" + identityKey, (signal) =>
    client.getTools({ signal }),
  );
  const incidentState = useResource(
    `incident:${incidentId}:${identityKey}:${revision}`,
    (signal) => client.getIncident(incidentId, { signal }),
    Boolean(incidentId),
  );
  const incident = incidentState.data?.incident || null;
  const tools = toolsState.data || [];
  const historyToolId =
    pathname === "/console" && incident ? incident.toolId : selectedToolId;
  const historyState = useResource(
    `history:${historyToolId}:${identityKey}:${revision}`,
    (signal) => client.getToolHistory(historyToolId, { signal }),
    pathname === "/history",
  );
  const canReview = ["Manager", "Quality", "Verifier"].includes(currentRole);
  const traceState = useResource(
    `trace:${incidentId}:${selectedWindow}:${identityKey}:${revision}`,
    (signal) => client.getTrace(incidentId, selectedWindow, { signal }),
    pathname === "/console" && Boolean(incident) && canReview,
  );
  const trace = traceState.data;
  const auditState = useResource(
    `audit:${incidentId}:${identityKey}:${selectedWindow}:${trace?.version || ""}:${revision}`,
    (signal) => client.getAudit(incidentId, { signal }),
    pathname === "/console" &&
      Boolean(incident) &&
      canReview &&
      !traceState.loading,
  );
  const documentsState = useResource(
    `documents:${incidentId}:${identityKey}:${revision}`,
    (signal) => client.getDocuments(incidentId, { signal }),
    pathname === "/console" && Boolean(incident),
  );
  const view = useMemo(() => traceView(trace), [trace]);
  const openIncident = (id) => {
    const value = id.trim();
    setIncidentId(value);
    setSelectedUnit(null);
    if (value) sessionStorage.setItem("toolsathi.incidentId", value);
    else sessionStorage.removeItem("toolsathi.incidentId");
  };
  const refresh = () => setRevision((n) => n + 1);
  useEffect(() => {
    setSelectedUnit(null);
  }, [incidentId, selectedWindow, currentRole, demoUserId]);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const change = (e) => setReducedMotion(e.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  return (
    <StoreContext.Provider
      value={{
        client,
        apiConfig,
        currentRole,
        setCurrentRole,
        demoUserId,
        setDemoUserId,
        incidentId,
        openIncident,
        incident,
        incidentState,
        selectedToolId,
        setSelectedToolId,
        tools,
        toolsState,
        history: historyState.data?.events || [],
        historyState,
        selectedWindow,
        setSelectedWindow,
        trace,
        traceState,
        canReview,
        auditLog: auditState.data?.entries || [],
        auditState,
        documents: documentsState.data?.documents || [],
        documentsState,
        selectedUnit,
        setSelectedUnit,
        viewMode,
        setViewMode,
        reducedMotion,
        allUnits: view?.units || [],
        inWindowUnits: view?.units || [],
        tankCounts: view?.tankCounts,
        tierCounts: view?.tierCounts,
        refresh,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
