# Analysis Visualization Tools Design

Date: 2026-02-27

## Overview

Advanced visualization tools for G-code analysis that predict print issues before they happen. Three analysis engines work together with a unified profile system to provide multi-factor, predictive analysis that slicers don't offer.

**Target User:** Intermediate 3D printing users who understand printing but aren't G-code experts. Plain-English explanations guide users on what issues mean and how to address them.

**Core Differentiator:** Post-slicer analysis that shows what the printer *actually does*, not what was requested. Considers interactions between speed, geometry, cooling, and material properties.

---

## Analysis Engines

### 1. Motion Reality Engine (Priority 1)

Simulates how printer firmware interprets G-code, showing actual motion profile rather than requested speeds.

#### Features

**Actual Speed Heatmap**
- New color mode showing velocity the printer achieves at each point
- Accounts for acceleration limits, segment length, and junction velocity

**Speed Delta Overlay**
- Shows gap between requested and actual speed
- Green = achieving requested speed, Red = significantly slower

**Acceleration Phase Markers**
- Optional visualization showing accel/cruise/decel phases within each move
- Reveals segments that never reach cruise speed

**Corner Analysis**
- Corners glow based on how much they slow the printer
- Helps users understand impact of geometry on print time

#### Algorithm

For each G1 move:
1. Calculate max achievable velocity given segment length and acceleration
2. Apply junction velocity limit based on angle to next move
3. Backward pass: propagate deceleration constraints
4. Forward pass: apply acceleration limits
5. Store per-segment: requestedSpeed, actualPeakSpeed, actualAvgSpeed, accel/cruise/decel times

---

### 2. Structural Integrity Mapper (Priority 2)

Predicts mechanical weak points from geometry and extrusion analysis.

#### Features

**Layer Bond Strength Map**
- Estimates adhesion between layers
- Factors: line overlap percentage, cooling state, extrusion consistency
- Heatmap from green (strong) to red (weak)

**Grain Direction Analysis**
- Calculates predominant extrusion direction per region
- Vector field overlay with arrows indicating grain
- Highlights areas where grain is perpendicular to likely stress

**Wall Integrity Scanner**
- Seam locations with clustering analysis
- Gaps and under-extrusion detection
- Direction reversals that create stress concentrators

**Infill-Perimeter Interface**
- Overlap distance between infill endpoints and inner perimeter
- Angle of approach analysis
- Identifies areas where infill doesn't reach walls

---

### 3. Thermal Dynamics Analyzer (Priority 3)

Models heat accumulation and cooling behavior throughout the print.

#### Features

**Layer Cooling Time Map**
- Time until next layer arrives at each XY position
- Red = short cooling (deformation risk), Green = adequate, Blue = long (weak bond risk)

**Small Feature Heat Accumulation**
- Detects isolated features with repeated rapid passes
- Calculates heat buildup factor
- Suggests minimum layer time adjustments

**Cooling Fan Effectiveness**
- Models direct airflow vs. shadowed zones based on part geometry
- Relative effectiveness rating per region

**Thermal Gradient Analysis**
- Temperature differentials causing warping
- Cross-layer thermal stress accumulation
- Predicts likely warping/cracking areas for ABS/ASA

---

## Unified Profile System

Three-tier system balancing ease of use with precision for advanced users.

### Tier 1: Auto-Inferred (Zero Setup)

**From G-code:**
- M204 → acceleration limits
- M205 → jerk/junction deviation
- M203 → max feedrate per axis
- Firmware flavor → motion planner model
- Temperature commands → material type hints
- Filament comments → material identification

### Tier 2: Basic Profile (Quick Setup)

**Printer:**
- Acceleration (mm/s²)
- Jerk (mm/s) or Junction Deviation (mm)
- Firmware type: Marlin classic, Marlin 2.0 S-Curve, Klipper, RRF
- Printer presets: Prusa MK3, Bambu X1, Ender 3, Voron, etc.

**Material:**
- Type dropdown: PLA, PETG, ABS, ASA, Nylon, TPU, PC
- Brand presets: Prusament, eSun, Polymaker, etc.
- Glass transition temperature
- Cooling sensitivity

### Tier 3: Advanced Mode (Precision)

**Mechanical Properties:**
- Printhead mass (grams)
- Gantry type: Cartesian, CoreXY, Delta
- Belt/leadscrew elasticity factor
- Frame rigidity rating

**Measured Data Imports:**
- Input shaper data (Klipper resonance test CSV)
- Accelerometer profiles (ADXL345 data)
- PID tuning data

**Material Properties:**
- Melt flow index (MFI)
- Crystallinity (amorphous vs. semi-crystalline)
- Hygroscopy rating
- Inter-layer adhesion coefficient
- Tensile/shear strength anisotropy ratio

**Environment:**
- Ambient temperature
- Chamber temperature (heated/unheated)
- Humidity level
- Part cooling fan CFM
- Enclosure airflow type

---

## Analysis Panel UI

New "Analysis" tab alongside existing Code/Visual tabs.

### Layout

```
┌─────────────────────────────────────────────────┐
│ Analysis                              [Scan] ⟳  │
├─────────────────────────────────────────────────┤
│ Printer: [inferred/selected]       [Configure] │
│ Material: [inferred/selected]      [Configure] │
├─────────────────────────────────────────────────┤
│ ▼ Motion Reality          [count] findings     │
│   ● Finding summaries...                       │
├─────────────────────────────────────────────────┤
│ ▼ Structural Integrity    [count] findings     │
│   ● Finding summaries...                       │
├─────────────────────────────────────────────────┤
│ ▼ Thermal Dynamics        [count] findings     │
│   ● Finding summaries...                       │
├─────────────────────────────────────────────────┤
│ Timeline: [sparkline of issues per layer]      │
└─────────────────────────────────────────────────┘
```

### Interaction

1. **Auto-scan on load** with inferred settings
2. **Expandable sections** with individual findings
3. **Click finding** → camera flies to location, applies relevant overlay
4. **Timeline scrubber** → click to jump to layer
5. **Configure buttons** → open profile panels, re-scan after changes

### Severity Levels

- **Critical (red)** — High likelihood of print failure
- **Warning (yellow)** — Likely visible quality issues
- **Info (blue)** — Notable but possibly acceptable

---

## 3D Overlay Modes

New entries in color mode dropdown:

**Motion:**
- Actual Speed
- Speed Delta
- Acceleration Phase

**Structural:**
- Layer Bond Strength
- Grain Direction

**Thermal:**
- Cooling Time
- Heat Accumulation

One overlay active at a time, consistent with existing heatmap behavior.

---

## Extensibility Architecture

### Plugin Engine Interface

```
Engine {
  analyze(gcode, profile) → findings[]
  getOverlayData(layerNum) → colorData
  getTimelineData() → densityArray
  getSupportedOverlays() → overlayMode[]
}
```

New engines added without modifying core code.

### Structured Finding Schema

```
Finding {
  id, engine, severity, category,
  title, description, suggestion,
  location: { layer, lineStart, lineEnd, xyz },
  actions: [{ type, description, patch? }],
  metadata: { ... }
}
```

Enables future export, filtering, comparison, and modification features.

### Extensible Profile System

Profiles as typed key-value pairs with categories:
```
Profile {
  printer: { ... },
  material: { ... },
  environment: { ... },
  custom: { ... }
}
```

New inputs added without breaking existing profiles.

### Overlay Registration

```
registerOverlay(name, engine, colorFunction, legendConfig)
```

New visualizations without touching WebGL core.

### Action System Foundation

Findings include optional actions:
- `navigate` — jump to location (implemented)
- `modify` — apply patch via edit mode (future)

---

## Future Enhancements Roadmap

### Phase 2 (Post-MVP)

| Feature | Description |
|---------|-------------|
| Fix Suggestions | "Click to apply" patches for common issues |
| Export Reports | PDF/JSON summary of all findings |
| Severity Thresholds | User-configurable warning vs. critical levels |
| Custom Analyzers | User-defined rules for warnings |

### Phase 3

| Feature | Description |
|---------|-------------|
| Historical Comparison | Compare analysis between two G-code files |
| Print Outcome Learning | Mark actual failures to improve predictions |
| Slicer Recommendations | Specific settings to change in each slicer |
| Multi-file Batch Analysis | Analyze print farm queues |

### Phase 4 (Ambitious)

| Feature | Description |
|---------|-------------|
| ML-Enhanced Predictions | Train on user's printer/material data |
| Real-time Streaming | Analyze G-code as it's generated |
| Printer Integration | Pull live accelerometer data |

---

## Out of Scope (This Phase)

- Real-time G-code modification suggestions
- Export analysis reports
- Historical comparison between files
- Machine learning predictions

These are explicitly deferred to future phases; architecture supports their addition.

---

## Implementation Priority

1. Motion Reality Engine
2. Structural Integrity Mapper
3. Thermal Dynamics Analyzer

Each engine fully functional before starting the next. Shared infrastructure (Analysis Panel, Profile System, Finding Schema) built alongside first engine.
