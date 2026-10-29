// ===== VORTEK TOOLHEAD HUD =====
// Corner badge showing the active tool (nozzle, filament swatch, filament type).
// Purely presentational: callers pass in the resolved tool, it never reads the parser or viewer.

export const ToolheadHUD = {
  el: null,
  nozzleEl: null,
  swatchEl: null,
  typeEl: null,
  visible: true,
  _last: null,

  init(el) {
    this.el = el || null;
    this._last = null;
    if (el) {
      this.nozzleEl = el.querySelector('.th-nozzle');
      this.swatchEl = el.querySelector('.th-swatch');
      this.typeEl = el.querySelector('.th-type');
      el.addEventListener('animationend', () => el.classList.remove('th-flip'));
    }
    this._render(false);
  },

  // Two tools are the same when they share filament and nozzle (color/type derive from filament).
  toolsEqual(a, b) {
    if (!a || !b) return a === b;
    return a.filament === b.filament && a.nozzle === b.nozzle;
  },

  // Returns true when this call animated: both the previous and new tool exist and differ.
  update(tool) {
    const next = tool || null;
    if (this.toolsEqual(this._last, next)) return false;
    const animate = this._last !== null && next !== null;
    this._last = next;
    this._render(animate);
    return animate;
  },

  setVisible(visible) {
    this.visible = !!visible;
    this._render(false);
  },

  // Forget the current tool (new file loaded) without animating.
  reset() {
    this._last = null;
    this._render(false);
  },

  _render(animate) {
    const el = this.el;
    if (!el) return;
    const tool = this._last;
    if (!tool || !this.visible) {
      el.style.display = 'none';
      return;
    }
    // textContent / style only: color and type originate from the G-code header.
    this.nozzleEl.textContent = tool.nozzle === null ? 'N–' : 'N' + tool.nozzle;
    this.swatchEl.style.background = tool.color;
    this.typeEl.textContent = tool.type;
    el.style.display = 'flex';
    if (animate) {
      el.classList.remove('th-flip');
      void el.offsetWidth; // force reflow so the animation restarts on back-to-back changes
      el.classList.add('th-flip');
    }
  }
};
