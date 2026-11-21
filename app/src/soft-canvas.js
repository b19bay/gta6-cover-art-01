// Software canvas backend: a small Canvas2D-subset rasteriser over a pixel buffer, so the
// screenshot driver can run the exact same render core in Node that the browser runs on a
// native canvas. Text is rasterised from the machine's own system sans fonts (parsed here
// from their TrueType outlines); nothing from this file is loaded by the browser app.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Parses a CSS colour (#rgb, #rrggbb, rgb(), rgba(), named basics) to [r, g, b, a]. */
export function parseColor(value) {
  if (Array.isArray(value)) return value;
  const s = String(value).trim().toLowerCase();
  if (s === 'transparent') return [0, 0, 0, 0];
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16), 1];
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 1];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map((p) => parseFloat(p));
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }
  return [0, 0, 0, 1];
}

export class SoftGradient {
  constructor(x0, y0, x1, y1) {
    this.x0 = x0; this.y0 = y0; this.x1 = x1; this.y1 = y1;
    this.stops = [];
  }
  addColorStop(offset, color) {
    this.stops.push({ offset: Math.min(1, Math.max(0, offset)), color: parseColor(color) });
    this.stops.sort((a, b) => a.offset - b.offset);
  }
  colorAt(px, py) {
    const dx = this.x1 - this.x0, dy = this.y1 - this.y0;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((px - this.x0) * dx + (py - this.y0) * dy) / len2;
    t = Math.min(1, Math.max(0, t));
    const stops = this.stops;
    if (!stops.length) return [0, 0, 0, 1];
    if (t <= stops[0].offset) return stops[0].color;
    if (t >= stops[stops.length - 1].offset) return stops[stops.length - 1].color;
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i].offset) {
        const a = stops[i - 1], b = stops[i];
        const f = (t - a.offset) / ((b.offset - a.offset) || 1);
        return [
          a.color[0] + (b.color[0] - a.color[0]) * f,
          a.color[1] + (b.color[1] - a.color[1]) * f,
          a.color[2] + (b.color[2] - a.color[2]) * f,
          a.color[3] + (b.color[3] - a.color[3]) * f,
        ];
      }
    }
    return stops[stops.length - 1].color;
  }
}

/** Minimal TrueType reader: cmap format 4, hmtx advances, glyf outlines (simple + composite). */
export class TrueTypeFont {
  constructor(buffer) {
    this.data = buffer;
    const u16 = (o) => buffer.readUInt16BE(o);
    const u32 = (o) => buffer.readUInt32BE(o);
    const tables = {};
    const count = u16(4);
    for (let i = 0; i < count; i++) {
      const rec = 12 + i * 16;
      tables[buffer.toString('ascii', rec, rec + 4)] = { offset: u32(rec + 8), length: u32(rec + 12) };
    }
    this.unitsPerEm = u16(tables.head.offset + 18);
    this.indexToLocFormat = buffer.readInt16BE(tables.head.offset + 50);
    this.numGlyphs = u16(tables.maxp.offset + 4);
    this.numHMetrics = u16(tables.hhea.offset + 34);
    this.hmtx = tables.hmtx.offset;
    this.loca = tables.loca.offset;
    this.glyf = tables.glyf.offset;
    // cmap format 4
    const cmap = tables.cmap.offset;
    let fmt4 = 0;
    const nSub = u16(cmap + 2);
    for (let i = 0; i < nSub; i++) {
      const off = u32(cmap + 8 + i * 8);
      if (u16(cmap + off) === 4) { fmt4 = cmap + off; break; }
    }
    const segCount = u16(fmt4 + 6) / 2;
    this.segCount = segCount;
    this.endCodes = fmt4 + 14;
    this.startCodes = this.endCodes + 2 * segCount + 2;
    this.idDeltas = this.startCodes + 2 * segCount;
    this.idRangeOffsets = this.idDeltas + 2 * segCount;
    this.fmt4 = fmt4;
    this.outlineCache = new Map();
  }
  glyphIndex(code) {
    const u16 = (o) => this.data.readUInt16BE(o);
    for (let i = 0; i < this.segCount; i++) {
      const end = u16(this.endCodes + i * 2);
      if (code <= end) {
        const start = u16(this.startCodes + i * 2);
        if (code < start) return 0;
        const delta = this.data.readInt16BE(this.idDeltas + i * 2);
        const rangeOff = u16(this.idRangeOffsets + i * 2);
        if (rangeOff === 0) return (code + delta) & 0xffff;
        const glyphOff = this.idRangeOffsets + i * 2 + rangeOff + (code - start) * 2;
        const g = u16(glyphOff);
        return g === 0 ? 0 : (g + delta) & 0xffff;
      }
    }
    return 0;
  }
  advance(glyph) {
    const g = Math.min(glyph, this.numHMetrics - 1);
    return this.data.readUInt16BE(this.hmtx + g * 4);
  }
  glyphOffset(glyph) {
    if (this.indexToLocFormat === 1) return this.glyf + this.data.readUInt32BE(this.loca + glyph * 4);
    return this.glyf + this.data.readUInt16BE(this.loca + glyph * 2) * 2;
  }
  glyphEnd(glyph) {
    if (this.indexToLocFormat === 1) return this.glyf + this.data.readUInt32BE(this.loca + (glyph + 1) * 4);
    return this.glyf + this.data.readUInt16BE(this.loca + (glyph + 1) * 2) * 2;
  }
  /** Outline of a glyph as contours of [x, y, onCurve] points in font units. */
  outline(glyph) {
    if (this.outlineCache.has(glyph)) return this.outlineCache.get(glyph);
    const start = this.glyphOffset(glyph);
    const end = this.glyphEnd(glyph);
    let contours = [];
    if (end > start) contours = this.readGlyph(start, 0);
    this.outlineCache.set(glyph, contours);
    return contours;
  }
  readGlyph(off, depth) {
    const d = this.data;
    const i16 = (o) => d.readInt16BE(o);
    const u16 = (o) => d.readUInt16BE(o);
    const numContours = i16(off);
    if (numContours < 0) {
      // Composite glyph: gather transformed component outlines.
      let p = off + 10;
      const out = [];
      for (;;) {
        const flags = u16(p);
        const comp = u16(p + 2);
        p += 4;
        let dx = 0, dy = 0, sx = 1, sy = 1;
        if (flags & 0x0001) { dx = i16(p); dy = i16(p + 2); p += 4; }
        else { dx = d.readInt8(p); dy = d.readInt8(p + 1); p += 2; }
        if (flags & 0x0008) { sx = i16(p) / 16384; sy = sx; p += 2; }
        else if (flags & 0x0040) { sx = i16(p) / 16384; sy = i16(p + 2) / 16384; p += 4; }
        else if (flags & 0x0080) { p += 8; }
        const sub = depth < 4 ? this.readGlyph(this.glyphOffset(comp), depth + 1) : [];
        for (const contour of sub) out.push(contour.map(([x, y, on]) => [x * sx + dx, y * sy + dy, on]));
        if (!(flags & 0x0020)) break;
      }
      return out;
    }
    const endPts = [];
    for (let i = 0; i < numContours; i++) endPts.push(u16(off + 10 + i * 2));
    const total = numContours ? endPts[numContours - 1] + 1 : 0;
    let p = off + 10 + numContours * 2;
    const instrLen = u16(p);
    p += 2 + instrLen;
    const flagsArr = [];
    while (flagsArr.length < total) {
      const f = d[p++];
      flagsArr.push(f);
      if (f & 0x08) { const rep = d[p++]; for (let i = 0; i < rep; i++) flagsArr.push(f); }
    }
    const xs = [];
    let x = 0;
    for (let i = 0; i < total; i++) {
      const f = flagsArr[i];
      if (f & 0x02) { x += (f & 0x10) ? d[p++] : -d[p++]; }
      else if (!(f & 0x10)) { x += i16(p); p += 2; }
      xs.push(x);
    }
    const ys = [];
    let y = 0;
    for (let i = 0; i < total; i++) {
      const f = flagsArr[i];
      if (f & 0x04) { y += (f & 0x20) ? d[p++] : -d[p++]; }
      else if (!(f & 0x20)) { y += i16(p); p += 2; }
      ys.push(y);
    }
    const contours = [];
    let first = 0;
    for (let c = 0; c < numContours; c++) {
      const contour = [];
      for (let i = first; i <= endPts[c]; i++) contour.push([xs[i], ys[i], (flagsArr[i] & 0x01) !== 0]);
      contours.push(contour);
      first = endPts[c] + 1;
    }
    return contours;
  }
}

/** Loads the system sans family used by the screenshot backend (never shipped). */
export function loadSystemFonts(fontDir) {
  const dir = fontDir || '/usr/share/fonts/truetype/liberation';
  const read = (name) => new TrueTypeFont(readFileSync(join(dir, name)));
  return {
    regular: read('LiberationSans-Regular.ttf'),
    bold: read('LiberationSans-Bold.ttf'),
    italic: read('LiberationSans-Italic.ttf'),
    boldItalic: read('LiberationSans-BoldItalic.ttf'),
  };
}

function flattenContour(contour) {
  // Expands a TrueType contour (on/off-curve points) into a plain point list: implied
  // on-curve points are inserted between consecutive off-curve points, the sequence is
  // rotated to start on-curve, and each quadratic segment is sampled into line points.
  const n = contour.length;
  if (!n) return [];
  const seq = [];
  for (let i = 0; i < n; i++) {
    const p = contour[i];
    seq.push(p);
    const next = contour[(i + 1) % n];
    if (!p[2] && !next[2]) seq.push([(p[0] + next[0]) / 2, (p[1] + next[1]) / 2, true]);
  }
  let start = 0;
  while (start < seq.length && !seq[start][2]) start++;
  if (start === seq.length) return [];
  const rot = seq.slice(start).concat(seq.slice(0, start));
  const pts = [[rot[0][0], rot[0][1]]];
  for (let i = 1; i < rot.length; i++) {
    const p = rot[i];
    if (p[2]) {
      pts.push([p[0], p[1]]);
    } else {
      const end = rot[(i + 1) % rot.length];
      const from = pts[pts.length - 1];
      for (let s = 1; s <= 8; s++) {
        const t = s / 8, mt = 1 - t;
        pts.push([
          mt * mt * from[0] + 2 * mt * t * p[0] + t * t * end[0],
          mt * mt * from[1] + 2 * mt * t * p[1] + t * t * end[1],
        ]);
      }
      i++; // the segment's end point was the last sample
    }
  }
  return pts;
}

function spansForPolys(polys, y) {
  // Nonzero-winding horizontal spans of a polygon set at scanline y.
  const crossings = [];
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      if (y1 === y2) continue;
      const lo = Math.min(y1, y2), hi = Math.max(y1, y2);
      if (y < lo || y >= hi) continue;
      const x = x1 + ((y - y1) / (y2 - y1)) * (x2 - x1);
      crossings.push([x, y2 > y1 ? 1 : -1]);
    }
  }
  crossings.sort((a, b) => a[0] - b[0]);
  const spans = [];
  let winding = 0, startX = 0;
  for (const [x, dir] of crossings) {
    if (winding === 0) startX = x;
    winding += dir;
    if (winding === 0) spans.push([startX, x]);
  }
  return spans;
}

function intersectSpans(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i][0], b[j][0]);
    const hi = Math.min(a[i][1], b[j][1]);
    if (hi > lo) out.push([lo, hi]);
    if (a[i][1] < b[j][1]) i++; else j++;
  }
  return out;
}

export class SoftContext {
  constructor(canvas, fonts) {
    this.canvas = canvas;
    this.fonts = fonts;
    this.data = canvas.data;
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctm = [1, 0, 0, 1, 0, 0];
    this.clipSets = [];
    this.path = [];
    this.current = null;
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.lineJoin = 'miter';
    this.globalAlpha = 1;
    this.font = '400 16px sans-serif';
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
    this.shadowColor = 'transparent';
    this.shadowBlur = 0;
    this.shadowOffsetX = 0;
    this.shadowOffsetY = 0;
    this.stack = [];
  }
  save() {
    this.stack.push({
      ctm: [...this.ctm], clipSets: this.clipSets, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth, lineJoin: this.lineJoin, globalAlpha: this.globalAlpha, font: this.font,
      textAlign: this.textAlign, textBaseline: this.textBaseline, shadowColor: this.shadowColor,
      shadowBlur: this.shadowBlur, shadowOffsetX: this.shadowOffsetX, shadowOffsetY: this.shadowOffsetY,
    });
  }
  restore() {
    const s = this.stack.pop();
    if (!s) return;
    Object.assign(this, s);
  }
  translate(x, y) {
    const [a, b, c, d, e, f] = this.ctm;
    this.ctm = [a, b, c, d, e + a * x + c * y, f + b * x + d * y];
  }
  scale(sx, sy) {
    const [a, b, c, d, e, f] = this.ctm;
    this.ctm = [a * sx, b * sx, c * sy, d * sy, e, f];
  }
  rotate(rad) {
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const [a, b, c, d, e, f] = this.ctm;
    this.ctm = [a * cos + c * sin, b * cos + d * sin, -a * sin + c * cos, -b * sin + d * cos, e, f];
  }
  point(x, y) {
    const [a, b, c, d, e, f] = this.ctm;
    return [a * x + c * y + e, b * x + d * y + f];
  }
  beginPath() { this.path = []; this.current = null; }
  moveTo(x, y) { this.current = [this.point(x, y)]; this.path.push(this.current); }
  lineTo(x, y) { if (!this.current) this.moveTo(x, y); else this.current.push(this.point(x, y)); }
  closePath() { if (this.current && this.current.length) this.current.push([...this.current[0]]); }
  quadraticCurveTo(cx, cy, x, y) {
    if (!this.current) this.moveTo(cx, cy);
    const from = this.current[this.current.length - 1];
    const [dcx, dcy] = this.point(cx, cy);
    const [dx, dy] = this.point(x, y);
    // from is already in device space; recompute the start in user space via inverse is overkill:
    // sample with device-space control/end and the device-space start.
    for (let s = 1; s <= 10; s++) {
      const t = s / 10, mt = 1 - t;
      this.current.push([
        mt * mt * from[0] + 2 * mt * t * dcx + t * t * dx,
        mt * mt * from[1] + 2 * mt * t * dcy + t * t * dy,
      ]);
    }
  }
  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
    if (!this.current) this.moveTo(c1x, c1y);
    const from = this.current[this.current.length - 1];
    const [a1x, a1y] = this.point(c1x, c1y);
    const [a2x, a2y] = this.point(c2x, c2y);
    const [dx, dy] = this.point(x, y);
    for (let s = 1; s <= 12; s++) {
      const t = s / 12, mt = 1 - t;
      this.current.push([
        mt ** 3 * from[0] + 3 * mt * mt * t * a1x + 3 * mt * t * t * a2x + t ** 3 * dx,
        mt ** 3 * from[1] + 3 * mt * mt * t * a1y + 3 * mt * t * t * a2y + t ** 3 * dy,
      ]);
    }
  }
  rect(x, y, w, h) {
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }
  ellipse(cx, cy, rx, ry, rotation, startAngle, endAngle) {
    const steps = Math.max(10, Math.min(64, Math.ceil(Math.abs(endAngle - startAngle) / (Math.PI / 16))));
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + ((endAngle - startAngle) * i) / steps;
      const lx = Math.cos(a) * rx, ly = Math.sin(a) * ry;
      const px = cx + lx * Math.cos(rotation) - ly * Math.sin(rotation);
      const py = cy + lx * Math.sin(rotation) + ly * Math.cos(rotation);
      if (i === 0) this.moveTo(px, py); else this.lineTo(px, py);
    }
    if (Math.abs(endAngle - startAngle) >= Math.PI * 2 - 0.001) this.closePath();
  }
  arc(cx, cy, r, s, e) { this.ellipse(cx, cy, r, r, 0, s, e); }
  clip() { this.clipSets = [...this.clipSets, this.path.map((p) => p.map((pt) => [...pt]))]; }
  createLinearGradient(x0, y0, x1, y1) {
    const [dx0, dy0] = this.point(x0, y0);
    const [dx1, dy1] = this.point(x1, y1);
    return new SoftGradient(dx0, dy0, dx1, dy1);
  }
  blend(px, py, color) {
    const a = Math.min(1, Math.max(0, color[3] * this.globalAlpha));
    if (a <= 0) return;
    const idx = (py * this.width + px) * 4;
    const d = this.data;
    d[idx] = color[0] * a + d[idx] * (1 - a);
    d[idx + 1] = color[1] * a + d[idx + 1] * (1 - a);
    d[idx + 2] = color[2] * a + d[idx + 2] * (1 - a);
    d[idx + 3] = Math.max(d[idx + 3], a * 255);
  }
  spansAt(polys, y) {
    let spans = spansForPolys(polys, y);
    for (const set of this.clipSets) spans = intersectSpans(spans, spansForPolys(set, y));
    return spans;
  }
  fillPolys(polys, style) {
    let minY = Infinity, maxY = -Infinity;
    for (const poly of polys) for (const [, y] of poly) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
    const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(this.height - 1, Math.ceil(maxY));
    const isGrad = style instanceof SoftGradient;
    const solid = isGrad ? null : parseColor(style);
    for (let y = y0; y <= y1; y++) {
      const spans = this.spansAt(polys, y + 0.5);
      for (const [sx, ex] of spans) {
        const x0 = Math.max(0, Math.ceil(sx)), x1 = Math.min(this.width - 1, Math.floor(ex - 1e-4));
        for (let x = x0; x <= x1; x++) this.blend(x, y, isGrad ? style.colorAt(x + 0.5, y + 0.5) : solid);
      }
    }
  }
  fill() { this.fillPolys(this.path, this.fillStyle); }
  fillRect(x, y, w, h) {
    const p = [this.point(x, y), this.point(x + w, y), this.point(x + w, y + h), this.point(x, y + h)];
    this.fillPolys([p], this.fillStyle);
  }
  stroke() {
    const half = (this.lineWidth / 2) * this.deviceScale();
    const polys = [];
    for (const sub of this.path) {
      for (let i = 0; i + 1 < sub.length; i++) {
        const [x1, y1] = sub[i], [x2, y2] = sub[i + 1];
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const ox = (-dy / len) * half;
        const oy = (dx / len) * half;
        polys.push([[x1 + ox, y1 + oy], [x2 + ox, y2 + oy], [x2 - ox, y2 - oy], [x1 - ox, y1 - oy]]);
      }
      for (const [vx, vy] of sub) {
        const r = half;
        const joint = [];
        for (let s = 0; s < 10; s++) {
          const a = (s / 10) * Math.PI * 2;
          joint.push([vx + Math.cos(a) * r, vy + Math.sin(a) * r]);
        }
        polys.push(joint);
      }
    }
    this.fillPolys(polys, this.strokeStyle);
  }
  deviceScale() {
    return Math.hypot(this.ctm[0], this.ctm[1]) || 1;
  }
  strokeRect(x, y, w, h) {
    this.beginPath();
    this.rect(x, y, w, h);
    this.stroke();
  }
}

/** Text support on SoftContext: parsing, measuring and rasterising the core's font strings. */
Object.assign(SoftContext.prototype, {
  fontSpec() {
    const m = String(this.font).match(/([\d.]+)px/);
    const size = m ? parseFloat(m[1]) : 16;
    const head = String(this.font).slice(0, m ? m.index : 0);
    const bold = /900|700|bold/.test(head);
    const italic = /italic|oblique/.test(head);
    const font = italic ? (bold ? this.fonts.boldItalic : this.fonts.italic) : (bold ? this.fonts.bold : this.fonts.regular);
    return { size, font };
  },
  textWidth(text, spec) {
    const s = spec || this.fontSpec();
    let total = 0;
    for (const ch of String(text)) total += s.font.advance(s.font.glyphIndex(ch.codePointAt(0))) * (s.size / s.font.unitsPerEm);
    return total;
  },
  measureText(text) { return { width: this.textWidth(text) }; },
  glyphPolys(text, x, y) {
    const spec = this.fontSpec();
    const scaleF = spec.size / spec.font.unitsPerEm;
    const width = this.textWidth(text, spec);
    let startX = x;
    if (this.textAlign === 'center') startX = x - width / 2;
    else if (this.textAlign === 'right' || this.textAlign === 'end') startX = x - width;
    let baseY = y;
    if (this.textBaseline === 'middle') baseY = y + spec.size * 0.35;
    else if (this.textBaseline === 'top') baseY = y + spec.size * 0.8;
    else if (this.textBaseline === 'bottom') baseY = y;
    const polys = [];
    let pen = startX;
    for (const ch of String(text)) {
      const glyph = spec.font.glyphIndex(ch.codePointAt(0));
      const contours = spec.font.outline(glyph);
      for (const contour of contours) {
        const flat = flattenContour(contour);
        if (flat.length > 1) polys.push(flat.map(([gx, gy]) => this.point(pen + gx * scaleF, baseY - gy * scaleF)));
      }
      pen += spec.font.advance(glyph) * scaleF;
    }
    return polys;
  },
  fillText(text, x, y) {
    const polys = this.glyphPolys(text, x, y);
    const shadow = parseColor(this.shadowColor);
    if (shadow[3] > 0 && (this.shadowBlur > 0 || this.shadowOffsetX || this.shadowOffsetY)) {
      const passes = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]];
      const keep = this.fillStyle;
      for (const [ox, oy] of passes) {
        const shifted = polys.map((poly) => poly.map(([px, py]) => [px + this.shadowOffsetX + ox * this.shadowBlur * 0.3, py + this.shadowOffsetY + oy * this.shadowBlur * 0.3]));
        this.fillPolys(shifted, `rgba(${shadow[0]},${shadow[1]},${shadow[2]},${shadow[3] * 0.4})`);
      }
      this.fillStyle = keep;
    }
    this.fillPolys(polys, this.fillStyle);
  },
  strokeText(text, x, y) {
    const polys = this.glyphPolys(text, x, y);
    const savedPath = this.path;
    const savedCurrent = this.current;
    this.path = polys;
    this.stroke();
    this.path = savedPath;
    this.current = savedCurrent;
  },
  drawImage(img, dx, dy, dw, dh) {
    const corners = [this.point(dx, dy), this.point(dx + dw, dy), this.point(dx + dw, dy + dh), this.point(dx, dy + dh)];
    const minX = Math.max(0, Math.floor(Math.min(...corners.map((c) => c[0]))));
    const maxX = Math.min(this.width - 1, Math.ceil(Math.max(...corners.map((c) => c[0]))));
    const minY = Math.max(0, Math.floor(Math.min(...corners.map((c) => c[1]))));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(...corners.map((c) => c[1]))));
    const [a, b, c, d, e, f] = this.ctm;
    const det = a * d - b * c || 1;
    for (let y = minY; y <= maxY; y++) {
      let clipSpans = null;
      if (this.clipSets.length) {
        clipSpans = spansForPolys(this.clipSets[0], y + 0.5);
        for (let i = 1; i < this.clipSets.length; i++) clipSpans = intersectSpans(clipSpans, spansForPolys(this.clipSets[i], y + 0.5));
      }
      for (let x = minX; x <= maxX; x++) {
        if (clipSpans && !clipSpans.some(([s0, s1]) => x + 0.5 >= s0 && x + 0.5 < s1)) continue;
        const ux = ((x + 0.5 - e) * d - (y + 0.5 - f) * c) / det;
        const uy = (a * (y + 0.5 - f) - b * (x + 0.5 - e)) / det;
        const u = (ux - dx) / dw, v = (uy - dy) / dh;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
        const sx = Math.min(img.width - 1, Math.max(0, Math.floor(u * img.width)));
        const sy = Math.min(img.height - 1, Math.max(0, Math.floor(v * img.height)));
        const idx = (sy * img.width + sx) * 4;
        this.blend(x, y, [img.data[idx], img.data[idx + 1], img.data[idx + 2], img.data[idx + 3] / 255]);
      }
    }
  },
});

/** Creates a software canvas of the given size, driven by the given system fonts. */
export function createSoftCanvas(width, height, fonts) {
  const canvas = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  canvas.ctx = new SoftContext(canvas, fonts);
  canvas.getContext = () => canvas.ctx;
  return canvas;
}
