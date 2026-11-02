# Local packaging validation

Paths and npm commands in this document are relative to the `backend/` CAP project unless stated otherwise. Repository-wide backups live in `../backup/`.

`npm run build` executes CAP 10.2.2 / compiler 7.2.1 / cds-dk 10.2.0 production build. Generated HANA table artifacts and seed tabledata files were inspected locally. Node runtime includes CSN, custom server, routes, helpers and fixed JSON fixtures required by remaining stubs. HANA index table/column names were checked against generated hdbtable artifacts; deployment remains unverified.

Cloud Foundry CLI and mbt were not available in the inspected PATH. No MTAR archive, service instance, deployment, token or real SAP connection has been verified. Build success is local packaging evidence only. Runtime dependency audit reports no advisories; build/test dependency advisories remain.
