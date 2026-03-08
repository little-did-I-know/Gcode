// ===== FIRST-RUN GUIDED TOUR =====

const Onboarding = {
  _currentStep: 0,
  _steps: [
    {
      target: '#dropZone',
      title: 'Load a G-code File',
      text: 'Drag and drop a .gcode file here, or click to browse. Supports Cura, PrusaSlicer, Bambu Studio, and more.'
    },
    {
      target: '#layerList',
      title: 'Layer Navigator',
      text: 'Browse layers with the list, arrow keys, or [ ] bracket keys. Click a layer to view it.'
    },
    {
      target: '#viewCodeBtn',
      title: 'Switch Views',
      text: 'Toggle between the code editor and 3D visual preview with Space. Press W for warp prediction view.'
    },
    {
      target: '.tabs',
      title: 'Modification Tools',
      text: 'Add pauses, filament changes, Z-offsets, and custom G-code from these tabs. Use number keys 1-9 to switch.'
    },
    {
      target: '[data-tab="analysis"]',
      title: 'Analysis & Diagnostics',
      text: 'Run diagnostics to detect cooling issues, overhangs, retraction problems, and more. Results appear as heatmap overlays.'
    },
    {
      target: '.preview-toolbar',
      title: 'Viewer Toolbar',
      text: 'Measure distances (M), show flow arrows (D), compare layers (C), toggle cross-sections (X), and simulate prints (P).'
    },
    {
      target: '#statsOverlay',
      title: 'Live Stats',
      text: 'Layer stats are shown here. Hover over moves in the 3D view to see speed, flow rate, and line number.'
    },
    {
      target: null,
      title: 'Keyboard Shortcuts',
      text: 'Press ? anytime to see all keyboard shortcuts. Press Ctrl+K to open the command palette for quick access to any feature.'
    }
  ],

  _keyHandler: null,

  start() {
    this._currentStep = 0;
    this._attachKeyboard();
    this._showStep();
  },

  next() {
    this._currentStep++;
    if (this._currentStep >= this._steps.length) {
      this.complete();
    } else {
      this._showStep();
    }
  },

  prev() {
    if (this._currentStep > 0) {
      this._currentStep--;
      this._showStep();
    }
  },

  skip() {
    this.complete();
  },

  complete() {
    localStorage.setItem('gcode_tour_completed', '1');
    this._hideOverlay();
    this._detachKeyboard();
  },

  _attachKeyboard() {
    this._keyHandler = (e) => {
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        this.next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        this.prev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.skip();
      }
    };
    document.addEventListener('keydown', this._keyHandler, true);
  },

  _detachKeyboard() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler, true);
      this._keyHandler = null;
    }
  },

  _showStep() {
    const step = this._steps[this._currentStep];
    const overlay = document.getElementById('tourOverlay');
    const card = document.getElementById('tourCard');
    const title = document.getElementById('tourTitle');
    const text = document.getElementById('tourText');
    const dots = document.getElementById('tourDots');
    const prevBtn = document.getElementById('tourPrev');
    const nextBtn = document.getElementById('tourNext');

    if (!overlay || !card) return;

    // Update content
    title.textContent = step.title;
    text.textContent = step.text;

    // Progress dots
    dots.innerHTML = this._steps.map(function(_, i) {
      return '<span class="tour-dot' + (i === Onboarding._currentStep ? ' active' : '') + '"></span>';
    }).join('');

    // Show/hide prev button
    prevBtn.style.display = this._currentStep === 0 ? 'none' : '';

    // Update next button text on last step
    nextBtn.textContent = this._currentStep === this._steps.length - 1 ? 'Finish' : 'Next';

    // Show overlay
    overlay.style.display = '';

    // Clear previous transform
    card.style.transform = '';

    // Position spotlight and card
    if (step.target) {
      var targetEl = document.querySelector(step.target);
      if (targetEl) {
        var rect = targetEl.getBoundingClientRect();
        var padding = 8;

        // Set spotlight hole via CSS custom properties
        overlay.style.setProperty('--spot-x', (rect.left - padding) + 'px');
        overlay.style.setProperty('--spot-y', (rect.top - padding) + 'px');
        overlay.style.setProperty('--spot-w', (rect.width + padding * 2) + 'px');
        overlay.style.setProperty('--spot-h', (rect.height + padding * 2) + 'px');
        overlay.classList.add('has-spotlight');

        // Position card near target
        this._positionCard(card, rect);
      } else {
        overlay.classList.remove('has-spotlight');
        this._centerCard(card);
      }
    } else {
      overlay.classList.remove('has-spotlight');
      this._centerCard(card);
    }
  },

  _positionCard(card, targetRect) {
    card.style.position = 'fixed';
    card.style.transform = '';

    var cardW = 320;
    var gap = 16;

    // Prefer positioning below the target
    var top = targetRect.bottom + gap;
    var left = targetRect.left;

    // If too low, position above
    if (top + 200 > window.innerHeight) {
      top = targetRect.top - 200 - gap;
    }
    // If too far right, shift left
    if (left + cardW > window.innerWidth - 12) {
      left = window.innerWidth - cardW - 12;
    }
    if (left < 12) left = 12;
    if (top < 12) top = 12;

    card.style.left = left + 'px';
    card.style.top = top + 'px';
  },

  _centerCard(card) {
    card.style.position = 'fixed';
    card.style.left = '50%';
    card.style.top = '40%';
    card.style.transform = 'translate(-50%, -50%)';
  },

  _hideOverlay() {
    var overlay = document.getElementById('tourOverlay');
    if (overlay) overlay.style.display = 'none';
  }
};
