# Modularization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Break `gcode-modifier.html` (4,525-line monolith) into ES modules under `src/`, with a zero-dependency Node build script that produces the same single HTML file at repo root.

**Architecture:** Develop in `src/` using ES module `import`/`export`. A ~30-line `build.js` strips module syntax, concatenates JS in dependency order, and inlines it into `src/index.html` to produce `gcode-modifier.html`. Extract modules least-coupled first, one per PR.

**Tech Stack:** Vanilla JS (ES modules), Node.js (`build.js` + `node --test` for unit tests)

**Design Doc:** `docs/plans/2026-02-22-modularization-design.md`

**Monolith Section Map (gcode-modifier.html):**

| Section | Lines | Target Module |
|---|---|---|
| CSS | 7–288 | `src/index.html` |
| HTML body | 290–627 | `src/index.html` |
| GcodeParser | 630–968 | `src/parser.js` |
| GcodeModifier | 971–1319 | `src/modifier.js` |
| HoleDetector | 1322–1652 | `src/hole-detector.js` |
| InsertManager | 1655–1712 | `src/insert-manager.js` |
| UndoStack | 1715–1743 | `src/undo-stack.js` |
| FIRMWARE profiles | 1746–1826 | `src/firmware.js` |
| GCODE_REFERENCE data | 1829–2253 | `src/firmware.js` |
| Firmware UI + App State + File Handling + Onboard | 2255–2355 | `src/ui.js` + `src/app.js` |
| Bgcode decoder | 2357–2654 | `src/bgcode.js` |
| loadFile + UI functions | 2656–3329 | `src/ui.js` + `src/app.js` |
| GcodeViewer3D | 3333–4138 | `src/viewer3d.js` |
| Remaining UI + Keyboard + Theme | 4142–4522 | `src/ui.js` + `src/app.js` |

---

## Task 1: Create project scaffold

Set up `src/index.html`, `src/app.js`, and `build.js`. After this task, the build pipeline works end-to-end with all JS in a single `app.js`.

**Files:**
- Create: `src/index.html`
- Create: `src/app.js`
- Create: `build.js`
- Modify: `package.json`

### Step 1: Create `src/index.html`

Copy lines 1–627 and 4523–4525 from `gcode-modifier.html`. Replace the `<script>...</script>` block with the placeholder:

```html
<!-- ... everything from <!DOCTYPE html> through the closing </div> on line 626 ... -->

<!-- SCRIPTS -->
</body>
</html>
```

The file should contain: `<!DOCTYPE html>` → `<head>` → `<style>...all CSS...</style>` → `</head>` → `<body>` → all HTML markup → closing `</div>` → `<!-- SCRIPTS -->` → `</body></html>`.

### Step 2: Create `src/app.js`

Copy lines 629–4522 from `gcode-modifier.html` (everything inside the `<script>` tag). No `import`/`export` yet — just the raw JS.

### Step 3: Create `build.js`

```javascript
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');

// Dependency order — modules listed before their dependents
const FILES = [
  'app.js',
];

let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

let js = '';
for (const file of FILES) {
  let code = fs.readFileSync(path.join(SRC, file), 'utf8');
  // Strip ES module import/export lines
  code = code.replace(/^(import|export)\s.+$/gm, '');
  js += code + '\n';
}

html = html.replace('<!-- SCRIPTS -->', '<script>\n' + js + '</script>');
fs.writeFileSync(path.join(__dirname, 'gcode-modifier.html'), html);
console.log('Built gcode-modifier.html');
```

### Step 4: Update `package.json`

Add build script:

```json
{
  "scripts": {
    "build": "node build.js"
  },
  "dependencies": {
    "playwright": "^1.58.2"
  }
}
```

### Step 5: Build and verify

Run: `node build.js`
Expected: "Built gcode-modifier.html" printed. Open the output file in a browser — drop zone, firmware selector, theme toggle, and keyboard shortcuts overlay (`?`) should all work identically to the original.

### Step 6: Commit

```bash
git add src/index.html src/app.js build.js package.json
git commit -m "scaffold: set up src/ directory and build script"
```

---

## Task 2: Extract firmware.js

Pure data constants. Zero dependencies. Easiest extraction.

**Files:**
- Create: `src/firmware.js`
- Modify: `src/app.js` (remove firmware data, add import)
- Modify: `build.js` (add to FILES)

### Step 1: Create `src/firmware.js`

Cut the `FIRMWARE` object (original lines 1746–1826) and `GCODE_REFERENCE` array (original lines 1829–2253) from `src/app.js` into `src/firmware.js`. Add exports:

```javascript
// ===== FIRMWARE PROFILES =====
export const FIRMWARE = {
  bambu: { /* ... entire object ... */ },
  klipper: { /* ... */ },
  marlin: { /* ... */ },
  rrf: { /* ... */ },
};

// ===== G-CODE REFERENCE DATA =====
export const GCODE_REFERENCE = [
  /* ... entire array ... */
];
```

### Step 2: Update `src/app.js`

Remove the `FIRMWARE` and `GCODE_REFERENCE` blocks. Add at top of file:

```javascript
import { FIRMWARE, GCODE_REFERENCE } from './firmware.js';
```

### Step 3: Update `build.js`

```javascript
const FILES = [
  'firmware.js',
  'app.js',
];
```

### Step 4: Build and verify

Run: `node build.js`
Expected: Build succeeds. Open in browser → select each firmware from dropdown → verify pause/filament options update. Open Reference tab → verify all commands render with firmware-specific notes.

### Step 5: Commit

```bash
git add src/firmware.js src/app.js build.js
git commit -m "extract: move FIRMWARE and GCODE_REFERENCE to src/firmware.js"
```

---

## Task 3: Extract bgcode.js

Standalone decoder functions. DOM references for progress bar exist in `decodeBgcode()` but work fine in the built output. Helper functions (`crc32`, `heatshrinkDecode`, `meatpackDecode`) are testable in Node.js.

**Files:**
- Create: `src/bgcode.js`
- Modify: `src/app.js`
- Modify: `build.js`
- Create: `test/bgcode.test.js`

### Step 1: Create `src/bgcode.js`

Cut the bgcode decoder section (original lines 2357–2654) from `src/app.js`: `crc32Table`, `crc32()`, `heatshrinkDecode()`, `deflateDecode()`, `meatpackDecode()`, `decodeBgcode()`. Add exports at bottom:

```javascript
export { crc32, heatshrinkDecode, deflateDecode, meatpackDecode, decodeBgcode };
```

### Step 2: Update `src/app.js`

Remove the bgcode section. Add import:

```javascript
import { decodeBgcode } from './bgcode.js';
```

### Step 3: Update `build.js`

```javascript
const FILES = [
  'firmware.js',
  'bgcode.js',
  'app.js',
];
```

### Step 4: Build and verify

Run: `node build.js`
Expected: Build succeeds. Load `test_cube_0.4n_0.2mm_ABS_COREONEL_1h36m.bgcode` in browser → should decode and display layers.

### Step 5: Write unit test

Create `test/bgcode.test.js`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { crc32, heatshrinkDecode, meatpackDecode } from '../src/bgcode.js';

describe('crc32', () => {
  it('returns 0 for empty buffer', () => {
    assert.strictEqual(crc32(new Uint8Array(0)), 0);
  });

  it('computes correct CRC for known input', () => {
    const buf = new TextEncoder().encode('123456789');
    assert.strictEqual(crc32(buf), 0xCBF43926);
  });
});

describe('heatshrinkDecode', () => {
  it('returns empty for empty input', () => {
    const result = heatshrinkDecode(new Uint8Array(0), 0, 12, 4);
    assert.strictEqual(result.length, 0);
  });
});

describe('meatpackDecode', () => {
  it('passes through unpacked bytes when packing disabled', () => {
    // Without enable-packing command, bytes should pass through as-is
    const input = new Uint8Array([0x47, 0x32, 0x38, 0x0A]); // G28\n
    const result = meatpackDecode(input);
    assert.strictEqual(new TextDecoder().decode(result), 'G28\n');
  });
});
```

### Step 6: Run tests

Run: `node --test test/bgcode.test.js`
Expected: All tests PASS.

### Step 7: Commit

```bash
git add src/bgcode.js src/app.js build.js test/bgcode.test.js
git commit -m "extract: move bgcode decoder to src/bgcode.js with tests"
```

---

## Task 4: Extract undo-stack.js

Tiny standalone class (29 lines). No dependencies.

**Files:**
- Create: `src/undo-stack.js`
- Modify: `src/app.js`
- Modify: `build.js`
- Create: `test/undo-stack.test.js`

### Step 1: Create `src/undo-stack.js`

Cut the `UndoStack` class (original lines 1715–1743) from `src/app.js`:

```javascript
export class UndoStack {
  constructor(maxSize = 50) {
    this.stack = [];
    this.index = -1;
    this.maxSize = maxSize;
  }

  push(state) {
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(JSON.parse(JSON.stringify(state)));
    if (this.stack.length > this.maxSize) this.stack.shift();
    this.index = this.stack.length - 1;
  }

  undo() {
    if (this.index <= 0) return null;
    this.index--;
    return JSON.parse(JSON.stringify(this.stack[this.index]));
  }

  redo() {
    if (this.index >= this.stack.length - 1) return null;
    this.index++;
    return JSON.parse(JSON.stringify(this.stack[this.index]));
  }

  canUndo() { return this.index > 0; }
  canRedo() { return this.index < this.stack.length - 1; }
}
```

### Step 2: Update `src/app.js`

Remove the `UndoStack` class. Add import:

```javascript
import { UndoStack } from './undo-stack.js';
```

### Step 3: Update `build.js`

```javascript
const FILES = [
  'firmware.js',
  'bgcode.js',
  'undo-stack.js',
  'app.js',
];
```

### Step 4: Write unit test

Create `test/undo-stack.test.js`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { UndoStack } from '../src/undo-stack.js';

describe('UndoStack', () => {
  it('starts empty with no undo/redo', () => {
    const stack = new UndoStack();
    assert.strictEqual(stack.canUndo(), false);
    assert.strictEqual(stack.canRedo(), false);
  });

  it('push then undo returns previous state', () => {
    const stack = new UndoStack();
    stack.push({ mods: [] });
    stack.push({ mods: ['a'] });
    assert.strictEqual(stack.canUndo(), true);
    const prev = stack.undo();
    assert.deepStrictEqual(prev, { mods: [] });
  });

  it('redo returns the undone state', () => {
    const stack = new UndoStack();
    stack.push({ x: 1 });
    stack.push({ x: 2 });
    stack.undo();
    const redone = stack.redo();
    assert.deepStrictEqual(redone, { x: 2 });
  });

  it('respects maxSize', () => {
    const stack = new UndoStack(3);
    stack.push('a');
    stack.push('b');
    stack.push('c');
    stack.push('d'); // should evict 'a'
    assert.strictEqual(stack.stack.length, 3);
  });
});
```

### Step 5: Run tests

Run: `node --test test/undo-stack.test.js`
Expected: All tests PASS.

### Step 6: Build and verify

Run: `node build.js`
Expected: Build succeeds. Open in browser, add a modification, press Ctrl+Z → undo works. Ctrl+Shift+Z → redo works.

### Step 7: Commit

```bash
git add src/undo-stack.js src/app.js build.js test/undo-stack.test.js
git commit -m "extract: move UndoStack to src/undo-stack.js with tests"
```

---

## Task 5: Extract insert-manager.js

Small class. **Note:** The current code references global `parser` and `modifier` directly (lines 1665, 1671, 1687). For now, extract as-is — globals work in the built output. Refactoring to pass dependencies as parameters is deferred to a future PR to keep this step small.

**Files:**
- Create: `src/insert-manager.js`
- Modify: `src/app.js`
- Modify: `build.js`

### Step 1: Create `src/insert-manager.js`

Cut the `InsertManager` class (original lines 1655–1712) from `src/app.js`:

```javascript
// Note: references global `parser` and `modifier` — works in built output.
// TODO: refactor to accept dependencies as constructor parameters.
export class InsertManager {
  /* ... entire class as-is ... */
}
```

### Step 2: Update `src/app.js`

Remove the `InsertManager` class. Add import:

```javascript
import { InsertManager } from './insert-manager.js';
```

### Step 3: Update `build.js`

```javascript
const FILES = [
  'firmware.js',
  'bgcode.js',
  'undo-stack.js',
  'insert-manager.js',
  'app.js',
];
```

### Step 4: Build and verify

Run: `node build.js`
Expected: Build succeeds. Open in browser, load a gcode file, go to Inserts tab → Scan All Layers → detect holes → Add Pause for Selected Holes works.

### Step 5: Commit

```bash
git add src/insert-manager.js src/app.js build.js
git commit -m "extract: move InsertManager to src/insert-manager.js"
```

---

## Task 6: Extract hole-detector.js

Standalone class. Takes parser data as method parameters (not global).

**Files:**
- Create: `src/hole-detector.js`
- Modify: `src/app.js`
- Modify: `build.js`

### Step 1: Create `src/hole-detector.js`

Cut the `HoleDetector` class (original lines 1322–1652) from `src/app.js`. Add export:

```javascript
export class HoleDetector {
  /* ... entire class as-is ... */
}
```

### Step 2: Update `src/app.js`

Remove the `HoleDetector` class. Add import:

```javascript
import { HoleDetector } from './hole-detector.js';
```

### Step 3: Update `build.js`

```javascript
const FILES = [
  'firmware.js',
  'bgcode.js',
  'undo-stack.js',
  'insert-manager.js',
  'hole-detector.js',
  'app.js',
];
```

### Step 4: Build and verify

Run: `node build.js`
Expected: Build succeeds. Load `test_cube.gcode` → Inserts tab → Scan All Layers → holes detected with correct diameters, depths, and floor layers.

### Step 5: Commit

```bash
git add src/hole-detector.js src/app.js build.js
git commit -m "extract: move HoleDetector to src/hole-detector.js"
```

---

## Task 7: Extract parser.js

Core class. No dependencies on other modules. Largest pure-logic extraction (~339 lines).

**Files:**
- Create: `src/parser.js`
- Modify: `src/app.js`
- Modify: `build.js`
- Create: `test/parser.test.js`

### Step 1: Create `src/parser.js`

Cut the `GcodeParser` class (original lines 630–968) from `src/app.js`. Add export:

```javascript
export class GcodeParser {
  /* ... entire class as-is ... */
}
```

### Step 2: Update `src/app.js`

Remove the `GcodeParser` class. Add import:

```javascript
import { GcodeParser } from './parser.js';
```

### Step 3: Update `build.js`

```javascript
const FILES = [
  'firmware.js',
  'bgcode.js',
  'undo-stack.js',
  'insert-manager.js',
  'hole-detector.js',
  'parser.js',
  'app.js',
];
```

### Step 4: Write unit test

Create `test/parser.test.js`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GcodeParser } from '../src/parser.js';

describe('GcodeParser', () => {
  it('parses a minimal Cura-style gcode', () => {
    const parser = new GcodeParser();
    const gcode = [
      ';Generated with Cura',
      'G28 ; Home',
      ';LAYER:0',
      'G1 X10 Y10 Z0.2 E1 F1500',
      ';LAYER:1',
      'G1 X20 Y20 Z0.4 E2 F1500',
    ].join('\n');
    parser.parse(gcode);

    assert.strictEqual(parser.layers.length, 2);
    assert.strictEqual(parser.layers[0].number, 0);
    assert.strictEqual(parser.layers[1].number, 1);
  });

  it('detects slicer from header comments', () => {
    const parser = new GcodeParser();
    const gcode = [
      ';Generated with Cura_SteamEngine 5.0',
      ';LAYER:0',
      'G1 X0 Y0 Z0.2 E1',
    ].join('\n');
    parser.parse(gcode);
    assert.match(parser.detectedSlicer || '', /cura/i);
  });

  it('getLayerByNumber returns correct layer', () => {
    const parser = new GcodeParser();
    parser.parse(';LAYER:0\nG1 Z0.2\n;LAYER:1\nG1 Z0.4');
    const layer = parser.getLayerByNumber(1);
    assert.ok(layer);
    assert.strictEqual(layer.number, 1);
  });
});
```

### Step 5: Run tests

Run: `node --test test/parser.test.js`
Expected: All tests PASS.

### Step 6: Build and verify

Run: `node build.js`
Expected: Build succeeds. Load `test_cube.gcode` → 250 layers detected, correct Z-heights, slicer detected as Bambu Studio, 3D viewer renders correctly.

### Step 7: Commit

```bash
git add src/parser.js src/app.js build.js test/parser.test.js
git commit -m "extract: move GcodeParser to src/parser.js with tests"
```

---

## Task 8: Extract modifier.js

The `GcodeModifier` class. Takes parser data as method parameters. ~349 lines.

**Files:**
- Create: `src/modifier.js`
- Modify: `src/app.js`
- Modify: `build.js`
- Create: `test/modifier.test.js`

### Step 1: Create `src/modifier.js`

Cut the `GcodeModifier` class (original lines 971–1319) from `src/app.js`. Add export:

```javascript
export class GcodeModifier {
  /* ... entire class as-is ... */
}
```

### Step 2: Update `src/app.js`

Remove the `GcodeModifier` class. Add import:

```javascript
import { GcodeModifier } from './modifier.js';
```

### Step 3: Update `build.js`

```javascript
const FILES = [
  'firmware.js',
  'bgcode.js',
  'undo-stack.js',
  'insert-manager.js',
  'hole-detector.js',
  'parser.js',
  'modifier.js',
  'app.js',
];
```

### Step 4: Write unit test

Create `test/modifier.test.js`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GcodeModifier } from '../src/modifier.js';

describe('GcodeModifier', () => {
  it('adds and removes a pause modification', () => {
    const mod = new GcodeModifier();
    const pause = mod.addPause(5, 'Test pause', 'M0', false);
    assert.strictEqual(mod.modifications.length, 1);
    assert.strictEqual(pause.layer, 5);
    assert.strictEqual(pause.type, 'pause');

    mod.removeModification(pause.id);
    assert.strictEqual(mod.modifications.length, 0);
  });

  it('adds a z-offset modification', () => {
    const mod = new GcodeModifier();
    const zoff = mod.addZOffset(10, 20, 0.5, 'compensate insert');
    assert.strictEqual(zoff.type, 'zoffset');
    assert.strictEqual(zoff.startLayer, 10);
    assert.strictEqual(zoff.endLayer, 20);
    assert.strictEqual(zoff.offset, 0.5);
  });

  it('prevents duplicate eject modifications', () => {
    const mod = new GcodeModifier();
    mod.addEject({ bedY: 200, headZ: 50, feedRate: 3000 });
    mod.addEject({ bedY: 220, headZ: 60, feedRate: 4000 });
    const ejects = mod.modifications.filter(m => m.type === 'eject');
    assert.strictEqual(ejects.length, 1);
    assert.strictEqual(ejects[0].bedY, 220);
  });
});
```

### Step 5: Run tests

Run: `node --test test/modifier.test.js`
Expected: All tests PASS.

### Step 6: Build and verify

Run: `node build.js`
Expected: Build succeeds. Load file → add pause at layer 5 → add z-offset → export → verify output gcode contains pause and z-offset commands.

### Step 7: Commit

```bash
git add src/modifier.js src/app.js build.js test/modifier.test.js
git commit -m "extract: move GcodeModifier to src/modifier.js with tests"
```

---

## Task 9: Extract viewer3d.js

Standalone WebGL class (~806 lines). Takes canvas ID and parser data. No dependencies on other source modules.

**Files:**
- Create: `src/viewer3d.js`
- Modify: `src/app.js`
- Modify: `build.js`

### Step 1: Create `src/viewer3d.js`

Cut the `GcodeViewer3D` class (original lines 3333–4138) from `src/app.js`. Add export:

```javascript
export class GcodeViewer3D {
  /* ... entire class as-is ... */
}
```

### Step 2: Update `src/app.js`

Remove the `GcodeViewer3D` class. Add import:

```javascript
import { GcodeViewer3D } from './viewer3d.js';
```

### Step 3: Update `build.js`

```javascript
const FILES = [
  'firmware.js',
  'bgcode.js',
  'undo-stack.js',
  'insert-manager.js',
  'hole-detector.js',
  'parser.js',
  'modifier.js',
  'viewer3d.js',
  'app.js',
];
```

### Step 4: Build and verify

Run: `node build.js`
Expected: Build succeeds. Load file → switch to Visual view → 3D rendering works with orbit/pan/zoom, layer slider, modification markers, extrusion type colors. Measurement tool works.

### Step 5: Commit

```bash
git add src/viewer3d.js src/app.js build.js
git commit -m "extract: move GcodeViewer3D to src/viewer3d.js"
```

---

## Task 10: Split remaining code into ui.js and app.js

This is the most complex extraction. What remains in `src/app.js` at this point is a mix of UI rendering functions and app initialization/state. Split into:

- **`src/ui.js`**: All UI rendering and interaction functions (firmware UI, tabs, toasts, layer list, modification list, hole detection UI, reference rendering, shortcuts overlay, code/visual view toggling)
- **`src/app.js`**: App state variables, global instantiation, file handling, `loadFile()`, event wiring, theme, onboarding

**Splitting heuristic:** Functions that render to DOM or respond to user clicks → `ui.js`. State variables, instance creation, and `loadFile()` → `app.js`.

**Files:**
- Create: `src/ui.js`
- Modify: `src/app.js`
- Modify: `build.js`

### Step 1: Identify the split boundary

Read through the remaining `src/app.js` and categorize each function/block:

**Goes to `src/ui.js`:**
- `onFirmwareChange()`, `renderRadioGroup()`
- `toggleMeasureMode()`
- `showToast()`, `switchTab()`, `setView()`
- `renderLayerList()`, `selectLayer()`, `updateLayerBadges()`
- `renderModList()`, `renderModBanners()`
- `renderReference()`, `renderRefSearch()`
- `toggleHoleMode()`, `detectHolesOnLayer()`, `scanAllLayers()`, `renderHoleList()`
- `toggleShortcutsOverlay()`
- `showOnboardHint()`
- All other DOM-rendering helper functions

**Stays in `src/app.js`:**
- Instance creation: `const parser = new GcodeParser()` etc.
- `const viewer = new GcodeViewer3D('viewerCanvas')`
- State variables: `selectedLayer`, `holeDetectMode`, `measureMode`, `currentView`, `currentFirmware`
- `loadFile()`
- File drop/input event wiring
- Keyboard event listener
- Theme functions: `getPreferredTheme()`, `applyTheme()`, `toggleTheme()`
- `onFirmwareChange('bambu')` initialization call
- `applyTheme(getPreferredTheme())` initialization call

### Step 2: Create `src/ui.js`

Move all UI functions to `src/ui.js`. No explicit imports needed — these functions reference globals (`parser`, `modifier`, `viewer`, etc.) that are created in `app.js`. In the built output, everything is in one scope so globals work. Add a descriptive comment at top:

```javascript
// UI rendering and interaction functions.
// These reference globals (parser, modifier, viewer, etc.) created in app.js.
// In the built single-file output, everything shares one scope.

/* ... all UI functions ... */
```

No `export` needed since `app.js` calls these via global scope in the built output and via direct reference in development. If specific functions are needed as exports for testing, add them selectively.

### Step 3: Update `src/app.js`

Only app state, instantiation, file handling, event wiring, and theme remain. Add import:

```javascript
import './ui.js';
```

### Step 4: Update `build.js`

```javascript
const FILES = [
  'firmware.js',
  'bgcode.js',
  'undo-stack.js',
  'insert-manager.js',
  'hole-detector.js',
  'parser.js',
  'modifier.js',
  'viewer3d.js',
  'ui.js',
  'app.js',
];
```

### Step 5: Build and verify

Run: `node build.js`
Expected: Build succeeds. Full end-to-end test:
1. Open in browser
2. Toggle theme (light/dark)
3. Change firmware dropdown
4. Load `test_cube.gcode`
5. Browse layers, switch Code/Visual views
6. Add a pause modification
7. Open Reference tab, search for G28
8. Open Inserts tab, Scan All Layers
9. Export modified gcode
10. Press `?` for shortcuts overlay

All features should work identically.

### Step 6: Commit

```bash
git add src/ui.js src/app.js build.js
git commit -m "extract: split remaining code into src/ui.js and src/app.js"
```

---

## Task 11: Add CI build verification

Add a GitHub Action that runs `node build.js` on push and verifies the committed `gcode-modifier.html` matches the build output.

**Files:**
- Create: `.github/workflows/build.yml`

### Step 1: Create workflow file

```yaml
name: Build
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: node build.js
      - name: Verify built file is up to date
        run: |
          if git diff --exit-code gcode-modifier.html; then
            echo "Build output is up to date."
          else
            echo "ERROR: gcode-modifier.html is stale. Run 'node build.js' and commit the output."
            exit 1
          fi
      - name: Run tests
        run: node --test test/
```

### Step 2: Verify locally

Run: `node build.js && git diff gcode-modifier.html`
Expected: No diff (build output matches committed file).

Run: `node --test test/`
Expected: All unit tests pass.

### Step 3: Commit

```bash
git add .github/workflows/build.yml
git commit -m "ci: add build verification and test workflow"
```

---

## Summary

| Task | Module | Lines | Has Tests | Risk |
|---|---|---|---|---|
| 1 | scaffold | — | — | Low |
| 2 | firmware.js | ~508 | No (pure data) | Low |
| 3 | bgcode.js | ~298 | Yes | Low |
| 4 | undo-stack.js | ~29 | Yes | Low |
| 5 | insert-manager.js | ~58 | No (global deps) | Low |
| 6 | hole-detector.js | ~331 | No (complex deps) | Low |
| 7 | parser.js | ~339 | Yes | Medium |
| 8 | modifier.js | ~349 | Yes | Medium |
| 9 | viewer3d.js | ~806 | No (WebGL) | Low |
| 10 | ui.js + app.js | ~remainder | No (DOM) | High |
| 11 | CI | — | — | Low |

**Total:** 11 tasks, 4 with unit tests, each independently committable and revertible.
