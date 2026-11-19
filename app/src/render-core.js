// The render core: one pure-JS function that draws a whole cover.
// It has no DOM dependency. It only talks to a "surface" — an object with
// the drawing methods listed in surfaceMethods below. The browser hands it
// a canvas surface; the screenshot renderer hands it a pixel surface; the
// picture is the same either way, because every decision (layout, grade,
// caption, crop) lives here, not in the surface.
//
// Surface methods the core uses:
//   width, height, createLayer(w, h), drawLayer(layer, x, y, panel),
//   fillRect(x, y, w, h, color), fillRectGradient(x, y, w, h, gradient),
//   fillCircle(x, y, r, color), drawImageCover(image, x, y, w, h, srcRect),
//   applyGrade(pixelFn), rasterizeText(text, px), drawMask(mask, x, y, fill)

import { panelsFor, boundsOf } from './layouts.js';
import { getGrade } from './grades.js';
import { captionBox, drawCaption, drawTagline } from './caption.js';
import { coverSourceRect } from './photos.js';

export const surfaceMethods = [
  'createLayer', 'drawLayer', 'fillRect', 'fillRectGradient', 'fillCircle',
  'drawImageCover', 'applyGrade', 'rasterizeText', 'drawMask',
];

const SEAM = [12, 10, 18, 1];
const PANEL_EDGE = [255, 255, 255, 0.22];

// A panel with no photo yet: a dark gradient, a plus mark, and a prompt.
function drawEmptyPanel(layer, panel, width, height) {
  layer.fillRectGradient(0, 0, width, height, {
    vertical: true,
    stops: [[0, [58, 32, 84, 1]], [1, [20, 14, 34, 1]]],
  });
  const cx = width / 2;
  const cy = height / 2;
  const arm = Math.min(width, height) * 0.14;
  const thick = Math.max(4, Math.round(Math.min(width, height) * 0.02));
  layer.fillRect(cx - arm, cy - thick / 2, arm * 2, thick, [255, 255, 255, 0.5]);
  layer.fillRect(cx - thick / 2, cy - arm, thick, arm * 2, [255, 255, 255, 0.5]);
  const mask = layer.rasterizeText('ADD PHOTO', Math.max(14, Math.round(Math.min(width, height) * 0.07)));
  layer.drawMask(mask, Math.round(cx - mask.width / 2), Math.round(cy + arm + 10), {
    kind: 'color',
    color: [255, 255, 255, 0.75],
  });
}

// A low sun with a soft glow, for the sunset and golden-hour grades.
// Drawn on the hero panel after the grade so it stays bright. The glow is
// several faint rings, not one hard disc, so it reads as light, not a sticker.
function drawSun(layer, width, height) {
  const cx = Math.round(width * 0.80);
  const cy = Math.round(height * 0.30);
  const r = Math.round(Math.min(width, height) * 0.15);
  const glow = [
    [2.3, [255, 120, 40, 0.05]],
    [1.9, [255, 130, 45, 0.07]],
    [1.55, [255, 140, 50, 0.10]],
    [1.25, [255, 160, 60, 0.14]],
  ];
  for (const [scale, color] of glow) {
    layer.fillCircle(cx, cy, Math.round(r * scale), color);
  }
  layer.fillCircle(cx, cy, r, [255, 196, 90, 1]);
  layer.fillCircle(cx, cy, Math.round(r * 0.82), [255, 226, 150, 1]);
}

// Soft darkening towards the cover edges, so the caption and panels sit in
// a frame of shadow rather than floating on white.
function drawVignette(surface, width, height) {
  const edge = Math.round(Math.min(width, height) * 0.09);
  const top = { vertical: true, stops: [[0, [0, 0, 0, 0.32]], [1, [0, 0, 0, 0]]] };
  const bottom = { vertical: true, stops: [[0, [0, 0, 0, 0]], [1, [0, 0, 0, 0.34]]] };
  const left = { vertical: false, stops: [[0, [0, 0, 0, 0.26]], [1, [0, 0, 0, 0]]] };
  const right = { vertical: false, stops: [[0, [0, 0, 0, 0]], [1, [0, 0, 0, 0.26]]] };
  surface.fillRectGradient(0, 0, width, edge, top);
  surface.fillRectGradient(0, height - edge, width, edge, bottom);
  surface.fillRectGradient(0, 0, edge, height, left);
  surface.fillRectGradient(width - edge, 0, edge, height, right);
}

function photoById(state, photoId) {
  if (!photoId) return null;
  return state.photos.find((photo) => photo.id === photoId) || null;
}

// Draw the whole cover at the surface's size. Returns the panel list, so
// the editor can hit-test clicks against the same geometry it just drew.
export function renderCover(surface, state) {
  const width = surface.width;
  const height = surface.height;
  const grade = getGrade(state.gradeId);
  const panels = panelsFor(state.layoutId, width, height);

  surface.fillRect(0, 0, width, height, SEAM);

  panels.forEach((panel, index) => {
    const box = boundsOf([panel]);
    const layer = surface.createLayer(box.w, box.h);
    const assignment = state.assignments[index] || {};
    const photo = photoById(state, assignment.photoId);
    if (photo) {
      const crop = {
        zoom: assignment.zoom || 1,
        cx: assignment.cx ?? 0.5,
        cy: assignment.cy ?? 0.5,
      };
      const src = coverSourceRect(photo, box.w, box.h, crop);
      layer.drawImageCover(photo.image, 0, 0, box.w, box.h, src);
    } else {
      drawEmptyPanel(layer, panel, box.w, box.h);
    }
    layer.applyGrade(grade.pixel);
    if (grade.overlay) {
      layer.fillRectGradient(0, 0, box.w, box.h, {
        vertical: grade.overlay.vertical,
        stops: [[0, grade.overlay.from], [1, grade.overlay.to]],
      });
    }
    if (index === 0 && (grade.id === 'sunset' || grade.id === 'golden')) {
      drawSun(layer, box.w, box.h);
    }
    surface.drawLayer(layer, box.x, box.y, panel);
    // A hairline edge so panels read as separate shots, not one photo.
    if (panel.kind === 'rect') {
      surface.fillRect(panel.x, panel.y, panel.w, 2, PANEL_EDGE);
      surface.fillRect(panel.x, panel.y + panel.h - 2, panel.w, 2, PANEL_EDGE);
    }
  });

  drawVignette(surface, width, height);
  const box = captionBox(state.caption, width, height);
  drawCaption(surface, state.caption, box, grade);
  if (state.tagline) {
    drawTagline(surface, state.tagline, width, height);
  }
  return panels;
}
