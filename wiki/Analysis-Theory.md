# Analysis Theory

Technical documentation of the analysis models used by the G-Code Modifier. Each section begins with a conceptual overview followed by the detailed math.

For usage instructions, see the [User Guide](User-Guide#analysis).

## Table of Contents

- [Overview](#overview)
- [Thermal Model](#thermal-model)
- [Heat Accumulation & Cooling Effectiveness](#heat-accumulation--cooling-effectiveness)
- [Warp Prediction](#warp-prediction)
- [Warp Failure Prediction](#warp-failure-prediction)
- [Structural Analysis](#structural-analysis)
- [Motion Analysis](#motion-analysis)
- [Material Properties Reference](#material-properties-reference)
- [Threshold System](#threshold-system)

---

## Overview

The analysis system runs three independent engines over the parsed G-code:

| Engine | What it analyzes | Grid basis |
|---|---|---|
| **Thermal** | Heat flow, cooling, warp | Variable (1–4mm cells) |
| **Structural** | Layer adhesion, extrusion quality | Fixed 0.8mm cells |
| **Motion** | Velocity, acceleration, jerk | Per-move (no grid) |

Each engine produces **findings** — diagnostic messages with severity levels (critical, warning, info) — and **overlay data** that colorizes the 3D view.

---

## Thermal Model

### Concept

The thermal model simulates heat flow during printing using a 2D grid that represents a top-down view of the print bed. As the nozzle deposits filament, it adds heat to grid cells. Between moves, heat dissipates through convective cooling (Newton's law) and lateral diffusion to neighboring cells.

The model tracks temperature at each grid cell across every layer. From this temperature history, it derives cooling time, heat accumulation, cooling effectiveness, and warping risk.

### Grid Setup

The grid resolution scales with the analysis depth setting:

| Depth | Grid Resolution | Time Budget | Backward Pass |
|---|---|---|---|
| ≤ 33% | 4mm per cell | 1.5s | Disabled |
| 34–66% | 2mm per cell | 4s | Enabled |
| > 66% | 1mm per cell | 10s | Enabled |

Grid dimensions are computed from the bounding box of all extrusion moves, rounded up to cell boundaries.

### Heat Sources

When filament is deposited on a cell, its temperature is set to the **deposition temperature**:

```
T_deposition = material.meltTemp × 0.7
```

This is lower than the nozzle melt temperature because the filament cools slightly between the nozzle and the bed surface.

### Ambient Temperature

The ambient temperature around the print is inferred from (in priority order):

1. User-specified chamber temperature (`environment.chamberTemp`)
2. `M141 S<val>` command in G-code (chamber heater)
3. Bed temperature gradient: `T_bed × 0.3 × exp(-z / 50)` (heat from bed decreases with height)
4. User-specified ambient (`environment.ambientTemp`)
5. Default: 22°C

### Convective Cooling

Each time step (one layer's worth of printing time), every cell cools toward ambient using Newton's law:

```
ΔT = (T - T_ambient) × k × Δt × fanBoost
```

Where:
- **k** = `thermalConductivity × 0.01 × chamberFactor` — the cooling constant
- **Δt** = layer print time in seconds
- **fanBoost** = `1 + fanSpeed × coolingSensitivity` — fan effect (fanSpeed is 0–1 from M106 S0–S255)
- **chamberFactor** scales convection based on enclosure:

| Chamber Type | chamberFactor |
|---|---|
| Heated | 0.2 |
| Enclosed | 0.5 |
| Open | 1.0 |

A heated chamber dramatically reduces convective cooling, keeping the part warmer and reducing thermal gradients.

### Lateral Diffusion

Heat spreads between adjacent cells through lateral diffusion. After cooling, each cell's temperature is blended with its 4-connected neighbors:

```
T_new = T + diffusionRate × (T_avg_neighbors - T)
```

Where:
- **diffusionRate** = 0.15
- **T_avg_neighbors** = average temperature of the 4 adjacent cells (up, down, left, right)

This runs for 1–3 iterations per layer depending on remaining time budget. Diffusion creates realistic temperature gradients where the center of a large flat area stays warmer than the edges.

### Backward Pass (Cooling Time)

When enabled (depth > 33%), a backward pass computes how long each cell waits before the next extrusion lands on it. This is useful for detecting areas where the nozzle returns too quickly (insufficient cooling) or too slowly (poor layer adhesion).

The algorithm walks layers in reverse, tracking `nextExtrusionTime[cell]` — the timestamp when the next extrusion will occur on that cell. For each move, the cooling time is:

```
coolingTime = nextExtrusionTime[cell] - currentMoveTime
```

---

## Heat Accumulation & Cooling Effectiveness

### Concept

**Heat accumulation** measures how much residual heat is trapped in the part at each point. When filament is deposited on already-hot material, the new layer cannot cool properly. This leads to sagging, poor dimensional accuracy, and deformation — especially on thin features and overhangs.

**Cooling effectiveness** measures how well the part has cooled between depositions. A value of 100% means the material has returned to ambient; 0% means no cooling occurred.

### Heat Accumulation Formula

Measured as a percentage of the temperature range between glass transition and heat deflection:

```
if T > T_glass:
  heatScore = min(1.0, (T - T_glass) / max(1, T_hdt - T_glass))
```

Where:
- **T** = temperature of the cell just before new material lands
- **T_glass** = glass transition temperature (material becomes rubbery)
- **T_hdt** = heat deflection temperature (material deforms under load)

Below T_glass, heat accumulation is zero — the material is solid and stable.

### Cooling Effectiveness Formula

Measured as the fraction of cooling that has occurred since deposition:

```
coolingEffectiveness = min(1.0, (T_deposition - T) / max(1, T_deposition - T_ambient))
```

A value of 1.0 means the cell has fully cooled to ambient. A value near 0 means the cell is still at deposition temperature — the nozzle returned too quickly.

For cells receiving their first extrusion, cooling effectiveness is set to 1.0 (no prior heat to dissipate).

---

## Warp Prediction

### Concept

Warping occurs when a printed part cools unevenly, causing differential thermal contraction. The bottom of the part, bonded to the bed, cannot contract, while upper layers cool and shrink. This creates internal stress that bends the part — corners and edges lift away from the bed.

The model computes per-cell warp risk based on four factors:

1. **Self-contraction** — how much each cell wants to shrink based on its CTE and temperature
2. **Neighbor stress** — strain differences between adjacent cells (differential cooling)
3. **Effective distance** — distance from the part centroid (edges experience more bending moment)
4. **Fill fraction** — local material density (sparse structures like lattices warp less)

### Self-Contraction

The thermal strain at each cell is driven by the coefficient of thermal expansion (CTE):

```
strain = CTE × max(0, T - T_glass)
```

When the temperature is above the glass transition, the material is soft and can deform. Below T_glass, strain is zero.

### Neighbor Stress

Differential cooling between adjacent cells creates stress at their boundaries. For each cell, the neighbor stress is the maximum strain difference with its 4-connected neighbors:

```
neighborStress = max(|strain[cell] - strain[neighbor]|) for each extruded neighbor
```

Only neighbors with actual material (extrusion count > 0) contribute. Empty cells are ignored — they are not zero-strain anchors.

### Effective Distance

Real-world warp manifests as plate bending — edges lift, center stays put. The effective distance blends a constant base risk with a distance-based component:

```
effectiveDist = partRadius × (0.4 + 0.6 × d / partRadius)
```

Where:
- **partRadius** = maximum distance from any extruded cell to the part centroid
- **d** = distance from the current cell to the centroid

This gives the center 40% of the corner's risk and corners 100%. The ratio between corner and center risk is approximately 2.5×, matching real-world observations of plate bending.

### Fill Fraction

Sparse structures (lattices, grids, honeycomb) warp less than solid parts because there is less continuous material to transmit stress. The fill fraction is computed using a **summed area table** (integral image) for efficient O(1) lookups:

1. Build a binary grid: 1 where material exists, 0 where empty
2. Compute the integral image (prefix sum in 2D)
3. For each cell, query the fraction of filled cells within a ~10mm radius neighborhood:

```
fillFraction = filledCells / totalCells  (within neighborhood)
```

The neighborhood radius is `max(2, round(10 / gridRes))` cells.

### Combined Warp Formula

The per-move warp risk at each grid cell:

```
warpRisk = (selfContraction + neighborStress) × effectiveDist × fillFraction
```

The per-layer warp grid follows the same formula, computed for every grid cell after the thermal simulation completes each layer.

### Warp Visualization

In the 3D warp view, color and Z-deformation are separated:

- **Color** = thermal warp risk (the combined formula above) — no distance bias
- **Z-deformation** = `warpRisk × (d / maxDist) × deformScale` — edges lift proportionally to distance from centroid

This separates the diagnostic information (color tells you where stress is high) from the physical visualization (edges lift realistically).

---

## Warp Failure Prediction

### Concept

While the per-cell warp grid shows spatial detail, the failure prediction system answers a higher-level question: **"Will this print fail from warping?"** It produces at most 3 findings with specific failure modes and actionable suggestions.

### Cumulative Averaged Warp

The prediction aggregates warp across all layers:

1. For each grid cell, sum the warp risk values from every layer where that cell has material
2. Divide by the number of contributing layers to get the averaged warp
3. Track the peak averaged warp across all cells and the layer that produces the worst running peak

### Aggregate Metrics

- **peakWarp** = maximum averaged warp across all cells (in mm)
- **warpCoverage** = fraction of cells with material that exceed the warning threshold

### Material-Adjusted Thresholds

Raw thresholds from the material profiles are scaled by adhesion and chamber:

```
warnThreshold = 0.4 × adhesionCoefficient × chamberScale
critThreshold = 0.8 × adhesionCoefficient × chamberScale
```

Where:
- **adhesionCoefficient** ranges from 0.35 (PPS-CF, very poor bed adhesion) to 0.95 (TPU, excellent adhesion)
- **chamberScale**: heated = 2.0, enclosed = 1.5, open = 1.0

**Example:** ABS in open air (adhesion = 0.60, chamber = 1.0) → warn at 0.24mm, critical at 0.48mm. PLA in enclosed chamber (adhesion = 0.85, chamber = 1.5) → warn at 0.51mm, critical at 1.02mm.

### Failure Modes

**1. Bed Adhesion Failure** — peakWarp vs. thresholds
- Critical: "Print likely to fail — warp exceeds bed adhesion capacity"
- Warning: "Warping risk — possible bed adhesion issues"

**2. Nozzle Collision** — peakWarp > 1.5 × layer height
- Critical: "Warp may cause nozzle collision — warped edge exceeds layer height"
- Only fires when warp is extreme relative to layer geometry (default layer height: 0.2mm, so threshold is 0.3mm)

**3. Dimensional Failure** — warpCoverage above 30% or 50% of footprint
- Warning at 30%: "30% of print footprint shows significant warping"
- Critical at 50%: "50% of print footprint shows significant warping"

**Safe Result** — if below all thresholds:
- Info: "Warping within safe limits for [material]"

### Suggestions

The system generates contextual suggestions based on material and environment:

- Always: "Add a brim (10-15mm)"
- If open chamber: "Use an enclosed or heated chamber"
- If high CTE material: "Consider a lower-CTE variant (e.g. PLA-CF instead of PLA)"
- If severe (peakWarp > 1.0mm): "Reduce part size or split into smaller pieces"

---

## Structural Analysis

### Concept

The structural analyzer evaluates layer-to-layer adhesion quality and extrusion consistency. Poor layer bonds lead to delamination; inconsistent extrusion creates weak spots.

### Layer Bond Overlap

Each layer's extrusion moves are rasterized onto a 0.8mm grid. The overlap with the previous layer is computed as:

```
overlap = overlappingCells / totalCells
```

Where `overlappingCells` is the number of cells filled in both the current and previous layer.

The composite bond score combines three factors:

```
baseBond = overlap × 0.5 + consistency × 0.25 + coolScore × 0.25
bond = baseBond × min(1, overlap + 0.3)
```

The final multiplication ensures that very low overlap (< 70%) penalizes the score even if consistency and cooling are good.

### Extrusion Consistency

For each move, the flow rate is computed as:

```
flowRate = E_length / moveLength
```

The mean flow rate across the layer establishes a baseline. Each move's consistency score is:

```
deviation = |flowRate - meanFlowRate| / meanFlowRate
score = max(0, 1 - deviation)
```

A score of 1.0 means the flow exactly matches the mean; lower scores indicate over- or under-extrusion relative to the layer average.

### Inter-Layer Cooling

The time available for cooling between layers affects adhesion:

```
layerTime = Σ(moveLength / feedRate)  for all moves in the layer
```

The cooling score is mapped to a 0–1 range:

| Layer Time | Cooling Score |
|---|---|
| < 1.0s | 0.2 (critical — too fast) |
| < minLayerTime × 0.5 | 0.5 (poor) |
| ≥ minLayerTime | 1.0 (good) |
| Between | Linear interpolation 0.5–1.0 |

Where `minLayerTime` comes from the material profile (e.g., 8s for PLA, 15s for TPU).

---

## Motion Analysis

### Concept

The motion analyzer evaluates whether the printer can physically achieve the requested speeds. It computes the maximum achievable velocity for each move based on the printer's acceleration limits and jerk/junction deviation settings.

### Printer Profile Detection

The analyzer scans the first 200 lines of G-code for motion configuration commands:

| Command | What it sets |
|---|---|
| `M204 P<val> T<val>` | Print acceleration, travel acceleration |
| `M204 S<val>` | Both print and travel acceleration |
| `M205 X<val>` / `M205 Y<val>` | Jerk (Marlin classic) |
| `M205 J<val>` | Junction deviation (Marlin 2.x+) |
| `M203 X<val>` | Max feedrate |
| `SET_VELOCITY_LIMIT ACCEL=<val>` | Klipper mode |
| `SET_VELOCITY_LIMIT SQUARE_CORNER_VELOCITY=<val>` | Klipper corner speed → converts to junction deviation: `J = scv² / (2 × accel)` |

**Defaults** (if not detected): acceleration = 500 mm/s², travel acceleration = 1000 mm/s², jerk = 8 mm/s, max velocity = 500 mm/s.

### Maximum Achievable Velocity

For each move segment, the maximum velocity is limited by the kinematic equation:

```
v_max = sqrt(v_entry² + 2 × a × d)
```

Where:
- **v_entry** = entry velocity (from previous move's exit or 0)
- **a** = acceleration limit (from M204)
- **d** = segment length

The final velocity is clamped to the move's requested feedrate and the printer's max velocity.

### Corner Speed (Jerk Models)

At direction changes, the entry velocity into the next segment is limited. Two models:

**Marlin Classic Jerk:**

```
cornerSpeed = jerk / |Δv|
```

Where |Δv| is the magnitude of the velocity change vector at the junction.

**Junction Deviation (Klipper, RepRapFirmware, Marlin 2.x+):**

```
halfAngle = acos(cosAngle) / 2
sinHalf = sin(halfAngle)
cornerSpeed = sqrt(J × a × sinHalf / (1 - sinHalf))
```

Where:
- **J** = junction deviation (mm, typically 0.01–0.08)
- **a** = acceleration
- **cosAngle** = dot product of normalized direction vectors of the two segments

Junction deviation produces smoother speed transitions and handles acute angles better than classic jerk.

---

## Material Properties Reference

Complete properties for all supported materials:

| Material | HDT (°C) | Tg (°C) | CTE (×10⁻⁶/K) | Conductivity (W/mK) | Adhesion | Cooling Sensitivity | Melt Temp (°C) | Min Layer Time (s) |
|---|---|---|---|---|---|---|---|---|
| PLA | 57 | 60 | 68 | 0.13 | 0.85 | 0.8 | 210 | 8 |
| PETG | 69 | 80 | 60 | 0.19 | 0.75 | 0.5 | 245 | 10 |
| ABS | 87 | 105 | 90 | 0.17 | 0.60 | 0.3 | 260 | 12 |
| ASA | 100 | 100 | 95 | 0.18 | 0.48 | 0.3 | 260 | 12 |
| TPU | — | -20 | 150 | 0.19 | 0.95 | 0.8 | 230 | 15 |
| PC | 117 | 147 | 65 | 0.20 | 0.68 | 0.2 | 270 | 15 |
| PLA-CF | 55 | 55 | 30 | — | 0.62 | — | — | — |
| PETG-CF | 74 | 74 | 25 | — | 0.75 | — | — | — |
| ABS-GF | 99 | 99 | 45 | — | 0.50 | — | — | — |
| ASA-CF | 110 | 110 | 40 | — | 0.70 | — | — | — |
| PC-FR | 113 | 113 | 55 | — | 0.65 | — | — | — |
| PET-CF | 205 | 120 | 22 | — | 0.45 | — | — | — |
| PA-CF | 194 | 100 | 20 | — | 0.83 | — | — | — |
| PA6-CF | 186 | 80 | 18 | — | 0.90 | — | — | — |
| PA6-GF | 182 | 80 | 35 | — | 0.42 | — | — | — |
| PPA-CF | 227 | 130 | 15 | — | 0.43 | — | — | — |
| PPS-CF | 264 | 90 | 28 | — | 0.35 | — | — | — |
| Nylon | 186 | 80 | 80 | — | 0.83 | — | — | — |

**Key properties explained:**

- **HDT** (Heat Deflection Temperature) — temperature at which the material deforms under load. Above this, parts sag.
- **Tg** (Glass Transition) — temperature where the material transitions from rigid to rubbery. Below Tg, the material is dimensionally stable.
- **CTE** (Coefficient of Thermal Expansion) — how much the material expands per degree. Higher CTE = more warping risk. Carbon fiber variants have dramatically lower CTE (e.g., PLA: 68 vs PLA-CF: 30).
- **Adhesion Coefficient** — 0 to 1 scale of how well the material sticks to the bed. Derived from Charpy impact strength in the Z direction. Lower values mean the material delaminates more easily.
- **Cooling Sensitivity** — how much part cooling fan affects the material. PLA (0.8) responds strongly to fan; PC (0.2) is relatively insensitive.

---

## Threshold System

### Default Thresholds

| Threshold | Warning | Critical | Units |
|---|---|---|---|
| Layer Bond Overlap | 0.25 (25%) | 0.10 (10%) | fraction |
| Layer Bond Cooling | 2.0 | 1.0 | seconds |
| Wall Seam Alignment | 3.0 | — | mm |
| Wall Gap Size | 0.8 | 1.5 | mm |
| Extrusion Consistency | 0.35 (35%) | — | deviation fraction |
| Warp Tolerance | 0.4 | 0.8 | mm |

### Material Scaling

Thresholds are not used directly — they are scaled by material properties at runtime:

**Warp thresholds** scale with adhesion coefficient and chamber type:
```
effective_threshold = base_threshold × adhesionCoefficient × chamberScale
```

**Cooling thresholds** use the material's `minLayerTime`:
- Warning: layer time < minLayerTime
- Critical: layer time < minLayerTime × 0.5

### Chamber Type Scaling

| Chamber Type | Warp chamberScale | Cooling chamberFactor |
|---|---|---|
| Heated | 2.0 | 0.2 |
| Enclosed | 1.5 | 0.5 |
| Open | 1.0 | 1.0 |

A heated chamber doubles the effective warp tolerance (parts warp less) and reduces cooling rate to 20% of open-air (keeps parts warm, reducing thermal gradients).

### Material Auto-Detection

If no material is selected, the analyzer infers it from G-code:

1. Look for `; filament_type = <material>` comment
2. If not found, check hotend temperature: ≥ 230°C → PETG, else PLA
3. Default: PLA
