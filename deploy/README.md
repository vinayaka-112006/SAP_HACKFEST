# Shared deployment area

The single backend CAP project's executable deployment files remain together:

- [backend/mta.yaml](../backend/mta.yaml): paths gen/srv and gen/db are relative to backend/.
- [backend/xs-security.json](../backend/xs-security.json): referenced by that MTA.
- [backend/.cdsrc.json](../backend/.cdsrc.json): CAP development/test/production profiles and build tasks.
- [Deployment instructions](../backend/docs/deploy-btp.md) and [BTP readiness](../backend/docs/btp-readiness.md).

Build from backend/: `npm run build`; `npm run verify:package` validates the compiled runtime locally. When authorized tooling/access is available, run `mbt build -p cf` from backend/ so MTA-relative paths resolve. No duplicate deployment descriptor is kept here. This directory is for genuinely shared deployment assets when the team needs them.

Cloud access, real XSUAA/HANA behavior and HANA audit enforcement remain unverified; reorganizing files does not change that status.
