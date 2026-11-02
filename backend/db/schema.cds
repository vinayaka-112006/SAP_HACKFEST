namespace toolsathi;

// Explicit identifier fields keep the REST seam stable; unmanaged associations add model navigation.
entity Tool {
  key ![toolId] : String(120);
  ![type] : String(120);
  ![line] : String(120);
  ![workCenter] : String(120);
  ![state] : String(120);
  ![calibrationDue] : Date;
  ![usageCount] : Integer;
  ![lastVerifiedGood] : Timestamp;
}

entity ToolUseEvent {
  key ![eventId] : String(120);
  ![toolId] : String(120);
  ![runId] : String(120);
  ![start] : Timestamp;
  ![end] : Timestamp;
  ![sourceRecordId] : String(120);
  tool : Association to Tool on tool.toolId = toolId;
  run : Association to ProductionRun on run.runId = runId;
}

entity ProductionRun {
  key ![runId] : String(120);
  ![startTime] : Timestamp;
  ![endTime] : Timestamp;
  ![operatorId] : String(120);
  ![material] : String(120);
  ![workCenter] : String(120);
}

entity Batch {
  key ![batchId] : String(120);
  ![runId] : String(120);
  ![material] : String(120);
  ![quantity] : Integer;
  ![supplierLot] : String(120);
  ![status] : String(120);
  run : Association to ProductionRun on run.runId = runId;
}

entity Unit {
  key ![serial] : String(120);
  ![batchId] : String(120);
  ![status] : String(120);
  ![value] : Decimal(15,2);
  batch : Association to Batch on batch.batchId = batchId;
}

entity InventoryStock {
  key ![stockId] : String(120);
  ![batchId] : String(120);
  ![location] : String(120);
  ![quantity] : Integer;
  ![value] : Decimal(15,2);
  ![stockStatus] : String(120);
  ![snapshotTime] : Timestamp;
  batch : Association to Batch on batch.batchId = batchId;
}

entity Shipment {
  key ![shipmentId] : String(120);
  ![batchId] : String(120);
  ![dealerId] : String(120);
  ![quantity] : Integer;
  ![shipDate] : Timestamp;
  ![recordTime] : Timestamp;
  batch : Association to Batch on batch.batchId = batchId;
  dealer : Association to Dealer on dealer.dealerId = dealerId;
}

entity Dealer {
  key ![dealerId] : String(120);
  ![name] : String(120);
  ![language] : String(120);
}

entity Incident {
  key ![incidentId] : String(120);
  ![toolId] : String(120);
  ![reporterId] : String(120);
  ![language] : String(120);
  ![rawText] : LargeString;
  ![translatedText] : LargeString;
  ![category] : String(120);
  ![suggestedNcCode] : String(120);
  ![confidence] : Double;
  ![missingFields] : LargeString;
  ![state] : String(120);
  ![createdAt] : Timestamp;
  ![reportedAt] : Timestamp;
  ![reportedAtSource] : String(120);
  ![confirmedAt] : Timestamp;
  ![confirmedBy] : String(120);
  ![modelVersion] : String(120);
  tool : Association to Tool on tool.toolId = toolId;
}

entity IncidentEvidence {
  key ![evidenceId] : String(120);
  ![incidentId] : String(120);
  ![type] : String(120);
  ![reference] : LargeString;
  ![sourceTime] : Timestamp;
  incident : Association to Incident on incident.incidentId = incidentId;
}

entity TraceResult {
  key ![traceId] : String(120);
  ![incidentId] : String(120);
  ![windowHours] : Integer;
  ![units] : LargeString;
  ![tiers] : LargeString;
  ![valueAtRisk] : Decimal(15,2);
  ![dataQualityScore] : Integer;
  ![gaps] : LargeString;
  ![snapshotTime] : Timestamp;
  ![version] : Integer;
  ![generatedAt] : Timestamp;
  incident : Association to Incident on incident.incidentId = incidentId;
}

entity Proposal {
  key ![proposalId] : String(120);
  ![incidentId] : String(120);
  ![type] : String(120);
  ![payload] : LargeString;
  ![reason] : LargeString;
  ![state] : String(120);
  ![createdAt] : Timestamp;
  incident : Association to Incident on incident.incidentId = incidentId;
}

entity Approval {
  key ![approvalId] : String(120);
  ![proposalId] : String(120);
  ![approverRole] : String(120);
  ![decision] : String(120);
  ![reason] : LargeString;
  ![decidedAt] : Timestamp;
  ![decidedBy] : String(120);
  proposal : Association to Proposal on proposal.proposalId = proposalId;
}

entity RepairLog {
  key ![repairId] : String(120);
  ![toolId] : String(120);
  ![incidentId] : String(120);
  ![description] : LargeString;
  ![loggedBy] : String(120);
  ![loggedAt] : Timestamp;
  ![testReadings] : LargeString;
  ![passed] : Boolean;
  ![verifiedBy] : String(120);
  ![verifiedAt] : Timestamp;
  tool : Association to Tool on tool.toolId = toolId;
  incident : Association to Incident on incident.incidentId = incidentId;
}

entity CalibrationRecord {
  key ![calibrationId] : String(120);
  ![toolId] : String(120);
  ![calibratedAt] : Timestamp;
  ![result] : String(120);
  tool : Association to Tool on tool.toolId = toolId;
}

entity ToolHistoryEvent {
  key ![eventId] : String(120);
  ![toolId] : String(120);
  ![type] : String(120);
  ![at] : Timestamp;
  ![summary] : LargeString;
  ![refId] : String(120);
  ![details] : LargeString;
  tool : Association to Tool on tool.toolId = toolId;
}

entity AuditLog {
  key ![auditId] : String(120);
  ![incidentId] : String(120);
  ![toolId] : String(120);
  ![actor] : String(120);
  ![actorRole] : String(120);
  ![action] : String(120);
  ![details] : LargeString;
  ![reason] : LargeString;
  ![modelVersion] : String(120);
  ![timestamp] : Timestamp;
  incident : Association to Incident on incident.incidentId = incidentId;
  tool : Association to Tool on tool.toolId = toolId;
}

entity NcCode {
  key ![code] : String(120);
  ![group] : String(120);
  ![description] : LargeString;
}

entity SopDoc {
  key ![docId] : String(120);
  ![title] : String(120);
  ![section] : String(120);
  ![text] : LargeString;
}

entity MockDocument {
  key ![docId] : String(120);
  ![system] : String(120);
  ![type] : String(120);
  ![incidentId] : String(120);
  ![payload] : LargeString;
  ![createdAt] : Timestamp;
  incident : Association to Incident on incident.incidentId = incidentId;
}

entity Counter {
  key ![name] : String(120);
  ![value] : Integer64;
}

// V2 additions: deploy only to a reviewed isolated destination. No automatic migration.
entity UserProfile {
  key userId : String(120);
  displayName : String(120);
  role : String(120);
  language : String(2);
  workCenter : String(120);
  team : String(120);
  status : String(30);
  createdAt : Timestamp;
}
entity UserInvitation {
  key invitationId : String(120);
  userId : String(120);
  role : String(120);
  expiresAt : Timestamp;
  createdBy : String(120);
  consumedAt : Timestamp;
}
entity TechnicianQualification {
  key userId : String(120);
  key toolType : String(120);
  workCenter : String(120);
  skill : String(120);
  certification : String(120);
  expiresAt : Timestamp;
  safetyAuthorization : String(120);
  availableUntil : Timestamp;
  maxAssignments : Integer;
  approvedBy : String(120);
}
entity EquipmentRequirement {
  key toolType : String(120);
  skill : String(120);
  certification : String(120);
  safetyAuthorization : String(120);
  approvedBy : String(120);
}
entity RepairWorkOrder {
  key incidentId : String(120);
  workOrderId : String(120);
  technicianId : String(120);
  assignedBy : String(120);
  assignedAt : Timestamp;
  status : String(30);
  findings : LargeString;
  repairId : String(120);
  reviewedBy : String(120);
  reviewedAt : Timestamp;
}
entity IncidentRelationship {
  key incidentId : String(120);
  canonicalId : String(120);
  decision : String(30);
  reason : LargeString;
  decidedBy : String(120);
  decidedAt : Timestamp;
}
entity ConversationSession {
  key sessionId : String(120);
  userId : String(120);
  toolId : String(120);
  language : String(2);
  messages : LargeString;
  facts : LargeString;
  draft : LargeString;
  incidentId : String(120);
  version : Integer;
  createdAt : Timestamp;
}
entity UserNotification {
  key notificationId : String(120);
  userId : String(120);
  incidentId : String(120);
  message : LargeString;
  createdAt : Timestamp;
}
entity SparePart {
  key partId : String(120);
  name : String(120);
  toolType : String(120);
  location : String(120);
  quantity : Integer;
  reserved : Integer;
  reorderThreshold : Integer;
}
entity PartReservation {
  key incidentId : String(120);
  key partId : String(120);
  quantity : Integer;
  requestedBy : String(120);
  createdAt : Timestamp;
  status : String(30);
}

entity WorkforceProfile {
  key workerId : String(120);
  homeToolId : String(120);
  skills : LargeString;
  certifications : LargeString;
  safetyAuthorizations : LargeString;
  certificationExpiresAt : Timestamp;
  shiftEndsAt : Timestamp;
  available : Boolean;
}
entity WorkStation {
  key stationId : String(120);
  workCenter : String(120);
  toolId : String(120);
  requiredSkill : String(120);
  requiredCertification : String(120);
  safetyAuthorization : String(120);
  materialsAvailable : Boolean;
  slots : Integer;
  unitsPerHour : Double;
  setupMinutes : Integer;
}
entity ProductionDemand {
  key orderId : String(120);
  stationId : String(120);
  requiredQuantity : Integer;
  completedQuantity : Integer;
  dueAt : Timestamp;
}
entity TemporaryAssignment {
  key assignmentId : String(120);
  workerId : String(120);
  incidentId : String(120);
  sourceToolId : String(120);
  stationId : String(120);
  startsAt : Timestamp;
  endsAt : Timestamp;
  status : String(30);
  estimatedOutput : Integer;
  assumptions : LargeString;
  approvedBy : String(120);
  approvedAt : Timestamp;
}

// V2.2 extensions: existing table definitions and historical rows stay intact.
entity UserAuthorization {
  key userId : String(120);
  workCenters : LargeString;
  canAssign : Boolean;
  canVerify : Boolean;
  expiresAt : Timestamp;
  approvedBy : String(120);
  updatedAt : Timestamp;
}
entity UserProfileDetail {
  key userId : String(120);
  shift : String(120);
  shiftStartsAt : Timestamp;
  shiftEndsAt : Timestamp;
  updatedAt : Timestamp;
}
entity IssueOperation {
  key incidentId : String(120);
  severity : String(30);
  urgency : String(30);
  shift : String(120);
  reviewedBy : String(120);
  reviewedAt : Timestamp;
  assignmentEscalated : Boolean;
  version : Integer;
  updatedAt : Timestamp;
}
entity NotificationRead {
  key notificationId : String(120);
  userId : String(120);
  readAt : Timestamp;
}
