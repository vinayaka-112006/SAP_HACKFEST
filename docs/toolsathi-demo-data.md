# ToolSathi Demonstration Dataset & Grand Finale Demonstration Guide

## 1. Overview & Persistent SQLite Architecture

ToolSathi uses a persistent local SQLite database for offline enterprise demonstration, deterministic trace analysis, multilingual conversational AI, and role-based manufacturing workflows.

- **Persistent Database Path**: `backend/db.sqlite`
- **Database Mode**: `sqlite` (SAP HANA Cloud integration is maintained via isolated schemas; SQLite is the sole persistent operational store for local demonstration)
- **Dataset Version / Namespace**: `TS-DEMO-V23-`
- **Deterministic Trace Engine Baseline**: Strictly preserved on reference fixture `TOOL-B`

---

## 2. CLI Demonstration Data Commands

| Command | Action | Description |
|---|---|---|
| `npm run demo:data:preview` | Inspection | Read-only preview of existing vs planned synthetic records |
| `npm run demo:data:seed` | Idempotent Seed | Additively inserts only missing namespaced demo records into `backend/db.sqlite` in an atomic transaction; skips identical records with zero duplicates |
| `npm run demo:data:verify` | Regression Verification | Programmatically verifies all 43 identities, 20 incidents, workforce allocation optimizer, qualification rules, and Tool B trace baseline |
| `npm run demo:data:reset-isolated` | Isolated Reset | Strictly guarded reset for isolated scratch databases only; refuses to touch `backend/db.sqlite` |

---

## 3. The 43 Synthetic Demonstration User Profiles

All identities are synthetic demonstration profiles for local evaluation, role switching, and separation-of-duties enforcement.

### 3.1 Workers (15 Profiles)
Distributed 3 each across 5 manufacturing work centers:

| User ID | Display Name | Role | Language | Work Center | Assigned Station / Specialization | Shift |
|---|---|---|---|---|---|---|
| `TS-DEMO-V23-WRK-01` | Ravi Kumar (Worker 1) | Worker | `en` | Brake Assembly | Flange Torque Station 1 (Packaging Cross-Skilled) | Shift A |
| `TS-DEMO-V23-WRK-02` | Suresh Gowda (Worker 2) | Worker | `kn` | Brake Assembly | Calibrated Bolting Station 2 (Inspection Cross-Skilled) | Shift A |
| `TS-DEMO-V23-WRK-03` | Arjun Sharma (Worker 3) | Worker | `hi` | Brake Assembly | Fastening Line (Brake Only; Certification Expired) | Shift A |
| `TS-DEMO-V23-WRK-04` | Manjunath Patil (Worker 4) | Worker | `kn` | Machining | CNC Turning Cell 1 | Shift A |
| `TS-DEMO-V23-WRK-05` | Ganesh Bhat (Worker 5) | Worker | `en` | Machining | CNC 5-Axis Milling Station | Shift A |
| `TS-DEMO-V23-WRK-06` | Pooja Deshmukh (Worker 6) | Worker | `hi` | Machining | Precision Boring & Drilling | Shift A |
| `TS-DEMO-V23-WRK-07` | Basavaraj Hiremath (Worker 7) | Worker | `kn` | Packaging | Thermal Vacuum Sealer Line A | Shift A |
| `TS-DEMO-V23-WRK-08` | Rajeshwar Singh (Worker 8) | Worker | `en` | Packaging | Rotary Blister Packaging Line B | Shift A |
| `TS-DEMO-V23-WRK-09` | Karthik Shettar (Worker 9) | Worker | `kn` | Packaging | Staging & Shrink Tunnel | Shift A |
| `TS-DEMO-V23-WRK-10` | Alok Tiwari (Worker 10) | Worker | `hi` | Final Inspection | Optical Coordinate Metrology Rig | Shift A |
| `TS-DEMO-V23-WRK-11` | Chandan Gowda (Worker 11) | Worker | `kn` | Final Inspection | Surface Flaw Laser Scanner | Shift A |
| `TS-DEMO-V23-WRK-12` | Deepak Choudhary (Worker 12) | Worker | `en` | Final Inspection | Dimensional Tolerance Gate | Shift A |
| `TS-DEMO-V23-WRK-13` | Vinod Naidu (Worker 13) | Worker | `en` | Quality Testing | 500-Bar Hydraulic Proof Press | Shift A |
| `TS-DEMO-V23-WRK-14` | Shivakumar Halli (Worker 14) | Worker | `kn` | Quality Testing | Dynamic Strain & Metallurgical Bench | Shift A |
| `TS-DEMO-V23-WRK-15` | Santosh Yadav (Worker 15) | Worker | `hi` | Quality Testing | Calibration Standards Vault | Shift A |

### 3.2 Managers (10 Profiles)
Distributed across all 5 work centers and operational shifts:

| User ID | Display Name | Role | Language | Primary Work Center | Authorized Scope | Shift |
|---|---|---|---|---|---|---|
| `TS-DEMO-V23-MGR-01` | Deepa Nair (Manager 1) | Manager | `en` | Brake Assembly | Brake Assembly, Machining | Morning Shift (A) |
| `TS-DEMO-V23-MGR-02` | Kavita Rao (Manager 2) | Manager | `kn` | Brake Assembly | Brake Assembly | Afternoon Shift (B) |
| `TS-DEMO-V23-MGR-03` | Priya Sundaram (Manager 3) | Manager | `hi` | Machining | Machining, Packaging | Morning Shift (A) |
| `TS-DEMO-V23-MGR-04` | Anand Kulkarni (Manager 4) | Manager | `en` | Machining | Machining | Night Shift (C) |
| `TS-DEMO-V23-MGR-05` | Sunil Hegde (Manager 5) | Manager | `kn` | Packaging | Packaging, Final Inspection | Morning Shift (A) |
| `TS-DEMO-V23-MGR-06` | Meera Joshi (Manager 6) | Manager | `hi` | Packaging | Packaging | Afternoon Shift (B) |
| `TS-DEMO-V23-MGR-07` | Raghavendra Murthy (Manager 7) | Manager | `en` | Final Inspection | Final Inspection, Quality Testing | Morning Shift (A) |
| `TS-DEMO-V23-MGR-08` | Srinivas Prasad (Manager 8) | Manager | `kn` | Final Inspection | Final Inspection | Night Shift (C) |
| `TS-DEMO-V23-MGR-09` | Anita Verma (Manager 9) | Manager | `hi` | Quality Testing | Quality Testing, Brake Assembly | Morning Shift (A) |
| `TS-DEMO-V23-MGR-10` | Vikram Sengupta (Manager 10) | Manager | `en` | Quality Testing | Quality Testing | Afternoon Shift (B) |

### 3.3 Technicians (10 Profiles)
Mix of equipment specializations and eligibility states:

| User ID | Display Name | Specialization | Work Center | Eligibility Demonstration Status |
|---|---|---|---|---|
| `TS-DEMO-V23-TECH-01` | Prakash Shenoy (Tech 1) | Torque Tool Specialist | Brake Assembly | **Eligible & Recommended** (Capacity: 3, Workload: 0) |
| `TS-DEMO-V23-TECH-02` | Mahesh Angadi (Tech 2) | Torque Sensors Lead | Brake Assembly | **Rejected: Workload Limit Reached** (Capacity: 1, Active Order on INC-08) |
| `TS-DEMO-V23-TECH-03` | Rohit Malhotra (Tech 3) | Mechanical Maintenance | Brake Assembly | **Rejected: Skill Mismatch** (Lacks certified torque skill) |
| `TS-DEMO-V23-TECH-04` | Venkatesh Rao (Tech 4) | Electrical Maintenance | Brake Assembly | **Rejected: Certification Expired** |
| `TS-DEMO-V23-TECH-05` | Naveen Saxena (Tech 5) | CNC Maintenance | Machining | **Rejected: Shift Availability Expired (Off Shift)** |
| `TS-DEMO-V23-TECH-06` | Ashok Kamath (Tech 6) | Conveyor & Packaging | Packaging | Qualified & Active for Packaging |
| `TS-DEMO-V23-TECH-07` | Chetan Biradar (Tech 7) | Quality Calibration Rig | Quality Testing | Qualified & Active for Quality Rigs |
| `TS-DEMO-V23-TECH-08` | Manoj Mishra (Tech 8) | Automation & CNC | Machining | Qualified & Active for CNC Systems |
| `TS-DEMO-V23-TECH-09` | Jagadish Kulkarni (Tech 9) | Optical Metrology | Final Inspection | Qualified & Active for Vision Inspection |
| `TS-DEMO-V23-TECH-10` | Abhishek Bannerjee (Tech 10) | Vision Diagnostics | Final Inspection | Qualified & Active for Vision Inspection |

### 3.4 Verifiers / Assigners (5 Profiles)
Separation of duties distribution:

| User ID | Display Name | Role | Can Assign? | Can Verify? | Authorized Scope | Governance Rule |
|---|---|---|---|---|---|---|
| `TS-DEMO-V23-VERIFIER-01` | Dr. Lakshmi Swamy (Verifier 1) | Verifier | Yes | Yes | Brake Assembly, Machining | Dual Grant; cannot verify work assigned/reviewed by self |
| `TS-DEMO-V23-VERIFIER-02` | Harish Chandra (Verifier 2) | Verifier | No | Yes | Brake Assembly, Packaging, Quality | **Independent Return Gate** (Grand Finale demo verifier) |
| `TS-DEMO-V23-VERIFIER-03` | Neeraj Tripathi (Verifier 3) | Verifier | Yes | No | Machining, Packaging | Delegated Assigner only |
| `TS-DEMO-V23-VERIFIER-04` | Prashant Dixit (Verifier 4) | Verifier | No | Yes | Final Inspection, Quality | Independent Inspection Verifier |
| `TS-DEMO-V23-VERIFIER-05` | Vandana Patil (Verifier 5) | Verifier | Yes | Yes | Plant-wide | Dual Grant Plant-wide |

### 3.5 Quality Assurance (2 Profiles)
| User ID | Display Name | Role | Focus Area | Permissions |
|---|---|---|---|---|
| `TS-DEMO-V23-QUAL-01` | Sanjay Menon (Quality Lead) | Quality | Forward Trace Analysis & Containment | Unrestricted Exposure & Recall Investigation |
| `TS-DEMO-V23-QUAL-02` | Ananya Sen (Quality Compliance) | Quality | Metrology Standards & Audits | Unrestricted Quality Reviews |

### 3.6 Administrator (1 Profile)
| User ID | Display Name | Role | Governance Scope |
|---|---|---|---|
| `TS-DEMO-V23-ADMIN-01` | ToolSathi System Administrator | Administrator | Full plant-wide user onboarding, authorizations, qualifications, and audit vault oversight |

---

## 4. The 20 Connected Incidents

### 4.1 Solved / Closed Scenarios (5 Incidents)
Fully completed lifecycle with original multilingual reports, approved isolation proposals, parts replacement, passing post-repair test readings, independent verifier return-to-service sign-off, and manager closure.

1. **`TS-DEMO-V23-INC-01`** (Brake Assembly — Primary Demo Incident):
   - **Tool**: `TS-DEMO-V23-TOOL-TORQUE-01` (Torque Wrench B-01)
   - **Reporter**: Ravi Kumar (`TS-DEMO-V23-WRK-01`)
   - **Language**: Kannada (`kn`)
   - **Original Statement**: "ಬೋಲ್ಟ್ ಸಡಿಲವಾಗಿದೆ, ಟಾರ್ಕ್ ಸರಿಯಾಗಿ ಹೊಂದಿಕೊಳ್ಳುತ್ತಿಲ್ಲ (ಕ್ಯಾಲಿಬ್ರೇಶನ್ ದೋಷ)"
   - **Translated Statement**: "Bolt is loose, torque setting is slipping below 45Nm tolerance"
   - **Manager**: Deepa Nair (`TS-DEMO-V23-MGR-01`) — Triaged High/Urgent, Tool Restriction Proposal approved.
   - **Technician**: Prakash Shenoy (`TS-DEMO-V23-TECH-01`) — Replaced Torque Calibration Shim (`TS-DEMO-V23-PART-TORQUE-01`).
   - **Test Reading**: `45.2 Nm` (Passed; Spec 45.0–48.0 Nm).
   - **Independent Verifier**: Harish Chandra (`TS-DEMO-V23-VERIFIER-02`) — Return-to-service certified.
   - **Status**: `Closed`.

2. **`TS-DEMO-V23-INC-02`** (Machining):
   - **Tool**: `TS-DEMO-V23-TOOL-CNC-01`
   - **Reporter**: Manjunath Patil (`TS-DEMO-V23-WRK-04`)
   - **Language**: Hindi (`hi`)
   - **Original Statement**: "सीएनसी स्पिंडल में असामान्य कंपन और शोर सुनाई दे रहा है"
   - **Technician**: Manoj Mishra (`TS-DEMO-V23-TECH-08`) — Replaced Ceramic Spindle Bearing (`TS-DEMO-V23-PART-CNC-01`).
   - **Test Reading**: `0.012 mm runout` (Passed; Spec <0.02 mm).
   - **Verifier**: Prashant Dixit (`TS-DEMO-V23-VERIFIER-04`) | **Status**: `Closed`.

3. **`TS-DEMO-V23-INC-03`** (Packaging):
   - **Tool**: `TS-DEMO-V23-TOOL-PACK-01`
   - **Reporter**: Basavaraj Hiremath (`TS-DEMO-V23-WRK-07`)
   - **Language**: English (`en`)
   - **Original Statement**: "Packaging sealer heating element temperature fluctuating intermittently between 140C and 185C"
   - **Technician**: Ashok Kamath (`TS-DEMO-V23-TECH-06`) — Replaced Nichrome Heating Band (`TS-DEMO-V23-PART-PACK-01`).
   - **Test Reading**: `175.4 C stable` (Passed; Spec 170–180 C).
   - **Verifier**: Harish Chandra (`TS-DEMO-V23-VERIFIER-02`) | **Status**: `Closed`.

4. **`TS-DEMO-V23-INC-04`** (Final Inspection):
   - **Tool**: `TS-DEMO-V23-TOOL-INSPECT-01`
   - **Reporter**: Alok Tiwari (`TS-DEMO-V23-WRK-10`)
   - **Language**: Kannada (`kn`)
   - **Original Statement**: "ಆಪ್ಟಿಕಲ್ ಕ್ಯಾಮೆರಾ ಅಳತೆಯ ಲೆನ್ಸ್‌ನಲ್ಲಿ ಮಸುಕಾದ ಚಿತ್ರ ಕಂಡುಬಂದಿದೆ"
   - **Technician**: Jagadish Kulkarni (`TS-DEMO-V23-TECH-09`) — Installed Bi-Telecentric Lens (`TS-DEMO-V23-PART-INSPECT-01`).
   - **Test Reading**: `0.003 mm distortion` (Passed; Spec <0.005 mm).
   - **Verifier**: Prashant Dixit (`TS-DEMO-V23-VERIFIER-04`) | **Status**: `Closed`.

5. **`TS-DEMO-V23-INC-05`** (Quality Testing):
   - **Tool**: `TS-DEMO-V23-TOOL-QUAL-01`
   - **Reporter**: Vinod Naidu (`TS-DEMO-V23-WRK-13`)
   - **Language**: Hindi (`hi`)
   - **Original Statement**: "हाइड्रोलिक प्रूफ टेस्ट प्रेस में दबाव गिर रहा है और लीकेज है"
   - **Technician**: Chetan Biradar (`TS-DEMO-V23-TECH-07`) — Replaced Proportional Relief Valve (`TS-DEMO-V23-PART-QUAL-01`).
   - **Test Reading**: `502 bar hold for 60s` (Passed; Spec 500 bar +/- 5 bar).
   - **Verifier**: Harish Chandra (`TS-DEMO-V23-VERIFIER-02`) | **Status**: `Closed`.

### 4.2 Unresolved / Blocked Scenarios (5 Incidents)
1. **`TS-DEMO-V23-INC-06`**: **Awaiting Manager Review**
   - Tool: `TS-DEMO-V23-TOOL-TORQUE-02` | Reporter: `TS-DEMO-V23-WRK-02` (Kannada)
   - Symptom: Handle loose, digital button sticking | Confirmed by worker, awaiting shift manager triage.
2. **`TS-DEMO-V23-INC-07`**: **Awaiting Authorized Assigner**
   - Tool: `TS-DEMO-V23-TOOL-CNC-02` | Reporter: `TS-DEMO-V23-WRK-05` (English)
   - Symptom: Coolant pressure alarm | Triaged as High/Urgent; assignment escalated to authorized assigner.
3. **`TS-DEMO-V23-INC-08`**: **Blocked by Spare Parts**
   - Tool: `TS-DEMO-V23-TOOL-TORQUE-02` | Reporter: `TS-DEMO-V23-WRK-03` (Hindi)
   - Symptom: Error E-09 slip code | Assigned to Tech Mahesh Angadi (`TS-DEMO-V23-TECH-02`); blocked because master optical slip sensor `TS-DEMO-V23-PART-TORQUE-CRITICAL` is zero stock in central stores.
4. **`TS-DEMO-V23-INC-09`**: **Awaiting Additional Repair Evidence**
   - Tool: `TS-DEMO-V23-TOOL-PACK-02` | Reporter: `TS-DEMO-V23-WRK-08` (English)
   - Symptom: Uneven film clamp tension | Work order placed in `NeedsEvidence`; manager requested photographic proof of clearance tolerances before approving submission.
5. **`TS-DEMO-V23-INC-10`**: **Awaiting Information (Verification Failed)**
   - Tool: `TS-DEMO-V23-TOOL-INSPECT-02` | Reporter: `TS-DEMO-V23-WRK-11` (Kannada)
   - Symptom: Loose cable connection | Tech Abhishek Bannerjee submitted repair; Verifier Prashant Dixit conducted independent inspection and failed test readings (measured 78 dBA vs expected <65 dBA threshold); work returned with audit rejection trail.

### 4.3 Progressive Active Lifecycle Scenarios (10 Incidents)
- **`TS-DEMO-V23-INC-11`**: **Awaiting Worker Confirmation** (State: `Reported` by `TS-DEMO-V23-WRK-06`)
- **`TS-DEMO-V23-INC-12`**: **Awaiting Manager Review** (State: `Confirmed` by `TS-DEMO-V23-WRK-09`)
- **`TS-DEMO-V23-INC-13`**: **Awaiting Technician Assignment** (Triaged by `TS-DEMO-V23-MGR-07`, awaiting technician dispatch)
- **`TS-DEMO-V23-INC-14`**: **Awaiting Technician Acceptance** (Work order `Assigned` to `TS-DEMO-V23-TECH-07`)
- **`TS-DEMO-V23-INC-15`**: **Repair in Progress** (Work order `Accepted` by `TS-DEMO-V23-TECH-01`)
- **`TS-DEMO-V23-INC-16`**: **Parts Reserved** (Work order `Accepted` by `TS-DEMO-V23-TECH-01`, 2x O-rings reserved in `PartReservation`)
- **`TS-DEMO-V23-INC-17`**: **Repair Log in Progress** (Preliminary disassembly notes logged in `RepairLog` by `TS-DEMO-V23-TECH-08`)
- **`TS-DEMO-V23-INC-18`**: **Awaiting Manager Completion Review** (Work order `Submitted` with passed test readings by `TS-DEMO-V23-TECH-06`)
- **`TS-DEMO-V23-INC-19`**: **Awaiting Verification** (Completion reviewed by `TS-DEMO-V23-MGR-07`, work order status `Reviewed`)
- **`TS-DEMO-V23-INC-20`**: **Awaiting Closure** (Independent verification signed off by `TS-DEMO-V23-VERIFIER-02`, work order `Closed`, awaiting manager final issue close)

---

## 5. Workforce Allocation Demonstration Scenario

When primary torque tool `TS-DEMO-V23-TOOL-TORQUE-01` is restricted due to loose bolt incident `TS-DEMO-V23-INC-01`, three operators are stranded at the station:

1. **Worker 1 (`TS-DEMO-V23-WRK-01`)**: Has valid packaging qualification (`TS-DEMO-V23-SKILL-PACKAGING`, `TS-DEMO-V23-CERT-PACKAGING`).
2. **Worker 2 (`TS-DEMO-V23-WRK-02`)**: Has valid optical inspection qualification (`TS-DEMO-V23-SKILL-INSPECTION`, `TS-DEMO-V23-CERT-INSPECTION`).
3. **Worker 3 (`TS-DEMO-V23-WRK-03`)**: Has expired certification (`TS-DEMO-V23-CERT-EXPIRED`) and lacks packaging/inspection skills.

### Deterministic Optimizer Evaluation:
- **Allocates Worker 1** to `TS-DEMO-V23-STATION-PACKAGING` (Estimated productive units: 35 units).
- **Allocates Worker 2** to `TS-DEMO-V23-STATION-INSPECTION` (Estimated productive units: 41 units).
- **Excludes Worker 3** with reasons: `Mandatory destination qualifications not met`, `Certification not current`.
- **Return to Service**: When tool returns to `Active`, return candidates list Worker 1 and Worker 2 for seamless restoration to home station.

---

## 6. Spare Parts Central Inventory (25 Records)

| Part ID | Part Name | Tool Type | Location | Qty | Reserved | Reorder | Status |
|---|---|---|---|---:|---:|---:|---|
| `TS-DEMO-V23-PART-TORQUE-01` | Torque Calibration Shim Pack | Torque | `BIN-TRQ-A1` | 25 | 1 | 5 | In Stock |
| `TS-DEMO-V23-PART-TORQUE-02` | Digital Strain Gauge Transducer | Torque | `BIN-TRQ-A2` | 8 | 0 | 2 | In Stock |
| `TS-DEMO-V23-PART-TORQUE-03` | Quick-Release Hex Drive Head 3/8in | Torque | `BIN-TRQ-A3` | 15 | 0 | 3 | In Stock |
| `TS-DEMO-V23-PART-TORQUE-04` | High-Torque Viton O-Ring Seal Kit | Torque | `BIN-TRQ-A4` | 45 | 2 | 10 | In Stock |
| `TS-DEMO-V23-PART-TORQUE-CRITICAL` | Master Optical Slip Sensor Module | Torque | `BIN-TRQ-CRIT` | 0 | 0 | 1 | **OUT OF STOCK** |
| `TS-DEMO-V23-PART-CNC-01` | Ceramic Spindle High-Speed Bearing | CNC | `BIN-CNC-B1` | 6 | 0 | 2 | In Stock |
| `TS-DEMO-V23-PART-CNC-02` | Adjustable High-Pressure Coolant Nozzle | CNC | `BIN-CNC-B2` | 30 | 0 | 5 | In Stock |
| `TS-DEMO-V23-PART-CNC-03` | Solid Carbide 4-Flute End Mill 10mm | CNC | `BIN-CNC-B3` | 50 | 0 | 15 | In Stock |
| `TS-DEMO-V23-PART-CNC-04` | Precision ER32 Collet Chuck Assembly | CNC | `BIN-CNC-B4` | 12 | 0 | 4 | In Stock |
| `TS-DEMO-V23-PART-CNC-05` | Reinforced Synchronous Servo Drive Belt | CNC | `BIN-CNC-B5` | 10 | 0 | 3 | In Stock |
| `TS-DEMO-V23-PART-PACK-01` | Nichrome Vacuum Thermal Heating Band | Packaging | `BIN-PCK-C1` | 14 | 0 | 4 | In Stock |
| `TS-DEMO-V23-PART-PACK-02` | PTFE Coated High-Temp Teflon Strip | Packaging | `BIN-PCK-C2` | 40 | 0 | 8 | In Stock |
| `TS-DEMO-V23-PART-PACK-03` | K-Type Thermal Couple Sensor Probe | Packaging | `BIN-PCK-C3` | 22 | 0 | 5 | In Stock |
| `TS-DEMO-V23-PART-PACK-04` | Pneumatic Silicon Vacuum Suction Cup | Packaging | `BIN-PCK-C4` | 60 | 0 | 12 | In Stock |
| `TS-DEMO-V23-PART-PACK-05` | Tungsten Carbide Film Guillotine Blade | Packaging | `BIN-PCK-C5` | 9 | 0 | 2 | In Stock |
| `TS-DEMO-V23-PART-INSPECT-01` | Bi-Telecentric Low-Distortion Lens 0.5x | Inspection | `BIN-OPT-D1` | 4 | 0 | 1 | In Stock |
| `TS-DEMO-V23-PART-INSPECT-02` | High-Luminance LED White Strobe Ring | Inspection | `BIN-OPT-D2` | 11 | 0 | 3 | In Stock |
| `TS-DEMO-V23-PART-INSPECT-03` | Chrome-on-Glass Dot Grid Reticle Target | Inspection | `BIN-OPT-D3` | 5 | 0 | 1 | In Stock |
| `TS-DEMO-V23-PART-INSPECT-04` | Linear Polarizing Filter Glass 52mm | Inspection | `BIN-OPT-D4` | 18 | 0 | 4 | In Stock |
| `TS-DEMO-V23-PART-INSPECT-05` | Industrial GigE Camera Shielded Cable 5m | Inspection | `BIN-OPT-D5` | 25 | 0 | 6 | In Stock |
| `TS-DEMO-V23-PART-QUAL-01` | Electro-Proportional Hydraulic Relief Valve | Quality | `BIN-QLT-E1` | 7 | 0 | 2 | In Stock |
| `TS-DEMO-V23-PART-QUAL-02` | Ultra-High Pressure Hydraulic Hose 700bar | Quality | `BIN-QLT-E2` | 12 | 0 | 3 | In Stock |
| `TS-DEMO-V23-PART-QUAL-03` | Precision Compression Load Cell 50kN | Quality | `BIN-QLT-E3` | 5 | 0 | 1 | In Stock |
| `TS-DEMO-V23-PART-QUAL-04` | Digital Hydraulic Test Gauge 0-1000bar | Quality | `BIN-QLT-E4` | 8 | 0 | 2 | In Stock |
| `TS-DEMO-V23-PART-QUAL-05` | Micro-Mesh Return Bypass Filter | Quality | `BIN-QLT-E5` | 35 | 0 | 10 | In Stock |

---

## 7. Deterministic Product Traceability Baseline (Reference Tool B)

The ground truth regression suite on reference fixture `TOOL-B` anchored at `2026-10-31T05:12:00.000Z` is strictly preserved:

- **24-Hour Window**: Exactly **35 units** (35 Confirmed)
- **72-Hour Window**: Exactly **100 units**
  - **Tiers**: 90 Confirmed, 4 Probable, 6 Unknown
  - **Disposition**: 40 In-Stock (Factory Warehouse), 35 Shipped to Dealer X (`DLR-X`), 25 Shipped to Dealer Y (`DLR-Y`)
- **168-Hour Window**: Exactly **160 units** (154 Confirmed, 6 Unknown)

---

## 8. Grand Finale Live Demonstration Walkthrough Script

Follow these steps in the running ToolSathi application (`npm run dev:v22`):

```
+---------------------------------------------------------------------------------------------------------+
|                                  TOOL SATHI GRAND FINALE FLOW                                          |
|                                                                                                         |
|  [ Worker ]  --->  [ Manager ]  --->  [ Optimizer ]  --->  [ Technician ]  --->  [ Verifier ]  ---> [ Quality ]
|  Report in         Triage &           Auto-allocate        Replace part &        Verify test         Forward Trace
|  Kannada           Restrict           idle workers         test readings         readings            Exposure Yard
+---------------------------------------------------------------------------------------------------------+
```

### Step 1: Worker Reports Fault in Kannada
1. Log in on `/login` as **Worker Ravi Kumar** (`TS-DEMO-V23-WRK-01`).
2. Switch language to **Kannada (`kn`)** via the global language dock.
3. On the Worker dashboard, report:
   *"ಬೋಲ್ಟ್ ಸಡಿಲವಾಗಿದೆ, ಟಾರ್ಕ್ ಸರಿಯಾಗಿ ಹೊಂದಿಕೊಳ್ಳುತ್ತಿಲ್ಲ"*
4. ToolSathi automatically transcribes and translates to English (*"Bolt is loose, torque setting is slipping below 45Nm tolerance"*), suggests NC code `NC-TORQUE-LOOSE`, and redirects to the issue detail `/issues/TS-DEMO-V23-INC-01`. Click **Confirm Report**.

### Step 2: Manager Reviews & Restricts Tool
1. Switch user to **Manager Deepa Nair** (`TS-DEMO-V23-MGR-01`).
2. Navigate to Manager Dashboard `/manager` or `/issues/TS-DEMO-V23-INC-01`.
3. Under **Operational Triage**, set Severity to **High**, Urgency to **Urgent**, and click **Submit Triage**.
4. In the Governance panel, propose **Tool Restriction** and approve the restriction proposal. Tool state switches to `Restricted`.

### Step 3: Automated Workforce Optimization
1. On the Manager Dashboard, open the **Workforce Allocation** tab.
2. ToolSathi detects tool `TS-DEMO-V23-TOOL-TORQUE-01` is restricted and 3 workers are idle.
3. Click **Generate Allocation Plan**:
   - Worker 1 (`TS-DEMO-V23-WRK-01`) is matched and assigned to **Packaging Station** (+35 units estimated).
   - Worker 2 (`TS-DEMO-V23-WRK-02`) is matched and assigned to **Final Inspection Station** (+41 units estimated).
   - Worker 3 (`TS-DEMO-V23-WRK-03`) is excluded with clear audit reasons: *Mandatory destination qualifications not met; Certification not current*.
4. Click **Confirm Allocation Plan** to execute the transfer.

### Step 4: Technician Assignment & Qualification Engine
1. In the Incident view `/issues/TS-DEMO-V23-INC-01`, click **Assign Technician**.
2. The qualification engine ranks all technicians:
   - **Prakash Shenoy (`TS-DEMO-V23-TECH-01`)**: Recommended & Eligible (0 workload, certified torque skill).
   - **Mahesh Angadi (`TS-DEMO-V23-TECH-02`)**: Rejected (Workload limit reached).
   - **Rohit Malhotra (`TS-DEMO-V23-TECH-03`)**: Rejected (Skill mismatch).
3. Select **Prakash Shenoy** and confirm assignment.

### Step 5: Technician Repair & Test Readings
1. Switch user to **Technician Prakash Shenoy** (`TS-DEMO-V23-TECH-01`).
2. Open Technician Dashboard `/technician` and accept work order `WO-01`.
3. Reserve and consume spare part `TS-DEMO-V23-PART-TORQUE-01` (Calibration Shim Pack).
4. In **Complete Repair Work Order**, enter post-repair test reading:
   - Measurement: `Calibration Tightening Test`
   - Measured Value: `45.2`
   - Unit: `Nm`
   - Expected: `45.0 - 48.0 Nm`
   - Status: `Passed`
5. Click **Submit Repair for Manager Review**.

### Step 6: Manager Review & Independent Verification Gate
1. Switch back to **Manager Deepa Nair** (`TS-DEMO-V23-MGR-01`). Click **Review Completed Work Order**.
2. Notice the manager **cannot** verify return-to-service due to separation-of-duties enforcement.
3. Switch user to **Independent Verifier Harish Chandra** (`TS-DEMO-V23-VERIFIER-02`).
4. On the Verifier Dashboard `/verifier`, open `TS-DEMO-V23-INC-01`.
5. Review physical evidence and test reading `45.2 Nm`. Click **Verify Return-to-Service**.

### Step 7: Incident Closure & Station Restoration
1. Manager Deepa Nair completes the final step: click **Close Incident**.
2. Tool state returns to `Active`.
3. In the Workforce panel, return candidates list Worker 1 and Worker 2 for restoration to their home station.

### Step 8: Quality Traceability & Exposure Yard
1. Switch user to **Quality Lead Sanjay Menon** (`TS-DEMO-V23-QUAL-01`).
2. Navigate to **Exposure Yard** `/exposure`.
3. Inspect reference tool `TOOL-B`:
   - 24h: 35 units
   - 72h: 100 units (90 Confirmed, 4 Probable, 6 Unknown; 40 In Factory Stock, 35 Dealer X, 25 Dealer Y)
   - 168h: 160 units
4. Export the verified PDF and CSV exposure reports with cryptographic SHA-256 integrity receipt.
