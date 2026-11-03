# Windows local startup and demonstration

Use Node 24.11.x (the backend's declared engine). From PowerShell:

```powershell
Set-Location C:\Users\yoges\Desktop\hackfest\SAP_HACKFEST
npm --prefix backend ci
npm --prefix frontend ci
npm run dev:v2
```

Open `http://localhost:5173/workspace`; API is `http://localhost:4004/api`.
The launcher creates a new ignored `backup/demo-<uuid>.sqlite`, uses SQLite,
enables assignment enforcement, and inserts clearly synthetic qualification/stock
fixtures. Existing SQLite/HANA remains untouched. Stop both servers with Ctrl+C.
If these ports are occupied, use a separate pair:

```powershell
$env:TOOLSATHI_BACKEND_PORT = '4014'
$env:TOOLSATHI_FRONTEND_PORT = '5183'
npm run dev:v2
```

For the existing application's normal startup, `npm run dev` retains its configured
database mode; `npm run dev:local` selects its existing SQLite file. Those commands
do not upgrade an old schema. V2 requires a fresh/reviewed schema destination.

1. Choose Worker and set local demo ID to `DEMO-WORKER`. Select Kannada or Hindi,
   identify Tool B, start report, type symptoms, answer/skip follow-ups, review
   and edit, then Confirm and Submit. Copy the saved incident ID.
2. Choose Manager, local ID `DEMO-MANAGER`, enter incident ID in workspace. Review
   evidence/duplicates, show eligible technicians and assign the Tool B technician.
3. Choose Technician, local ID `DEMO-TECH-TOOL-B`; load work orders and accept.
   Load repair context and compatible stored parts. Explicitly reserve/use/release.
4. In the existing console, use the Manager proposal → approval → SIMULATED tool
   restriction sequence. A work assignment alone cannot execute restriction.
5. As assigned Technician, record repair and readings in console. Back in workspace,
   submit findings with the returned RepairLog ID. Manager reviews completion.
6. Choose a distinct Verifier identity and verify in console, then explicitly close
   the incident. The tool remains unavailable until verification passes.
7. Use the floating assistant or workspace chat to retrieve authorized status.
   Without a working provider, it displays an explicit fallback with real records.

To exercise real optional AI/speech, configure `SARVAM_API_KEY` privately in the
ignored backend environment and enable frontend AI. Do not paste credentials into
Git, commands, logs or reports. This run did not verify live provider generation,
real microphone speech, production XSUAA sign-in or a live HANA migration.
