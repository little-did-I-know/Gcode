const Insights = {
  items: [],
  _dismissed: {},

  generate(parserRef, diagnosticsRef) {
    this.items = [];

    // File key for tracking dismissed items
    const fileKey = parserRef.lines.length + '_' + parserRef.layers.length;

    // Load dismissed state
    try { this._dismissed = JSON.parse(localStorage.getItem('gcode_dismissed_insights') || '{}'); } catch(e) { this._dismissed = {}; }

    // Pull from diagnostics
    for (const w of diagnosticsRef.warnings) {
      if (this._dismissed[fileKey + ':' + w.id]) continue;
      this.items.push({
        id: w.id,
        category: w.category,
        severity: w.severity,
        message: w.message,
        action: w.action
      });
    }

    // Smart suggestions
    this._addSuggestions(parserRef, fileKey);
    this._addTips(fileKey);

    // Sort: critical > warning > info
    const order = { critical: 0, warning: 1, info: 2 };
    this.items.sort((a, b) => (order[a.severity] || 2) - (order[b.severity] || 2));

    // Cap at 10
    if (this.items.length > 10) this.items.length = 10;
  },

  _addSuggestions(parserRef, fileKey) {
    // No pauses suggestion
    if (typeof modifier !== 'undefined') {
      const hasPauses = modifier.modifications.some(m => m.type === 'pause');
      if (!hasPauses && !this._dismissed[fileKey + ':suggest-pause']) {
        this.items.push({
          id: 'suggest-pause',
          category: 'Suggestion',
          severity: 'info',
          message: 'No pauses set \u2014 need to insert hardware or change filament?',
          action: { type: 'navigate', label: 'Add pause', fn: () => switchTab('pause') }
        });
      }
    }

    // Large print recovery suggestion
    if (parserRef.layers.length > 200 && !this._dismissed[fileKey + ':suggest-recovery']) {
      this.items.push({
        id: 'suggest-recovery',
        category: 'Suggestion',
        severity: 'info',
        message: parserRef.layers.length + ' layers \u2014 consider setting up print recovery',
        action: { type: 'navigate', label: 'Set up', fn: () => switchTab('recovery') }
      });
    }
  },

  _addTips(fileKey) {
    if (!localStorage.getItem('gcode_measure_used') && !this._dismissed[fileKey + ':tip-measure']) {
      this.items.push({
        id: 'tip-measure',
        category: 'Tip',
        severity: 'info',
        message: 'Try measurement mode (M) to verify part dimensions',
        action: { type: 'navigate', label: 'Try it', fn: () => {
          measureMode = true;
          localStorage.setItem('gcode_measure_used', '1');
          showToast('Measurement mode ON \u2014 click to place points');
          if (typeof viewer !== 'undefined' && viewer) viewer.render(selectedLayer);
        }}
      });
    }
  },

  dismiss(id) {
    this.items = this.items.filter(i => i.id !== id);
    const fileKey = parser.lines.length + '_' + parser.layers.length;
    this._dismissed[fileKey + ':' + id] = true;
    try { localStorage.setItem('gcode_dismissed_insights', JSON.stringify(this._dismissed)); } catch(e) {}
  },

  dismissAll() {
    const fileKey = parser.lines.length + '_' + parser.layers.length;
    for (const item of this.items) {
      this._dismissed[fileKey + ':' + item.id] = true;
    }
    this.items = [];
    try { localStorage.setItem('gcode_dismissed_insights', JSON.stringify(this._dismissed)); } catch(e) {}
  }
};
