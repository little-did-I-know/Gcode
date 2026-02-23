import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GcodeParser } from '../src/parser.js';

// Pure-function tests for the search algorithm.
// These replicate the core logic from ui.js to test without browser globals.

describe('G-code Search', () => {
  function buildSectionsFromParser(parser) {
    const sections = [];
    if (parser.lines.length === 0) return sections;

    const firstLayer = parser.layers.length > 0 ? parser.layers[0] : null;
    const headerEndLine = firstLayer ? firstLayer.startLine - 1 : parser.lines.length - 1;

    if (headerEndLine >= 0) {
      sections.push({ type: 'header', startLine: 0, endLine: headerEndLine, lineCount: headerEndLine + 1 });
    }

    for (let i = 0; i < parser.layers.length; i++) {
      const layer = parser.layers[i];
      const prevEnd = i === 0 ? headerEndLine : parser.layers[i - 1].endLine;

      if (layer.startLine > prevEnd + 1) {
        sections.push({ type: 'gap', startLine: prevEnd + 1, endLine: layer.startLine - 1, lineCount: layer.startLine - 1 - prevEnd });
      }

      sections.push({ type: 'layer', startLine: layer.startLine, endLine: layer.endLine, layerNum: layer.number, lineCount: layer.endLine - layer.startLine + 1 });
    }

    return sections;
  }

  function executeSearch(lines, sections, query) {
    if (!query) return [];
    const q = query.toLowerCase();
    const matches = [];
    const MAX_MATCHES = 10000;

    for (let i = 0; i < lines.length && matches.length < MAX_MATCHES; i++) {
      if (lines[i].toLowerCase().includes(q)) {
        let sectionIdx = -1;
        for (let s = 0; s < sections.length; s++) {
          if (i >= sections[s].startLine && i <= sections[s].endLine) {
            sectionIdx = s;
            break;
          }
        }
        matches.push({ lineNum: i, sectionIdx });
      }
    }
    return matches;
  }

  it('finds case-insensitive matches', async () => {
    const parser = new GcodeParser();
    const gcode = [
      ';Generated with Cura_SteamEngine 5.0',
      'G28 ; Home',
      ';LAYER:0',
      'G1 X10 Y10 Z0.2 E1 F1500',
      'G28',
      ';LAYER:1',
      'G1 X20 Y20 Z0.4 E2 F1500',
    ].join('\n');
    await parser.parseAsync(gcode, 'test.gcode');
    const sections = buildSectionsFromParser(parser);

    const matches = executeSearch(parser.lines, sections, 'g28');
    assert.strictEqual(matches.length, 2);
    assert.strictEqual(matches[0].lineNum, 1);
    assert.strictEqual(matches[1].lineNum, 4);
  });

  it('returns empty array for no matches', async () => {
    const parser = new GcodeParser();
    await parser.parseAsync(';LAYER:0\nG1 X10 Y10 Z0.2 E1', 'test.gcode');
    const sections = buildSectionsFromParser(parser);

    const matches = executeSearch(parser.lines, sections, 'M600');
    assert.strictEqual(matches.length, 0);
  });

  it('returns empty array for empty query', async () => {
    const parser = new GcodeParser();
    await parser.parseAsync(';LAYER:0\nG1 X10 Y10 Z0.2 E1', 'test.gcode');
    const sections = buildSectionsFromParser(parser);

    const matches = executeSearch(parser.lines, sections, '');
    assert.strictEqual(matches.length, 0);
  });

  it('maps matches to correct section indices', async () => {
    const parser = new GcodeParser();
    const gcode = [
      '; header comment with G1',
      ';LAYER:0',
      'G1 X10 Y10 Z0.2 E1',
      ';LAYER:1',
      'G1 X20 Y20 Z0.4 E2',
    ].join('\n');
    await parser.parseAsync(gcode, 'test.gcode');
    const sections = buildSectionsFromParser(parser);

    const matches = executeSearch(parser.lines, sections, 'g1');
    assert.strictEqual(matches.length, 3);
    assert.strictEqual(matches[0].sectionIdx, 0);
    assert.ok(matches[1].sectionIdx > 0);
    assert.strictEqual(sections[matches[1].sectionIdx].type, 'layer');
    assert.strictEqual(sections[matches[1].sectionIdx].layerNum, 0);
    assert.strictEqual(sections[matches[2].sectionIdx].type, 'layer');
    assert.strictEqual(sections[matches[2].sectionIdx].layerNum, 1);
  });

  it('caps matches at 10000', async () => {
    const parser = new GcodeParser();
    const lines = [';LAYER:0'];
    for (let i = 0; i < 10500; i++) {
      lines.push(`G1 X${i} Y${i} Z0.2 E${i}`);
    }
    await parser.parseAsync(lines.join('\n'), 'test.gcode');
    const sections = buildSectionsFromParser(parser);

    const matches = executeSearch(parser.lines, sections, 'g1');
    assert.strictEqual(matches.length, 10000);
  });
});
