# ToolSathi Frontend & Control Console

> Multilingual incident intelligence, explainable traceability and human-approved recovery for SAP manufacturing.
> Built for SAP Hackfest 2026 • Bengaluru Grand Finale • Theme: Resilient Supply Chains

## Concept: Clarity Glass
The factory floor is behind glass; the clearer the evidence, the clearer the glass.
- **Confirmed Association**: Precision ruby block
- **Probable**: Translucent saffron block
- **Unknown**: Frosted fog with diagonal hatch and question mark (never green)
- **Outside Window**: Ghost outline

## Tech Stack
- **Framework**: React 18 + Vite
- **Styling**: Vanilla CSS with Clarity Glass Design Tokens
- **Typography**: `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`, `@fontsource/noto-sans-kannada`, `@fontsource/noto-sans-devanagari` (Self-hosted offline)
- **Animation**: Native CSS 3D transforms & Framer Motion
- **Seed Data Generator**: Node.js deterministic generator matching ground truth

## Setup & Running

```bash
cd frontend

# Install dependencies
npm install

# Generate or verify seed data (300 units, 35/100/160 window counts, 40/35/25 split)
npm run seed
npm run test:seed

# Start development server
npm run dev
```

The Vite dev server will start at `http://localhost:5173`.

## Key Views
- `/` - **Launcher Portal**: Overview, role switch, and quick view launcher
- `/console` - **Manager & Quality Control Console**: Evidence Yard hero, Certainty Capsule, Glass Tanks, Interlock Gate approvals, and Audit Ledger
- `/worker` - **Worker Reporting App**: Mobile-first QR scan, Kannada/Hindi/English voice & text intake, editable structured card
- `/history` - **Tool Lifecycle & History**: Vertical tool timeline, repeat-failure detection, duplicate prompt
- `/kitchen` - **Design System Kitchen Sink**: Visual verification of all glass panels, chips, tier blocks, and trust badges
