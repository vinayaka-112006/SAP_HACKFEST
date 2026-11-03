-- CREATE-only V2.2 additions; existing tables and rows are preserved.
CREATE TABLE toolsathi_UserAuthorization (
  userId NVARCHAR(120) NOT NULL,
  workCenters NCLOB,
  canAssign BOOLEAN,
  canVerify BOOLEAN,
  expiresAt TIMESTAMP,
  approvedBy NVARCHAR(120),
  updatedAt TIMESTAMP,
  PRIMARY KEY(userId)
);

CREATE TABLE toolsathi_UserProfileDetail (
  userId NVARCHAR(120) NOT NULL,
  shift NVARCHAR(120),
  shiftStartsAt TIMESTAMP,
  shiftEndsAt TIMESTAMP,
  updatedAt TIMESTAMP,
  PRIMARY KEY(userId)
);

CREATE TABLE toolsathi_IssueOperation (
  incidentId NVARCHAR(120) NOT NULL,
  severity NVARCHAR(30),
  urgency NVARCHAR(30),
  shift NVARCHAR(120),
  reviewedBy NVARCHAR(120),
  reviewedAt TIMESTAMP,
  assignmentEscalated BOOLEAN,
  version INTEGER,
  updatedAt TIMESTAMP,
  PRIMARY KEY(incidentId)
);

CREATE TABLE toolsathi_NotificationRead (
  notificationId NVARCHAR(120) NOT NULL,
  userId NVARCHAR(120),
  readAt TIMESTAMP,
  PRIMARY KEY(notificationId)
);

CREATE TABLE toolsathi_WorkStationOperation (
  stationId NVARCHAR(120) NOT NULL,
  travelMinutes INTEGER,
  bottleneckUnitsPerHour DOUBLE,
  approvedBy NVARCHAR(120),
  updatedAt TIMESTAMP,
  PRIMARY KEY(stationId)
);

CREATE TABLE toolsathi_AllocationPolicy (
  policyId NVARCHAR(120) NOT NULL,
  sourceToolIds NCLOB,
  destinationStationIds NCLOB,
  maxWorkers INTEGER,
  maxMinutes INTEGER,
  maxEstimatedUnits INTEGER,
  enabled BOOLEAN,
  expiresAt TIMESTAMP,
  approvedBy NVARCHAR(120),
  approvedRole NVARCHAR(120),
  approvedAt TIMESTAMP,
  reason NCLOB,
  PRIMARY KEY(policyId)
);

CREATE TABLE toolsathi_AllocationPlan (
  planId NVARCHAR(120) NOT NULL,
  incidentId NVARCHAR(120),
  createdBy NVARCHAR(120),
  createdAt TIMESTAMP,
  expiresAt TIMESTAMP,
  minutes INTEGER,
  status NVARCHAR(30),
  snapshot NCLOB,
  fingerprint NVARCHAR(64),
  policyId NVARCHAR(120),
  executedBy NVARCHAR(120),
  executedAt TIMESTAMP,
  PRIMARY KEY(planId)
);

CREATE TABLE toolsathi_AssignmentDetail (
  assignmentId NVARCHAR(120) NOT NULL,
  mode NVARCHAR(30),
  planId NVARCHAR(120),
  policyId NVARCHAR(120),
  acknowledgedAt TIMESTAMP,
  acknowledgedBy NVARCHAR(120),
  decision NVARCHAR(30),
  decidedAt TIMESTAMP,
  decidedBy NVARCHAR(120),
  PRIMARY KEY(assignmentId)
);

CREATE TABLE toolsathi_ExposureReport (
  reportId NVARCHAR(120) NOT NULL,
  incidentId NVARCHAR(120),
  createdBy NVARCHAR(120),
  createdAt TIMESTAMP,
  windowHours INTEGER,
  version INTEGER,
  digest NVARCHAR(64),
  snapshot NCLOB,
  PRIMARY KEY(reportId)
);
