// cover.js -- the render core of Velvet Hour Cover Studio. Pure canvas
// drawing with no DOM dependency: the same functions draw the live editor
// preview, the exported PNGs and the screenshots. A "graphics env" g only
// needs makeCanvas(w, h); in the browser that is document.createElement,
// in the screenshot script it is the session's software surface.

import { CAST, CREDITS_LINES, REVIEW_QUOTE, REVIEW_SOURCE } from './cast.js';
import { applyGradeToPixels } from './grades.js';

export const FONT_TITLE = (s) => `900 ${s}px Impact, "Arial Black", sans-serif`;
export const FONT_SCRIPT = (s) => `italic 700 ${s}px Georgia, serif`;
export const FONT_TAG = (s) => `700 ${s}px "Arial Narrow", sans-serif`;
export const FONT_SMALL = (s) => `400 ${s}px "Arial Narrow", sans-serif`;

// A panel slot: where a photo goes, which role tag it wears, and its crop.
// crop = { fx, fy } focus point in 0..1 (face-aware default fy ~0.30) and
// zoom >= 1. Slots are fixed per layout; photos can be swapped per slot.
export function defaultSlots() {
  return CAST.map((c) => ({ photoKey: c.id, role: c.role, crop: { fx: 0.5, fy: c.focusY, zoom: 1 } }));
}

// Cover-fit one photo into a w x h offscreen canvas, then grade it, so the
// whole mosaic shares one grade. Returns the canvas.
export function makePanelCanvas(g, img, w, h, crop, gradeId) {
  const c = g.makeCanvas(Math.max(2, Math.round(w)), Math.max(2, Math.round(h)));
  const x = c.getContext('2d');
  const zoom = Math.max(1, crop.zoom || 1);
  const scale = Math.max(w / img.width, h / img.height) * zoom;
  const sw = w / scale, sh = h / scale;
  let sx = (crop.fx ?? 0.5) * img.width - sw / 2;
  let sy = (crop.fy ?? 0.3) * img.height - sh / 2;
  sx = Math.max(0, Math.min(img.width - sw, sx));
  sy = Math.max(0, Math.min(img.height - sh, sy));
  x.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  const data = x.getImageData(0, 0, c.width, c.height);
  applyGradeToPixels(data, gradeId);
  x.putImageData(data, 0, 0);
  return c;
}

function roundRectPath(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.lineTo(px + w - r, py);
  x.arc(px + w - r, py + r, r, -Math.PI / 2, 0);
  x.lineTo(px + w, py + h - r);
  x.arc(px + w - r, py + h - r, r, 0, Math.PI / 2);
  x.lineTo(px + r, py + h);
  x.arc(px + r, py + h - r, r, Math.PI / 2, Math.PI);
  x.lineTo(px, py + r);
  x.arc(px + r, py + r, r, Math.PI, Math.PI * 1.5);
  x.closePath();
}

// A slanted cast role tag pinned to a panel's lower-left corner.
export function drawRoleTag(x, role, px, py, size) {
  x.save();
  x.translate(px, py);
  x.rotate(-0.055);
  x.font = FONT_TAG(size);
  const w = x.measureText(role).width + size * 1.15;
  const h = size * 1.52;
  x.fillStyle = 'rgba(12,6,18,0.92)';
  x.fillRect(0, -h, w, h);
  x.fillStyle = '#ffd23e';
  x.fillRect(0, -h, size * 0.30, h);
  x.fillStyle = '#ffffff';
  x.textAlign = 'left';
  x.textBaseline = 'alphabetic';
  x.fillText(role, size * 0.62, -h * 0.30);
  x.restore();
}

function drawPanel(x, g, state, slot, rect, opts = {}) {
  const img = state.photos[slot.photoKey];
  if (!img) return;
  const panel = makePanelCanvas(g, img, rect.w, rect.h, slot.crop, state.grade);
  x.save();
  roundRectPath(x, rect.x, rect.y, rect.w, rect.h, opts.radius ?? 6);
  x.clip();
  x.drawImage(panel, rect.x, rect.y, rect.w, rect.h);
  x.restore();
  x.strokeStyle = opts.border || '#f3e5c8';
  x.lineWidth = opts.borderWidth || 3;
  roundRectPath(x, rect.x, rect.y, rect.w, rect.h, opts.radius ?? 6);
  x.stroke();
  const tagSize = Math.max(12, Math.min(25, rect.h * 0.085));
  if (opts.tagAt === 'top') {
    drawRoleTag(x, slot.role, rect.x + rect.w * 0.045, rect.y + rect.h * 0.045 + tagSize * 1.52, tagSize);
  } else {
    drawRoleTag(x, slot.role, rect.x + rect.w * 0.045, rect.y + rect.h - rect.h * 0.045, tagSize);
  }
}

// The gold award seal that overlaps the mosaic's right edge.
export function drawSeal(x, cx, cy, r) {
  const grad = x.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  grad.addColorStop(0, '#fff3b0');
  grad.addColorStop(0.55, '#ffd23e');
  grad.addColorStop(1, '#c47f12');
  x.save();
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = grad; x.fill();
  x.lineWidth = r * 0.07; x.strokeStyle = '#8a5a12'; x.stroke();
  x.beginPath(); x.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  x.lineWidth = r * 0.045; x.strokeStyle = 'rgba(120,66,4,0.85)'; x.stroke();
  x.fillStyle = '#5e3a05';
  x.textAlign = 'center';
  x.font = FONT_TAG(r * 0.62);
  x.fillText('★', cx, cy - r * 0.18);
  x.font = FONT_TAG(r * 0.34);
  x.fillText('BEST CREW', cx, cy + r * 0.22);
  x.font = FONT_TAG(r * 0.30);
  x.fillText('2026', cx, cy + r * 0.52);
  x.restore();
}

// A deterministic fake barcode (pattern derived from the title string).
export function drawBarcode(x, px, py, w, h, seedText) {
  x.save();
  x.fillStyle = '#fdfdf8';
  x.fillRect(px, py, w, h);
  let seed = 7;
  for (const ch of seedText) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
  x.fillStyle = '#111111';
  let cx = px + w * 0.06;
  const maxX = px + w * 0.94;
  let i = 0;
  while (cx < maxX) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const bw = 1 + (seed % 4) * (w / 90);
    if (i % 3 !== 2) x.fillRect(cx, py + h * 0.08, bw, h * 0.68);
    cx += bw + w * 0.018;
    i++;
  }
  x.font = `400 ${Math.max(7, h * 0.16)}px monospace`;
  x.textAlign = 'center';
  x.fillText('9 042110 11926', px + w / 2, py + h * 0.95);
  x.restore();
}

// The retro chrome title: dark drop, heavy outline, vertical chrome
// gradient running gold into magenta, lettered over the art.
export function drawChromeTitle(x, title, cx, baseline, maxW, size) {
  x.save();
  x.textAlign = 'center';
  x.textBaseline = 'alphabetic';
  let s = size;
  x.font = FONT_TITLE(s);
  while (x.measureText(title).width > maxW && s > 18) {
    s *= 0.94;
    x.font = FONT_TITLE(s);
  }
  const grad = x.createLinearGradient(0, baseline - s * 0.92, 0, baseline + s * 0.08);
  grad.addColorStop(0.0, '#fffbe8');
  grad.addColorStop(0.34, '#ffe259');
  grad.addColorStop(0.50, '#ffb347');
  grad.addColorStop(0.58, '#ff7847');
  grad.addColorStop(0.76, '#e83e8c');
  grad.addColorStop(1.0, '#7b2d8b');
  x.fillStyle = 'rgba(24,4,32,0.55)';
  x.fillText(title, cx, baseline + s * 0.05);
  x.lineJoin = 'round';
  x.lineWidth = s * 0.16;
  x.strokeStyle = '#2a0a2e';
  x.strokeText(title, cx, baseline);
  x.fillStyle = grad;
  x.fillText(title, cx, baseline);
  x.restore();
  return s;
}

function drawReviewStrip(x, W, H) {
  const y = H * 0.052;
  x.save();
  x.textBaseline = 'alphabetic';
  x.font = FONT_TAG(Math.max(13, H * 0.024));
  x.fillStyle = '#ffd23e';
  x.textAlign = 'left';
  x.fillText('★★★★★', W * 0.028, y);
  const starW = x.measureText('★★★★★').width;
  x.fillStyle = '#f5ead6';
  x.font = FONT_TAG(Math.max(12, H * 0.022));
  x.fillText(`${REVIEW_QUOTE}  —  ${REVIEW_SOURCE}`, W * 0.028 + starW + 34, y);
  x.textAlign = 'right';
  x.fillStyle = '#ffd23e';
  x.font = FONT_TAG(Math.max(12, H * 0.022));
  const label = 'VOL. 1';
  const lw = x.measureText(label).width + 18;
  x.strokeStyle = '#ffd23e';
  x.lineWidth = 1.6;
  x.strokeRect(W * 0.972 - lw, y - H * 0.026, lw, H * 0.034);
  x.fillText(label, W * 0.972 - 9, y);
  x.restore();
}

function drawBottomFurniture(x, state, W, H) {
  const narrow = W < H;
  x.save();
  x.textAlign = 'left';
  x.fillStyle = '#ffd9a0';
  x.font = FONT_TAG(Math.max(8, Math.min(H * 0.026, W * 0.020)));
  try { x.letterSpacing = Math.max(1, W * 0.003); } catch { /* older engines */ }
  x.fillText('COMING SOON', W * 0.028, narrow ? H * 0.9495 : H * 0.978);
  try { x.letterSpacing = 0; } catch { /* older engines */ }
  x.textAlign = 'center';
  x.fillStyle = 'rgba(238,220,190,0.88)';
  const cs = Math.max(6, Math.min(H * 0.0155, W * 0.0132));
  const ccx = narrow ? W * 0.5 : W * 0.47;
  x.font = FONT_SMALL(cs + 2);
  x.fillText(CREDITS_LINES[0], ccx, H * 0.958);
  x.font = FONT_SMALL(cs);
  x.fillText(CREDITS_LINES[1], ccx, H * 0.9735);
  x.fillText(CREDITS_LINES[2], ccx, H * 0.989);
  drawBarcode(x, W * 0.895, narrow ? H * 0.916 : H * 0.925, W * 0.077, narrow ? H * 0.048 : H * 0.055, state.title);
  x.restore();
}

function drawTitleBlock(x, state, W, H, mosaicBottom) {
  const cx = W / 2;
  const titleSize = drawChromeTitle(x, state.title, cx, mosaicBottom + H * 0.055, W * 0.92, H * 0.128 * (state.titleScale || 1));
  const scriptY = mosaicBottom + H * 0.055 + titleSize * 0.52;
  x.save();
  x.textAlign = 'center';
  x.font = FONT_SCRIPT(Math.max(17, H * 0.047));
  x.fillStyle = '#ff5da2';
  if ('__glow' in x) x.__glow = { color: [255, 45, 149, 190], blur: Math.max(4, H * 0.008) };
  x.fillText(state.subtitle, cx, scriptY);
  if ('__glow' in x) x.__glow = null;
  x.restore();
  // tagline ribbon, slanted, under the script line
  x.font = FONT_TAG(Math.max(11, H * 0.020));
  const rw = Math.min(W * 0.56, x.measureText(state.tagline).width + 90);
  const rh = Math.max(20, H * 0.034);
  const ry = scriptY + H * 0.014;
  x.save();
  x.translate(cx, ry);
  x.rotate(-0.018);
  x.fillStyle = '#3d0f38';
  x.fillRect(-rw / 2, 0, rw, rh);
  x.fillStyle = '#ffd23e';
  x.font = FONT_TAG(Math.max(11, H * 0.020));
  x.textAlign = 'center';
  try { x.letterSpacing = 2; } catch { /* older engines */ }
  x.fillText(state.tagline, 0, rh * 0.70);
  x.restore();
  return ry + rh;
}

// Panel rectangles for the cast mosaic at a given canvas size. The hero
// (slot 0) also gets an expanded pop-out rectangle drawn over its frame.
export function mosaicGeometry(W, H) {
  const mx = W * 0.026;
  const top = H * 0.098;
  const bottom = H * (H > W ? 0.775 : 0.775);
  const gap = Math.max(6, W * 0.007);
  const leftW = W * 0.198;
  const heroW = W * 0.330;
  const rightX = mx + leftW + gap + heroW + gap;
  const rightW = W - mx - rightX;
  const mh = bottom - top;
  const slots = [];
  // left column: driver (1), ghost (5)
  slots[1] = { x: mx, y: top, w: leftW, h: mh * 0.52 };
  slots[5] = { x: mx, y: top + mh * 0.52 + gap, w: leftW, h: mh * 0.48 - gap };
  // hero column: boss (0) over wheelman strip (7)
  const heroX = mx + leftW + gap;
  slots[0] = { x: heroX, y: top, w: heroW, h: mh * 0.74 };
  slots[7] = { x: heroX, y: top + mh * 0.74 + gap, w: heroW, h: mh * 0.26 - gap };
  // right grid: siren (2), fixer (3) / captain (4), ledger (6)
  const colW = (rightW - gap) / 2;
  const rowH = (mh - gap) / 2;
  slots[2] = { x: rightX, y: top, w: colW, h: rowH };
  slots[3] = { x: rightX + colW + gap, y: top, w: colW, h: rowH };
  slots[4] = { x: rightX, y: top + rowH + gap, w: colW, h: rowH };
  slots[6] = { x: rightX + colW + gap, y: top + rowH + gap, w: colW, h: rowH };
  const hero = slots[0];
  const pop = {
    x: hero.x - W * 0.016, y: top - H * 0.030,
    w: hero.w + W * 0.032, h: hero.h + H * 0.030,
  };
  return { slots, pop, top, bottom };
}

function simpleLayoutSlots(layout, W, H) {
  const mx = W * 0.05, top = H * 0.10, bottom = H * 0.72, gap = W * 0.012;
  const w = W - mx * 2, h = bottom - top;
  if (layout === 'hero-strip') {
    const slots = [{ x: mx, y: top, w, h: h * 0.64 }];
    const sw = (w - gap * 2) / 3;
    for (let i = 0; i < 3; i++) slots.push({ x: mx + i * (sw + gap), y: top + h * 0.64 + gap, w: sw, h: h * 0.36 - gap });
    return slots;
  }
  if (layout === 'grid') {
    const slots = [];
    const sw = (w - gap) / 2, sh = (h - gap) / 2;
    for (let i = 0; i < 4; i++) slots.push({ x: mx + (i % 2) * (sw + gap), y: top + Math.floor(i / 2) * (sh + gap), w: sw, h: sh });
    return slots;
  }
  // duet: two panels, the second dropped and overlapping
  return [
    { x: mx, y: top, w: w * 0.56, h: h * 0.82 },
    { x: mx + w * 0.44, y: top + h * 0.18, w: w * 0.56, h: h * 0.82 },
  ];
}

// Draw one full cover. state = { title, subtitle, tagline, grade, layout,
// slots, photos } where photos maps photoKey -> image/canvas.
export function renderCover(x, g, state, W, H) {
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1b0f2e');
  bg.addColorStop(0.55, '#2a1138');
  bg.addColorStop(1, '#170a26');
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);
  drawReviewStrip(x, W, H);

  if (state.layout === 'mosaic') {
    const geo = mosaicGeometry(W, H);
    for (let i = 0; i < state.slots.length; i++) {
      if (i === 0) continue; // hero drawn last, popped out
      drawPanel(x, g, state, state.slots[i], geo.slots[i], (i === 7 || i === 4 || i === 5) ? { tagAt: 'top' } : {});
    }
    // unified warm wash + vignette over the mosaic
    const wash = x.createLinearGradient(0, geo.top, 0, geo.bottom);
    wash.addColorStop(0, 'rgba(255,150,50,0.10)');
    wash.addColorStop(1, 'rgba(140,20,90,0.12)');
    x.fillStyle = wash;
    x.fillRect(W * 0.02, geo.top - 4, W * 0.96, geo.bottom - geo.top + 8);
    // pop-out hero: shadow, then the hero portrait breaking the frame
    x.save();
    x.fillStyle = 'rgba(5,2,10,0.5)';
    roundRectPath(x, geo.pop.x + W * 0.008, geo.pop.y + H * 0.012, geo.pop.w, geo.pop.h, 8);
    x.fill();
    x.restore();
    drawPanel(x, g, state, state.slots[0], geo.pop, { radius: 8, border: '#f7ead2', borderWidth: 5 });
    drawTitleBlock(x, state, W, H, geo.bottom);
    drawSeal(x, W * 0.918, geo.top + (geo.bottom - geo.top) * 0.47, Math.min(W, H) * 0.062);
  } else {
    const rects = simpleLayoutSlots(state.layout, W, H);
    rects.forEach((rect, i) => {
      if (state.slots[i]) drawPanel(x, g, state, state.slots[i], rect);
    });
    drawTitleBlock(x, state, W, H, H * 0.72);
    drawSeal(x, W * 0.93, H * 0.16, Math.min(W, H) * 0.05);
  }
  drawBottomFurniture(x, state, W, H);
}
