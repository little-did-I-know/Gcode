# Tool Path Direction Chevrons — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add chevron-based direction indicators along tool path moves, shown on selected/hovered moves during pause select and optionally on all moves via a toggle button.

**Architecture:** A new `_drawMoveChevrons(move, color, alpha, z)` method on GcodeViewer3D generates `>` shaped line pairs at regular intervals along a move segment, using the existing line shader. A `_drawLayerChevrons(mvp)` method renders chevrons for all extrusion moves on the current layer when the toggle is active. A UI toggle button controls the all-moves mode, with state persisted in localStorage.

**Tech Stack:** WebGL2 (line shader), vanilla JS, existing CSS patterns

---

### Task 1: Add `_drawMoveChevrons` method to GcodeViewer3D

**Files:**
- Modify: `src/viewer3d.js:690-735` (after `_drawMoveHighlight`, before `_hexToRgb`)

**Step 1: Add the `_drawMoveChevrons` method**

Insert this new method after `_drawMoveHighlight` (after line 735):

```javascript
_drawMoveChevrons(mvp, move, color, alpha, z) {
  const gl = this.gl;
  const c = [...color.slice(0, 3), alpha];
  const dx = move.x2 - move.x1, dy = move.y2 - move.y1;
  const len = Math.hypot(dx, dy);
  if (len < 2.0) return; // Skip very short segments

  // Normalized direction and perpendicular
  const ndx = dx / len, ndy = dy / len;
  const armLen = 0.6; // chevron arm length in mm
  const spacing = 3.0; // mm between chevrons

  const verts = [];
  const count = Math.floor(len / spacing);
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const px = move.x1 + dx * t;
    const py = move.y1 + dy * t;

    // Two lines forming a > shape pointing in travel direction
    // Back-left to tip
    verts.push(
      px - ndx * armLen + ndy * armLen, py - ndy * armLen - ndx * armLen, z, ...c,
      px, py, z, ...c,
    );
    // Back-right to tip
    verts.push(
      px - ndx * armLen - ndy * armLen, py - ndy * armLen + ndx * armLen, z, ...c,
      px, py, z, ...c,
    );
  }

  if (verts.length === 0) return;
  const data = new Float32Array(verts);
  const stride = 7 * 4;
  gl.useProgram(this.lineProg);
  gl.uniformMatrix4fv(this.line_u_mvp, false, mvp);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
  gl.enableVertexAttribArray(this.line_a_pos);
  gl.vertexAttribPointer(this.line_a_pos, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(this.line_a_color);
  gl.vertexAttribPointer(this.line_a_color, 4, gl.FLOAT, false, stride, 12);
  gl.drawArrays(gl.LINES, 0, verts.length / 7);
  gl.deleteBuffer(vbo);
}
```

**Step 2: Verify no syntax errors by loading the page**

Open the app in a browser and check the console for errors.

**Step 3: Commit**

```bash
git add src/viewer3d.js
git commit -m "feat: add _drawMoveChevrons method for direction indicators"
```

---

### Task 2: Draw chevrons on hovered/selected move during pause select

**Files:**
- Modify: `src/viewer3d.js:744-757` (`_drawPauseSelectOverlays`)

**Step 1: Add chevron drawing calls to `_drawPauseSelectOverlays`**

Update `_drawPauseSelectOverlays` to call `_drawMoveChevrons` after each highlight:

```javascript
_drawPauseSelectOverlays(mvp) {
  if (!pauseSelectMode) return;
  const color = this._hexToRgb(highlightColor);
  const layer = parser.getLayerByNumber(this.currentLayer);
  const z = (layer?.zHeight || 0) + 0.15;

  // Draw hovered move (preview — dimmer, thinner)
  if (hoveredMove && hoveredMove !== selectedMove) {
    this._drawMoveHighlight(mvp, hoveredMove, color, 0.5, 0.2, 1.0);
    this._drawMoveChevrons(mvp, hoveredMove, color, 0.5, z);
  }

  // Draw selected move (bold — full opacity, thicker)
  if (selectedMove) {
    this._drawMoveHighlight(mvp, selectedMove, color, 1.0, 0.3, 1.5);
    this._drawMoveChevrons(mvp, selectedMove, color, 1.0, z);
  }
}
```

**Step 2: Test manually**

1. Load a gcode file
2. Switch to visual view
3. Click "Pause Select"
4. Hover over extrusion moves — chevrons should appear along the hovered segment
5. Click to select — chevrons should appear at full opacity

**Step 3: Commit**

```bash
git add src/viewer3d.js
git commit -m "feat: show direction chevrons on hovered/selected pause move"
```

---

### Task 3: Add `_drawLayerChevrons` for all-moves mode

**Files:**
- Modify: `src/viewer3d.js` (new method, and call from `render`)

**Step 1: Add `_drawLayerChevrons` method**

Insert after `_drawMoveChevrons`:

```javascript
_drawLayerChevrons(mvp) {
  if (!this.showDirectionArrows) return;
  const moves = parser.layerMoves[this.currentLayer];
  if (!moves || moves.length === 0) return;

  const layer = parser.getLayerByNumber(this.currentLayer);
  const z = (layer?.zHeight || 0) + 0.15;

  const gl = this.gl;
  const verts = [];
  const armLen = 0.6;
  const spacing = 3.0;

  for (const move of moves) {
    if (!move.extrude) continue;
    const dx = move.x2 - move.x1, dy = move.y2 - move.y1;
    const len = Math.hypot(dx, dy);
    if (len < 2.0) continue;

    const ndx = dx / len, ndy = dy / len;
    // Brighten type color ~20% toward white for contrast
    const base = this._getTypeColor(move.type);
    const c = [
      Math.min(1.0, base[0] + (1.0 - base[0]) * 0.2),
      Math.min(1.0, base[1] + (1.0 - base[1]) * 0.2),
      Math.min(1.0, base[2] + (1.0 - base[2]) * 0.2),
      0.85,
    ];

    const count = Math.floor(len / spacing);
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const px = move.x1 + dx * t;
      const py = move.y1 + dy * t;

      verts.push(
        px - ndx * armLen + ndy * armLen, py - ndy * armLen - ndx * armLen, z, ...c,
        px, py, z, ...c,
      );
      verts.push(
        px - ndx * armLen - ndy * armLen, py - ndy * armLen + ndx * armLen, z, ...c,
        px, py, z, ...c,
      );
    }
  }

  if (verts.length === 0) return;
  const data = new Float32Array(verts);
  const stride = 7 * 4;
  gl.useProgram(this.lineProg);
  gl.uniformMatrix4fv(this.line_u_mvp, false, mvp);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
  gl.enableVertexAttribArray(this.line_a_pos);
  gl.vertexAttribPointer(this.line_a_pos, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(this.line_a_color);
  gl.vertexAttribPointer(this.line_a_color, 4, gl.FLOAT, false, stride, 12);
  gl.drawArrays(gl.LINES, 0, verts.length / 7);
  gl.deleteBuffer(vbo);
}
```

**Step 2: Initialize property in constructor**

In the constructor (around line 16), add:

```javascript
this.showDirectionArrows = localStorage.getItem('gcode_direction_arrows') === 'true';
```

**Step 3: Call `_drawLayerChevrons` from `render`**

In the `render` method, after `_drawPauseSelectOverlays(mvp)` (line 462), add:

```javascript
this._drawLayerChevrons(mvp);
```

**Step 4: Test manually**

Set `viewer.showDirectionArrows = true` in the browser console, re-render — all extrusion moves on the current layer should show brightened chevrons.

**Step 5: Commit**

```bash
git add src/viewer3d.js
git commit -m "feat: add all-moves direction chevron rendering"
```

---

### Task 4: Add UI toggle button

**Files:**
- Modify: `src/index.html:415` (toolbar area)
- Modify: `src/ui.js` (new toggle function)
- Modify: `src/app.js` (no change needed — viewer instance handles state)

**Step 1: Add button to toolbar in index.html**

After the Pause Select button (line 415), add:

```html
<button class="hole-detect-btn" id="directionToggle" onclick="toggleDirectionArrows()" title="Show tool path direction">Direction</button>
```

**Step 2: Add toggle function to ui.js**

After the `togglePauseSelectMode` function (after line 78):

```javascript
function toggleDirectionArrows() {
  viewer.showDirectionArrows = !viewer.showDirectionArrows;
  localStorage.setItem('gcode_direction_arrows', viewer.showDirectionArrows);
  document.getElementById('directionToggle').classList.toggle('active', viewer.showDirectionArrows);
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}
```

**Step 3: Initialize button state on file load**

In ui.js, find where the viewer is first rendered after file load (the `renderCurrentView` or equivalent setup). The button active state should be set from `viewer.showDirectionArrows` on page load. Add to the end of the `toggleDirectionArrows` function or as a one-time init:

In `src/app.js`, after the viewer is created, add initialization of the button state:

```javascript
// After viewer is created, sync direction toggle button state
if (viewer.showDirectionArrows) {
  document.getElementById('directionToggle').classList.add('active');
}
```

**Step 4: Test manually**

1. Load a gcode file, switch to visual view
2. Click "Direction" button — should highlight as active, chevrons appear on current layer
3. Click again — deactivates, chevrons disappear
4. Refresh page — state should persist from localStorage

**Step 5: Commit**

```bash
git add src/viewer3d.js src/ui.js src/index.html src/app.js
git commit -m "feat: add Direction toggle button to toolbar"
```
