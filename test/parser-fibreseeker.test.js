import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GcodeParser } from '../src/parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'fibreseeker_mini.gcode'), 'utf8');

async function parseFixture() {
  const parser = new GcodeParser();
  await parser.parseAsync(FIXTURE, 'fibreseeker_mini.gcode');
  return parser;
}

describe('GcodeParser — FibreSeeker format', () => {
  it('detects slicer type fibreseeker from header', async () => {
    const parser = await parseFixture();
    assert.strictEqual(parser.slicerType, 'fibreseeker');
  });

  it('parses "; LAYER:N [z]" markers with 0-based numbering and bracket Z height', async () => {
    const parser = await parseFixture();
    assert.strictEqual(parser.layers.length, 2);
    assert.strictEqual(parser.layers[0].number, 0);
    assert.strictEqual(parser.layers[1].number, 1);
    assert.strictEqual(parser.layers[0].zHeight, 0.2);
    assert.strictEqual(parser.layers[1].zHeight, 0.35);
  });

  it('does NOT create layers from MACROLAYER or LAYER_COUNT markers', async () => {
    const parser = await parseFixture();
    assert.strictEqual(parser.layers.length, 2);
    assert.strictEqual(parser.getLayerByNumber(2), undefined);
  });

  it('maps FibreSeeker "; <Feature> start" comments to canonical section types', async () => {
    const parser = await parseFixture();
    const types = parser.layers[0].sectionTypes;
    assert.ok(types.includes('PRIMING'), 'priming line');
    assert.ok(types.includes('SKIRT'), 'skirt');
    assert.ok(types.includes('WALL-OUTER'), 'inset XP first');
    assert.ok(types.includes('WALL-INNER'), 'numbered inset after XP');
    assert.ok(types.includes('FILL'), 'cellular infill');
    assert.ok(types.includes('FIBER'), 'fiber infill');
    assert.ok(!types.includes('MACROLAYER'));
    const supportTypes = parser.layers[1].sectionTypes;
    assert.ok(supportTypes.includes('SUPPORT'), 'support thick');
  });

  it('records U/V-only moves as extrusions with fiber metadata', async () => {
    const parser = await parseFixture();
    const moves = parser.layerMoves[0];
    // "G1 X108.700 V0.04032 U1.20000 P0.034 F300" (preceded by G0 to same XY start)
    const fiberMove = moves.find(m => m.fiber === true);
    assert.ok(fiberMove, 'expected at least one fiber move');
    assert.strictEqual(fiberMove.extrude, true);
    assert.strictEqual(fiberMove.eLength, 0, 'E word absent so eLength stays 0');
    assert.strictEqual(fiberMove.uLength, 1.2);
    assert.strictEqual(fiberMove.vLength, 0.04032);
  });

  it('negative V (retract) is not an extrusion', async () => {
    const parser = await parseFixture();
    const moves = parser.layerMoves[0];
    const retract = moves.find(m => m.vLength === 0.5);
    assert.ok(retract, 'expected the V-0.5 retract move');
    assert.strictEqual(retract.extrude, false);
    assert.strictEqual(retract.fiber, false);
  });

  it('fiber infill moves carry type FIBER and extrude', async () => {
    const parser = await parseFixture();
    const moves = parser.layerMoves[0];
    const fiberInfill = moves.filter(m => m.type === 'FIBER');
    assert.strictEqual(fiberInfill.length, 2);
    assert.ok(fiberInfill.every(m => m.extrude));
  });

  it('bounds include coordinates from fiber moves', async () => {
    const parser = await parseFixture();
    // fiber infill runs to X105 Y105, beyond the plastic moves in layer 0 region
    assert.ok(parser.bounds.maxX >= 105);
    assert.ok(parser.bounds.maxY >= 105);
  });

  it('E-based extrusion in fibreseeker file still works (skirt)', async () => {
    const parser = await parseFixture();
    const moves = parser.layerMoves[0];
    const skirt = moves.filter(m => m.type === 'SKIRT');
    // Section starts with a G0 travel move (same behavior as other slicers)
    const skirtExtrusions = skirt.filter(m => m.extrude);
    assert.ok(skirtExtrusions.length >= 2);
    assert.ok(skirt.every(m => m.fiber === false));
    assert.ok(skirtExtrusions[0].eLength > 0);
  });

  it('P parameter is not captured as an axis (no bogus fields)', async () => {
    const parser = await parseFixture();
    for (const layerNum in parser.layerMoves) {
      for (const m of parser.layerMoves[layerNum]) {
        assert.strictEqual(m.pLength, undefined);
        assert.strictEqual(m.P, undefined);
      }
    }
  });
});

describe('GcodeParser — compatibility with existing formats', () => {
  it('cura moves never gain fiber/uLength/vLength fields', async () => {
    const parser = new GcodeParser();
    const gcode = [
      ';Generated with Cura_SteamEngine 5.0',
      ';LAYER:0',
      ';TYPE:WALL-OUTER',
      'G1 X10 Y10 Z0.2 E1 F1500',
      'G1 X20 Y20 E2 F1500',
    ].join('\n');
    await parser.parseAsync(gcode, 'test.gcode');
    assert.strictEqual(parser.slicerType, 'cura');
    for (const m of parser.layerMoves[0]) {
      assert.strictEqual(m.fiber, undefined);
      assert.strictEqual(m.uLength, undefined);
      assert.strictEqual(m.vLength, undefined);
    }
  });

  it('non-fibreseeker slicers ignore "; X start" comments for typing', async () => {
    const parser = new GcodeParser();
    const gcode = [
      '; generated by PrusaSlicer 2.6.0',
      ';LAYER:0',
      '; print start',
      'G1 X10 Y10 Z0.2 E1',
      '; wipe start',
      'G1 X20 Y20 E2',
    ].join('\n');
    await parser.parseAsync(gcode, 'test.gcode');
    assert.deepStrictEqual(parser.layers[0].sectionTypes, []);
    assert.ok(parser.layerMoves[0].every(m => m.type === 'DEFAULT'));
  });

  it('standard ";LAYER:N" markers still parse as 0-based without Z override', async () => {
    const parser = new GcodeParser();
    await parser.parseAsync(';LAYER:0\nG1 X1 Y1 Z0.2\n;LAYER:1\nG1 X2 Y2 Z0.4', 'test.gcode');
    assert.strictEqual(parser.layers.length, 2);
    assert.strictEqual(parser.layers[0].number, 0);
    assert.strictEqual(parser.layers[1].number, 1);
    assert.strictEqual(parser.layers[0].zHeight, 0.2);
  });
});
