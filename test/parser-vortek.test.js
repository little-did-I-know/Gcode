import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GcodeParser } from '../src/parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'h2c_mini.gcode'), 'utf8');
const HEX_RE = /^#[0-9A-F]{6}$/i;

async function parse(text, parser = new GcodeParser()) {
  await parser.parseAsync(text, 'test.gcode');
  return parser;
}

describe('GcodeParser — Vortek detection', () => {
  it('detects Vortek from the H2C printer_model header', async () => {
    const parser = await parse(FIXTURE);
    assert.strictEqual(parser.vortek.detected, true);
  });

  it('detects Vortek from M620 N + M632 when the header is stripped', async () => {
    const parser = await parse('M620 N\nM632 S1\n;LAYER:0\nG1 X1 Y1 Z0.2');
    assert.strictEqual(parser.vortek.detected, true);
    assert.deepStrictEqual(parser.vortek.filaments, []);
  });

  it('M620 N alone does not trigger detection', async () => {
    const parser = await parse('M620 N\n;LAYER:0\nG1 X1 Y1 Z0.2');
    assert.strictEqual(parser.vortek.detected, false);
  });

  it('M620 N + M640.8 triggers detection', async () => {
    const parser = await parse('M620 N\nM640.8 A1\n;LAYER:0\nG1 X1 Y1 Z0.2');
    assert.strictEqual(parser.vortek.detected, true);
  });

  it('non-Vortek Cura file is not detected', async () => {
    const parser = await parse(';Generated with Cura_SteamEngine 5.0\n;LAYER:0\nG1 X10 Y10 Z0.2 E1');
    assert.deepStrictEqual(parser.vortek, { detected: false, changeCount: 0, filaments: [] });
  });
});

describe('GcodeParser — Vortek filament metadata', () => {
  it('parses per-index filament colors and types from the header', async () => {
    const parser = await parse(FIXTURE);
    assert.strictEqual(parser.vortek.filaments.length, 4);
    assert.deepStrictEqual(parser.vortek.filaments[0], { index: 0, color: '#001489', type: 'PETG' });
    assert.strictEqual(parser.vortek.filaments[3].type, 'PLA');
  });

  it('rejects non-hex colors and falls back to a generated #RRGGBB', async () => {
    const parser = await parse('; printer_model = Bambu Lab H2C\n; filament_colour = red;#F4EE2A\n;LAYER:0\nG1 X1 Y1 Z0.2');
    assert.match(parser.vortek.filaments[0].color, HEX_RE);
    assert.notStrictEqual(parser.vortek.filaments[0].color, 'red');
    assert.strictEqual(parser.vortek.filaments[1].color, '#F4EE2A');
  });

  it('header colour with alpha (#RRGGBBAA) is trimmed to #RRGGBB', async () => {
    const parser = await parse('; printer_model = Bambu Lab H2C\n; filament_colour = #F4EE2AFF\n;LAYER:0\nG1 X1 Y1 Z0.2');
    assert.strictEqual(parser.vortek.filaments[0].color, '#F4EE2A');
  });

  it('reparsing a non-Vortek file on the same parser clears Vortek state', async () => {
    const parser = await parse(FIXTURE);
    assert.strictEqual(parser.vortek.detected, true);
    await parse(';Generated with Cura_SteamEngine 5.0\n;LAYER:0\nG1 X10 Y10 Z0.2 E1', parser);
    assert.strictEqual(parser.vortek.detected, false);
    assert.deepStrictEqual(parser.vortek.filaments, []);
  });
});

const lineOf = (parser, prefix) => parser.lines.findIndex(l => l.startsWith(prefix));

describe('GcodeParser — Vortek tool-change events', () => {
  it('records the initial tool as event 0 with no from-filament', async () => {
    const parser = await parse(FIXTURE);
    assert.strictEqual(parser.toolChanges.length, 3);
    const first = parser.toolChanges[0];
    assert.strictEqual(first.fromFilament, null);
    assert.strictEqual(first.toFilament, 0);
    assert.strictEqual(first.fromNozzle, null);
    assert.strictEqual(first.toNozzle, 1, 'filament_nozzle_map[0]');
    assert.strictEqual(first.layer, 0);
    assert.strictEqual(first.lineIndex, lineOf(parser, 'T0 H-1'));
  });

  it('records annotation events with positions', async () => {
    const parser = await parse(FIXTURE);
    const ev = parser.toolChanges[1];
    assert.strictEqual(ev.lineIndex, lineOf(parser, '; NOZZLE_CHANGE_START OF0 NF1'));
    assert.deepStrictEqual(
      { fromFilament: ev.fromFilament, toFilament: ev.toFilament, fromNozzle: ev.fromNozzle, toNozzle: ev.toNozzle, layer: ev.layer, x: ev.x, y: ev.y, z: ev.z },
      { fromFilament: 0, toFilament: 1, fromNozzle: 1, toNozzle: 0, layer: 0, x: 20, y: 10, z: 0.2 });
    const last = parser.toolChanges[2];
    assert.strictEqual(last.layer, 1);
    assert.strictEqual(last.z, 0.4);
    assert.strictEqual(last.toFilament, 0);
  });

  it('changeCount matches the event list', async () => {
    const parser = await parse(FIXTURE);
    assert.strictEqual(parser.vortek.changeCount, 3);
  });

  it('T1000 and repeated T0 H-1 lines do not create events', async () => {
    const parser = await parse(FIXTURE);
    assert.strictEqual(parser.toolChanges.length, 3);
    assert.ok(parser.toolChanges.every(e => parser.lines[e.lineIndex] !== 'T1000'));
  });

  it('activeToolAt flips filament and nozzle across a change line', async () => {
    const parser = await parse(FIXTURE);
    const at = lineOf(parser, '; NOZZLE_CHANGE_START OF0 NF1');
    assert.deepStrictEqual(parser.activeToolAt(at - 1), { filament: 0, nozzle: 1, color: '#001489', type: 'PETG' });
    assert.deepStrictEqual(parser.activeToolAt(at), { filament: 1, nozzle: 0, color: '#ADB1B2', type: 'PETG' });
    assert.strictEqual(parser.activeToolAt(parser.lines.length - 1).filament, 0);
  });

  it('activeToolAt returns null before the initial event', async () => {
    const parser = await parse(FIXTURE);
    assert.strictEqual(parser.activeToolAt(0), null);
  });

  it('dormant for non-Vortek files even with stray markers', async () => {
    const parser = await parse([
      ';Generated with Cura_SteamEngine 5.0', 'T0 H-1', ';LAYER:0', 'G1 X1 Y1 Z0.2 E1',
      '; NOZZLE_CHANGE_START OF0 NF1 ON1 NN0', 'G1 X2 Y2 E1',
    ].join('\n'));
    assert.deepStrictEqual(parser.toolChanges, []);
    assert.strictEqual(parser.activeToolAt(5), null);
    assert.strictEqual(parser.vortek.changeCount, 0);
  });

  it('malformed annotation is ignored', async () => {
    const parser = await parse('; printer_model = Bambu Lab H2C\nT0 H-1\n;LAYER:0\nG1 X1 Y1 Z0.2\n; NOZZLE_CHANGE_START OF NF ON NN\nG1 X2 Y2');
    assert.strictEqual(parser.toolChanges.length, 1);
  });

  it('index beyond the header list gets a fallback color and empty type', async () => {
    const parser = await parse([
      '; printer_model = Bambu Lab H2C', '; filament_colour = #001489;#ADB1B2', '; filament_type = PETG;PETG',
      'T0 H-1', ';LAYER:0', 'G1 X1 Y1 Z0.2', '; NOZZLE_CHANGE_START OF0 NF5 ON0 NN0', 'G1 X2 Y2',
    ].join('\n'));
    const tool = parser.activeToolAt(lineOf(parser, '; NOZZLE_CHANGE_START'));
    assert.strictEqual(tool.filament, 5);
    assert.match(tool.color, HEX_RE);
    assert.strictEqual(tool.type, '');
  });

  it('header-stripped Vortek file still yields events with fallback colors', async () => {
    const parser = await parse('M620 N\nM632 S1\nT0 H-1\n;LAYER:0\nG1 X1 Y1 Z0.2\n; NOZZLE_CHANGE_START OF0 NF1 ON0 NN0\nG1 X2 Y2');
    assert.strictEqual(parser.toolChanges.length, 2);
    assert.strictEqual(parser.toolChanges[0].toNozzle, null, 'no nozzle map in header');
    assert.match(parser.activeToolAt(parser.lines.length - 1).color, HEX_RE);
  });
});

describe('GcodeParser — activeToolInLayer', () => {
  it('static view uses the end of the layer', async () => {
    const parser = await parse(FIXTURE);
    assert.strictEqual(parser.activeToolInLayer(0).filament, 1);
    assert.strictEqual(parser.activeToolInLayer(1).filament, 0);
  });

  it('simulation index resolves per move and clamps', async () => {
    const parser = await parse(FIXTURE);
    assert.strictEqual(parser.activeToolInLayer(0, 0).filament, 0);
    assert.strictEqual(parser.activeToolInLayer(0, 1).filament, 0, 'move to X20 precedes the annotation');
    assert.strictEqual(parser.activeToolInLayer(0, 2).filament, 1, 'move to X30 follows the annotation');
    assert.strictEqual(parser.activeToolInLayer(0, 9999).filament, 1);
    assert.strictEqual(parser.activeToolInLayer(0, -5).filament, 0);
    assert.strictEqual(parser.activeToolInLayer(99), null);
  });

  it('layer with no XY moves falls back to endLine', async () => {
    const parser = await parse('M620 N\nM632 S1\nT0 H-1\n;LAYER:0\nG1 X1 Y1 Z0.2\n;LAYER:1\n; NOZZLE_CHANGE_START OF0 NF1 ON0 NN0\nM106 S255');
    assert.deepStrictEqual(parser.layerMoves[1], []);
    assert.strictEqual(parser.activeToolInLayer(1).filament, 1);
  });

  it('returns null for non-Vortek files', async () => {
    const parser = await parse(';LAYER:0\nG1 X1 Y1 Z0.2');
    assert.strictEqual(parser.activeToolInLayer(0), null);
  });
});
