import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { GcodeParser } from '../src/parser.js';
import { LayerComparison } from '../src/comparison.js';

const SAMPLE = fs.readFileSync(new URL('./fixtures/fibreseeker_mini.gcode', import.meta.url), 'utf8');

// comparison.js reads GcodeParser / FileReader as browser globals; there is no DOM in the suite.
class FakeFileReader {
  readAsText(file) {
    queueMicrotask(() => this.onload({ target: { result: file.text } }));
  }
}

describe('LayerComparison.loadCompareFile', () => {
  beforeEach(() => {
    globalThis.GcodeParser = GcodeParser;
    globalThis.FileReader = FakeFileReader;
    LayerComparison.deactivate();
  });
  afterEach(() => {
    delete globalThis.GcodeParser;
    delete globalThis.FileReader;
    LayerComparison.deactivate();
  });

  it('parses the file and hands the parsed parser to the callback', async () => {
    const p = await new Promise((resolve, reject) => {
      LayerComparison.loadCompareFile({ name: 'other.gcode', text: SAMPLE }, resolve);
      setTimeout(() => reject(new Error('callback never fired')), 2000);
    });
    assert.ok(p.layers.length > 0, 'compare parser has layers');
    assert.strictEqual(LayerComparison.compareParser, p);
    assert.ok(LayerComparison.getCompareMoves(p.layers[0].number).length > 0);
  });
});
