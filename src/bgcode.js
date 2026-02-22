// ===== BGCODE DECODER =====

// CRC32 lookup table and function
const crc32Table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crc32Table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// Heatshrink decoder
function heatshrinkDecode(input, windowBits, lookaheadBits, outputSize) {
  const windowSize = 1 << windowBits;
  const lookaheadSize = 1 << lookaheadBits;
  const indexBits = windowBits;
  const backrefCountBits = lookaheadBits;
  const ringBuf = new Uint8Array(windowSize);
  const output = new Uint8Array(outputSize);
  let ringPos = 0, outPos = 0;

  // Bit reader
  let bitPos = 0, bytePos = 0;
  function bitsAvail() { return (input.length - bytePos) * 8 - bitPos; }
  function readBits(count) {
    let val = 0;
    for (let i = 0; i < count; i++) {
      if (bytePos >= input.length) return -1;
      val = (val << 1) | ((input[bytePos] >> (7 - bitPos)) & 1);
      bitPos++;
      if (bitPos === 8) { bitPos = 0; bytePos++; }
    }
    return val;
  }

  while (outPos < outputSize) {
    if (bitsAvail() < 1) break;
    const tag = readBits(1);
    if (tag === 1) {
      // Literal byte
      if (bitsAvail() < 8) break;
      const byte = readBits(8);
      ringBuf[ringPos & (windowSize - 1)] = byte;
      ringPos++;
      output[outPos++] = byte;
    } else {
      // Backref
      if (bitsAvail() < indexBits + backrefCountBits) break;
      const index = readBits(indexBits) + 1;
      const count = readBits(backrefCountBits) + 1;
      for (let i = 0; i < count; i++) {
        const byte = ringBuf[(ringPos - index) & (windowSize - 1)];
        ringBuf[ringPos & (windowSize - 1)] = byte;
        ringPos++;
        output[outPos++] = byte;
        if (outPos >= outputSize) break;
      }
    }
  }
  return output;
}

// Deflate decoder (browser-native)
async function deflateDecode(input, outputSize) {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  const chunks = [];
  let totalLen = 0;
  const readAll = (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalLen += value.length;
    }
  })();
  writer.write(input);
  writer.close();
  await readAll;
  const result = new Uint8Array(totalLen);
  let off = 0;
  for (const c of chunks) { result.set(c, off); off += c.length; }
  return result;
}

// MeatPack decoder (matches libbgcode unbinarize)
function meatpackDecode(input) {
  const CMD_SIGNAL = 0xFF;
  const CMD_ENABLE  = 0xFB;  // EnablePacking
  const CMD_DISABLE = 0xFA;  // DisablePacking
  const CMD_NOSPACE_ON  = 0xF7;
  const CMD_NOSPACE_OFF = 0xF6;
  const CMD_RESET   = 0xF9;
  const GLINE_PARAMS = new Set([88,89,90,69,70,73,74,82,83,71,80,87,72,67,65]); // X Y Z E F I J R S G P W H C A

  let packing = false, noSpaces = false;
  let cmdCount = 0, cmdActive = false;
  let fullCharQueue = 0, charBuf = 0;
  const output = [];
  let lastChar = 0, addSpace = false;

  function getChar(nibble) {
    if (nibble <= 9) return 0x30 + nibble; // '0'-'9'
    if (nibble === 0xA) return 0x2E; // '.'
    if (nibble === 0xB) return noSpaces ? 0x45 : 0x20; // 'E' or ' '
    if (nibble === 0xC) return 0x0A; // '\n'
    if (nibble === 0xD) return 0x47; // 'G'
    if (nibble === 0xE) return 0x58; // 'X'
    return 0; // 0xF = escape marker
  }

  function emit(ch) {
    // Suppress duplicate newlines
    if (ch === 0x0A && lastChar === 0x0A) return;
    // Insert spaces on G-lines between parameters
    if (ch === 0x47 && (output.length === 0 || lastChar === 0x0A)) {
      addSpace = true;
    } else if (ch === 0x0A) {
      addSpace = false;
    } else if (addSpace && lastChar !== 0x20 && GLINE_PARAMS.has(ch)) {
      output.push(0x20);
      lastChar = 0x20;
    }
    output.push(ch);
    lastChar = ch;
  }

  function handleCommand(c) {
    if (c === CMD_ENABLE)  packing = true;
    else if (c === CMD_DISABLE) packing = false;
    else if (c === CMD_NOSPACE_ON) noSpaces = true;
    else if (c === CMD_NOSPACE_OFF) noSpaces = false;
    else if (c === CMD_RESET) { packing = false; noSpaces = false; }
  }

  function handleRxChar(c) {
    if (packing) {
      if (fullCharQueue > 0) {
        emit(c);
        if (charBuf > 0) { emit(charBuf); charBuf = 0; }
        fullCharQueue--;
      } else {
        const lo = c & 0x0F;
        const hi = (c >> 4) & 0x0F;
        const loEsc = (lo === 0x0F);
        const hiEsc = (hi === 0x0F);
        if (loEsc) {
          fullCharQueue++;
          if (hiEsc) fullCharQueue++;
          else charBuf = getChar(hi);
        } else {
          const ch0 = getChar(lo);
          emit(ch0);
          if (ch0 !== 0x0A) { // If first char is newline, skip second
            if (hiEsc) fullCharQueue++;
            else emit(getChar(hi));
          }
        }
      }
    } else {
      emit(c); // passthrough
    }
  }

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === CMD_SIGNAL) {
      if (cmdCount > 0) { cmdActive = true; cmdCount = 0; }
      else cmdCount++;
    } else {
      if (cmdActive) { handleCommand(c); cmdActive = false; }
      else {
        if (cmdCount > 0) { handleRxChar(CMD_SIGNAL); cmdCount = 0; }
        handleRxChar(c);
      }
    }
  }
  return new Uint8Array(output);
}

// Block parser and orchestrator
async function decodeBgcode(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);

  // File header (10 bytes)
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== 'GCDE') throw new Error('Not a valid bgcode file (bad magic)');
  const version = view.getUint32(4, true);
  const checksumType = view.getUint16(8, true); // 0=None, 1=CRC32

  const progressEl = document.getElementById('parseProgress');
  const barEl = document.getElementById('parseBar');
  const labelEl = document.getElementById('parseLabel');
  progressEl.style.display = '';
  labelEl.textContent = 'Decoding binary G-code...';
  barEl.style.width = '0%';

  const gcodeChunks = [];
  let offset = 10;
  let blockIndex = 0;
  const fileSize = arrayBuffer.byteLength;

  while (offset < fileSize - 4) {
    if (offset + 8 > fileSize) break;
    const blockStart = offset;

    // Block header
    const blockType = view.getUint16(offset, true);
    const compression = view.getUint16(offset + 2, true);
    const uncompressedSize = view.getUint32(offset + 4, true);
    offset += 8;

    let compressedSize = uncompressedSize;
    if (compression !== 0) {
      compressedSize = view.getUint32(offset, true);
      offset += 4;
    }

    // Block params (Thumbnail=6 bytes, others=2 bytes)
    let encoding = 0;
    if (blockType === 5) { // Thumbnail
      offset += 6; // format + width + height
    } else {
      encoding = view.getUint16(offset, true);
      offset += 2;
    }

    const dataSize = compression !== 0 ? compressedSize : uncompressedSize;
    const blockData = bytes.subarray(offset, offset + dataSize);
    offset += dataSize;

    // CRC32 verification (covers header + params + data)
    if (checksumType === 1) {
      const storedCrc = view.getUint32(offset, true);
      offset += 4;
      if (blockType === 1) {
        const computedCrc = crc32(bytes.subarray(blockStart, offset - 4));
        if (computedCrc !== storedCrc) {
          console.warn(`CRC32 mismatch in GCode block ${blockIndex}: expected ${storedCrc.toString(16)}, got ${computedCrc.toString(16)}`);
        }
      }
    }

    // Only process GCode blocks (type 1)
    if (blockType !== 1) { blockIndex++; continue; }

    // Decompress
    let decompressed;
    if (compression === 0) {
      decompressed = blockData;
    } else if (compression === 1) { // Deflate
      decompressed = await deflateDecode(blockData, uncompressedSize);
    } else if (compression === 2) { // Heatshrink 11,4
      decompressed = heatshrinkDecode(blockData, 11, 4, uncompressedSize);
    } else if (compression === 3) { // Heatshrink 12,4
      decompressed = heatshrinkDecode(blockData, 12, 4, uncompressedSize);
    } else {
      throw new Error('Unknown compression type: ' + compression);
    }

    // Decode MeatPack
    let decoded;
    if (encoding === 0) {
      decoded = decompressed;
    } else if (encoding === 1 || encoding === 2) { // MeatPack / MeatPackComments
      decoded = meatpackDecode(decompressed);
    } else {
      throw new Error('Unknown encoding type: ' + encoding);
    }

    gcodeChunks.push(decoded);
    blockIndex++;

    // Update progress
    const pct = Math.min(offset / fileSize, 1);
    barEl.style.width = (pct * 100).toFixed(0) + '%';
    labelEl.textContent = `Decoding binary G-code... ${(pct * 100).toFixed(0)}%`;
    // Yield to UI thread periodically
    if (blockIndex % 4 === 0) await new Promise(r => setTimeout(r, 0));
  }

  // Concatenate all decoded chunks into a single string
  const totalLen = gcodeChunks.reduce((s, c) => s + c.length, 0);
  const merged = new Uint8Array(totalLen);
  let pos = 0;
  for (const chunk of gcodeChunks) { merged.set(chunk, pos); pos += chunk.length; }

  return new TextDecoder().decode(merged);
}

export { crc32, heatshrinkDecode, deflateDecode, meatpackDecode, decodeBgcode };
