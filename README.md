# G-Code Modifier

A browser-based G-code editor for 3D printing. Load a `.gcode` file, visually inspect layers in 3D, add modifications (pauses, filament changes, Z-offsets, custom commands), measure distances, detect holes for insert placement, and export the modified file — all without installing anything.

![Empty State](screenshots/01-empty-state.png)

## Getting Started

Open `gcode-modifier.html` in any modern browser (WebGL2 required). No server, build step, or dependencies required.

1. **Select your firmware** from the dropdown (Bambu Lab, Klipper, Marlin, or RepRapFirmware). This determines which pause and filament-change commands are available.
2. **Load a file** by dragging a `.gcode` / `.gco` / `.g` file onto the drop zone, or click to browse.
3. **Browse layers** in the left panel, add modifications in the right panel.
4. **Export** the modified file with the "Export G-Code" button. The output is saved as `<original-name>_modified.gcode`.

## Interface Layout

The app uses a three-panel layout: layer navigator on the left, code/visual preview in the center, and modification tools on the right. On mobile (< 800px), the layout switches to a vertical stack with a collapsible layer drawer.

![Interface Layout](screenshots/04-modification-added.png)

### Left Panel — Layer Navigator

- Lists every layer detected in the file with layer number, Z-height, and line count.
- Orange dot badges indicate layers that have pending modifications.
- Search/filter box at the top to quickly find a layer.
- Click a layer to select it; the center preview and tool inputs update automatically.
- Collapses into a slide-out drawer on narrow viewports (hamburger button in header).

### Center Panel — Preview

Toggle between two views using the **Code** / **Visual** buttons:

**Code View**
- Syntax-highlighted G-code with line numbers.
- Shows the selected layer's lines plus a few lines of surrounding context.
- Modified lines are highlighted in orange at the bottom of the preview.
- Syntax coloring: G-commands (blue), M-commands (green), parameters (purple), values (yellow), comments (gray).

![Code View](screenshots/02-code-view.png)

**Visual View (3D)**
- WebGL 3D rendering of the print with stacked layers building up from the bed.
- Color-coded by extrusion type (outer wall, inner wall, infill, support, overhang, etc.).
- Travel moves shown as gray lines on the current layer.
- Lower layers rendered at reduced opacity; current layer is fully opaque.
- 10mm bed grid for spatial reference.
- Modification markers: colored translucent planes at modification Z-heights (yellow=pause, purple=filament, orange=z-offset, cyan=custom).
- Interactive 3D camera controls:
  - **Left-drag**: orbit (rotate around model).
  - **Right/middle-drag**: pan.
  - **Scroll wheel**: zoom in/out.
  - **Touch**: one-finger orbit, two-finger pan, pinch zoom.
  - **F key**: reset camera to default view.
- Layer slider at the bottom for quick layer scrubbing (cumulative — layers build up).
- Modification banners appear at the top when the current layer has queued modifications.

![3D Visual View](screenshots/03-visual-view.png)

## Slicer Compatibility

The parser auto-detects the slicer from file header comments and adapts its parsing accordingly. The detected slicer is shown in the file info bar.

| Slicer | Layer Format | Type Markers | Status |
|---|---|---|---|
| **Cura** | `;LAYER:N` | `;TYPE:Outer Wall` | Fully supported |
| **Bambu Studio** | `; CHANGE_LAYER` + `; Z_HEIGHT` | `; FEATURE: Outer Wall` | Fully supported |
| **PrusaSlicer** | `;LAYER_CHANGE` + `;Z:X.XX` or `;LAYER:N` | `;TYPE:External perimeter` | Fully supported |
| **SuperSlicer** | Same as PrusaSlicer | Same as PrusaSlicer | Fully supported |
| **OrcaSlicer** | Both Bambu and PrusaSlicer formats | Both formats | Fully supported |
| **Simplify3D** | `; layer N, Z = X.XX` | `; outer perimeter`, `; infill` | Fully supported |
| **ideaMaker** | `;LAYER:N` | Standard markers | Supported |
| **Unknown** | Falls back to `;LAYER:N` heuristic | Generic | Best-effort |

## Firmware Profiles

Each firmware profile provides the correct pause commands, filament change commands, and relevant hints.

| Firmware | Pause Commands | Filament Change | Notes |
|---|---|---|---|
| **Bambu Lab** | `M400 U1` (recommended), `M600` | `M1020` (AMS slot change), `M600` | AMS slot selector enabled |
| **Klipper** | `PAUSE` macro, `M600`, `M0` | `M600` | Requires macros in `printer.cfg` |
| **Marlin** | `M0`, `M600`, `M25` (SD pause) | `M600` | Requires `ADVANCED_PAUSE_FEATURE` |
| **RepRapFirmware** | `M226`, `M600`, `M0` | `M600` | Uses `pause.g` / `filament-change.g` macros |

## Modification Tools

### Pause

Insert a pause at a specific layer. Useful for embedding magnets, nuts, or swapping colors manually.

- **Layer Number**: which layer to pause before.
- **Reminder Message** (optional): appears as a G-code comment (e.g., "Insert magnet here").
- **Pause Command**: firmware-specific (auto-populated from the selected firmware profile).
- **Move head away**: when enabled, the nozzle lifts 5mm in Z and moves to the front-left corner before pausing, preventing heat damage to the print.

Generated G-code snippet example:
```gcode
; === PAUSE: Insert magnet here ===
G91 ; Relative positioning
G1 Z5 F600 ; Lift Z
G90 ; Absolute positioning
G1 X5 Y5 F6000 ; Move head to front-left
M400 U1 ; Bambu pause
; === END PAUSE ===
```

![Pause Modification in Visual View](screenshots/05-visual-with-mod.png)

### Filament Change

Trigger a filament swap at a specific layer.

- **Layer Number**: target layer.
- **Filament Slot (AMS)**: only shown for Bambu Lab — selects which AMS slot (1–4) to switch to.
- **Command**: `M1020` for Bambu AMS changes, `M600` for standard filament change on other firmwares.

![Filament Change Tab](screenshots/06-filament-tab.png)

### Eject

Append an auto-eject sequence to the end of the G-code. Only one eject modification is allowed at a time (adding a new one replaces the previous).

- **Bed Y Position**: how far forward to push the bed (mm).
- **Head Z Clearance**: how high to raise the nozzle (mm).
- **Feed Rate**: movement speed in mm/min.
- **Turn off heaters**: disables hotend and bed heaters after eject.
- **Home Z axis**: homes the Z axis after ejecting.
- **Loop mode**: adds a comment noting that the print should restart (actual looping requires external automation or firmware support).

### Z-Offset

Apply a vertical offset to all Z moves within a layer range. Useful for compensating for embedded inserts that change the effective layer height.

- **Start Layer**: first layer to offset.
- **End Layer** (optional): last layer to offset. If blank, the offset applies from the start layer through the end of the print.
- **Z-Offset (mm)**: positive values raise the nozzle, negative values lower it. All `G0`/`G1`/`G2`/`G3` commands containing a Z parameter within the range are adjusted.
- **Note** (optional): descriptive label that appears in the G-code comment.

![Z-Offset Tab](screenshots/07-zoffset-tab.png)

### Custom G-Code

Insert arbitrary G-code at a specific layer or at the end of the file.

- **Layer Number**: enter a layer number, or `end` to append at the file's end.
- **Custom G-Code**: multi-line textarea — each line is inserted as-is, wrapped in `; === CUSTOM G-CODE ===` / `; === END CUSTOM ===` comment markers.

### Inserts (Hole Detection)

Automatically detect holes in the print and calculate the correct pause layer for placing physical inserts (magnets, threaded inserts, etc.).

**Workflow:**

1. Select a layer in the visual view where holes are visible (typically the top of the cavity).
2. Click **Detect Holes**. The tool rasterizes the layer's toolpaths onto a grid and uses flood-fill to identify enclosed empty regions.
3. Detected holes appear in the list with diameter, area, depth, and floor layer.
4. Configure the insert: height (mm or layers), diameter, label, pause command.
5. The tool automatically calculates which layer to pause at based on the hole's floor layer + insert height.
6. Click **Add Pause for Selected Holes** to queue the modifications.

**Detection settings:**
- **Min diameter**: filter out holes smaller than this (range: 1–20mm).
- **Ignore infill regions**: exclude infill patterns from the analysis so only wall-enclosed holes are detected.

### Measurement Tool

Measure point-to-point distance on the current layer.

1. Click the **Measure** button in the toolbar.
2. Click two points on the 3D view — crosshair markers appear and a line is drawn between them.
3. The distance in mm is shown as a toast notification.
4. Click again to start a new measurement.

## Undo / Redo

All modification changes (add, remove, reorder) are tracked in an undo stack (up to 50 entries).

- **Ctrl+Z** / **Cmd+Z**: undo the last change.
- **Ctrl+Shift+Z** / **Ctrl+Y**: redo.

## Modifications List

All queued modifications appear in the bottom section of the right panel.

- **Drag to reorder**: drag modification items to change insertion priority for modifications on the same layer.
- **Delete**: remove a modification with the X button.
- **Counter badge**: shows the total number of active modifications.
- Modifications are applied bottom-up (highest layer number first) during export to avoid line-offset issues.

## Theme

Toggle between dark and light themes using the sun/moon button in the header. The theme is saved to localStorage and defaults to your system preference.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+O` | Open file |
| `Ctrl+E` | Export |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Space` | Toggle Code/Visual view |
| `[` / `]` | Previous/Next layer |
| Arrow keys | Previous/Next layer |
| `1`–`6` | Switch tool tab |
| `F` | Reset camera |
| `?` | Show keyboard shortcuts help |

Press `?` at any time to see the shortcuts overlay.

## Large File Support

Files over 50,000 lines are parsed asynchronously in chunks with a progress bar, keeping the browser responsive during parsing.

## G-Code Parser

The parser supports multiple layer marker formats:

- **Standard** (Cura, PrusaSlicer, etc.): `;LAYER:N`
- **Bambu Studio**: `; CHANGE_LAYER` + `; Z_HEIGHT: X.X` + `; layer num/total_layer_count: N/M`
- **PrusaSlicer**: `;LAYER_CHANGE` + `;Z:X.XX`
- **Simplify3D**: `; layer N, Z = X.XX`

It also recognizes extrusion type markers from all supported slicers and normalizes them to standard categories (WALL-OUTER, WALL-INNER, FILL, SUPPORT, etc.).

Supported move commands: `G0`/`G1` (linear), `G2`/`G3` (arc — approximated as line segments for visual rendering). Extrusion mode tracking handles both absolute (`M82`) and relative (`M83`) E-axis modes.

Malformed lines are gracefully skipped with a warning count shown after parsing.

## Browser Compatibility

Requires a modern browser with WebGL2 support (Chrome 56+, Firefox 51+, Edge 79+, Safari 15+). No external dependencies — the entire application is a single self-contained HTML file. All processing happens client-side; no data is uploaded anywhere.
