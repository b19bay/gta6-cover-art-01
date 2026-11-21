// render-cover.js — the pure render core of Cover Heist.
// renderCover(ctx, state, W, H, createCanvas) draws one finished cover:
// graded photo panels with white poster dividers, a grade wash and pixel
// grade, a vignette, and the caption block. It touches no DOM globals —
// the caller passes a canvas factory — so the browser editor and the
// Node screenshot renderer run this exact code path.

import { layoutById, panelBounds, tracePanelPath, coverFit } from './layouts.js';
import { applyGradeToPixels, GRADE_WASH } from './pixel-grades.js';
import { drawCaption } from './caption.js';

export const POST_SIZES = [
  { id: 'square', name: 'Square post', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait post', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide post', w: 1920, h: 1080 },
];

export function sizeById(id) {
  return POST_SIZES.find((s) => s.id === id) || POST_SIZES[0];
}

// A drawn stand-in scene for an empty panel: sunset sky, sun disc, palm
// silhouettes and a street band, in flat poster shapes. Deterministic per
// slot so screenshots and previews never flicker between renders.
export function drawPlaceholderScene(ctx, box, slot) {
  const sky = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  const skies = [
    ['#2b1055', '#7597de', '#ff9a5a', '#ffd23e'],
    ['#12002e', '#7a1e6e', '#ff2e88', '#ff9a5a'],
    ['#04263b', '#0e7d8c', '#39d0c4', '#c8f169'],
    ['#33102e', '#a03d63', '#ff7a3c', '#ffe29a'],
  ][slot % 4];
  sky.addColorStop(0, skies[0]);
  sky.addColorStop(0.45, skies[1]);
  sky.addColorStop(0.75, skies[2]);
  sky.addColorStop(1, skies[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  // Sun disc low in the panel.
  const sunR = box.h * 0.30;
  const sunX = box.x + box.w * (0.30 + 0.14 * (slot % 3));
  const sunY = box.y + box.h * 0.66;
  ctx.fillStyle = 'rgba(255,224,138,0.95)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skies[1];
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(sunX - sunR, sunY - sunR * 0.2 + i * sunR * 0.28, sunR * 2, sunR * 0.07);
  }
  // Ground band and palm silhouettes.
  ctx.fillStyle = 'rgba(16,8,28,0.92)';
  ctx.fillRect(box.x, box.y + box.h * 0.80, box.w, box.h * 0.20);
  ctx.strokeStyle = 'rgba(10,4,20,0.95)';
  ctx.lineWidth = Math.max(3, box.w * 0.012);
  const palmX = box.x + box.w * 0.78;
  const palmBase = box.y + box.h * 0.86;
  ctx.beginPath();
  ctx.moveTo(palmX, palmBase);
  ctx.quadraticCurveTo(palmX + box.w * 0.03, palmBase - box.h * 0.30, palmX + box.w * 0.10, palmBase - box.h * 0.42);
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.08 + i * 0.20);
    ctx.moveTo(palmX + box.w * 0.10, palmBase - box.h * 0.42);
    ctx.lineTo(palmX + box.w * 0.10 + Math.cos(a) * box.w * 0.16, palmBase - box.h * 0.42 - Math.sin(a) * box.h * 0.12 + box.h * 0.05);
  }
  ctx.stroke();
}

function drawPanelPhoto(ctx, panel, state, W, H) {
  const box = panelBounds(panel, W, H);
  const photo = state.photos?.[panel.slot];
  ctx.save();
  tracePanelPath(ctx, panel, W, H);
  ctx.clip();
  if (photo) {
    const fit = coverFit(photo.width, photo.height, box, state.views?.[panel.slot]);
    ctx.drawImage(photo, fit.dx, fit.dy, fit.dw, fit.dh);
  } else {
    drawPlaceholderScene(ctx, box, panel.slot);
  }
  const wash = GRADE_WASH[state.gradeId] || GRADE_WASH.sunset;
  const g = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  g.addColorStop(0, wash[0]);
  g.addColorStop(1, wash[1]);
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

function drawDividers(ctx, layout, W, H) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, W * 0.007);
  ctx.lineJoin = 'round';
  for (const panel of layout.panels) {
    tracePanelPath(ctx, panel, W, H);
    ctx.stroke();
  }
  ctx.strokeStyle = '#14061f';
  ctx.lineWidth = Math.max(4, W * 0.011);
  ctx.strokeRect(0, 0, W, H);
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  ctx.save();
  const top = ctx.createLinearGradient(0, 0, 0, H * 0.14);
  top.addColorStop(0, 'rgba(10,2,18,0.30)');
  top.addColorStop(1, 'rgba(10,2,18,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, H * 0.14);
  const bottom = ctx.createLinearGradient(0, H, 0, H - H * 0.20);
  bottom.addColorStop(0, 'rgba(10,2,18,0.34)');
  bottom.addColorStop(1, 'rgba(10,2,18,0)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, H - H * 0.20, W, H * 0.20);
  ctx.restore();
}

// renderCover(ctx, state, W, H) — state: { layoutId, gradeId, caption,
// photos: {slot: image}, views: {slot: {zoom, offsetX, offsetY}} }.
export function renderCover(ctx, state, W, H) {
  const layout = layoutById(state.layoutId);
  ctx.save();
  ctx.fillStyle = '#14061f';
  ctx.fillRect(0, 0, W, H);
  for (const panel of layout.panels) drawPanelPhoto(ctx, panel, state, W, H);
  // The pixel grade runs over the whole composed cover, caption excluded,
  // so panels cut from different photos share one poster colour world.
  const pixels = ctx.getImageData(0, 0, W, H);
  applyGradeToPixels(pixels, state.gradeId);
  ctx.putImageData(pixels, 0, 0);
  drawDividers(ctx, layout, W, H);
  drawVignette(ctx, W, H);
  if (state.caption) drawCaption(ctx, state.caption, W, H);
  ctx.restore();
}
