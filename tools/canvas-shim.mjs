// A small Canvas2D-compatible rasteriser in pure JavaScript, just complete
// enough to run Velvet Hour's render core (app/src/*.js) under Node for the
// app's screenshots. Photo decoding, text masks and JPEG encoding are the
// platform's job (the browser does them natively); here tools/raster.py
// plays that role. Every composition decision stays in the app's code.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RASTER_PY = new URL("./raster.py", import.meta.url).pathname;
const SCRATCH = mkdtempSync(join(new URL(".", import.meta.url).pathname, ".scratch-"));
let scratchN = 0;

function py(args) {
  return execFileSync("python3", [RASTER_PY, ...args], { encoding: "utf8" }).trim();
}

export function decodeJpeg(path) {
  const rawPath = join(SCRATCH, "dec" + scratchN++ + ".raw");
  const out = py(["decode", path, rawPath]);
  const [w, h] = out.split(/\s+/).map(Number);
  const data = new Uint8ClampedArray(readFileSync(rawPath));
  return new RasterImage(w, h, data);
}

export function encodeJpeg(canvas, outPath, quality) {
  const rawPath = join(SCRATCH, "enc" + scratchN++ + ".raw");
  writeFileSync(rawPath, Buffer.from(canvas.data.buffer, canvas.data.byteOffset, canvas.data.byteLength));
  py(["encode", rawPath, String(canvas.width), String(canvas.height), outPath, String(quality)]);
}

export class RasterImage {
  constructor(width, height, data) {
    this.width = width;
    this.height = height;
    this.data = data || new Uint8ClampedArray(width * height * 4);
  }
  getContext() {
    if (!this._ctx) this._ctx = new RasterContext(this);
    return this._ctx;
  }
}

export function createCanvas(w, h) {
  return new RasterImage(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

// ------------------------------------------------------------------ colour
const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0] };
export function parseColor(value) {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (NAMED[v]) return NAMED[v];
  if (v.startsWith("#")) {
    const hex = v.slice(1);
    if (hex.length === 3) return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16), 1];
    if (hex.length === 6) return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 1];
    if (hex.length === 8) return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), parseInt(hex.slice(6, 8), 16) / 255];
    return [0, 0, 0, 1];
  }
  const m = v.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(",").map((s) => Number(s.trim()));
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }
  return [0, 0, 0, 1];
}

class Gradient {
  constructor(kind, x0, y0, x1, y1, r0, r1) {
    this.kind = kind;
    this.x0 = x0; this.y0 = y0; this.x1 = x1; this.y1 = y1;
    this.r0 = r0 || 0; this.r1 = r1 || 0;
    this.stops = [];
  }
  addColorStop(t, color) {
    this.stops.push([Math.max(0, Math.min(1, t)), parseColor(color)]);
    this.stops.sort((a, b) => a[0] - b[0]);
  }
  colorAt(x, y) {
    let t;
    if (this.kind === "radial") {
      const d = Math.hypot(x - this.x0, y - this.y0);
      t = (d - this.r0) / Math.max(1e-6, this.r1 - this.r0);
    } else {
      const dx = this.x1 - this.x0;
      const dy = this.y1 - this.y0;
      const len2 = dx * dx + dy * dy || 1;
      t = ((x - this.x0) * dx + (y - this.y0) * dy) / len2;
    }
    t = Math.max(0, Math.min(1, t));
    const s = this.stops;
    if (!s.length) return [0, 0, 0, 1];
    if (t <= s[0][0]) return s[0][1];
    for (let i = 1; i < s.length; i++) {
      if (t <= s[i][0]) {
        const k = (t - s[i - 1][0]) / Math.max(1e-6, s[i][0] - s[i - 1][0]);
        const a = s[i - 1][1];
        const b = s[i][1];
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
      }
    }
    return s[s.length - 1][1];
  }
}

// ------------------------------------------------------------------- fonts
const FONT_DIRS = [
  "/usr/share/fonts/truetype/liberation/",
  "/usr/share/fonts/truetype/dejavu/",
];
function fontFile(family, bold, italic, mono) {
  let names;
  if (mono) names = bold ? ["LiberationMono-Bold.ttf"] : ["LiberationMono-Regular.ttf", "DejaVuSansMono.ttf"];
  else if (family === "serif") names = italic
    ? ["LiberationSerif-Italic.ttf", "LiberationSerif-Regular.ttf", "DejaVuSerif.ttf"]
    : ["LiberationSerif-Bold.ttf", "DejaVuSerif-Bold.ttf"];
  else if (bold && italic) names = ["LiberationSans-BoldItalic.ttf", "LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf"];
  else if (bold) names = ["LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf"];
  else if (italic) names = ["LiberationSans-Italic.ttf", "LiberationSans-Regular.ttf", "DejaVuSans.ttf"];
  else names = ["LiberationSans-Regular.ttf", "DejaVuSans.ttf"];
  for (const name of names) {
    for (const dir of FONT_DIRS) {
      if (existsSync(dir + name)) return dir + name;
    }
  }
  return FONT_DIRS[1] + "DejaVuSans.ttf";
}

function parseFont(font) {
  const m = String(font).match(/(\d+(?:\.\d+)?)px/);
  const size = m ? Number(m[1]) : 16;
  const lower = String(font).toLowerCase();
  const bold = /900|800|700|bold/.test(lower);
  const italic = /italic|oblique/.test(lower);
  const mono = /courier|mono/.test(lower);
  const serif = /serif|script|cursive/.test(lower) && !/sans/.test(lower.replace(/sans-serif/g, ""));
  return { size, file: fontFile(serif ? "serif" : "sans", bold, italic, mono) };
}

const measureCache = new Map();
function textWidth(font, text) {
  const key = font.file + "|" + font.size + "|" + text;
  if (!measureCache.has(key)) {
    measureCache.set(key, Number(py(["measure", font.file, String(Math.round(font.size)), text])) * (font.size / Math.round(font.size)));
  }
  return measureCache.get(key);
}

const maskCache = new Map();
function textMask(font, text, strokePx) {
  const kind = strokePx > 0 ? "stroke" : "fill";
  const key = font.file + "|" + font.size + "|" + kind + strokePx + "|" + text;
  if (maskCache.has(key)) return maskCache.get(key);
  const rawPath = join(SCRATCH, "mask" + scratchN++ + ".raw");
  const out = py(["textmask", font.file, String(Math.round(font.size)), String(Math.round(strokePx)), kind, text, rawPath]);
  const [w, h, left, top, ascent, descent, pad] = out.split(/\s+/).map(Number);
  const scale = font.size / Math.round(font.size);
  const mask = {
    w, h, left: left * scale, top: top * scale, pad: (pad || 6) * scale,
    ascent: ascent * scale, descent: descent * scale,
    data: new Uint8Array(readFileSync(rawPath)),
  };
  maskCache.set(key, mask);
  return mask;
}

// ----------------------------------------------------------------- context
function matMultiply(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}
function matInvert(m) {
  const det = m[0] * m[3] - m[1] * m[2] || 1;
  return [
    m[3] / det, -m[1] / det, -m[2] / det, m[0] / det,
    (m[2] * m[5] - m[3] * m[4]) / det,
    (m[1] * m[4] - m[0] * m[5]) / det,
  ];
}
function matPoint(m, x, y) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

class RasterContext {
  constructor(canvas) {
    this.canvas = canvas;
    this.fillStyle = "#000000";
    this.strokeStyle = "#000000";
    this.lineWidth = 1;
    this.globalAlpha = 1;
    this.font = "16px sans-serif";
    this.textAlign = "left";
    this.textBaseline = "alphabetic";
    this.shadowColor = "rgba(0,0,0,0)";
    this.shadowBlur = 0;
    this.shadowOffsetX = 0;
    this.shadowOffsetY = 0;
    this._m = [1, 0, 0, 1, 0, 0];
    this._clip = null;
    this._path = [];
    this._stack = [];
  }

  save() {
    this._stack.push({
      fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth,
      globalAlpha: this.globalAlpha, font: this.font, textAlign: this.textAlign,
      textBaseline: this.textBaseline, shadowColor: this.shadowColor, shadowBlur: this.shadowBlur,
      shadowOffsetX: this.shadowOffsetX, shadowOffsetY: this.shadowOffsetY,
      m: [...this._m], clip: this._clip ? new Uint8Array(this._clip) : null,
    });
  }
  restore() {
    const s = this._stack.pop();
    if (!s) return;
    Object.assign(this, {
      fillStyle: s.fillStyle, strokeStyle: s.strokeStyle, lineWidth: s.lineWidth,
      globalAlpha: s.globalAlpha, font: s.font, textAlign: s.textAlign, textBaseline: s.textBaseline,
      shadowColor: s.shadowColor, shadowBlur: s.shadowBlur, shadowOffsetX: s.shadowOffsetX,
      shadowOffsetY: s.shadowOffsetY,
    });
    this._m = s.m;
    this._clip = s.clip;
  }
  translate(x, y) { this._m = matMultiply(this._m, [1, 0, 0, 1, x, y]); }
  rotate(a) { const c = Math.cos(a), s = Math.sin(a); this._m = matMultiply(this._m, [c, s, -s, c, 0, 0]); }
  scale(x, y) { this._m = matMultiply(this._m, [x, 0, 0, y, 0, 0]); }

  beginPath() { this._path = []; }
  _sub() {
    if (!this._path.length) this._path.push([]);
    return this._path[this._path.length - 1];
  }
  moveTo(x, y) { this._path.push([matPoint(this._m, x, y)]); }
  lineTo(x, y) { this._sub().push(matPoint(this._m, x, y)); }
  closePath() {
    const sub = this._sub();
    if (sub.length > 1) sub.push([...sub[0]]);
  }
  rect(x, y, w, h) {
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }
  arc(x, y, r, a0, a1) {
    const steps = Math.max(8, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 16)));
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      this.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
  }

  _blend(px, py, color, alphaScale) {
    const { width, height, data } = this.canvas;
    if (px < 0 || py < 0 || px >= width || py >= height) return;
    if (this._clip && !this._clip[py * width + px]) return;
    const a = color[3] * this.globalAlpha * (alphaScale === undefined ? 1 : alphaScale);
    if (a <= 0) return;
    const i = (py * width + px) * 4;
    const ia = 1 - a;
    data[i] = color[0] * a + data[i] * ia;
    data[i + 1] = color[1] * a + data[i + 1] * ia;
    data[i + 2] = color[2] * a + data[i + 2] * ia;
    data[i + 3] = Math.min(255, data[i + 3] + a * 255);
  }

  _styleColor(style, x, y) {
    if (style instanceof Gradient) return style.colorAt(x, y);
    return parseColor(style) || [0, 0, 0, 1];
  }

  _pathMask() {
    const { width, height } = this.canvas;
    const mask = new Uint8Array(width * height);
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (const sub of this._path) for (const [x, y] of sub) {
      minX = Math.min(minX, Math.floor(x)); maxX = Math.max(maxX, Math.ceil(x));
      minY = Math.min(minY, Math.floor(y)); maxY = Math.max(maxY, Math.ceil(y));
    }
    minX = Math.max(0, minX); minY = Math.max(0, minY);
    maxX = Math.min(width - 1, maxX); maxY = Math.min(height - 1, maxY);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        let winding = 0;
        for (const sub of this._path) {
          for (let i = 0; i + 1 < sub.length; i++) {
            const [x0, y0] = sub[i];
            const [x1, y1] = sub[i + 1];
            if (y0 <= y + 0.5 && y1 > y + 0.5 || y1 <= y + 0.5 && y0 > y + 0.5) {
              const xi = x0 + ((y + 0.5 - y0) / (y1 - y0)) * (x1 - x0);
              if (xi > x + 0.5) winding += y1 > y0 ? 1 : -1;
            }
          }
        }
        if (winding !== 0) mask[y * width + x] = 1;
      }
    }
    return mask;
  }

  _shadowActive() {
    const c = parseColor(this.shadowColor);
    return c && c[3] > 0 && (this.shadowOffsetX !== 0 || this.shadowOffsetY !== 0 || this.shadowBlur > 0);
  }

  _paintMask(mask, style, offsetX, offsetY, forcedColor) {
    const { width, height } = this.canvas;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!mask[y * width + x]) continue;
        const tx = x + (offsetX || 0);
        const ty = y + (offsetY || 0);
        const color = forcedColor || this._styleColor(style, tx, ty);
        this._blend(tx, ty, color, 1);
      }
    }
  }

  fill() {
    const mask = this._pathMask();
    if (this._shadowActive()) {
      const sc = parseColor(this.shadowColor);
      this._paintMask(mask, null, Math.round(this.shadowOffsetX), Math.round(this.shadowOffsetY), sc);
      if (this.shadowBlur > 0) {
        const soft = [sc[0], sc[1], sc[2], sc[3] * 0.5];
        this._paintMask(mask, null, Math.round(this.shadowOffsetX) + 2, Math.round(this.shadowOffsetY) + 2, soft);
        this._paintMask(mask, null, Math.round(this.shadowOffsetX) - 2, Math.round(this.shadowOffsetY), soft);
      }
    }
    this._paintMask(mask, this.fillStyle, 0, 0, null);
  }

  stroke() {
    const color = parseColor(this.strokeStyle) || [0, 0, 0, 1];
    const half = Math.max(0.5, this.lineWidth / 2);
    for (const sub of this._path) {
      for (let i = 0; i + 1 < sub.length; i++) {
        const [x0, y0] = sub[i];
        const [x1, y1] = sub[i + 1];
        const len = Math.hypot(x1 - x0, y1 - y0);
        const steps = Math.max(1, Math.ceil(len / (half * 0.6)));
        for (let s = 0; s <= steps; s++) {
          const cx = x0 + ((x1 - x0) * s) / steps;
          const cy = y0 + ((y1 - y0) * s) / steps;
          for (let oy = -Math.ceil(half); oy <= Math.ceil(half); oy++) {
            for (let ox = -Math.ceil(half); ox <= Math.ceil(half); ox++) {
              if (Math.hypot(ox, oy) <= half) this._blend(Math.round(cx + ox), Math.round(cy + oy), color, 1);
            }
          }
        }
      }
    }
  }

  clip() {
    const mask = this._pathMask();
    if (!this._clip) this._clip = mask;
    else for (let i = 0; i < mask.length; i++) this._clip[i] = this._clip[i] & mask[i];
  }

  fillRect(x, y, w, h) {
    const corners = [matPoint(this._m, x, y), matPoint(this._m, x + w, y), matPoint(this._m, x + w, y + h), matPoint(this._m, x, y + h)];
    const saved = this._path;
    this._path = [[...corners, corners[0]]];
    this.fill();
    this._path = saved;
  }
  strokeRect(x, y, w, h) {
    const saved = this._path;
    this.beginPath();
    this.rect(x, y, w, h);
    this.stroke();
    this._path = saved;
  }
  clearRect(x, y, w, h) {
    const { width, data } = this.canvas;
    const [x0, y0] = matPoint(this._m, x, y);
    const [x1, y1] = matPoint(this._m, x + w, y + h);
    for (let py = Math.max(0, Math.floor(Math.min(y0, y1))); py < Math.min(this.canvas.height, Math.ceil(Math.max(y0, y1))); py++) {
      for (let px = Math.max(0, Math.floor(Math.min(x0, x1))); px < Math.min(width, Math.ceil(Math.max(x0, x1))); px++) {
        const i = (py * width + px) * 4;
        data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      }
    }
  }

  createLinearGradient(x0, y0, x1, y1) { return new Gradient("linear", x0, y0, x1, y1); }
  createRadialGradient(x0, y0, r0, x1, y1, r1) { return new Gradient("radial", x0, y0, x1, y1, r0, r1); }

  drawImage(img, ...args) {
    let sx = 0, sy = 0, sw = img.width, sh = img.height, dx, dy, dw, dh;
    if (args.length === 2) { [dx, dy] = args; dw = img.width; dh = img.height; }
    else if (args.length === 4) { [dx, dy, dw, dh] = args; }
    else if (args.length === 8) { [sx, sy, sw, sh, dx, dy, dw, dh] = args; }
    else return;
    const inv = matInvert(this._m);
    const corners = [matPoint(this._m, dx, dy), matPoint(this._m, dx + dw, dy), matPoint(this._m, dx + dw, dy + dh), matPoint(this._m, dx, dy + dh)];
    const minX = Math.max(0, Math.floor(Math.min(...corners.map((c) => c[0]))));
    const maxX = Math.min(this.canvas.width - 1, Math.ceil(Math.max(...corners.map((c) => c[0]))));
    const minY = Math.max(0, Math.floor(Math.min(...corners.map((c) => c[1]))));
    const maxY = Math.min(this.canvas.height - 1, Math.ceil(Math.max(...corners.map((c) => c[1]))));
    const shadow = this._shadowActive();
    const shadowColor = parseColor(this.shadowColor);
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const [ux, uy] = matPoint(inv, px + 0.5, py + 0.5);
        const fx = (ux - dx) / dw;
        const fy = (uy - dy) / dh;
        if (fx < 0 || fy < 0 || fx >= 1 || fy >= 1) continue;
        const srcX = sx + fx * sw;
        const srcY = sy + fy * sh;
        const x0 = Math.floor(srcX), y0 = Math.floor(srcY);
        const x1 = Math.min(img.width - 1, x0 + 1), y1 = Math.min(img.height - 1, y0 + 1);
        const tx = srcX - x0, ty = srcY - y0;
        const sample = (xx, yy) => {
          const i = (yy * img.width + xx) * 4;
          return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3] / 255];
        };
        const a = sample(x0, y0), b = sample(x1, y0), c = sample(x0, y1), d = sample(x1, y1);
        const col = [0, 1, 2, 3].map((k) =>
          (a[k] * (1 - tx) + b[k] * tx) * (1 - ty) + (c[k] * (1 - tx) + d[k] * tx) * ty);
        if (shadow) {
          this._blend(px + Math.round(this.shadowOffsetX), py + Math.round(this.shadowOffsetY),
            [shadowColor[0], shadowColor[1], shadowColor[2], shadowColor[3] * col[3]], 1);
        }
        this._blend(px, py, col, 1);
      }
    }
  }

  getImageData(x, y, w, h) {
    const out = new Uint8ClampedArray(w * h * 4);
    for (let row = 0; row < h; row++) {
      const srcStart = ((y + row) * this.canvas.width + x) * 4;
      out.set(this.canvas.data.subarray(srcStart, srcStart + w * 4), row * w * 4);
    }
    return { data: out, width: w, height: h };
  }
  putImageData(imageData, x, y) {
    const { width, height, data } = imageData;
    for (let row = 0; row < height; row++) {
      const dstStart = ((y + row) * this.canvas.width + x) * 4;
      this.canvas.data.set(data.subarray(row * width * 4, (row + 1) * width * 4), dstStart);
    }
  }

  measureText(text) {
    const font = parseFont(this.font);
    return { width: textWidth(font, String(text)) };
  }

  _textOrigin(text, x, y, strokePx, maxWidth) {
    const font = parseFont(this.font);
    const mask = textMask(font, String(text), strokePx);
    const tw = textWidth(font, String(text));
    const squeeze = maxWidth && tw > maxWidth ? maxWidth / tw : 1;
    // The canvas anchor point, carried through the current transform. (Glyph
    // rotation itself is not rasterised; the position is.)
    const [ax0, ay0] = matPoint(this._m, x, y);
    let ax;
    if (this.textAlign === "center") ax = ax0 - (tw * squeeze) / 2;
    else if (this.textAlign === "right" || this.textAlign === "end") ax = ax0 - tw * squeeze;
    else ax = ax0;
    // Mask pixel (pad, pad) is the anchor: left edge at the ascender top.
    let ay;
    if (this.textBaseline === "top") ay = ay0;
    else if (this.textBaseline === "middle") ay = ay0 - (mask.ascent - mask.descent) / 2;
    else ay = ay0 - mask.ascent; // alphabetic: y is the baseline
    return {
      mask,
      inkX: Math.round(ax - mask.pad),
      inkY: Math.round(ay - mask.pad),
      squeeze,
    };
  }

  _paintText(text, x, y, strokePx, styleOverride, maxWidth, offX, offY) {
    const { mask, inkX, inkY, squeeze } = this._textOrigin(text, x, y, strokePx, maxWidth);
    const style = styleOverride || (strokePx > 0 ? this.strokeStyle : this.fillStyle);
    const destW = Math.max(1, Math.round(mask.w * squeeze));
    for (let row = 0; row < mask.h; row++) {
      for (let col = 0; col < destW; col++) {
        const srcCol = Math.min(mask.w - 1, Math.floor(col / squeeze));
        const a = mask.data[row * mask.w + srcCol] / 255;
        if (a <= 0) continue;
        const px = inkX + col + (offX || 0);
        const py = inkY + row + (offY || 0);
        const color = style instanceof Gradient ? style.colorAt(px, py) : (parseColor(style) || [0, 0, 0, 1]);
        this._blend(px, py, color, a);
      }
    }
  }

  fillText(text, x, y, maxWidth) {
    if (this._shadowActive()) {
      const sc = "rgba(" + Math.round(parseColor(this.shadowColor)[0]) + "," + Math.round(parseColor(this.shadowColor)[1]) + "," + Math.round(parseColor(this.shadowColor)[2]) + "," + parseColor(this.shadowColor)[3] + ")";
      this._paintText(text, x, y, 0, sc, maxWidth, Math.round(this.shadowOffsetX), Math.round(this.shadowOffsetY));
    }
    this._paintText(text, x, y, 0, null, maxWidth, 0, 0);
  }
  strokeText(text, x, y, maxWidth) {
    const strokePx = Math.max(1, Math.round(this.lineWidth));
    this._paintText(text, x, y, strokePx, null, maxWidth, 0, 0);
  }
}
