import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { FanProfileEngine } from '../src/fan-profile.js';

// ============================================================
// 1. Default rules exist on construction
// ============================================================

describe('FanProfileEngine - Defaults', () => {
  it('has two default rules on construction', () => {
    const fp = new FanProfileEngine();
    const rules = fp.getRules();
    assert.strictEqual(rules.length, 2);
  });

  it('default rules: layers 0-3 P0 0%, layers 4+ P0 100%', () => {
    const fp = new FanProfileEngine();
    const compiled = fp.compile(10);
    for (let l = 0; l <= 3; l++) {
      assert.strictEqual(compiled[l][0], 0, `layer ${l} should be 0%`);
    }
    for (let l = 4; l <= 9; l++) {
      assert.strictEqual(compiled[l][0], 100, `layer ${l} should be 100%`);
    }
  });
});

// ============================================================
// 2. Layer-range rules compile correctly
// ============================================================

describe('FanProfileEngine - Layer-range rules', () => {
  it('custom layer-range rule applies to specified range', () => {
    const fp = new FanProfileEngine();
    fp.clearRules();
    fp.addRule({ type: 'layer-range', startLayer: 2, endLayer: 5, channel: 0, speed: 50 });
    const compiled = fp.compile(8);
    assert.strictEqual(compiled[0][0], 0);
    assert.strictEqual(compiled[1][0], 0);
    assert.strictEqual(compiled[2][0], 50);
    assert.strictEqual(compiled[5][0], 50);
    assert.strictEqual(compiled[6][0], 0);
  });
});

// ============================================================
// 3. Later rules override earlier ones
// ============================================================

describe('FanProfileEngine - Rule ordering', () => {
  it('later rule overrides earlier rule for same layer/channel', () => {
    const fp = new FanProfileEngine();
    fp.clearRules();
    fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 9, channel: 0, speed: 50 });
    fp.addRule({ type: 'layer-range', startLayer: 3, endLayer: 6, channel: 0, speed: 80 });
    const compiled = fp.compile(10);
    assert.strictEqual(compiled[0][0], 50);
    assert.strictEqual(compiled[3][0], 80);
    assert.strictEqual(compiled[6][0], 80);
    assert.strictEqual(compiled[7][0], 50);
  });
});

// ============================================================
// 4. Multi-channel rules (P0 and P1 independently)
// ============================================================

describe('FanProfileEngine - Multi-channel', () => {
  it('P0 and P1 can have independent speeds', () => {
    const fp = new FanProfileEngine();
    fp.clearRules();
    fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 9, channel: 0, speed: 60 });
    fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 9, channel: 1, speed: 30 });
    const compiled = fp.compile(10);
    assert.strictEqual(compiled[5][0], 60);
    assert.strictEqual(compiled[5][1], 30);
    assert.strictEqual(compiled[5][2], 0); // channel 2 untouched
  });
});

// ============================================================
// 5. Remove rule by id
// ============================================================

describe('FanProfileEngine - Remove rule', () => {
  it('removeRule removes the correct rule by id', () => {
    const fp = new FanProfileEngine();
    fp.clearRules();
    const r1 = fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 9, channel: 0, speed: 50 });
    const r2 = fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 9, channel: 0, speed: 80 });
    fp.removeRule(r1.id);
    const rules = fp.getRules();
    assert.strictEqual(rules.length, 1);
    assert.strictEqual(rules[0].id, r2.id);
    // After removing r1, only r2 applies
    const compiled = fp.compile(10);
    assert.strictEqual(compiled[5][0], 80);
  });
});

// ============================================================
// 6. Feature-type rules apply per-move via compileWithMoves
// ============================================================

describe('FanProfileEngine - Feature-type rules', () => {
  it('feature-type rule applies per-move (bridge vs wall)', () => {
    const fp = new FanProfileEngine();
    fp.clearRules();
    fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 9, channel: 0, speed: 50 });
    fp.addRule({ type: 'feature-type', feature: 'BRIDGE', channel: 0, speed: 100 });

    const layerMoves = {
      0: [
        { type: 'WALL-OUTER', extrude: true },
        { type: 'BRIDGE', extrude: true },
        { type: 'WALL-INNER', extrude: true },
      ],
    };

    fp.compileWithMoves(1, layerMoves);

    // Bridge move gets 100%
    assert.strictEqual(fp.getOverlayData('fan-speed-p0', 0, 1), 100);
    // Wall moves fall back to layer-level 50%
    assert.strictEqual(fp.getOverlayData('fan-speed-p0', 0, 0), 50);
    assert.strictEqual(fp.getOverlayData('fan-speed-p0', 0, 2), 50);
  });

  it('layer-level values work as fallback for non-matching moves', () => {
    const fp = new FanProfileEngine();
    fp.clearRules();
    fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 9, channel: 0, speed: 75 });
    fp.addRule({ type: 'feature-type', feature: 'OVERHANG', channel: 0, speed: 100 });

    const layerMoves = {
      0: [
        { type: 'WALL-OUTER', extrude: true },
        { type: 'FILL', extrude: true },
      ],
    };

    fp.compileWithMoves(1, layerMoves);

    // No overhang moves, so all fall back to layer-level 75%
    assert.strictEqual(fp.getOverlayData('fan-speed-p0', 0, 0), 75);
    assert.strictEqual(fp.getOverlayData('fan-speed-p0', 0, 1), 75);
  });
});

// ============================================================
// 7. Graph override takes priority over rules
// ============================================================

describe('FanProfileEngine - Graph overrides', () => {
  it('graph override overrides rule for specific layer+channel', () => {
    const fp = new FanProfileEngine();
    fp.clearRules();
    fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 9, channel: 0, speed: 50 });
    fp.setOverride(3, 0, 90);
    const compiled = fp.compile(10);
    assert.strictEqual(compiled[2][0], 50);
    assert.strictEqual(compiled[3][0], 90); // override wins
    assert.strictEqual(compiled[4][0], 50);
  });
});

// ============================================================
// 8. G-code generation: emits M106/M107 at correct layers
// ============================================================

describe('FanProfileEngine - G-code generation', () => {
  it('emits M107 for speed 0 on channel 0', () => {
    const fp = new FanProfileEngine();
    fp.clearRules();
    fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 0, channel: 0, speed: 0 });
    fp.compile(1);
    const entries = fp.generateGcode(1);
    // Speed 0 is default prev state (-1), so it should emit M107
    assert.ok(entries.length > 0);
    assert.ok(entries[0].gcode.includes('M107'));
  });

  it('emits M106 with correct S value for non-zero speed', () => {
    const fp = new FanProfileEngine();
    fp.clearRules();
    fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 9, channel: 0, speed: 100 });
    fp.compile(5);
    const entries = fp.generateGcode(5);
    // Layer 0 should emit M106 P0 S255
    assert.ok(entries[0].gcode.includes('M106 P0 S255'));
  });

  it('wraps output in FAN PROFILE comments via generateGcodeBlock', () => {
    const fp = new FanProfileEngine();
    fp.compile(5);
    const block = fp.generateGcodeBlock(5);
    assert.ok(block.startsWith('; === FAN PROFILE ==='));
    assert.ok(block.endsWith('; === END FAN PROFILE ==='));
  });
});

// ============================================================
// 9. G-code only emits when speed changes (no duplicates)
// ============================================================

describe('FanProfileEngine - G-code change detection', () => {
  it('does not emit duplicate commands for unchanged speed', () => {
    const fp = new FanProfileEngine();
    fp.clearRules();
    fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 9, channel: 0, speed: 100 });
    fp.compile(5);
    const entries = fp.generateGcode(5);
    // Only one entry at layer 0, since speed stays 100 for all layers
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].layer, 0);
  });

  it('emits at layer where speed changes', () => {
    const fp = new FanProfileEngine();
    fp.clearRules();
    fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 2, channel: 0, speed: 50 });
    fp.addRule({ type: 'layer-range', startLayer: 3, endLayer: 9, channel: 0, speed: 100 });
    fp.compile(6);
    const entries = fp.generateGcode(6);
    // Change at layer 0 (from -1 to 50) and layer 3 (from 50 to 100)
    assert.strictEqual(entries.length, 2);
    assert.strictEqual(entries[0].layer, 0);
    assert.strictEqual(entries[1].layer, 3);
  });
});

// ============================================================
// 10. Multi-channel G-code (P0 and P2 in same layer)
// ============================================================

describe('FanProfileEngine - Multi-channel G-code', () => {
  it('emits commands for multiple channels in same layer', () => {
    const fp = new FanProfileEngine();
    fp.clearRules();
    fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 9, channel: 0, speed: 80 });
    fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 9, channel: 2, speed: 60 });
    fp.compile(3);
    const entries = fp.generateGcode(3);
    assert.strictEqual(entries.length, 1); // both change on layer 0
    const gcode = entries[0].gcode;
    assert.ok(gcode.includes('P0'), 'should include P0 command');
    assert.ok(gcode.includes('P2'), 'should include P2 command');
    // S values: 80% -> 204, 60% -> 153
    assert.ok(gcode.includes('S204'), '80% should be S204');
    assert.ok(gcode.includes('S153'), '60% should be S153');
  });
});

// ============================================================
// 11. Clear overrides works
// ============================================================

describe('FanProfileEngine - Clear overrides', () => {
  it('clearOverrides removes all overrides', () => {
    const fp = new FanProfileEngine();
    fp.setOverride(0, 0, 90);
    fp.setOverride(1, 1, 50);
    assert.strictEqual(fp.getOverrides().size, 2);
    fp.clearOverrides();
    assert.strictEqual(fp.getOverrides().size, 0);
  });

  it('after clearOverrides, compile uses only rules', () => {
    const fp = new FanProfileEngine();
    fp.clearRules();
    fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 9, channel: 0, speed: 50 });
    fp.setOverride(3, 0, 90);
    fp.clearOverrides();
    const compiled = fp.compile(10);
    assert.strictEqual(compiled[3][0], 50); // override cleared, rule applies
  });
});

// ============================================================
// 12. Overlay interface
// ============================================================

describe('FanProfileEngine - Overlay interface', () => {
  it('has name "fan-profile"', () => {
    const fp = new FanProfileEngine();
    assert.strictEqual(fp.name, 'fan-profile');
  });

  it('getSupportedOverlays returns 3 overlays', () => {
    const fp = new FanProfileEngine();
    const overlays = fp.getSupportedOverlays();
    assert.strictEqual(overlays.length, 3);
    const ids = overlays.map(o => o.id);
    assert.ok(ids.includes('fan-speed-p0'));
    assert.ok(ids.includes('fan-speed-p1'));
    assert.ok(ids.includes('fan-speed-p2'));
  });

  it('getFindings returns empty array', () => {
    const fp = new FanProfileEngine();
    assert.deepStrictEqual(fp.getFindings(), []);
  });
});

// ============================================================
// 13. Thermal rules
// ============================================================

describe('FanProfileEngine - Thermal rules', () => {
  it('thermal rule applies when heat exceeds threshold', () => {
    const fp = new FanProfileEngine();
    fp.clearRules();
    fp.addRule({ type: 'layer-range', startLayer: 0, endLayer: 9, channel: 0, speed: 50 });
    fp.addRule({ type: 'thermal', channel: 0, threshold: 60, speed: 100 });

    const thermalMap = new Map();
    thermalMap.set(0, 30); // below threshold
    thermalMap.set(1, 70); // above threshold
    thermalMap.set(2, 90); // above threshold
    fp.setThermalData(thermalMap);

    const compiled = fp.compile(3);
    assert.strictEqual(compiled[0][0], 50);  // heat 30 < 60, stays at 50
    assert.strictEqual(compiled[1][0], 100); // heat 70 > 60, thermal applies
    assert.strictEqual(compiled[2][0], 100); // heat 90 > 60, thermal applies
  });
});
