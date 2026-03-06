// Right-click context menu for the 3D viewer canvas.

const ContextMenu = {
  _el: null,

  init() {
    this._el = document.createElement('div');
    this._el.className = 'viewer-context-menu';
    this._el.style.display = 'none';
    document.body.appendChild(this._el);

    // Close on any click outside the menu
    document.addEventListener('click', () => this.close());

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  },

  show(x, y, items) {
    // items: [{label, action, disabled?, divider?}]
    this._el.innerHTML = '';
    for (const item of items) {
      if (item.divider) {
        const div = document.createElement('div');
        div.className = 'ctx-divider';
        this._el.appendChild(div);
        continue;
      }
      const row = document.createElement('div');
      row.className = 'ctx-item' + (item.disabled ? ' disabled' : '');
      row.textContent = item.label;
      if (!item.disabled) {
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          this.close();
          item.action();
        });
      }
      this._el.appendChild(row);
    }

    this._el.style.display = '';
    this._el.style.left = x + 'px';
    this._el.style.top = y + 'px';

    // Keep within viewport
    requestAnimationFrame(() => {
      const rect = this._el.getBoundingClientRect();
      if (rect.right > window.innerWidth - 4) {
        this._el.style.left = (x - rect.width) + 'px';
      }
      if (rect.bottom > window.innerHeight - 4) {
        this._el.style.top = (y - rect.height) + 'px';
      }
    });
  },

  close() {
    if (this._el) this._el.style.display = 'none';
  },

  /** Compute point-to-segment distance for a move */
  _distToMove(px, py, move) {
    const dx = move.x2 - move.x1, dy = move.y2 - move.y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - move.x1, py - move.y1);
    let t = ((px - move.x1) * dx + (py - move.y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = move.x1 + t * dx, projY = move.y1 + t * dy;
    return Math.hypot(px - projX, py - projY);
  },

  buildViewerMenu(move, layerNum) {
    const items = [];

    if (move) {
      // Move info header (disabled, just for display)
      const speed = ((move.feedRate || 0) / 60).toFixed(0);
      items.push({ label: (move.type || 'Move') + ' \u2014 ' + speed + ' mm/s', disabled: true });

      // Move actions
      items.push({ label: 'Show in code', action: () => { if (typeof goToLine !== 'undefined') goToLine(move.lineIndex); }});
      items.push({ label: 'Select move (edit mode)', action: () => {
        editMode = true;
        editSelectedMove = move;
        if (typeof showEditInfoPanel !== 'undefined') showEditInfoPanel(move);
        if (viewer) viewer.render(selectedLayer);
      }});
      items.push({ divider: true });
    }

    // Layer actions
    items.push({ label: 'Add pause after layer ' + layerNum, action: () => {
      switchTab('pause');
      const input = document.getElementById('pauseLayer');
      if (input) input.value = layerNum;
    }});
    items.push({ label: 'Add filament change at layer ' + layerNum, action: () => {
      switchTab('filament');
      const input = document.getElementById('filamentLayer');
      if (input) input.value = layerNum;
    }});

    items.push({ divider: true });

    // Measurement actions
    if (typeof MeasureTool !== 'undefined' && MeasureTool.measurements.length > 0) {
      items.push({ label: 'Clear measurements', action: () => {
        MeasureTool.reset();
        if (viewer) viewer.render(selectedLayer);
      }});
    }

    // General actions
    items.push({ label: 'Toggle measurement mode', action: () => {
      if (typeof toggleMeasureMode !== 'undefined') toggleMeasureMode();
    }});
    items.push({ label: 'Fit view', action: () => { if (viewer) viewer.fitBounds(); }});

    return items;
  }
};
