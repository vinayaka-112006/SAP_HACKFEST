-- REVIEW ONLY. Not executed. 14 additive tables; no baseline alterations.
-- Requires approved recoverable backup and authorized exclusive destination.

CREATE TABLE toolsathi_UserProfile (
  userId NVARCHAR(120) NOT NULL,
  displayName NVARCHAR(120),
  role NVARCHAR(120),
  "LANGUAGE" NVARCHAR(2),
  workCenter NVARCHAR(120),
  team NVARCHAR(120),
  status NVARCHAR(30),
  createdAt TIMESTAMP,
  PRIMARY KEY(userId)
);

CREATE TABLE toolsathi_UserInvitation (
  invitationId NVARCHAR(120) NOT NULL,
  userId NVARCHAR(120),
  role NVARCHAR(120),
  expiresAt TIMESTAMP,
  createdBy NVARCHAR(120),
  consumedAt TIMESTAMP,
  PRIMARY KEY(invitationId)
);

CREATE TABLE toolsathi_TechnicianQualification (
  userId NVARCHAR(120) NOT NULL,
  toolType NVARCHAR(120) NOT NULL,
  workCenter NVARCHAR(120),
  skill NVARCHAR(120),
  certification NVARCHAR(120),
  expiresAt TIMESTAMP,
  safetyAuthorization NVARCHAR(120),
  availableUntil TIMESTAMP,
  maxAssignments INTEGER,
  approvedBy NVARCHAR(120),
  PRIMARY KEY(userId, toolType)
);

CREATE TABLE toolsathi_EquipmentRequirement (
  toolType NVARCHAR(120) NOT NULL,
  skill NVARCHAR(120),
  certification NVARCHAR(120),
  safetyAuthorization NVARCHAR(120),
  approvedBy NVARCHAR(120),
  PRIMARY KEY(toolType)
);

CREATE TABLE toolsathi_RepairWorkOrder (
  incidentId NVARCHAR(120) NOT NULL,
  workOrderId NVARCHAR(120),
  technicianId NVARCHAR(120),
  assignedBy NVARCHAR(120),
  assignedAt TIMESTAMP,
  status NVARCHAR(30),
  findings NCLOB,
  repairId NVARCHAR(120),
  reviewedBy NVARCHAR(120),
  reviewedAt TIMESTAMP,
  PRIMARY KEY(incidentId)
);

CREATE TABLE toolsathi_IncidentRelationship (
  incidentId NVARCHAR(120) NOT NULL,
  canonicalId NVARCHAR(120),
  decision NVARCHAR(30),
  reason NCLOB,
  decidedBy NVARCHAR(120),
  decidedAt TIMESTAMP,
  PRIMARY KEY(incidentId)
);

CREATE TABLE toolsathi_ConversationSession (
  sessionId NVARCHAR(120) NOT NULL,
  userId NVARCHAR(120),
  toolId NVARCHAR(120),
  "LANGUAGE" NVARCHAR(2),
  messages NCLOB,
  facts NCLOB,
  draft NCLOB,
  incidentId NVARCHAR(120),
  version INTEGER,
  createdAt TIMESTAMP,
  PRIMARY KEY(sessionId)
);

CREATE TABLE toolsathi_UserNotification (
  notificationId NVARCHAR(120) NOT NULL,
  userId NVARCHAR(120),
  incidentId NVARCHAR(120),
  message NCLOB,
  createdAt TIMESTAMP,
  PRIMARY KEY(notificationId)
);

CREATE TABLE toolsathi_SparePart (
  partId NVARCHAR(120) NOT NULL,
  name NVARCHAR(120),
  toolType NVARCHAR(120),
  location NVARCHAR(120),
  quantity INTEGER,
  reserved INTEGER,
  reorderThreshold INTEGER,
  PRIMARY KEY(partId)
);

CREATE TABLE toolsathi_PartReservation (
  incidentId NVARCHAR(120) NOT NULL,
  partId NVARCHAR(120) NOT NULL,
  quantity INTEGER,
  requestedBy NVARCHAR(120),
  createdAt TIMESTAMP,
  status NVARCHAR(30),
  PRIMARY KEY(incidentId, partId)
);

CREATE TABLE toolsathi_WorkforceProfile (
  workerId NVARCHAR(120) NOT NULL,
  homeToolId NVARCHAR(120),
  skills NCLOB,
  certifications NCLOB,
  safetyAuthorizations NCLOB,
  certificationExpiresAt TIMESTAMP,
  shiftEndsAt TIMESTAMP,
  available BOOLEAN,
  PRIMARY KEY(workerId)
);

CREATE TABLE toolsathi_WorkStation (
  stationId NVARCHAR(120) NOT NULL,
  workCenter NVARCHAR(120),
  toolId NVARCHAR(120),
  requiredSkill NVARCHAR(120),
  requiredCertification NVARCHAR(120),
  safetyAuthorization NVARCHAR(120),
  materialsAvailable BOOLEAN,
  slots INTEGER,
  unitsPerHour DOUBLE,
  setupMinutes INTEGER,
  PRIMARY KEY(stationId)
);

CREATE TABLE toolsathi_ProductionDemand (
  orderId NVARCHAR(120) NOT NULL,
  stationId NVARCHAR(120),
  requiredQuantity INTEGER,
  completedQuantity INTEGER,
  dueAt TIMESTAMP,
  PRIMARY KEY(orderId)
);

CREATE TABLE toolsathi_TemporaryAssignment (
  assignmentId NVARCHAR(120) NOT NULL,
  workerId NVARCHAR(120),
  incidentId NVARCHAR(120),
  sourceToolId NVARCHAR(120),
  stationId NVARCHAR(120),
  startsAt TIMESTAMP,
  endsAt TIMESTAMP,
  status NVARCHAR(30),
  estimatedOutput INTEGER,
  assumptions NCLOB,
  approvedBy NVARCHAR(120),
  approvedAt TIMESTAMP,
  PRIMARY KEY(assignmentId)
);
