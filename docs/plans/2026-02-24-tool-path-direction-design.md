# Tool Path Direction Indication — Design

## Summary

Add chevron-based direction indicators to the 3D viewer so users can see which way the tool path travels. Two modes: chevrons on the selected/hovered move during pause selection, and an optional toggle to show chevrons on all moves of the current layer.

## Chevron Geometry

For a move segment `(x1,y1)→(x2,y2)`:
- Calculate normalized direction vector `(dx, dy)`
- Space chevrons every ~3mm along the segment (skip segments shorter than ~2mm)
- At each chevron point, draw two lines forming a `>` shape:
  - Line 1: from `(point - dir*size + perp*size)` to `point`
  - Line 2: from `(point - dir*size - perp*size)` to `point`
- Chevron arm size: ~0.6mm
- Z offset: draw at `layerZ + 0.15` to sit above the ribbon

## Color

- **Selected/hovered move:** User's highlight color with matching opacity (0.5 hover, 1.0 selected)
- **All-moves mode:** Move's type color, brightened ~20% toward white for contrast against the ribbon

## Rendering Approach

Use the existing line shader — chevrons are pairs of GL_LINES. No new shader programs needed.

## Two Modes

1. **Selected move chevrons** — drawn in `_drawPauseSelectOverlays()`, only during pause select mode
2. **All-moves chevrons** — drawn as a layer-level overlay, toggled via a UI button, using each move's type color

## UI

- New toggle button "Show Direction" in the visual viewer toolbar
- State persisted in `localStorage` as `directionArrowsEnabled`
- Active/inactive styling matching existing toolbar buttons

## Integration Points

- `viewer3d.js`: New `_drawMoveChevrons(move, color, alpha, z)` helper
  - Called from `_drawPauseSelectOverlays()` for selected/hovered moves
  - Called from layer render pass for all-moves mode
- `ui.js`: Toggle button handler, state management
- `index.html`: Button element in toolbar
