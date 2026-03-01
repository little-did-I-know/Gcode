# User Guide

A complete guide to using the G-Code Modifier — a browser-based G-code editor and print analyzer for 3D printing.

## Table of Contents

- [Interface Layout](#interface-layout)
- [Loading Files](#loading-files)
- [3D Visualization](#3d-visualization)
- [Motion Legend](#motion-legend)
- [Layer Modifications](#layer-modifications)
- [Hole Detection](#hole-detection)
- [Print Simulation](#print-simulation)
- [Edit Mode](#edit-mode)
- [Analysis](#analysis)
- [Warp View](#warp-view)
- [G-code Reference](#g-code-reference)
- [Firmware Profiles](#firmware-profiles)
- [Material Selection](#material-selection)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Browser Compatibility](#browser-compatibility)
- [Troubleshooting](#troubleshooting)

---

## Interface Layout

The interface uses a three-panel responsive design:

| Panel | Contents |
|---|---|
| **Left** | Layer navigator — lists all layers with Z-height, provides search and filter |
| **Center** | Code view (syntax-highlighted G-code) or 3D visual view (WebGL), toggled with Space |
| **Right** | Modification tools — 9 tabs for different operations |

On mobile, the layout collapses to a vertical stack with a hamburger menu for the layer navigator.

The **modification list** at the bottom of the right panel shows all pending modifications. Drag to reorder, click × to delete. A counter badge shows how many modifications are active.

---

## Loading Files

### Supported Formats

Drop a `.gcode`, `.gco`, or `.g` file onto the page, or click the file input to browse.

### Slicer Auto-Detection

The parser automatically identifies your slicer from header comments:

| Slicer | Detection Pattern |
|---|---|
| Cura | `;LAYER:N` |
| Bambu Studio | `; CHANGE_LAYER`, `; Z_HEIGHT` |
| PrusaSlicer / SuperSlicer | `;LAYER_CHANGE`, `;Z:X.XX` |
| OrcaSlicer | Both Bambu and Prusa formats |
| Simplify3D | `; layer N, Z = X.XX` |
| ideaMaker | `;LAYER:N` |

### Slicer Export Instructions

**PrusaSlicer / OrcaSlicer:** By default, these export binary G-code which cannot be parsed. Go to **Printer Settings → General → Firmware → G-code flavor** and uncheck **"Export binary G-code"** to get a plain `.gcode` file.

**Bambu Studio:** Export using **File → Export → Export plate sliced file** to get a `.gcode` file (not the `.3mf` project file).

**Cura:** Use **File → Save to Disk** or the "Save to Disk" button to export `.gcode`.

### Large File Support

Files are parsed asynchronously in 50,000-line chunks with a progress indicator. Files over 100k lines may take a few seconds but will not freeze the browser.

---

## 3D Visualization

Switch to the 3D view with **Space** or the Code/Visual toggle.

### Camera Controls

| Action | Mouse | Touch |
|---|---|---|
| Orbit | Left-click drag | One-finger drag |
| Pan | Right-click drag | Two-finger drag |
| Zoom | Scroll wheel | Pinch |
| Reset | Press **F** | Press **F** |

### What You See

- **Colored lines** — extrusion moves colored by motion type (outer wall, inner wall, infill, support, bridge, overhang, etc.)
- **Gray lines** — travel moves (non-extruding repositions)
- **Layer opacity** — lower layers render semi-transparent; the current layer is fully opaque
- **10mm bed grid** — reference grid on the build plate
- **Modification markers** — translucent colored planes at modification Z-heights:
  - Yellow = pause
  - Purple = filament change
  - Orange = Z-offset
  - Cyan = custom G-code

### Layer Slider

The slider at the bottom scrubs through layers in cumulative view — all layers from 0 up to the selected layer are shown. Use **[** and **]** or arrow keys for single-layer steps.

### Cross-Section Clipping

Press **X** to enable cross-section mode. Controls appear:

- **Rotation** — angle of the clipping plane around Z
- **Tilt** — vertical angle of the clipping plane
- **Sweep** — position of the clipping plane along the cut axis
- **Flip** — reverse which side is visible
- **Reset** — return to default orientation

### Measure Tool

Click two points in the 3D view to measure the straight-line distance between them. The measurement is displayed in millimeters.

---

## Motion Legend

The motion legend panel (collapsible) shows all motion types detected in the current file:

- Toggle the **eye icon** to show/hide individual motion types
- Click the **color swatch** to change a motion type's color
- **Reset** returns all colors to defaults

Default motion type colors:

| Type | Default Color |
|---|---|
| Outer Wall | Orange |
| Inner Wall | Green |
| Infill | Yellow |
| Support | Cyan |
| Bridge | Red |
| Overhang | Magenta |
| Top Solid | Light Blue |
| Bottom Solid | Brown |
| Travel | Gray |

---

## Layer Modifications

The right panel has tabs for different modification types. Add modifications, then export the modified G-code.

### Pause

Insert a pause at a specific layer so you can add inserts, change colors, or inspect the print.

- **Layer**: select from dropdown or click a layer in the navigator
- **Mid-layer**: pause partway through a layer (a percentage slider appears)
- **Reminder**: optional message displayed in the G-code as a comment
- **Move head away**: when enabled, the pause sequence:
  1. Retract filament
  2. Lift Z by a configurable amount
  3. Move head to park position (front-left by default)
  4. Wait for user to resume
  5. Un-retract and continue

Pause G-code is firmware-specific — see [Firmware Profiles](#firmware-profiles).

### Filament Change

Trigger a filament swap at a layer boundary.

- **Standard firmware**: inserts `M600` (requires `ADVANCED_PAUSE_FEATURE` on Marlin)
- **Bambu Lab AMS**: inserts `M1020 S<slot>` where slot 0-3 maps to AMS positions

### Z-Offset

Apply a vertical offset to all moves across a layer range. Useful for compensating for embedded inserts that change the effective print surface height.

- **Offset (mm)**: positive = up, negative = down
- **Start/End layer**: range of affected layers
- Applies to all G0, G1, G2, G3 moves with a Z parameter

### Eject

Add an automatic eject sequence at the end of the print:

- **Bed Y position**: how far forward to push the bed
- **Head Z clearance**: how high to lift the nozzle
- **Feed rate**: speed of eject moves
- **Heater off**: optionally turn off bed and nozzle heaters
- **Home Z**: optionally home the Z axis after eject
- **Loop mode**: adds a restart loop for continuous printing (requires external automation to remove parts and trigger restart)

### Custom G-Code

Insert arbitrary G-code at a specific layer or at the end of the file.

- Multi-line input supported
- Lines are wrapped with identifying comments (`; -- custom gcode start --` / `; -- custom gcode end --`)

### Recovery

Resume printing from a failed layer. The tool strips all G-code before the target layer, adjusts Z-heights so printing starts at the bed surface, and preserves the preamble (homing, heating, etc.).

- **Recovery layer**: the layer to resume from
- The modified file starts with the original preamble, then jumps directly to the recovery layer

### Modification List

All pending modifications appear in a list at the bottom of the right panel:

- **Drag** to reorder (execution order matters)
- **Click ×** to delete
- **Counter badge** on each tab shows how many modifications of that type are pending

---

## Hole Detection

The Inserts tab detects holes in your print for embedding magnets, threaded inserts, or nuts.

### Detection Modes

- **Detect single layer**: scans only the currently selected layer
- **Scan all layers**: scans every layer in the print (slower but comprehensive)

### How It Works

1. **Rasterization** — extrusion moves are rasterized onto a 0.5mm grid using Bresenham line drawing with 0.45mm stroke width
2. **Exterior flood-fill** — BFS from border cells marks all exterior-connected empty space
3. **Connected components** — remaining empty cells are grouped into holes using 4-connectivity BFS
4. **Filtering** — holes smaller than 4mm diameter are discarded (configurable)

### Results

Each detected hole shows:

| Property | Description |
|---|---|
| Diameter | Compensated for rasterization error |
| Area | In mm² |
| Shape | Circle, square, hexagon, or rectangle (from aspect ratio and fill ratio) |
| Depth | Distance from hole opening to floor (using 80% overlap threshold) |
| Floor layer | The layer where the hole bottom is |
| Through-hole | Whether the hole extends to the bed |

### Auto-Pause

Select a hole and specify the insert height. The tool calculates which layer to pause at (based on hole depth minus insert height) and adds a pause modification automatically.

### Ignore Infill

When enabled, infill regions inside walls are not treated as filled space, so holes within infill regions can be detected.

---

## Print Simulation

The playback controls (visible in visual view) simulate the print move by move.

- **Play/Pause** — press **P** or click the play button
- **Speed slider** — controls moves per second
- **Progress bar** — click to seek; yellow tick marks show pause locations
- **Auto-advance** — when a layer completes, automatically advances to the next
- **Pause detection** — when simulation reaches a pause modification, the view flashes and playback stops

---

## Edit Mode

> **Experimental feature** — may have edge cases with unusual G-code.

Edit mode lets you select, modify, and delete individual G-code moves directly in the 3D view.

### Workflow

1. Enter edit mode from the toolbar
2. **Hover** over moves to preview them (red-orange highlight)
3. **Click** a move to select it — the edit info panel appears
4. **Modify parameters** — X, Y, Z, E, F fields are editable inline
5. **Live preview** — changes are shown immediately in the 3D view as a dashed line
6. Press **Enter** to apply or **Escape** to cancel

### E-Value Repair

When you move a G1 extrusion, the E (extrusion amount) value is automatically recalculated to maintain correct flow for the new move length. This prevents over- or under-extrusion.

### Undo / Redo

- **Ctrl+Z** / **Ctrl+Shift+Z** — full undo/redo history for all edit operations
- Deleting a move is also undoable

### Deleting Moves

Select a move and press **Delete** or **Backspace** to remove it. The surrounding moves remain connected.

---

## Analysis

The Analysis tab runs three independent analysis engines over your G-code and produces findings with overlay visualizations.

### Running Analysis

1. Switch to the **Analysis** tab (key **9**)
2. Select your **material** and **chamber type** (open, enclosed, or heated)
3. Set the **analysis depth** slider (higher = finer grid but slower)
4. Click **Run Analysis**

Analysis time ranges from ~1 second (low depth, small file) to ~10 seconds (high depth, large file).

### Overlay Modes

After analysis completes, select an overlay mode from the dropdown to colorize the 3D view:

| Overlay | What it shows | Scale |
|---|---|---|
| Cooling Time | Time until next extrusion on each cell | Seconds |
| Heat Accumulation | Temperature above glass transition | 0–100% |
| Cooling Effectiveness | How much the filament has cooled from deposition temp | 0–100% |
| Temperature | Absolute temperature at each cell | °C |
| Warping Risk | Predicted deformation per cell | mm |
| Layer Bond | Overlap with previous layer | 0–100% |
| Extrusion Consistency | Deviation from mean flow rate | 0–100% score |
| Max Velocity | Achievable speed at each move | mm/s |

### Findings Panel

Findings appear as cards below the overlay selector:

- **Critical** (red) — likely print failure
- **Warning** (yellow) — potential issue, may succeed
- **Info** (blue) — analysis complete, no issues

Click a finding to navigate to the affected layer and location. Each finding includes:
- Description of the issue
- Measured value vs. threshold
- Suggestions for fixing the issue

### Finding Categories

| Category | Source | Examples |
|---|---|---|
| `cooling-time` | Thermal | "Layer cools for only 2.1s — minimum is 8s for PLA" |
| `heat-accumulation` | Thermal | "Heat buildup at 85% — risk of sagging or deformation" |
| `cooling-effectiveness` | Thermal | "Poor cooling at 23% — material stays hot too long" |
| `warp-failure` | Thermal | "Print likely to fail — warp exceeds bed adhesion capacity" |
| `layer-bond` | Structural | "Only 8% overlap with previous layer — weak bond" |
| `seam` | Structural | "Extrusion consistency drops to 45% at seam" |
| `velocity` | Motion | "Requested 150mm/s but max achievable is 89mm/s" |
| `acceleration` | Motion | "Acceleration exceeds printer capability" |

---

## Warp View

Press **W** to switch to warp view. This shows a 3D deformation mesh over the print footprint.

- **Color** indicates thermal warp risk (blue = low, red = high)
- **Z deformation** shows how edges lift relative to the center — edges deform more due to stress concentrations at the part boundary
- **Scale slider** adjusts the deformation exaggeration for visibility (does not change the underlying data)

Warp prediction requires running analysis first. The warp model accounts for:
- Material CTE (coefficient of thermal expansion)
- Glass transition temperature
- Local material density (sparse structures like lattices warp less)
- Distance from part centroid (edges lift more)
- Chamber type (heated chambers reduce warp)

See [Analysis Theory](Analysis-Theory) for the full warp model.

---

## G-code Reference

The Reference tab (key **7**) contains 42 G-code commands with:

- Command name and description
- Parameters with explanations
- Firmware-specific notes (which firmware supports which variant)
- **Click-to-insert** — click any command to insert it into the custom G-code field

Use the search bar to filter commands by name, code, or description.

---

## Firmware Profiles

Select your firmware from the dropdown at the top. This affects pause commands, filament change sequences, and G-code reference entries.

| Feature | Bambu Lab | Klipper | Marlin | RepRapFirmware |
|---|---|---|---|---|
| **Default Pause** | `M400 U1` | `PAUSE` | `M0` | `M226` |
| **Alt Pause** | `M600` | `M600`, `M0` | `M600`, `M25` | `M600`, `M0` |
| **Filament Change** | `M1020` (AMS) | `M600` | `M600` | `M600` |
| **Restores Position** | `M600` | `PAUSE` | `M600` | `M226`, `M600` |
| **AMS Support** | Yes (slots 0-3) | No | No | No |

### Firmware Notes

- **Bambu Lab**: `M400 U1` is the recommended pause command. `M1020 S<slot>` triggers AMS filament changes (slot 0-3).
- **Klipper**: `PAUSE` requires a `[pause_resume]` section in `printer.cfg`. Custom macros can extend pause behavior.
- **Marlin**: `M0` requires `EMERGENCY_PARSER` or LCD for user resume. `M600` requires `ADVANCED_PAUSE_FEATURE` enabled in firmware.
- **RepRapFirmware**: `M226` triggers `pause.g` macro on the SD card. `M600` triggers `filament-change.g`.

---

## Material Selection

Select your filament material before running analysis. The material choice affects:

- **Thermal thresholds** — glass transition temperature, heat deflection temperature
- **Warp prediction** — coefficient of thermal expansion, adhesion coefficient
- **Cooling requirements** — minimum layer time, cooling sensitivity

Available materials: PLA, PETG, ABS, ASA, TPU, PC, PLA-CF, PETG-CF, ABS-GF, ASA-CF, PC-FR, PET-CF, PA-CF, PA6-CF, PA6-GF, PPA-CF, PPS-CF, Nylon

See [Analysis Theory — Material Properties](Analysis-Theory#material-properties-reference) for the full properties table.

---

## Keyboard Shortcuts

Press **?** to show the shortcuts overlay at any time.

| Shortcut | Action |
|---|---|
| `Ctrl+O` | Open file |
| `Ctrl+E` | Export modified G-code |
| `Ctrl+F` | Search (code view) |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Space` | Toggle Code / Visual view |
| `W` | Toggle Warp view |
| `[` or `←` `↓` | Previous layer |
| `]` or `→` `↑` | Next layer |
| `1`–`9` | Switch to tab (Pause, Filament, Eject, Z-Offset, Custom, Inserts, Reference, Recovery, Analysis) |
| `F` | Reset / fit camera |
| `P` | Play / Pause simulation |
| `X` | Toggle cross-section |
| `?` | Show shortcuts overlay |
| `Enter` | Apply parameter edit (edit mode) |
| `Delete` / `Backspace` | Delete selected move (edit mode) |
| `Escape` | Cancel selection (edit mode) |

---

## Browser Compatibility

Requires **WebGL2**. Supported browsers:

| Browser | Minimum Version |
|---|---|
| Chrome | 56+ |
| Firefox | 51+ |
| Edge | 79+ |
| Safari | 15+ |

All processing is client-side — no data is uploaded to any server.

---

## Troubleshooting

### "No layers detected"
Your G-code may use non-standard layer markers. Check that your slicer is in the [supported list](#loading-files). If using PrusaSlicer or OrcaSlicer, make sure binary G-code export is disabled.

### Slow parsing on large files
Files over 200k lines may take several seconds to parse. This is normal — the parser processes asynchronously and shows progress.

### Black or blank 3D view
Your browser may not support WebGL2. Check at [get.webgl.org/webgl2](https://get.webgl.org/webgl2/). Ensure hardware acceleration is enabled in browser settings.

### Analysis takes too long
Reduce the analysis depth slider. Lower depth uses a coarser grid (4mm cells vs 1mm) and completes much faster.

### Modifications not appearing in export
Make sure you have at least one modification in the modification list (bottom of right panel). The export button generates a new file with all listed modifications applied in order.
