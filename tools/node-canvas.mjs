// node-canvas.mjs — a small, dependency-free stand-in for the browser's
// 2D canvas, just complete enough to run Cover Heist's render core
// (app/src/*.js) under Node for the in-session screenshot renderer.
// It implements the exact operations the app uses: paths, clips, fills,
// strokes, linear gradients, drawImage with bilinear sampling,
// getImageData/putImageData, and poster text drawn with a built-in
// stroke glyph set (the browser uses its system font stack instead).
// This file is a build tool: it is not part of app/ and never ships.

export function parseColor(style) {
  if (typeof style !== 'string') return null;
  const s = style.trim();
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    const v = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16), 1];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map((p) => Number(p.trim()));
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }
  return [0, 0, 0, 1];
}

class LinearGradient {
  constructor(x0, y0, x1, y1) {
    this.x0 = x0; this.y0 = y0; this.x1 = x1; this.y1 = y1;
    this.stops = [];
  }
  addColorStop(at, color) {
    this.stops.push([Math.min(1, Math.max(0, at)), parseColor(color)]);
  }
  colorAt(x, y) {
    const dx = this.x1 - this.x0;
    const dy = this.y1 - this.y0;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((x - this.x0) * dx + (y - this.y0) * dy) / len2;
    t = Math.min(1, Math.max(0, t));
    const stops = this.stops.slice().sort((a, b) => a[0] - b[0]);
    if (!stops.length) return [0, 0, 0, 1];
    if (t <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const [t0, c0] = stops[i - 1];
        const [t1, c1] = stops[i];
        const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
        return [0, 1, 2, 3].map((k) => c0[k] + (c1[k] - c0[k]) * f);
      }
    }
    return stops[stops.length - 1][1];
  }
}

// Stroke glyphs on a 6 x 9 grid (y down). Each glyph is a list of strokes,
// each stroke a list of [x, y] points. Covers the letters, digits and
// punctuation the app's scenes and captions use.
const G = {
  A: [[[0, 9], [3, 0], [6, 9]], [[1.2, 5.5], [4.8, 5.5]]],
  B: [[[0, 0], [0, 9]], [[0, 0], [3.6, 0], [4.6, 1.6], [3.6, 3.4], [0, 3.6]], [[0, 3.6], [4, 3.8], [5, 5.6], [4, 8.4], [0, 9]]],
  C: [[[5.6, 2], [3.6, 0], [1.2, 1.2], [0.4, 4.5], [1.2, 7.8], [3.6, 9], [5.6, 7]]],
  D: [[[0, 0], [0, 9]], [[0, 0], [3.4, 0], [5.4, 2.4], [5.4, 6.6], [3.4, 9], [0, 9]]],
  E: [[[5.4, 0], [0, 0], [0, 9], [5.4, 9]], [[0, 4.5], [4.2, 4.5]]],
  F: [[[5.4, 0], [0, 0], [0, 9]], [[0, 4.5], [4.2, 4.5]]],
  G: [[[5.6, 2], [3.6, 0], [1.2, 1.2], [0.4, 4.5], [1.2, 7.8], [3.6, 9], [5.8, 7.4], [5.8, 5], [3.6, 5]]],
  H: [[[0, 0], [0, 9]], [[6, 0], [6, 9]], [[0, 4.5], [6, 4.5]]],
  I: [[[3, 0], [3, 9]], [[1, 0], [5, 0]], [[1, 9], [5, 9]]],
  J: [[[5.6, 0], [5.6, 6.8], [4, 9], [1.4, 9], [0.4, 7.4]]],
  K: [[[0, 0], [0, 9]], [[5.6, 0], [0.6, 4.6]], [[1.8, 3.4], [5.8, 9]]],
  L: [[[0, 0], [0, 9], [5.4, 9]]],
  M: [[[0, 9], [0, 0], [3, 4.6], [6, 0], [6, 9]]],
  N: [[[0, 9], [0, 0], [6, 9], [6, 0]]],
  O: [[[3, 0], [1, 1.4], [0.4, 4.5], [1, 7.6], [3, 9], [5, 7.6], [5.6, 4.5], [5, 1.4], [3, 0]]],
  P: [[[0, 9], [0, 0], [3.8, 0], [5.2, 1.8], [3.8, 4.2], [0, 4.2]]],
  Q: [[[3, 0], [1, 1.4], [0.4, 4.5], [1, 7.6], [3, 9], [5, 7.6], [5.6, 4.5], [5, 1.4], [3, 0]], [[3.8, 6.6], [6, 9.4]]],
  R: [[[0, 9], [0, 0], [3.8, 0], [5.2, 1.8], [3.8, 4.2], [0, 4.2]], [[2.6, 4.2], [5.8, 9]]],
  S: [[[5.4, 1.6], [3.4, 0], [1, 1], [0.6, 2.8], [2, 4.2], [4.4, 5.4], [5.4, 7], [4.4, 8.8], [1.8, 9], [0.4, 7.6]]],
  T: [[[0, 0], [6, 0]], [[3, 0], [3, 9]]],
  U: [[[0, 0], [0, 6.6], [1.4, 9], [4.6, 9], [6, 6.6], [6, 0]]],
  V: [[[0, 0], [3, 9], [6, 0]]],
  W: [[[0, 0], [1.2, 9], [3, 4], [4.8, 9], [6, 0]]],
  X: [[[0, 0], [6, 9]], [[6, 0], [0, 9]]],
  Y: [[[0, 0], [3, 4.2], [6, 0]], [[3, 4.2], [3, 9]]],
  Z: [[[0, 0], [6, 0], [0, 9], [6, 9]]],
  0: [[[3, 0], [1, 1.4], [0.4, 4.5], [1, 7.6], [3, 9], [5, 7.6], [5.6, 4.5], [5, 1.4], [3, 0]], [[1.2, 7], [4.8, 2]]],
  1: [[[1.6, 1.8], [3.6, 0], [3.6, 9]], [[1.2, 9], [6, 9]]],
  2: [[[0.6, 2], [1.6, 0.4], [4.2, 0.4], [5.4, 2], [5, 4], [0.4, 9], [5.6, 9]]],
  3: [[[0.6, 1.4], [2.6, 0], [4.8, 1], [4.4, 3.4], [2.4, 4.2]], [[2.4, 4.2], [4.8, 5], [5, 7.6], [3.4, 9], [0.8, 8.2]]],
  4: [[[4.2, 9], [4.2, 0], [0.4, 6.2], [6, 6.2]]],
  5: [[[5.4, 0], [0.8, 0], [0.6, 3.8], [3.2, 3.4], [5.2, 5], [5, 7.8], [3, 9], [0.6, 8]]],
  6: [[[4.8, 1.2], [2.6, 0.4], [1, 2.4], [0.5, 6], [1.6, 8.6], [3.8, 9], [5.4, 7.4], [5.2, 5.2], [3.4, 4], [1, 4.8]]],
  7: [[[0.4, 0], [5.8, 0], [2.6, 9]]],
  8: [[[3, 4.3], [1.2, 3.6], [0.8, 1.6], [2, 0.2], [4, 0.2], [5.2, 1.6], [4.8, 3.6], [3, 4.3]], [[3, 4.3], [1.4, 5.2], [0.6, 7.4], [1.8, 9], [4.2, 9], [5.4, 7.4], [4.6, 5.2], [3, 4.3]]],
  9: [[[1.2, 7.8], [3.4, 8.6], [5, 6.6], [5.5, 3], [4.4, 0.4], [2.2, 0], [0.6, 1.6], [0.8, 3.8], [2.6, 5], [5, 4.2]]],
  ' ': [],
  '.': [[[2.7, 8.6], [3.3, 9.2]]],
  ',': [[[3.2, 7.6], [2.6, 9.6]]],
  '-': [[[1, 4.5], [5, 4.5]]],
  '!': [[[3, 0], [3, 6.2]], [[2.7, 8.4], [3.3, 9]]],
  '?': [[[0.8, 1.8], [2, 0.2], [4.4, 0.4], [5.2, 2.2], [4.4, 4], [3, 4.8], [3, 6.4]], [[2.7, 8.4], [3.3, 9]]],
  "'": [[[3, 0], [2.6, 2.2]]],
  ':': [[[2.7, 2.4], [3.3, 3]], [[2.7, 6.8], [3.3, 7.4]]],
  '/': [[[1, 9], [5.4, 0]]],
  '&': [[[4.8, 8.6], [1.8, 5.4], [1, 3.4], [2.2, 0.6], [4, 0.8], [3.6, 3], [0.8, 5.8], [0.8, 8], [2.6, 9], [5.4, 6.4]]],
  '+': [[[3, 1.6], [3, 7.4]], [[0.8, 4.5], [5.2, 4.5]]],
  '(': [[[4.6, 0], [2.4, 2.6], [2.2, 6.4], [4.6, 9]]],
  ')': [[[1.4, 0], [3.6, 2.6], [3.8, 6.4], [1.4, 9]]],
};

function pointInPath(path, x, y) {
  let inside = false;
  for (const sub of path) {
    for (let i = 0, j = sub.length - 1; i < sub.length; j = i++) {
      const [xi, yi] = sub[i];
      const [xj, yj] = sub[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.min(1, Math.max(0, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export class ShimContext {
  constructor(canvas) {
    this.canvas = canvas;
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.globalAlpha = 1;
    this.lineWidth = 1;
    this.lineJoin = 'miter';
    this.font = '10px sans-serif';
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
    this.path = [];
    this.clipPath = null;
    this.stack = [];
  }
  save() {
    this.stack.push({
      fillStyle: this.fillStyle, strokeStyle: this.strokeStyle,
      globalAlpha: this.globalAlpha, lineWidth: this.lineWidth,
      font: this.font, textAlign: this.textAlign, clipPath: this.clipPath,
    });
  }
  restore() {
    const s = this.stack.pop();
    if (s) Object.assign(this, s);
  }
  beginPath() { this.path = []; }
  moveTo(x, y) { this.path.push([[x, y]]); }
  lineTo(x, y) {
    if (!this.path.length) this.path.push([]);
    this.path[this.path.length - 1].push([x, y]);
  }
  closePath() {
    const sub = this.path[this.path.length - 1];
    if (sub && sub.length > 1) sub.push([...sub[0]]);
  }
  rect(x, y, w, h) {
    this.path.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]);
  }
  arc(cx, cy, r, a0, a1) {
    const pts = [];
    const steps = Math.max(12, Math.floor(Math.abs(a1 - a0) * 10));
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    if (this.path.length && this.path[this.path.length - 1].length) {
      this.path[this.path.length - 1].push(...pts);
    } else {
      this.path.push(pts);
    }
  }
  quadraticCurveTo(cpx, cpy, x, y) {
    const sub = this.path[this.path.length - 1];
    const [sx, sy] = sub[sub.length - 1];
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      sub.push([
        (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cpx + t * t * x,
        (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cpy + t * t * y,
      ]);
    }
  }
  clip() {
    this.clipPath = this.path.map((sub) => sub.map((p) => [...p]));
  }
  blend(x, y, color) {
    const d = this.canvas.data;
    const W = this.canvas.width;
    const i = (y * W + x) * 4;
    const a = Math.min(1, Math.max(0, color[3] * this.globalAlpha));
    d[i] = color[0] * a + d[i] * (1 - a);
    d[i + 1] = color[1] * a + d[i + 1] * (1 - a);
    d[i + 2] = color[2] * a + d[i + 2] * (1 - a);
    d[i + 3] = 255;
  }
  styleColor(style, x, y) {
    if (style instanceof LinearGradient) return style.colorAt(x, y);
    return parseColor(style) || [0, 0, 0, 1];
  }
  inClip(x, y) {
    return !this.clipPath || pointInPath(this.clipPath, x, y);
  }
  fillRect(x, y, w, h) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(W, Math.ceil(x + w));
    const y1 = Math.min(H, Math.ceil(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        if (!this.inClip(px + 0.5, py + 0.5)) continue;
        this.blend(px, py, this.styleColor(this.fillStyle, px, py));
      }
    }
  }
  clearRect(x, y, w, h) {
    const saved = this.fillStyle;
    this.fillStyle = 'rgba(0,0,0,0)';
    this.fillRect(x, y, w, h);
    this.fillStyle = saved;
  }
  strokeRect(x, y, w, h) {
    this.beginPath();
    this.rect(x, y, w, h);
    this.stroke();
  }
  fill() {
    const path = this.path;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const sub of path) for (const [x, y] of sub) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const x0 = Math.max(0, Math.floor(minX));
    const y0 = Math.max(0, Math.floor(minY));
    const x1 = Math.min(this.canvas.width, Math.ceil(maxX));
    const y1 = Math.min(this.canvas.height, Math.ceil(maxY));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        if (!pointInPath(path, px + 0.5, py + 0.5)) continue;
        if (!this.inClip(px + 0.5, py + 0.5)) continue;
        this.blend(px, py, this.styleColor(this.fillStyle, px, py));
      }
    }
  }
  stroke() {
    const half = this.lineWidth / 2;
    const color = parseColor(this.strokeStyle) || [0, 0, 0, 1];
    for (const sub of this.path) {
      for (let i = 0; i + 1 < sub.length; i++) {
        const [x1, y1] = sub[i];
        const [x2, y2] = sub[i + 1];
        const minX = Math.max(0, Math.floor(Math.min(x1, x2) - half - 1));
        const maxX = Math.min(this.canvas.width - 1, Math.ceil(Math.max(x1, x2) + half + 1));
        const minY = Math.max(0, Math.floor(Math.min(y1, y2) - half - 1));
        const maxY = Math.min(this.canvas.height - 1, Math.ceil(Math.max(y1, y2) + half + 1));
        for (let py = minY; py <= maxY; py++) {
          for (let px = minX; px <= maxX; px++) {
            if (distToSegment(px + 0.5, py + 0.5, x1, y1, x2, y2) <= half && this.inClip(px + 0.5, py + 0.5)) {
              this.blend(px, py, color);
            }
          }
        }
      }
    }
  }
  drawImage(src, dx, dy, dw, dh) {
    if (dw === undefined) { dw = src.width; dh = src.height; }
    const W = this.canvas.width;
    const H = this.canvas.height;
    const x0 = Math.max(0, Math.floor(dx));
    const y0 = Math.max(0, Math.floor(dy));
    const x1 = Math.min(W, Math.ceil(dx + dw));
    const y1 = Math.min(H, Math.ceil(dy + dh));
    const sd = src.data;
    const sw = src.width;
    const sh = src.height;
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        if (!this.inClip(px + 0.5, py + 0.5)) continue;
        let sx = ((px - dx) / dw) * sw - 0.5;
        let sy = ((py - dy) / dh) * sh - 0.5;
        sx = Math.min(sw - 1, Math.max(0, sx));
        sy = Math.min(sh - 1, Math.max(0, sy));
        const ix = Math.floor(sx);
        const iy = Math.floor(sy);
        const fx = sx - ix;
        const fy = sy - iy;
        const jx = Math.min(sw - 1, ix + 1);
        const jy = Math.min(sh - 1, iy + 1);
        const at = (xx, yy) => (yy * sw + xx) * 4;
        const out = [0, 0, 0, 1];
        for (let k = 0; k < 3; k++) {
          const top = sd[at(ix, iy) + k] * (1 - fx) + sd[at(jx, iy) + k] * fx;
          const bot = sd[at(ix, jy) + k] * (1 - fx) + sd[at(jx, jy) + k] * fx;
          out[k] = top * (1 - fy) + bot * fy;
        }
        this.blend(px, py, out);
      }
    }
  }
  getImageData(x, y, w, h) {
    const out = new Uint8ClampedArray(w * h * 4);
    for (let row = 0; row < h; row++) {
      const srcAt = ((y + row) * this.canvas.width + x) * 4;
      out.set(this.canvas.data.subarray(srcAt, srcAt + w * 4), row * w * 4);
    }
    return { data: out, width: w, height: h };
  }
  putImageData(imageData, x, y) {
    const { data, width: w, height: h } = imageData;
    for (let row = 0; row < h; row++) {
      const dstAt = ((y + row) * this.canvas.width + x) * 4;
      this.canvas.data.set(data.subarray(row * w * 4, (row + 1) * w * 4), dstAt);
    }
  }
  fontPx() {
    const m = String(this.font).match(/(\d+(?:\.\d+)?)px/);
    return m ? Number(m[1]) : 16;
  }
  measureText(text) {
    const px = this.fontPx();
    let width = 0;
    for (const ch of String(text)) width += px * (ch === ' ' ? 0.34 : 0.60);
    return { width };
  }
  drawGlyphs(text, x, y, width, style) {
    const px = this.fontPx();
    const capH = px * 0.74;
    const scale = capH / 9;
    const advance = px * 0.60;
    const total = this.measureText(text).width;
    let startX = x;
    if (this.textAlign === 'center') startX = x - total / 2;
    else if (this.textAlign === 'right' || this.textAlign === 'end') startX = x - total;
    const top = y - capH;
    let cursor = startX;
    for (const rawCh of String(text)) {
      const ch = rawCh.toUpperCase();
      const glyph = G[ch] || [];
      for (const stroke of glyph) {
        for (let i = 0; i + 1 < stroke.length; i++) {
          const [gx1, gy1] = stroke[i];
          const [gx2, gy2] = stroke[i + 1];
          const x1 = cursor + gx1 * scale;
          const y1 = top + gy1 * scale;
          const x2 = cursor + gx2 * scale;
          const y2 = top + gy2 * scale;
          const half = width / 2;
          const minX = Math.max(0, Math.floor(Math.min(x1, x2) - half - 1));
          const maxX = Math.min(this.canvas.width - 1, Math.ceil(Math.max(x1, x2) + half + 1));
          const minY = Math.max(0, Math.floor(Math.min(y1, y2) - half - 1));
          const maxY = Math.min(this.canvas.height - 1, Math.ceil(Math.max(y1, y2) + half + 1));
          for (let py = minY; py <= maxY; py++) {
            for (let pxx = minX; pxx <= maxX; pxx++) {
              if (distToSegment(pxx + 0.5, py + 0.5, x1, y1, x2, y2) <= half && this.inClip(pxx + 0.5, py + 0.5)) {
                this.blend(pxx, py, this.styleColor(style, pxx, py));
              }
            }
          }
        }
      }
      cursor += rawCh === ' ' ? px * 0.34 : advance;
    }
  }
  fillText(text, x, y) {
    this.drawGlyphs(text, x, y, Math.max(1.6, this.fontPx() * 0.135), this.fillStyle);
  }
  strokeText(text, x, y) {
    this.drawGlyphs(text, x, y, Math.max(2, this.lineWidth), this.strokeStyle);
  }
  createLinearGradient(x0, y0, x1, y1) {
    return new LinearGradient(x0, y0, x1, y1);
  }
  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    return new LinearGradient(x0, y0, x1 + r1, y1);
  }
}

export class ShimCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
    for (let i = 3; i < this.data.length; i += 4) this.data[i] = 255;
    this.ctx = new ShimContext(this);
  }
  getContext(kind) {
    if (kind !== '2d') throw new Error(`unsupported context ${kind}`);
    return this.ctx;
  }
  // toPPM() -> Buffer of a binary PPM, the interchange the JPEG encoder
  // step consumes (kept out of the app itself).
  toPPM() {
    const header = Buffer.from(`P6\n${this.width} ${this.height}\n255\n`);
    const body = Buffer.alloc(this.width * this.height * 3);
    for (let i = 0, j = 0; i < this.data.length; i += 4, j += 3) {
      body[j] = this.data[i];
      body[j + 1] = this.data[i + 1];
      body[j + 2] = this.data[i + 2];
    }
    return Buffer.concat([header, body]);
  }
}

export function createCanvas(width, height) {
  return new ShimCanvas(width, height);
}

// loadRawPhoto(path, width, height) — wrap raw RGB bytes (decoded from a
// sample JPEG by the render script's decode step) as a drawable canvas.
export function canvasFromRawRGB(buffer, width, height) {
  const canvas = new ShimCanvas(width, height);
  for (let i = 0, j = 0; i < canvas.data.length; i += 4, j += 3) {
    canvas.data[i] = buffer[j];
    canvas.data[i + 1] = buffer[j + 1];
    canvas.data[i + 2] = buffer[j + 2];
    canvas.data[i + 3] = 255;
  }
  return canvas;
}
