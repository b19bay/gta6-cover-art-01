// render-editor.js — canvas drawings of the Cover Heist editor itself.
// The browser editor is DOM controls beside a live canvas preview; these
// two scenes draw that same editor (and the three post sizes) onto any
// canvas, which is how the app makes its own screenshots in-session:
// the editor scene shows a photo loaded, its panels and its controls,
// and the sizes scene shows one cover in every export size.

import { LAYOUTS } from './layouts.js';
import { GRADES } from './pixel-grades.js';
import { POST_SIZES, renderCover } from './render-cover.js';
import { FONT_STACK } from './caption.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - r);
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  ctx.closePath();
}

function label(ctx, text, x, y, px, color, align = 'left') {
  ctx.save();
  ctx.font = `700 ${px}px ${FONT_STACK}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function chip(ctx, text, x, y, w, h, selected, accent = '#ff2e88') {
  ctx.save();
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = selected ? accent : '#2c2140';
  ctx.fill();
  ctx.strokeStyle = selected ? '#ffd23e' : '#574a75';
  ctx.lineWidth = 2;
  ctx.stroke();
  label(ctx, text, x + w / 2, y + h * 0.66, Math.min(19, h * 0.44), '#ffffff', 'center');
  ctx.restore();
}

const GRADE_SWATCH = { sunset: '#ff7a3c', neon: '#ff2e88', golden: '#ffb347', midnight: '#18c8be' };

// drawEditorScene(ctx, state, W, H, createCanvas)
export function drawEditorScene(ctx, state, W, H, createCanvas) {
  ctx.save();
  ctx.fillStyle = '#171022';
  ctx.fillRect(0, 0, W, H);
  // Header bar.
  ctx.fillStyle = '#211536';
  ctx.fillRect(0, 0, W, 64);
  label(ctx, 'COVER HEIST', 24, 43, 30, '#ffd23e');
  label(ctx, 'GTA-STYLE COVER MAKER', 250, 43, 17, '#b9a8d9');
  label(ctx, 'PHOTOS STAY ON THIS MACHINE', W - 24, 43, 15, '#7df9ff', 'right');

  // Control column.
  const cx = 24;
  const cw = 336;
  let y = 88;
  label(ctx, '1  LAYOUT', cx, y + 16, 18, '#ffffff');
  y += 26;
  LAYOUTS.forEach((layout, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    chip(ctx, layout.name.toUpperCase(), cx + col * (cw / 2 + 4), y + row * 46, cw / 2 - 4, 38, state.layoutId === layout.id);
  });
  y += 104;
  label(ctx, '2  COLOUR GRADE', cx, y + 16, 18, '#ffffff');
  y += 28;
  GRADES.forEach((grade, i) => {
    const gx = cx + i * (cw / 4 + 2);
    ctx.save();
    roundRect(ctx, gx, y, cw / 4 - 4, 44, 8);
    ctx.fillStyle = GRADE_SWATCH[grade.id];
    ctx.fill();
    if (state.gradeId === grade.id) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
    label(ctx, grade.name.split(' ')[0].toUpperCase(), gx + cw / 8 - 2, y + 62, 13, '#cfc2ea', 'center');
  });
  y += 84;
  label(ctx, '3  CAPTION', cx, y + 16, 18, '#ffffff');
  y += 26;
  ctx.save();
  roundRect(ctx, cx, y, cw, 46, 8);
  ctx.fillStyle = '#0f0a1c';
  ctx.fill();
  ctx.strokeStyle = '#574a75';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  label(ctx, (state.caption?.text || '').toUpperCase(), cx + 14, y + 31, 20, '#ffffff');
  y += 60;
  label(ctx, 'DRAG PHOTO TO CROP - SCROLL TO ZOOM', cx, y + 14, 13, '#9d8cc4');
  y += 30;
  label(ctx, '4  EXPORT SIZE', cx, y + 16, 18, '#ffffff');
  y += 26;
  POST_SIZES.forEach((size, i) => {
    chip(ctx, `${size.w} X ${size.h}`, cx + i * (cw / 3 + 3), y, cw / 3 - 3, 38, (state.sizeId || 'wide') === size.id, '#0e7d8c');
  });
  y += 54;
  ctx.save();
  roundRect(ctx, cx, y, cw, 52, 10);
  ctx.fillStyle = '#ff2e88';
  ctx.fill();
  ctx.restore();
  label(ctx, 'EXPORT PNG', cx + cw / 2, y + 35, 22, '#ffffff', 'center');

  // Live preview: the real cover, rendered by the shared core.
  const px = 392;
  const pw = W - px - 24;
  const ph = H - 88 - 16;
  const scale = Math.min(pw / (state.previewW || 1080), ph / (state.previewH || 1080));
  const dw = (state.previewW || 1080) * scale;
  const dh = (state.previewH || 1080) * scale;
  const off = createCanvas(state.previewW || 1080, state.previewH || 1080);
  renderCover(off.getContext('2d'), state, off.width, off.height);
  ctx.fillStyle = '#0f0a1c';
  ctx.fillRect(px + (pw - dw) / 2 - 6, 88 - 6, dw + 12, dh + 12);
  ctx.drawImage(off, px + (pw - dw) / 2, 88, dw, dh);
  label(ctx, 'LIVE PREVIEW', px + pw / 2, H - 18, 14, '#9d8cc4', 'center');
  ctx.restore();
}

// drawSizesScene(ctx, state, W, H, createCanvas) — one cover, three sizes.
export function drawSizesScene(ctx, state, W, H, createCanvas) {
  ctx.save();
  ctx.fillStyle = '#171022';
  ctx.fillRect(0, 0, W, H);
  label(ctx, 'ONE COVER - EVERY POST SIZE', 32, 52, 28, '#ffd23e');
  const spots = [
    { size: POST_SIZES[0], x: 28, y: 80, h: 440 },
    { size: POST_SIZES[1], x: 496, y: 80, h: 440 },
    { size: POST_SIZES[2], x: 876, y: 80, h: 198 },
  ];
  for (const spot of spots) {
    const aspect = spot.size.w / spot.size.h;
    const dh = spot.h;
    const dw = Math.round(dh * aspect);
    const off = createCanvas(spot.size.w, spot.size.h);
    renderCover(off.getContext('2d'), { ...state, caption: state.caption }, off.width, off.height);
    ctx.fillStyle = '#0f0a1c';
    ctx.fillRect(spot.x - 5, spot.y - 5, dw + 10, dh + 10);
    ctx.drawImage(off, spot.x, spot.y, dw, dh);
    label(ctx, `${spot.size.name.toUpperCase()}  ${spot.size.w} X ${spot.size.h}`, spot.x + dw / 2, spot.y + dh + 34, 17, '#ffffff', 'center');
  }
  label(ctx, 'EXPORT PNG IN ANY SIZE - SAME PANELS, GRADE AND CAPTION', W / 2, H - 24, 16, '#7df9ff', 'center');
  ctx.restore();
}
