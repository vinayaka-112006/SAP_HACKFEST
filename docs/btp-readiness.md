# BTP readiness checklist

No real service has been checked. All real-cloud statuses remain **Unverified**. Local build validation does not verify account access.

| Check | Why / verification | Required access | Fallback | Status |
|---|---|---|---|---|
| Subaccount | Cockpit: correct region/subaccount | Subaccount viewer/admin | Local SQLite | Unverified |
| CF org/space | cf target, cf orgs, cf spaces | Space developer | Local server | Unverified |
| HANA entitlement/instance | Cockpit entitlements; HANA Central running state; cf marketplace -e hana | Entitlement admin, HANA admin | SQLite | Unverified |
| XSUAA | cf marketplace -e xsuaa; role collections | Security admin, space developer | Local header demo auth | Unverified |
| Business Application Studio | Cockpit subscriptions, dev space | BAS developer | Local editor | Unverified |
| Generative AI Hub | AI Core/Launchpad access and model deployment (Shashank) | AI service roles | AI stub labelled _stub | Unverified |
| Build Process Automation | Subscription, roles and workflow deployment (Jamuna) | Workflow developer/admin | Local modules when supplied, currently stubs | Unverified |
| Build Apps | Subscription/project access (Vinayaka) | App developer | Local UI | Unverified |
| Destinations/connectivity | Cockpit destination tests and authorized target/API | Destination admin | Simulated adapters | Unverified |
| Bindings/runtime/roles | cf services; cf env toolsathi-srv privately; assign role collections and obtain verified bearer token | Space developer/security admin | Local demo auth | Unverified |

Never paste cf env output into logs, documentation or commits: service bindings contain credentials. HANA schema/trigger enforcement and XSUAA real-token behavior require post-deployment verification.
