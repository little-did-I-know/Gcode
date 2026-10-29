import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ToolheadHUD } from '../src/toolhead-hud.js';

const A = { filament: 0, nozzle: 1, color: '#001489', type: 'PETG' };
const B = { filament: 1, nozzle: 0, color: '#ADB1B2', type: 'PETG' };

describe('ToolheadHUD.update', () => {
  beforeEach(() => ToolheadHUD.reset());

  it('first update does not animate', () => {
    assert.strictEqual(ToolheadHUD.update(A), false);
  });

  it('same tool does not animate', () => {
    ToolheadHUD.update(A);
    assert.strictEqual(ToolheadHUD.update(A), false);
  });

  it('changed tool animates once', () => {
    ToolheadHUD.update(A);
    assert.strictEqual(ToolheadHUD.update(B), true);
    assert.strictEqual(ToolheadHUD.update(B), false);
  });

  it('same filament on a different nozzle counts as a change', () => {
    ToolheadHUD.update(A);
    assert.strictEqual(ToolheadHUD.update({ ...A, nozzle: 0 }), true);
  });

  it('null clears without animating, and re-show does not animate', () => {
    ToolheadHUD.update(A);
    assert.strictEqual(ToolheadHUD.update(null), false);
    assert.strictEqual(ToolheadHUD.update(B), false);
  });

  it('reset forgets the last tool', () => {
    ToolheadHUD.update(A);
    ToolheadHUD.reset();
    assert.strictEqual(ToolheadHUD.update(B), false);
  });

  it('setVisible and reset do not throw without a bound element', () => {
    assert.doesNotThrow(() => {
      ToolheadHUD.setVisible(false);
      ToolheadHUD.update(A);
      ToolheadHUD.setVisible(true);
      ToolheadHUD.reset();
    });
  });
});

describe('ToolheadHUD.toolsEqual', () => {
  it('compares filament and nozzle, and handles null', () => {
    assert.strictEqual(ToolheadHUD.toolsEqual(A, { ...A, color: '#000000' }), true);
    assert.strictEqual(ToolheadHUD.toolsEqual(A, B), false);
    assert.strictEqual(ToolheadHUD.toolsEqual(null, null), true);
    assert.strictEqual(ToolheadHUD.toolsEqual(A, null), false);
  });
});
