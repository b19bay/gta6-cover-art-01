// The render core: draws a finished cover onto any 2D context, at any
// size, with no DOM dependency. The browser editor, the export path and
// the screenshot script all call this one function, so what you see is
// exactly what the PNG holds.
//
// state: {
//   layout: 'hero-strip' | 'grid' | 'diagonal' | 'triptych',
//   grade: 'sunset' | 'neon' | 'noir' | 'gold',
//   caption: { text: string, position: 'top' | 'bottom' },
//   panels: [{ photo: number, zoom: number, ox: number, oy: number }, ...]
// }
// photos: drawables with width/height (browser Image naturalWidth, or a
// node-canvas Image). A panel's photo index picks one; the same photo may
// fill several panels with different crops.
import { layoutRects } from './layouts.js';
import { GRADES, applyGrade, drawSun } from './grades.js';
import { drawCaption } from './caption.js';

export const EXPORT_SIZES = [
  { label: '1080 x 1080', w: 1080, h: 1080 },
  { label: '1080 x 1350', w: 1080, h: 1350 },
  { label: '1920 x 1080', w: 1920, h: 1080 },
];

function imgSize(img) {
  return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
}

/** Cover-fits `img` into rect (x, y, w, h) with zoom and pan offsets. */
export function drawPhotoCover(ctx, img, x, y, w, h, zoom = 1, ox = 0, oy = 0) {
  const { w: iw, h: ih } = imgSize(img);
  if (!iw || !ih) return;
  const s = Math.max(w / iw, h / ih) * Math.max(1, zoom);
  const dw = iw * s;
  const dh = ih * s;
  // Clamp the pan so the photo always covers the panel.
  const maxOx = Math.max(0, (dw - w) / 2 / w);
  const maxOy = Math.max(0, (dh - h) / 2 / h);
  const cx = Math.max(-maxOx, Math.min(maxOx, ox));
  const cy = Math.max(-maxOy, Math.min(maxOy, oy));
  ctx.drawImage(img, x + (w - dw) / 2 + cx * w, y + (h - dh) / 2 + cy * h, dw, dh);
}

/** Draws the finished cover for `state` onto ctx at size W x H. */
export function renderCover(ctx, photos, state, W, H) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const rects = layoutRects(state.layout, W, H);
  ctx.save();
  ctx.fillStyle = '#160a1e';
  ctx.fillRect(0, 0, W, H);
  rects.forEach((r, i) => {
    const panel = state.panels[i] ?? { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = photos[panel.photo];
    ctx.save();
    ctx.beginPath();
    if (r.clip) {
      ctx.moveTo(r.clip[0][0], r.clip[0][1]);
      for (let k = 1; k < r.clip.length; k += 1) ctx.lineTo(r.clip[k][0], r.clip[k][1]);
      ctx.closePath();
    } else {
      ctx.rect(r.x, r.y, r.w, r.h);
    }
    ctx.clip();
    if (img) drawPhotoCover(ctx, img, r.x, r.y, r.w, r.h, panel.zoom, panel.ox, panel.oy);
    else { ctx.fillStyle = '#2b1838'; ctx.fillRect(r.x, r.y, r.w, r.h); }
    if (i === 0) drawSun(ctx, grade, r.x, r.y, r.w, r.h);
    applyGrade(ctx, grade, r.x, r.y, r.w, r.h);
    ctx.restore();
  });
  // White gutters between panels.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, W * 0.004);
  rects.forEach((r) => {
    if (r.clip) {
      ctx.beginPath();
      ctx.moveTo(r.clip[1][0], r.clip[1][1]);
      ctx.lineTo(r.clip[2][0], r.clip[2][1]);
      ctx.stroke();
    } else {
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  });
  // Neon outer frame: accent border + thin white inner line.
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(5, W * 0.007);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(1.5, W * 0.0016);
  const inset = W * 0.014;
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  // Caption.
  drawCaption(ctx, state.caption.text, W, H, grade.accent, state.caption.position);
  ctx.restore();
}

/** A fresh default state for a layout (one crop slot per panel). */
export function defaultState(layout, grade, captionText) {
  const count = layoutRects(layout, 100, 100).length;
  return {
    layout,
    grade,
    caption: { text: captionText, position: 'bottom' },
    panels: Array.from({ length: count }, (_, i) => ({
      photo: i === 0 ? 0 : 1,
      zoom: 1,
      // Portraits sit high in the frame, so start panned slightly down:
      // the hero shows the face, thin strips show faces instead of torsos.
      ox: 0,
      oy: i === 0 ? 0.2 : 0.3,
    })),
  };
}
