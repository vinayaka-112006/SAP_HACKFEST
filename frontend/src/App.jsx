import React from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { StoreProvider, useStore } from "./state/store";
import { LocaleProvider } from "./features/v2/locale";
import AppShell from "./components/AppShell";
import ChatDock from "./components/ChatDock";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { WorkerDashboard, ManagerDashboard, TechnicianDashboard, VerifierDashboard } from "./pages/Dashboards";
import IssuesPage from "./pages/IssuesPage";
import IssueDetailPage from "./pages/IssueDetailPage";
import EquipmentPage from "./pages/EquipmentPage";
import WorkforcePage from "./pages/WorkforcePage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import ExposurePage from "./pages/ExposurePage";
import ManualReport from "./screens/Worker";
import { homeFor } from "./components/AppShell";

function DashboardRedirect() {
  const { currentRole } = useStore();
  return <Navigate to={homeFor(currentRole)} replace />;
}

function Shell({ children }) {
  return (
    <AppShell>
      {children}
      <ChatDock />
    </AppShell>
  );
}

function RegisterRedirect() {
  const { incidentId } = useParams();
  return <Navigate to={`/issues/${encodeURIComponent(incidentId)}`} replace />;
}

export default function App() {
  return (
    <LocaleProvider>
      <StoreProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/worker" element={<Shell><WorkerDashboard /></Shell>} />
          <Route path="/worker/manual" element={<Shell><ManualReport /></Shell>} />
          <Route path="/manager" element={<Shell><ManagerDashboard /></Shell>} />
          <Route path="/technician" element={<Shell><TechnicianDashboard /></Shell>} />
          <Route path="/verifier" element={<Shell><VerifierDashboard /></Shell>} />
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route path="/issues" element={<Shell><IssuesPage /></Shell>} />
          <Route path="/issues/:incidentId" element={<Shell><IssueDetailPage /></Shell>} />
          <Route path="/equipment" element={<Shell><EquipmentPage /></Shell>} />
          <Route path="/workforce" element={<Shell><WorkforcePage /></Shell>} />
          <Route path="/exposure/:incidentId" element={<Shell><ExposurePage /></Shell>} />
          <Route path="/notifications" element={<Shell><NotificationsPage /></Shell>} />
          <Route path="/profile" element={<Shell><ProfilePage /></Shell>} />
          <Route path="/admin" element={<Shell><AdminPage /></Shell>} />
          {/* Retired V2.1 entry points keep working through the canonical screens. */}
          <Route path="/console" element={<Navigate to="/issues" replace />} />
          <Route path="/workspace" element={<Navigate to="/admin" replace />} />
          <Route path="/history" element={<Navigate to="/equipment" replace />} />
          <Route path="/kitchen" element={<Navigate to="/" replace />} />
          <Route path="/incidents/:incidentId" element={<RegisterRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StoreProvider>
    </LocaleProvider>
  );
}
