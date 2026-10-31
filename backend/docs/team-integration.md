# Team integration seams

Paths and npm commands in this document are relative to the `backend/` CAP project unless stated otherwise. Repository-wide backups live in `../backup/`.

During the original backend implementation, teammate branches/modules were unavailable. No code was merged, pushed or edited in teammate-owned directories. Five teammate endpoints remain _stub:true; their fixtures are provisional contract proposals, not implemented workflow.

| Owner | Files/endpoints to provide | Expected seam |
|---|---|---|
| Shashank | srv/ai-adapter; POST /api/ai/structure-report | Preserve rawText/language; translatedText, category, suggestedNcCode, confidence 0..1, missingFields array and modelVersion. See docs/examples/ai-structure.json. This endpoint does not decide trace membership. |
| Vinayaka | repository frontend/ | Consume /api, send demo headers locally / verified token on BTP; tools envelope is {tools:[...]}; display uncertainty and simulation labels. |
| Jamuna | srv/rules/state-machine.js | Export canIncidentTransition(from,to,ctx), canToolTransition(from,to,ctx). Boolean or Promise<boolean>; ctx includes role, tx and incident/tool references where applicable. |
| Jamuna | srv/rules/approvals.js | Export requiredApproverRole(type); Manager for MAINTENANCE_NOTIFICATION / TOOL_RESTRICTION, Quality for QUALITY_NOTIFICATION / STOCK_BLOCK. |
| Jamuna | real routers | GET duplicates; POST proposals, approvals/:id/decision, verify-return. Preserve fixtures' envelopes or coordinate an explicit contract update. Persist Proposal/Approval; never rely on stub JSON to approve. |
| Jamuna | tests/ground-truth.json | Review candidate and freeze identical expected data. Difference is a hard failure; do not silently replace either file. |

Every real router exports `{ mount:'/api', router, owner }` in srv/routes/*.router.js. Direct Express route handlers only; attach auth to each protected route using requireRole. Loader claims exact method/path (parameter names normalized), rejects collisions and registers only missing stubs. Routes load on restart, not hot reload.

Shared CAP helpers:

- `audit.write({incidentId?,toolId?,actor,actorRole,action,details?,reason,modelVersion?}, tx?) -> auditId`
- `history.append({toolId,type,at?,summary,refId?,details?}, tx?) -> eventId`
- `toolState.setState({toolId,state,incidentId,actor,actorRole,reason,verified?,approvalId?}, tx?) -> tool`. Restrict requires approval. Return Active requires Verifier + verified=true in fallback rules; the workflow owner must validate repair readings/independent verification before passing it.
- `rulesAdapter.canIncidentTransition(from,to,ctx)`, `canToolTransition(from,to,ctx)`, `requiredApproverRole(type)`. Missing modules log `using default rules`; present-but-broken modules fail, not silently fall back.
- `auth.getUser(req) -> {id,role,roles}`; `requireRole(...roles)` middleware authenticates and sets req.user. For XSUAA, use middleware before getUser.
- `approvals.assertApproved({approvalId,requiredRole,incidentId,proposalType,scope},tx?)`. All action services supply full type/scope.
- `mockActions.maintenanceNotification(input,actor,tx?)`, `.qualityNotification`, `.stockBlock`, `.restrictTool`; actor `{id,role}` must originate from authenticated request or trusted in-process workflow, never request body. Supply one transaction across workflow writes/actions/audit for atomicity.

Approval payload must contain the exact fields below (batchIds may approve a superset). Missing fields are not inferred:

| Proposal type | Approved payload fields |
|---|---|
| MAINTENANCE_NOTIFICATION | toolId, shortText, priority |
| QUALITY_NOTIFICATION | toolId, shortText, batchIds |
| STOCK_BLOCK | batchIds, plant, storageLocation, reason |
| TOOL_RESTRICTION | toolId, action:RESTRICT, reason |

Every action also checks Proposal.incidentId and Approval.approverRole/decision. Supplied toolId must match the incident. Notification requester is recorded as supplied metadata; authenticated actor remains authoritative in audit. Synthetic plant PLANT-01/storage STORE-01. Approval creation/decision authorization and independent return verification remain Jamuna's responsibility.

All JSON columns store serialized JSON; `decode()` restores them for responses. Transaction parameter is a CAP database transaction. Helpers start their own transaction only when omitted; always pass it for multi-table workflow changes. Use errors with status/code/details for the common JSON handler. The external x-system-call header is ignored.

Approval records also require a named decidedBy and valid decidedAt; final platform guards reject incomplete decision provenance. The fallback incident side exit Closed with insufficient evidence is allowed from any known nonterminal incident state.

The standalone approval check accepts an omitted transaction for compatibility, but action/workflow callers must pass their transaction to retain the lock through execution. Every action service does so.

## Current repository paths

All backend paths above are CAP-root relative: use backend/srv/routes for teammate routers, backend/srv/ai-adapter for Shashank, backend/srv/rules for Jamuna and backend/tests/ground-truth.json for reviewed data. Vinayaka owns the independent repository frontend/ directory. No AI/rules source existed during restructuring. Vinayaka's real frontend has since been merged and its supported screens now use the backend; the five AI/workflow routes remain stubs. Run npm commands inside backend/; the root package has only explicit backend wrappers.

Frontend integration status and browser evidence: [integration handover](../../docs/frontend-backend-integration.md). The active UI no longer uses fake incidents, trace arrays, approval receipts or browser-generated audit records.
