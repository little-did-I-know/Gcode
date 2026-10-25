import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GcodeParser } from '../src/parser.js';

const SAFE_TYPE = /^[A-Z0-9_ ./-]+$/;
const HOSTILE = [
  '<img src=x onerror=alert(1)>',
  "x');alert(1);('",
  '"><svg onload=alert(1)>',
  '&#x61;lert(1)',
];

async function parse(text) {
  const parser = new GcodeParser();
  await parser.parseAsync(text, 'test.gcode');
  return parser;
}

function allTypes(parser) {
  const types = new Set();
  for (const moves of Object.values(parser.layerMoves)) {
    for (const m of moves) types.add(m.type);
  }
  for (const layer of parser.layers) {
    for (const t of layer.sectionTypes) types.add(t);
  }
  return [...types];
}

describe('GcodeParser — feature type names are safe to render', () => {
  for (const payload of HOSTILE) {
    it(`sanitizes ;TYPE: text (${payload})`, async () => {
      const parser = await parse(
        `;Generated with Cura_SteamEngine 5.0\n;LAYER:0\n;TYPE:${payload}\nG1 X10 Y10 E1\nG1 X20 Y10 E2\n`
      );
      const types = allTypes(parser);
      assert.ok(types.length > 0);
      for (const t of types) assert.match(t, SAFE_TYPE);
    });

    it(`sanitizes FibreSeeker "start" header text (${payload})`, async () => {
      const parser = await parse(
        `; Generated with FibreSeek Rocket Slicer v1\n; LAYER:1 [0.2]\n; ${payload} start\nG1 X10 Y10 E1\nG1 X20 Y10 E2\n`
      );
      const types = allTypes(parser);
      assert.ok(types.length > 0);
      for (const t of types) assert.match(t, SAFE_TYPE);
    });
  }

  for (const key of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    it(`treats FibreSeeker header "${key}" as plain text, not an inherited property`, async () => {
      const parser = await parse(
        `; Generated with FibreSeek Rocket Slicer v1\n; LAYER:1 [0.2]\n; ${key} start\nG1 X10 Y10 E1\nG1 X20 Y10 E2\n`
      );
      for (const t of allTypes(parser)) {
        assert.strictEqual(typeof t, 'string');
        assert.match(t, SAFE_TYPE);
      }
    });
  }

  it('ignores non-comment lines ending in "start" in FibreSeeker files', async () => {
    const parser = await parse(
      `; Generated with FibreSeek Rocket Slicer v1\n; LAYER:1 [0.2]\n; Skirt start\nM117 Print start\nG1 X10 Y10 E1\nG1 X20 Y10 E2 ; start\n`
    );
    assert.deepStrictEqual(allTypes(parser), ['SKIRT']);
  });

  it('resolves FibreSeeker insets: first numbered is outer, later inner, XP is outer, resets per layer', async () => {
    const parser = await parse([
      '; Generated with FibreSeek Rocket Slicer v1',
      '; LAYER:1 [0.2]',
      '; Inset 1 start', 'G1 X10 Y10 E1',
      '; Inset 2 start', 'G1 X20 Y20 E3',
      '; Inset XP start', 'G1 X10 Y20 E4',
      '; LAYER:2 [0.4]',
      '; Inset 1 start', 'G1 X10 Y10 E5',
      '; Inset 2 start', 'G1 X20 Y20 E7',
    ].join('\n'));
    const typesOf = n => parser.layerMoves[n].map(m => m.type);
    assert.deepStrictEqual(typesOf(0), ['WALL-OUTER', 'WALL-INNER', 'WALL-OUTER']);
    assert.deepStrictEqual(typesOf(1), ['WALL-OUTER', 'WALL-INNER']);
  });

  it('keeps slashes and dots in free-form names so distinct features stay distinct', async () => {
    const parser = await parse(
      `;Generated with Cura_SteamEngine 5.0\n;LAYER:0\n;TYPE:Infill 1/2\nG1 X10 Y10 E1\nG1 X20 Y10 E2\n`
    );
    assert.deepStrictEqual(allTypes(parser), ['INFILL 1/2']);
  });

  it('keeps known feature names unchanged', async () => {
    const parser = await parse(
      `;Generated with Cura_SteamEngine 5.0\n;LAYER:0\n;TYPE:WALL-OUTER\nG1 X10 Y10 E1\nG1 X20 Y10 E2\n`
    );
    assert.deepStrictEqual(allTypes(parser), ['WALL-OUTER']);
  });
});
