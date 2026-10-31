# ToolSathi UI Playbook & Design System: Clarity Glass

## 1. The Design Concept: Clarity Glass
> *"The factory is behind glass, and the clearer the evidence, the clearer the glass."*

Most hackathon UIs are generic card grids with charts. ToolSathi treats the interface as a physical shop-floor control room and inspection line.
Uncertainty is rendered not merely as a badge, but through the physical optical material of the component itself:
- **Confirmed Association**: Crystal clear, vivid, sharp-edged ruby glass block (`--ruby #E0314B`). High refractive precision.
- **Probable**: Tinted, translucent saffron glass block (`--saffron #F2A100`). Semi-transparent, inferred connection.
- **Unknown**: Frosted, fogged glass with diagonal cross-hatch and question mark (`--frost #7F93AD`). You literally cannot see through it. **Never green, never styled as safe.**
- **Outside Investigation Window**: A faint ghost outline (`--ghost`). Resting flat on the line floor.

**Pitch Line**: *"The less we know, the foggier the glass. Uncertainty is communicated by the material itself."*

---

## 2. Industrial Visual Rules & Light Theme Standard
Light theme only for high-lumen industrial projectors and well-lit plant supervisor control booths.
- **Calm Normal, Loud Abnormal**: The base environment is quiet pearl and soft slate. Saturated color only appears when an asset, batch, or gate requires immediate intervention.
- **Projector Contrast Rule**: Dark ink text (`#0E1A2F`) on every panel. Strong 1px visible borders and ambient occlusion shadows.
- **Dense Data Rule**: Tables, audit logs, and evidence drawers sit on near-solid white panels (90% alpha) to eliminate blur fatigue.
- **Color + Icon + Label Pair**: Every state color is strictly accompanied by a geometric inline SVG icon and clear text label for color-blind operators and monochrome printouts.
- **Wording Standard**: Always use **"potentially exposed"**, NEVER "defective". Software traces exposure paths; only an authorized human metallurgist/inspector declares a defect.

---

## 3. Curated Palette Tokens

| Token | Hex / Value | Semantic Role | Rule |
| :--- | :--- | :--- | :--- |
| `--pearl` | `#EEF2F9` | Canvas background | Clean, industrial neutral base |
| `--aqua` | `#CFEFFF` | Ambient background glow | Soft refraction behind glass |
| `--peach` | `#FFE3D9` | Ambient background glow | Soft warmth behind glass |
| `--lilac` | `#E6E0FF` | Ambient background glow | Subtle depth gradient glow |
| `--ink` | `#0E1A2F` | Primary text | Min 4.5:1 contrast on all surfaces |
| `--ink-soft` | `#4A5870` | Secondary / metadata text | Clean legibility |
| `--ruby` | `#E0314B` | Confirmed exposure, blocked, restricted | Solid ruby block; text `--ruby-ink #A3152D` |
| `--saffron` | `#F2A100` | Probable, stale record, needs review | Translucent tint; text `--saffron-ink #8A5A00` |
| `--frost` | `#7F93AD` | Unknown / missing records | Frosted fog + hatch; **never green** |
| `--cobalt` | `#3B5BFF` | AI or system proposal | Always stamped "AI proposed"; text `--cobalt-ink #2236B8` |
| `--jade` | `#0EA37A` | Human-approved or verified return | Appears only after human action; text `--jade-ink #08694F` |
| `--glass` | `rgba(255,255,255,0.58)` | Standard glass panel fill | Frosted backdrop blur |
| `--glass-strong` | `rgba(255,255,255,0.85)` | High-density glass fill | Used on audit logs, tables, forms |
| `--glass-border` | `rgba(255,255,255,0.82)` | Specular edge highlight | 1px solid with top highlight |

---

## 4. Glass & 3D Industrial Recipe

1. **Glass Panels**:
   `background: var(--glass); backdrop-filter: blur(22px) saturate(160%); border: 1px solid var(--glass-border); box-shadow: 0 16px 36px rgba(14,26,47,0.08), inset 0 1px 0 rgba(255,255,255,0.9); border-radius: 24px;`
2. **Evidence Yard (Hero Component)**:
   300 assemblies rendered as true isometric 3D blocks in SVG.
   - Units inside the active investigation window lift vertically with a realistic spring animation (`translateY(-14px)`).
   - Units outside remain flat as low-opacity ghost outlines.
   - Subtle interactive perspective tilt: up to 6 degrees following cursor, disabled under `prefers-reduced-motion`.
3. **Glass Tanks (Destination Breakdown)**:
   Three vertical graduated glass vessels:
   - *Factory Stock* (Target: 40 units at 72h)
   - *Dealer X* (Target: 35 units at 72h)
   - *Dealer Y* (Target: 25 units at 72h)
   Tanks visually fill with stacked isometric unit pellets grouped by tier.
4. **Window Lens**:
   Glass scrubber overlay spanning the 7-day timeline with deterministic snap points:
   - `24 Hours`: 35 units
   - `72 Hours`: 100 units (Default investigation benchmark)
   - `7 Days (168h)`: 160 units
   The active window duration is permanently printed as text in the HUD.
5. **Lockout Tag**:
   A 3D OSHA-style lockout/tagout tag suspended from the Tool B tile on a physics swing motion. Saturated Ruby while Restricted; transitions to Jade only upon verified return to service.
6. **Interlock Gates**:
   A double-door physical glass barrier with a padlock. When an authorized user approves a proposal, CSS 3D `transform: rotateY(-85deg)` unlocks the gate, and stamps a *"Simulated: sent to mock S/4"* chip.
7. **Mic Orb**:
   A multi-layered glossy glass sphere on the worker screen with reactive circular audio wave ripples.

---

## 5. Typography & Ergonomics

- **Body & Headings**: `IBM Plex Sans` (400, 500, 600, 700)
- **Codes, Serials, Timestamps, Audit**: `IBM Plex Mono` (400, 600)
- **Worker Screen Localizations**: `Noto Sans Kannada` and `Noto Sans Devanagari`
- **Scale Requirements**:
  - Console: Minimum **18px** body text for 10-foot projector legibility.
  - Worker App: Minimum **56px** touch targets for rugged shop-floor tablets & gloves.
- **All fonts must be self-hosted** via `@fontsource` packages for air-gapped/offline plant reliability.

---

## 6. Trust Badges & Honesty Rails

- **Status Badges**:
  - `Built`: Real implemented client/service logic.
  - `Simulated`: Realistic SAP BTP CAP mock payload (S/4HANA & Digital Manufacturing interfaces).
  - `Planned`: Clear roadmap architectural capability.
- **Synthetic Data Ribbon**: Header banner: *"SYNTHETIC DATA • SAP SERVICES SIMULATED"*.
- **Certainty Capsule**: Never display a solitary scary number. Always present: *"100 potentially exposed: 90 record-linked, 4 probable, 6 cannot be determined"* accompanied by the full 35–160 exposure window range and data-quality score.
- **Audit Stamp**: Monospaced, immutable append-only ledger displaying Actor, Role, Timestamp, Action, Reason, and Model Version.

---

## 7. Performance & Accessibility Guardrails

1. **Backdrop-Filter Budget**: At most **6 backdrop-filter panels** per viewport. 300 unit blocks use native SVG vector patterns and gradients, **never** individual backdrop filters.
2. **Accessible Yard / List Switch**: Instant toggle between the 3D isometric SVG Yard and a high-contrast tabular list view with search, filter, and complete evidence drill-down.
3. **Reduced Motion**: Under `@media (prefers-reduced-motion: reduce)`, disable mouse tilt, swinging physics, and spring animations.
4. **Banned List**:
   - ❌ No generic card grids
   - ❌ No purple/neon gradients
   - ❌ No generic emoji icons (use custom crisp SVGs)
   - ❌ No stock illustrations
   - ❌ No third-party chart bloatware
