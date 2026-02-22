import { describe, it } from 'node:test';
import assert from 'node:assert';
import { crc32, heatshrinkDecode, meatpackDecode } from '../src/bgcode.js';

describe('crc32', () => {
  it('returns 0 for empty buffer', () => {
    assert.strictEqual(crc32(new Uint8Array(0)), 0);
  });

  it('computes correct CRC for known input', () => {
    const buf = new TextEncoder().encode('123456789');
    assert.strictEqual(crc32(buf), 0xCBF43926);
  });
});

describe('heatshrinkDecode', () => {
  it('returns empty for empty input', () => {
    const result = heatshrinkDecode(new Uint8Array(0), 12, 4, 0);
    assert.strictEqual(result.length, 0);
  });
});

describe('meatpackDecode', () => {
  it('passes through unpacked bytes when packing disabled', () => {
    // Without enable-packing command, bytes pass through as-is
    const input = new Uint8Array([0x47, 0x32, 0x38, 0x0A]); // G28\n
    const result = meatpackDecode(input);
    assert.strictEqual(new TextDecoder().decode(result), 'G28\n');
  });
});
