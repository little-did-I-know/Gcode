const CommandPalette = {
  _commands: [],
  _selectedIndex: 0,
  _visible: false,
  _recentIds: [],

  register(commands) {
    // commands: [{id, label, category, shortcut, action, condition}]
    this._commands = this._commands.concat(commands);
    // Load recent from localStorage
    try {
      this._recentIds = JSON.parse(localStorage.getItem('gcode_recent_commands') || '[]');
    } catch(e) { this._recentIds = []; }
  },

  toggle() {
    this._visible ? this.close() : this.open();
  },

  open() {
    this._visible = true;
    this._selectedIndex = 0;
    const overlay = document.getElementById('commandPalette');
    const input = document.getElementById('cmdPaletteInput');
    if (!overlay || !input) return;
    overlay.style.display = '';
    input.value = '';
    input.focus();
    this._render(''); // show recent/all

    // Close on overlay background click
    overlay.onclick = (e) => { if (e.target === overlay) this.close(); };

    // Key handling
    input.onkeydown = (e) => this._onKey(e);
    input.oninput = () => this._render(input.value);
  },

  close() {
    this._visible = false;
    const overlay = document.getElementById('commandPalette');
    if (overlay) overlay.style.display = 'none';
  },

  _filter(query) {
    let cmds = this._commands.filter(c => !c.condition || c.condition());

    if (!query) {
      // Show recent first, then all
      const recent = [];
      const rest = [];
      for (const cmd of cmds) {
        if (this._recentIds.includes(cmd.id)) recent.push(cmd);
        else rest.push(cmd);
      }
      // Sort recent by recency
      recent.sort((a, b) => this._recentIds.indexOf(a.id) - this._recentIds.indexOf(b.id));
      return [...recent, ...rest];
    }

    const q = query.toLowerCase();
    // Score by match quality
    const scored = cmds.map(cmd => {
      const label = cmd.label.toLowerCase();
      const cat = (cmd.category || '').toLowerCase();
      let score = 0;
      if (label === q) score = 100;
      else if (label.startsWith(q)) score = 80;
      else if (label.includes(q)) score = 60;
      else if (cat.includes(q)) score = 40;
      else {
        // Fuzzy: check if all query chars appear in order
        let qi = 0;
        for (let li = 0; li < label.length && qi < q.length; li++) {
          if (label[li] === q[qi]) qi++;
        }
        if (qi === q.length) score = 20;
      }
      return { cmd, score };
    }).filter(s => s.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.cmd);
  },

  _render(query) {
    const results = document.getElementById('cmdPaletteResults');
    if (!results) return;

    const filtered = this._filter(query);
    this._selectedIndex = Math.min(this._selectedIndex, Math.max(0, filtered.length - 1));

    results.innerHTML = filtered.slice(0, 20).map((cmd, i) => {
      const selected = i === this._selectedIndex ? ' selected' : '';
      const shortcut = cmd.shortcut ? `<span class="cmd-shortcut">${cmd.shortcut}</span>` : '';
      const category = cmd.category ? `<span class="cmd-category">${cmd.category}</span>` : '';
      return `<div class="cmd-result${selected}" data-index="${i}">
        <span class="cmd-label">${cmd.label}</span>
        ${category}${shortcut}
      </div>`;
    }).join('');

    // Click handlers
    results.querySelectorAll('.cmd-result').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        this._execute(filtered[idx]);
      });
    });
  },

  _onKey(e) {
    const input = document.getElementById('cmdPaletteInput');
    const filtered = this._filter(input?.value || '');

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._selectedIndex = Math.min(this._selectedIndex + 1, filtered.length - 1);
      this._render(input?.value || '');
      this._scrollToSelected();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
      this._render(input?.value || '');
      this._scrollToSelected();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[this._selectedIndex]) this._execute(filtered[this._selectedIndex]);
    }
  },

  _scrollToSelected() {
    const results = document.getElementById('cmdPaletteResults');
    const selected = results?.querySelector('.cmd-result.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  },

  _execute(cmd) {
    if (!cmd) return;
    this.close();

    // Track recent
    this._recentIds = this._recentIds.filter(id => id !== cmd.id);
    this._recentIds.unshift(cmd.id);
    if (this._recentIds.length > 5) this._recentIds.length = 5;
    localStorage.setItem('gcode_recent_commands', JSON.stringify(this._recentIds));

    cmd.action();
  }
};
