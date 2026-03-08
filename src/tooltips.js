// Inline tooltip system — attaches "?" badges to elements with data-tooltip attributes
const Tooltips = {
  _el: null,
  _timeout: null,
  _sessionCount: 0,

  init() {
    this._sessionCount = parseInt(localStorage.getItem('gcode_tooltip_sessions') || '0');
    localStorage.setItem('gcode_tooltip_sessions', String(this._sessionCount + 1));

    // Create shared tooltip element
    this._el = document.createElement('div');
    this._el.className = 'inline-tooltip';
    this._el.style.display = 'none';
    document.body.appendChild(this._el);

    this._attachAll();
  },

  _attachAll() {
    document.querySelectorAll('[data-tooltip]').forEach(el => {
      if (el.querySelector('.tooltip-badge')) return; // already attached
      const badge = document.createElement('span');
      badge.className = 'tooltip-badge';
      if (this._sessionCount < 3) badge.classList.add('pulse');
      badge.textContent = '?';
      badge.addEventListener('mouseenter', (e) => this._show(e, el.dataset.tooltip));
      badge.addEventListener('mouseleave', () => this._hide());
      el.appendChild(badge);
    });
  },

  refresh() {
    this._attachAll();
  },

  _show(e, text) {
    clearTimeout(this._timeout);
    this._el.textContent = text;
    this._el.style.display = '';

    // Position near the badge
    const rect = e.target.getBoundingClientRect();
    let left = rect.right + 8;
    let top = rect.top - 4;

    // Measure tooltip size
    const tipW = this._el.offsetWidth;
    const tipH = this._el.offsetHeight;

    // Keep within viewport
    if (left + tipW > window.innerWidth - 12) {
      left = rect.left - tipW - 8;
    }
    if (top + tipH > window.innerHeight - 12) {
      top = window.innerHeight - tipH - 12;
    }
    if (top < 4) top = 4;

    this._el.style.left = left + 'px';
    this._el.style.top = top + 'px';
  },

  _hide() {
    this._timeout = setTimeout(() => {
      if (this._el) this._el.style.display = 'none';
    }, 100);
  }
};
