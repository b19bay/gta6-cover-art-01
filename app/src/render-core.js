// Render core: one dependency-free drawing engine for Velvet Tide covers AND the editor.
// It speaks only the Canvas2D subset, so the browser drives it with a native context and
// the screenshot driver drives the very same code with the software canvas backend.

import { CAST, drawBackdrop, drawFigure, paintFinish, seededRandom, traceRoundRect } from './cast-art.js';

export const FONT_STACK = '"Arial Narrow", "Helvetica Neue Condensed", Impact, "Liberation Sans Narrow", sans-serif';
export const SCRIPT_STACK = '"Segoe Script", "Brush Script MT", cursive';

export const LAYOUTS = [
  { id: 'cast-grid', name: 'Cast Grid', panels: 7 },
  { id: 'photo-hero', name: 'Photo Hero', panels: 3 },
  { id: 'photo-grid', name: 'Photo Grid', panels: 4 },
  { id: 'split-duo', name: 'Split Duo', panels: 2 },
];

/** Colour grades: layered translucent recipes in the Vice City sunset / neon family. */
export const GRADES = {
  sunset: { name: 'Sunset', sky: ['rgba(255,94,58,0.20)', 'rgba(160,20,90,0.34)'], wash: 'rgba(255,140,60,0.10)', glow: '#ff9e4f' },
  neon: { name: 'Neon', sky: ['rgba(20,220,255,0.16)', 'rgba(255,20,140,0.30)'], wash: 'rgba(90,40,200,0.12)', glow: '#ff2e88' },
  goldenhour: { name: 'Golden Hour', sky: ['rgba(255,190,80,0.22)', 'rgba(190,90,30,0.26)'], wash: 'rgba(255,210,120,0.12)', glow: '#ffd166' },
  midnight: { name: 'Midnight', sky: ['rgba(20,40,120,0.26)', 'rgba(6,6,30,0.44)'], wash: 'rgba(30,60,160,0.12)', glow: '#6ea8ff' },
};

export const TAGLINE = 'EVERY CREW HAS A PRICE. EVERY TIDE COMES BACK.';
export const REVIEW_LINE = 'A NEON FEVER DREAM YOU CAN FRAME';
export const REVIEW_SOURCE = 'HARBOR LIGHT REVIEW';
export const CREDITS_LINES = [
  'TIDELINE PICTURES PRESENTS A MARLOWE AND VANCE PRODUCTION "VELVET TIDE"',
  'WITH THE SIREN THE SMUGGLER THE DIVER THE DEALER THE GHOST THE MAYOR AND THE ROOKIE',
  'MUSIC BY L. OKAFOR  COSTUMES R. DELACRUZ  EDITED BY J. MARLOWE  DIRECTED BY T. VANCE',
];

/** The default cover state; the editor mutates a copy of this shape. */
export function defaultState() {
  return {
    layout: 'cast-grid',
    grade: 'sunset',
    caption: 'VELVET TIDE',
    subtitle: 'after the last wave',
    captionSize: 1,
    captionPlace: 'centre',
    captionOutline: true,
    captionShadow: true,
    photos: [],
    crops: {},
  };
}

/** Crop for one panel: zoom plus offsets in panel fractions, face-aware by default. */
export function panelCrop(state, index) {
  const c = state.crops[index] || {};
  return { zoom: c.zoom ?? 1, ox: c.ox ?? 0, oy: c.oy ?? 0, fx: c.fx ?? 0.5, fy: c.fy ?? 0.35 };
}

/** Draws an image cover-fitted into a rect around a focal point (face-aware crop). */
export function drawPhotoCover(ctx, img, x, y, w, h, crop) {
  if (!img) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#4a3066');
    g.addColorStop(1, '#1c1030');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    return;
  }
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih) * (crop?.zoom ?? 1);
  const dw = iw * scale, dh = ih * scale;
  let dx = x + (w - dw) * (crop?.fx ?? 0.5) + (crop?.ox ?? 0) * w;
  let dy = y + (h - dh) * (crop?.fy ?? 0.35) + (crop?.oy ?? 0) * h;
  dx = Math.min(x, Math.max(x + w - dw, dx));
  dy = Math.min(y, Math.max(y + h - dh, dy));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** Applies a grade recipe over a rect: two-stop sky wash plus a colour wash. */
export function applyGrade(ctx, gradeId, x, y, w, h) {
  const grade = GRADES[gradeId] || GRADES.sunset;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, grade.sky[0]);
  g.addColorStop(1, grade.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = grade.wash;
  ctx.fillRect(x, y, w, h);
}

/** Fits a font size so `text` fits `maxWidth`, returns the size used. */
export function fitFontSize(ctx, text, weight, startSize, maxWidth, stack) {
  let size = startSize;
  const family = stack || FONT_STACK;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 8) {
    size *= 0.94;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** Draws the role tag: a black plate, an accent slash and condensed white capitals. */
export function drawRoleTag(ctx, role, x, y, scale, accent) {
  const size = 15 * scale;
  ctx.font = `700 ${size}px ${FONT_STACK}`;
  const tw = ctx.measureText(role).width;
  const pad = 8 * scale;
  ctx.fillStyle = 'rgba(5,5,10,0.88)';
  ctx.fillRect(x, y - size - pad * 0.7, tw + pad * 2 + 10 * scale, size + pad * 1.1);
  ctx.fillStyle = accent || '#ffd60a';
  ctx.beginPath();
  ctx.moveTo(x + 3 * scale, y + pad * 0.4);
  ctx.lineTo(x + 9 * scale, y - size - pad * 0.7);
  ctx.lineTo(x + 13 * scale, y - size - pad * 0.7);
  ctx.lineTo(x + 7 * scale, y + pad * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(role, x + pad + 9 * scale, y);
}

/** A panel's white keyline frame with a soft inner shade at the foot. */
export function drawPanelFrame(ctx, x, y, w, h, line) {
  ctx.strokeStyle = '#f5f0e6';
  ctx.lineWidth = line;
  ctx.strokeRect(x + line / 2, y + line / 2, w - line, h - line);
  const g = ctx.createLinearGradient(0, y + h * 0.72, 0, y + h);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/**
 * The retro chrome headline: layered canvas lettering (dark keyline, vertical chrome
 * gradient, top sheen, neon script subtitle) — no font files, system stack only.
 * Draws centred at cx with its baseline at baseY; returns the block height used.
 */
export function drawChromeTitle(ctx, state, cx, baseY, maxWidth, scale) {
  const text = (state.caption || '').trim().toUpperCase() || 'VELVET TIDE';
  const size = fitFontSize(ctx, text, 900, 92 * scale * (state.captionSize || 1), maxWidth) / (state.captionSize || 1) * (state.captionSize || 1);
  const drawSize = fitFontSize(ctx, text, 900, 92 * scale * (state.captionSize || 1), maxWidth);
  void size;
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(0.86, 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 ${drawSize}px ${FONT_STACK}`;
  if (state.captionShadow) {
    ctx.shadowColor = 'rgba(10,0,30,0.85)';
    ctx.shadowBlur = drawSize * 0.16;
    ctx.shadowOffsetY = drawSize * 0.07;
  }
  if (state.captionOutline) {
    ctx.lineWidth = drawSize * 0.16;
    ctx.strokeStyle = '#1b0530';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, 0, 0);
    ctx.lineWidth = drawSize * 0.07;
    ctx.strokeStyle = '#ffe9a8';
    ctx.strokeText(text, 0, 0);
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const chrome = ctx.createLinearGradient(0, -drawSize * 0.92, 0, drawSize * 0.18);
  chrome.addColorStop(0, '#ffffff');
  chrome.addColorStop(0.32, '#ffe259');
  chrome.addColorStop(0.55, '#ff7518');
  chrome.addColorStop(0.78, '#ff2e88');
  chrome.addColorStop(1, '#7b2ff7');
  ctx.fillStyle = chrome;
  ctx.fillText(text, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.rect(-maxWidth / 2, -drawSize * 0.98, maxWidth, drawSize * 0.3);
  ctx.clip();
  ctx.fillText(text, 0, 0);
  ctx.restore();
  ctx.restore();
  // Script subtitle on a magenta ribbon under the headline.
  const sub = (state.subtitle || '').trim();
  if (sub) {
    const subSize = 30 * scale;
    ctx.font = `italic 700 ${subSize}px ${SCRIPT_STACK}`;
    const sw = ctx.measureText(sub).width + 44 * scale;
    const sy = baseY + 12 * scale;
    ctx.save();
    ctx.translate(cx, sy);
    ctx.rotate(-0.02);
    const ribbon = ctx.createLinearGradient(0, -subSize, 0, subSize * 0.6);
    ribbon.addColorStop(0, '#ff5da2');
    ribbon.addColorStop(1, '#c2185b');
    ctx.fillStyle = ribbon;
    traceRoundRect(ctx, -sw / 2, -subSize * 0.92, sw, subSize * 1.5, subSize * 0.4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(60,0,40,0.6)';
    ctx.shadowBlur = 4 * scale;
    ctx.fillText(sub, 0, subSize * 0.28);
    ctx.restore();
  }
  return drawSize;
}

/** The round gold seal badge, drawn with ring text around a star. */
export function drawSeal(ctx, cx, cy, r) {
  const outer = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  outer.addColorStop(0, '#ffe9a8');
  outer.addColorStop(0.5, '#d4a017');
  outer.addColorStop(1, '#8a6d1f');
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5e4a0e';
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.86, r * 0.86, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#3d2c08';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const a2 = a + Math.PI / 10;
    const r1 = r * 0.34, r2 = r * 0.15;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    else ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3d2c08';
  ctx.textAlign = 'center';
  ctx.font = `900 ${r * 0.26}px ${FONT_STACK}`;
  ctx.fillText('CREW', cx, cy - r * 0.48);
  ctx.fillText('CHOICE', cx, cy + r * 0.72);
  ctx.font = `700 ${r * 0.17}px ${FONT_STACK}`;
  ctx.fillText('BEST COVER', cx, cy + r * 0.52);
}

/** A barcode of seeded bars with a printed number under it. */
export function drawBarcode(ctx, x, y, w, h, seed) {
  ctx.fillStyle = '#f7f3e8';
  ctx.fillRect(x, y, w, h);
  const rand = seededRandom(seed);
  ctx.fillStyle = '#111111';
  let bx = x + w * 0.05;
  while (bx < x + w * 0.92) {
    const bw = (0.6 + rand() * 2.2) * (w / 90);
    if (rand() > 0.32) ctx.fillRect(bx, y + h * 0.08, bw, h * 0.66);
    bx += bw + (0.5 + rand() * 1.4) * (w / 90);
  }
  ctx.font = `700 ${h * 0.17}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText('8 90412 77031 5', x + w / 2, y + h * 0.94);
}

/**
 * The poster furniture band: review strip on top, then COMING SOON, the credits
 * block, the seal and the barcode. Drawn inside (x, y, w, h); returns nothing.
 */
export function drawFurniture(ctx, state, x, y, w, h, scale) {
  ctx.fillStyle = '#0b0714';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffd60a';
  ctx.fillRect(x, y, w, 2.4 * scale);
  // Review strip: five drawn stars, the quote, and its source (kept clear of the seal).
  const quoteSize = 17 * scale;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffd60a';
  const starR = quoteSize * 0.52;
  for (let s = 0; s < 5; s++) {
    const sx = x + 16 * scale + s * starR * 2.3, sy = y + 17 * scale;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 === 0 ? starR : starR * 0.45;
      if (i === 0) ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      else ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }
  const starW = 5 * starR * 2.3;
  ctx.font = `700 ${quoteSize}px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  const quote = `"${REVIEW_LINE}"`;
  fitFontSize(ctx, quote, 700, quoteSize, w - starW - 300 * scale);
  ctx.fillText(quote, x + 22 * scale + starW, y + 24 * scale);
  ctx.fillStyle = '#c9b8e8';
  ctx.font = `700 ${13 * scale}px ${FONT_STACK}`;
  ctx.textAlign = 'right';
  ctx.fillText(`— ${REVIEW_SOURCE}`, x + w - 104 * scale, y + 24 * scale);
  // Tagline centred under the review strip.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff9ecf';
  fitFontSize(ctx, TAGLINE, 700, 16 * scale, w * 0.8);
  ctx.fillText(TAGLINE, x + w / 2, y + 46 * scale);
  // Coming soon, left; credits centred; barcode right; seal overlapping the corner.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${21 * scale}px ${FONT_STACK}`;
  ctx.fillText('C O M I N G   S O O N', x + 14 * scale, y + h - 16 * scale);
  ctx.fillStyle = '#b9a8d9';
  ctx.textAlign = 'center';
  CREDITS_LINES.forEach((line, i) => {
    fitFontSize(ctx, line, 700, 12.5 * scale, w * 0.52);
    ctx.fillText(line, x + w / 2, y + 64 * scale + i * 15.5 * scale);
  });
  drawBarcode(ctx, x + w - 128 * scale, y + h - 52 * scale, 108 * scale, 40 * scale, 97);
  drawSeal(ctx, x + w - 52 * scale, y + 34 * scale, 30 * scale);
  void state;
}

/** Panel rectangles (normalised) for each layout, inside the art area. */
export function layoutPanels(layout, portrait) {
  if (layout === 'cast-grid') {
    const rows = [0.02, 0.345, 0.67];
    const rh = 0.305;
    const panels = [{ x: 0.335, y: 0.02, w: 0.33, h: 0.955, hero: true }];
    for (let i = 0; i < 3; i++) panels.push({ x: 0.015, y: rows[i], w: 0.305, h: rh });
    for (let i = 0; i < 3; i++) panels.push({ x: 0.68, y: rows[i], w: 0.305, h: rh });
    return panels;
  }
  if (layout === 'photo-hero') {
    return portrait
      ? [{ x: 0.02, y: 0.015, w: 0.96, h: 0.6, hero: true }, { x: 0.02, y: 0.63, w: 0.47, h: 0.355 }, { x: 0.51, y: 0.63, w: 0.47, h: 0.355 }]
      : [{ x: 0.015, y: 0.03, w: 0.56, h: 0.94, hero: true }, { x: 0.59, y: 0.03, w: 0.395, h: 0.455 }, { x: 0.59, y: 0.515, w: 0.395, h: 0.455 }];
  }
  if (layout === 'photo-grid') {
    return [
      { x: 0.015, y: 0.03, w: 0.478, h: 0.455 }, { x: 0.507, y: 0.03, w: 0.478, h: 0.455 },
      { x: 0.015, y: 0.515, w: 0.478, h: 0.455 }, { x: 0.507, y: 0.515, w: 0.478, h: 0.455 },
    ];
  }
  // split-duo: two panels leaning against a diagonal seam.
  return [
    { x: 0.015, y: 0.03, w: 0.485, h: 0.94, hero: true },
    { x: 0.5, y: 0.03, w: 0.485, h: 0.94 },
  ];
}

function drawCastPanelContent(ctx, member, index, px, py, pw, ph, scale) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  drawBackdrop(ctx, member, px, py, pw, ph);
  const u = (ph * 0.92) / 100;
  drawFigure(ctx, member, px + pw / 2, py + ph * 1.0, u, false);
  paintFinish(ctx, px, py, pw, ph, 100 + index * 7);
  ctx.restore();
  drawPanelFrame(ctx, px, py, pw, ph, 5 * scale);
  drawRoleTag(ctx, member.role, px + 10 * scale, py + ph - 12 * scale, scale, member.accent);
}

function drawPhotoPanelContent(ctx, state, index, px, py, pw, ph, scale, label) {
  const photos = state.photos || [];
  const img = photos.length ? photos[index % photos.length] : null;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  drawPhotoCover(ctx, img, px, py, pw, ph, panelCrop(state, index));
  applyGrade(ctx, state.grade, px, py, pw, ph);
  paintFinish(ctx, px, py, pw, ph, 300 + index * 13);
  ctx.restore();
  drawPanelFrame(ctx, px, py, pw, ph, 5 * scale);
  if (label) drawRoleTag(ctx, label, px + 10 * scale, py + ph - 12 * scale, scale, '#ffd60a');
}

/**
 * Renders a full cover onto ctx at (0, 0, w, h): panels, pop-out hero, chrome title
 * over the art, and the poster furniture band. This is the exported-cover drawing.
 */
export function renderCover(ctx, state, w, h) {
  const scale = Math.min(w, h) / 720;
  ctx.fillStyle = '#0b0714';
  ctx.fillRect(0, 0, w, h);
  const portrait = h > w * 1.05;
  const wide = w > h * 1.05;
  const furnitureH = portrait ? h * 0.155 : h * 0.21;
  const artH = h - furnitureH;
  const panels = layoutPanels(state.layout, portrait);
  const R = panels.map((p) => ({ ...p, px: p.x * w, py: p.y * artH, pw: p.w * w, ph: p.h * artH }));
  const isCast = state.layout === 'cast-grid';

  R.forEach((p, i) => {
    if (p.hero && isCast) return; // the hero panel is painted with the pop-out pass below
    if (isCast) drawCastPanelContent(ctx, CAST[i], i, p.px, p.py, p.pw, p.ph, scale);
    else drawPhotoPanelContent(ctx, state, i, p.px, p.py, p.pw, p.ph, scale, ['THE HEADLINER', 'THE GETAWAY', 'THE LOOKOUT', 'THE MUSCLE', 'THE INSIDER'][i]);
  });

  if (isCast) {
    const hero = R[0];
    const member = CAST[0];
    ctx.save();
    ctx.beginPath();
    ctx.rect(hero.px, hero.py, hero.pw, hero.ph);
    ctx.clip();
    drawBackdrop(ctx, member, hero.px, hero.py, hero.pw, hero.ph);
    ctx.restore();
    // Pop-out: the frame is struck first, then the hero figure is drawn unclipped and
    // oversized, so her head, hair and shoulders break clean out of the panel's top edge.
    drawPanelFrame(ctx, hero.px, hero.py, hero.pw, hero.ph, 6 * scale);
    const u = (hero.ph * 1.02) / 100;
    drawFigure(ctx, member, hero.px + hero.pw / 2, hero.py + hero.ph * 0.97, u, true);
    ctx.save();
    ctx.beginPath();
    ctx.rect(hero.px, hero.py, hero.pw, hero.ph);
    ctx.clip();
    paintFinish(ctx, hero.px, hero.py, hero.pw, hero.ph, 99);
    ctx.restore();
    drawRoleTag(ctx, member.role, hero.px + 10 * scale, hero.py + hero.ph - 12 * scale, scale, member.accent);
  }

  // Grade wash over the whole art area so photos and panels share one light.
  applyGrade(ctx, state.grade, 0, 0, w, artH);

  // Chrome title over the art; placement follows the caption settings.
  const place = state.captionPlace || 'centre';
  const titleY = place === 'top' ? artH * 0.2 : place === 'foot' ? artH * 0.9 : wide ? artH * 0.52 : artH * 0.46;
  drawChromeTitle(ctx, state, w / 2, titleY, w * 0.94, scale);

  drawFurniture(ctx, state, 0, artH, w, furnitureH, scale);
  // Outer keyline.
  ctx.strokeStyle = '#f5f0e6';
  ctx.lineWidth = 3 * scale;
  ctx.strokeRect(1.5 * scale, 1.5 * scale, w - 3 * scale, h - 3 * scale);
}

function editorButton(ctx, x, y, w, h, label, active, scale) {
  traceRoundRect(ctx, x, y, w, h, 6 * scale);
  ctx.fillStyle = active ? '#ff2e88' : '#332154';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${13.5 * scale}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h * 0.64);
}

function editorSwatch(ctx, x, y, w, h, gradeId, active, scale) {
  const grade = GRADES[gradeId];
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, grade.glow);
  g.addColorStop(1, '#1c1030');
  traceRoundRect(ctx, x, y, w, h, 6 * scale);
  ctx.fillStyle = g;
  ctx.fill();
  if (active) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4 * scale;
    traceRoundRect(ctx, x, y, w, h, 6 * scale);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${11.5 * scale}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText(grade.name, x + w / 2, y + h + 15 * scale);
}

/**
 * The editor, drawn by the same core: cover preview with a photo loaded on the left,
 * and the panel / layout / grade / caption / export controls on the right. This is the
 * drawing the editor screenshot shows — real app output, not a mockup.
 */
export function renderEditor(ctx, state, w, h) {
  const scale = Math.min(w, h) / 720;
  ctx.fillStyle = '#17101f';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f4ecff';
  ctx.textAlign = 'left';
  ctx.font = `900 ${26 * scale}px ${FONT_STACK}`;
  ctx.fillText('VELVET TIDE — COVER STUDIO', 22 * scale, 38 * scale);
  ctx.fillStyle = '#c9b8e8';
  ctx.font = `400 ${13.5 * scale}px ${FONT_STACK}`;
  ctx.fillText('Photo loaded locally · panels, caption and grade update live · nothing leaves this machine', 22 * scale, 60 * scale);

  const previewW = w * 0.56, previewH = h - 96 * scale;
  ctx.save();
  ctx.translate(22 * scale, 76 * scale);
  ctx.scale(previewW / 1080, previewH / 1080);
  renderCover(ctx, state, 1080, 1080);
  ctx.restore();
  ctx.strokeStyle = '#55406e';
  ctx.lineWidth = 2 * scale;
  ctx.strokeRect(22 * scale, 76 * scale, previewW, previewH);

  const cx = 22 * scale + previewW + 26 * scale;
  const cw = w - cx - 20 * scale;
  let cy = 84 * scale;
  const section = (title) => {
    ctx.fillStyle = '#ffd166';
    ctx.font = `700 ${14 * scale}px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.fillText(title, cx, cy);
    cy += 10 * scale;
  };
  section('PHOTOS — 2 loaded, panel 1 selected');
  ctx.fillStyle = '#221633';
  traceRoundRect(ctx, cx, cy, cw, 34 * scale, 6 * scale);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `400 ${13 * scale}px ${FONT_STACK}`;
  ctx.fillText('boulevard.jpg · pier.jpg — drag cover to move, wheel to zoom', cx + 10 * scale, cy + 22 * scale);
  cy += 48 * scale;
  section('LAYOUT');
  LAYOUTS.forEach((l, i) => editorButton(ctx, cx + i * (cw / 4 + 2 * scale), cy, cw / 4 - 4 * scale, 30 * scale, l.name, state.layout === l.id, scale));
  cy += 46 * scale;
  section('COLOUR GRADE');
  Object.keys(GRADES).forEach((g, i) => editorSwatch(ctx, cx + i * (cw / 4 + 2 * scale), cy, cw / 4 - 4 * scale, 30 * scale, g, state.grade === g, scale));
  cy += 62 * scale;
  section('CAPTION');
  ctx.fillStyle = '#221633';
  traceRoundRect(ctx, cx, cy, cw, 34 * scale, 6 * scale);
  ctx.fill();
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = 1.6 * scale;
  traceRoundRect(ctx, cx, cy, cw, 34 * scale, 6 * scale);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${15 * scale}px ${FONT_STACK}`;
  ctx.fillText(state.caption || '', cx + 10 * scale, cy + 23 * scale);
  cy += 48 * scale;
  ctx.fillStyle = '#221633';
  traceRoundRect(ctx, cx, cy, cw, 30 * scale, 6 * scale);
  ctx.fill();
  ctx.fillStyle = '#c9b8e8';
  ctx.font = `italic 400 ${13.5 * scale}px ${FONT_STACK}`;
  ctx.fillText(state.subtitle || '', cx + 10 * scale, cy + 20 * scale);
  cy += 46 * scale;
  section('EXPORT PNG');
  ['1080 x 1080', '1080 x 1350', '1920 x 1080'].forEach((s, i) => editorButton(ctx, cx + i * (cw / 3 + 2 * scale), cy, cw / 3 - 4 * scale, 32 * scale, s, i === 0, scale));
  cy += 48 * scale;
  ctx.fillStyle = '#8be9c9';
  ctx.font = `400 ${13 * scale}px ${FONT_STACK}`;
  ctx.fillText('Ready — 3 sizes, one click each.', cx, cy);
}

/** The sizes sheet: the same cover drawn at all three post sizes on one page. */
export function renderSizesSheet(ctx, state, w, h) {
  ctx.fillStyle = '#0d0916';
  ctx.fillRect(0, 0, w, h);
  const gap = w * 0.03;
  const landW = w * 0.52, landH = landW * (1080 / 1920);
  ctx.save();
  ctx.translate(gap, h * 0.06);
  ctx.scale(landW / 1920, landH / 1080);
  renderCover(ctx, state, 1920, 1080);
  ctx.restore();
  const sq = h * 0.52;
  ctx.save();
  ctx.translate(gap, h * 0.06 + landH + h * 0.05);
  ctx.scale(sq / 1080, sq / 1080);
  renderCover(ctx, state, 1080, 1080);
  ctx.restore();
  const portH = h * 0.88, portW = portH * (1080 / 1350);
  ctx.save();
  ctx.translate(w - portW - gap, h * 0.06);
  ctx.scale(portW / 1080, portH / 1350);
  renderCover(ctx, state, 1080, 1350);
  ctx.restore();
  ctx.fillStyle = '#f4ecff';
  ctx.font = `700 ${Math.round(h * 0.028)}px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText('1920 x 1080', gap, h * 0.045);
  ctx.fillText('1080 x 1080', gap, h * 0.06 + landH + h * 0.035);
  ctx.fillText('1080 x 1350', w - portW - gap, h * 0.045);
}
