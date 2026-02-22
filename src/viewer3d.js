// ===== GCODE VIEWER (old Canvas 2D removed — now using GcodeViewer3D) =====

export class GcodeViewer3D {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.gl = this.canvas.getContext('webgl2', { preserveDrawingBuffer: true });
    if (!this.gl) {
      console.error('GcodeViewer3D: WebGL2 not supported');
      this._broken = true;
      return;
    }

    this.currentLayer = 0;
    this.maxVisibleLayer = 0;
    this.layerBuffers = new Map();
    this.modMarkers = []; // Modification marker geometry for overlay rendering

    // Camera state
    this.cam = {
      rotX: 0.6,
      rotZ: 0.4,
      panX: 0,
      panY: 0,
      zoom: 1.0,
      target: [0, 0, 0],
    };

    this._dragging = false;
    this._dragButton = -1;
    this._lastMouse = { x: 0, y: 0 };
    this._mouseMoved = false;
    // Set by resize() — must be called before first render
    this._w = 0;
    this._h = 0;

    this._initShaders();
    if (this._broken) return;
    this._setupInteraction();
  }

  // --- Shader source ---
  static VS = `#version 300 es
    uniform mat4 u_mvp;
    uniform float u_alphaOverride;
    in vec3 a_pos;
    in vec3 a_color;
    in float a_alpha;
    out vec3 v_color;
    out float v_alpha;
    void main() {
      gl_Position = u_mvp * vec4(a_pos, 1.0);
      v_color = a_color;
      v_alpha = u_alphaOverride > 0.0 ? u_alphaOverride : a_alpha;
    }
  `;

  static FS = `#version 300 es
    precision mediump float;
    in vec3 v_color;
    in float v_alpha;
    out vec4 fragColor;
    void main() {
      fragColor = vec4(v_color, v_alpha);
    }
  `;

  // Line shader for travel moves and grid
  static LINE_VS = `#version 300 es
    uniform mat4 u_mvp;
    in vec3 a_pos;
    in vec4 a_color;
    out vec4 v_color;
    void main() {
      gl_Position = u_mvp * vec4(a_pos, 1.0);
      v_color = a_color;
    }
  `;

  static LINE_FS = `#version 300 es
    precision mediump float;
    in vec4 v_color;
    out vec4 fragColor;
    void main() {
      fragColor = v_color;
    }
  `;

  // --- Matrix math (column-major Float32Array) ---
  static mat4Identity() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  }

  static mat4Multiply(a, b) {
    const r = new Float32Array(16);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        r[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
      }
    return r;
  }

  static mat4Perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }

  static mat4LookAt(eye, center, up) {
    let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
    let len = Math.hypot(zx, zy, zz); zx /= len; zy /= len; zz /= len;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz); xx /= len; xy /= len; xz /= len;
    let yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([
      xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1
    ]);
  }

  _getMVP() {
    const b = parser.bounds;
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    const maxLayer = parser.layers[parser.layers.length - 1];
    const maxZ = maxLayer ? (maxLayer.zHeight || 0) : 0;
    const cz = maxZ / 2;

    const dist = Math.max(b.maxX - b.minX, b.maxY - b.minY, maxZ || 50) * 1.5 / this.cam.zoom;

    const eyeX = cx + this.cam.panX + dist * Math.cos(this.cam.rotX) * Math.sin(this.cam.rotZ);
    const eyeY = cy + this.cam.panY + dist * Math.cos(this.cam.rotX) * Math.cos(this.cam.rotZ);
    const eyeZ = cz + dist * Math.sin(this.cam.rotX);

    const target = [cx + this.cam.panX, cy + this.cam.panY, cz];
    const aspect = this._w / (this._h || 1);
    const proj = GcodeViewer3D.mat4Perspective(Math.PI / 4, aspect, 0.1, dist * 10);
    const view = GcodeViewer3D.mat4LookAt([eyeX, eyeY, eyeZ], target, [0, 0, 1]);
    return GcodeViewer3D.mat4Multiply(proj, view);
  }

  _compileShader(src, type) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  _linkProgram(vs, fs) {
    const gl = this.gl;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return null;
    }
    // Detach and delete intermediate shader objects to free GPU memory
    gl.detachShader(prog, vs);
    gl.detachShader(prog, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  }

  // --- Type colors for extrusion rendering ---
  static TYPE_COLORS = {
    'WALL-OUTER': [0.376, 0.647, 0.980],
    'WALL-INNER': [0.576, 0.773, 0.992],
    'OUTER WALL': [0.376, 0.647, 0.980],
    'INNER WALL': [0.576, 0.773, 0.992],
    'FILL': [0.290, 0.867, 0.502],
    'SOLID': [0.290, 0.867, 0.502],
    'SPARSE': [0.290, 0.867, 0.502],
    'SOLID INFILL': [0.290, 0.867, 0.502],
    'SPARSE INFILL': [0.290, 0.867, 0.502],
    'INTERNAL SOLID INFILL': [0.290, 0.867, 0.502],
    'TOP': [0.133, 0.827, 0.933],
    'TOP SURFACE': [0.133, 0.827, 0.933],
    'BOTTOM': [0.133, 0.827, 0.933],
    'BOTTOM SURFACE': [0.133, 0.827, 0.933],
    'SUPPORT': [0.980, 0.800, 0.082],
    'SUPPORT-INTERFACE': [0.992, 0.910, 0.541],
    'OVERHANG': [0.984, 0.573, 0.235],
    'GAP INFILL': [0.984, 0.573, 0.235],
    'BRIDGE': [0.976, 0.451, 0.086],
    'SKIRT': [0.655, 0.545, 0.980],
    'BRIM': [0.655, 0.545, 0.980],
    'CUSTOM': [0.655, 0.545, 0.980],
    'DEFAULT': [0.878, 0.886, 0.910],
  };

  _getTypeColor(type) {
    const upper = type.toUpperCase();
    for (const [key, color] of Object.entries(GcodeViewer3D.TYPE_COLORS)) {
      if (upper.includes(key)) return color;
    }
    return GcodeViewer3D.TYPE_COLORS.DEFAULT;
  }

  _buildLayerGeometry(layerNum) {
    if (this._broken) return null;
    if (this.layerBuffers.has(layerNum)) return this.layerBuffers.get(layerNum);

    const gl = this.gl;
    const moves = parser.layerMoves[layerNum];
    if (!moves || moves.length === 0) {
      this.layerBuffers.set(layerNum, null);
      return null;
    }

    const layer = parser.getLayerByNumber(layerNum);
    const z = layer?.zHeight || 0;
    const halfW = 0.2; // half ribbon width in mm

    // Extrusion ribbons: x,y,z, r,g,b, alpha per vertex
    const ribbonVerts = [];
    // Travel lines: x,y,z, r,g,b,a per vertex
    const travelVerts = [];

    for (const move of moves) {
      if (move.extrude) {
        const color = this._getTypeColor(move.type);
        const dx = move.x2 - move.x1;
        const dy = move.y2 - move.y1;
        const len = Math.hypot(dx, dy);
        if (len < 0.001) continue;
        // Perpendicular offset for ribbon width
        const nx = -dy / len * halfW;
        const ny = dx / len * halfW;

        // Two triangles forming a ribbon
        const verts = [
          move.x1 + nx, move.y1 + ny, z,
          move.x1 - nx, move.y1 - ny, z,
          move.x2 + nx, move.y2 + ny, z,
          move.x2 + nx, move.y2 + ny, z,
          move.x1 - nx, move.y1 - ny, z,
          move.x2 - nx, move.y2 - ny, z,
        ];
        for (let i = 0; i < 6; i++) {
          ribbonVerts.push(
            verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2],
            color[0], color[1], color[2],
            1.0
          );
        }
      } else {
        // Travel move as a line
        travelVerts.push(
          move.x1, move.y1, z, 0.3, 0.3, 0.3, 0.3,
          move.x2, move.y2, z, 0.3, 0.3, 0.3, 0.3,
        );
      }
    }

    const result = { ribbonVao: null, ribbonCount: 0, travelVao: null, travelCount: 0 };

    if (ribbonVerts.length > 0) {
      const data = new Float32Array(ribbonVerts);
      const stride = 7 * 4; // 7 floats per vertex
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.enableVertexAttribArray(this.a_pos);
      gl.vertexAttribPointer(this.a_pos, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(this.a_color);
      gl.vertexAttribPointer(this.a_color, 3, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(this.a_alpha);
      gl.vertexAttribPointer(this.a_alpha, 1, gl.FLOAT, false, stride, 24);
      gl.bindVertexArray(null);

      result.ribbonVao = vao;
      result.ribbonCount = ribbonVerts.length / 7;
    }

    if (travelVerts.length > 0) {
      const data = new Float32Array(travelVerts);
      const stride = 7 * 4;
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.enableVertexAttribArray(this.line_a_pos);
      gl.vertexAttribPointer(this.line_a_pos, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(this.line_a_color);
      gl.vertexAttribPointer(this.line_a_color, 4, gl.FLOAT, false, stride, 12);
      gl.bindVertexArray(null);

      result.travelVao = vao;
      result.travelCount = travelVerts.length / 7;
    }

    this.layerBuffers.set(layerNum, result);
    return result;
  }

  clearBuffers() {
    if (this._broken) return;
    const gl = this.gl;
    for (const [, buf] of this.layerBuffers) {
      if (!buf) continue;
      if (buf.ribbonVao) gl.deleteVertexArray(buf.ribbonVao);
      if (buf.travelVao) gl.deleteVertexArray(buf.travelVao);
    }
    this.layerBuffers.clear();
  }

  _initShaders() {
    const gl = this.gl;
    // Main ribbon shader
    const vs = this._compileShader(GcodeViewer3D.VS, gl.VERTEX_SHADER);
    const fs = this._compileShader(GcodeViewer3D.FS, gl.FRAGMENT_SHADER);
    if (!vs || !fs) { this._broken = true; return; }
    this.prog = this._linkProgram(vs, fs);
    if (!this.prog) { this._broken = true; return; }
    this.u_mvp = gl.getUniformLocation(this.prog, 'u_mvp');
    // u_alphaOverride: set > 0 to override per-vertex alpha, set <= 0 to use vertex alpha
    this.u_alphaOverride = gl.getUniformLocation(this.prog, 'u_alphaOverride');
    this.a_pos = gl.getAttribLocation(this.prog, 'a_pos');
    this.a_color = gl.getAttribLocation(this.prog, 'a_color');
    this.a_alpha = gl.getAttribLocation(this.prog, 'a_alpha');

    // Line shader (separate program for GL_LINES with vec4 color including alpha)
    const lvs = this._compileShader(GcodeViewer3D.LINE_VS, gl.VERTEX_SHADER);
    const lfs = this._compileShader(GcodeViewer3D.LINE_FS, gl.FRAGMENT_SHADER);
    if (!lvs || !lfs) { this._broken = true; return; }
    this.lineProg = this._linkProgram(lvs, lfs);
    if (!this.lineProg) { this._broken = true; return; }
    this.line_u_mvp = gl.getUniformLocation(this.lineProg, 'u_mvp');
    this.line_a_pos = gl.getAttribLocation(this.lineProg, 'a_pos');
    this.line_a_color = gl.getAttribLocation(this.lineProg, 'a_color');

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
  }

  resize() {
    if (this._broken) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this._w = w;
    this._h = h;
    this.gl.viewport(0, 0, w * dpr, h * dpr);
  }

  _drawGrid(mvp) {
    const gl = this.gl;
    const b = parser.bounds;
    const verts = [];
    const step = 10; // 10mm grid
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? [0.55, 0.56, 0.58, 0.5] : [0.16, 0.18, 0.21, 0.5];

    for (let x = Math.floor(b.minX / step) * step; x <= b.maxX; x += step) {
      verts.push(x, b.minY, 0, ...gridColor, x, b.maxY, 0, ...gridColor);
    }
    for (let y = Math.floor(b.minY / step) * step; y <= b.maxY; y += step) {
      verts.push(b.minX, y, 0, ...gridColor, b.maxX, y, 0, ...gridColor);
    }

    if (verts.length === 0) return;
    const data = new Float32Array(verts);
    const stride = 7 * 4;

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);

    gl.useProgram(this.lineProg);
    gl.uniformMatrix4fv(this.line_u_mvp, false, mvp);
    gl.enableVertexAttribArray(this.line_a_pos);
    gl.vertexAttribPointer(this.line_a_pos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.line_a_color);
    gl.vertexAttribPointer(this.line_a_color, 4, gl.FLOAT, false, stride, 12);
    gl.drawArrays(gl.LINES, 0, verts.length / 7);
    gl.deleteBuffer(vbo);
  }

  render(layerNum) {
    const gl = this.gl;
    if (this._broken || !this._w || !this._h) return;

    this.currentLayer = layerNum;

    // Clear with theme-appropriate background
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    gl.clearColor(isDark ? 0.067 : 0.878, isDark ? 0.071 : 0.882, isDark ? 0.078 : 0.894, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const mvp = this._getMVP();

    // Draw bed grid
    this._drawGrid(mvp);

    // Draw layers 0..maxVisibleLayer
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.u_mvp, false, mvp);

    for (let ln = 0; ln <= this.maxVisibleLayer; ln++) {
      const buf = this._buildLayerGeometry(ln);
      if (!buf) continue;

      const isCurrent = (ln === layerNum);

      // Set alpha override: use per-vertex alpha for current layer, dim for others
      const dimAlpha = document.documentElement.getAttribute('data-theme') === 'light' ? 0.45 : 0.25;
      gl.uniform1f(this.u_alphaOverride, isCurrent ? -1.0 : dimAlpha);

      // Draw extrusion ribbons
      if (buf.ribbonVao && buf.ribbonCount > 0) {
        gl.bindVertexArray(buf.ribbonVao);
        gl.drawArrays(gl.TRIANGLES, 0, buf.ribbonCount);
        gl.bindVertexArray(null);
      }

      // Draw travel lines (only for current layer)
      if (isCurrent && buf.travelVao && buf.travelCount > 0) {
        gl.useProgram(this.lineProg);
        gl.uniformMatrix4fv(this.line_u_mvp, false, mvp);
        gl.bindVertexArray(buf.travelVao);
        gl.drawArrays(gl.LINES, 0, buf.travelCount);
        gl.bindVertexArray(null);
        gl.useProgram(this.prog);
        gl.uniformMatrix4fv(this.u_mvp, false, mvp);
      }
    }

    // Draw modification marker planes
    this._drawModMarkers(mvp);
    this._drawHoleHighlights(mvp);
    this._drawMeasurement(mvp);
  }

  _drawModMarkers(mvp) {
    const gl = this.gl;
    const b = parser.bounds;
    const mods = modifier.modifications.filter(m => m.layer !== Infinity && m.layer !== 'end');
    if (mods.length === 0) return;

    const verts = [];
    for (const mod of mods) {
      const layer = parser.getLayerByNumber(mod.layer);
      if (!layer || layer.zHeight == null) continue;
      const z = layer.zHeight + 0.05;

      let color;
      switch (mod.type) {
        case 'pause': color = [0.980, 0.800, 0.082, 0.15]; break;
        case 'filament': color = [0.655, 0.545, 0.980, 0.15]; break;
        case 'zoffset': color = [0.984, 0.573, 0.235, 0.15]; break;
        case 'custom': color = [0.0, 0.784, 1.0, 0.15]; break;
        case 'recovery': color = [1.0, 0.2, 0.2, 0.20]; break;
        default: color = [0.5, 0.5, 0.5, 0.15];
      }

      const margin = 2;
      verts.push(
        b.minX - margin, b.minY - margin, z, ...color,
        b.maxX + margin, b.minY - margin, z, ...color,
        b.maxX + margin, b.maxY + margin, z, ...color,
        b.minX - margin, b.minY - margin, z, ...color,
        b.maxX + margin, b.maxY + margin, z, ...color,
        b.minX - margin, b.maxY + margin, z, ...color,
      );
    }

    if (verts.length === 0) return;
    const data = new Float32Array(verts);
    const stride = 7 * 4;

    gl.useProgram(this.lineProg);
    gl.uniformMatrix4fv(this.line_u_mvp, false, mvp);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.line_a_pos);
    gl.vertexAttribPointer(this.line_a_pos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.line_a_color);
    gl.vertexAttribPointer(this.line_a_color, 4, gl.FLOAT, false, stride, 12);
    gl.drawArrays(gl.TRIANGLES, 0, verts.length / 7);
    gl.deleteBuffer(vbo);
  }

  _drawHoleHighlights(mvp) {
    if (!holeDetector || holeDetector.selectedHoles.length === 0) return;
    const gl = this.gl;
    const selected = getSelectedHoleObjects();
    if (selected.length === 0) return;

    // Draw highlight at the currently viewed layer's Z height
    const currentLayerData = parser.getLayerByNumber(this.currentLayer);
    if (!currentLayerData || currentLayerData.zHeight == null) return;
    const z = currentLayerData.zHeight + 0.2;

    const verts = [];
    const fillColor = [0.0, 1.0, 0.4, 0.30];
    const ringColor = [0.0, 1.0, 0.4, 0.70];
    const segments = 36;

    for (const hole of selected) {
      const cx = hole.centroid.x;
      const cy = hole.centroid.y;
      const r = hole.diameterMm / 2;

      // Filled translucent circle
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        verts.push(
          cx, cy, z, ...fillColor,
          cx + r * Math.cos(a1), cy + r * Math.sin(a1), z, ...fillColor,
          cx + r * Math.cos(a2), cy + r * Math.sin(a2), z, ...fillColor,
        );
      }

      // Bright ring outline (annulus)
      const ringW = 0.3;
      const rOuter = r + ringW;
      const rInner = r;
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        const ox1 = cx + rOuter * Math.cos(a1), oy1 = cy + rOuter * Math.sin(a1);
        const ox2 = cx + rOuter * Math.cos(a2), oy2 = cy + rOuter * Math.sin(a2);
        const ix1 = cx + rInner * Math.cos(a1), iy1 = cy + rInner * Math.sin(a1);
        const ix2 = cx + rInner * Math.cos(a2), iy2 = cy + rInner * Math.sin(a2);
        verts.push(
          ox1, oy1, z, ...ringColor, ox2, oy2, z, ...ringColor, ix1, iy1, z, ...ringColor,
          ox2, oy2, z, ...ringColor, ix2, iy2, z, ...ringColor, ix1, iy1, z, ...ringColor,
        );
      }
    }

    if (verts.length === 0) return;
    const data = new Float32Array(verts);
    const stride = 7 * 4;

    gl.useProgram(this.lineProg);
    gl.uniformMatrix4fv(this.line_u_mvp, false, mvp);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.line_a_pos);
    gl.vertexAttribPointer(this.line_a_pos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.line_a_color);
    gl.vertexAttribPointer(this.line_a_color, 4, gl.FLOAT, false, stride, 12);
    gl.drawArrays(gl.TRIANGLES, 0, verts.length / 7);
    gl.deleteBuffer(vbo);
  }

  _invertMatrix(m) {
    const inv = new Float32Array(16);
    inv[0] = m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10];
    inv[4] = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15] - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10];
    inv[8] = m[4]*m[9]*m[15] - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9];
    inv[12] = -m[4]*m[9]*m[14] + m[4]*m[10]*m[13] + m[8]*m[5]*m[14] - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9];
    inv[1] = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15] - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10];
    inv[5] = m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15] + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10];
    inv[9] = -m[0]*m[9]*m[15] + m[0]*m[11]*m[13] + m[8]*m[1]*m[15] - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9];
    inv[13] = m[0]*m[9]*m[14] - m[0]*m[10]*m[13] - m[8]*m[1]*m[14] + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9];
    inv[2] = m[1]*m[6]*m[15] - m[1]*m[7]*m[14] - m[5]*m[2]*m[15] + m[5]*m[3]*m[14] + m[13]*m[2]*m[7] - m[13]*m[3]*m[6];
    inv[6] = -m[0]*m[6]*m[15] + m[0]*m[7]*m[14] + m[4]*m[2]*m[15] - m[4]*m[3]*m[14] - m[12]*m[2]*m[7] + m[12]*m[3]*m[6];
    inv[10] = m[0]*m[5]*m[15] - m[0]*m[7]*m[13] - m[4]*m[1]*m[15] + m[4]*m[3]*m[13] + m[12]*m[1]*m[7] - m[12]*m[3]*m[5];
    inv[14] = -m[0]*m[5]*m[14] + m[0]*m[6]*m[13] + m[4]*m[1]*m[14] - m[4]*m[2]*m[13] - m[12]*m[1]*m[6] + m[12]*m[2]*m[5];
    inv[3] = -m[1]*m[6]*m[11] + m[1]*m[7]*m[10] + m[5]*m[2]*m[11] - m[5]*m[3]*m[10] - m[9]*m[2]*m[7] + m[9]*m[3]*m[6];
    inv[7] = m[0]*m[6]*m[11] - m[0]*m[7]*m[10] - m[4]*m[2]*m[11] + m[4]*m[3]*m[10] + m[8]*m[2]*m[7] - m[8]*m[3]*m[6];
    inv[11] = -m[0]*m[5]*m[11] + m[0]*m[7]*m[9] + m[4]*m[1]*m[11] - m[4]*m[3]*m[9] - m[8]*m[1]*m[7] + m[8]*m[3]*m[5];
    inv[15] = m[0]*m[5]*m[10] - m[0]*m[6]*m[9] - m[4]*m[1]*m[10] + m[4]*m[2]*m[9] + m[8]*m[1]*m[6] - m[8]*m[2]*m[5];
    let det = m[0]*inv[0] + m[1]*inv[4] + m[2]*inv[8] + m[3]*inv[12];
    if (Math.abs(det) < 1e-10) return null;
    det = 1.0 / det;
    for (let i = 0; i < 16; i++) inv[i] *= det;
    return inv;
  }

  _transformPoint(mat, p) {
    const w = mat[3] * p[0] + mat[7] * p[1] + mat[11] * p[2] + mat[15];
    return [
      (mat[0] * p[0] + mat[4] * p[1] + mat[8] * p[2] + mat[12]) / w,
      (mat[1] * p[0] + mat[5] * p[1] + mat[9] * p[2] + mat[13]) / w,
      (mat[2] * p[0] + mat[6] * p[1] + mat[10] * p[2] + mat[14]) / w,
    ];
  }

  screenToLayerPoint(screenX, screenY, layerZ) {
    const invMvp = this._invertMatrix(this._getMVP());
    if (!invMvp) return null;
    const ndcX = (screenX / this._w) * 2 - 1;
    const ndcY = 1 - (screenY / this._h) * 2;
    const near = this._transformPoint(invMvp, [ndcX, ndcY, -1]);
    const far = this._transformPoint(invMvp, [ndcX, ndcY, 1]);
    const dz = far[2] - near[2];
    if (Math.abs(dz) < 0.0001) return null;
    const t = (layerZ - near[2]) / dz;
    return { x: near[0] + t * (far[0] - near[0]), y: near[1] + t * (far[1] - near[1]), z: layerZ };
  }

  _drawMeasurement(mvp) {
    if (!measureMode || measurePoints.length === 0) return;
    const gl = this.gl;
    const verts = [];
    const color = [1.0, 1.0, 1.0, 1.0];

    for (const pt of measurePoints) {
      const s = 0.5;
      verts.push(pt.x - s, pt.y, pt.z, ...color, pt.x + s, pt.y, pt.z, ...color);
      verts.push(pt.x, pt.y - s, pt.z, ...color, pt.x, pt.y + s, pt.z, ...color);
    }

    if (measurePoints.length === 2) {
      const [a, b] = measurePoints;
      verts.push(a.x, a.y, a.z, ...color, b.x, b.y, b.z, ...color);
    }

    if (verts.length === 0) return;
    const data = new Float32Array(verts);
    const stride = 7 * 4;
    gl.useProgram(this.lineProg);
    gl.uniformMatrix4fv(this.line_u_mvp, false, mvp);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.line_a_pos);
    gl.vertexAttribPointer(this.line_a_pos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.line_a_color);
    gl.vertexAttribPointer(this.line_a_color, 4, gl.FLOAT, false, stride, 12);
    gl.drawArrays(gl.LINES, 0, verts.length / 7);
    gl.deleteBuffer(vbo);
  }

  fitBounds() {
    this.cam.rotX = 0.6;
    this.cam.rotZ = 0.4;
    this.cam.panX = 0;
    this.cam.panY = 0;
    this.cam.zoom = 1.0;
  }

  _setupInteraction() {
    const c = this.canvas;

    c.addEventListener('contextmenu', e => e.preventDefault());

    c.addEventListener('mousedown', e => {
      this._dragging = true;
      this._dragButton = e.button;
      this._lastMouse = { x: e.clientX, y: e.clientY };
      this._mouseMoved = false;
      e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
      if (!this._dragging) return;
      const dx = e.clientX - this._lastMouse.x;
      const dy = e.clientY - this._lastMouse.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this._mouseMoved = true;

      if (this._dragButton === 0) {
        // Left-drag: orbit
        this.cam.rotZ += dx * 0.005;
        this.cam.rotX = Math.max(0.01, Math.min(Math.PI / 2 - 0.01, this.cam.rotX - dy * 0.005));
      } else if (this._dragButton === 1 || this._dragButton === 2) {
        // Middle or right drag: pan
        const panScale = 0.5 / this.cam.zoom;
        this.cam.panX -= dx * panScale * Math.cos(this.cam.rotZ) + dy * panScale * Math.sin(this.cam.rotZ);
        this.cam.panY += dx * panScale * Math.sin(this.cam.rotZ) - dy * panScale * Math.cos(this.cam.rotZ);
      }

      this._lastMouse = { x: e.clientX, y: e.clientY };
      this.render(this.currentLayer);
    });

    window.addEventListener('mouseup', () => { this._dragging = false; });

    // Scroll to zoom
    c.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      this.cam.zoom *= factor;
      this.cam.zoom = Math.max(0.1, Math.min(50, this.cam.zoom));
      this.render(this.currentLayer);
    }, { passive: false });

    // Touch support
    let lastTouchDist = 0;
    let lastTouchMid = null;

    c.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        this._dragging = true;
        this._dragButton = 0;
        this._lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        this._dragging = false;
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        lastTouchMid = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
      }
    }, { passive: true });

    c.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 1 && this._dragging) {
        const dx = e.touches[0].clientX - this._lastMouse.x;
        const dy = e.touches[0].clientY - this._lastMouse.y;
        this.cam.rotZ += dx * 0.005;
        this.cam.rotX = Math.max(0.01, Math.min(Math.PI / 2 - 0.01, this.cam.rotX - dy * 0.005));
        this._lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.render(this.currentLayer);
      } else if (e.touches.length === 2) {
        // Pinch zoom
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (lastTouchDist) {
          this.cam.zoom *= dist / lastTouchDist;
          this.cam.zoom = Math.max(0.1, Math.min(50, this.cam.zoom));
        }
        // Two-finger pan
        const mid = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        if (lastTouchMid) {
          const dx = mid.x - lastTouchMid.x;
          const dy = mid.y - lastTouchMid.y;
          const panScale = 0.5 / this.cam.zoom;
          this.cam.panX -= dx * panScale * Math.cos(this.cam.rotZ) + dy * panScale * Math.sin(this.cam.rotZ);
          this.cam.panY += dx * panScale * Math.sin(this.cam.rotZ) - dy * panScale * Math.cos(this.cam.rotZ);
        }
        lastTouchDist = dist;
        lastTouchMid = mid;
        this.render(this.currentLayer);
      }
    }, { passive: false });

    c.addEventListener('touchend', () => {
      this._dragging = false;
      lastTouchDist = 0;
      lastTouchMid = null;
    });


    // Measurement click handler
    c.addEventListener('click', e => {
      if (!measureMode || this._mouseMoved) return;
      const rect = c.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const layer = parser.getLayerByNumber(this.currentLayer);
      const z = layer?.zHeight || 0;
      const pt = this.screenToLayerPoint(sx, sy, z);
      if (pt) {
        measurePoints.push(pt);
        if (measurePoints.length > 2) measurePoints = [measurePoints[measurePoints.length - 1]];
        this.render(this.currentLayer);
        if (measurePoints.length === 2) {
          const [a, b] = measurePoints;
          const dist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
          showToast('Distance: ' + dist.toFixed(2) + ' mm', 'success', 6000);
        }
      }
    });

    // Resize observer
    new ResizeObserver(() => {
      if (currentView === 'visual') { this.resize(); this.render(this.currentLayer); }
    }).observe(c.parentElement);
  }
}
