# Simulated SAP mapping

Paths and npm commands in this document are relative to the `backend/` CAP project unless stated otherwise. Repository-wide backups live in `../backup/`.

All four adapters are local simulations, not verified SAP API contracts. No tenant is connected. MockDocument stores an internal approval/request-hash wrapper; the console API exposes only its labelled result. Replace the in-process adapter behind the same approval gate after real tenant/API validation. Real adapters would need approved destinations, OAuth credentials, CSRF handling and service permissions through environment/service bindings, never repository files.

| Family | Fields (every SAP-flavoured response field) | Purpose | verify on api.sap.com |
|---|---|---|---|
| Maintenance Notification | MaintenanceNotification, NotificationType=M1, NotificationText, TechnicalObject, Plant, MaintPriority, NotificationStatus=OSNO | Illustrative maintenance draft | Required: all names, codes and create/read behavior |
| Quality Notification | QualityNotification, NotificationType=Q3, NotificationText, TechnicalObject, batchIds | Illustrative quality draft | Required: all names, codes and batch linkage |
| Material Document | MaterialDocument, GoodsMovementType=344, items.batchId, items.stockId, items.quantity, items.fromStatus, items.toStatus, skipped.batchId/reason, alreadyBlocked.batchId/stockId | Factory stock hold simulation | Required: movement semantics, fields and stock categories |
| DM Resource | ResourceId, Status=RESTRICTED | Tool restriction simulation | Required: resource identity and supported transition API |
| Application metadata | _label, _stub, _shapedLike, optional _approvalBypassed | Local response metadata, not SAP fields | Not SAP fields |

Notification numbers share one atomic 10-digit synthetic counter. Approved notification retries with identical scope return their existing document and add replay audit/history. Stock retries do not block twice; they return alreadyBlocked and a new local operation document. Restrictions reject a repeated invalid transition. Shipment evidence always prevents factory blocking, including conflicting stock/shipment evidence. Location is STORE-01 / plant PLANT-01 in this synthetic fixture.
