// Layer & File Comparison Mode
// Allows comparing two layers side-by-side or comparing against a second file.

const LayerComparison = {
  active: false,
  compareLayerNum: null,
  compareParser: null,  // For file comparison (second parsed file)
  compareTint: [1.0, 0.5, 0.2], // Orange tint for compare layer

  activate(compareLayer) {
    this.active = true;
    this.compareLayerNum = compareLayer;
  },

  deactivate() {
    this.active = false;
    this.compareLayerNum = null;
    this.compareParser = null;
  },

  loadCompareFile(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const p = new GcodeParser();
      p.parse(e.target.result);
      this.compareParser = p;
      if (callback) callback(p);
    };
    reader.readAsText(file);
  },

  getCompareMoves(layerNum) {
    if (this.compareParser) {
      return this.compareParser.layerMoves[layerNum] || [];
    }
    if (this.compareLayerNum != null) {
      return parser.layerMoves[this.compareLayerNum] || [];
    }
    return [];
  },

  getCompareZ(layerNum) {
    if (this.compareParser) {
      const l = this.compareParser.layers[layerNum];
      return l ? l.zHeight || 0 : 0;
    }
    if (this.compareLayerNum != null) {
      const l = parser.layers[this.compareLayerNum];
      return l ? l.zHeight || 0 : 0;
    }
    return 0;
  },

  computeDiffStats(movesA, movesB) {
    let extCountA = 0, extCountB = 0, extLenA = 0, extLenB = 0;
    for (const m of movesA) if (m.extrude) { extCountA++; extLenA += (m.eLength || 0); }
    for (const m of movesB) if (m.extrude) { extCountB++; extLenB += (m.eLength || 0); }
    return {
      moveCountA: extCountA, moveCountB: extCountB,
      moveDelta: extCountB - extCountA,
      extLenA: extLenA.toFixed(1), extLenB: extLenB.toFixed(1),
      extDelta: (extLenB - extLenA).toFixed(1)
    };
  }
};
