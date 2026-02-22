# Modularization Design: Breaking the Monolith

**Date:** 2026-02-22
**Status:** Approved

## Problem

`gcode-modifier.html` is a 4,525-line single file containing all CSS, HTML, and JS. This makes it hard to navigate, review PRs, enable contributors, and write tests.

## Constraints

- **Zero-build for end users.** Non-technical users must be able to clone the repo and double-click `gcode-modifier.html` to use the tool. The built single-file must always be committed at the repo root.
- **Works on `file://` and GitHub Pages.** Both local and hosted usage must work.
- **Incremental migration.** Each step is a small, revertible PR.

## Approach: Hybrid Module Development + Single-File Build

Develop using ES modules in `src/`. A zero-dependency Node build script (`build.js`) inlines all JS back into a single HTML file at the repo root.

### File Structure

```
Gcode/
  src/
    index.html          # HTML markup + CSS (template with <!-- SCRIPTS --> placeholder)
    parser.js            # GcodeParser class
    modifier.js          # GcodeModifier class
    hole-detector.js     # HoleDetector class
    insert-manager.js    # InsertManager class
    undo-stack.js        # UndoStack class
    viewer3d.js          # GcodeViewer3D class
    bgcode.js            # CRC32, Heatshrink, MeatPack, decodeBgcode()
    firmware.js          # Firmware profiles + G-code reference data
    ui.js                # All UI functions (tabs, toasts, mods, layer list, etc.)
    app.js               # App init, state, event wiring, file handling
  build.js               # Node script: inline src/*.js into single HTML
  gcode-modifier.html    # Built output at repo root (same location as today)
  test/                  # Unit tests (import from src/ directly)
  package.json
```

### Build Script (`build.js`)

A ~30-line Node script with zero npm dependencies:

1. Read `src/index.html` as template
2. For each `src/*.js` in dependency order: strip `import`/`export` lines, collect raw JS
3. Concatenate all JS
4. Replace `<!-- SCRIPTS -->` placeholder with a single `<script>` block
5. Write `gcode-modifier.html` at repo root

Run with: `node build.js`

### CI Integration

A GitHub Action runs `node build.js` on push and either auto-commits the output or fails the PR if the committed built file is stale.

### Module Boundaries

Each module exports one or more classes/functions. Dependency graph:

```
app.js  ->  parser, modifier, viewer3d, bgcode, ui
ui.js   ->  parser, modifier, hole-detector, insert-manager, undo-stack, firmware
modifier.js  ->  (standalone, takes parser as argument)
parser.js    ->  (standalone)
bgcode.js    ->  (standalone)
viewer3d.js  ->  (standalone, takes canvas + parser data)
hole-detector.js  ->  (standalone, takes parser data)
firmware.js  ->  (standalone data)
insert-manager.js ->  (standalone)
undo-stack.js     ->  (standalone)
```

Key: classes are already self-contained in the monolith. They take `parser` as a parameter rather than reaching for globals.

### Migration Order

Extract one module per PR, least coupled first:

1. **firmware.js** - Pure data, zero dependencies
2. **bgcode.js** - Standalone decoder functions
3. **undo-stack.js** - Tiny standalone class
4. **insert-manager.js** - Small standalone class
5. **hole-detector.js** - Standalone class
6. **parser.js** - Core class, no dependencies
7. **modifier.js** - Depends only on parser interface
8. **viewer3d.js** - Standalone WebGL class
9. **ui.js** - All remaining UI functions
10. **app.js** - Entry point, state, event wiring

Each step: extract to `src/`, update `src/index.html`, rebuild, verify identical behavior.

### Testing

Source modules in `src/` use standard ES module exports, making them directly importable by Node.js test runners (e.g., `node --test`). Tests live in `test/` and can run without a browser for pure logic (parser, modifier, bgcode, etc.).
