// layouts.js — the four multi-panel cover layouts of Cover Heist.
// A layout is a list of panels in normalised cover coordinates (0..1).
// Each panel names the photo slot it shows and how it is clipped:
// 'rect' panels are rectangles; the diagonal layout's panels are polygons
// listed in `poly` (also normalised). Pure data plus geometry helpers —
// no DOM, so the browser editor and the Node renderer share it exactly.

export const LAYOUTS = [
  {
    id: 'hero-strip',
    name: 'Hero + Strip',
    blurb: 'One big hero panel over a film strip of three',
    panels: [
      { slot: 0, x: 0, y: 0, w: 1, h: 0.68 },
      { slot: 1, x: 0, y: 0.68, w: 1 / 3, h: 0.32 },
      { slot: 2, x: 1 / 3, y: 0.68, w: 1 / 3, h: 0.32 },
      { slot: 3, x: 2 / 3, y: 0.68, w: 1 / 3, h: 0.32 },
    ],
  },
  {
    id: 'grid',
    name: 'Poster Grid',
    blurb: 'The classic four-panel poster grid',
    panels: [
      { slot: 0, x: 0, y: 0, w: 0.5, h: 0.52 },
      { slot: 1, x: 0.5, y: 0, w: 0.5, h: 0.52 },
      { slot: 2, x: 0, y: 0.52, w: 0.5, h: 0.48 },
      { slot: 3, x: 0.5, y: 0.52, w: 0.5, h: 0.48 },
    ],
  },
  {
    id: 'diagonal',
    name: 'Diagonal Split',
    blurb: 'Three slashed panels, poster-energy diagonals',
    panels: [
      { slot: 0, poly: [[0, 0], [0.72, 0], [0.52, 0.58], [0, 0.58]] },
      { slot: 1, poly: [[0.72, 0], [1, 0], [1, 0.58], [0.52, 0.58]] },
      { slot: 2, poly: [[0, 0.58], [1, 0.58], [1, 1], [0, 1]] },
    ],
  },
  {
    id: 'spotlight',
    name: 'Spotlight',
    blurb: 'A tall hero on the left, two stacked scenes on the right',
    panels: [
      { slot: 0, x: 0, y: 0, w: 0.58, h: 1 },
      { slot: 1, x: 0.58, y: 0, w: 0.42, h: 0.5 },
      { slot: 2, x: 0.58, y: 0.5, w: 0.42, h: 0.5 },
    ],
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

// panelBounds(panel, W, H) -> { x, y, w, h } in pixels, the bounding box a
// photo is cover-fitted into (the clip path may cut it down further).
export function panelBounds(panel, W, H) {
  if (panel.poly) {
    const xs = panel.poly.map((p) => p[0]);
    const ys = panel.poly.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    return { x: x0 * W, y: y0 * H, w: (x1 - x0) * W, h: (y1 - y0) * H };
  }
  return { x: panel.x * W, y: panel.y * H, w: panel.w * W, h: panel.h * H };
}

// tracePanelPath(ctx, panel, W, H) — path of the panel's clip region.
export function tracePanelPath(ctx, panel, W, H) {
  ctx.beginPath();
  if (panel.poly) {
    panel.poly.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px * W, py * H); else ctx.lineTo(px * W, py * H);
    });
    ctx.closePath();
  } else {
    const b = panelBounds(panel, W, H);
    ctx.rect(b.x, b.y, b.w, b.h);
  }
}

// coverFit(sourceW, sourceH, box, view) -> the drawImage rectangle that
// fills `box` with the photo, honouring the per-panel crop view
// ({ zoom >= 1, offsetX/offsetY in -1..1 of the spare room }).
export function coverFit(sourceW, sourceH, box, view) {
  const zoom = Math.max(1, view?.zoom || 1);
  const scale = Math.max(box.w / sourceW, box.h / sourceH) * zoom;
  const dw = sourceW * scale;
  const dh = sourceH * scale;
  const spareX = dw - box.w;
  const spareY = dh - box.h;
  const ox = spareX * (0.5 + 0.5 * (view?.offsetX || 0));
  const oy = spareY * (0.5 + 0.5 * (view?.offsetY || 0));
  return { dx: box.x - ox, dy: box.y - oy, dw, dh };
}
