// The four panel layouts. A layout is a list of panels; each panel is a
// rectangle in 0..1 cover space, optionally clipped to a polygon (the
// diagonal split). No DOM here: pure geometry, shared by the browser app
// and the screenshot script.
export const LAYOUTS = {
  'hero-strip': {
    label: 'Hero + Strip',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.62 },
      { x: 0, y: 0.62, w: 0.5, h: 0.38 },
      { x: 0.5, y: 0.62, w: 0.5, h: 0.38 },
    ],
  },
  grid: {
    label: 'Grid 2 x 2',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  diagonal: {
    label: 'Diagonal Split',
    panels: [
      { x: 0, y: 0, w: 1, h: 1, clip: [[0, 0], [1, 0], [0.34, 1], [0, 1]] },
      { x: 0, y: 0, w: 1, h: 1, clip: [[1, 0], [1, 1], [0.34, 1]] },
    ],
  },
  triptych: {
    label: 'Triptych',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
};

export const LAYOUT_NAMES = Object.keys(LAYOUTS);

/** Panel rectangles of `layout` in pixels for a cover of W x H. */
export function layoutRects(layout, W, H) {
  const def = LAYOUTS[layout] ?? LAYOUTS['hero-strip'];
  return def.panels.map((p) => ({
    x: p.x * W,
    y: p.y * H,
    w: p.w * W,
    h: p.h * H,
    clip: p.clip ? p.clip.map(([cx, cy]) => [cx * W, cy * H]) : null,
  }));
}

/** Which panel (index) contains point (px, py) on a W x H cover, or -1. */
export function hitPanel(layout, W, H, px, py) {
  const rects = layoutRects(layout, W, H);
  for (let i = rects.length - 1; i >= 0; i -= 1) {
    const r = rects[i];
    if (r.clip) {
      if (pointInPolygon(px, py, r.clip)) return i;
    } else if (px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h) {
      return i;
    }
  }
  return -1;
}

function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
