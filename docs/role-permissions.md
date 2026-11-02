# Identity and role permissions

| Role | V2 authority |
|---|---|
| Worker | Own conversations, own chatbot records, default profile, own additional information |
| Manager | Review queue, eligibility, assignment, duplicate decisions, information requests, completed-work review |
| Technician | Own assignments/context, accept/progress/submit, compatible inventory reserve/use/release |
| Quality | Authorized review records and existing Quality containment approval/actions |
| Verifier | Authorized review records and existing independent return-to-service verification |
| Administrator | Staff invitations, approved equipment requirements, qualifications, inventory administration |

XSUAA scopes are checked with the existing `@sap/xssec` adapter. Client-selected
role labels are never production proof of authority. A new profile defaults to
Worker; a staff invitation is bound to the same verified user, expires in 24 hours,
is consumed transactionally, and requires an already granted matching provider
scope. Administrator cannot be invited through the application; identity-provider
administration controls that role. Manager cannot self-grant Administrator.

Existing production incident list/detail and indirect incident references are
scoped for Workers/Technicians. Broad legacy similarity/history searches are denied
to these restricted roles in XSUAA mode; use the scoped workspace tools. Demo mode
preserves the historic header-driven demonstration. V2 conversation/chat/object
ownership checks also apply in demo mode. Production XSUAA deployment/login was
not performed; SDK verification was mocked in automated authorization tests.

No passwords are collected or stored. No credential is an application fixture.
Development identity headers have no production authentication meaning.
