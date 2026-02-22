import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { GcodeModifier } from '../src/modifier.js';

describe('GcodeModifier', () => {
  let mod;

  beforeEach(() => {
    mod = new GcodeModifier();
  });

  // --- addPause ---
  describe('addPause', () => {
    it('returns a mod object with correct fields', () => {
      const result = mod.addPause(5, 'check nozzle', 'M0', false);
      assert.strictEqual(result.type, 'pause');
      assert.strictEqual(result.layer, 5);
      assert.strictEqual(result.message, 'check nozzle');
      assert.strictEqual(result.pauseType, 'M0');
      assert.strictEqual(result.moveHead, false);
      assert.ok(result.id.startsWith('mod_'));
    });

    it('stores the modification in the list', () => {
      mod.addPause(3, '', 'M600', true);
      assert.strictEqual(mod.modifications.length, 1);
      assert.strictEqual(mod.modifications[0].type, 'pause');
    });

    it('defaults message to empty string when falsy', () => {
      const result = mod.addPause(0, null, 'M0', false);
      assert.strictEqual(result.message, '');
    });
  });

  // --- addZOffset ---
  describe('addZOffset', () => {
    it('returns a mod with layer, endLayer, offset, note', () => {
      const result = mod.addZOffset(2, 10, 0.05, 'elephant foot');
      assert.strictEqual(result.type, 'zoffset');
      assert.strictEqual(result.layer, 2);
      assert.strictEqual(result.endLayer, 10);
      assert.strictEqual(result.offset, 0.05);
      assert.strictEqual(result.note, 'elephant foot');
    });

    it('defaults note to empty string when falsy', () => {
      const result = mod.addZOffset(0, 5, -0.1, null);
      assert.strictEqual(result.note, '');
    });
  });

  // --- addFilament ---
  describe('addFilament', () => {
    it('returns mod with slot parsed as int', () => {
      const result = mod.addFilament(7, '2', 'M1020');
      assert.strictEqual(result.type, 'filament');
      assert.strictEqual(result.slot, 2);
      assert.strictEqual(result.command, 'M1020');
      assert.strictEqual(result.layer, 7);
    });
  });

  // --- addCustom ---
  describe('addCustom', () => {
    it('stores custom gcode string', () => {
      const result = mod.addCustom(4, 'G28 X Y\nM106 S255');
      assert.strictEqual(result.type, 'custom');
      assert.strictEqual(result.gcode, 'G28 X Y\nM106 S255');
    });
  });

  // --- addRecovery ---
  describe('addRecovery', () => {
    it('returns recovery mod with resumeLayer', () => {
      const result = mod.addRecovery(15);
      assert.strictEqual(result.type, 'recovery');
      assert.strictEqual(result.resumeLayer, 15);
    });

    it('replaces existing recovery mod', () => {
      mod.addRecovery(10);
      mod.addRecovery(20);
      const recoveries = mod.modifications.filter(m => m.type === 'recovery');
      assert.strictEqual(recoveries.length, 1);
      assert.strictEqual(recoveries[0].resumeLayer, 20);
    });
  });

  // --- addEject ---
  describe('addEject', () => {
    it('returns eject mod with config spread', () => {
      const result = mod.addEject({ bedY: 200, headZ: 50, feedRate: 3000, heatersOff: true, homeZ: true, loop: false });
      assert.strictEqual(result.type, 'eject');
      assert.strictEqual(result.layer, Infinity);
      assert.strictEqual(result.bedY, 200);
      assert.strictEqual(result.heatersOff, true);
    });

    it('replaces previous eject mod (only one allowed)', () => {
      mod.addEject({ bedY: 100 });
      mod.addEject({ bedY: 200 });
      const ejects = mod.modifications.filter(m => m.type === 'eject');
      assert.strictEqual(ejects.length, 1);
      assert.strictEqual(ejects[0].bedY, 200);
    });

    it('does not remove non-eject mods when adding eject', () => {
      mod.addPause(1, '', 'M0', false);
      mod.addEject({ bedY: 100 });
      assert.strictEqual(mod.modifications.length, 2);
    });
  });

  // --- remove ---
  describe('remove', () => {
    it('removes a modification by id', () => {
      const m1 = mod.addPause(1, '', 'M0', false);
      const m2 = mod.addPause(2, '', 'M0', false);
      mod.remove(m1.id);
      assert.strictEqual(mod.modifications.length, 1);
      assert.strictEqual(mod.modifications[0].id, m2.id);
    });

    it('does nothing when id does not exist', () => {
      mod.addPause(1, '', 'M0', false);
      mod.remove('nonexistent_id');
      assert.strictEqual(mod.modifications.length, 1);
    });
  });

  // --- moveUp / moveDown ---
  describe('moveUp', () => {
    it('swaps modification with previous one', () => {
      const m1 = mod.addPause(1, '', 'M0', false);
      const m2 = mod.addPause(2, '', 'M0', false);
      mod.moveUp(m2.id);
      assert.strictEqual(mod.modifications[0].id, m2.id);
      assert.strictEqual(mod.modifications[1].id, m1.id);
    });

    it('does nothing when already first', () => {
      const m1 = mod.addPause(1, '', 'M0', false);
      mod.addPause(2, '', 'M0', false);
      mod.moveUp(m1.id);
      assert.strictEqual(mod.modifications[0].id, m1.id);
    });
  });

  describe('moveDown', () => {
    it('swaps modification with next one', () => {
      const m1 = mod.addPause(1, '', 'M0', false);
      const m2 = mod.addPause(2, '', 'M0', false);
      mod.moveDown(m1.id);
      assert.strictEqual(mod.modifications[0].id, m2.id);
      assert.strictEqual(mod.modifications[1].id, m1.id);
    });

    it('does nothing when already last', () => {
      mod.addPause(1, '', 'M0', false);
      const m2 = mod.addPause(2, '', 'M0', false);
      mod.moveDown(m2.id);
      assert.strictEqual(mod.modifications[1].id, m2.id);
    });
  });

  // --- getSnippet ---
  describe('getSnippet', () => {
    it('generates eject snippet with heaters off and homeZ', () => {
      const m = mod.addEject({ bedY: 200, headZ: 50, feedRate: 3000, heatersOff: true, homeZ: true, loop: false });
      const lines = mod.getSnippet(m);
      assert.ok(lines[0].includes('AUTO-EJECT SEQUENCE'));
      assert.ok(lines.some(l => l.includes('M104 S0')));
      assert.ok(lines.some(l => l.includes('M140 S0')));
      assert.ok(lines.some(l => l.includes('G28 Z')));
      assert.ok(lines[lines.length - 1].includes('END AUTO-EJECT'));
    });

    it('generates eject snippet with loop mode', () => {
      const m = mod.addEject({ bedY: 200, headZ: 50, feedRate: 3000, heatersOff: false, homeZ: false, loop: true });
      const lines = mod.getSnippet(m);
      assert.ok(lines.some(l => l.includes('LOOP MODE')));
    });

    it('generates custom snippet', () => {
      const m = mod.addCustom(3, 'G28 X\nM106 S255');
      const lines = mod.getSnippet(m);
      assert.ok(lines[0].includes('CUSTOM G-CODE'));
      assert.ok(lines.includes('G28 X'));
      assert.ok(lines.includes('M106 S255'));
      assert.ok(lines[lines.length - 1].includes('END CUSTOM'));
    });

    it('generates zoffset comment snippet with range', () => {
      const m = mod.addZOffset(2, 10, 0.1, 'test');
      const lines = mod.getSnippet(m);
      assert.strictEqual(lines.length, 1);
      assert.ok(lines[0].includes('+0.1mm'));
      assert.ok(lines[0].includes('layers 2'));
      assert.ok(lines[0].includes('(test)'));
    });

    it('generates zoffset comment for negative offset without end', () => {
      const m = mod.addZOffset(5, null, -0.2, '');
      const lines = mod.getSnippet(m);
      assert.ok(lines[0].includes('-0.2mm'));
      assert.ok(lines[0].includes('layer 5 onward'));
    });

    it('generates filament change snippet for M1020', () => {
      const m = mod.addFilament(3, '1', 'M1020');
      const lines = mod.getSnippet(m);
      assert.ok(lines[0].includes('FILAMENT CHANGE'));
      assert.ok(lines[0].includes('Slot 2'));  // slot + 1
      assert.ok(lines.some(l => l.includes('M1020 S1')));
    });

    it('generates filament change snippet for M600', () => {
      const m = mod.addFilament(3, '0', 'M600');
      const lines = mod.getSnippet(m);
      assert.ok(lines[0].includes('FILAMENT CHANGE'));
      assert.ok(!lines[0].includes('Slot'));
      assert.ok(lines.some(l => l.includes('M600 ; Filament change')));
    });

    it('generates recovery snippet', () => {
      const m = mod.addRecovery(10);
      const lines = mod.getSnippet(m);
      assert.ok(lines[0].includes('PRINT RECOVERY'));
      assert.ok(lines[0].includes('layer 10'));
      assert.ok(lines.some(l => l.includes('END RECOVERY HEADER')));
    });
  });

  // --- unique IDs ---
  describe('_id', () => {
    it('generates unique ids', () => {
      const m1 = mod.addPause(1, '', 'M0', false);
      const m2 = mod.addPause(2, '', 'M0', false);
      assert.notStrictEqual(m1.id, m2.id);
    });
  });

  // --- applyAll (basic integration) ---
  describe('applyAll', () => {
    it('appends eject snippet at the end of lines', () => {
      mod.addEject({ bedY: 200, headZ: 50, feedRate: 3000, heatersOff: false, homeZ: false, loop: false });
      const lines = ['G28', 'G1 X10'];
      const parser = { layers: [], getLayerByNumber: () => undefined };
      const result = mod.applyAll(lines, parser);
      assert.ok(result.length > lines.length);
      assert.ok(result.some(l => l.includes('AUTO-EJECT')));
    });

    it('inserts custom gcode at correct layer', () => {
      mod.addCustom(0, 'M106 S255');
      const lines = [
        '; header',
        ';LAYER:0',
        'G1 X10 Y10 Z0.2 E1',
        ';LAYER:1',
        'G1 X20 Y20 Z0.4 E2',
      ];
      const parser = {
        layers: [
          { number: 0, startLine: 1, endLine: 2, zHeight: 0.2 },
          { number: 1, startLine: 3, endLine: 4, zHeight: 0.4 },
        ],
        getLayerByNumber(n) { return this.layers.find(l => l.number === n); },
      };
      const result = mod.applyAll(lines, parser);
      // The custom snippet should be inserted after the layer start line
      const customIdx = result.findIndex(l => l.includes('CUSTOM G-CODE'));
      assert.ok(customIdx > 0);
      assert.ok(result.some(l => l.includes('M106 S255')));
    });

    it('adjusts Z values for z-offset mods', () => {
      mod.addZOffset(0, 0, 0.5, '');
      const lines = [
        ';LAYER:0',
        'G1 X10 Y10 Z0.2 E1',
        ';LAYER:1',
        'G1 X20 Y20 Z0.4 E2',
      ];
      const parser = {
        layers: [
          { number: 0, startLine: 0, endLine: 1, zHeight: 0.2 },
          { number: 1, startLine: 2, endLine: 3, zHeight: 0.4 },
        ],
        getLayerByNumber(n) { return this.layers.find(l => l.number === n); },
      };
      const result = mod.applyAll(lines, parser);
      // Layer 0 Z should be shifted by +0.5 -> 0.7
      const l0move = result.find(l => l.includes('X10') && l.includes('Z'));
      assert.ok(l0move);
      assert.ok(l0move.includes('Z0.700'), `Expected Z0.700 in: ${l0move}`);
      // Layer 1 should NOT be shifted (offset only for layer 0)
      const l1move = result.find(l => l.includes('X20') && l.includes('Z'));
      assert.ok(l1move.includes('Z0.4'), `Expected Z0.4 in: ${l1move}`);
    });

    it('does not modify original lines array', () => {
      mod.addEject({ bedY: 200, headZ: 50, feedRate: 3000, heatersOff: false, homeZ: false, loop: false });
      const lines = ['G28', 'G1 X10'];
      const parser = { layers: [], getLayerByNumber: () => undefined };
      const result = mod.applyAll(lines, parser);
      assert.strictEqual(lines.length, 2);
      assert.ok(result.length > 2);
    });
  });
});
